import * as THREE from 'three';

const cache = new Map();
let seed = 1337;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function canvas(n = 512) { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')]; }
function noise(x, n, amt, base = 200, size = 1) {
  const img = x.getImageData(0, 0, n, n), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - 0.5) * amt;
    d[i] = Math.max(0, Math.min(255, d[i] + v)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + v)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + v));
  }
  x.putImageData(img, 0, 0);
}
function blotches(x, n, count, rMin, rMax, col, alpha) {
  for (let i = 0; i < count; i++) {
    const px = rnd() * n, py = rnd() * n, r = rMin + rnd() * (rMax - rMin);
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${col},${alpha * rnd()})`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) { x.save(); x.translate(ox, oy); x.fillRect(px - r, py - r, r * 2, r * 2); x.restore(); }
  }
}
const GEN = {
  asphalt(x, n) {
    x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, n, n);
    blotches(x, n, 40, 20, 90, '60,60,60', 0.25);
    noise(x, n, 70);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${rnd() * 0.25})`; x.fillRect(rnd() * n, rnd() * n, 1.5, 1.5); }
    x.strokeStyle = 'rgba(30,30,30,0.5)'; x.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { let px = rnd() * n, py = rnd() * n; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (rnd() - 0.5) * 40; py += (rnd() - 0.5) * 40; x.lineTo(px, py); } x.stroke(); }
  },
  concrete(x, n) {
    x.fillStyle = '#d8d8d6'; x.fillRect(0, 0, n, n);
    blotches(x, n, 22, 30, 120, '80,80,80', 0.14);
    noise(x, n, 40);
    x.strokeStyle = 'rgba(60,60,60,0.45)'; x.lineWidth = 2; x.strokeRect(1, 1, n - 2, n - 2);
    for (let i = 0; i < 10; i++) { x.fillStyle = `rgba(40,40,40,${rnd() * 0.2})`; x.fillRect(rnd() * n, rnd() * n, rnd() * 3 + 1, rnd() * 40 + 10); }
  },
  sidewalk(x, n) {
    x.fillStyle = '#dcdad4'; x.fillRect(0, 0, n, n); noise(x, n, 30);
    blotches(x, n, 14, 20, 70, '80,80,70', 0.2);
    x.strokeStyle = 'rgba(70,70,70,0.6)'; x.lineWidth = 3;
    for (let k = 0; k <= 2; k++) { x.beginPath(); x.moveTo(0, k * n / 2); x.lineTo(n, k * n / 2); x.moveTo(k * n / 2, 0); x.lineTo(k * n / 2, n); x.stroke(); }
  },
  lot(x, n) {
    x.fillStyle = '#c4c4c2'; x.fillRect(0, 0, n, n);
    blotches(x, n, 40, 15, 80, '70,70,70', 0.18); blotches(x, n, 12, 20, 60, '110,100,80', 0.08);
    noise(x, n, 45);
    x.strokeStyle = 'rgba(50,50,50,0.35)'; x.lineWidth = 1;
    for (let i = 0; i < 5; i++) { let px = rnd() * n, py = rnd() * n; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 7; k++) { px += (rnd() - 0.5) * 50; py += (rnd() - 0.5) * 50; x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(60,55,50,${rnd() * 0.5})`; x.fillRect(rnd() * n, rnd() * n, 2, 2); }
  },
  dirt(x, n) { x.fillStyle = '#c4ab88'; x.fillRect(0, 0, n, n); blotches(x, n, 50, 10, 60, '80,60,40', 0.35); noise(x, n, 70); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(90,80,70,${rnd() * 0.6})`; x.fillRect(rnd() * n, rnd() * n, 3, 2); } },
  brick(x, n) {
    x.fillStyle = '#9a9690'; x.fillRect(0, 0, n, n);
    const bh = n / 16, bw = n / 4;
    for (let r = 0; r < 16; r++) for (let c = -1; c < 5; c++) {
      const off = r % 2 ? bw / 2 : 0, v = 175 + (rnd() - 0.5) * 70;
      x.fillStyle = `rgb(${v + 20},${v - 10},${v - 25})`; x.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
    }
    noise(x, n, 35); blotches(x, n, 12, 40, 120, '40,35,30', 0.18);
  },
  plaster(x, n) {
    x.fillStyle = '#e2ddd2'; x.fillRect(0, 0, n, n); noise(x, n, 45);
    blotches(x, n, 25, 30, 110, '120,110,90', 0.2);
    for (let i = 0; i < 25; i++) { const px = rnd() * n; const g = x.createLinearGradient(0, 0, 0, n); g.addColorStop(0, 'rgba(60,55,45,0.18)'); g.addColorStop(1, 'rgba(60,55,45,0)'); x.fillStyle = g; x.fillRect(px, 0, 3 + rnd() * 6, n * rnd()); }
  },
  metal(x, n) {
    x.fillStyle = '#c4c8cc'; x.fillRect(0, 0, n, n);
    for (let i = 0; i < n; i += 32) { const g = x.createLinearGradient(i, 0, i + 32, 0); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.5, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0.18)'); x.fillStyle = g; x.fillRect(i, 0, 32, n); }
    noise(x, n, 25); blotches(x, n, 18, 20, 90, '110,70,40', 0.22);
  },
  corrugated(x, n) {
    x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, n, n);
    for (let i = 0; i < n; i += 21.33) { const g = x.createLinearGradient(i, 0, i + 21.33, 0); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.5, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); x.fillStyle = g; x.fillRect(i, 0, 21.33, n); }
    noise(x, n, 25); blotches(x, n, 25, 15, 70, '120,60,30', 0.3);
  },
  rust(x, n) { x.fillStyle = '#d8b090'; x.fillRect(0, 0, n, n); blotches(x, n, 60, 10, 70, '90,40,15', 0.45); blotches(x, n, 30, 10, 50, '40,30,25', 0.3); noise(x, n, 60); },
  wood(x, n) {
    x.fillStyle = '#d8b890'; x.fillRect(0, 0, n, n);
    for (let p = 0; p < 8; p++) { const v = (rnd() - 0.5) * 40; x.fillStyle = `rgba(${120 + v},${80 + v},${40 + v},0.35)`; x.fillRect(0, p * n / 8, n, n / 8 - 3); x.fillStyle = 'rgba(40,25,10,0.6)'; x.fillRect(0, p * n / 8 + n / 8 - 3, n, 3); }
    for (let i = 0; i < 120; i++) { x.strokeStyle = `rgba(80,50,20,${rnd() * 0.25})`; x.beginPath(); const y = rnd() * n; x.moveTo(0, y); x.bezierCurveTo(n / 3, y + (rnd() - 0.5) * 8, n * 2 / 3, y + (rnd() - 0.5) * 8, n, y); x.stroke(); }
    noise(x, n, 25);
  },
  tile(x, n) {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const v = (i + j) % 2 ? 215 : 185; const k = v + (rnd() - 0.5) * 16; x.fillStyle = `rgb(${k},${k},${k - 6})`; x.fillRect(i * n / 8, j * n / 8, n / 8, n / 8); }
    x.strokeStyle = 'rgba(60,60,60,0.5)'; x.lineWidth = 2; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * n / 8, 0); x.lineTo(i * n / 8, n); x.moveTo(0, i * n / 8); x.lineTo(n, i * n / 8); x.stroke(); }
    noise(x, n, 18); blotches(x, n, 15, 20, 80, '80,70,50', 0.2);
  },
  roof(x, n) { x.fillStyle = '#b8b8b8'; x.fillRect(0, 0, n, n); noise(x, n, 60); blotches(x, n, 40, 20, 100, '40,40,40', 0.25); x.strokeStyle = 'rgba(30,30,30,0.3)'; for (let i = 0; i < n; i += 64) { x.beginPath(); x.moveTo(0, i); x.lineTo(n, i); x.stroke(); } },
  rock(x, n) { x.fillStyle = '#c0bcb4'; x.fillRect(0, 0, n, n); blotches(x, n, 80, 10, 90, '50,45,40', 0.35); blotches(x, n, 40, 10, 60, '230,225,215', 0.2); noise(x, n, 70); },
  grate(x, n) { x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, n, n); x.fillStyle = '#151515'; for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) x.fillRect(i * n / 16 + 5, j * n / 16 + 5, n / 16 - 10, n / 16 - 10); noise(x, n, 40); blotches(x, n, 20, 20, 80, '100,50,20', 0.3); },
  court(x, n) { x.fillStyle = '#d8a080'; x.fillRect(0, 0, n, n); noise(x, n, 30); blotches(x, n, 20, 30, 100, '90,40,20', 0.2); },
  chain(x, n) { x.fillStyle = '#b0b0b0'; x.fillRect(0, 0, n, n); x.strokeStyle = 'rgba(40,40,40,0.7)'; x.lineWidth = 3; for (let i = -n; i < n * 2; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + n, n); x.moveTo(i + n, 0); x.lineTo(i, n); x.stroke(); } noise(x, n, 20); },
  sewer(x, n) { x.fillStyle = '#b8bcae'; x.fillRect(0, 0, n, n); blotches(x, n, 60, 15, 90, '50,70,40', 0.35); blotches(x, n, 30, 10, 60, '30,30,25', 0.35); noise(x, n, 50); x.strokeStyle = 'rgba(40,40,40,0.4)'; x.lineWidth = 2; x.strokeRect(1, 1, n - 2, n - 2); },
  panel(x, n) { x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, n, n); x.strokeStyle = 'rgba(30,30,30,0.6)'; x.lineWidth = 3; x.strokeRect(2, 2, n - 4, n - 4); x.strokeRect(n / 2, 2, 0.1, n); noise(x, n, 20); blotches(x, n, 10, 20, 70, '60,60,60', 0.2); },
};
export function getTex(kind) {
  if (!kind || !GEN[kind]) return null;
  if (cache.has(kind)) return cache.get(kind);
  const [c, x] = canvas(512);
  seed = 1000 + kind.length * 7919 + kind.charCodeAt(0) * 31;
  GEN[kind](x, 512);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(kind, t);
  return t;
}
// texture kind and tile size (metres) per builder material key
export const TEXMAP = {
  road: ['asphalt', 6], lot: ['lot', 8], walk: ['sidewalk', 3], dirt: ['dirt', 6], court: ['court', 8], concrete: ['concrete', 3], brick: ['brick', 3], brick2: ['brick', 3],
  plaster: ['plaster', 4], metal: ['corrugated', 3], rust: ['rust', 4], wood: ['wood', 2], roof: ['roof', 6], wall: ['concrete', 6], rock: ['rock', 14],
  container: ['corrugated', 2.5], container2: ['corrugated', 2.5], container3: ['corrugated', 2.5], sewer: ['sewer', 4], sewerwall: ['brick', 2.5], tile: ['tile', 4],
  rail: ['wood', 2], grate: ['grate', 2], vibe: ['concrete', 4], fence: ['chain', 2], counter: ['wood', 1.5], trim: ['metal', 2], dark: ['concrete', 5],
  carred: ['panel', 2], carblue: ['panel', 2], cargray: ['panel', 2], black: ['rust', 3], pizza: ['wood', 2],
};
