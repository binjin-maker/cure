import * as THREE from 'three';
import { A, clone, gunModel } from './assets.js';

export const CHAR_SCALE = 0.72;
export const HEAD_Y = 2.3 * CHAR_SCALE;
const S = 64;
let prepared = false;

function remapUVs(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, p = geo.attributes.position, n = geo.attributes.normal;
  const w = b.max.x - b.min.x, h = b.max.y - b.min.y, d = b.max.z - b.min.z;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    let face, u, v;
    const X = (x - b.min.x) / w, Y = (y - b.min.y) / h, Z = (z - b.min.z) / d;
    if (az >= ax && az >= ay) { face = nz > 0 ? 4 : 5; u = nz > 0 ? X : 1 - X; v = Y; }
    else if (ax >= ay) { face = nx > 0 ? 0 : 1; u = nx > 0 ? 1 - Z : Z; v = Y; }
    else { face = ny > 0 ? 2 : 3; u = X; v = ny > 0 ? Z : 1 - Z; }
    const col = face % 3, row = Math.floor(face / 3);
    uv[i * 2] = (col + 0.02 + u * 0.96) / 3;
    uv[i * 2 + 1] = 1 - (row + 1 - (0.02 + v * 0.96)) / 2;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function prepare() {
  if (prepared) return; prepared = true;
  const t = A.lib['character-a'];
  t.traverse(o => { if (o.isMesh) { o.geometry = o.geometry.clone(); if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); remapUVs(o.geometry); } });
}

// ---------- skin painting ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const hex = (c) => '#' + new THREE.Color(c).getHexString();
function shade(c, f) { const k = new THREE.Color(c); k.multiplyScalar(f); return hex(k); }
function grain(x, x0, y0, w, h, amt = 18) {
  const img = x.getImageData(x0, y0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (Math.random() - 0.5) * amt; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  x.putImageData(img, x0, y0);
}
function atlas(paint) {
  const c = document.createElement('canvas'); c.width = 3 * S; c.height = 2 * S;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const cell = (face) => [(face % 3) * S, Math.floor(face / 3) * S];
  paint(x, cell);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  return t;
}
const FACES = [0, 1, 2, 3, 4, 5];
const SKINS = [0xe8c19a, 0xd9a273, 0xb57a4c, 0x8a5634, 0x5e3a24, 0xf0d0b0];

export function randomOutfit(seed) {
  const top = pick(['hoodie', 'hoodie', 'jacket', 'tee', 'vest', 'puffer', 'tracksuit']);
  const head = pick(['face', 'face', 'balaclava', 'balaclava', 'hood', 'beanie', 'cap', 'helmet', 'ski']);
  return {
    skin: pick(SKINS), top, head,
    shirt: pick([0x2a2c30, 0x1c1d20, 0x3a3f36, 0x4a3a30, 0x2e3644, 0x5a2a28, 0x2c3a2c, 0x55585c, 0x6a5a48, 0x1e2a36, 0x7a7a72, 0x3d2e4a]),
    accent: pick([0x111111, 0xd8d8d0, 0x8a1c1c, 0x1c3a6a, 0xc0a040, 0x2a2a2a]),
    pants: pick([0x22252a, 0x1a1b1e, 0x2f3d55, 0x3a3a34, 0x4a4036, 0x2a2a2a, 0x445060]),
    shoes: pick([0x111111, 0xdddddd, 0x3a2a1e, 0x222222]),
    gloves: Math.random() < 0.45 ? pick([0x111111, 0x2a2a2a, 0x3a2a1e]) : null,
    mask: pick([0x101113, 0x1c1e22, 0x2a2a2a, 0x3a3f36, 0x2a2420]),
    hair: pick([0x1a1410, 0x2a1c12, 0x4a3420, 0x0c0c0c, 0x6a5030]),
    vest: Math.random() < 0.3 ? pick([0x2a2e28, 0x1a1a1c, 0x3a3a34, 0x4a4a40]) : null,
  };
}

function paintHead(o) {
  return atlas((x, cell) => {
    const skin = hex(o.skin), mask = o.head === 'balaclava' || o.head === 'ski';
    for (const f of FACES) { const [cx, cy] = cell(f); x.fillStyle = mask ? hex(o.mask) : skin; x.fillRect(cx, cy, S, S); }
    const [fx, fy] = cell(4);
    const eyes = (yy, white) => { for (const ex of [20, 38]) { if (white) { x.fillStyle = '#e8e4da'; x.fillRect(fx + ex - 1, fy + yy - 1, 8, 7); } x.fillStyle = '#121212'; x.fillRect(fx + ex + 1, fy + yy, 5, 5); } };
    if (mask) {
      x.fillStyle = skin; x.fillRect(fx + 14, fy + 22, 36, 12);
      eyes(24, true);
      if (o.head === 'ski') { x.fillStyle = skin; x.fillRect(fx + 24, fy + 42, 16, 7); x.fillStyle = '#4a1e1e'; x.fillRect(fx + 26, fy + 44, 12, 3); }
    } else {
      eyes(26, false);
      x.fillStyle = shade(o.skin, 0.75); x.fillRect(fx + 30, fy + 34, 4, 6);
      x.fillStyle = '#3a1e1a'; x.fillRect(fx + 24, fy + 46, 16, 3);
      x.fillStyle = hex(o.hair);
      if (o.head === 'face') { x.fillRect(fx, fy, S, 12); x.fillRect(fx + 18, fy + 19, 10, 3); x.fillRect(fx + 36, fy + 19, 10, 3); for (const f of [0, 1, 5]) { const [cx, cy] = cell(f); x.fillRect(cx, cy, S, f === 5 ? 40 : 22); } const [tx, ty] = cell(2); x.fillRect(tx, ty, S, S); }
    }
    const capCol = o.head === 'helmet' ? '#3a3f36' : o.head === 'beanie' ? hex(o.mask) : o.head === 'hood' ? hex(o.shirt) : o.head === 'cap' ? hex(o.accent === 0xd8d8d0 ? 0x1c1c1c : o.accent) : null;
    if (capCol) {
      const deep = o.head === 'hood' ? 1 : o.head === 'helmet' ? 0.45 : 0.32;
      for (const f of [0, 1, 5]) { const [cx, cy] = cell(f); x.fillStyle = capCol; x.fillRect(cx, cy, S, f === 5 ? S * deep + (o.head === 'hood' ? 0 : 6) : S * deep); }
      const [tx, ty] = cell(2); x.fillStyle = capCol; x.fillRect(tx, ty, S, S);
      x.fillStyle = capCol; x.fillRect(fx, fy, S, o.head === 'hood' ? 10 : S * deep * 0.5);
      if (o.head === 'hood') { x.fillRect(fx, fy, 8, S); x.fillRect(fx + S - 8, fy, 8, S); }
      if (o.head === 'helmet') { x.fillStyle = '#2a2e28'; x.fillRect(fx, fy + 14, S, 4); }
    }
    for (const f of FACES) { const [cx, cy] = cell(f); grain(x, cx, cy, S, S, mask ? 22 : 10); }
  });
}
function paintTorso(o) {
  return atlas((x, cell) => {
    const sh = hex(o.shirt);
    for (const f of FACES) { const [cx, cy] = cell(f); x.fillStyle = sh; x.fillRect(cx, cy, S, S); }
    const [fx, fy] = cell(4), [bx, by] = cell(5);
    x.fillStyle = shade(o.shirt, 0.7);
    if (o.top === 'hoodie') { x.fillRect(fx + 14, fy + 38, 36, 14); x.fillStyle = shade(o.shirt, 1.25); x.fillRect(fx + 22, fy + 4, 2, 18); x.fillRect(fx + 40, fy + 4, 2, 18); x.fillStyle = shade(o.shirt, 0.8); x.fillRect(bx + 8, by, 48, 16); }
    if (o.top === 'jacket' || o.top === 'puffer' || o.top === 'tracksuit') { x.fillStyle = '#18181a'; x.fillRect(fx + 31, fy, 2, S); x.fillStyle = shade(o.shirt, 0.75); x.fillRect(fx + 6, fy + 36, 14, 3); x.fillRect(fx + 44, fy + 36, 14, 3); }
    if (o.top === 'puffer') for (let i = 0; i < S; i += 10) for (const f of [4, 5, 0, 1]) { const [cx, cy] = cell(f); x.fillStyle = shade(o.shirt, 0.72); x.fillRect(cx, cy + i, S, 2); }
    if (o.top === 'tracksuit') for (const f of [0, 1]) { const [cx, cy] = cell(f); x.fillStyle = hex(o.accent); x.fillRect(cx + 28, cy, 4, S); }
    if (o.top === 'tee') { x.fillStyle = hex(o.accent); x.fillRect(fx + 18, fy + 18, 28, 16); x.fillStyle = hex(o.skin); x.fillRect(fx + 24, fy, 16, 5); }
    if (o.top === 'vest' || o.vest) {
      const vc = hex(o.vest || 0x2a2e28);
      for (const f of [4, 5]) { const [cx, cy] = cell(f); x.fillStyle = vc; x.fillRect(cx + 4, cy + 10, S - 8, S - 14); x.fillStyle = shade(o.vest || 0x2a2e28, 0.7); for (let k = 0; k < 3; k++) x.fillRect(cx + 10 + k * 16, cy + 30, 12, 14); x.fillStyle = shade(o.vest || 0x2a2e28, 1.3); x.fillRect(cx + 4, cy + 10, S - 8, 2); }
      for (const f of [0, 1]) { const [cx, cy] = cell(f); x.fillStyle = vc; x.fillRect(cx + 4, cy + 10, S - 8, S - 14); }
    }
    x.fillStyle = shade(o.pants, 0.8); for (const f of [4, 5, 0, 1]) { const [cx, cy] = cell(f); x.fillRect(cx, cy + S - 6, S, 6); }
    for (const f of FACES) { const [cx, cy] = cell(f); grain(x, cx, cy, S, S, 16); }
  });
}
function paintArm(o) {
  return atlas((x, cell) => {
    const sleeve = o.top === 'tee' || (o.top === 'vest' && !o.vest) ? 0.32 : 0.78;
    for (const f of FACES) {
      const [cx, cy] = cell(f);
      x.fillStyle = hex(o.top === 'tee' ? o.skin : o.shirt); x.fillRect(cx, cy, S, S);
      if (o.top === 'tee') { x.fillStyle = hex(o.shirt); x.fillRect(cx, cy, S, S * sleeve); }
      if (o.top === 'tracksuit' && (f === 0 || f === 1)) { x.fillStyle = hex(o.accent); x.fillRect(cx + 28, cy, 6, S * 0.78); }
      x.fillStyle = hex(o.gloves ?? o.skin); x.fillRect(cx, cy + S * 0.8, S, S * 0.2);
      if (o.top !== 'tee') { x.fillStyle = shade(o.shirt, 0.72); x.fillRect(cx, cy + S * 0.76, S, 4); }
      grain(x, cx, cy, S, S, 14);
    }
    const [bx, by] = cell(3); x.fillStyle = hex(o.gloves ?? o.skin); x.fillRect(bx, by, S, S);
  });
}
function paintLeg(o) {
  return atlas((x, cell) => {
    for (const f of FACES) {
      const [cx, cy] = cell(f);
      x.fillStyle = hex(o.pants); x.fillRect(cx, cy, S, S);
      x.fillStyle = shade(o.pants, 0.82); x.fillRect(cx, cy + 34, S, 3);
      if (f === 0 || f === 1) { x.fillStyle = shade(o.pants, 0.75); x.fillRect(cx + 20, cy + 4, 24, 16); }
      x.fillStyle = hex(o.shoes); x.fillRect(cx, cy + S * 0.82, S, S * 0.18);
      x.fillStyle = shade(o.shoes, 0.6); x.fillRect(cx, cy + S - 3, S, 3);
      grain(x, cx, cy, S, S, 16);
    }
    const [bx, by] = cell(3); x.fillStyle = shade(o.shoes, 0.5); x.fillRect(bx, by, S, S);
  });
}

const skinCache = [];
function outfitMaterials(o) {
  const m = (t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: 0, envMapIntensity: 0.3 });
  const leg = m(paintLeg(o)), arm = m(paintArm(o));
  return { head: m(paintHead(o)), torso: m(paintTorso(o)), 'arm-left': arm, 'arm-right': arm, 'leg-left': leg, 'leg-right': leg };
}
export function outfitPool(n = 16) {
  while (skinCache.length < n) { const o = randomOutfit(); skinCache.push({ o, mats: outfitMaterials(o) }); }
  return skinCache;
}

// ---------- character ----------
export function makeChar(outfit) {
  prepare();
  const root = new THREE.Group();
  const body = clone('character-a');
  body.rotation.y = Math.PI;
  body.scale.setScalar(CHAR_SCALE);
  root.add(body);
  const parts = {};
  body.traverse(o => { if (o.name) parts[o.name] = o; });
  for (const k of ['arm-left', 'arm-right']) if (parts[k]) parts[k].rotation.order = 'YXZ';
  const pick2 = outfit ? { o: outfit, mats: outfitMaterials(outfit) } : outfitPool()[(Math.random() * 16) | 0];
  body.traverse(o => { if (o.isMesh) { const key = Object.keys(pick2.mats).find(k => o.parent?.name === k || o.name === k); o.material = pick2.mats[key] || pick2.mats.torso; o.castShadow = true; o.receiveShadow = true; } });
  const mixer = new THREE.AnimationMixer(body);
  const actions = {};
  for (const c of A.anims || []) actions[c.name] = mixer.clipAction(c);
  const hand = new THREE.Group();
  const armR = parts['arm-right'];
  if (armR) { hand.position.set(-0.2, -0.95, 0.05); armR.add(hand); hand.scale.setScalar(1 / CHAR_SCALE); }
  let cur = null;
  const ud = {
    body, parts, mixer, actions, hand, outfit: pick2.o,
    play(name, fade = 0.2) {
      const a = actions[name]; if (!a || cur === a) return;
      a.reset().setEffectiveWeight(1).fadeIn(fade).play();
      if (name === 'die') { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
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
  root.userData = ud;
  return root;
}
