#!/bin/sh
# regenerates the game manifest and builds the Windows launcher (CureLauncher.ex_)
set -e
cd "$(dirname "$0")"
(cd game && find . -type f ! -name manifest.json | sed 's|^\./||' | sort | python3 -c 'import sys,json;print(json.dumps([l.strip() for l in sys.stdin if l.strip()],indent=1))' > manifest.json)
cd launcher && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H windowsgui -s -w" -o ../LawlessLauncher.ex_ . && cd ..
cp LawlessLauncher.ex_ CureLauncher.ex_
echo "built LawlessLauncher.ex_ ($(wc -c < LawlessLauncher.ex_) bytes)"
