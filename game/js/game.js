import * as THREE from 'three';
import { ITEMS, ITEM, isGun, isMeleeish, CODES, BOT_NAMES, ALLOWANCE, ALLOWANCE_SEC, START_BANK, MAX_BOUNTY, xpForLevel, levelReward, unlockPrice } from './data.js';
import { Physics, NavGrid, Sfx, rand, randi, pick, clamp, fmt } from './engine.js';
import { buildWorld, ZONES, zoneOfY, EDGE } from './world.js';
import { loadAssets, Instancer, size as kitSize, gunModel } from './assets.js';
import { makeChar, HEAD_Y, randomOutfit } from './chars.js';
import { RoomEnvironment } from './pp/environments/RoomEnvironment.js';
import * as UI from './ui.js';
import { EffectComposer } from './pp/postprocessing/EffectComposer.js';
import { RenderPass } from './pp/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './pp/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './pp/postprocessing/OutputPass.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
renderer.autoClear = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(80, 1, 0.08, 900);
camera.rotation.order = 'YXZ';
const vmScene = new THREE.Scene(), vmCam = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
vmScene.add(new THREE.HemisphereLight(0xfff4e8, 0x4a4440, 1.6));
const vmSun = new THREE.DirectionalLight(0xffe2b8, 1.6); vmSun.position.set(1, 2, 1); vmScene.add(vmSun);
const hemi = new THREE.HemisphereLight(0xb4c0d4, 0x4a4844, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xc8d4ec, 1.1); scene.add(sun); scene.add(sun.target);
const SUN_DIR = new THREE.Vector3(-0.35, 0.8, 0.45).normalize();
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 500 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
const SKY = new THREE.Color(0x5d6674), UNDER = new THREE.Color(0x07080a);
scene.background = SKY.clone(); scene.fog = new THREE.FogExp2(SKY.getHex(), 0.011);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  uniforms: { time: { value: 0 }, top: { value: new THREE.Color(0x3c4552) }, mid: { value: new THREE.Color(0x6a7380) }, hor: { value: SKY.clone() }, sunDir: { value: SUN_DIR } },
  vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = vec4(p.xy, p.w * 0.9999, p.w); }',
  fragmentShader: `uniform float time; uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; varying vec3 vd;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){ vec3 d = normalize(vd); float h = d.y; vec3 c = mix(hor, mid, smoothstep(-0.02, 0.25, h)); c = mix(c, top, smoothstep(0.25, 0.9, h));
      vec2 uv = d.xz / max(h + 0.12, 0.05) * 1.4 + vec2(time * 0.004, time * 0.002);
      float cl = fbm(uv); float cl2 = fbm(uv * 2.2 + 5.0);
      c = mix(c, vec3(0.52, 0.56, 0.62), smoothstep(0.35, 0.75, cl) * 0.55 * smoothstep(-0.05, 0.2, h));
      c = mix(c, vec3(0.24, 0.27, 0.32), smoothstep(0.55, 0.85, cl2) * 0.45 * smoothstep(0.0, 0.3, h));
      float sd = max(dot(d, sunDir), 0.0); c += vec3(0.6, 0.65, 0.75) * pow(sd, 18.0) * 0.25;
      gl_FragColor = vec4(c, 1.0); }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);
const pLight = new THREE.PointLight(0xffe8c8, 0, 16, 1.6); scene.add(pLight);
const POOL = 8, pool = [];
for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(0xffc27a, 0, 26, 1.5); scene.add(l); pool.push(l); }
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,230,180,0.5)'); g.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const vibeL1 = new THREE.PointLight(0xff4fb0, 0, 40, 1.2); vibeL1.position.set(-14, -45, 0); scene.add(vibeL1);
const vibeL2 = new THREE.PointLight(0x7a5cff, 0, 40, 1.2); vibeL2.position.set(14, -45, 12); scene.add(vibeL2);

export const G = {
  THREE, scene, camera, renderer, ITEM, ITEMS, sfx: new Sfx(),
  state: 'loading', mode: 'standard', time: 0, bots: [], inter: [], cashBags: [], drops: [], projectiles: [], fires: [], decals: [],
  save: null, version: 'dev', update: { ready: false },
  dealerStock: {}, armoryStock: {}, rebelStock: {}, restockT: 300, rebelT: 600, rebelIdx: 0,
  airdropT: rand(300, 480), airdrop: null, trainT: 40, train: null, elev: { bottomT: 0, callT: rand(50, 120) },
};
const sfx = G.sfx;

const loadEl = document.querySelector('#loading span');
const KITA = await loadAssets((f, n) => { if (loadEl) loadEl.textContent = 'LOADING ' + Math.round(f * 100) + '%'; });
if (loadEl) loadEl.textContent = 'BUILDING SECTOR-07...';
await new Promise(r => setTimeout(r, 30));
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6; vmScene.environment = scene.environment; }
const KI = new Instancer();
const W = buildWorld(scene, { I: KI, mats: KITA.mats, size: kitSize });
KI.flush(scene);
const phys = new Physics(W.colliders);
G.W = W; G.phys = phys;
const navs = {
  surface: new NavGrid(phys, -EDGE - 0.5, -EDGE - 0.5, EDGE + 0.5, EDGE + 0.5, 0.15, 1, 0.3),
  subway: new NavGrid(phys, -45, 0, 45, 30, -12, 1.5),
  sewer: new NavGrid(phys, -160, -160, 160, 160, -26, 2),
  vibe: new NavGrid(phys, -33, -12, 33, 30, -50, 1.5),
};

// ---------- save ----------
const DEFAULT_SETTINGS = { bloom: true, lights: 8, tp: false, sens: 1, adsSens: 0.7, fov: 80, vol: 0.6, quality: 1, view: 420, fps: false, invertY: false, xhair: '#ffffff', names: true, bob: true };
function freshSave() {
  return { bank: START_BANK, level: 1, xp: 0, unlocked: [], passes: ['group'], codes: [], allowanceT: 0, settings: { ...DEFAULT_SETTINGS }, stats: { kills: 0, deaths: 0, downs: 0, safes: 0, registers: 0, earned: 0 }, session: null };
}
async function loadSave() {
  let s = null;
  try { const r = await fetch('/api/save'); if (r.ok) { const t = await r.text(); if (t && t !== 'null') s = JSON.parse(t); } } catch { }
  if (!s) try { s = JSON.parse(localStorage.getItem('cure_save') || 'null'); } catch { }
  const f = freshSave();
  s = Object.assign(f, s || {});
  s.settings = Object.assign({ ...DEFAULT_SETTINGS }, s.settings || {});
  s.stats = Object.assign(f.stats, s.stats || {});
  return s;
}
let saveTimer = 0;
export function save() {
  const s = G.save;
  if (G.state === 'play' && P.alive) s.session = { cash: P.cash, inv: P.inv.filter(e => e.id !== 'fists'), armor: P.armor, mode: G.mode };
  const txt = JSON.stringify(s);
  try { localStorage.setItem('cure_save', txt); } catch { }
  fetch('/api/save', { method: 'POST', body: txt }).catch(() => { });
}
G.saveNow = save;

// ---------- models ----------
const matCache = new Map();
const lam = (c, e = 0) => { const k = c + '_' + e; if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color: c, emissive: e })); return matCache.get(k); };
const boxGeoCache = new Map();
const bgeo = (w, h, d) => { const k = w + ',' + h + ',' + d; if (!boxGeoCache.has(k)) boxGeoCache.set(k, new THREE.BoxGeometry(w, h, d)); return boxGeoCache.get(k); };
function bx(parent, w, h, d, c, x, y, z, e) { const m = new THREE.Mesh(bgeo(w, h, d), lam(c, e)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }

export function weaponModel(item) {
  const gm = gunModel(item); if (gm) return gm;
  const g = new THREE.Group(), D = 0x34373c, S = 0x7a8088, Wd = 0x8a5e34;
  const wooden = ['mosin', 'sks', 'akm', 'tommy', 'doublebarrel', 'ithaca', 'r870'].includes(item.id);
  const T = item.type;
  if (T === 'pistol') { bx(g, 0.06, 0.09, 0.26, item.id === 'deagle' ? 0x9a9a9a : D, 0, 0.02, -0.1); bx(g, 0.05, 0.14, 0.07, D, 0, -0.08, -0.01); if (['deagle', 'magnum'].includes(item.id)) bx(g, 0.05, 0.05, 0.14, S, 0, 0.02, -0.29); if (item.id === 'tec9') bx(g, 0.04, 0.18, 0.04, S, 0, -0.1, -0.14); }
  else if (T === 'smg') { bx(g, 0.07, 0.1, 0.42, wooden ? Wd : D, 0, 0.02, -0.18); bx(g, 0.05, 0.16, 0.06, D, 0, -0.09, -0.05); bx(g, 0.04, 0.08, 0.14, S, 0, 0.03, -0.45); if (item.id === 'tommy') bx(g, 0.07, 0.2, 0.2, D, 0, -0.12, -0.22); else bx(g, 0.04, 0.17, 0.05, S, 0, -0.1, -0.2); }
  else if (T === 'rifle' || T === 'sniper') {
    const M = 0x2c2e31, WO = 0x6a4428, tan = ['scarh'].includes(item.id) ? 0x9a8a68 : M;
    const ak = ['akm', 'aks74u', 'sks'].includes(item.id), bolt = item.bolt;
    bx(g, 0.065, 0.085, 0.42, tan, 0, 0.02, -0.12);
    bx(g, 0.05, 0.03, 0.4, 0x1c1d1f, 0, 0.075, -0.12);
    bx(g, 0.06, 0.075, 0.3, ak || bolt ? WO : 0x232427, 0, 0.0, -0.46);
    bx(g, 0.028, 0.028, 0.36, 0x18191a, 0, 0.03, -0.74);
    bx(g, 0.03, 0.05, 0.03, 0x18191a, 0, 0.07, -0.86);
    bx(g, 0.04, 0.03, 0.04, 0x101010, 0, 0.03, -0.93);
    bx(g, 0.055, 0.12, 0.26, ak || bolt ? WO : 0x232427, 0, -0.03, 0.22);
    bx(g, 0.05, 0.14, 0.06, ak || bolt ? WO : 0x1c1c1e, 0, -0.09, 0.05);
    if (!bolt && item.id !== 'sks') { const mg = bx(g, 0.045, 0.2, 0.08, ak ? 0x2a2620 : 0x202124, 0, -0.13, -0.18); mg.rotation.x = ak ? -0.35 : -0.12; }
    if (bolt) bx(g, 0.07, 0.015, 0.015, 0x888888, 0.05, 0.06, -0.02);
    if (item.scope) { bx(g, 0.07, 0.07, 0.3, 0x111111, 0, 0.13, -0.14); bx(g, 0.08, 0.08, 0.05, 0x111111, 0, 0.13, -0.3); }
    else if (!ak) bx(g, 0.03, 0.05, 0.05, 0x18191a, 0, 0.1, 0.02);
  }
  else if (T === 'shotgun') { bx(g, 0.07, 0.09, item.id === 'supershorty' ? 0.45 : 0.85, wooden ? Wd : D, 0, 0.02, -0.3); bx(g, 0.04, 0.04, 0.5, S, 0, 0.06, -0.55); bx(g, 0.05, 0.15, 0.06, D, 0, -0.08, -0.05); if (item.id !== 'supershorty') bx(g, 0.06, 0.12, 0.24, Wd, 0, -0.03, 0.2); }
  else if (T === 'launcher') { const c = { firework: 0xc0392b, flaregun: 0xe67e22, bfg: 0x2ecc71, hallowslauncher: 0xe67e22 }[item.id] || 0x4a5a3a; bx(g, 0.14, 0.14, item.id === 'flaregun' ? 0.25 : 0.9, c, 0, 0.04, -0.25); bx(g, 0.05, 0.15, 0.06, D, 0, -0.08, -0.05); }
  else if (T === 'melee' || T === 'tool') {
    const id = item.id;
    if (id === 'fists') return g;
    const blade = ['katana', 'machete', 'slayersword', 'slayer2', 'hallowsblade', 'rambo', 'taiga', 'bayonet', 'shiv', 'balisong', 'curseddagger'].includes(id);
    const len = { shiv: 0.18, balisong: 0.2, curseddagger: 0.28, bayonet: 0.3, rambo: 0.32, taiga: 0.36, machete: 0.55, katana: 0.85, slayersword: 0.95, slayer2: 1.0, hallowsblade: 0.8 }[id] || 0.7;
    bx(g, 0.05, 0.05, 0.18, id === 'curseddagger' ? 0x3a0a0a : 0x2a1a10, 0, 0, 0.02);
    if (id === 'lockpick') { bx(g, 0.01, 0.01, 0.15, S, 0, 0, -0.1); }
    else if (blade) bx(g, 0.012, 0.07, len, id === 'curseddagger' ? 0x8a1010 : id.startsWith('slayer') ? 0xd0d8ff : 0xc8ccd0, 0, 0.01, -0.07 - len / 2);
    else if (['bat', 'metalbat', 'golfclub', 'baton'].includes(id)) bx(g, 0.06, 0.06, 0.75, id === 'bat' ? 0x9a7040 : 0x9aa0a6, 0, 0, -0.42);
    else if (['fireaxe', 'sledgehammer', 'shovel', 'scythe', 'eradicator'].includes(id)) { bx(g, 0.05, 0.05, 0.85, Wd, 0, 0, -0.45); bx(g, id === 'scythe' ? 0.02 : 0.08, id === 'scythe' ? 0.5 : 0.18, 0.12, id === 'fireaxe' ? 0xb02020 : id === 'eradicator' ? 0x5a1a8a : 0x777777, 0, 0.08, -0.85); }
    else if (id === 'chainsaw') { bx(g, 0.12, 0.18, 0.3, 0xd35400, 0, 0, -0.05); bx(g, 0.03, 0.08, 0.55, S, 0, 0, -0.45); }
    else if (id === 'crowbar') { bx(g, 0.03, 0.03, 0.7, 0x8a2020, 0, 0, -0.38); bx(g, 0.03, 0.1, 0.03, 0x8a2020, 0, 0.05, -0.72); }
    else if (id === 'knuckledusters') bx(g, 0.1, 0.04, 0.03, 0xaaaaaa, 0, 0, -0.02);
    else if (id === 'nunchucks') { bx(g, 0.04, 0.04, 0.25, 0x111111, 0, 0, -0.12); bx(g, 0.04, 0.04, 0.25, 0x111111, 0.05, -0.15, -0.2); }
    else if (id === 'wrench') bx(g, 0.04, 0.03, 0.4, S, 0, 0, -0.2);
    else bx(g, 0.05, 0.05, 0.6, S, 0, 0, -0.32);
  }
  else if (T === 'throw') { const c = { frag: 0x3a4a2a, molotov: 0x2a6a2a, flashbang: 0x777777, c4: 0xbba070, pipebomb: 0x555555, csgrenade: 0x6a6a20, incendiary: 0x8a3020, pepperspray: 0xaa2020 }[item.id] || 0x444444; bx(g, 0.09, item.id === 'molotov' ? 0.2 : 0.11, 0.09, c, 0, 0, -0.05); }
  else if (T === 'med') bx(g, 0.14, 0.1, 0.1, item.id === 'medkit' ? 0xd0d0d0 : item.id === 'ragedose' ? 0xaa2222 : 0xeeeecc, 0, 0, -0.05);
  else bx(g, 0.12, 0.08, 0.12, 0x777777, 0, 0, 0);
  if (isGun(item) && T !== 'launcher') {
    const L = T === 'pistol' ? 0.26 : T === 'smg' ? 0.42 : 0.8, front = T === 'pistol' ? -0.22 : T === 'smg' ? -0.38 : -0.62;
    bx(g, 0.015, 0.025, 0.02, 0x111111, 0, 0.078, front);
    bx(g, 0.04, 0.025, 0.02, 0x111111, 0, 0.078, T === 'pistol' ? 0.02 : -0.02);
    bx(g, 0.012, 0.05, 0.08, 0x1a1a1a, 0, -0.045, T === 'pistol' ? -0.06 : -0.1);
    bx(g, 0.03, 0.03, 0.06, 0x101010, 0, 0.02, front - (T === 'pistol' ? 0.04 : 0.08));
  }
  return g;
}

function makeCash(x, y, z, amt) {
  const m = new THREE.Group();
  bx(m, 0.35, 0.12, 0.2, 0x3a8a3a, 0, 0.06, 0);
  bx(m, 0.36, 0.03, 0.06, 0xd8d0a0, 0, 0.06, 0);
  m.position.set(x, y, z); m.rotation.y = rand(0, 6.28); scene.add(m);
  G.cashBags.push({ x, y, z, amt: Math.round(amt), mesh: m, t: 240 });
}
function dropItem(entry, x, y, z) {
  const it = ITEM[entry.id];
  const m = new THREE.Group();
  const wm = weaponModel(it); wm.rotation.set(0, rand(0, 6.28), Math.PI / 2); wm.position.y = 0.06; m.add(wm);
  if (!wm.children.length) bx(m, 0.25, 0.15, 0.25, 0x6a5a3a, 0, 0.075, 0);
  m.position.set(x, y, z); scene.add(m);
  const d = { entry, x, y, z, mesh: m, t: 300 };
  G.drops.push(d);
  G.inter.push({ kind: 'drop', ref: d, x, y: y + 0.3, z, range: 2, label: () => 'Pick up ' + it.name + (entry.count > 1 ? ' x' + entry.count : ''), use: () => pickupDrop(d) });
}

// ---------- interactables ----------
function canvasLabel(text, color = '#fff', w = 512, h = 128, bg) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.font = `900 ${h * 0.62}px Impact, "Arial Black", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = color; x.shadowColor = color; x.shadowBlur = 12; x.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
for (const l of W.labels) {
  if (l.map) continue;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.1), new THREE.MeshBasicMaterial({ map: canvasLabel(l.text, l.color), transparent: true, depthWrite: false, fog: true }));
  m.position.set(l.x, l.y, l.z); m.rotation.y = l.rot; scene.add(m);
}
for (const w of W.waters) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w.x1 - w.x0, w.z1 - w.z0), new THREE.MeshLambertMaterial({ color: 0x2f4a3a, transparent: true, opacity: 0.78 }));
  m.rotation.x = -Math.PI / 2; m.position.set((w.x0 + w.x1) / 2, w.y, (w.z0 + w.z1) / 2); scene.add(m);
}

const SAFE_RESPAWN = 720, REG_RESPAWN = 600, SCRAP_RESPAWN = 300, CRATE_RESPAWN = 900;
function faceRot(x, z) { return 0; }
const npcs = [];
function buildInteractables() {
  for (const a of W.atms) {
    const g = new THREE.Group();
    bx(g, 0.9, 1.9, 0.6, 0x7a8288, 0, 0.95, 0); bx(g, 0.92, 0.25, 0.62, 0x2a7a4a, 0, 1.92, 0); bx(g, 0.6, 0.4, 0.05, 0x2ad36a, 0, 1.45, -0.32, 0x1a8a4a); bx(g, 0.5, 0.12, 0.2, 0x2a2a2a, 0, 1.05, -0.38);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.22), new THREE.MeshBasicMaterial({ map: canvasLabel('ATM', '#7dffb0', 256, 64), transparent: true }));
    t.position.set(0, 1.78, -0.305); t.rotation.y = Math.PI; g.add(t);
    g.position.set(a.x, a.y, a.z); g.rotation.y = a.rot || 0; scene.add(g);
    phys.dyn.push({ min: [a.x - 0.45, a.y, a.z - 0.45], max: [a.x + 0.45, a.y + 1.9, a.z + 0.45] });
    G.inter.push({ kind: 'atm', ref: a, x: a.x, y: a.y + 1.2, z: a.z, range: 2.4, label: () => 'Use ATM', use: () => UI.open('atm', a) });
  }
  const dealerModel = (d, shirt, hat) => {
    const o = randomOutfit(); o.shirt = shirt; o.head = hat === 0x8a1010 ? 'ski' : hat === 0x222222 ? 'cap' : 'hood'; o.top = hat === 0x222222 ? 'vest' : 'hoodie'; o.vest = hat === 0x222222 ? 0x2a2e28 : null;
    const m = makeChar(o);
    m.position.set(d.x, d.y, d.z); m.rotation.y = d.rot || 0; scene.add(m);
    m.userData.play('idle');
    npcs.push(m);
    return m;
  };
  for (const d of W.dealers) {
    d.model = dealerModel(d, 0x2a2a30, 0x111111);
    G.inter.push({ kind: 'dealer', ref: d, x: d.x, y: d.y + 1.5, z: d.z, range: 3, label: () => 'Talk to ' + d.name, use: () => UI.open('shop', { kind: 'dealer', name: d.name }) });
  }
  for (const d of W.armories) {
    d.model = dealerModel(d, d.color === 'blue' ? 0x1f3a7a : 0x7a1f1f, 0x222222);
    G.inter.push({ kind: 'armory', ref: d, x: d.x, y: d.y + 1.5, z: d.z, range: 3.4, label: () => d.name + (hasPass('weaponry') ? '' : ' (Weaponry pass needed)'), use: () => hasPass('weaponry') ? UI.open('shop', { kind: 'armory', name: d.name }) : (UI.toast('The Armory requires the Weaponry pass (Store).', 'bad'), sfx.denied()) });
  }
  const rb = { x: 0, y: -26, z: 0, name: 'Rebel Dealer', rot: 0 };
  rb.model = dealerModel(rb, 0x3a1010, 0x8a1010);
  G.rebel = rb;
  G.inter.push({ kind: 'rebel', ref: rb, get x() { return rb.x; }, y: -24.5, get z() { return rb.z; }, range: 3, label: () => 'Talk to Rebel Dealer', use: () => UI.open('shop', { kind: 'rebel', name: 'Rebel Dealer' }) });
  moveRebel(randi(0, W.rebelSpots.length - 1));

  for (const r of W.registers) {
    const g = new THREE.Group();
    bx(g, 0.55, 0.28, 0.45, 0x2b2b2e, 0, 0.14, 0); bx(g, 0.3, 0.22, 0.05, 0x58d68d, 0, 0.42, 0.05, 0x1a6a3a);
    const drawer = bx(g, 0.5, 0.1, 0.4, 0x3a3a3e, 0, 0.05, 0.0);
    g.position.set(r.x, r.y, r.z); g.rotation.y = r.rot || 0; scene.add(g);
    const o = { kind: 'register', ref: r, x: r.x, y: r.y + 0.3, z: r.z, range: 2.6, open: false, t: 0, hits: 0, mesh: g, drawer, alarm: r.alarm, zone: r.zone, bld: r.bld,
      label: () => o.open ? 'Register (restocks in ' + mmss(o.t) + ')' : 'Cash Register — punch / crowbar it' };
    G.inter.push(o);
  }
  for (const s of W.safes) {
    const g = new THREE.Group(), w = s.big ? 1.3 : 0.8, h = s.big ? 1.8 : 0.8, d = s.big ? 1.0 : 0.75;
    bx(g, w, h, d, s.big ? 0x5a646c : 0x6a737a, 0, h / 2, 0);
    const hinge = new THREE.Group(); hinge.position.set(-w / 2 + 0.04, 0, -d / 2 - 0.03); g.add(hinge);
    const door = bx(hinge, w - 0.08, h - 0.08, 0.05, 0x7a858e, (w - 0.08) / 2, h / 2, 0);
    bx(door, 0.14, 0.14, 0.06, 0xb0b0b0, (w - 0.08) * 0.3, 0, -0.04);
    g.position.set(s.x, s.y, s.z); g.rotation.y = s.rot || 0; scene.add(g);
    phys.dyn.push({ min: [s.x - w / 2, s.y, s.z - d / 2], max: [s.x + w / 2, s.y + h, s.z + d / 2] });
    const o = { kind: 'safe', ref: s, big: s.big, x: s.x, y: s.y + h / 2, z: s.z, range: 2.6, open: false, t: 0, hits: 0, mesh: g, hinge, alarm: s.alarm, zone: s.zone, bld: s.bld,
      label: () => o.open ? (s.big ? 'Big Safe' : 'Small Safe') + ' (respawns in ' + mmss(o.t) + ')' : (s.big ? 'Big Safe' : 'Small Safe') + (invCount('lockpick') ? ' — [E] Lockpick' : ' — need Lockpick or Crowbar'),
      use: () => { if (o.open) return; if (!invCount('lockpick')) { UI.toast('You need a Lockpick (or hit it with a Crowbar).', 'bad'); return; } UI.lockpick(s.big ? 3 : 2, (ok, broke) => { if (broke) { invTake('lockpick', 1); UI.toast('Your lockpick broke!', 'bad'); } if (ok) openSafe(o, P); }); } };
    G.inter.push(o);
  }
  for (const s of W.scrap) {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) bx(g, rand(0.2, 0.55), rand(0.15, 0.4), rand(0.2, 0.55), s.gold ? pick([0xc9a227, 0xe0b83a, 0x8a6a1a]) : pick([0x5a4a3a, 0x6a6a62, 0x4a3a2a, 0x7a5a3a]), rand(-0.4, 0.4), 0.12 + i * 0.05, rand(-0.4, 0.4));
    g.position.set(s.x, s.y, s.z); scene.add(g);
    const o = { kind: 'scrap', ref: s, gold: s.gold, x: s.x, y: s.y + 0.4, z: s.z, range: 2.4, open: false, t: 0, mesh: g, hold: 2.5, zone: s.zone,
      label: () => o.open ? 'Searched (' + mmss(o.t) + ')' : (s.gold ? 'Golden Scrap Pile' : 'Scrap Pile') + ' — hold [E] to search', use: () => !o.open && searchScrap(o, P) };
    G.inter.push(o);
  }
  for (const c of W.crates) addCrate(c.kind, c.x, c.y, c.z, c.zone);
  for (const t of W.teleports) {
    G.inter.push({ kind: 'tp', ref: t, x: t.x, y: t.y + 1, z: t.z, range: 2.4, label: () => t.elevatorBottom ? (G.elev.bottomT > 0 ? 'Ride elevator up' : 'Elevator is at the top — someone must call it down') : t.label, use: () => useTeleport(t, P) });
  }
}
function addCrate(kind, x, y, z, zone, once) {
  const g = new THREE.Group();
  const col = { red: 0x8a2020, gold: 0xc9a227, mystery: 0x5a2a7a, airdrop: 0x3a5a3a }[kind];
  bx(g, 1.2, 0.7, 0.8, col, 0, 0.35, 0);
  const lid = bx(g, 1.24, 0.12, 0.84, kind === 'gold' ? 0xe0c04a : 0x2a2a2a, 0, 0.76, 0);
  if (kind === 'mystery') { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshBasicMaterial({ map: canvasLabel('?', '#ffd6ff', 128, 96), transparent: true })); t.position.set(0, 0.4, -0.405); t.rotation.y = Math.PI; g.add(t); }
  g.position.set(x, y, z); scene.add(g);
  const name = { red: 'Weapon Crate', gold: 'Golden Weapon Crate', mystery: 'Mystery Crate', airdrop: 'Airdrop Crate' }[kind];
  const o = { kind: 'crate', ctype: kind, x, y: y + 0.6, z, range: 2.6, open: false, t: 0, mesh: g, lid, hold: kind === 'airdrop' ? 5 : 3.5, zone, once,
    label: () => o.open ? name + ' (empty, ' + mmss(o.t) + ')' : name + ' — hold [E] to open', use: () => !o.open && openCrate(o, P) };
  G.inter.push(o);
  return o;
}
const mmss = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

function moveRebel(i) {
  G.rebelIdx = i; const [x, z] = W.rebelSpots[i];
  G.rebel.x = x; G.rebel.z = z + 1; G.rebel.model.position.set(x, -26, z + 1);
}

// ---------- shops ----------
function stockFor(kind) {
  const s = {};
  for (const it of ITEMS) {
    const price = kind === 'dealer' ? it.d : kind === 'armory' ? it.a : (it.r ?? (it.d != null ? Math.round(it.d * 0.8) : undefined));
    if (price === undefined || it.id === 'fists') continue;
    if (kind === 'rebel' && it.type === 'melee' && price < 300) continue;
    s[it.id] = it.stock ?? (isGun(it) ? (kind === 'armory' ? 5 : kind === 'rebel' ? 1 : 2) : it.type === 'armor' ? 3 : it.type === 'throw' ? 4 : it.type === 'tool' ? 10 : 3);
  }
  return s;
}
function restock() { G.dealerStock = stockFor('dealer'); G.armoryStock = stockFor('armory'); G.rebelStock = stockFor('rebel'); }
G.shopPrice = (it, kind) => kind === 'dealer' ? it.d : kind === 'armory' ? it.a : (it.r ?? (it.d != null ? Math.round(it.d * 0.8) : undefined));
G.stockOf = (kind) => kind === 'dealer' ? G.dealerStock : kind === 'armory' ? G.armoryStock : G.rebelStock;
G.bankFee = (price) => Math.max(25, Math.round(price * 0.15));
export const hasPass = (id) => G.save.passes.includes(id);
G.hasPass = hasPass;
G.isUnlocked = (it) => !it.lv || G.save.level >= it.lv || G.save.unlocked.includes(it.id) || it.d === 0;
G.unlockPrice = (it) => unlockPrice(it, G.save.level);

function pay(amount, useBank) {
  if (useBank) { if (G.save.bank < amount) return false; G.save.bank -= amount; }
  else { if (P.cash < amount) return false; P.cash -= amount; }
  return true;
}
G.buy = (id, kind, mode, useBank) => {
  const it = ITEM[id], stock = G.stockOf(kind);
  let price = G.shopPrice(it, kind);
  if (mode === 'unlock') {
    const up = G.unlockPrice(it);
    const total = up + (useBank ? G.bankFee(up) : 0);
    if (!pay(total, useBank)) return UI.toast('Not enough ' + (useBank ? 'bank money' : 'cash') + '.', 'bad'), sfx.denied();
    G.save.unlocked.push(id); sfx.cash(); UI.toast(it.name + ' unlocked!', 'good'); save(); return;
  }
  if (!stock[id]) return UI.toast('Out of stock — restocks soon.', 'bad'), sfx.denied();
  if (mode === 'rent') price *= 3;
  else if (!G.isUnlocked(it)) return UI.toast('Locked until level ' + it.lv + '.', 'bad'), sfx.denied();
  if (it.type !== 'armor' && it.type !== 'kit' && !invFits(it) && !invStackable(it)) return UI.toast('Not enough inventory slots.', 'bad'), sfx.denied();
  const total = price + (useBank ? G.bankFee(price) : 0);
  if (!pay(total, useBank)) return UI.toast('Not enough ' + (useBank ? 'bank money' : 'cash') + '.', 'bad'), sfx.denied();
  stock[id]--;
  if (it.type === 'kit') it.kit.forEach(k => giveItem(k));
  else giveItem(id);
  sfx.cash(); UI.toast('Bought ' + it.name + ' for ' + fmt(total), 'good'); save();
};
G.refill = (idx, useBank) => {
  const e = P.inv[idx], it = ITEM[e.id];
  const total = it.ammo + (useBank ? G.bankFee(it.ammo) : 0);
  if (e.reserve >= it.mag * 5) return UI.toast('Ammo already full.', 'bad');
  if (!pay(total, useBank)) return UI.toast('Not enough money.', 'bad'), sfx.denied();
  e.reserve = it.mag * 5; sfx.reload(); UI.toast('Refilled ' + it.name + ' ammo.', 'good');
};
G.sell = (idx) => {
  const e = P.inv[idx]; if (!e || e.id === 'fists') return;
  const it = ITEM[e.id];
  const v = it.sell ?? Math.round((it.d || it.a || it.r || 0) * 0.5);
  const n = e.count || 1;
  P.cash += v * n; P.inv.splice(idx, 1); fixEquip(); sfx.cash(); UI.toast('Sold ' + it.name + (n > 1 ? ' x' + n : '') + ' for ' + fmt(v * n), 'good');
};
G.sellArmor = (slot) => {
  const a = P.armor[slot]; if (!a) return;
  const it = ITEM[a.id], v = Math.round((it.d || it.a || 0) * 0.5 * Math.max(0.2, (a.dur ?? 1) / (it.dur || 1)));
  P.armor[slot] = null; P.cash += v; sfx.cash(); UI.toast('Sold ' + it.name + ' for ' + fmt(v), 'good');
};
G.deposit = (amt) => { amt = Math.floor(Math.min(amt, P.cash)); if (amt <= 0) return; P.cash -= amt; G.save.bank += amt; sfx.cash(); save(); };
G.withdraw = (amt) => { amt = Math.floor(Math.min(amt, G.save.bank, 25000)); if (amt <= 0) return; G.save.bank -= amt; P.cash += amt; sfx.cash(); save(); };
G.allowanceReady = () => G.save.allowanceT >= ALLOWANCE_SEC;
G.allowanceAmount = () => Math.round(ALLOWANCE * (1 + (hasPass('group') ? 0.1 : 0) + (hasPass('extraincome') ? 0.2 : 0) + (hasPass('premium') ? 0.3 : 0)));
G.claimAllowance = () => {
  if (!G.allowanceReady()) return;
  const a = G.allowanceAmount();
  G.save.allowanceT = 0; G.save.bank += a; G.save.stats.earned += a; addXP(60); sfx.cash(); UI.toast('Allowance claimed: ' + fmt(a) + ' to bank', 'good'); save();
};
G.redeem = (code) => {
  code = code.trim().toUpperCase();
  const c = CODES[code];
  if (!c) return UI.toast('Invalid code.', 'bad'), sfx.denied();
  if (!c.dev && G.save.codes.includes(code)) return UI.toast('Code already redeemed.', 'bad'), sfx.denied();
  if (c.dev) {
    G.save.bank += 1000000; G.save.level = Math.max(G.save.level, 100); G.save.unlocked = ITEMS.map(i => i.id);
    for (const p of ['weaponry', 'extraincome', 'premium', 'group']) if (!G.save.passes.includes(p)) G.save.passes.push(p);
    G.save.allowanceT = ALLOWANCE_SEC;
  } else {
    G.save.codes.push(code);
    if (c.cash) G.save.bank += c.cash;
    if (c.xp) addXP(c.xp);
    if (c.unlock) G.save.unlocked.push(c.unlock);
  }
  sfx.levelup(); UI.toast('Code redeemed: ' + c.msg, 'good'); save();
};
G.buyPass = (p) => {
  if (hasPass(p.id)) return;
  if (G.save.bank < p.price) return UI.toast('Not enough bank money for ' + p.name + '.', 'bad'), sfx.denied();
  G.save.bank -= p.price; G.save.passes.push(p.id); sfx.levelup(); UI.toast(p.name + ' pass purchased!', 'good'); save();
};

// ---------- player ----------
const P = {
  name: 'You', isPlayer: true, pos: new THREE.Vector3(0, 0.15, 10), vel: new THREE.Vector3(), radius: 0.4, height: 1.8, onGround: false,
  yaw: 0, pitch: 0, hp: 100, maxHp: 100, stamina: 100, cash: 0, inv: [], eq: 0, armor: { vest: null, helmet: null, pack: null, suit: null, eyes: null },
  alive: true, downed: false, downHp: 0, downT: 0, dead: false, kills: 0, bounty: 0, level: 1, zone: 'surface', crouch: false, ads: 0, fireT: 0, reloadT: 0, useT: 0, using: null,
  swingT: 0, recoilP: 0, regenDelay: 0, rageT: 0, thermal: false, c4s: [], flashT: 0, gasT: 0, streak: 0, lastHitBy: null, spray: 0,
};
G.P = P;
export function invSlotsUsed() { return P.inv.reduce((a, e) => a + (ITEM[e.id].s || 0), 0); }
export function invCap() { return 12 + (P.armor.pack ? ITEM[P.armor.pack.id].extra : 0); }
G.invSlotsUsed = invSlotsUsed; G.invCap = invCap;
const invFits = (it) => invSlotsUsed() + (it.s || 0) <= invCap() + 1e-6;
const invStackable = (it) => it.stack && P.inv.some(e => e.id === it.id && (e.count || 1) < it.stack);
export function invCount(id) { return P.inv.filter(e => e.id === id).reduce((a, e) => a + (e.count || 1), 0); }
function invTake(id, n) { const i = P.inv.findIndex(e => e.id === id); if (i < 0) return; const e = P.inv[i]; e.count = (e.count || 1) - n; if (e.count <= 0) { P.inv.splice(i, 1); fixEquip(); } }
function fixEquip() { if (P.eq >= P.inv.length) P.eq = 0; }
function newEntry(id) {
  const it = ITEM[id];
  if (isGun(it)) return { id, mag: it.mag, reserve: it.mag * 3 };
  if (it.stack) return { id, count: 1 };
  if (it.charges) return { id, charges: it.charges };
  return { id };
}
function giveItem(id, fromEntry) {
  const it = ITEM[id];
  if (it.type === 'armor') {
    const old = P.armor[it.slot];
    if (old) dropItem({ id: old.id, dur: old.dur }, P.pos.x + rand(-0.5, 0.5), P.pos.y, P.pos.z + rand(-0.5, 0.5));
    P.armor[it.slot] = { id, dur: fromEntry?.dur ?? it.dur ?? 1 };
    return true;
  }
  if (it.stack) {
    const e = P.inv.find(e => e.id === id && (e.count || 1) < it.stack);
    if (e) { e.count = Math.min(it.stack, (e.count || 1) + (fromEntry?.count || 1)); return true; }
  }
  if (!invFits(it)) { dropItem(fromEntry || newEntry(id), P.pos.x, P.pos.y, P.pos.z); UI.toast('Inventory full — item dropped.', 'bad'); return false; }
  P.inv.push(fromEntry ? { ...fromEntry } : newEntry(id));
  return true;
}
G.giveItem = giveItem;
function pickupDrop(d) {
  if (!G.drops.includes(d)) return;
  const it = ITEM[d.entry.id];
  if (it.type !== 'armor' && !invFits(it) && !invStackable(it)) return UI.toast('Not enough inventory slots.', 'bad');
  giveItem(d.entry.id, d.entry); removeDrop(d); sfx.pick();
}
function removeDrop(d) {
  scene.remove(d.mesh); G.drops.splice(G.drops.indexOf(d), 1);
  const i = G.inter.findIndex(o => o.ref === d); if (i >= 0) G.inter.splice(i, 1);
}
G.dropInv = (idx) => {
  const e = P.inv[idx]; if (!e || e.id === 'fists') return;
  P.inv.splice(idx, 1); fixEquip();
  const f = fwd(); dropItem(e, P.pos.x + f.x, P.pos.y, P.pos.z + f.z);
};
G.dropArmor = (slot) => { const a = P.armor[slot]; if (!a) return; P.armor[slot] = null; const f = fwd(); dropItem({ id: a.id, dur: a.dur }, P.pos.x + f.x, P.pos.y, P.pos.z + f.z); };
G.equip = (i) => { if (i < P.inv.length && i !== P.eq) { P.eq = i; P.reloadT = 0; P.using = null; P.fireT = Math.max(P.fireT, 0.25); buildVM(); sfx.click(); } };
G.moveInv = (a, b) => { if (b < 0 || b >= P.inv.length || a === 0 || b === 0) return; const [e] = P.inv.splice(a, 1); P.inv.splice(b, 0, e); P.eq = b; buildVM(); };

function addXP(x) {
  const s = G.save; s.xp += x;
  while (s.xp >= xpForLevel(s.level)) {
    s.xp -= xpForLevel(s.level); s.level++;
    const r = levelReward(s.level); s.bank += r;
    sfx.levelup(); UI.banner('LEVEL ' + s.level, 'Level-up reward ' + fmt(r) + ' sent to bank');
  }
  P.level = s.level;
}
G.addXP = addXP;

const fwd = () => new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
function aimDir() { const d = new THREE.Vector3(0, 0, -1); d.applyEuler(new THREE.Euler(P.pitch, P.yaw, 0, 'YXZ')); return d; }
const eyeH = (c) => c.downed ? 0.5 : c.crouch ? 1.15 : 1.62;
const eyeOf = (c) => new THREE.Vector3(c.pos.x, c.pos.y + eyeH(c), c.pos.z);

// ---------- viewmodel ----------
let vm = new THREE.Group(); vmScene.add(vm);
let vmItem = null, vmSwing = 0;
function buildVM() {
  vmScene.remove(vm); vm = new THREE.Group(); vmScene.add(vm);
  const e = P.inv[P.eq]; vmItem = e ? ITEM[e.id] : ITEM.fists;
  const skin = 0x151515, sleeve = 0x2e3440;
  const arm = (x, rx) => { const a = new THREE.Group(); bx(a, 0.12, 0.12, 0.46, sleeve, 0, 0, 0.2); bx(a, 0.125, 0.125, 0.04, 0x252a33, 0, 0, -0.01); bx(a, 0.115, 0.115, 0.11, skin, 0, 0, -0.08); a.position.set(x, -0.05, 0); a.rotation.x = rx; return a; };
  if (vmItem.id === 'fists' || vmItem.id === 'knuckledusters') {
    const l = arm(-0.18, 0.1), r = arm(0.18, 0.1); vm.add(l, r); vm.userData.l = l; vm.userData.r = r;
    if (vmItem.id === 'knuckledusters') { bx(l, 0.11, 0.04, 0.03, 0xaaaaaa, 0, 0.02, -0.12); bx(r, 0.11, 0.04, 0.03, 0xaaaaaa, 0, 0.02, -0.12); }
  } else {
    const w = weaponModel(vmItem); vm.add(w); vm.userData.w = w; if (isGun(vmItem)) w.scale.setScalar(0.62);
    const r = arm(0.0, 0); r.position.set(0.02, -0.12, 0.08); vm.add(r);
    r.position.set(0.02, -0.08, 0.06); r.scale.setScalar(0.75);
    if (isGun(vmItem)) { const l = arm(-0.06, -0.2); l.position.set(-0.06, -0.06, ['rifle', 'sniper', 'shotgun'].includes(vmItem.type) ? -0.2 : -0.04); l.rotation.y = 0.45; l.scale.setScalar(0.75); vm.add(l); }
    if (isMeleeish(vmItem)) w.rotation.x = 0.9;
  }
  vm.userData.base = isGun(vmItem) ? (['rifle', 'sniper', 'shotgun', 'launcher'].includes(vmItem.type) ? new THREE.Vector3(0.2, -0.24, -0.62) : vmItem.type === 'smg' ? new THREE.Vector3(0.19, -0.22, -0.55) : new THREE.Vector3(0.17, -0.2, -0.48)) : vm.userData.l ? new THREE.Vector3(0, -0.27, -0.4) : new THREE.Vector3(0.22, -0.24, -0.45);
  vm.position.copy(vm.userData.base);
}

// ---------- bots ----------
const SHIRTS = [0x2a2c30, 0x1e1f22, 0x3a3f36, 0x4a3a30, 0x3a4250, 0x5a2a28, 0x2e3a2e, 0x55585c, 0x6a5a48, 0x24303c];
let botId = 0;
function botLoadout(level) {
  const guns = ITEMS.filter(i => isGun(i) && !i.rare && (i.lv || 1) <= level && i.type !== 'launcher');
  const melees = ITEMS.filter(i => i.type === 'melee' && i.id !== 'fists' && (i.lv || 1) <= level && (i.d || i.a) < 2000);
  const roll = Math.random();
  const gun = roll < 0.12 ? null : pick(guns.slice(-Math.max(4, Math.min(guns.length, 8))));
  const melee = melees.length ? pick(melees) : ITEM.fists;
  const vest = level >= 40 && Math.random() < 0.6 ? 't3vest' : level >= 20 && Math.random() < 0.5 ? 't2vest' : level >= 3 && Math.random() < 0.5 ? 't1vest' : null;
  const helmet = level >= 38 && Math.random() < 0.5 ? 't3helmet' : level >= 18 && Math.random() < 0.4 ? 't2helmet' : level >= 3 && Math.random() < 0.3 ? 't1helmet' : null;
  return { gun, melee, vest, helmet };
}
function spawnBot(zone, at) {
  const nav = navs[zone];
  let pos = at;
  if (!pos) {
    for (let i = 0; i < 30; i++) {
      const [x, z] = nav.randomFree();
      if (P.alive && G.state === 'play' && P.zone === zone && Math.hypot(x - P.pos.x, z - P.pos.z) < 45) continue;
      pos = [x, z]; break;
    }
    pos = pos || nav.randomFree();
  }
  const level = Math.max(1, Math.round(Math.pow(Math.random(), 1.7) * 95) + (zone === 'vibe' ? 25 : 0));
  const lo = botLoadout(level);
  const model = makeChar();
  scene.add(model);
  const b = {
    id: ++botId, name: pick(BOT_NAMES) + (Math.random() < 0.5 ? randi(1, 99) : ''), level, skill: clamp(level / 100 + rand(-0.15, 0.25), 0.05, 1), zone,
    pos: new THREE.Vector3(pos[0], ZONES[zone].y + 0.3, pos[1]), vel: new THREE.Vector3(), radius: 0.4, height: 1.8, onGround: false,
    yaw: rand(0, 6.28), hp: 100, maxHp: 100, armor: { vest: lo.vest ? { id: lo.vest, dur: ITEM[lo.vest].dur } : null, helmet: lo.helmet ? { id: lo.helmet, dur: ITEM[lo.helmet].dur } : null },
    gun: lo.gun ? { id: lo.gun.id, mag: lo.gun.mag, reserve: lo.gun.mag * 4 } : null, melee: lo.melee.id, meds: randi(0, 3), cash: randi(50, 900), kills: 0, bounty: 0,
    state: 'roam', target: null, path: null, pi: 0, repathT: 0, thinkT: rand(0, 0.3), fireT: 0, reloadT: 0, seeT: 0, swingT: 0, aggro: rand(0.3, 1),
    downed: false, downHp: 0, downT: 0, dead: false, deadT: 0, model, friendT: 0, stuckT: 0, lastP: new THREE.Vector3(), goal: null, robT: 0, walkPh: 0,
    crouch: false, seesPlayer: false, lastHitBy: null, regenDelay: 0, burn: 0, stunT: 0, blindT: 0,
  };
  setBotWeapon(b, b.gun ? 'gun' : 'melee');
  G.bots.push(b);
  return b;
}
function outfit(model) {
  const u = model.userData, r = Math.random();
  const head = u.head;
  if (r < 0.35) { const bal = bx(model, 0.42, 0.42, 0.42, pick([0x111214, 0x1c1e22, 0x2a2a2a]), 0, 1.88, 0); bx(model, 0.26, 0.09, 0.02, 0xd0a080, 0, 1.93, -0.212); }
  else if (r < 0.55) { bx(model, 0.5, 0.22, 0.5, 0x3a3f36, 0, 2.06, 0); bx(model, 0.5, 0.34, 0.08, 0x3a3f36, 0, 1.86, 0.22); bx(model, 0.44, 0.06, 0.2, 0x2a2e28, 0, 1.95, -0.3); }
  else if (r < 0.72) { bx(model, 0.52, 0.5, 0.5, pick([0x2a2c30, 0x3a2a24, 0x30363e]), 0, 1.92, 0.04); bx(model, 0.34, 0.3, 0.02, 0x0a0a0a, 0, 1.86, -0.215); }
  if (Math.random() < 0.35) { bx(model, 0.7, 0.62, 0.42, pick([0x2a2e28, 0x1a1a1c, 0x3a3a34]), 0, 1.3, 0); }
}
function setBotWeapon(b, which) {
  b.using = which;
  const it = which === 'gun' && b.gun ? ITEM[b.gun.id] : ITEM[b.melee];
  b.model.userData.setHeld(it, weaponModel);
}
const botItem = (b) => b.using === 'gun' && b.gun ? ITEM[b.gun.id] : ITEM[b.melee];

function hostile(a, b) {
  if (a === b || a.dead || b.dead) return false;
  if (a.isPlayer || b.isPlayer) { const bot = a.isPlayer ? b : a; return bot.friendT <= 0; }
  return true;
}
function los(a, b) {
  const o = eyeOf(a), t = eyeOf(b); const d = t.clone().sub(o); const L = d.length(); d.divideScalar(L);
  return phys.ray(o, d, L).t >= L - 0.05;
}
function allChars() { return P.alive && G.state === 'play' ? [P, ...G.bots] : G.bots; }

function botThink(b) {
  const me = botItem(b);
  let best = null, bd = 1e9;
  for (const c of allChars()) {
    if (c === b || c.dead || c.zone !== b.zone || !hostile(b, c)) continue;
    const d = c.pos.distanceTo(b.pos);
    let range = c.isPlayer ? 75 : 45;
    if (c.isPlayer && P.bounty > 0) range += 25;
    if (d > range) continue;
    const pref = d * (c.isPlayer ? 0.7 / b.aggro : 1) * (c.downed ? 1.6 : 1) - c.bounty * 0.004;
    if (pref < bd && los(b, c)) { bd = pref; best = c; }
  }
  if (b.target && best !== b.target) b.seeT = 0;
  b.seesPlayer = best === P || (P.alive && P.zone === b.zone && b.pos.distanceTo(P.pos) < 35 && los(b, P));
  if (best && (b.state !== 'flee' || best.pos.distanceTo(b.pos) < 10)) {
    if (!best.isPlayer && Math.random() > b.aggro * 0.9 && !b.target) best = null;
  }
  b.target = best;
  if (b.hp < 35 && b.meds > 0 && !b.target) { b.state = 'heal'; b.healT = 3; return; }
  if (b.target) {
    b.state = 'fight';
    const dist = b.target.pos.distanceTo(b.pos);
    if (b.gun && (b.gun.mag > 0 || b.gun.reserve > 0) && (dist > 3.5 || !b.melee)) { if (b.using !== 'gun') setBotWeapon(b, 'gun'); }
    else if (b.using !== 'melee') setBotWeapon(b, 'melee');
  } else if (b.state === 'fight' || b.state === 'heal') { b.state = 'roam'; b.path = null; }
}
function botGoal(b) {
  const opts = G.inter.filter(o => o.zone === b.zone && !o.open && (o.kind === 'register' || o.kind === 'safe' || o.kind === 'scrap' || o.kind === 'crate'));
  if (G.airdrop?.crate && !G.airdrop.crate.open && b.zone === 'surface' && Math.random() < 0.5) return G.airdrop.crate;
  if (opts.length && Math.random() < 0.65) {
    opts.sort((a, c) => Math.hypot(a.x - b.pos.x, a.z - b.pos.z) - Math.hypot(c.x - b.pos.x, c.z - b.pos.z));
    return pick(opts.slice(0, 5));
  }
  const [x, z] = navs[b.zone].randomFree();
  return { x, z, y: ZONES[b.zone].y, wander: true };
}
let pathBudget = 0;
function botPathTo(b, x, z) {
  if (pathBudget <= 0) return false;
  pathBudget--;
  const p = navs[b.zone].path(b.pos.x, b.pos.z, x, z);
  b.path = p; b.pi = 1; b.repathT = rand(2.5, 4);
  return !!p;
}
function botFollow(b, speed) {
  if (!b.path || b.pi >= b.path.length) return false;
  const [x, z] = b.path[b.pi];
  const dx = x - b.pos.x, dz = z - b.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.8) { b.pi++; return true; }
  b.vel.x = dx / d * speed; b.vel.z = dz / d * speed;
  b.yaw = lerpAngle(b.yaw, Math.atan2(-dx, -dz), 0.2);
  return true;
}
const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

function updateBot(b, dt) {
  if (b.dead) {
    b.deadT -= dt;
    if (b.deadT < 6) b.model.position.y -= dt * 0.15;
    if (b.deadT <= 0) { scene.remove(b.model); G.bots.splice(G.bots.indexOf(b), 1); setTimeout(() => G.bots.length < botTarget() && spawnBot(pick(['surface', 'surface', 'surface', 'surface', b.zone])), rand(8000, 25000)); }
    return;
  }
  b.friendT -= dt; b.stunT -= dt; b.blindT -= dt; b.regenDelay -= dt;
  if (b.burn > 0) { b.burn -= dt; hurt(b, 6 * dt, 'body', b.burnBy, null, true); }
  if (b.downed) { updateDowned(b, dt); b.vel.x *= 0.8; b.vel.z *= 0.8; phys.move(b, dt); poseBot(b, dt); return; }
  if (b.regenDelay < 0 && b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + dt * 1.2);
  b.thinkT -= dt;
  if (b.thinkT <= 0) { b.thinkT = rand(0.2, 0.35); botThink(b); }
  b.vel.x = 0; b.vel.z = 0;
  const speed = 6.2;
  if (b.stunT > 0) { }
  else if (b.state === 'heal') {
    b.healT -= dt;
    if (b.healT <= 0) { b.meds--; b.hp = Math.min(100, b.hp + 45); b.state = 'roam'; }
  } else if (b.state === 'fight' && b.target) {
    const t = b.target, it = botItem(b);
    const dx = t.pos.x - b.pos.x, dz = t.pos.z - b.pos.z, dist = Math.hypot(dx, dz);
    b.yaw = lerpAngle(b.yaw, Math.atan2(-dx, -dz), 0.35);
    b.aimPitch = Math.atan2((t.pos.y - b.pos.y) + (t.downed ? -1.2 : 0), Math.max(1, dist));
    b.seeT += dt;
    if (isGun(it)) {
      const want = it.type === 'shotgun' ? 8 : it.type === 'sniper' ? 40 : it.type === 'pistol' ? 15 : 20;
      if (t.downed && dist > 3) { if (b.repathT <= 0 || !b.path) botPathTo(b, t.pos.x, t.pos.z); botFollow(b, speed); }
      else if (dist > want + 8) { b.repathT -= dt; if (b.repathT <= 0 || !b.path) botPathTo(b, t.pos.x, t.pos.z); botFollow(b, speed * 0.9); }
      else { const s = Math.sin(G.time * (1 + b.id % 3) + b.id) * 3.2; b.vel.x = Math.cos(b.yaw) * s; b.vel.z = -Math.sin(b.yaw) * s; }
      botShoot(b, dt, it, t, dist);
    } else {
      b.repathT -= dt;
      if (dist > 2.2) {
        if (dist < 6 && los(b, t)) { b.vel.x = dx / dist * speed * 1.1; b.vel.z = dz / dist * speed * 1.1; }
        else { if (b.repathT <= 0 || !b.path) botPathTo(b, t.pos.x, t.pos.z); botFollow(b, speed * 1.1); }
      }
      b.swingT -= dt;
      if (dist < (it.range || 2.6) + 0.3 && b.swingT <= 0 && b.seeT > 0.35) {
        b.swingT = (it.rate || 0.5) * rand(1.1, 1.7);
        b.anim = 0.25;
        const dmg = (it.dmg || 8) * (t.downed ? 1.5 : 1);
        if (Math.random() < 0.55 + b.skill * 0.35) { hurt(t, dmg, 'body', b, it); sfx.hit(camDist(b)); if (t.isPlayer) UI.hurt(dmg); }
        else sfx.swing();
      }
    }
  } else {
    if (b.robT > 0) {
      b.robT -= dt; b.anim = (b.anim || 0) > 0 ? b.anim : 0.25;
      if (b.robT <= 0 && b.goal && !b.goal.open) botLoot(b, b.goal);
      if (b.robT <= 0) b.goal = null;
    } else {
      if (!b.goal || (b.goal.open && !b.goal.wander)) { b.goal = botGoal(b); b.path = null; }
      const g = b.goal, d = Math.hypot(g.x - b.pos.x, g.z - b.pos.z);
      if (d < 2.2) { if (g.wander) b.goal = null; else { b.robT = g.kind === 'safe' ? (g.big ? 7 : 5) : g.kind === 'scrap' ? 3 : 2.5; } }
      else {
        if (!b.path) { if (!botPathTo(b, g.x, g.z) && pathBudget > 0) b.goal = null; }
        if (!botFollow(b, speed * 0.8) && b.path) b.goal = null;
      }
    }
  }
  if (b.blindT > 0) { b.vel.x *= 0.3; b.vel.z *= 0.3; }
  if (inWater(b)) { b.vel.x *= 0.55; b.vel.z *= 0.55; }
  const before = b.pos.clone();
  phys.move(b, dt);
  if (b.onGround && (b.vel.x || b.vel.z)) {
    const moved = before.distanceTo(b.pos);
    if (moved < dt * 1) { b.stuckT += dt; if (b.stuckT > 0.6) { b.vel.y = 8; b.stuckT = 0; b.path = null; if (Math.random() < 0.3) b.goal = null; } }
    else b.stuckT = 0;
  }
  b.walkPh += Math.hypot(b.vel.x, b.vel.z) * dt * 1.6;
  if (b.pos.y < ZONES[b.zone].y - 20) kill(b, b.lastHitBy, null, 'fell');
  poseBot(b, dt);
}
function botShoot(b, dt, it, t, dist) {
  b.reloadT -= dt; b.fireT -= dt;
  if (b.reloadT > 0) return;
  const g = b.gun;
  if (g.mag <= 0) { if (g.reserve > 0) { const n = Math.min(it.mag, g.reserve); g.reserve -= n; g.mag = n; b.reloadT = it.reload; sfx.reload(); } else setBotWeapon(b, 'melee'); return; }
  if (b.seeT < 0.55 - b.skill * 0.3 || b.fireT > 0 || b.blindT > 0) return;
  if (b.thinkT > 0.3 && !los(b, t)) return;
  const burst = it.auto ? 3 + randi(0, 4) : 1;
  b.fireT = 60 / it.rpm * (it.auto ? 1 : rand(1.6, 3.2)) * (b.burstN > 0 ? 1 : (it.auto ? rand(2, 4) : 1));
  b.burstN = (b.burstN || burst) - 1;
  g.mag--;
  const o = eyeOf(b), tgt = eyeOf(t); tgt.y -= t.downed ? 0.2 : (Math.random() < 0.15 + b.skill * 0.2 ? 0.05 : 0.45);
  const dir = tgt.sub(o).normalize();
  const mv = t.vel ? Math.hypot(t.vel.x, t.vel.z) : 0;
  const err = (0.07 - b.skill * 0.05) + mv * 0.006 + dist * 0.0004 + (t.crouch ? 0.006 : 0);
  dir.x += rand(-err, err); dir.y += rand(-err, err) * 0.6; dir.z += rand(-err, err); dir.normalize();
  b.anim = 0.08;
  fireWeapon(b, o, dir, it);
}
function botLoot(b, o) {
  if (o.kind === 'register' || o.kind === 'safe') { if (o.kind === 'safe') openSafe(o, b); else openRegister(o, b); }
  else if (o.kind === 'scrap') { o.open = true; o.t = SCRAP_RESPAWN; o.mesh.visible = false; b.cash += randi(10, 80); }
  else if (o.kind === 'crate') { openCrate(o, b); }
}
function poseBot(b, dt) {
  const m = b.model, u = m.userData;
  m.position.copy(b.pos); m.rotation.set(0, b.yaw, 0);
  const sp = Math.hypot(b.vel.x, b.vel.z);
  if (b.downed || b.dead) { u.play('die', 0.15); u.mixer.update(dt); if (b.downed) m.position.y += 0.02; return; }
  u.play(sp > 8 ? 'sprint' : sp > 0.6 ? 'walk' : 'idle');
  u.mixer.update(dt * (sp > 0.6 && sp <= 8 ? Math.max(0.7, sp / 4.5) : 1));
  b.anim = (b.anim || 0) - dt;
  const it = botItem(b), pr = u.parts, aR = pr['arm-right'], aL = pr['arm-left'];
  if (!aR) return;
  if (isGun(it) && (b.state === 'fight' || b.aiming)) {
    const pitch = b.aimPitch || 0;
    aR.rotation.set(-Math.PI / 2 - pitch + (b.anim > 0 ? 0.12 : 0), 0.08, 0);
    if (aL) aL.rotation.set(-Math.PI / 2 - pitch + 0.1, it.type === 'pistol' ? -0.5 : -0.62, 0);
  } else if (isGun(it)) aR.rotation.set(-0.5, 0, 0);
  else if (b.anim > 0) aR.rotation.set(-2.4 + b.anim * 8, 0, 0);
}
function botTarget() { return 22; }

// ---------- combat ----------
function camDist(c) { return P.alive && G.state === 'play' ? c.pos.distanceTo(P.pos) : 60; }
function rayChar(o, d, maxT, shooter, zone) {
  let best = maxT, hit = null, part = null;
  for (const c of allChars()) {
    if (c === shooter || c.dead || c.zone !== zone) continue;
    const p = c.pos;
    if (Math.abs(p.x - o.x) > maxT + 2 && Math.abs(p.z - o.z) > maxT + 2) continue;
    if (c.downed) {
      const t = rayBox(o, d, p.x - 0.9, p.y, p.z - 0.9, p.x + 0.9, p.y + 0.55, p.z + 0.9);
      if (t !== null && t < best) { best = t; hit = c; part = 'body'; }
      continue;
    }
    const hy = p.y + (c.crouch ? HEAD_Y - 0.5 : HEAD_Y);
    const hc = new THREE.Vector3(p.x, hy, p.z).sub(o), tc = hc.dot(d);
    if (tc > 0 && tc < best) { const d2 = hc.lengthSq() - tc * tc; if (d2 < 0.27 * 0.27) { best = tc; hit = c; part = 'head'; } }
    const t = rayBox(o, d, p.x - 0.38, p.y, p.z - 0.38, p.x + 0.38, p.y + (c.crouch ? HEAD_Y - 0.72 : HEAD_Y - 0.22), p.z + 0.38);
    if (t !== null && t < best) { best = t; hit = c; part = (o.y + d.y * t) - p.y < 0.85 ? 'limb' : 'body'; }
  }
  return { t: best, hit, part };
}
function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = 1e9;
  for (const [oo, dd, a, b] of [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]]) {
    if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) return null; continue; }
    let t1 = (a - oo) / dd, t2 = (b - oo) / dd; if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null;
  }
  return tmin;
}
const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.8 });
const tracers = [];
function tracer(a, b) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  const l = new THREE.Line(g, tracerMat.clone()); scene.add(l); tracers.push({ l, t: 0.06 });
}
const decalGeo = new THREE.PlaneGeometry(0.12, 0.12), decalMat = new THREE.MeshBasicMaterial({ color: 0x111111, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false });
function decal(p, axis, d) {
  const m = new THREE.Mesh(decalGeo, decalMat);
  const n = new THREE.Vector3(); n.setComponent(axis, -Math.sign(d.getComponent(axis)) || 1);
  m.position.copy(p).addScaledVector(n, 0.012); m.lookAt(p.clone().add(n));
  scene.add(m); G.decals.push(m);
  if (G.decals.length > 80) scene.remove(G.decals.shift());
}
const sparks = [];
function puff(p, color = 0xaaaaaa, n = 4, sz = 0.08, up = 1) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(bgeo(sz, sz, sz), lam(color, color === 0xffaa33 ? 0xff7700 : 0));
    m.position.copy(p); scene.add(m);
    sparks.push({ m, v: new THREE.Vector3(rand(-2, 2), rand(0, 3) * up, rand(-2, 2)), t: rand(0.25, 0.5) });
  }
}

function fireWeapon(shooter, o, dir, it) {
  sfx.gun(it, camDist(shooter));
  if (it.type !== 'launcher' || it.proj === 'flare') {
    if (shooter === P && !G.thirdPerson() && vm.userData.w) { const tip = new THREE.Vector3(0, 0.03, vm.userData.w.userData.tipZ ?? (it.type === 'pistol' ? -0.3 : it.type === 'smg' ? -0.5 : -0.95)); vm.userData.w.localToWorld(tip); sprite(flashTex, tip, it.type === 'pistol' ? 0.16 : 0.24, 0.045, { scene: vmScene }); flashLight.position.copy(camera.position).addScaledVector(aimDir(), 1); flashLight.intensity = 30; flashT = 0.05; }
    else muzzleFlash(o.clone().addScaledVector(dir, 0.9), it.type === 'shotgun' ? 1.5 : 1);
  }
  if (shooter !== P && shooter.zone === P.zone) alertNear(shooter.pos, 25, shooter);
  if (it.proj) { launch(shooter, o, dir, it); return; }
  for (let i = 0; i < (it.pellets || 1); i++) {
    const d = dir.clone();
    if (it.pellets > 1) { d.x += rand(-it.spread, it.spread); d.y += rand(-it.spread, it.spread); d.z += rand(-it.spread, it.spread); d.normalize(); }
    const range = it.range || 250;
    const w = phys.ray(o, d, range);
    const c = rayChar(o, d, w.t, shooter, shooter.zone);
    const end = o.clone().addScaledVector(d, c.hit ? c.t : w.t);
    if (i === 0 || Math.random() < 0.3) tracer(o.clone().addScaledVector(d, 0.6), end);
    if (c.hit) {
      let dmg = it.dmg * (c.part === 'head' ? it.head : c.part === 'limb' ? 0.8 : 1);
      if (c.t > range * 0.4) dmg *= 1 - 0.5 * clamp((c.t - range * 0.4) / (range * 0.6), 0, 1);
      if (shooter.rageT > 0) dmg *= 1.15;
      hurt(c.hit, dmg, c.part, shooter, it);
      impactFx(end, 3, true);
      if (shooter === P) { UI.hitmarker(c.part === 'head'); c.part === 'head' ? sfx.headshot() : sfx.hitmark(); }
      if (c.hit === P) UI.hurt(dmg);
    } else if (w.hit) {
      impactFx(end, 3, false);
      if (shooter === P || camDist(shooter) < 40) decal(end, w.hit.axis, d);
    }
  }
}
function launch(shooter, o, dir, it, throwIt) {
  const speed = throwIt ? 18 : { grenade: 45, rocket: 60, flare: 55, firework: 40, plasma: 70, pumpkin: 40 }[it.proj] || 40;
  const m = new THREE.Group();
  const col = throwIt ? 0x3a4a2a : { rocket: 0x4a5a3a, flare: 0xff7722, firework: 0xff3355, plasma: 0x55ff77, pumpkin: 0xff8a20, grenade: 0x3a4a2a }[it.proj];
  bx(m, 0.14, 0.14, 0.14, col, 0, 0, 0, ['flare', 'firework', 'plasma', 'pumpkin'].includes(it.proj) ? col : 0);
  m.position.copy(o); scene.add(m);
  G.projectiles.push({ it, shooter, m, pos: o.clone().addScaledVector(dir, 0.6), vel: dir.clone().multiplyScalar(speed), grav: throwIt || it.proj === 'grenade' || it.proj === 'pumpkin' ? 18 : it.proj === 'flare' ? 6 : 0, fuse: throwIt ? (it.fuse ?? 99) : 8, thrown: !!throwIt, zone: shooter.zone, stuck: false });
}
function updateProjectiles(dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i];
    p.fuse -= dt;
    if (!p.stuck) {
      p.vel.y -= p.grav * dt;
      const step = p.vel.length() * dt, d = p.vel.clone().normalize();
      const w = phys.ray(p.pos, d, step + 0.1);
      const c = p.thrown ? { hit: null } : rayChar(p.pos, d, step + 0.1, p.shooter, p.zone);
      if (c.hit || w.hit) {
        p.pos.addScaledVector(d, Math.max(0, (c.hit ? c.t : w.t) - 0.08));
        if (p.thrown && !p.it.fire && !p.it.remote) {
          const n = new THREE.Vector3(); n.setComponent(w.hit.axis, 1);
          const vn = p.vel.dot(n); p.vel.addScaledVector(n, -2 * vn).multiplyScalar(0.35);
          if (p.vel.length() < 1) { p.vel.set(0, 0, 0); p.stuck = true; }
        } else if (p.it.remote) { p.stuck = true; p.vel.set(0, 0, 0); }
        else { explode(p); G.projectiles.splice(i, 1); continue; }
      } else p.pos.addScaledVector(d, step);
      if (!p.thrown && Math.random() < 0.5) puff(p.pos, p.it.proj === 'plasma' ? 0x55ff77 : 0xffaa33, 1, 0.07, 0.2);
    }
    p.m.position.copy(p.pos);
    if ((p.fuse <= 0 && !p.it.remote) || (p.detonate)) { explode(p); G.projectiles.splice(i, 1); }
  }
}
function explode(p) {
  scene.remove(p.m);
  const it = p.it, pos = p.pos, dist = P.pos.distanceTo(pos);
  if (it.flash) {
    sfx.burst(3000, 0.4, 1, dist); sfx.tone(3200, 1.5, 0.15, 'sine', dist);
    for (const c of allChars()) {
      if (c.zone !== p.zone || c.pos.distanceTo(pos) > it.radius) continue;
      const o = eyeOf(c), d = pos.clone().sub(o); const L = d.length(); d.normalize();
      if (phys.ray(o, d, L).t < L - 0.2) continue;
      if (c === P) { const facing = aimDir().dot(d); P.flashT = facing > 0.2 ? 4 : 1.5; }
      else c.blindT = 4;
    }
    puff(pos, 0xffffff, 8, 0.1); return;
  }
  if (it.gas) { G.fires.push({ x: pos.x, y: pos.y, z: pos.z, r: it.radius, t: 12, gas: true, by: p.shooter, zone: p.zone }); puff(pos, 0xb8b860, 14, 0.4); sfx.burst(600, 1.2, 0.5, dist); return; }
  if (it.fire) { G.fires.push({ x: pos.x, y: pos.y, z: pos.z, r: it.radius, t: 8, by: p.shooter, zone: p.zone }); sfx.burst(800, 0.8, 0.6, dist); puff(pos, 0xffaa33, 14, 0.25); return; }
  sfx.explosion(dist);
  for (let i = 0; i < 6; i++) sprite(flashTex, pos.clone().add(new THREE.Vector3(rand(-1, 1), rand(0, 1.5), rand(-1, 1))), rand(2, 4), rand(0.15, 0.3));
  for (let i = 0; i < 12; i++) sprite(smokeTex, pos.clone().add(new THREE.Vector3(rand(-1.5, 1.5), rand(0, 2), rand(-1.5, 1.5))), rand(1.5, 3), rand(1.5, 3), { additive: false, color: 0x3a3836, opacity: 0.7, grow: 0.6, vel: new THREE.Vector3(rand(-1, 1), rand(1, 2.5), rand(-1, 1)) });
  for (let i = 0; i < 20; i++) sprite(sparkTex, pos.clone(), 0.12, rand(0.4, 1), { vel: new THREE.Vector3(rand(-9, 9), rand(2, 12), rand(-9, 9)), grav: 14 });
  if (dist < 60) { flashLight.position.copy(pos).y += 1; flashLight.intensity = 400; flashLight.distance = 30; flashT = 0.12; }
  if (dist < 25 && P.alive) shake = Math.max(shake, (25 - dist) / 25 * 0.5);
  for (const c of allChars()) {
    if (c.dead || c.zone !== p.zone) continue;
    const d = c.pos.distanceTo(pos);
    if (d > it.radius) continue;
    const dmg = (it.dmg || 80) * (1 - d / it.radius * 0.7);
    if (c.downed) { kill(c, p.shooter, it); continue; }
    hurt(c, dmg, 'body', p.shooter, it, true);
    if (c === P) UI.hurt(dmg);
    if (it.burn) { c.burn = 4; c.burnBy = p.shooter; }
    c.vel.addScaledVector(c.pos.clone().sub(pos).setY(0.6).normalize(), 12 * (1 - d / it.radius));
  }
  for (const o of G.inter) {
    if (o.open || (o.kind !== 'safe' && o.kind !== 'register')) continue;
    if (Math.hypot(o.x - pos.x, o.y - pos.y, o.z - pos.z) < it.radius * 0.6) o.kind === 'safe' ? openSafe(o, p.shooter) : openRegister(o, p.shooter);
  }
}
function updateFires(dt) {
  for (let i = G.fires.length - 1; i >= 0; i--) {
    const f = G.fires[i]; f.t -= dt;
    if (Math.random() < 0.6) puff(new THREE.Vector3(f.x + rand(-f.r, f.r) * 0.7, f.y + 0.1, f.z + rand(-f.r, f.r) * 0.7), f.gas ? 0xc8c880 : pick([0xffaa33, 0xff5522]), 1, f.gas ? 0.35 : 0.18, 0.6);
    for (const c of allChars()) {
      if (c.dead || c.zone !== f.zone || Math.hypot(c.pos.x - f.x, c.pos.z - f.z) > f.r || Math.abs(c.pos.y - f.y) > 2.5) continue;
      if (c.armor?.suit) continue;
      if (f.gas) { if (c === P) P.gasT = 1.2; else c.blindT = 1.2; hurt(c, 3 * dt, 'body', f.by, null, true); }
      else { hurt(c, 12 * dt, 'body', f.by, null, true); c.burn = Math.max(c.burn || 0, 1.5); c.burnBy = f.by; }
    }
    if (f.t <= 0) G.fires.splice(i, 1);
  }
}

function hurt(t, dmg, part, src, it, noArmor) {
  if (t.dead || dmg <= 0) return;
  if (t === P && G.god) return;
  if (t.downed) { t.downHp -= dmg; if (t.downHp <= 0) kill(t, src, it); return; }
  if (!noArmor) {
    const slot = part === 'head' ? 'helmet' : part === 'body' ? 'vest' : null;
    const a = slot && t.armor[slot];
    if (a && a.dur > 0) {
      const ab = ITEM[a.id].absorb * (1 - (it?.pen || 0) * 0.5);
      const taken = dmg * ab; a.dur -= taken * 1.4; dmg -= taken;
      if (a.dur <= 0) { t.armor[slot] = null; if (t === P) UI.toast('Your ' + ITEM[a.id].name + ' broke!', 'bad'); }
    }
  }
  t.hp -= dmg; t.regenDelay = 7;
  if (src && src !== t) t.lastHitBy = src;
  if (!t.isPlayer && src && src !== t && !t.target && hostile(t, src)) { t.target = src; t.state = 'fight'; t.seeT = 0.2; }
  if (t.hp <= 0) {
    if (it && it.type === 'launcher' && dmg > 60) return kill(t, src, it);
    downChar(t, src, it);
  }
}
G.hurt = hurt;
function downChar(t, src, it) {
  t.downed = true; t.hp = 0; t.downHp = 100; t.downT = 0; t.crouch = false;
  if (t === P) { G.save.stats.downs++; UI.toast(G.mode === 'casual' ? 'You are downed — recovering...' : 'You are downed! You will bleed out.', 'bad'); P.using = null; }
  UI.feed(src ? src.name : '?', t.name, it ? it.name : 'downed', false, true);
}
function updateDowned(c, dt) {
  c.downT += dt;
  if (G.mode === 'casual') {
    c.downHp = Math.min(100, c.downHp + dt * 0.5);
    if (c.downT > 18) revive(c, 30);
  } else {
    c.downHp -= dt * (100 / 45);
    if (c.downHp <= 0) kill(c, c.lastHitBy, null, 'bled out');
  }
}
function revive(c, hp) {
  c.downed = false; c.hp = hp; c.downHp = 0; c.regenDelay = 4;
  if (c === P) UI.toast('You got back up.', 'good');
}
function kill(t, src, it, how) {
  if (t.dead) return;
  t.dead = true; t.downed = false; t.hp = 0;
  const lossPct = G.mode === 'casual' ? 0.05 : 0.10, cap = G.mode === 'casual' ? 250 : 500;
  const carried = t === P ? P.cash : t.cash;
  const drop = Math.min(cap, Math.max(carried > 0 ? 20 : 0, Math.round(carried * lossPct)));
  if (t === P) P.cash -= drop; else t.cash -= drop;
  if (drop > 0) for (let i = 0; i < Math.min(4, Math.ceil(drop / 120)); i++) makeCash(t.pos.x + rand(-0.8, 0.8), t.pos.y, t.pos.z + rand(-0.8, 0.8), drop / Math.min(4, Math.ceil(drop / 120)));
  UI.feed(src ? src.name : (how || 'world'), t.name, how || (it ? it.name : 'killed'), true, false);
  if (src && src !== t) {
    src.kills = (src.kills || 0) + 1;
    src.streak = (src.streak || 0) + 1;
    if (src.streak >= 3) src.bounty = Math.min(MAX_BOUNTY, (src.bounty || 0) + 300);
    if (src === P) {
      G.save.stats.kills++;
      if (G.mode === 'standard') addXP(30 + Math.round((t.level || 1) / 2));
      if (t.bounty > 0) { P.cash += t.bounty; G.save.stats.earned += t.bounty; UI.toast('Bounty claimed: ' + fmt(t.bounty), 'good'); sfx.cash(); addXP(40); }
    } else if (t.bounty > 0) src.cash += t.bounty;
  }
  t.bounty = 0; t.streak = 0;
  if (t === P) { onPlayerDeath(src, it, how); return; }
  t.deadT = 14;
  if (t.gun && Math.random() < 0.55) dropItem({ ...t.gun, reserve: Math.min(t.gun.reserve, ITEM[t.gun.id].mag * 2) }, t.pos.x + rand(-1, 1), t.pos.y, t.pos.z + rand(-1, 1));
  if (Math.random() < 0.25) dropItem({ id: 'bandage', count: 1 }, t.pos.x + rand(-1, 1), t.pos.y, t.pos.z + rand(-1, 1));
  if (t.armor.vest && Math.random() < 0.3) dropItem({ id: t.armor.vest.id, dur: t.armor.vest.dur }, t.pos.x, t.pos.y, t.pos.z);
  t.model.userData.setHeld(null);
}
function onPlayerDeath(src, it, how) {
  P.alive = false; G.save.stats.deaths++;
  const lost = P.inv.filter(e => e.id !== 'fists');
  for (const e of lost) dropItem(e, P.pos.x + rand(-1.2, 1.2), P.pos.y, P.pos.z + rand(-1.2, 1.2));
  for (const s of ['vest', 'helmet', 'pack', 'suit', 'eyes']) if (P.armor[s]) { dropItem({ id: P.armor[s].id, dur: P.armor[s].dur }, P.pos.x + rand(-1, 1), P.pos.y, P.pos.z + rand(-1, 1)); P.armor[s] = null; }
  P.inv = [newEntry('fists')]; P.eq = 0;
  G.save.session = null; save();
  document.exitPointerLock?.();
  UI.death({ by: src ? src.name : (how || 'the world'), weapon: it ? it.name : how || '', lost: lost.length });
  if (G.update.ready) setTimeout(() => location.reload(), 1500);
}

// ---------- looting ----------
function cashBurst(o, total, n) { for (let i = 0; i < n; i++) makeCash(o.x + rand(-0.7, 0.7), o.y - (o.kind === 'safe' ? (o.big ? 0.9 : 0.4) : 0.3) + 0.02, o.z + rand(-0.7, 0.7) + 0.6, total / n); }
function serverScale() { return 0.75 + Math.min(1, G.bots.length / 22) * 0.25; }
function alarmFor(o, who) {
  if (!o.alarm) return;
  sfx.alarm(camDist({ pos: new THREE.Vector3(o.x, o.y, o.z) }));
  if (who === P) UI.toast('ALARM! ' + (o.bld || 'Building') + ' alarm tripped.', 'bad');
  alertNear(new THREE.Vector3(o.x, o.y, o.z), 70, who);
}
function alertNear(pos, r, who) {
  if (!who) return;
  for (const b of G.bots) if (!b.dead && !b.downed && !b.target && b.pos.distanceTo(pos) < r && Math.random() < b.aggro && hostile(b, who)) { b.goal = { x: pos.x, z: pos.z, wander: true }; b.path = null; }
}
function openRegister(o, who) {
  if (o.open) return;
  o.open = true; o.t = REG_RESPAWN; o.hits = 0; o.drawer.position.z = 0.28;
  sfx.register();
  const amt = randi(80, 375) * serverScale();
  if (who === P) { cashBurst(o, amt, 3); G.save.stats.registers++; } else if (who) who.cash += amt;
}
function openSafe(o, who) {
  if (o.open) return;
  o.open = true; o.t = SAFE_RESPAWN; o.hits = 0; o.hinge.rotation.y = -1.9;
  sfx.metal(camDist({ pos: new THREE.Vector3(o.x, o.y, o.z) }));
  const amt = (o.big ? randi(200, 1080) : randi(120, 720)) * serverScale();
  if (who === P) {
    cashBurst(o, amt, o.big ? 5 : 3); G.save.stats.safes++;
    if (Math.random() < 0.3) dropItem(newEntry(pick(['lockpick', 'bandage', 'medkit', 'scrap'])), o.x, o.y - (o.big ? 0.9 : 0.4), o.z + 0.9);
    if (o.big && Math.random() < 0.15) dropItem(newEntry(pick(['deagle', 'uzi', 'm1911', 'tec9', 't1vest'])), o.x + 0.5, o.y - 0.9, o.z + 1);
  } else if (who) who.cash += amt;
}
function searchScrap(o, who) {
  o.open = true; o.t = SCRAP_RESPAWN; o.mesh.visible = false;
  const r = Math.random(), gold = o.gold;
  const at = [o.x + rand(-0.4, 0.4), o.y - 0.4, o.z + rand(-0.4, 0.4)];
  if (gold) {
    if (r < 0.35) dropItem({ id: 'goldscrap', count: randi(1, 3) }, ...at);
    else if (r < 0.75) dropItem(newEntry(pick(['akm', 'scarh', 'fal', 'm4a1', 'scout', 'rpg', 'sledgehammer', 'katana', 'ump45'])), ...at);
    else makeCash(...at, randi(300, 800));
    UI.toast('You found something shiny.', 'good');
  } else {
    if (r < 0.5) dropItem({ id: 'scrap', count: randi(1, 2) }, ...at);
    else if (r < 0.65) makeCash(...at, randi(20, 120));
    else if (r < 0.75) dropItem(newEntry('bandage'), ...at);
    else if (r < 0.83) dropItem(newEntry('lockpick'), ...at);
    else if (r < 0.91) { const e = newEntry(pick(['g17', 'beretta', 'tec9', 'doublebarrel', 'mac10', 'hawkeye'])); e.reserve = Math.floor(e.reserve / 3); dropItem(e, ...at); }
    else dropItem(newEntry(pick(['bat', 'shovel', 'wrench', 'golfclub', 'crowbar', 'balisong', 'machete'])), ...at);
  }
  sfx.pick();
}
function openCrate(o, who) {
  o.open = true; o.t = o.ctype === 'gold' ? 1200 : CRATE_RESPAWN; o.lid.position.set(0.7, 0.4, 0); o.lid.rotation.z = 1.2;
  sfx.metal();
  const at = (k) => [o.x + rand(-0.6, 0.6), o.y - 0.6, o.z + 0.9 + k * 0.3];
  if (who !== P) {
    if (who && !who.dead) { const g = pick(['deagle', 'uzi', 'r870', 'sks', 'aks74u', 'mosin']); const it = ITEM[g]; who.gun = { id: g, mag: it.mag, reserve: it.mag * 4 }; setBotWeapon(who, 'gun'); }
    if (o.once) setTimeout(() => removeInter(o), 20000);
    return;
  }
  const pools = {
    red: ['deagle', 'uzi', 'r870', 'sks', 'aks74u', 'mosin', 'm1911', 'magnum', 'ithaca', 'fireaxe', 'katana', 'mac10', 'tommy'],
    gold: ['akm', 'scarh', 'scout', 'm4a1', 'fal', 'rpg', 'm320', 'slayersword'],
    mystery: ['akm', 'eradicator', 'scythe', 'bfg', 'hallowslauncher', 'slayer2', 'necromancer', 'rpg', 'g18', 'scout'],
    airdrop: ['akm', 'scarh', 'scout', 'm4a1', 'fal', 'm320', 'ump45', 'mp7'],
  };
  dropItem(newEntry(pick(pools[o.ctype])), ...at(0));
  if (o.ctype === 'airdrop') { dropItem(newEntry(pick(['t3vest', 't2vest', 't3helmet'])), ...at(1)); dropItem({ id: 'medkit', count: 2 }, ...at(2)); dropItem({ id: 'frag', count: 2 }, ...at(3)); }
  if (o.ctype === 'mystery') makeCash(...at(1), randi(1000, 4000));
  if (o.ctype === 'gold') dropItem({ id: 'goldscrap', count: 2 }, ...at(1));
  if (o.once) setTimeout(() => removeInter(o), 60000);
}
function removeInter(o) { scene.remove(o.mesh); const i = G.inter.indexOf(o); if (i >= 0) G.inter.splice(i, 1); if (G.airdrop?.crate === o) G.airdrop = null; }
function useTeleport(t, who) {
  if (t.elevatorBottom && G.elev.bottomT <= 0) { if (who === P) { UI.toast('The elevator is up top. Someone in the Subway has to call it — or reset your character (10% cash loss).', 'bad'); sfx.denied(); } return; }
  const go = () => {
    who.zone = t.to; who.pos.set(t.tx, ZONES[t.to].y + 0.2, t.tz); who.vel.set(0, 0, 0);
    if (t.elevator) { G.elev.bottomT = 0; sfx.elevator(); }
    if (t.elevatorBottom) G.elev.bottomT = 0;
    if (who === P) { P.path = null; UI.zone(ZONES[t.to].name); }
    else { who.path = null; who.goal = null; }
  };
  if (who === P) { UI.fade(t.elevator || t.elevatorBottom ? 2.4 : 0.6, go); if (t.elevator || t.elevatorBottom) sfx.elevator(); }
  else go();
}

// ---------- input ----------
const keys = {};
let mouseL = false, mouseR = false, locked = false, shake = 0, holdT = 0, holdObj = null, reviveT = 0;
G.isLocked = () => locked;
addEventListener('keydown', (e) => {
  if (UI.typing()) return;
  keys[e.code] = true;
  if (e.code === 'Tab') e.preventDefault();
  if (G.state !== 'play') return;
  if (e.code === 'Escape') return;
  if (UI.isOpen()) { if (['KeyG', 'KeyM', 'KeyE'].includes(e.code) && UI.current() !== 'atm' && UI.current() !== 'shop') { UI.close(); lock(); } else if (e.code === 'KeyE' && (UI.current() === 'shop' || UI.current() === 'atm')) { UI.close(); lock(); } return; }
  if (!P.alive) return;
  const n = e.code.startsWith('Digit') ? (e.code === 'Digit0' ? 9 : +e.code.slice(5) - 1) : -1;
  if (n >= 0) G.equip(n);
  if (e.code === 'KeyR') tryReload();
  if (e.code === 'KeyG') { UI.open('inventory'); unlock(); }
  if (e.code === 'KeyM') { UI.open('map'); unlock(); }
  if (e.code === 'KeyF') tryFinish();
  if (e.code === 'KeyN' && P.armor.eyes) { P.thermal = !P.thermal; sfx.click(); }
  if (e.code === 'KeyQ' && P.inv[P.eq]?.id !== 'fists') G.dropInv(P.eq);
  if (e.code === 'KeyV') G.equip(0);
  if (e.code === 'KeyT') { G.save.settings.tp = !G.save.settings.tp; sfx.click(); }
  if (e.code === 'F9' && G.update.ready) { save(); location.reload(); }
  if (e.code === 'Space' && P.downed) { }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('mousedown', (e) => {
  if (G.state !== 'play' || UI.isOpen() || !P.alive) return;
  if (!locked) { lock(); return; }
  if (e.button === 0) { mouseL = true; onClick(); }
  if (e.button === 2) mouseR = true;
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; if (e.button === 2) mouseR = false; });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('wheel', (e) => { if (G.state === 'play' && locked && P.alive && P.inv.length) G.equip((P.eq + (e.deltaY > 0 ? 1 : -1) + P.inv.length) % P.inv.length); });
addEventListener('mousemove', (e) => {
  if (!locked || G.state !== 'play') return;
  const s = G.save.settings, k = 0.0022 * s.sens * (P.ads > 0.5 ? s.adsSens * (vmItem?.scope ? 0.4 : 1) : 1);
  P.yaw -= e.movementX * k; P.pitch -= e.movementY * k * (s.invertY ? -1 : 1);
  P.pitch = clamp(P.pitch, -1.55, 1.55);
});
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && G.state === 'play' && P.alive && !UI.isOpen() && !UI.fading()) UI.open('pause');
});
function lock() { if (G.state === 'play' && !UI.isOpen()) canvas.requestPointerLock?.()?.catch?.(() => { }); }
function unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
G.lock = lock; G.unlock = unlock;

function tryReload() {
  const e = P.inv[P.eq], it = e && ITEM[e.id];
  if (P.downed) return;
  if (it && it.revive) { return; }
  if (!it || !isGun(it) || P.reloadT > 0 || e.mag >= it.mag || e.reserve <= 0) return;
  P.reloadT = it.reload; sfx.reload();
}
function tryFinish() {
  const e = P.inv[P.eq], it = e && ITEM[e.id];
  if (!it || !isMeleeish(it) || P.downed) return;
  for (const b of G.bots) if (b.downed && !b.dead && b.zone === P.zone && b.pos.distanceTo(P.pos) < 2.6) {
    kill(b, P, it, null); P.hp = Math.min(P.maxHp, P.hp + 30); sfx.hit(); UI.toast('Finished ' + b.name + ' (+30 HP)', 'good'); return;
  }
}
function onClick() {
  const e = P.inv[P.eq], it = e && ITEM[e.id];
  if (!it || P.downed) return;
  if (it.type === 'throw' && it.remote && P.c4s.length && P.c4s.some(p => p.stuck)) { for (const p of P.c4s) p.detonate = true; P.c4s = []; return; }
}
function playerAttack(dt) {
  const e = P.inv[P.eq], it = e && ITEM[e.id];
  if (!it || P.downed) return;
  P.fireT -= dt;
  if (isGun(it)) {
    if (P.reloadT > 0) {
      P.reloadT -= dt;
      if (P.reloadT <= 0) { const n = Math.min(it.mag - e.mag, e.reserve); e.mag += n; e.reserve -= n; }
      return;
    }
    if (mouseL && P.fireT <= 0) {
      if (e.mag <= 0) { sfx.click(); P.fireT = 0.3; tryReload(); mouseL = false; return; }
      e.mag--; P.fireT = 60 / it.rpm;
      if (!it.auto) mouseL = false;
      const d = aimDir();
      const sp = (it.pellets > 1 ? 0.012 : it.spread) * (P.ads > 0.5 ? 0.35 : 1) * (P.crouch ? 0.8 : 1) * (1 + Math.hypot(P.vel.x, P.vel.z) * 0.08) + P.recoilP * 0.25;
      d.x += rand(-sp, sp); d.y += rand(-sp, sp); d.z += rand(-sp, sp); d.normalize();
      const [so, sd] = shotFrom(); if (sd) { sd.x += d.x - aimDir().x; sd.y += d.y - aimDir().y; sd.z += d.z - aimDir().z; sd.normalize(); }
      fireWeapon(P, so, sd || d, it);
      const kick = it.recoil * (P.ads > 0.5 ? 0.7 : 1) * (P.crouch ? 0.75 : 1);
      P.pitch = clamp(P.pitch + kick, -1.55, 1.55); P.yaw += rand(-kick, kick) * 0.4; P.recoilP += kick;
      vmKick = 0.06 + kick;
      if (e.mag <= 0 && e.reserve > 0) setTimeout(tryReload, 250);
    }
  } else if (isMeleeish(it)) {
    if (mouseL && P.fireT <= 0) {
      const cost = it.stam || 8;
      if (P.stamina < cost && !P.rageT) { P.fireT = 0.2; return; }
      P.stamina -= P.rageT > 0 ? 0 : cost;
      P.fireT = it.rate * (P.rageT > 0 ? 0.8 : 1);
      if (!it.auto) mouseL = false;
      vmSwing = 1; sfx.swing();
      meleeHit(it);
    }
  } else if (it.type === 'throw') {
    if (mouseL && P.fireT <= 0) {
      mouseL = false; P.fireT = 0.8;
      if (it.spray) {
        if (e.charges <= 0) return;
        e.charges--; puff(camera.position.clone().addScaledVector(aimDir(), 1.2), 0xff6a6a, 6, 0.12);
        for (const b of G.bots) if (!b.dead && b.zone === P.zone && b.pos.distanceTo(P.pos) < 5 && aimDir().dot(eyeOf(b).sub(camera.position).normalize()) > 0.8) { b.blindT = 5; b.stunT = 1.5; }
        if (e.charges <= 0) { P.inv.splice(P.eq, 1); fixEquip(); buildVM(); }
        return;
      }
      const d = aimDir(); d.y += 0.15; d.normalize();
      launch(P, viewOrigin(), d, it, true);
      const pr = G.projectiles[G.projectiles.length - 1];
      if (it.remote) { P.c4s.push(pr); UI.toast('C4 placed — select C4 and click again to detonate.', 'good'); }
      e.count = (e.count || 1) - 1; if (e.count <= 0 && !it.remote) { P.inv.splice(P.eq, 1); fixEquip(); buildVM(); }
      else if (e.count <= 0) { e.count = 0; }
      vmSwing = 1;
    }
  } else if (it.type === 'med') {
    if (mouseL && !P.using) { P.using = { it, t: it.use }; mouseL = false; }
  }
}
function meleeHit(it) {
  const o = viewOrigin(), d = aimDir(), range = it.range || 2.6;
  const w = phys.ray(o, d, range);
  let best = null, bt = 1e9;
  for (const b of G.bots) {
    if (b.dead || b.zone !== P.zone) continue;
    const c = new THREE.Vector3(b.pos.x, b.pos.y + (b.downed ? 0.3 : 1.2), b.pos.z);
    const v = c.sub(o), dist = v.length();
    if (dist > range + 0.5 || dist > w.t + 0.4) continue;
    if (v.normalize().dot(d) < 0.72) continue;
    if (dist < bt) { bt = dist; best = b; }
  }
  if (best) {
    const dmg = it.dmg * (P.rageT > 0 ? 1.15 : 1) * (best.downed ? 1.5 : 1);
    hurt(best, dmg, 'body', P, it); sfx.hit(); UI.hitmarker(false);
    if (it.stun) best.stunT = 0.8;
    best.vel.addScaledVector(d.clone().setY(0).normalize(), 3);
    puff(eyeOf(best).setY(best.pos.y + 1.2), 0x8a1010, 3, 0.06);
    return;
  }
  for (const ob of G.inter) {
    if ((ob.kind !== 'register' && ob.kind !== 'safe') || ob.open || ob.zone !== P.zone) continue;
    const v = new THREE.Vector3(ob.x, ob.y, ob.z).sub(o), dist = v.length();
    if (dist > range + 0.6 || v.normalize().dot(d) < 0.75) continue;
    if (ob.kind === 'register') {
      if (!it.register && !it.safe) { UI.toast('Use fists, knuckledusters, a crowbar or a sledgehammer on registers.', 'bad'); return; }
      ob.hits++; sfx.metal();
      if (ob.hits === 1) alarmFor(ob, P);
      if (ob.hits >= (it.id === 'fists' ? 3 : 2)) openRegister(ob, P);
      return;
    }
    if (ob.kind === 'safe') {
      if (!it.safe) { sfx.metal(); UI.toast('You need a Crowbar to force a safe (or a Lockpick).', 'bad'); return; }
      ob.hits++; sfx.metal(); puff(new THREE.Vector3(ob.x, ob.y, ob.z), 0xffdd88, 3, 0.04);
      if (ob.hits === 1) alarmFor(ob, P);
      UI.toast('Forcing safe ' + ob.hits + '/' + (ob.big ? 5 : 4));
      if (ob.hits >= (ob.big ? 5 : 4)) openSafe(ob, P);
      return;
    }
  }
  if (w.hit) { sfx.metal(); puff(o.clone().addScaledVector(d, w.t), 0x999999, 2, 0.05); }
}

// ---------- player update ----------
let vmKick = 0, stepT = 0, bob = 0;
function inWater(c) { for (const w of W.waters) if (c.pos.x > w.x0 && c.pos.x < w.x1 && c.pos.z > w.z0 && c.pos.z < w.z1 && c.pos.y < w.y + 0.3) return true; return false; }
function updatePlayer(dt) {
  if (!P.alive) return;
  P.zone = zoneOfY(P.pos.y);
  P.flashT -= dt; P.gasT -= dt; P.rageT -= dt; P.regenDelay -= dt;
  if (P.burn > 0) { P.burn -= dt; hurt(P, 6 * dt, 'body', P.burnBy, null, true); }
  const e = P.inv[P.eq], it = e ? ITEM[e.id] : ITEM.fists;
  if (P.downed) {
    updateDowned(P, dt);
    if (!P.alive) return;
    const f = fwd(), r = new THREE.Vector3(-f.z, 0, f.x);
    const mv = new THREE.Vector3();
    if (keys.KeyW) mv.add(f); if (keys.KeyS) mv.sub(f); if (keys.KeyD) mv.add(r); if (keys.KeyA) mv.sub(r);
    mv.normalize().multiplyScalar(1.2);
    P.vel.x = mv.x; P.vel.z = mv.z; P.height = 0.6;
    phys.move(P, dt);
  } else {
    P.height = P.crouch ? 1.25 : 1.8;
    const wantCrouch = keys.KeyC || keys.ControlLeft;
    if (!wantCrouch && P.crouch) { if (phys.ceilAt(P.pos.x, P.pos.z, P.radius, P.pos.y + 1.3) > P.pos.y + 1.85) P.crouch = false; }
    else P.crouch = wantCrouch;
    const f = fwd(), r = new THREE.Vector3(-f.z, 0, f.x), mv = new THREE.Vector3();
    if (keys.KeyW) mv.add(f); if (keys.KeyS) mv.sub(f); if (keys.KeyD) mv.add(r); if (keys.KeyA) mv.sub(r);
    const moving = mv.lengthSq() > 0;
    const sprint = keys.ShiftLeft && moving && keys.KeyW && !P.crouch && P.ads < 0.5 && (P.stamina > 1 || P.rageT > 0);
    let speed = P.crouch ? 3.4 : sprint ? 10.5 : 7;
    if (P.ads > 0.5) speed *= 0.6;
    if (P.using) speed *= 0.5;
    if (inWater(P)) speed *= 0.55;
    if (P.gasT > 0) speed *= 0.7;
    if (sprint && P.rageT <= 0) P.stamina = Math.max(0, P.stamina - dt * 16);
    else P.stamina = Math.min(100, P.stamina + dt * (moving ? 14 : 24));
    mv.normalize().multiplyScalar(speed);
    const accel = P.onGround ? 14 : 3;
    P.vel.x += (mv.x - P.vel.x) * Math.min(1, accel * dt); P.vel.z += (mv.z - P.vel.z) * Math.min(1, accel * dt);
    if (keys.Space && P.onGround && P.stamina > 8) { P.vel.y = 9.2; P.stamina -= 8; keys.Space = false; }
    phys.move(P, dt);
    if (P.onGround && P.landSpeed > 15) { const dmg = (P.landSpeed - 15) * 5.5; hurt(P, dmg, 'limb', null, null, true); UI.hurt(dmg); P.landSpeed = 0; } else if (P.onGround) P.landSpeed = 0;
    if (P.onGround && moving) { stepT -= dt * speed; if (stepT <= 0) { stepT = 4; sfx.step(); } }
    bob += dt * speed * (P.onGround ? 1.3 : 0);
    if (P.regenDelay < 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + dt * 1.0);
    P.ads += ((mouseR && isGun(it) && P.reloadT <= 0 ? 1 : 0) - P.ads) * Math.min(1, dt * 14);
    playerAttack(dt);
    if (P.using) {
      P.using.t -= dt;
      if (P.using.t <= 0) {
        const u = P.using.it;
        if (u.heal) { P.hp = Math.min(P.maxHp, P.hp + u.heal); P.burn = 0; }
        if (u.rage) { P.rageT = u.rage; P.stamina = 100; }
        invTake(u.id, 1); buildVM(); P.using = null; sfx.pick();
      }
    }
    reviveLogic(dt, it);
  }
  for (const p of W.pits) if (P.pos.x > p.x0 && P.pos.x < p.x1 && P.pos.z > p.z0 && P.pos.z < p.z1 && P.pos.y < p.y - 6) kill(P, P.lastHitBy, null, 'the Grinder');
  if (P.pos.y < -70 || P.pos.y < ZONES[P.zone].y - 25) kill(P, P.lastHitBy, null, 'fell');
  for (let i = G.cashBags.length - 1; i >= 0; i--) {
    const c = G.cashBags[i];
    if (Math.abs(c.x - P.pos.x) < 1.3 && Math.abs(c.z - P.pos.z) < 1.3 && Math.abs(c.y - P.pos.y) < 1.6) {
      P.cash += c.amt; G.save.stats.earned += c.amt; scene.remove(c.mesh); G.cashBags.splice(i, 1); sfx.cash(); UI.cashPop(c.amt);
    }
  }
  P.recoilP *= Math.pow(0.02, dt);
  interactLogic(dt);
}
function reviveLogic(dt, it) {
  if (!keys.KeyR || !(it.revive || it.type === 'med')) { reviveT = 0; return; }
  const b = G.bots.find(b => b.downed && !b.dead && b.zone === P.zone && b.pos.distanceTo(P.pos) < 2.5);
  if (!b) { reviveT = 0; return; }
  const need = it.type === 'med' ? 5 : 12;
  reviveT += dt; UI.prompt('Reviving ' + b.name, reviveT / need);
  if (reviveT >= need) {
    reviveT = 0; revive(b, it.id === 'medkit' ? 70 : it.type === 'med' ? 45 : 30); b.friendT = 300; b.target = null; b.state = 'roam';
    if (it.type === 'med') invTake(it.id, 1);
    UI.toast(b.name + ' revived — they will have your back for a while.', 'good');
  }
}
let promptObj = null;
function interactLogic(dt) {
  const o = viewOrigin(), d = aimDir();
  let best = null, bs = -1;
  for (const ob of G.inter) {
    const dx = ob.x - o.x, dy = ob.y - o.y, dz = ob.z - o.z, dist = Math.hypot(dx, dy, dz);
    if (dist > ob.range) continue;
    const dot = (dx * d.x + dy * d.y + dz * d.z) / dist;
    const score = dot - dist * 0.05;
    if (dot > 0.55 && score > bs) { bs = score; best = ob; }
  }
  promptObj = best;
  if (!best) { holdT = 0; if (reviveT <= 0) UI.prompt(null); return; }
  if (best.hold && !best.open) {
    if (keys.KeyE) { holdT += dt; if (holdObj !== best) { holdObj = best; holdT = 0; } UI.prompt(best.label(), holdT / best.hold); if (holdT >= best.hold) { holdT = 0; keys.KeyE = false; best.use(); } }
    else { holdT = 0; UI.prompt('[E] ' + best.label()); }
  } else {
    UI.prompt((best.use && !best.open ? '[E] ' : '') + best.label());
    if (keys.KeyE && best.use) { keys.KeyE = false; best.use(); if (UI.isOpen()) unlock(); }
  }
}

// ---------- world events ----------
let trainMesh = null;
function updateWorld(dt) {
  G.restockT -= dt; if (G.restockT <= 0) { G.restockT = 300; restock(); }
  G.rebelT -= dt; if (G.rebelT <= 0) { G.rebelT = 600; moveRebel((G.rebelIdx + randi(1, 4)) % W.rebelSpots.length); }
  for (const o of G.inter) {
    if (!o.open || o.kind === 'drop' || o.once) continue;
    o.t -= dt;
    if (o.t <= 0) {
      o.open = false; o.hits = 0;
      if (o.kind === 'register') o.drawer.position.z = 0;
      if (o.kind === 'safe') o.hinge.rotation.y = 0;
      if (o.kind === 'scrap') o.mesh.visible = true;
      if (o.kind === 'crate') { o.lid.position.set(0, 0.76, 0); o.lid.rotation.z = 0; }
    }
  }
  for (let i = G.cashBags.length - 1; i >= 0; i--) {
    const c = G.cashBags[i]; c.t -= dt; c.mesh.rotation.y += dt;
    let taken = c.t <= 0;
    if (!taken) for (const b of G.bots) if (!b.dead && !b.downed && Math.abs(b.pos.x - c.x) < 1.2 && Math.abs(b.pos.z - c.z) < 1.2 && Math.abs(b.pos.y - c.y) < 1.5) { b.cash += c.amt; taken = true; break; }
    if (taken) { scene.remove(c.mesh); G.cashBags.splice(i, 1); }
  }
  for (let i = G.drops.length - 1; i >= 0; i--) { const d = G.drops[i]; d.t -= dt; if (d.t <= 0) removeDrop(d); }
  if (G.state === 'play') G.save.allowanceT = Math.min(ALLOWANCE_SEC, G.save.allowanceT + dt);
  // airdrop
  G.airdropT -= dt;
  if (G.airdropT <= 0 && !G.airdrop) {
    G.airdropT = rand(420, 600);
    const [x, z] = pick(W.airdrops);
    const plane = new THREE.Group(); bx(plane, 4, 3, 22, 0x4a5040, 0, 0, 0); bx(plane, 30, 0.5, 4, 0x4a5040, 0, 0.5, 1); bx(plane, 10, 0.4, 2.5, 0x4a5040, 0, 1, 9);
    plane.position.set(x, 90, z + 300); scene.add(plane);
    const chute = new THREE.Group(); bx(chute, 4, 0.3, 4, 0xd0d0d0, 0, 4, 0); bx(chute, 1.2, 0.8, 0.8, 0x3a5a3a, 0, 0, 0); chute.visible = false; scene.add(chute);
    G.airdrop = { x, z, plane, chute, phase: 'fly', y: 90, crate: null };
    UI.banner('AIRDROP', 'A supply drop is incoming — check the map (M)');
    sfx.tone(180, 3, 0.2, 'sawtooth', 60);
  }
  const A = G.airdrop;
  if (A) {
    if (A.phase === 'fly') {
      A.plane.position.z -= dt * 70;
      if (A.plane.position.z < A.z && !A.chute.visible) { A.chute.visible = true; A.chute.position.set(A.x, 88, A.z); }
      if (A.chute.visible) { A.y -= dt * 7; A.chute.position.y = A.y; if (A.y <= 0.3) { A.phase = 'land'; scene.remove(A.chute); A.crate = addCrate('airdrop', A.x, 0.15, A.z, 'surface', true); puff(new THREE.Vector3(A.x, 0.5, A.z), 0xd94040, 12, 0.5); } }
      if (A.plane.position.z < A.z - 320) scene.remove(A.plane);
    } else if (A.crate && A.crate.open === false && Math.random() < dt * 4) puff(new THREE.Vector3(A.x + 1, 1, A.z), 0xd94040, 1, 0.4, 2);
  }
  // subway train
  G.trainT -= dt;
  if (G.trainT <= 0 && !G.train) {
    G.trainT = rand(70, 110);
    if (!trainMesh) { trainMesh = new THREE.Group(); for (let i = 0; i < 3; i++) { bx(trainMesh, 19, 3.6, 3.2, 0x8a8f95, -20 + i * 20, 1.8, 0); bx(trainMesh, 19.2, 0.6, 3.3, 0x2a4a8a, -20 + i * 20, 1.2, 0); for (let k = -3; k <= 3; k++) bx(trainMesh, 1.6, 1, 3.3, 0x223344, -20 + i * 20 + k * 2.6, 2.6, 0, 0x111a22); } bx(trainMesh, 0.3, 0.8, 1.6, 0xffffcc, 9.6 + 20, 1.6, 0, 0xffffaa); scene.add(trainMesh); }
    G.train = { x: -110, dir: 1 }; trainMesh.visible = true;
    if (P.zone === 'subway') { sfx.tone(220, 1.2, 0.3, 'sawtooth'); sfx.tone(277, 1.2, 0.25, 'sawtooth'); UI.toast('Train approaching — get off the tracks!', 'bad'); }
  }
  if (G.train) {
    G.train.x += dt * 34;
    trainMesh.position.set(G.train.x, -13, 15);
    const tz = W.trackZone;
    for (const c of allChars()) if (!c.dead && c.zone === 'subway' && c.pos.z > tz.z0 && c.pos.z < tz.z1 && c.pos.y < -11.3 && Math.abs(c.pos.x - (G.train.x - 0.5)) < 31) kill(c, null, null, 'the Train');
    if (G.train.x > 120) { G.train = null; trainMesh.visible = false; }
  }
  // vibe elevator: someone up top calls it down now and then
  G.elev.bottomT -= dt; G.elev.callT -= dt;
  if (G.elev.callT <= 0) {
    G.elev.callT = rand(60, 160); G.elev.bottomT = 14;
    const rider = G.bots.find(b => b.zone === 'subway' && !b.dead && !b.downed && Math.random() < 0.5);
    if (rider) { rider.zone = 'vibe'; rider.pos.set(2, -49.8, -5); rider.path = null; rider.goal = null; }
    if (P.zone === 'vibe') { sfx.elevator(); UI.toast('The elevator just came down!', 'good'); }
  }
}

// ---------- lights ----------
for (const L of W.lights) {
  if (!L.lamp && !L.inside && L.zone === 'surface') continue;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: L.c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  sp.position.set(L.x, L.y + (L.lamp ? 0.3 : 0.4), L.z); const k = L.small ? 1.2 : L.inside ? 1.6 : L.zone !== 'surface' ? 0.9 : 2.6; sp.scale.set(k, k, 1); scene.add(sp);
}
let poolT = 0;
function updateLightPool(zone) {
  poolT -= 1; if (poolT > 0) return; poolT = 10;
  const c = camera.position;
  const cand = W.lights.filter(l => l.zone === zone).map(l => [l, (l.x - c.x) ** 2 + (l.z - c.z) ** 2 + (l.y - c.y) ** 2]).sort((a, b) => a[1] - b[1]);
  const n = G.save?.settings.lights ?? 8;
  for (let i = 0; i < POOL; i++) {
    const L = cand[i]?.[0], l = pool[i];
    l.visible = i < n;
    if (!L) { l.intensity = 0; continue; }
    l.position.set(L.x, L.y, L.z); l.color.setHex(L.c); l.intensity = L.zone === 'surface' ? L.i * 0.55 : L.i; l.distance = L.small ? 12 : L.inside ? 16 : 26;
  }
}

// ---------- third person ----------
const tpModel = makeChar({ ...randomOutfit(), top: 'hoodie', head: 'balaclava', shirt: 0x2e3440, pants: 0x22252a, mask: 0x15161a, gloves: 0x151515, vest: null }); tpModel.visible = false; scene.add(tpModel);
let tpHandItem = null;
G.thirdPerson = () => !!G.save?.settings.tp;
function viewOrigin() { return G.thirdPerson() ? eyeOf(P) : camera.position.clone(); }
function poseTP(dt) {
  const tp = G.thirdPerson() && G.state === 'play' && P.alive;
  tpModel.visible = tp;
  if (!tp) return;
  const it = vmItem || ITEM.fists;
  if (tpHandItem !== it) { tpHandItem = it; tpModel.userData.setHeld(it, weaponModel); }
  const fake = { model: tpModel, pos: P.pos, yaw: P.yaw, vel: P.vel, downed: P.downed, dead: false, state: 'roam', aiming: isGun(it), aimPitch: -P.pitch, anim: vmSwing > 0 ? 0.2 : 0, using: isGun(it) ? 'gun' : 'melee', gun: isGun(it) ? P.inv[P.eq] : null, melee: it.id };
  poseBot(fake, dt);
  tpModel.scale.y = P.crouch ? 0.75 : 1;
}
function placeTPCamera() {
  const eye = eyeOf(P), d = aimDir();
  const right = new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  const want = eye.clone().addScaledVector(d, -(P.ads > 0.5 ? 2.2 : 3.8)).addScaledVector(right, 1.4).add(new THREE.Vector3(0, 0.35, 0));
  const dir = want.clone().sub(eye); const L = dir.length(); dir.normalize();
  const hit = phys.ray(eye, dir, L);
  camera.position.copy(eye).addScaledVector(dir, Math.max(0.3, hit.t - 0.3));
}
function shotFrom() {
  if (!G.thirdPerson()) return [camera.position.clone(), null];
  const d = aimDir(), o = camera.position.clone();
  const w = phys.ray(o, d, 300), c = rayChar(o, d, w.t, P, P.zone);
  const target = o.clone().addScaledVector(d, c.hit ? c.t : w.t);
  const eye = eyeOf(P); eye.y -= 0.15;
  return [eye, target.sub(eye).normalize()];
}

// ---------- post ----------
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.6, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- street decor (instanced) ----------
{
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const inst = (geo, mat, list, fn, shadow = true) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => { fn(it, v, e, sc); q.setFromEuler(e); m4.compose(v, q, sc); im.setMatrixAt(i, m4); });
    im.castShadow = shadow; im.receiveShadow = true; scene.add(im); return im;
  };
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 4.6, 6); trunkGeo.translate(0, 2.3, 0);
  inst(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x2a2420 }), W.trees, ([x, z, s], v, e, sc) => { v.set(x, 0.15, z); e.set(0, x * 3.1, 0); sc.set(s, s, s); });
  const blobs = [];
  for (const [x, z, s] of W.trees) for (let k = 0; k < 16; k++) blobs.push([x + rand(-1.8, 1.8) * s, rand(3.4, 6.6) * s, z + rand(-1.8, 1.8) * s, rand(0.6, 1.1) * s]);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3e5236, flatShading: true });
  inst(new THREE.IcosahedronGeometry(1, 0), leafMat, blobs, ([x, y, z, s], v, e, sc) => { v.set(x, y, z); e.set(rand(0, 3), rand(0, 3), 0); sc.set(s, s * 0.75, s); });
  const bagGeo = new THREE.IcosahedronGeometry(0.42, 1); bagGeo.translate(0, 0.32, 0);
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.32, metalness: 0.1 });
  const bags = []; for (const [x, y, z, s] of W.bags) for (let k = 0; k < randi(2, 5); k++) bags.push([x + rand(-0.6, 0.6), y, z + rand(-0.6, 0.6), s * rand(0.7, 1.1)]);
  inst(bagGeo, bagMat, bags, ([x, y, z, s], v, e, sc) => { v.set(x, y, z); e.set(rand(-0.2, 0.2), rand(0, 6), rand(-0.2, 0.2)); sc.set(s, s * rand(0.75, 1.05), s); });
  const paperGeo = new THREE.PlaneGeometry(0.32, 0.42); paperGeo.rotateX(-Math.PI / 2);
  const paperMat = new THREE.MeshLambertMaterial({ color: 0xc8c4b4, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide });
  inst(paperGeo, paperMat, W.papers, ([x, y, z, r], v, e, sc) => { v.set(x, y, z); e.set(0, r, 0); sc.set(1, 1, 1); }, false);
  const wpts = [];
  for (const [a, b] of W.wires) { const n = 10; for (let i = 0; i < n; i++) { for (const t of [i / n, (i + 1) / n]) wpts.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * 0.9, a[2] + (b[2] - a[2]) * t); } }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wpts, 3));
  scene.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x0c0c0d })));
}

// ---------- effects ----------
const fxTex = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 128; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const flashTex = fxTex((x) => {
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.2, 'rgba(255,200,90,0.9)'); g.addColorStop(0.5, 'rgba(255,120,30,0.3)'); g.addColorStop(1, 'rgba(255,90,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(255,220,140,0.9)'; x.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + Math.random() * 0.3, L = 30 + Math.random() * 32; x.lineWidth = 3 + Math.random() * 4; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(a) * L, 64 + Math.sin(a) * L); x.stroke(); }
});
const smokeTex = fxTex((x) => { for (let i = 0; i < 14; i++) { const px = 64 + rand(-22, 22), py = 64 + rand(-22, 22), r = rand(20, 40); const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } });
const sparkTex = fxTex((x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.3, 'rgba(255,170,60,0.8)'); g.addColorStop(1, 'rgba(255,100,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
const fx = [];
function sprite(tex, pos, size, life, opts = {}) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: opts.color ?? 0xffffff, transparent: true, depthWrite: false, blending: opts.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending, opacity: opts.opacity ?? 1, rotation: rand(0, 6.28) }));
  m.position.copy(pos); m.scale.setScalar(size); (opts.scene || scene).add(m);
  fx.push({ m, life, max: life, vel: opts.vel || null, grow: opts.grow || 0, grav: opts.grav || 0, sc: opts.scene || scene, op: opts.opacity ?? 1 });
}
const flashLight = new THREE.PointLight(0xffb060, 0, 14, 1.6); scene.add(flashLight);
let flashT = 0;
function muzzleFlash(pos, big = 1) {
  sprite(flashTex, pos, 0.55 * big + rand(0, 0.25), 0.045);
  sprite(smokeTex, pos, 0.4, 0.6, { additive: false, color: 0x9a9a9a, opacity: 0.35, grow: 1.4, vel: new THREE.Vector3(rand(-0.3, 0.3), 0.6, rand(-0.3, 0.3)) });
  if (pos.distanceTo(camera.position) < 40) { flashLight.position.copy(pos); flashLight.intensity = 40 * big; flashT = 0.05; }
}
function impactFx(p, n, blood) {
  if (blood) { for (let i = 0; i < 4; i++) sprite(smokeTex, p, 0.25, 0.35, { additive: false, color: 0x6a0a0a, opacity: 0.8, grow: 0.8, vel: new THREE.Vector3(rand(-1, 1), rand(0, 1.5), rand(-1, 1)), grav: 4 }); return; }
  for (let i = 0; i < 5; i++) sprite(sparkTex, p, 0.07, rand(0.15, 0.35), { vel: new THREE.Vector3(rand(-3, 3), rand(0.5, 4), rand(-3, 3)), grav: 12 });
  sprite(smokeTex, p, 0.3, 0.8, { additive: false, color: 0xa09a90, opacity: 0.45, grow: 1.2, vel: new THREE.Vector3(0, 0.3, 0) });
}
function updateFx(dt) {
  flashT -= dt; if (flashT <= 0) flashLight.intensity = 0;
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.life -= dt;
    if (f.vel) { f.vel.y -= f.grav * dt; f.m.position.addScaledVector(f.vel, dt); }
    if (f.grow) f.m.scale.multiplyScalar(1 + f.grow * dt);
    f.m.material.opacity = f.op * Math.max(0, f.life / f.max);
    if (f.life <= 0) { f.sc.remove(f.m); f.m.material.dispose(); fx.splice(i, 1); }
  }
}
const dust = (() => {
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rand(-20, 20); pos[i * 3 + 1] = rand(-3, 10); pos[i * 3 + 2] = rand(-20, 20); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: sparkTex, size: 0.06, color: 0xd8d0c0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  p.frustumCulled = false; scene.add(p); return p;
})();
function updateDust(dt) {
  const a = dust.geometry.attributes.position, c = camera.position;
  for (let i = 0; i < a.count; i++) {
    let x = a.getX(i) + Math.sin(G.time * 0.3 + i) * dt * 0.15, y = a.getY(i) - dt * 0.08, z = a.getZ(i) + dt * 0.12;
    if (x - c.x > 20) x -= 40; if (x - c.x < -20) x += 40; if (z - c.z > 20) z -= 40; if (z - c.z < -20) z += 40; if (y - c.y < -3) y += 13; if (y - c.y > 10) y -= 13;
    a.setXYZ(i, x, y, z);
  }
  a.needsUpdate = true;
}

// ---------- main ----------
function resize() {
  const q = G.save?.settings.quality ?? 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * q);
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = vmCam.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  if (typeof composer !== 'undefined') { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
}
addEventListener('resize', resize);
G.applySettings = () => { const s = G.save.settings; sfx.setVol(s.vol); resize(); scene.fog.far = s.view; camera.far = s.view + 80; camera.updateProjectionMatrix(); };

function respawnPlayer() {
  const spawns = [...W.spawns];
  let best = spawns[0], bd = -1;
  for (const s of spawns) { const d = Math.min(...G.bots.filter(b => b.zone === 'surface' && !b.dead).map(b => Math.hypot(b.pos.x - s[0], b.pos.z - s[1])), 999) + rand(0, 25); if (d > bd) { bd = d; best = s; } }
  P.pos.set(best[0] + rand(-1, 1), 0.4, best[1] + rand(-1, 1)); P.vel.set(0, 0, 0);
  P.hp = 100; P.stamina = 100; P.alive = true; P.dead = false; P.downed = false; P.downHp = 0; P.zone = 'surface'; P.burn = 0; P.lastHitBy = null; P.bounty = 0; P.streak = 0;
  P.yaw = rand(0, 6.28); P.pitch = 0; P.using = null; P.reloadT = 0;
  if (!P.inv.length) P.inv = [newEntry('fists')];
  P.eq = 0; buildVM(); UI.zone('SECTOR-07');
}
G.respawn = () => { respawnPlayer(); UI.close(); lock(); };
G.resetChar = () => {
  if (!P.alive) return;
  const loss = Math.min(500, Math.round(P.cash * 0.1)); P.cash -= loss;
  if (loss) makeCash(P.pos.x, P.pos.y, P.pos.z, loss);
  for (const e of P.inv.filter(e => e.id !== 'fists')) dropItem(e, P.pos.x + rand(-1, 1), P.pos.y, P.pos.z + rand(-1, 1));
  P.inv = [newEntry('fists')];
  for (const s of ['vest', 'helmet', 'pack', 'suit', 'eyes']) if (P.armor[s]) { dropItem({ id: P.armor[s].id, dur: P.armor[s].dur }, P.pos.x, P.pos.y, P.pos.z); P.armor[s] = null; }
  respawnPlayer(); UI.close(); lock(); UI.toast('Character reset (-' + fmt(loss) + ')', 'bad');
};
G.startGame = (mode) => {
  sfx.init(); G.applySettings();
  G.mode = mode; G.state = 'play';
  P.level = G.save.level;
  P.inv = [newEntry('fists')]; P.cash = 0;
  const ses = G.save.session;
  if (ses) { P.cash = ses.cash || 0; for (const e of ses.inv || []) if (ITEM[e.id]) P.inv.push(e); Object.assign(P.armor, ses.armor || {}); }
  respawnPlayer();
  UI.close(); UI.showHUD(true); lock();
};
G.toMenu = () => { save(); G.state = 'menu'; unlock(); UI.showHUD(false); UI.open('main'); };
G.botsList = () => G.bots;
G.dbg = { fire: () => { mouseL = true; P.fireT = 0; } };

async function checkUpdate() {
  try {
    const r = await fetch('/api/update', { cache: 'no-store' });
    if (!r.ok) return;
    const u = await r.json();
    G.version = u.current?.slice(0, 7) || G.version;
    if (u.ready && u.latest && u.latest !== u.current) {
      if (!G.update.ready) { G.update = { ready: true, latest: u.latest }; UI.updateReady(u.latest.slice(0, 7)); }
      if (G.state === 'menu' || (G.state === 'play' && !P.alive)) { save(); location.reload(); }
    }
  } catch { }
}

let last = performance.now(), fpsAcc = 0, fpsN = 0, menuAng = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  G.time += dt;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { G.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  if (G.state === 'loading') return;
  pathBudget = 2;
  const simDt = UI.isOpen() && G.state === 'play' && UI.current() === 'pause' ? dt : dt;
  updateWorld(simDt);
  if (G.state === 'play') updatePlayer(simDt);
  for (let i = G.bots.length - 1; i >= 0; i--) updateBot(G.bots[i], simDt);
  updateProjectiles(simDt); updateFires(simDt);
  for (const n of npcs) n.userData.mixer.update(dt);
  for (let i = tracers.length - 1; i >= 0; i--) { const t = tracers[i]; t.t -= dt; t.l.material.opacity = Math.max(0, t.t / 0.06) * 0.8; if (t.t <= 0) { scene.remove(t.l); t.l.geometry.dispose(); tracers.splice(i, 1); } }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t -= dt; s.v.y -= 9 * dt; s.m.position.addScaledVector(s.v, dt); if (s.t <= 0) { scene.remove(s.m); sparks.splice(i, 1); } }

  const zone = G.state === 'play' ? P.zone : 'surface';
  const under = zone !== 'surface';
  scene.background.lerp(under ? UNDER : SKY, 0.2); scene.fog.color.copy(zone === 'sewer' ? new THREE.Color(0x0e140f) : zone === 'subway' ? new THREE.Color(0x101512) : zone === 'vibe' ? new THREE.Color(0x120a14) : scene.background);
  scene.fog.density = under ? (zone === 'sewer' ? 0.035 : 0.028) : 0.011 * 420 / Math.max(200, G.save.settings.view);
  sky.visible = !under;
  hemi.intensity = under ? (zone === 'vibe' ? 0.9 : 0.7) : 1.6; hemi.color.setHex(under ? 0xa8c0b0 : 0xb4c0d4);
  sun.intensity = under ? 0 : 1.1; skyMat.uniforms.time.value = G.time; sun.castShadow = !under;
  pLight.intensity = under ? 6 : 0; updateLightPool(zone); vibeL1.intensity = vibeL2.intensity = zone === 'vibe' ? 160 : 0;
  {
    const c = camera.position, texel = 180 / 2048;
    const fx = Math.round(c.x / texel) * texel, fz = Math.round(c.z / texel) * texel;
    sun.target.position.set(fx, 0, fz); sun.position.set(fx + SUN_DIR.x * 200, SUN_DIR.y * 200, fz + SUN_DIR.z * 200);
    pLight.position.set(c.x, c.y + 0.6, c.z);
    sky.position.copy(c);
  }
  if (trainMesh) trainMesh.visible = !!G.train && zone === 'subway';

  if (G.state === 'play') {
    const ey = P.downed ? 0.45 : P.crouch ? 1.15 : 1.62;
    const by = G.save.settings.bob && P.onGround ? Math.sin(bob) * 0.04 * Math.min(1, Math.hypot(P.vel.x, P.vel.z) / 7) : 0;
    camera.position.set(P.pos.x, P.pos.y + ey + by, P.pos.z);
    shake *= Math.pow(0.05, dt);
    camera.rotation.set(P.pitch + rand(-shake, shake) * 0.1, P.yaw + rand(-shake, shake) * 0.1, 0);
    if (G.thirdPerson()) placeTPCamera();
    poseTP(dt);
    const it = vmItem || ITEM.fists;
    const fov = G.save.settings.fov * (1 - P.ads * (it.scope ? 0.72 : 0.22));
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    // viewmodel
    const base = vm.userData.base || new THREE.Vector3(0.2, -0.2, -0.42);
    const adsPos = new THREE.Vector3(0, -0.075, ['rifle', 'sniper', 'shotgun', 'launcher'].includes(it.type) ? -0.42 : -0.34);
    vmKick *= Math.pow(0.001, dt);
    vm.position.lerpVectors(base, adsPos, P.ads);
    vm.position.y += Math.sin(bob) * 0.012 * (1 - P.ads) - (P.reloadT > 0 ? 0.15 : 0) - (P.using ? 0.1 : 0);
    vm.position.x += Math.cos(bob * 0.5) * 0.01 * (1 - P.ads);
    vm.position.z += vmKick;
    vm.rotation.set(vmKick * 2 + (P.reloadT > 0 ? -0.6 : 0), 0, 0);
    if (vmSwing > 0) {
      vmSwing = Math.max(0, vmSwing - dt * 4.5);
      const s = Math.sin(vmSwing * Math.PI);
      if (it.id === 'fists' || it.id === 'knuckledusters') { const side = Math.floor(G.time * 3) % 2 ? vm.userData.l : vm.userData.r; if (side) side.position.z = -s * 0.35; }
      else { vm.rotation.x -= s * 1.2; vm.rotation.y = s * 0.6; vm.position.x -= s * 0.15; }
    } else if (vm.userData.l) { vm.userData.l.position.z = 0; vm.userData.r.position.z = 0; }
    vm.visible = !(it.scope && P.ads > 0.7) && P.alive && !P.downed && !G.thirdPerson();
    UI.scope(it.scope && P.ads > 0.7);
    UI.hud(P, G, { flash: P.flashT, gas: P.gasT, prompt: promptObj });
    UI.tags(G.bots, camera);
    saveTimer -= dt; if (saveTimer <= 0) { saveTimer = 15; save(); }
  } else {
    menuAng += dt;
    camera.position.set(-30 + Math.sin(menuAng * 0.05) * 6, 1.9, -36 + Math.sin(menuAng * 0.03) * 2);
    camera.rotation.set(0.04 + Math.sin(menuAng * 0.2) * 0.01, 1.15 + Math.sin(menuAng * 0.06) * 0.25, 0);
    if (camera.fov !== 62) { camera.fov = 62; camera.updateProjectionMatrix(); }
    vm.visible = false; tpModel.visible = false;
  }
  updateFx(dt); updateDust(dt);
  renderer.clear();
  if (G.save.settings.bloom !== false) composer.render(dt); else renderer.render(scene, camera);
  if (G.state === 'play' && vm.visible) { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
}

(async function boot() {
  G.save = await loadSave();
  P.level = G.save.level;
  try { const r = await fetch('/api/update', { cache: 'no-store' }); if (r.ok) { const u = await r.json(); G.version = (u.current || 'dev').slice(0, 7); } } catch { }
  restock();
  buildInteractables();
  for (let i = 0; i < 14; i++) spawnBot('surface');
  for (let i = 0; i < 3; i++) spawnBot('subway');
  for (let i = 0; i < 3; i++) spawnBot('sewer');
  for (let i = 0; i < 2; i++) spawnBot('vibe');
  UI.init(G);
  G.applySettings();
  G.state = 'menu';
  UI.open('main');
  document.getElementById('loading').style.display = 'none';
  setInterval(checkUpdate, 15000);
  setInterval(() => fetch('/api/ping', { cache: 'no-store' }).catch(() => { }), 5000);
  addEventListener('beforeunload', save);
  requestAnimationFrame(frame);
})();
