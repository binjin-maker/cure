import * as THREE from 'three';
import { RoundedBoxGeometry } from './pp/RoundedBoxGeometry.js';

// Detailed procedural firearms. Model space: +x = muzzle, +y = up, z = width; origin = top of the pistol grip (hand position).
// Moving parts are tagged on group.userData: mag, bolt, slide, pump, hammer, cyl.

// ---------- procedural PBR surfaces ----------
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function canvasTex(n, draw, srgb = true, rep = 1) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d', { willReadFrequently: true }); draw(x, n);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function heightToNormal(src, n, strength = 2) {
  const s = src.getContext('2d').getImageData(0, 0, n, n).data;
  return canvasTex(n, (x) => {
    const out = x.createImageData(n, n), d = out.data, H = (i, j) => s[(((j + n) % n) * n + ((i + n) % n)) * 4] / 255;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const dx = (H(i + 1, j) - H(i - 1, j)) * strength, dy = (H(i, j + 1) - H(i, j - 1)) * strength;
      const l = Math.hypot(dx, dy, 1), k = (j * n + i) * 4;
      d[k] = (-dx / l * 0.5 + 0.5) * 255; d[k + 1] = (dy / l * 0.5 + 0.5) * 255; d[k + 2] = (1 / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
    x.putImageData(out, 0, 0);
  }, false);
}
function noiseCanvas(n, f) { const c = document.createElement('canvas'); c.width = c.height = n; f(c.getContext('2d', { willReadFrequently: true }), n); return c; }
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const N = 256;
  const scratches = noiseCanvas(N, (x, n) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, n, n);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${rnd() < 0.5 ? 255 : 0},${0},${0},0)`; }
    const img = x.getImageData(0, 0, n, n), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = 128 + (rnd() - 0.5) * 26; d[i] = d[i + 1] = d[i + 2] = v; }
    x.putImageData(img, 0, 0);
    x.strokeStyle = 'rgba(200,200,200,0.5)'; x.lineWidth = 0.6;
    for (let i = 0; i < 140; i++) { const a = rnd() * 6.28, l = 4 + rnd() * 26, px = rnd() * n, py = rnd() * n; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  });
  const metalRough = canvasTex(N, (x, n) => {
    x.drawImage(scratches, 0, 0);
    for (let i = 0; i < 60; i++) { const px = rnd() * n, py = rnd() * n, r = 8 + rnd() * 40; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(60,60,60,0.35)'); g.addColorStop(1, 'rgba(60,60,60,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); }
  }, false, 6);
  const metalNorm = heightToNormal(scratches, N, 1.2); metalNorm.repeat.set(6, 6);
  const wear = canvasTex(N, (x, n) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, n, n);
    for (let i = 0; i < 70; i++) { const px = rnd() * n, py = rnd() * n, r = 6 + rnd() * 30; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(190,190,190,0.18)'); g.addColorStop(1, 'rgba(190,190,190,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); }
    const img = x.getImageData(0, 0, n, n), d = img.data; for (let i = 0; i < d.length; i += 4) { const v = (rnd() - 0.5) * 10; d[i] += v; d[i + 1] += v; d[i + 2] += v; } x.putImageData(img, 0, 0);
  }, true, 5);
  const grainC = noiseCanvas(N, (x, n) => {
    for (let j = 0; j < n; j++) { const v = 110 + Math.sin(j * 0.35 + Math.sin(j * 0.05) * 6) * 30 + (rnd() - 0.5) * 30; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, j, n, 1); }
    for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(40,40,40,${rnd() * 0.3})`; x.fillRect(rnd() * n, rnd() * n, 3 + rnd() * 18, 1); }
  });
  const woodMap = canvasTex(N, (x, n) => {
    x.drawImage(grainC, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = '#b0703c'; x.fillRect(0, 0, n, n); x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 40; i++) { const px = rnd() * n, py = rnd() * n, r = 10 + rnd() * 40; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(30,15,5,0.25)'); g.addColorStop(1, 'rgba(30,15,5,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); }
  }, true, 4);
  const woodNorm = heightToNormal(grainC, N, 0.8); woodNorm.repeat.set(4, 4);
  const stippleC = noiseCanvas(N, (x, n) => { const img = x.createImageData(n, n), d = img.data; for (let i = 0; i < d.length; i += 4) { const v = 128 + (rnd() - 0.5) * 90; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } x.putImageData(img, 0, 0); });
  const polyNorm = heightToNormal(stippleC, N, 0.6); polyNorm.repeat.set(14, 14);
  const std = (o) => new THREE.MeshStandardMaterial({ envMapIntensity: 1.2, ...o });
  MATS = {
    steel: std({ color: 0x2c2e31, metalness: 0.85, roughness: 0.42, roughnessMap: metalRough, normalMap: metalNorm, normalScale: new THREE.Vector2(0.35, 0.35), map: wear }),
    blued: std({ color: 0x1a1c20, metalness: 0.9, roughness: 0.32, roughnessMap: metalRough, normalMap: metalNorm, normalScale: new THREE.Vector2(0.3, 0.3), map: wear }),
    park: std({ color: 0x2e2f31, metalness: 0.6, roughness: 0.62, roughnessMap: metalRough, normalMap: metalNorm, normalScale: new THREE.Vector2(0.4, 0.4), map: wear }),
    chrome: std({ color: 0xc8cacc, metalness: 1, roughness: 0.18, roughnessMap: metalRough, normalMap: metalNorm, normalScale: new THREE.Vector2(0.2, 0.2) }),
    poly: std({ color: 0x1b1c1d, metalness: 0.05, roughness: 0.78, normalMap: polyNorm, normalScale: new THREE.Vector2(0.5, 0.5) }),
    tan: std({ color: 0x9a8562, metalness: 0.05, roughness: 0.75, normalMap: polyNorm, normalScale: new THREE.Vector2(0.5, 0.5), map: wear }),
    olive: std({ color: 0x4a4e3a, metalness: 0.05, roughness: 0.75, normalMap: polyNorm, normalScale: new THREE.Vector2(0.5, 0.5) }),
    wood: std({ color: 0xffffff, metalness: 0, roughness: 0.55, map: woodMap, normalMap: woodNorm, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.7 }),
    woodRed: std({ color: 0xd08060, metalness: 0, roughness: 0.45, map: woodMap, normalMap: woodNorm, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.8 }),
    bakelite: std({ color: 0x5a2a14, metalness: 0, roughness: 0.4, normalMap: polyNorm, normalScale: new THREE.Vector2(0.3, 0.3) }),
    rubber: std({ color: 0x111111, metalness: 0, roughness: 0.9, normalMap: polyNorm, normalScale: new THREE.Vector2(0.8, 0.8) }),
    brass: std({ color: 0xc8a040, metalness: 1, roughness: 0.3 }),
    glass: std({ color: 0x0a1820, metalness: 0.3, roughness: 0.05, envMapIntensity: 2 }),
    sight: std({ color: 0x40ff60, emissive: 0x30ff50, emissiveIntensity: 1.5 }),
    hole: new THREE.MeshBasicMaterial({ color: 0x050505 }),
  };
  return MATS;
}

// ---------- primitives (all meters, model space) ----------
function shapeFrom(pts) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => {
    if (p[0] === 'q') s.quadraticCurveTo(p[1], p[2], p[3], p[4]);
    else if (i === 0) s.moveTo(p[0], p[1]); else s.lineTo(p[0], p[1]);
  });
  return s;
}
function ext(g, pts, width, mat, z = 0, bevel = 0.0015, holes) {
  const sh = shapeFrom(pts);
  if (holes) for (const h of holes) { const p = new THREE.Path(); p.absellipse(h[0], h[1], h[2], h[3] ?? h[2], 0, Math.PI * 2); sh.holes.push(p); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -width / 2 + bevel + z);
  const m = new THREE.Mesh(geo, mat); g.add(m); return m;
}
function box(g, x0, x1, y0, y1, w, mat, z = 0, r = 0.002) {
  const geo = new RoundedBoxGeometry(x1 - x0, y1 - y0, w, 2, Math.min(r, (y1 - y0) / 2.2, (x1 - x0) / 2.2, w / 2.2));
  const m = new THREE.Mesh(geo, mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); g.add(m); return m;
}
function cyl(g, x0, x1, y, r, mat, z = 0, seg = 18, r2) {
  const geo = new THREE.CylinderGeometry(r2 ?? r, r, x1 - x0, seg); geo.rotateZ(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.position.set((x0 + x1) / 2, y, z); g.add(m); return m;
}
function ring(g, x, y, r, tube, mat, z = 0) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 20), mat); m.rotation.y = Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; }
function rail(g, x0, x1, y, w, mat, side = 'top', z = 0) {
  const t = new THREE.Group();
  box(t, x0, x1, 0, 0.006, w, mat, 0, 0.001);
  for (let x = x0 + 0.004; x < x1 - 0.004; x += 0.01) box(t, x, x + 0.0052, 0.006, 0.0095, w * 1.08, mat, 0, 0.0007);
  if (side === 'top') t.position.set(0, y, z);
  else if (side === 'bottom') { t.rotation.x = Math.PI; t.position.set(0, y, z); }
  else { t.rotation.x = side === 'left' ? Math.PI / 2 : -Math.PI / 2; t.position.set(0, y, z); }
  g.add(t); return t;
}
function screw(g, x, y, z, r = 0.003, mat) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.002, 10), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; }
function triggerAssembly(g, M, x0, x1, y, depth = 0.032, w = 0.008, round = false) {
  const pts = round
    ? [[x0, y], [x1, y], ['q', x1 + 0.006, y - depth * 0.9, (x0 + x1) / 2 + 0.008, y - depth], ['q', x0 - 0.004, y - depth, x0 - 0.006, y - depth * 0.4], [x0, y]]
    : [[x0, y], [x1, y], [x1 + 0.004, y - depth + 0.006], [x1 - 0.004, y - depth], [x0 - 0.006, y - depth], [x0 - 0.006, y - depth + 0.006], [x0, y]];
  ext(g, pts, w, M.steel, 0, 0.001, [[(x0 + x1) / 2 - 0.001, y - depth / 2, (x1 - x0) / 2 - 0.004, depth / 2 - 0.004]]);
  ext(g, [[x0 + 0.012, y], [x0 + 0.018, y], ['q', x0 + 0.02, y - 0.012, x0 + 0.012, y - 0.022], [x0 + 0.009, y - 0.02], ['q', x0 + 0.014, y - 0.01, x0 + 0.012, y]], 0.005, M.steel);
}
function grip(g, mat, top, len, ang = 0.32, w = 0.03, thick = 0.032, stip = true) {
  const [tx, ty] = top, dx = Math.sin(ang) * len, dy = Math.cos(ang) * len;
  const pts = [[tx - thick * 0.45, ty], [tx + thick * 0.55, ty], ['q', tx + thick * 0.62 - dx * 0.5, ty - dy * 0.5, tx + thick * 0.5 - dx, ty - dy], ['q', tx - dx, ty - dy - 0.008, tx - thick * 0.6 - dx, ty - dy + 0.004], ['q', tx - thick * 0.75 - dx * 0.4, ty - dy * 0.4, tx - thick * 0.45, ty]];
  const m = ext(g, pts, w, mat, 0, 0.003);
  return m;
}
function mag(g, M, x0, top, w, len, curve, mat, ribs = true) {
  const x1 = x0 + w, pts = [[x0, top], [x1, top]];
  const bx1 = x1 + curve, bx0 = x0 + curve * 1.15;
  pts.push(['q', x1 + curve * 0.25, top - len * 0.55, bx1, top - len]);
  pts.push([bx0, top - len - 0.004]);
  pts.push(['q', x0 + curve * 0.2, top - len * 0.5, x0, top]);
  const grp = new THREE.Group(); g.add(grp);
  ext(grp, pts, 0.022, mat, 0, 0.002);
  ext(grp, [[bx0 - 0.004, top - len + 0.004], [bx1 + 0.004, top - len + 0.004], [bx1 + 0.005, top - len - 0.008], [bx0 - 0.003, top - len - 0.01]], 0.026, mat, 0, 0.002);
  if (ribs) for (let k = 0.25; k < 0.9; k += 0.18) { const yy = top - len * k, xx = x0 + curve * k * k + 0.004; ext(grp, [[xx, yy], [xx + w - 0.008, yy], [xx + w - 0.008, yy - 0.006], [xx, yy - 0.006]], 0.0235, mat, 0, 0.001); }
  return grp;
}
function sightPost(g, M, x, y, h, w = 0.006) { box(g, x - 0.004, x + 0.004, y, y + h, w, M.steel, 0, 0.001); }
function buis(g, M, x, y) { box(g, x - 0.012, x + 0.012, y, y + 0.012, 0.03, M.poly); ext(g, [[x - 0.01, y + 0.012], [x + 0.008, y + 0.012], [x + 0.004, y + 0.04], [x - 0.006, y + 0.04]], 0.022, M.poly, 0, 0.001, [[x - 0.001, y + 0.032, 0.003]]); }
function scope(g, M, x0, x1, y, r = 0.016) {
  const s = new THREE.Group(); g.add(s);
  cyl(s, x0 + 0.05, x1 - 0.07, y, r * 0.78, M.blued, 0, 24);
  cyl(s, x1 - 0.07, x1, y, r * 1.25, M.blued, 0, 24, r * 0.82);
  cyl(s, x0, x0 + 0.05, y, r * 0.82, M.blued, 0, 24, r * 1.05);
  cyl(s, (x0 + x1) / 2 - 0.02, (x0 + x1) / 2 + 0.02, y, r, M.blued, 0, 24);
  const tu = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.018, 14), M.blued); tu.position.set((x0 + x1) / 2, y + r + 0.006, 0); s.add(tu);
  const tu2 = tu.clone(); tu2.rotation.x = Math.PI / 2; tu2.position.set((x0 + x1) / 2, y, r + 0.006); s.add(tu2);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(r * 1.15, 24), M.glass); lens.rotation.y = Math.PI / 2; lens.position.set(x1 + 0.0005, y, 0); s.add(lens);
  const lens2 = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 24), M.glass); lens2.rotation.y = -Math.PI / 2; lens2.position.set(x0 - 0.0005, y, 0); s.add(lens2);
  for (const rx of [x0 + 0.07, x1 - 0.1]) { ring(s, rx, y, r * 0.86, 0.004, M.steel); box(s, rx - 0.008, rx + 0.008, y - r - 0.018, y - r + 0.002, 0.016, M.steel); }
  return s;
}

// ---------- guns ----------
const B = {};
B.akm = (M, o = {}) => {
  const g = new THREE.Group(), wood = o.wood ?? M.woodRed, short = o.short;
  const rx1 = 0.19;
  ext(g, [[-0.07, 0.0], [rx1, 0.0], [rx1, 0.058], [rx1 - 0.01, 0.064], [-0.055, 0.064], [-0.07, 0.05]], 0.042, M.steel);
  ext(g, [[-0.062, 0.062], [rx1 - 0.012, 0.062], ['q', rx1 - 0.012, 0.086, rx1 - 0.03, 0.088], [-0.04, 0.088], ['q', -0.064, 0.086, -0.062, 0.062]], 0.038, M.park);
  for (let x = -0.03; x < 0.1; x += 0.012) box(g, x, x + 0.004, 0.084, 0.09, 0.03, M.park, 0, 0.001);
  ext(g, [[0.1, 0.06], [0.16, 0.06], [0.16, 0.054], [0.1, 0.054]], 0.004, M.steel, 0.022, 0.0005);
  box(g, 0.13, 0.155, 0.045, 0.06, 0.012, M.steel, 0.026, 0.002);
  ext(g, [[0.0, 0.035], [0.13, 0.035], [0.13, 0.042], [0.03, 0.03], [0.0, 0.03]], 0.004, M.steel, 0.022, 0.0005);
  for (const sx of [-0.04, 0.0, 0.06, 0.15]) { screw(g, sx, 0.012, 0.0215, 0.0028, M.steel); screw(g, sx, 0.012, -0.0215, 0.0028, M.steel); }
  ext(g, [[rx1 - 0.005, 0.04], [rx1 + 0.06, 0.04], [rx1 + 0.06, 0.075], [rx1 + 0.03, 0.085], [rx1 - 0.005, 0.085]], 0.036, M.steel);
  box(g, rx1 + 0.03, rx1 + 0.05, 0.084, 0.094, 0.026, M.steel, 0, 0.001);
  const hgEnd = short ? 0.33 : 0.43;
  ext(g, [[rx1 + 0.06, 0.0], [hgEnd, 0.004], [hgEnd, 0.05], [rx1 + 0.06, 0.05]], 0.05, wood, 0, 0.005);
  for (let x = rx1 + 0.08; x < hgEnd - 0.03; x += 0.022) box(g, x, x + 0.01, 0.004, 0.012, 0.051, wood, 0, 0.003);
  cyl(g, rx1 + 0.06, hgEnd - 0.01, 0.064, 0.015, wood, 0, 16);
  cyl(g, hgEnd - 0.01, hgEnd + 0.03, 0.064, 0.012, M.steel, 0, 14);
  const bEnd = short ? 0.42 : 0.56;
  cyl(g, rx1 + 0.05, bEnd, 0.032, 0.009, M.blued, 0, 16);
  box(g, hgEnd, hgEnd + 0.03, 0.025, 0.075, 0.03, M.steel, 0, 0.003);
  ext(g, [[bEnd - 0.06, 0.02], [bEnd - 0.03, 0.02], [bEnd - 0.03, 0.06], [bEnd - 0.04, 0.095], [bEnd - 0.05, 0.095], [bEnd - 0.06, 0.06]], 0.026, M.steel);
  sightPost(g, M, bEnd - 0.045, 0.095, 0.012);
  cyl(g, bEnd, bEnd + (short ? 0.07 : 0.045), 0.032, short ? 0.017 : 0.012, M.steel, 0, 18);
  if (!short) ext(g, [[bEnd + 0.01, 0.02], [bEnd + 0.045, 0.026], [bEnd + 0.045, 0.044], [bEnd + 0.01, 0.044]], 0.026, M.steel);
  else cyl(g, bEnd + 0.04, bEnd + 0.07, 0.032, 0.018, M.steel, 0, 18);
  g.userData.mag = mag(g, M, 0.06, 0.002, 0.04, 0.21, 0.09, o.magMat ?? M.steel, true);
  triggerAssembly(g, M, 0.0, 0.07, 0.0, 0.03, 0.007, true);
  grip(g, M.bakelite, [-0.01, 0.0], 0.11, 0.36, 0.032, 0.034);
  if (o.fold) {
    ext(g, [[-0.07, 0.045], [-0.07, 0.055], [-0.30, 0.03], [-0.30, -0.06], [-0.29, -0.06], [-0.29, 0.02], [-0.07, 0.045]], 0.008, M.steel, 0.012);
    ext(g, [[-0.07, 0.045], [-0.07, 0.055], [-0.30, 0.03], [-0.30, -0.06], [-0.29, -0.06], [-0.29, 0.02], [-0.07, 0.045]], 0.008, M.steel, -0.012);
    box(g, -0.305, -0.285, -0.065, 0.035, 0.034, M.steel, 0, 0.003);
  } else {
    ext(g, [[-0.07, 0.054], [-0.41, 0.03], ['q', -0.415, -0.03, -0.41, -0.1], [-0.36, -0.105], ['q', -0.2, -0.05, -0.07, 0.0]], 0.036, wood, 0, 0.004);
    ext(g, [[-0.408, 0.032], [-0.42, 0.032], [-0.42, -0.104], [-0.408, -0.104]], 0.038, M.steel, 0, 0.002);
  }
  const bolt = box(g, 0.12, 0.14, 0.05, 0.058, 0.01, M.steel, 0.027, 0.002); g.userData.bolt = bolt;
  g.userData.muzzle = bEnd + 0.05; g.userData.sightY = 0.097;
  return g;
};
B.m4 = (M, o = {}) => {
  const g = new THREE.Group(), body = o.mat ?? M.park, furn = o.furn ?? M.poly;
  ext(g, [[-0.07, 0.0], [0.13, 0.0], [0.13, -0.002], [0.125, -0.07], [0.075, -0.07], [0.07, -0.01], [0.02, -0.01], [-0.03, -0.012], [-0.07, 0.0]], 0.042, body);
  ext(g, [[-0.07, 0.0], [0.15, 0.0], [0.15, 0.062], [0.14, 0.072], [-0.065, 0.072], [-0.07, 0.06]], 0.038, body);
  box(g, 0.0, 0.07, 0.025, 0.052, 0.002, M.blued, 0.0195, 0.001);
  box(g, 0.0, 0.07, 0.025, 0.026, 0.004, M.steel, 0.02, 0.0005);
  cyl(g, -0.03, -0.012, 0.055, 0.0075, body, 0.022, 12);
  rail(g, -0.068, 0.15, 0.072, 0.022, body);
  if (!o.noSights) buis(g, M, -0.04, 0.0815);
  ext(g, [[-0.085, 0.064], [-0.07, 0.064], [-0.07, 0.072], [-0.085, 0.07]], 0.02, body, 0, 0.001);
  const hg1 = o.short ? 0.30 : 0.36;
  box(g, 0.15, hg1, -0.002, 0.07, 0.058, body, 0, 0.006);
  for (const [side, yy, zz] of [['top', 0.07, 0], ['bottom', -0.002, 0], ['left', 0.034, -0.029], ['right', 0.034, 0.029]]) rail(g, 0.155, hg1 - 0.005, yy, side === 'top' || side === 'bottom' ? 0.022 : 0.02, body, side, zz);
  for (let x = 0.17; x < hg1 - 0.02; x += 0.03) for (const zz of [-0.0292, 0.0292]) { const h = new THREE.Mesh(new THREE.CircleGeometry(0.004, 10), M.hole); h.position.set(x, 0.015, zz); h.rotation.y = zz > 0 ? 0 : Math.PI; g.add(h); }
  const bEnd = o.short ? 0.42 : 0.5;
  cyl(g, hg1, bEnd, 0.042, 0.0085, M.blued, 0, 16);
  if (!o.noSights) { ext(g, [[hg1 + 0.02, 0.03], [hg1 + 0.045, 0.03], [hg1 + 0.04, 0.11], [hg1 + 0.03, 0.11]], 0.012, body, 0, 0.001); box(g, hg1 + 0.018, hg1 + 0.047, 0.03, 0.055, 0.03, body, 0, 0.004); sightPost(g, M, hg1 + 0.035, 0.11, 0.012); }
  const fh = cyl(g, bEnd, bEnd + 0.055, 0.042, 0.011, M.blued, 0, 6);
  for (let k = 0; k < 4; k++) box(g, bEnd + 0.02, bEnd + 0.055, 0.042 + Math.cos(k * 1.57) * 0.009, 0.042 + Math.cos(k * 1.57) * 0.009 + 0.001, 0.003, M.hole, Math.sin(k * 1.57) * 0.009, 0.0005);
  g.userData.mag = mag(g, M, 0.078, -0.002, 0.038, 0.18, 0.025, M.park, true);
  triggerAssembly(g, M, -0.005, 0.07, -0.01, 0.026, 0.007);
  grip(g, furn, [-0.025, -0.01], 0.1, 0.38, 0.03, 0.032);
  cyl(g, -0.25, -0.07, 0.047, 0.016, M.steel, 0, 18);
  if (o.stock !== false) {
    ext(g, [[-0.16, 0.07], [-0.30, 0.064], [-0.31, 0.06], [-0.31, -0.07], [-0.295, -0.075], ['q', -0.24, -0.02, -0.17, 0.02], [-0.16, 0.03]], 0.04, furn, 0, 0.004, [[-0.255, 0.015, 0.025, 0.012]]);
    box(g, -0.318, -0.3, -0.075, 0.066, 0.042, M.rubber, 0, 0.004);
  }
  const ch = box(g, -0.09, -0.06, 0.064, 0.074, 0.03, body, 0, 0.002); g.userData.bolt = ch;
  if (o.optic) { box(g, 0.02, 0.07, 0.08, 0.09, 0.028, M.poly); cyl(g, 0.025, 0.065, 0.11, 0.016, M.poly, 0, 20); const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0015, 6, 6), M.sight); dot.position.set(0.04, 0.11, 0); g.add(dot); }
  g.userData.muzzle = bEnd + 0.055; g.userData.sightY = o.optic ? 0.11 : 0.1;
  return g;
};
B.pistol = (M, o = {}) => {
  const g = new THREE.Group(), L = o.len ?? 0.185, sh = o.slideH ?? 0.033, slideMat = o.slide ?? M.blued, frameMat = o.frame ?? M.poly;
  const slide = new THREE.Group(); g.add(slide);
  const sx0 = -0.03, sx1 = sx0 + L, sy0 = 0.018;
  ext(slide, [[sx0, sy0], [sx1, sy0], [sx1, sy0 + sh - 0.006], [sx1 - 0.008, sy0 + sh], [sx0 + 0.004, sy0 + sh], [sx0, sy0 + sh - 0.006]], o.slideW ?? 0.026, slideMat, 0, 0.002);
  for (let k = 0; k < 7; k++) { const x = sx0 + 0.006 + k * 0.0045; box(slide, x, x + 0.0018, sy0 + 0.004, sy0 + sh - 0.004, (o.slideW ?? 0.026) + 0.001, M.hole, 0, 0.0004); }
  if (o.serrFront) for (let k = 0; k < 5; k++) { const x = sx1 - 0.04 + k * 0.0045; box(slide, x, x + 0.0018, sy0 + 0.006, sy0 + sh - 0.006, (o.slideW ?? 0.026) + 0.001, M.hole, 0, 0.0004); }
  box(slide, 0.02, 0.06, sy0 + sh * 0.45, sy0 + sh - 0.003, 0.002, M.hole, (o.slideW ?? 0.026) / 2 + 0.0005, 0.0005);
  sightPost(slide, M, sx1 - 0.01, sy0 + sh, 0.006, 0.004);
  box(slide, sx0 + 0.006, sx0 + 0.016, sy0 + sh, sy0 + sh + 0.006, 0.02, M.steel, 0, 0.001);
  if (o.beretta) box(slide, 0.03, 0.12, sy0 + sh - 0.012, sy0 + sh + 0.001, 0.012, M.hole, 0, 0.001);
  cyl(g, sx1 - 0.004, sx1 + 0.0005, sy0 + sh * 0.5, 0.0055, M.hole, 0, 12);
  g.userData.slide = slide;
  ext(g, [[sx0, -0.002], [sx1 - 0.02, -0.002], [sx1 - 0.02, sy0 + 0.001], [sx0, sy0 + 0.001]], (o.slideW ?? 0.026) - 0.002, frameMat, 0, 0.002);
  if (o.railFrame !== false) rail(g, 0.06, sx1 - 0.028, -0.012, 0.018, frameMat, 'bottom');
  triggerAssembly(g, M, 0.0, 0.06, 0.0, 0.026, 0.009, !!o.roundGuard);
  const gm = grip(g, o.gripMat ?? frameMat, [-0.006, 0.002], o.gripLen ?? 0.105, o.gripAng ?? 0.3, o.gripW ?? 0.03, o.gripThick ?? 0.034);
  g.userData.mag = new THREE.Group(); g.add(g.userData.mag);
  const ang = o.gripAng ?? 0.3, gl = o.gripLen ?? 0.105;
  box(g.userData.mag, -0.006 - Math.sin(ang) * gl - 0.022, -0.006 - Math.sin(ang) * gl + 0.018, -Math.cos(ang) * gl - 0.012, -Math.cos(ang) * gl - 0.002, 0.03, frameMat, 0, 0.003);
  if (o.hammer) { const h = box(g, sx0 - 0.012, sx0 + 0.002, sy0 + 0.008, sy0 + 0.026, 0.008, M.steel, 0, 0.002); h.rotation.z = 0.3; g.userData.hammer = h; }
  if (o.gripPanels) { for (const zz of [-0.0165, 0.0165]) { const p = ext(g, [[-0.022, -0.01], [0.012, -0.01], [-0.015, -0.095], [-0.045, -0.095]], 0.004, o.gripPanels, zz, 0.001); screw(g, -0.012, -0.03, zz + Math.sign(zz) * 0.0022, 0.0025, M.steel); screw(g, -0.03, -0.075, zz + Math.sign(zz) * 0.0022, 0.0025, M.steel); } }
  if (o.selector) box(g, -0.025, -0.015, sy0 - 0.004, sy0 + 0.004, 0.004, M.steel, 0.015, 0.001);
  g.userData.muzzle = sx1 + 0.005; g.userData.sightY = sy0 + sh + 0.006;
  return g;
};
B.deagle = (M) => {
  const g = B.pistol(M, { len: 0.265, slideH: 0.04, slideW: 0.03, slide: M.chrome, frame: M.chrome, gripMat: M.rubber, gripLen: 0.11, railFrame: false, hammer: true });
  ext(g.userData.slide, [[0.02, 0.058], [0.235, 0.058], [0.235, 0.064], [0.02, 0.064]], 0.018, M.chrome, 0, 0.001);
  for (let k = 0; k < 2; k++) box(g.userData.slide, 0.15 + k * 0.03, 0.17 + k * 0.03, 0.03, 0.048, 0.031, M.hole, 0, 0.002);
  return g;
};
B.m1911 = (M) => B.pistol(M, { len: 0.215, slideH: 0.032, slideW: 0.025, slide: M.blued, frame: M.blued, gripMat: M.blued, railFrame: false, roundGuard: true, hammer: true, gripAng: 0.24, gripPanels: M.woodRed });
B.revolver = (M) => {
  const g = new THREE.Group();
  ext(g, [[-0.03, 0.0], [0.03, 0.0], [0.055, 0.02], [0.055, 0.058], [0.0, 0.062], [-0.025, 0.055], [-0.035, 0.03]], 0.026, M.blued, 0, 0.002);
  const cylG = new THREE.Group(); cylG.position.set(0.03, 0.036, 0); g.add(cylG);
  cyl(cylG, -0.025, 0.025, 0, 0.022, M.blued, 0, 24);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const f = box(cylG, -0.02, 0.02, -0.002, 0.002, 0.006, M.hole, 0, 0.001); f.position.set(0, Math.cos(a) * 0.021, Math.sin(a) * 0.021); f.rotation.x = a; }
  g.userData.cyl = cylG;
  cyl(g, 0.055, 0.21, 0.048, 0.0095, M.blued, 0, 18);
  ext(g, [[0.055, 0.03], [0.21, 0.032], [0.21, 0.05], [0.055, 0.05]], 0.018, M.blued, 0, 0.002);
  ext(g, [[0.06, 0.056], [0.2, 0.056], [0.2, 0.062], [0.06, 0.062]], 0.008, M.blued, 0, 0.001);
  for (let x = 0.08; x < 0.19; x += 0.025) box(g, x, x + 0.015, 0.058, 0.0625, 0.0085, M.hole, 0, 0.001);
  sightPost(g, M, 0.2, 0.062, 0.006);
  const h = box(g, -0.045, -0.025, 0.045, 0.068, 0.008, M.steel, 0, 0.002); h.rotation.z = 0.4; g.userData.hammer = h;
  triggerAssembly(g, M, -0.01, 0.045, 0.002, 0.026, 0.008, true);
  ext(g, [[-0.035, 0.03], [-0.005, 0.005], ['q', -0.01, -0.06, -0.035, -0.105], [-0.07, -0.1], ['q', -0.065, -0.04, -0.06, 0.01], [-0.045, 0.03]], 0.036, M.rubber, 0, 0.005);
  for (let y = -0.02; y > -0.09; y -= 0.014) box(g, -0.068 + (-y) * 0.18, -0.06 + (-y) * 0.18, y, y + 0.004, 0.037, M.rubber, 0, 0.0015);
  g.userData.mag = new THREE.Group(); g.add(g.userData.mag);
  g.userData.muzzle = 0.215; g.userData.sightY = 0.068;
  return g;
};
B.ump = (M, o = {}) => {
  const g = new THREE.Group(), body = o.body ?? M.poly;
  const L = o.len ?? 0.28;
  ext(g, [[-0.05, -0.005], [L, -0.005], [L, 0.06], [L - 0.01, 0.072], [-0.045, 0.072], [-0.05, 0.06]], 0.046, body, 0, 0.004);
  for (let x = L - 0.09; x < L - 0.01; x += 0.016) for (const zz of [-0.0235, 0.0235]) box(g, x, x + 0.008, 0.01, 0.045, 0.002, M.hole, zz, 0.0005);
  rail(g, -0.04, L - 0.03, 0.072, 0.022, M.steel);
  rail(g, L - 0.12, L - 0.005, -0.005, 0.022, M.steel, 'bottom');
  if (o.vgrip !== false) { cyl(g, L - 0.075, L - 0.06, -0.03, 0.012, body, 0, 14).rotation.z = 0; const vg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.075, 14), body); vg.position.set(L - 0.065, -0.055, 0); g.add(vg); }
  cyl(g, L, L + 0.03, 0.04, 0.012, M.blued, 0, 16);
  buis(g, M, 0.0, 0.0815); ext(g, [[L - 0.05, 0.082], [L - 0.035, 0.082], [L - 0.04, 0.105], [L - 0.045, 0.105]], 0.018, body, 0, 0.001);
  g.userData.mag = mag(g, M, 0.085, -0.004, 0.032, o.magLen ?? 0.17, o.magCurve ?? 0.03, body, false);
  ext(g, [[-0.03, -0.005], [0.08, -0.005], [0.075, -0.04], [0.065, -0.04], ['q', 0.03, -0.042, 0.02, -0.03], [0.0, -0.03], ['q', -0.03, -0.06, -0.05, -0.125], [-0.085, -0.12], ['q', -0.07, -0.06, -0.06, -0.02]], 0.032, body, 0, 0.004, [[0.035, -0.02, 0.022, 0.011]]);
  ext(g, [[0.03, -0.006], [0.036, -0.006], ['q', 0.038, -0.018, 0.03, -0.028], [0.027, -0.026], ['q', 0.032, -0.016, 0.03, -0.006]], 0.005, M.steel);
  if (o.stock !== false) ext(g, [[-0.05, 0.06], [-0.27, 0.045], [-0.28, 0.035], [-0.28, -0.08], [-0.26, -0.08], ['q', -0.17, -0.03, -0.05, -0.0]], 0.03, body, 0, 0.004, [[-0.17, 0.005, 0.055, 0.022], [-0.255, -0.03, 0.01, 0.035]]);
  const bolt = box(g, 0.13, 0.17, 0.055, 0.066, 0.008, M.steel, 0.026, 0.002); g.userData.bolt = bolt;
  g.userData.muzzle = L + 0.03; g.userData.sightY = 0.1;
  return g;
};
B.boxsmg = (M, o = {}) => {
  const g = new THREE.Group(), L = o.len ?? 0.2, H = o.h ?? 0.075, body = o.body ?? M.park;
  ext(g, [[-0.04, -0.005], [L, -0.005], [L, H - 0.005], [-0.04, H - 0.005]], o.w ?? 0.05, body, 0, 0.004);
  if (o.ribs) for (let x = -0.03; x < L - 0.02; x += 0.012) box(g, x, x + 0.006, H - 0.008, H - 0.002, (o.w ?? 0.05) - 0.012, body, 0, 0.001);
  cyl(g, L, L + (o.barrel ?? 0.04), H * 0.45, 0.009, M.blued, 0, 16);
  if (o.thread) for (let k = 0; k < 6; k++) ring(g, L + 0.012 + k * 0.004, H * 0.45, 0.0095, 0.0012, M.steel);
  if (o.shroud) { const sh = cyl(g, L - 0.02, L + 0.12, H * 0.45, 0.016, M.park, 0, 20); for (let x = L; x < L + 0.11; x += 0.014) for (let a = 0; a < 6; a++) { const h = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 8), M.hole); const ang = a / 6 * Math.PI * 2; h.position.set(x, H * 0.45 + Math.cos(ang) * 0.0162, Math.sin(ang) * 0.0162); h.lookAt(h.position.x, H * 0.45 + Math.cos(ang), Math.sin(ang)); g.add(h); } }
  triggerAssembly(g, M, 0.015, 0.075, -0.004, 0.026, 0.008);
  const gr = ext(g, [[-0.015, -0.004], [0.03, -0.004], [0.028, -0.135], [-0.02, -0.135]], 0.034, o.gripMat ?? M.poly, 0, 0.004);
  g.userData.mag = new THREE.Group(); g.add(g.userData.mag);
  if (o.magFront) { ext(g.userData.mag, [[0.09, -0.004], [0.12, -0.004], [0.13, -0.19], [0.1, -0.19]], 0.022, M.park, 0, 0.002); }
  else box(g.userData.mag, -0.016, 0.03, -0.175, -0.13, 0.03, M.park, 0, 0.003);
  if (o.stockWire) { for (const zz of [-0.018, 0.018]) cyl(g, -0.25, -0.04, 0.02, 0.004, M.steel, zz, 8); box(g, -0.26, -0.245, -0.06, 0.04, 0.045, M.steel, 0, 0.003); }
  const bolt = box(g, 0.05, 0.08, H - 0.005, H + 0.008, 0.012, M.steel, 0, 0.002); g.userData.bolt = bolt;
  sightPost(g, M, L - 0.01, H - 0.005, 0.01); box(g, -0.03, -0.015, H - 0.005, H + 0.006, 0.02, M.steel, 0, 0.001);
  g.userData.muzzle = L + (o.shroud ? 0.12 : o.barrel ?? 0.04); g.userData.sightY = H + 0.006;
  return g;
};
B.tommy = (M) => {
  const g = new THREE.Group();
  ext(g, [[-0.07, -0.005], [0.17, -0.005], [0.17, 0.06], [0.15, 0.07], [-0.06, 0.07], [-0.07, 0.05]], 0.044, M.blued);
  cyl(g, 0.17, 0.45, 0.04, 0.0105, M.blued, 0, 16);
  for (let x = 0.18; x < 0.33; x += 0.007) ring(g, x, 0.04, 0.012, 0.0022, M.blued);
  cyl(g, 0.45, 0.5, 0.04, 0.014, M.blued, 0, 16);
  sightPost(g, M, 0.49, 0.054, 0.012); box(g, -0.04, -0.01, 0.07, 0.09, 0.026, M.blued, 0, 0.002);
  const drum = new THREE.Group(); g.add(drum); g.userData.mag = drum;
  const d = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.045, 28), M.blued); d.rotation.x = Math.PI / 2; d.position.set(0.1, -0.09, 0); drum.add(d);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 14), M.steel); cap.rotation.x = Math.PI / 2; cap.position.set(0.1, -0.09, 0); drum.add(cap);
  box(drum, 0.08, 0.12, -0.03, 0.0, 0.03, M.blued, 0, 0.003);
  triggerAssembly(g, M, -0.01, 0.06, -0.004, 0.028, 0.008, true);
  grip(g, M.woodRed, [-0.02, -0.004], 0.1, 0.35, 0.03, 0.034);
  const vg = ext(g, [[0.25, -0.004], [0.28, -0.004], ['q', 0.29, -0.06, 0.28, -0.1], [0.245, -0.1], ['q', 0.24, -0.05, 0.25, -0.004]], 0.034, M.woodRed, 0, 0.005);
  ext(g, [[-0.07, 0.06], [-0.37, 0.035], ['q', -0.38, -0.03, -0.37, -0.1], [-0.33, -0.105], ['q', -0.2, -0.04, -0.07, 0.0]], 0.036, M.woodRed, 0, 0.004);
  const bolt = box(g, 0.05, 0.08, 0.07, 0.082, 0.012, M.steel, 0, 0.002); g.userData.bolt = bolt;
  g.userData.muzzle = 0.5; g.userData.sightY = 0.09;
  return g;
};
B.pump = (M, o = {}) => {
  const g = new THREE.Group(), stockMat = o.stock ?? M.wood, bL = o.barrelLen ?? 0.48;
  ext(g, [[-0.04, -0.005], [0.17, -0.005], [0.17, 0.064], [0.16, 0.072], [-0.03, 0.072], [-0.04, 0.06]], 0.04, M.blued);
  box(g, 0.02, 0.12, 0.03, 0.06, 0.002, M.hole, 0.0205, 0.0005);
  cyl(g, 0.17, 0.17 + bL, 0.052, 0.0115, M.blued, 0, 18);
  ext(g, [[0.17, 0.064], [0.17 + bL, 0.064], [0.17 + bL, 0.067], [0.17, 0.067]], 0.007, M.blued, 0, 0.0005);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 8), M.brass); bead.position.set(0.16 + bL, 0.069, 0); g.add(bead);
  cyl(g, 0.17, 0.17 + bL * 0.82, 0.024, 0.011, M.blued, 0, 16);
  const pump = new THREE.Group(); g.add(pump); g.userData.pump = pump;
  const pm = cyl(pump, 0.21, 0.37, 0.026, 0.02, o.pumpMat ?? stockMat, 0, 20);
  for (let x = 0.22; x < 0.36; x += 0.012) ring(pump, x, 0.026, 0.0205, 0.002, o.pumpMat ?? stockMat);
  triggerAssembly(g, M, 0.0, 0.07, -0.004, 0.03, 0.008);
  if (o.noStock) { ext(g, [[-0.04, 0.05], [-0.04, -0.004], ['q', -0.07, -0.06, -0.09, -0.11], [-0.125, -0.1], ['q', -0.1, -0.04, -0.07, 0.05]], 0.034, M.poly, 0, 0.004); }
  else ext(g, [[-0.04, 0.066], [-0.42, 0.035], ['q', -0.43, -0.03, -0.42, -0.105], [-0.37, -0.11], ['q', -0.18, -0.06, -0.08, -0.06], ['q', -0.04, -0.04, -0.04, -0.004]], 0.038, stockMat, 0, 0.005);
  if (!o.noStock) box(g, -0.432, -0.418, -0.108, 0.036, 0.04, M.rubber, 0, 0.004);
  g.userData.mag = new THREE.Group(); g.add(g.userData.mag);
  g.userData.muzzle = 0.17 + bL; g.userData.sightY = 0.07;
  return g;
};
B.dbarrel = (M) => {
  const g = new THREE.Group();
  ext(g, [[-0.04, -0.005], [0.07, -0.005], [0.07, 0.06], [-0.035, 0.06]], 0.045, M.blued);
  for (const zz of [-0.0115, 0.0115]) { cyl(g, 0.07, 0.4, 0.035, 0.0115, M.blued, zz, 18); const h = new THREE.Mesh(new THREE.CircleGeometry(0.0095, 16), M.hole); h.rotation.y = Math.PI / 2; h.position.set(0.4005, 0.035, zz); g.add(h); }
  ext(g, [[0.07, 0.044], [0.4, 0.044], [0.4, 0.049], [0.07, 0.049]], 0.006, M.blued, 0, 0.001);
  ext(g, [[0.075, 0.0], [0.25, 0.008], [0.25, 0.026], [0.075, 0.03]], 0.046, M.woodRed, 0, 0.004);
  triggerAssembly(g, M, -0.01, 0.06, -0.004, 0.028, 0.008, true);
  ext(g, [[-0.04, 0.055], [-0.2, 0.025], ['q', -0.22, -0.04, -0.19, -0.1], [-0.15, -0.1], ['q', -0.09, -0.04, -0.04, -0.005]], 0.036, M.woodRed, 0, 0.005);
  for (const zz of [-0.008, 0.008]) { const h = box(g, -0.045, -0.03, 0.05, 0.07, 0.005, M.steel, zz, 0.001); h.rotation.z = 0.4; }
  g.userData.mag = new THREE.Group(); g.add(g.userData.mag);
  g.userData.muzzle = 0.4; g.userData.sightY = 0.05;
  return g;
};
B.bolt = (M, o = {}) => {
  const g = new THREE.Group(), stock = o.stock ?? M.wood, L = o.barrel ?? 0.62;
  cyl(g, -0.05, 0.14, 0.045, 0.017, M.blued, 0, 20);
  const bolt = new THREE.Group(); g.add(bolt); g.userData.bolt = bolt;
  cyl(bolt, -0.07, -0.04, 0.045, 0.012, M.steel, 0, 16);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 8), M.steel); handle.rotation.x = Math.PI / 2 + (o.bentBolt ? 0.6 : 0); handle.position.set(-0.03, 0.04, 0.03); bolt.add(handle);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), M.steel); knob.position.set(-0.03, 0.04 - (o.bentBolt ? 0.018 : 0), 0.06); bolt.add(knob);
  cyl(g, 0.14, 0.14 + L, 0.045, 0.0105, M.blued, 0, 18, 0.008);
  ext(g, [[0.14, 0.0], [0.14 + L * (o.fullStock ? 0.85 : 0.55), 0.012], [0.14 + L * (o.fullStock ? 0.85 : 0.55), 0.04], [0.14, 0.045]], 0.042, stock, 0, 0.005);
  if (o.fullStock) { ext(g, [[0.16, 0.045], [0.14 + L * 0.75, 0.042], [0.14 + L * 0.75, 0.056], [0.16, 0.058]], 0.03, stock, 0, 0.003); ring(g, 0.14 + L * 0.4, 0.035, 0.024, 0.003, M.steel); ring(g, 0.14 + L * 0.78, 0.035, 0.02, 0.003, M.steel); sightPost(g, M, 0.14 + L - 0.01, 0.055, 0.012); ext(g, [[0.17, 0.06], [0.22, 0.06], [0.22, 0.066], [0.17, 0.066]], 0.02, M.steel, 0, 0.001); }
  ext(g, [[-0.06, 0.0], [0.14, 0.0], [0.14, 0.035], [-0.06, 0.035]], 0.044, stock, 0, 0.005);
  triggerAssembly(g, M, 0.0, 0.07, 0.0, 0.026, 0.008, true);
  ext(g, [[-0.06, 0.035], [-0.43, 0.025], ['q', -0.44, -0.04, -0.43, -0.12], [-0.38, -0.125], ['q', -0.2, -0.065, -0.07, -0.07], ['q', -0.02, -0.045, -0.02, 0.0], [-0.06, 0.0]], 0.042, stock, 0, 0.006);
  box(g, -0.445, -0.43, -0.124, 0.027, 0.044, M.rubber, 0, 0.004);
  if (o.scope) scope(g, M, -0.07, 0.24, 0.095, 0.017);
  if (o.bipod) for (const zz of [-0.015, 0.015]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.15, 8), M.steel); leg.position.set(0.45, -0.03, zz); leg.rotation.z = 0.9; g.add(leg); }
  g.userData.mag = new THREE.Group(); g.add(g.userData.mag);
  box(g.userData.mag, 0.03, 0.09, -0.03, 0.0, 0.03, o.scope ? M.poly : M.steel, 0, 0.003);
  g.userData.muzzle = 0.14 + L; g.userData.sightY = o.scope ? 0.095 : 0.066;
  return g;
};
B.fal = (M, o = {}) => {
  const g = new THREE.Group(), body = o.body ?? M.park, furn = o.furn ?? M.poly;
  ext(g, [[-0.08, -0.01], [0.2, -0.01], [0.2, 0.065], [0.17, 0.08], [-0.07, 0.08], [-0.08, 0.06]], 0.044, body);
  if (o.rail) rail(g, -0.07, 0.19, 0.08, 0.022, M.steel); else { ext(g, [[0.0, 0.08], [0.02, 0.1], [0.12, 0.1], [0.14, 0.08]], 0.008, M.steel, 0, 0.001); box(g, -0.07, -0.05, 0.08, 0.1, 0.024, M.steel, 0, 0.001); }
  ext(g, [[0.2, 0.0], [0.42, 0.008], [0.42, 0.065], [0.2, 0.07]], 0.052, furn, 0, 0.005);
  for (let x = 0.24; x < 0.4; x += 0.03) for (const zz of [-0.0262, 0.0262]) box(g, x, x + 0.018, 0.03, 0.04, 0.001, M.hole, zz, 0.0004);
  cyl(g, 0.42, 0.58, 0.042, 0.009, M.blued, 0, 16);
  cyl(g, 0.58, 0.64, 0.042, 0.013, M.steel, 0, 12);
  ext(g, [[0.52, 0.03], [0.545, 0.03], [0.54, 0.1], [0.525, 0.1]], 0.012, M.steel, 0, 0.001); sightPost(g, M, 0.533, 0.1, 0.01);
  g.userData.mag = mag(g, M, 0.07, -0.01, 0.046, o.magLen ?? 0.13, 0.01, body, true);
  triggerAssembly(g, M, -0.005, 0.065, -0.01, 0.028, 0.008);
  grip(g, furn, [-0.02, -0.01], 0.1, 0.32, 0.032, 0.034);
  if (o.fold) { ext(g, [[-0.08, 0.06], [-0.3, 0.055], [-0.31, -0.06], [-0.29, -0.06], [-0.29, 0.035], [-0.08, 0.04]], 0.03, furn, 0, 0.004, [[-0.19, 0.045, 0.06, 0.006]]); }
  else ext(g, [[-0.08, 0.065], [-0.42, 0.05], ['q', -0.43, -0.03, -0.42, -0.1], [-0.37, -0.105], ['q', -0.2, -0.04, -0.08, -0.005]], 0.04, furn, 0, 0.005);
  const bolt = box(g, 0.1, 0.14, 0.06, 0.07, 0.012, M.steel, -0.026, 0.002); g.userData.bolt = bolt;
  g.userData.muzzle = 0.64; g.userData.sightY = 0.1;
  return g;
};
B.sks = (M) => {
  const g = B.bolt(M, { barrel: 0.5, fullStock: true });
  return g;
};
B.launcher = (M, o = {}) => {
  const g = new THREE.Group(), col = o.mat ?? M.olive;
  cyl(g, -0.45, o.len ?? 0.5, 0.06, o.r ?? 0.042, col, 0, 24);
  for (const x of [-0.4, 0.0, 0.4]) ring(g, x, 0.06, (o.r ?? 0.042) + 0.002, 0.004, M.steel);
  grip(g, M.poly, [0.0, 0.02], 0.1, 0.25, 0.03, 0.034);
  grip(g, M.poly, [0.18, 0.02], 0.08, 0.1, 0.03, 0.03);
  triggerAssembly(g, M, 0.005, 0.06, 0.02, 0.028, 0.008);
  box(g, -0.05, 0.05, 0.1, 0.13, 0.03, M.steel, 0, 0.003);
  if (o.warhead) { g.userData.mag = new THREE.Group(); g.add(g.userData.mag); const w = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 18), M.olive); w.rotation.z = -Math.PI / 2; w.position.set((o.len ?? 0.5) + 0.16, 0.06, 0); g.userData.mag.add(w); cyl(g.userData.mag, (o.len ?? 0.5), (o.len ?? 0.5) + 0.06, 0.06, 0.04, M.olive, 0, 18); }
  else { g.userData.mag = new THREE.Group(); g.add(g.userData.mag); }
  g.userData.muzzle = (o.len ?? 0.5) + (o.warhead ? 0.26 : 0); g.userData.sightY = 0.13;
  return g;
};

const RECIPES = {
  akm: (M) => B.akm(M), aks74u: (M) => B.akm(M, { short: true, fold: true, magMat: M.bakelite }), sks: (M) => B.sks(M),
  m4a1: (M) => B.m4(M), scarh: (M) => B.fal(M, { body: M.tan, furn: M.tan, rail: true, fold: true, magLen: 0.11 }), fal: (M) => B.fal(M),
  g17: (M) => B.pistol(M, {}), g18: (M) => B.pistol(M, { selector: true, serrFront: true }), beretta: (M) => B.pistol(M, { len: 0.2, slideW: 0.024, slide: M.blued, frame: M.blued, gripMat: M.poly, beretta: true, hammer: true, railFrame: false, roundGuard: true }),
  fnp45: (M) => B.pistol(M, { len: 0.2, slide: M.park, frame: M.poly, serrFront: true, hammer: true }), hawkeye: (M) => B.pistol(M, { len: 0.17, slide: M.steel, frame: M.olive }),
  m1911: (M) => B.m1911(M), deagle: (M) => B.deagle(M), magnum: (M) => B.revolver(M),
  ump45: (M) => B.ump(M), mp7: (M) => B.ump(M, { len: 0.2, magLen: 0.13, magCurve: 0.0, vgrip: true }), uzi: (M) => B.boxsmg(M, { len: 0.24, h: 0.065, ribs: true, stockWire: true, barrel: 0.03 }),
  mac10: (M) => B.boxsmg(M, { len: 0.16, h: 0.085, thread: true, barrel: 0.045, stockWire: true }), tec9: (M) => B.boxsmg(M, { len: 0.12, h: 0.06, w: 0.04, shroud: true, magFront: true, body: M.poly }),
  tommy: (M) => B.tommy(M),
  r870: (M) => B.pump(M, { stock: M.wood }), ithaca: (M) => B.pump(M, { stock: M.woodRed, barrelLen: 0.45 }), supershorty: (M) => B.pump(M, { noStock: true, barrelLen: 0.24, pumpMat: M.poly }),
  doublebarrel: (M) => B.dbarrel(M),
  mosin: (M) => B.bolt(M, { barrel: 0.68, fullStock: true, stock: M.woodRed, bentBolt: false }), scout: (M) => B.bolt(M, { barrel: 0.5, stock: M.poly, scope: true, bentBolt: true, bipod: true }),
  rpg: (M) => B.launcher(M, { warhead: true, len: 0.45, r: 0.04 }), m320: (M) => B.launcher(M, { len: 0.2, r: 0.03, mat: M.poly }), bfg: (M) => B.launcher(M, { len: 0.4, r: 0.06, mat: M.tan }),
};

const cache = {};
export const hasDetailed = (id) => !!RECIPES[id];
export function detailedGun(id) {
  if (!RECIPES[id]) return null;
  if (!cache[id]) {
    const M = mats();
    seed = 7;
    const model = RECIPES[id](M);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const holder = new THREE.Group();
    model.rotation.y = Math.PI / 2;
    holder.add(model);
    holder.userData = { tipZ: -(model.userData.muzzle ?? 0.5), sightY: model.userData.sightY ?? 0.07, parts: model.userData };
    cache[id] = holder;
  }
  const src = cache[id], c = src.clone(true);
  const inner = c.children[0];
  const map = new Map(); src.children[0].traverse(o => map.set(o, null));
  const srcList = [], dstList = [];
  src.children[0].traverse(o => srcList.push(o)); inner.traverse(o => dstList.push(o));
  const lookup = (o) => o ? dstList[srcList.indexOf(o)] : null;
  const p = src.userData.parts;
  c.userData = { tipZ: src.userData.tipZ, sightY: src.userData.sightY, mag: lookup(p.mag), bolt: lookup(p.bolt), slide: lookup(p.slide), pump: lookup(p.pump), hammer: lookup(p.hammer), cyl: lookup(p.cyl) };
  for (const k of ['mag', 'bolt', 'slide', 'pump', 'hammer', 'cyl']) if (c.userData[k]) { const u = c.userData[k].userData; u.rest = c.userData[k].position.clone(); u.back = new THREE.Vector3(-1, 0, 0); u.down = new THREE.Vector3(0, -1, 0); }
  return c;
}
export const ejectsShell = (id) => !['magnum', 'doublebarrel', 'rpg', 'm320', 'bfg'].includes(id);
