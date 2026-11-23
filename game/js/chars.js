import * as THREE from 'three';
import { RoundedBoxGeometry } from './pp/RoundedBoxGeometry.js';
import { gunModel } from './assets.js';

// blocky avatar rig: 1 stud = U metres; legs 2, torso 2, head 1.2
const U = 0.36;
export const CHAR_SCALE = 1;
export const HEAD_Y = 4.6 * U;
const T = 256;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const hex = (c) => '#' + new THREE.Color(c).getHexString();
function shade(c, f) { const k = new THREE.Color(c); k.multiplyScalar(f); return hex(k); }
const SKINS = [0xf1c9a5, 0xe0ac7e, 0xc68a5a, 0x9b6740, 0x6e4628, 0x4a2e1c];

export function randomOutfit() {
  const top = pick(['hoodie', 'hoodie', 'jacket', 'tee', 'vest', 'puffer', 'tracksuit', 'flannel']);
  const head = pick(['face', 'face', 'balaclava', 'balaclava', 'hood', 'beanie', 'cap', 'helmet', 'ski']);
  return {
    skin: pick(SKINS), top, head,
    shirt: pick([0x2a2c30, 0x1c1d20, 0x3a3f36, 0x4a3a30, 0x2e3644, 0x5a2a28, 0x2c3a2c, 0x55585c, 0x6a5a48, 0x1e2a36, 0x7a7a72, 0x3d2e4a, 0x8a8a84]),
    accent: pick([0x111111, 0xd8d8d0, 0x8a1c1c, 0x1c3a6a, 0xc0a040, 0x2a2a2a]),
    pants: pick([0x22252a, 0x1a1b1e, 0x2f3d55, 0x3a3a34, 0x4a4036, 0x2a2a2a, 0x445060, 0x384a66]),
    shoes: pick([0x111111, 0xdddddd, 0x3a2a1e, 0x222222]),
    gloves: Math.random() < 0.45 ? pick([0x111111, 0x2a2a2a, 0x3a2a1e]) : null,
    mask: pick([0x101113, 0x1c1e22, 0x2a2a2a, 0x3a3f36, 0x2a2420]),
    hair: pick([0x1a1410, 0x2a1c12, 0x4a3420, 0x0c0c0c, 0x6a5030, 0xb08850]),
    hairStyle: pick(['short', 'short', 'buzz', 'swept', 'curly', 'long']),
    face: (Math.random() * 6) | 0,
    vest: Math.random() < 0.3 ? pick([0x2a2e28, 0x1a1a1c, 0x3a3a34, 0x4a4a40]) : null,
    bag: Math.random() < 0.25,
  };
}

// ---------- fabric painting ----------
function canvas(w = T, h = T) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function noise(x, w, h, amt, weave = 1) {
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (Math.random() - 0.5) * amt; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  x.putImageData(img, 0, 0);
  x.globalAlpha = 0.05 * weave; x.fillStyle = '#000';
  for (let i = 0; i < h; i += 3) x.fillRect(0, i, w, 1);
  for (let i = 0; i < w; i += 3) x.fillRect(i, 0, 1, h);
  x.globalAlpha = 1;
}
function folds(x, w, h, n) {
  x.strokeStyle = '#000'; x.lineWidth = 3; x.globalAlpha = 0.16;
  for (let i = 0; i < n; i++) { const y = rnd(0, h), x0 = rnd(0, w * 0.4); x.beginPath(); x.moveTo(x0, y); x.quadraticCurveTo(x0 + rnd(20, 60), y + rnd(-14, 14), x0 + rnd(60, 160), y + rnd(-10, 10)); x.stroke(); }
  x.globalAlpha = 1;
}
function seam(x, x0, y0, x1, y1, col) { x.strokeStyle = col; x.lineWidth = 2; x.setLineDash([5, 4]); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.setLineDash([]); }
function shirtBase(o, x, w, h, front) {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, shade(o.shirt, 1.08)); g.addColorStop(1, shade(o.shirt, 0.88));
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  if (o.top === 'flannel') {
    x.globalAlpha = 0.35; x.fillStyle = hex(o.accent);
    for (let i = 0; i < w; i += 40) x.fillRect(i, 0, 14, h);
    for (let i = 0; i < h; i += 40) x.fillRect(0, i, w, 14);
    x.globalAlpha = 0.25; x.fillStyle = '#000'; for (let i = 20; i < w; i += 40) x.fillRect(i, 0, 3, h); for (let i = 20; i < h; i += 40) x.fillRect(0, i, w, 3);
    x.globalAlpha = 1;
  }
  if (o.top === 'puffer') for (let i = 18; i < h; i += 34) { const gg = x.createLinearGradient(0, i - 10, 0, i + 6); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = gg; x.fillRect(0, i - 10, w, 16); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, i + 6, w, 6); }
  folds(x, w, h, front ? 6 : 3);
}
function paintTorsoFace(o, side) {
  const [c, x] = canvas(); shirtBase(o, x, T, T, side === 'front');
  const dark = shade(o.shirt, 0.6), light = shade(o.shirt, 1.3);
  if (side === 'front') {
    if (o.top === 'hoodie') {
      x.fillStyle = shade(o.shirt, 0.8); x.beginPath(); x.roundRect(52, 150, 152, 70, 10); x.fill();
      x.strokeStyle = dark; x.lineWidth = 3; x.stroke(); seam(x, 56, 154, 200, 154, light);
      x.fillStyle = shade(o.shirt, 0.65); x.beginPath(); x.ellipse(128, 0, 56, 26, 0, 0, Math.PI); x.fill();
      x.strokeStyle = '#ddd'; x.lineWidth = 4; for (const sx of [104, 152]) { x.beginPath(); x.moveTo(sx, 20); x.quadraticCurveTo(sx + 3, 60, sx - 2, 92); x.stroke(); x.fillStyle = '#bbb'; x.fillRect(sx - 5, 90, 8, 10); }
    }
    if (o.top === 'jacket' || o.top === 'puffer' || o.top === 'tracksuit') {
      x.fillStyle = shade(o.shirt, 0.75); x.beginPath(); x.moveTo(60, 0); x.lineTo(126, 50); x.lineTo(126, 0); x.fill(); x.beginPath(); x.moveTo(196, 0); x.lineTo(130, 50); x.lineTo(130, 0); x.fill();
      if (o.top === 'tracksuit') { x.fillStyle = hex(o.accent); x.fillRect(110, 0, 8, T); x.fillRect(138, 0, 8, T); }
      x.fillStyle = '#18181a'; x.fillRect(125, 0, 6, T); x.fillStyle = '#999'; x.fillRect(124, 44, 8, 16);
      x.fillStyle = dark; x.fillRect(22, 150, 64, 5); x.fillRect(170, 150, 64, 5);
    }
    if (o.top === 'tee') {
      x.fillStyle = hex(o.skin); x.beginPath(); x.ellipse(128, 0, 40, 22, 0, 0, Math.PI); x.fill();
      x.strokeStyle = dark; x.lineWidth = 4; x.beginPath(); x.ellipse(128, 0, 42, 24, 0, 0, Math.PI); x.stroke();
      x.fillStyle = hex(o.accent === o.shirt ? 0xd8d8d0 : o.accent); x.font = 'bold 44px Arial'; x.textAlign = 'center'; x.globalAlpha = 0.85; x.fillText(pick(['NO.9', 'WEST', '07', 'NOVA', 'CITY']), 128, 124); x.globalAlpha = 1;
    }
    if (o.top === 'flannel') { x.fillStyle = hex(o.skin); x.beginPath(); x.moveTo(100, 0); x.lineTo(128, 40); x.lineTo(156, 0); x.fill(); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(126, 40, 4, T); for (let i = 60; i < T; i += 44) { x.fillStyle = '#eee'; x.beginPath(); x.arc(136, i, 4, 0, 7); x.fill(); } }
  } else if (side === 'back') {
    if (o.top === 'hoodie') { x.fillStyle = shade(o.shirt, 0.75); x.beginPath(); x.ellipse(128, 0, 90, 56, 0, 0, Math.PI); x.fill(); x.strokeStyle = dark; x.lineWidth = 3; x.stroke(); }
    seam(x, 0, 40, T, 40, dark);
  }
  x.fillStyle = hex(o.pants); x.fillRect(0, T - 22, T, 22); x.fillStyle = '#151515'; x.fillRect(0, T - 18, T, 9);
  if (side === 'front') { x.fillStyle = '#777'; x.fillRect(114, T - 20, 28, 13); }
  noise(x, T, T, 20);
  return tex(c);
}
function paintArmFace(o, side) {
  const [c, x] = canvas(128, 256);
  const sleeveEnd = o.top === 'tee' ? 70 : o.top === 'vest' ? 0 : 200;
  x.fillStyle = hex(o.skin); x.fillRect(0, 0, 128, 256);
  if (sleeveEnd) { x.save(); x.beginPath(); x.rect(0, 0, 128, sleeveEnd); x.clip(); shirtBase(o, x, 128, sleeveEnd); x.restore(); x.fillStyle = shade(o.shirt, 0.65); x.fillRect(0, sleeveEnd - 12, 128, 12); }
  if (o.top === 'tracksuit' && side === 'out') { x.fillStyle = hex(o.accent); x.fillRect(56, 0, 14, sleeveEnd); }
  if (o.top === 'puffer') for (let i = 20; i < sleeveEnd; i += 34) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, i, 128, 6); }
  x.fillStyle = hex(o.gloves ?? o.skin); x.fillRect(0, 214, 128, 42);
  if (o.gloves) { x.fillStyle = shade(o.gloves, 1.6); x.fillRect(0, 214, 128, 5); }
  noise(x, 128, 256, 16);
  return tex(c);
}
function paintLegFace(o, side) {
  const [c, x] = canvas(128, 256);
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, shade(o.pants, 1.05)); g.addColorStop(1, shade(o.pants, 0.85));
  x.fillStyle = g; x.fillRect(0, 0, 128, 256);
  folds(x, 128, 256, 4);
  if (side === 'out') seam(x, 64, 0, 64, 210, shade(o.pants, 1.5));
  if (side === 'front') { x.strokeStyle = shade(o.pants, 0.6); x.lineWidth = 3; x.beginPath(); x.moveTo(10, 0); x.quadraticCurveTo(40, 30, 30, 60); x.stroke(); x.fillStyle = shade(o.pants, 1.3); x.globalAlpha = 0.25; x.fillRect(30, 90, 60, 50); x.globalAlpha = 1; }
  if (side === 'back') { x.strokeStyle = shade(o.pants, 0.6); x.lineWidth = 3; x.strokeRect(30, 20, 60, 56); }
  x.fillStyle = hex(o.shoes); x.fillRect(0, 214, 128, 42);
  x.fillStyle = shade(o.shoes, o.shoes === 0xdddddd ? 0.75 : 1.8); x.fillRect(0, 246, 128, 10);
  if (side === 'front') { x.fillStyle = shade(o.shoes, 0.6); for (let i = 0; i < 3; i++) x.fillRect(40, 220 + i * 8, 48, 3); }
  noise(x, 128, 256, 18);
  return tex(c);
}
function plainTex(col, amt = 14) { const [c, x] = canvas(64, 64); x.fillStyle = hex(col); x.fillRect(0, 0, 64, 64); noise(x, 64, 64, amt); return tex(c); }

function paintFace(o) {
  const [c, x] = canvas();
  const mask = o.head === 'balaclava' || o.head === 'ski';
  x.fillStyle = hex(mask ? o.mask : o.skin); x.fillRect(0, 0, T, T);
  if (mask) {
    x.fillStyle = hex(o.skin); x.beginPath(); x.roundRect(40, 92, 176, 52, 22); x.fill();
    if (o.head === 'ski') { x.beginPath(); x.roundRect(92, 172, 72, 34, 14); x.fill(); x.fillStyle = '#5a2420'; x.fillRect(104, 186, 48, 6); }
  } else { x.fillStyle = shade(o.skin, 0.88); x.beginPath(); x.ellipse(128, 150, 10, 16, 0, 0, 7); x.fill(); }
  const f = o.face, ey = mask ? 118 : 112;
  for (const sx of [86, 170]) {
    x.fillStyle = '#f2efe8'; x.beginPath(); x.ellipse(sx, ey, 15, f === 3 ? 7 : 11, 0, 0, 7); x.fill();
    x.fillStyle = '#1a120c'; x.beginPath(); x.arc(sx + (f === 4 ? 4 : 0), ey + 1, 7, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(sx + 3, ey - 3, 2.2, 0, 7); x.fill();
  }
  if (!mask) {
    x.strokeStyle = hex(o.hair); x.lineWidth = 7; x.lineCap = 'round';
    const tilt = f === 2 ? 8 : f === 5 ? -4 : 0;
    x.beginPath(); x.moveTo(68, 88 + tilt); x.lineTo(104, 86 - tilt); x.stroke();
    x.beginPath(); x.moveTo(152, 86 - tilt); x.lineTo(188, 88 + tilt); x.stroke();
    x.strokeStyle = '#4a2220'; x.lineWidth = 5; x.beginPath();
    if (f === 0 || f === 4) { x.moveTo(100, 192); x.quadraticCurveTo(128, 210, 156, 192); }
    else if (f === 1) { x.moveTo(104, 198); x.lineTo(152, 198); }
    else if (f === 2) { x.moveTo(100, 204); x.quadraticCurveTo(128, 190, 156, 204); }
    else if (f === 3) { x.moveTo(104, 196); x.quadraticCurveTo(136, 206, 158, 188); }
    else { x.moveTo(108, 196); x.quadraticCurveTo(128, 204, 148, 196); }
    x.stroke();
    if (f === 5) { x.fillStyle = hex(o.hair); x.globalAlpha = 0.45; x.beginPath(); x.roundRect(78, 176, 100, 66, 24); x.fill(); x.globalAlpha = 1; }
  }
  noise(x, T, T, mask ? 22 : 8, mask ? 2 : 0.3);
  return tex(c);
}

// ---------- geometry / materials ----------
const GEO = {};
function geo(k, w, h, d, r) { return GEO[k] || (GEO[k] = new RoundedBoxGeometry(w, h, d, 3, r)); }
const M = (map, rough = 0.88) => new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: 0, envMapIntensity: 0.35 });
// box face order: +x, -x, +y, -y, +z, -z ; avatar front = +z, its right side = -x
function outfitMaterials(o) {
  const masked = o.head === 'balaclava' || o.head === 'ski';
  const ts = M(paintTorsoFace(o, 'side'));
  const torso = [ts, ts, M(plainTex(o.shirt)), M(plainTex(o.pants)), M(paintTorsoFace(o, 'front')), M(paintTorsoFace(o, 'back'))];
  const ao = M(paintArmFace(o, 'out')), ai = M(paintArmFace(o, 'in'));
  const armTop = M(plainTex(o.top === 'vest' ? o.skin : o.shirt)), hand = M(plainTex(o.gloves ?? o.skin));
  const armL = [ao, ai, armTop, hand, ai, ai], armR = [ai, ao, armTop, hand, ai, ai];
  const lo = M(paintLegFace(o, 'out')), lf = M(paintLegFace(o, 'front')), lb = M(paintLegFace(o, 'back')), li = M(paintLegFace(o, 'in'));
  const ltop = M(plainTex(o.pants)), sole = M(plainTex(0x151515));
  const legL = [lo, li, ltop, sole, lf, lb], legR = [li, lo, ltop, sole, lf, lb];
  const skin = M(plainTex(masked ? o.mask : o.skin, masked ? 22 : 8), masked ? 0.95 : 0.6);
  const head = [skin, skin, skin, skin, M(paintFace(o), masked ? 0.95 : 0.6), skin];
  return { torso, armL, armR, legL, legR, head };
}
const pool = [];
export function outfitPool(n = 16) { while (pool.length < n) { const o = randomOutfit(); pool.push({ o, mats: outfitMaterials(o) }); } return pool; }

function part(parent, name, pivot, g, mats, off) {
  const p = new THREE.Group(); p.name = name; p.position.set(...pivot); parent.add(p);
  const m = new THREE.Mesh(g, mats); m.position.set(...off); m.castShadow = true; m.receiveShadow = true; p.add(m);
  return p;
}
function accessories(o, head, torso) {
  const std = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r, envMapIntensity: 0.4 });
  const hw = 1.2 * U, hy = 0.6 * U;
  const add = (g, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(g, mat); m.position.set(x, hy + y, z); m.rotation.x = rx; m.castShadow = true; head.add(m); return m; };
  if (o.head === 'face') {
    const hm = std(o.hair, 0.95);
    if (o.hairStyle === 'buzz') add(geo('buzz', hw * 1.03, hw * 0.24, hw * 1.03, 0.07), hm, 0, hw * 0.42, -0.004);
    else if (o.hairStyle === 'curly') { add(geo('curlbase', hw * 1.04, hw * 0.3, hw * 1.04, 0.08), hm, 0, hw * 0.4, -0.006); for (let i = 0; i < 16; i++) add(new THREE.SphereGeometry(hw * rnd(0.14, 0.2), 8, 6), hm, rnd(-0.17, 0.17), hw * rnd(0.52, 0.62), rnd(-0.18, 0.12)); }
    else {
      add(geo('hairtop', hw * 1.06, hw * 0.3, hw * 1.08, 0.07), hm, 0, hw * 0.43, -0.012);
      add(geo(o.hairStyle === 'long' ? 'hairlong' : 'hairback', hw * 1.06, hw * (o.hairStyle === 'long' ? 1.0 : 0.6), hw * 0.22, 0.05), hm, 0, hw * (o.hairStyle === 'long' ? -0.05 : 0.2), -hw * 0.47);
      if (o.hairStyle === 'swept') add(geo('fringe', hw * 0.8, hw * 0.14, hw * 0.3, 0.05), hm, -hw * 0.1, hw * 0.52, hw * 0.4, -0.35);
      for (const sx of [-1, 1]) add(geo('hside', hw * 0.08, hw * 0.36, hw * 0.6, 0.03), hm, sx * hw * 0.53, hw * 0.25, -hw * 0.14);
    }
  }
  if (o.head === 'beanie') { add(new THREE.SphereGeometry(hw * 0.66, 20, 12, 0, 6.29, 0, 1.62), std(o.mask, 0.95), 0, hw * 0.12, 0); add(new THREE.CylinderGeometry(hw * 0.67, hw * 0.67, hw * 0.2, 20), std(shade(o.mask, 0.85), 1), 0, hw * 0.18, 0); }
  if (o.head === 'cap') { const cc = o.accent === 0xd8d8d0 ? 0x1c1c1c : o.accent; add(new THREE.SphereGeometry(hw * 0.64, 20, 10, 0, 6.29, 0, 1.45), std(cc), 0, hw * 0.2, 0); add(new THREE.CylinderGeometry(hw * 0.45, hw * 0.45, 0.012, 20, 1, false, -1.3, 2.6), std(shade(cc, 0.8)), 0, hw * 0.26, hw * 0.4); }
  if (o.head === 'helmet') { add(new THREE.SphereGeometry(hw * 0.7, 20, 12, 0, 6.29, 0, 1.45), std(0x3a3f36, 0.7), 0, hw * 0.12, -0.01); add(geo('nvg', hw * 0.3, hw * 0.12, hw * 0.08, 0.02), std(0x222222), 0, hw * 0.45, hw * 0.6); }
  if (o.head === 'hood') { const h = add(new THREE.SphereGeometry(hw * 0.74, 20, 14, 0, 6.29, 0, 2.0), std(o.shirt, 0.95), 0, hw * 0.06, -hw * 0.12); h.material.side = THREE.DoubleSide; h.scale.set(1, 1.05, 1.08); }
  if (o.vest) { const v = new THREE.Mesh(geo('vest', 2.1 * U, 1.5 * U, 1.18 * U, 0.04), std(o.vest, 0.9)); v.position.set(0, 1.12 * U, 0); v.castShadow = true; torso.add(v); }
  if (o.bag) { const b = new THREE.Mesh(geo('bag', 1.4 * U, 1.5 * U, 0.55 * U, 0.08), std(pick([0x1c1c1c, 0x2a3a2a, 0x3a2a20]), 0.9)); b.position.set(0, 1.05 * U, -0.76 * U); b.castShadow = true; torso.add(b); }
}

// ---------- animation clips ----------
const q = (x, y = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ')).toArray();
function rot(name, times, angles) { return new THREE.QuaternionKeyframeTrack(name + '.quaternion', times, angles.flatMap(a => q(...(Array.isArray(a) ? a : [a])))); }
function swing(name, len, amp, legAmp, lean, bounce) {
  const t = [0, len / 4, len / 2, 3 * len / 4, len];
  return new THREE.AnimationClip(name, len, [
    rot('arm-right', t, [amp, 0, -amp, 0, amp]), rot('arm-left', t, [-amp, 0, amp, 0, -amp]),
    rot('leg-right', t, [-legAmp, 0, legAmp, 0, -legAmp]), rot('leg-left', t, [legAmp, 0, -legAmp, 0, legAmp]),
    rot('torso', t, [lean, [lean, 0.06], lean, [lean, -0.06], lean]), rot('rig', [0, len], [0, 0]),
    new THREE.VectorKeyframeTrack('rig.position', t, [0, 0, 0, 0, bounce, 0, 0, 0, 0, 0, bounce, 0, 0, 0, 0]),
  ]);
}
let CLIPS = null;
function clips() {
  if (CLIPS) return CLIPS;
  const idle = new THREE.AnimationClip('idle', 3, [
    rot('arm-right', [0, 1.5, 3], [[0, 0, 0.04], [0.05, 0, 0.07], [0, 0, 0.04]]), rot('arm-left', [0, 1.5, 3], [[0, 0, -0.04], [0.05, 0, -0.07], [0, 0, -0.04]]),
    rot('head', [0, 1, 2, 3], [0, [0.03, 0.12, 0], [0, -0.08, 0], 0]),
    rot('leg-right', [0, 3], [0, 0]), rot('leg-left', [0, 3], [0, 0]), rot('torso', [0, 3], [0, 0]), rot('rig', [0, 3], [0, 0]),
    new THREE.VectorKeyframeTrack('rig.position', [0, 1.5, 3], [0, 0, 0, 0, -0.006, 0, 0, 0, 0]),
  ]);
  const die = new THREE.AnimationClip('die', 0.8, [
    rot('rig', [0, 0.55, 0.7, 0.8], [0, [-1.45, 0, 0.1], [-1.62, 0, 0.12], [-1.57, 0, 0.12]]),
    rot('arm-right', [0, 0.6], [0, [-2.6, 0, 0.5]]), rot('arm-left', [0, 0.6], [0, [-2.4, 0, -0.6]]),
    rot('leg-right', [0, 0.6], [0, [0.2, 0, 0.1]]), rot('leg-left', [0, 0.6], [0, [-0.15, 0, -0.1]]),
    new THREE.VectorKeyframeTrack('rig.position', [0, 0.6, 0.8], [0, 0, 0, 0, 0.14, -0.1, 0, 0.12, -0.1]),
  ]);
  return (CLIPS = { idle, walk: swing('walk', 0.9, 0.75, 0.7, 0, 0.025), sprint: swing('sprint', 0.6, 1.25, 1.05, 0.18, 0.05), die });
}

// ---------- character ----------
export function makeChar(outfit) {
  const pk = outfit ? { o: outfit, mats: outfitMaterials(outfit) } : outfitPool()[(Math.random() * 16) | 0];
  const o = pk.o, m = pk.mats;
  const root = new THREE.Group();
  const body = new THREE.Group(); body.rotation.y = Math.PI; root.add(body);
  const rig = new THREE.Group(); rig.name = 'rig'; body.add(rig);
  const torso = part(rig, 'torso', [0, 2 * U, 0], geo('torso', 2 * U, 2 * U, 1 * U, 0.035), m.torso, [0, U, 0]);
  const head = part(torso, 'head', [0, 2 * U, 0], geo('head', 1.2 * U, 1.2 * U, 1.2 * U, 0.15), m.head, [0, 0.6 * U, 0]);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * U, 0.34 * U, 0.16 * U, 12), new THREE.MeshStandardMaterial({ color: o.head === 'balaclava' || o.head === 'ski' ? o.mask : o.skin, roughness: 0.7 })); neck.position.y = 0.01; head.add(neck);
  const limb = geo('limb', 0.98 * U, 2 * U, 0.98 * U, 0.03);
  const armR = part(torso, 'arm-right', [-1.5 * U, 1.85 * U, 0], limb, m.armR, [0, -0.85 * U, 0]);
  const armL = part(torso, 'arm-left', [1.5 * U, 1.85 * U, 0], limb, m.armL, [0, -0.85 * U, 0]);
  const legR = part(rig, 'leg-right', [-0.5 * U, 2 * U, 0], limb, m.legR, [0, -U, 0]);
  const legL = part(rig, 'leg-left', [0.5 * U, 2 * U, 0], limb, m.legL, [0, -U, 0]);
  accessories(o, head, torso);
  for (const a of [armR, armL]) a.rotation.order = 'YXZ';
  const parts = { body, rig, torso, head, 'arm-right': armR, 'arm-left': armL, 'leg-right': legR, 'leg-left': legL };
  const mixer = new THREE.AnimationMixer(body);
  const actions = {}; for (const [k, c] of Object.entries(clips())) actions[k] = mixer.clipAction(c);
  const hand = new THREE.Group(); hand.position.set(0, -1.72 * U, 0.05); armR.add(hand);
  let cur = null;
  root.userData = {
    body, parts, mixer, actions, hand, outfit: o,
    play(name, fade = 0.2) {
      const a = actions[name]; if (!a || cur === a) return;
      if (name === 'die') { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
      a.reset().setEffectiveWeight(1).fadeIn(fade).play();
      if (cur) cur.fadeOut(fade);
      cur = a;
    },
    setHeld(item, weaponModelFn) {
      while (hand.children.length) hand.remove(hand.children[0]);
      if (!item || item.id === 'fists') return;
      const g = gunModel(item) || weaponModelFn(item);
      g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
      hand.add(g);
    },
  };
  return root;
}
