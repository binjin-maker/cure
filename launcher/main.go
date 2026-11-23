package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	Repo          = "binjin-maker/cure"
	Branch        = "main"
	LauncherBuild = 2
	Port          = "47823"
	PollEvery     = 15 * time.Second
)

var (
	dataDir   string
	mu        sync.Mutex
	current   string
	staged    string
	lastPing  = time.Now()
	client    = &http.Client{Timeout: 30 * time.Second}
	refRe     = regexp.MustCompile(`([0-9a-f]{40}) refs/heads/` + Branch)
	exitedAt  time.Time
	startedAt = time.Now()
)

func main() {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base, _ = os.UserConfigDir()
	}
	dataDir = filepath.Join(base, "Cure")
	os.MkdirAll(filepath.Join(dataDir, "versions"), 0o755)
	lf, _ := os.OpenFile(filepath.Join(dataDir, "launcher.log"), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if lf != nil {
		log.SetOutput(lf)
	}
	log.Printf("Lawless launcher build %d", LauncherBuild)
	if exe, err := os.Executable(); err == nil {
		os.Remove(exe + ".old")
	}
	mime.AddExtensionType(".js", "application/javascript")
	mime.AddExtensionType(".json", "application/json")

	url := "http://127.0.0.1:" + Port + "/"
	ln, err := net.Listen("tcp", "127.0.0.1:"+Port)
	if err != nil {
		log.Printf("already running, opening window: %v", err)
		openBrowser(url, false)
		return
	}

	b, _ := os.ReadFile(filepath.Join(dataDir, "current.txt"))
	current = strings.TrimSpace(string(b))
	if sha, err := latestSHA(); err == nil {
		if sha != current || !versionOK(sha) {
			if err := download(sha); err == nil {
				setCurrent(sha)
			} else {
				log.Printf("download failed: %v", err)
			}
		}
		if selfUpdate(sha) {
			restart()
			return
		}
	} else {
		log.Printf("could not reach GitHub: %v", err)
	}
	if current == "" || !versionOK(current) {
		fail(ln, "Couldn't download the game. Check your internet connection and start the launcher again.")
		return
	}
	cleanup()

	go poller()
	go func() { http.Serve(ln, handler()) }()
	go openBrowser(url, true)
	for {
		time.Sleep(2 * time.Second)
		mu.Lock()
		idle := time.Since(lastPing)
		mu.Unlock()
		gone := !exitedAt.IsZero() || time.Since(startedAt) > 90*time.Second
		if gone && idle > 25*time.Second {
			log.Printf("window closed, exiting")
			return
		}
	}
}

func versionOK(sha string) bool {
	if sha == "" {
		return false
	}
	_, err := os.Stat(filepath.Join(dataDir, "versions", sha, "index.html"))
	return err == nil
}

func setCurrent(sha string) {
	current = sha
	os.WriteFile(filepath.Join(dataDir, "current.txt"), []byte(sha), 0o644)
}

func latestSHA() (string, error) {
	req, _ := http.NewRequest("GET", "https://github.com/"+Repo+".git/info/refs?service=git-upload-pack", nil)
	req.Header.Set("User-Agent", "git/2.40 cure-launcher")
	if r, err := client.Do(req); err == nil {
		defer r.Body.Close()
		body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if m := refRe.FindSubmatch(body); m != nil {
			return string(m[1]), nil
		}
	}
	req2, _ := http.NewRequest("GET", "https://api.github.com/repos/"+Repo+"/commits/"+Branch, nil)
	req2.Header.Set("Accept", "application/vnd.github.sha")
	req2.Header.Set("User-Agent", "cure-launcher")
	r, err := client.Do(req2)
	if err != nil {
		return "", err
	}
	defer r.Body.Close()
	b, _ := io.ReadAll(r.Body)
	s := strings.TrimSpace(string(b))
	if len(s) != 40 {
		return "", errors.New("bad sha response")
	}
	return s, nil
}

func raw(sha, path string) ([]byte, error) {
	r, err := client.Get("https://raw.githubusercontent.com/" + Repo + "/" + sha + "/" + path)
	if err != nil {
		return nil, err
	}
	defer r.Body.Close()
	if r.StatusCode != 200 {
		return nil, fmt.Errorf("%s: HTTP %d", path, r.StatusCode)
	}
	return io.ReadAll(r.Body)
}

func download(sha string) error {
	if versionOK(sha) {
		return nil
	}
	mb, err := raw(sha, "game/manifest.json")
	if err != nil {
		return err
	}
	var files []string
	if err := json.Unmarshal(mb, &files); err != nil {
		return err
	}
	tmp := filepath.Join(dataDir, "versions", sha+".tmp")
	os.RemoveAll(tmp)
	type res struct {
		f   string
		b   []byte
		err error
	}
	ch := make(chan res, len(files))
	for _, f := range files {
		go func(f string) { b, err := raw(sha, "game/"+f); ch <- res{f, b, err} }(f)
	}
	for range files {
		r := <-ch
		if r.err != nil {
			return r.err
		}
		p := filepath.Join(tmp, filepath.FromSlash(r.f))
		os.MkdirAll(filepath.Dir(p), 0o755)
		if err := os.WriteFile(p, r.b, 0o644); err != nil {
			return err
		}
	}
	dst := filepath.Join(dataDir, "versions", sha)
	os.RemoveAll(dst)
	log.Printf("downloaded %s (%d files)", sha[:7], len(files))
	return os.Rename(tmp, dst)
}

func selfUpdate(sha string) bool {
	b, err := raw(sha, "launcher/build.txt")
	if err != nil {
		return false
	}
	n, _ := strconv.Atoi(strings.TrimSpace(string(b)))
	if n <= LauncherBuild {
		return false
	}
	bin, err := raw(sha, "LawlessLauncher.ex_")
	if err != nil || len(bin) < 100000 {
		return false
	}
	exe, err := os.Executable()
	if err != nil {
		return false
	}
	os.Remove(exe + ".old")
	if err := os.Rename(exe, exe+".old"); err != nil {
		return false
	}
	if err := os.WriteFile(exe, bin, 0o755); err != nil {
		os.Rename(exe+".old", exe)
		return false
	}
	log.Printf("launcher updated to build %d", n)
	return true
}

func restart() {
	exe, _ := os.Executable()
	exec.Command(exe).Start()
}

func poller() {
	for {
		time.Sleep(PollEvery)
		sha, err := latestSHA()
		if err != nil {
			continue
		}
		mu.Lock()
		known := sha == current || sha == staged
		mu.Unlock()
		if known {
			continue
		}
		if err := download(sha); err != nil {
			log.Printf("bg download: %v", err)
			continue
		}
		selfUpdate(sha)
		mu.Lock()
		staged = sha
		mu.Unlock()
		log.Printf("staged %s", sha[:7])
	}
}

func cleanup() {
	ents, _ := os.ReadDir(filepath.Join(dataDir, "versions"))
	for _, e := range ents {
		if e.Name() != current && e.Name() != staged {
			os.RemoveAll(filepath.Join(dataDir, "versions", e.Name()))
		}
	}
}

func handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		lastPing = time.Now()
		mu.Unlock()
		w.Write([]byte("ok"))
	})
	mux.HandleFunc("/api/update", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		lastPing = time.Now()
		out := map[string]any{"current": current, "latest": staged, "ready": staged != "" && staged != current, "launcher": LauncherBuild}
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		json.NewEncoder(w).Encode(out)
	})
	mux.HandleFunc("/api/save", func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(dataDir, "save.json")
		if r.Method == "POST" {
			b, err := io.ReadAll(io.LimitReader(r.Body, 4<<20))
			if err == nil && json.Valid(b) {
				os.WriteFile(p+".tmp", b, 0o644)
				os.Rename(p+".tmp", p)
			}
			return
		}
		b, err := os.ReadFile(p)
		if err != nil {
			w.Write([]byte("null"))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(b)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" || path == "index.html" {
			path = "index.html"
			mu.Lock()
			if staged != "" && staged != current && versionOK(staged) {
				setCurrent(staged)
				staged = ""
				log.Printf("switched to %s", current[:7])
				go cleanup()
			}
			mu.Unlock()
		}
		mu.Lock()
		dir := filepath.Join(dataDir, "versions", current)
		mu.Unlock()
		full := filepath.Join(dir, filepath.FromSlash(path))
		if !strings.HasPrefix(full, dir) {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		http.ServeFile(w, r, full)
	})
	return mux
}

func findBrowser() string {
	cands := []string{}
	for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles", "LOCALAPPDATA"} {
		if v := os.Getenv(env); v != "" {
			cands = append(cands, filepath.Join(v, "Microsoft", "Edge", "Application", "msedge.exe"), filepath.Join(v, "Google", "Chrome", "Application", "chrome.exe"))
		}
	}
	for _, c := range cands {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return ""
}

func openBrowser(url string, track bool) {
	br := findBrowser()
	if br == "" {
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		exitedAt = time.Now()
		return
	}
	cmd := exec.Command(br, "--app="+url, "--user-data-dir="+filepath.Join(dataDir, "browser"), "--no-first-run", "--no-default-browser-check",
		"--window-size=1600,900", "--start-maximized", "--autoplay-policy=no-user-gesture-required", "--disable-features=Translate", "--disable-pinch")
	if err := cmd.Start(); err != nil {
		log.Printf("browser start: %v", err)
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		exitedAt = time.Now()
		return
	}
	if track {
		cmd.Wait()
		exitedAt = time.Now()
	}
}

func fail(ln net.Listener, msg string) {
	go http.Serve(ln, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<body style="background:#111;color:#eee;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div><h1 style="color:#eceae6">LAWLESS</h1><p>%s</p></div></body>`, msg)
	}))
	openBrowser("http://127.0.0.1:"+Port+"/", true)
	time.Sleep(5 * time.Second)
}
