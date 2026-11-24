import * as THREE from 'three';
import { Builder, rand, randi, pick } from './engine.js';

export const ROADS = [-110, -40, 40, 110];
export const RW = 12, EDGE = 172;
export const ZONES = {
  surface: { y: 0.15, name: 'SECTOR-07' },
  subway: { y: -12, name: 'Subway' },
  sewer: { y: -26, name: 'The Sewers' },
  vibe: { y: -50, name: 'Vibe Check' },
};
export const zoneOfY = (y) => y > -6 ? 'surface' : y > -19 ? 'subway' : y > -38 ? 'sewer' : 'vibe';

const BLK = [[-EDGE, -116], [-104, -46], [-34, 34], [46, 104], [116, EDGE]];

const faceCache = new Map();
function faceMat(skin) {
  if (faceCache.has(skin)) return faceCache.get(skin);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#' + new THREE.Color(skin).getHexString(); x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#111'; x.beginPath(); x.ellipse(42, 52, 8, 13, 0, 0, 7); x.ellipse(86, 52, 8, 13, 0, 0, 7); x.fill();
  x.strokeStyle = '#111'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.arc(64, 70, 26, 0.25 * Math.PI, 0.75 * Math.PI); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshLambertMaterial({ map: t });
  faceCache.set(skin, m);
  return m;
}
export function makeCharacter(shirt = 0x3a6ea5, pants = 0x2a2a2a, skin = 0xf2c99a, hat) {
  const g = new THREE.Group();
  const m = (c) => new THREE.MeshLambertMaterial({ color: c });
  const part = (w, h, d, c, x, y, z, parent = g) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); me.position.set(x, y, z); me.castShadow = true; parent.add(me); return me; };
  const legL = new THREE.Group(), legR = new THREE.Group(), armL = new THREE.Group(), armR = new THREE.Group();
  legL.position.set(-0.17, 0.9, 0); legR.position.set(0.17, 0.9, 0); armL.position.set(-0.47, 1.62, 0); armR.position.set(0.47, 1.62, 0);
  part(0.32, 0.9, 0.32, pants, 0, -0.45, 0, legL); part(0.32, 0.9, 0.32, pants, 0, -0.45, 0, legR);
  part(0.3, 0.86, 0.3, skin, 0, -0.43, 0, armL); part(0.3, 0.86, 0.3, skin, 0, -0.43, 0, armR);
  part(0.31, 0.4, 0.31, shirt, 0, -0.18, 0, armL); part(0.31, 0.4, 0.31, shirt, 0, -0.18, 0, armR);
  const torso = part(0.64, 0.76, 0.34, shirt, 0, 1.28, 0);
  const head = part(0.4, 0.4, 0.4, skin, 0, 1.88, 0);
  const sk = head.material;
  head.material = [sk, sk, sk, sk, sk, faceMat(skin)];
  if (hat) part(0.44, 0.14, 0.44, hat, 0, 2.12, 0);
  g.add(legL, legR, armL, armR);
  const hand = new THREE.Group(); hand.position.set(0, -0.82, -0.12); armR.add(hand);
  g.userData = { legL, legR, armL, armR, torso, head, hand };
  return g;
}

function rectsMinus(r, h) {
  const [x0, z0, x1, z1] = r, [hx0, hz0, hx1, hz1] = h, out = [];
  if (hz0 > z0) out.push([x0, z0, x1, hz0]);
  if (hz1 < z1) out.push([x0, hz1, x1, z1]);
  if (hx0 > x0) out.push([x0, hz0, hx0, hz1]);
  if (hx1 < x1) out.push([hx1, hz0, x1, hz1]);
  return out;
}

export function buildWorld(scene, KIT) {
  const B = new Builder(scene);
  const W = {
    atms: [], dealers: [], armories: [], rebelSpots: [], registers: [], safes: [], scrap: [], crates: [],
    airdrops: [], teleports: [], spawns: [], labels: [], zones: ZONES, lamps: [], waters: [], pits: [], buildings: [],
    trackZone: null, objects: [], under: {}, lights: [], trees: [], bags: [], papers: [], wires: [], poles: [],
  };
  B.mat('road', 0x55565a); B.mat('lot', 0x86898c); B.mat('dirt', 0x7e6c58); B.mat('court', 0xa85a3c); B.mat('line', 0x9a9682, { offset: true });
  B.mat('concrete', 0xa3a5a6); B.mat('dark', 0x4a4a50);
  const pm = (k, id, ts, c) => { const m = KIT.pbr?.(id, { color: c }); if (m) B.mat(k, 0xffffff, { material: m, ts }); else B.mat(k, c); };
  pm('brick', 'red_bricks_04', 2.5, 0xffffff); pm('brick2', 'dark_brick_wall', 1.05, 0xd0c0b0); pm('plaster', 'painted_plaster_wall', 2, 0xe0d8c8); pm('shutter', 'rusty_metal_shutter', 2.4, 0xc8c8c8); pm('tile', 'dirty_tiles', 1.5, 0xffffff); pm('subtile', 'dirty_tiles', 1.5, 0xc8e0c8); pm('sewerwall', 'dark_brick_wall', 1.05, 0x7a7a70); pm('grate', 'metal_plate', 1.5, 0x888888);
  B.mat('metal', 0x7a848e); B.mat('rust', 0x9a6040); B.mat('wood', 0x9a7448); B.mat('roof', 0x56575c); B.mat('glass', 0x46584f, { emissive: 0x0e1a16, emissiveIntensity: 0.6 }); B.mat('glasslit', 0x8a6a40, { emissive: 0xd09040, emissiveIntensity: 0.45 });
  B.mat('wall', 0x8e9092); B.mat('rock', 0x6e6860); B.mat('trim', 0x3a3a3e); B.mat('container', 0x3a6e94); B.mat('container2', 0xa8482f);
  B.mat('container3', 0x5e8448); B.mat('sewer', 0x6a705e); B.mat('sewerwall', 0x6a6458); B.mat('tile', 0xcfc8b6); B.mat('rail', 0x6a5440);
  B.mat('grate', 0x6a6a6a); B.mat('vibe', 0x6a5a74); B.mat('neon', 0xff3fa0, { emissive: 0xff3fa0, emissiveIntensity: 0.9 });
  B.mat('lamp', 0xffe7a8, { emissive: 0xffd890, emissiveIntensity: 1 }); B.mat('green', 0x2f8a4a, { emissive: 0x1f6a3a, emissiveIntensity: 0.6 });
  B.mat('sign', 0x223355); B.mat('redsign', 0x8a1f1f, { emissive: 0x501010, emissiveIntensity: 0.5 }); B.mat('bluesign', 0x1f4a9a, { emissive: 0x10306a, emissiveIntensity: 0.5 });
  B.mat('fence', 0x8a8a82); B.mat('black', 0x2c2c2e); B.mat('carred', 0x9a2a24); B.mat('carblue', 0x2c5288); B.mat('cargray', 0x7a7a7a); B.mat('tire', 0x1a1a1a);
  B.mat('counter', 0x5a3f2a); B.mat('pizza', 0xb8862a);
  B.mat('stone', 0xa8a49a); B.mat('brickgrey', 0x8e8c88); B.mat('brickdark', 0x6e4034); B.mat('shutter', 0x8c9090); B.mat('frame', 0x2c2d30);
  B.mat('iron', 0x1c1d1f); B.mat('pothole', 0x1b1b1c, { offset: true }); B.mat('pole', 0x4a3a2c); B.mat('subtile', 0x8a9c88);
  B.mat('tube', 0xeaffef, { emissive: 0xdfffe8, emissiveIntensity: 1.6 }); B.mat('acunit', 0xb8b8b0); B.mat('pipe', 0x3a3c3e);

  // ---------- ground ----------
  const blockMat = {};
  blockMat['4,3'] = 'dirt';
  B.mat('walk', 0x8e8f8e);
  const I = KIT.I, KM = KIT.mats, ksize = KIT.size;
  const variants = new Map();
  const tintMat = (m, tint) => { const k = m.uuid + tint; if (!variants.has(k)) { const c = m.clone(); c.color = c.color.clone().multiply(new THREE.Color(tint)); variants.set(k, c); } return variants.get(k); };
  const kmat = (name, tint, ts) => { const m = tint ? tintMat(KM[name], tint) : KM[name]; return m; };
  const PB = { road: ['asphalt_02', 3, 0xb8b8b8, 0.6], walk: ['concrete_pavement', 1.8, 0xe0e0e0], lot: ['asphalt_02', 3, 0x989898, 0.7], floorK: ['concrete_floor_worn_001', 2.5, 0xd8d4cc], slabK: ['smooth_concrete_floor', 3, 0xc8c8c8], roofK: ['concrete_floor_02', 3, 0x9a9a9a], concrete: ['concrete_wall_006', 2, 0xd8d8d8], brickK: ['red_brick_03', 1, 0xffffff] };
  for (const [k, mn, t, ts] of [['road', 'MI_Asphalt', 0xd0d0d0, 7], ['walk', 'MI_Concrete', 0xe8e8e8, 3], ['lot', 'MI_Asphalt', 0xb8b8b8, 8], ['floorK', 'MI_InteriorFloor', 0xffffff, 3], ['slabK', 'MI_Concrete', 0xc8c8c8, 4], ['roofK', 'MI_Concrete', 0x8a8a8a, 6], ['concrete', 'MI_Concrete', 0xd8d8d8, 3], ['brickK', 'MI_RedBrick', 0xffffff, 2], ['trimK', 'MI_Trim', 0xffffff, 2]]) {
    B.buckets.delete(k);
    const pb = PB[k] && KIT.pbr?.(PB[k][0], { color: PB[k][2], rough: PB[k][3] ?? 1 });
    if (pb) B.mat(k, 0xffffff, { material: pb, ts: PB[k][1] });
    else B.mat(k, 0xffffff, { material: kmat(mn, t), ts });
  }
  for (const rx of ROADS) B.box('road', rx, -1, 0, RW, 1, EDGE * 2);
  const xs = [-EDGE, ...ROADS.flatMap(r => [r - RW / 2, r + RW / 2]), EDGE];
  for (const rz of ROADS) for (let i = 0; i < xs.length; i += 2) B.box('road', (xs[i] + xs[i + 1]) / 2, -1, rz, xs[i + 1] - xs[i], 1, RW);
  const placeK = (name, x, y, z, ry = 0, s = 1, sy) => I.add(name, x, y, z, ry, s, sy);
  const ROT = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 };
  const fillPlain = (style) => style === 'trim' ? [['trim-plain-3', 3], ['brick-plain-1', 1]] : style === 'metal' ? [['metal-plain-3', 3], ['metal-plain-1', 1]] : [['brick-plain-4', 4], ['brick-plain-3', 3], ['brick-plain-1', 1]];
  // kit facade on rect [x0..x1, z0..z1]; floors = array of floor heights; doors = { side: alongCoord }
  const kitShell = (o) => {
    const { x0, z0, x1, z1, y0 = 0.15, floors, style = 'brick', ground = 'brick', doors = {}, interior = false, cornice = 'brick', closedDoors = false, pattern } = o;
    const top = y0 + floors.reduce((a, b) => a + b, 0);
    const upper = pattern || pick([['brick-window-trim'], ['brick-window-square-single'], ['brick-window-trim-single'], ['brick-window-trim', 'brick-window-trim-single'], ['brick-window-square-single', 'brick-plain-3']]);
    const upperTrim = ['trim-window', 'trim-window', 'trim-plain-3'];
    for (const side of ['n', 's', 'w', 'e']) {
      const horiz = side === 'n' || side === 's', len = horiz ? x1 - x0 : z1 - z0, slots = Math.round(len / 2);
      const ry = ROT[side];
      const doorAt = doors[side];
      for (let i = 0; i < slots; i++) {
        const along = (horiz ? x0 : z0) + 1 + 2 * i;
        const px = horiz ? along : side === 'w' ? x0 : x1, pz = horiz ? (side === 'n' ? z0 : z1) : along;
        const isDoor = doorAt !== undefined && Math.abs(along - doorAt) < 1.01;
        let y = y0;
        floors.forEach((fh, f) => {
          let main;
          if (f === 0) {
            if (isDoor) main = ground === 'metal' ? 'doorframe-metal-single' : 'doorframe-trim';
            else if (ground === 'metal') main = Math.random() < 0.78 ? 'metal-firstfloor-window' : 'metal-firstfloor-wall';
            else if (ground === 'trim') main = Math.random() < 0.7 ? 'trim-firstfloor-window-001' : 'trim-firstfloor-wall';
            else main = pick(['brick-window-square-single', 'brick-plain-3', 'brick-window-trim-single']);
          } else main = style === 'trim' ? pick(upperTrim) : style === 'metal' ? pick(['metal-window-half', 'metal-plain-3', 'metal-fullwindow']) : upper[(i + f) % upper.length];
          placeK(main, px, y, pz, ry);
          if (isDoor && f === 0 && closedDoors) placeK(ground === 'metal' ? 'door-2' : 'door-1', px + (horiz ? 0.5 : 0), y, pz, ry);
          let rest = fh - 3, yy = y + 3;
          const fp = fillPlain(f === 0 && ground !== 'brick' ? ground : style);
          while (rest > 0.05) { const [pn, ph] = fp.find(([, h]) => h <= rest + 0.05) || fp[fp.length - 1]; const sc = ph > rest ? rest / ph : 1; placeK(pn, px, yy, pz, ry, 1, sc); yy += ph * sc; rest -= ph * sc; }
          y += fh;
        });
        if (cornice) placeK(cornice === 'trim' ? 'cornice-trim-center' : cornice === 'metal' ? 'cornice-metal-center' : 'cornice-brick-center', px, top, pz, ry);
        if (interior) {
          let yy = y0, rest = top - y0;
          if (isDoor) { yy += 3; rest -= 3; }
          while (rest > 0.05) { const ph = rest >= 4 ? 4 : rest >= 3 ? 3 : 1, sc = ph > rest ? rest / ph : 1; placeK('brick-interiorwall-' + ph, px, yy, pz, ry + Math.PI, 1, sc); yy += ph * sc; rest -= ph * sc; }
        }
      }
    }
    for (const [cx, cz, r] of [[x0, z0, Math.PI], [x1, z0, Math.PI / 2], [x1, z1, 0], [x0, z1, -Math.PI / 2]]) {
      let yy = y0, rest = top - y0 + (cornice ? 1 : 0);
      while (rest > 0.05) { const sc = Math.min(1, rest / 3); placeK('brick-cornercolumn-center', cx, yy, cz, r, 1, sc); yy += 3 * sc; rest -= 3 * sc; }
    }
    return top;
  };
  const SW = 3.5;
  BLK.forEach(([x0, x1], i) => BLK.forEach(([z0, z1], j) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    B.box('walk', cx, -1, z0 + SW / 2, w, 1.15, SW); B.box('walk', cx, -1, z1 - SW / 2, w, 1.15, SW);
    B.box('walk', x0 + SW / 2, -1, cz, SW, 1.15, d - 2 * SW); B.box('walk', x1 - SW / 2, -1, cz, SW, 1.15, d - 2 * SW);
    B.box(blockMat[i + ',' + j] || 'lot', cx, -1, cz, w - 2 * SW, 1.15, d - 2 * SW);
  }));
  for (const r of ROADS) for (let t = -EDGE + 3; t < EDGE - 3; t += 12) {
    if (ROADS.some(rr => Math.abs(t - rr) < 12)) continue;
    I.add('decal-brokenline-straight', r, 0.155, t, Math.PI / 2); I.add('decal-brokenline-straight', t, 0.155, r, 0);
  }
  for (const rx of ROADS) for (const rz of ROADS) for (const [dx, dz, ry] of [[0, -9, Math.PI / 2], [0, 9, Math.PI / 2], [-9, 0, 0], [9, 0, 0]]) {
    I.add('decal-crosswalk', rx + dx, 0.155, rz + dz, ry);
    if (Math.random() < 0.5) I.add('decal-stop', rx + dx * 1.45 + (dz ? 3 : 0), 0.155, rz + dz * 1.45 + (dx ? -3 : 0), ry + Math.PI / 2);
  }

  // ---------- perimeter: brutalist wall + rock ----------
  const H = 30;
  const inv = { invisible: true };
  B.box('wall', 0, -1, -EDGE - 2, EDGE * 2 + 8, H, 4, inv); B.box('wall', 0, -1, EDGE + 2, EDGE * 2 + 8, H, 4, inv);
  B.box('wall', -EDGE - 2, -1, 0, 4, H, EDGE * 2, inv); B.box('wall', EDGE + 2, -1, 0, 4, H, EDGE * 2, inv);
  B.box('walk', 0, -1.2, 0, EDGE * 2 + 90, 1.17, EDGE * 2 + 90, { solid: false });

  // ---------- helpers ----------
  const zoneTag = { zone: 'surface' };
  // framed window on a wall face. side: n/s/e/w, (wx|wz) = along-wall centre, y = bottom
  const win = (side, px, pz, y, w = 1.3, h = 1.6, detail = true, lit = Math.random() < 0.22) => {
    const ax = side === 'n' || side === 's', sg = side === 's' || side === 'e' ? 1 : -1;
    const at = (out, along, yy, ww, hh, dd, mat) => { const o = sg * out; ax ? B.box(mat, px + along, yy, pz + o, ww, hh, dd, { solid: false }) : B.box(mat, px + o, yy, pz + along, dd, hh, ww, { solid: false }); };
    at(0.03, 0, y, w, h, 0.06, lit ? 'glasslit' : 'glass');
    if (!detail) { at(0.08, 0, y - 0.12, w + 0.2, 0.12, 0.16, 'stone'); return; }
    at(0.06, 0, y + h * 0.5 - 0.03, w, 0.06, 0.06, 'frame'); at(0.06, 0, y, 0.06, h, 0.06, 'frame');
    at(0.06, -w * 0.25, y, 0.04, h, 0.05, 'frame'); at(0.06, w * 0.25, y, 0.04, h, 0.05, 'frame');
    at(0.08, -w / 2 - 0.06, y, 0.12, h, 0.16, 'frame'); at(0.08, w / 2 + 0.06, y, 0.12, h, 0.16, 'frame');
    at(0.1, 0, y + h, w + 0.4, 0.28, 0.2, 'stone'); at(0.11, 0, y - 0.14, w + 0.3, 0.14, 0.22, 'stone');
  };
  // decorations wrapped around a solid block [x0..x1, z0..z1] of height h
  const dress = (x0, z0, x1, z1, h, face, floors, fh) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    B.box('stone', cx, 0.15, cz, w + 0.2, 1.0, d + 0.2);
    for (let f = 1; f < floors; f++) B.box('stone', cx, 0.15 + f * fh - 0.2, cz, w + 0.16, 0.22, d + 0.16, { solid: false });
    B.box('stone', cx, 0.15 + h - 0.45, cz, w + 0.4, 0.3, d + 0.4, { solid: false });
    B.box('stone', cx, 0.15 + h - 0.15, cz, w + 0.6, 0.25, d + 0.6, { solid: false });
    const corner = face === 'n' || face === 's' ? [x1 - 0.25, face === 'n' ? z0 - 0.18 : z1 + 0.18] : [face === 'w' ? x0 - 0.18 : x1 + 0.18, z1 - 0.25];
    B.box('pipe', corner[0], 0.15, corner[1], 0.14, h - 0.3, 0.14, { solid: false });
  };
  const fireEscape = (side, x0, z0, x1, z1, floors, fh) => {
    const ax = side === 'n' || side === 's', sg = side === 's' || side === 'e' ? 1 : -1;
    const base = ax ? (side === 'n' ? z0 : z1) : (side === 'w' ? x0 : x1);
    const span = ax ? x1 - x0 : z1 - z0, a0 = (ax ? x0 : z0) + span * 0.3, L = Math.min(4.2, span * 0.5);
    const P = (out, along, y, ww, hh, dd) => ax ? B.box('iron', a0 + along, y, base + sg * out, ww, hh, dd, { solid: false }) : B.box('iron', base + sg * out, y, a0 + along, dd, hh, ww, { solid: false });
    for (let f = 1; f < floors; f++) {
      const y = 0.15 + f * fh - 0.2;
      P(0.65, L / 2, y, L, 0.06, 1.1);
      P(1.18, L / 2, y + 0.95, L, 0.05, 0.05); P(0.65, -0.02, y + 0.95, 0.05, 0.05, 1.1); P(0.65, L + 0.02, y + 0.95, 0.05, 0.05, 1.1);
      for (let k = 0; k <= L; k += 0.5) P(1.18, k, y, 0.03, 0.95, 0.03);
      if (f > 1) for (let st = 0; st < 8; st++) P(0.7, 0.4 + st * (L - 0.8) / 8 * (f % 2 ? 1 : -1) + (f % 2 ? 0 : L - 0.8), y - fh + 0.2 + (st + 1) * (fh - 0.2) / 8, 0.3, 0.04, 0.6);
    }
  };
  const building = (o) => {
    const { x, z, w, d, h = 5, floors = 1, door = 's', name, alarm = false, y0 = 0.15, sign, doors2, style = 'brick', ground = 'brick' } = o;
    const fh = h, total = fh * floors, t = 0.2, DG = 1.6;
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const bld = { name, x, z, w, d, alarm, x0, x1, z0, z1, floors, fh, y0 };
    W.buildings.push(bld);
    const doorsOn = new Set([door, ...(doors2 || [])]);
    const doorAlong = {};
    for (const sd of doorsOn) { const horiz = sd === 'n' || sd === 's'; const a0 = horiz ? x0 : z0, c = horiz ? x : z; doorAlong[sd] = a0 + 1 + 2 * Math.max(0, Math.min(Math.round((horiz ? w : d) / 2) - 1, Math.round((c - a0 - 1) / 2))); }
    bld.doors = doorAlong;
    for (const side of ['n', 's', 'w', 'e']) {
      const horiz = side === 'n' || side === 's';
      const edge = side === 'n' ? z0 : side === 's' ? z1 : side === 'w' ? x0 : x1;
      const a0 = horiz ? x0 - t : z0 - t, a1 = horiz ? x1 + t : z1 + t;
      const seg = (b0, b1, yb, ht) => { if (b1 - b0 < 0.01) return; horiz ? B.box('wall', (b0 + b1) / 2, yb, edge, b1 - b0, ht, 2 * t, { invisible: true }) : B.box('wall', edge, yb, (b0 + b1) / 2, 2 * t, ht, b1 - b0, { invisible: true }); };
      if (doorAlong[side] !== undefined) { const c = doorAlong[side]; seg(a0, c - DG / 2, y0, total); seg(c + DG / 2, a1, y0, total); seg(c - DG / 2, c + DG / 2, y0 + 2.6, total - 2.6); }
      else seg(a0, a1, y0, total);
    }
    kitShell({ x0, z0, x1, z1, y0, floors: Array(floors).fill(fh), style, ground, doors: doorAlong, interior: true, cornice: style === 'trim' ? 'trim' : style === 'metal' ? 'metal' : 'brick' });
    const ix0 = x0 + t, ix1 = x1 - t, iz0 = z0 + t, iz1 = z1 - t;
    B.box('floorK', x, y0, z, ix1 - ix0, 0.12, iz1 - iz0);
    for (let f = 1; f <= floors; f++) {
      const fy = y0 + f * fh - 0.3;
      if (f < floors) {
        const east = f % 2 === 1;
        const hole = east ? [ix1 - 2.4, iz0 + 0.1, ix1, iz0 + 7.4] : [ix0, iz0 + 0.1, ix0 + 2.4, iz0 + 7.4];
        for (const r of rectsMinus([ix0, iz0, ix1, iz1], hole)) B.box('floorK', (r[0] + r[2]) / 2, fy, (r[1] + r[3]) / 2, r[2] - r[0], 0.3, r[3] - r[1]);
        const sx = (hole[0] + hole[2]) / 2, steps = Math.ceil(fh / 0.42), run = (hole[3] - hole[1] - 0.6) / steps;
        for (let s2 = 0; s2 < steps; s2++) {
          const topS = y0 + (f - 1) * fh + 0.12 + (s2 + 1) * (fh / steps);
          const base = y0 + (f - 1) * fh + (f === 1 ? 0.12 : 0);
          B.box('concrete', sx, base, hole[3] - (s2 + 0.5) * run, 2.4, topS - base, run);
        }
        B.box('iron', east ? hole[0] - 0.08 : hole[2] + 0.08, fy + 0.3, (hole[1] + 2.6 + hole[3]) / 2, 0.08, 1, hole[3] - hole[1] - 2.6);
      } else B.box('roofK', x, fy, z, w - 0.02, 0.3, d - 0.02);
    }
    if (sign) {
      const sz = door === 's' ? z1 + 0.3 : door === 'n' ? z0 - 0.3 : z;
      const sx2 = door === 'e' ? x1 + 0.3 : door === 'w' ? x0 - 0.3 : x;
      const horiz = door === 'n' || door === 's';
      B.box(sign.mat || 'sign', sx2, y0 + 3.15, sz, horiz ? Math.min(w - 2, 8) : 0.3, 1.1, horiz ? 0.3 : Math.min(d - 2, 8), { solid: false });
      W.labels.push({ text: sign.text, x: sx2 + (door === 'e' ? 0.2 : door === 'w' ? -0.2 : 0), y: y0 + 3.7, z: sz + (door === 's' ? 0.2 : door === 'n' ? -0.2 : 0), rot: { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[door], color: sign.color || '#ffffff' });
    }
    for (let f = 0; f < floors; f++) { B.box('lamp', x, y0 + f * fh + fh - 0.42, z, 1.2, 0.1, 0.3, { solid: false }); if (f === 0 || Math.random() < 0.5) W.lights.push({ x, y: y0 + f * fh + fh - 0.9, z, zone: 'surface', c: pick([0xffd8a0, 0xd8e8ff, 0xffe0b0]), i: 35, inside: true }); }
    return bld;
  };
  const doorPos = (b, side = 's', out = 1.5) => side === 's' ? [b.x, b.z1 + out] : side === 'n' ? [b.x, b.z0 - out] : side === 'e' ? [b.x1 + out, b.z] : [b.x0 - out, b.z];
  const counter = (x, z, w, d, y = 0.27) => B.box('counter', x, y, z, w, 1.05, d);
  const reg = (x, y, z, rot, bld) => W.registers.push({ x, y, z, rot, alarm: bld?.alarm, zone: zoneOfY(y), bld: bld?.name });
  const safe = (x, y, z, rot, big, bld) => W.safes.push({ x, y, z, rot, big, alarm: bld?.alarm, zone: zoneOfY(y), bld: bld?.name });
  const atm = (x, z, rot, y = 0.15, name = '') => { W.atms.push({ x, y, z, rot, name }); };
  const dealer = (x, z, rot, name, y = 0.15) => W.dealers.push({ x, y, z, rot, name, kind: 'dealer' });
  const scrap = (x, y, z, gold = false) => W.scrap.push({ x, y, z, gold, zone: zoneOfY(y) });
  const crate = (x, y, z, kind = 'red') => W.crates.push({ x, y, z, kind, zone: zoneOfY(y) });
  const label = (text, x, z, type) => W.labels.push({ text, x, z, map: true, type });

  const props = [];
  const car = (x, z, rot) => {
    props.push([x, z, 4]);
    const name = pick(['normalcar1', 'normalcar2', 'suv', 'taxi', 'sportscar', 'normalcar1', 'normalcar2', 'suv', 'sportscar2']);
    placeK(name, x, 0.0, z, rot + Math.PI / 2, 1.1);
    const ax = Math.abs(Math.cos(rot)) > 0.5;
    B.box('wall', x, 0, z, ax ? 4.3 : 1.9, 1.4, ax ? 1.9 : 4.3, { invisible: true });
  };
  const container = (x, z, ax = true, stack = 1, m = pick(['container', 'container2', 'container3'])) => {
    props.push([x, z, 8]);
    for (let k = 0; k < stack; k++) B.box(k % 2 ? pick(['container', 'container2', 'container3']) : m, x, 0.15 + k * 2.6, z, ax ? 12 : 2.5, 2.6, ax ? 2.5 : 12);
  };
  const woodStack = (x, z) => { props.push([x, z, 3]); B.box('wood', x, 0.15, z, 2.4, 0.8, 1.2); B.box('wood', x + 0.1, 0.95, z, 2.2, 0.6, 1.1); };
  const lampPost = (x, z) => { props.push([x, z, 2]); placeK(pick(['streetlight-single', 'streetlight-single', 'streetlight-double']), x, 0.15, z, x * 7.3, 5.6); B.box('wall', x, 0.15, z, 0.35, 5, 0.35, { invisible: true }); W.lights.push({ x, y: 5.4, z, zone: 'surface', c: 0xffc27a, i: 60, lamp: true }); };
  const fence = (x0, z0, x1, z1, h = 3) => { B.box('fence', (x0 + x1) / 2, 0.15, (z0 + z1) / 2, Math.max(0.15, Math.abs(x1 - x0)), h, Math.max(0.15, Math.abs(z1 - z0))); };

  // ---------- CENTRAL PLAZA (block 2,2) — Central safehouse, Thrift Store, Subway headhouse ----------
  label('Central Plaza', 0, 10, 'poi');
  const thrift = building({ x: 0, z: -22, w: 24, d: 18, h: 5, mat: 'plaster', door: 's', ground: 'metal', name: 'Thrift Store', alarm: true, sign: { text: 'THRIFT', color: '#ffd36b' } });
  counter(-6, -20, 6, 1.2); reg(-7.5, 1.32, -20, 0, thrift); reg(-4.5, 1.32, -20, 0, thrift);
  B.box('plaster', 4, 0.27, -24, 0.3, 4.6, 8); safe(8, 0.27, -28.5, 0, true, thrift);
  for (let i = 0; i < 3; i++) B.box('wood', -8 + i * 4, 0.27, -28, 2.5, 2, 1);
  scrap(-9, 0.27, -16); label('Thrift Store', 0, -22, 'zone');
  const safehouse = building({ x: -18, z: 18, w: 12, d: 10, h: 4.5, mat: 'concrete', door: 'e', style: 'trim', ground: 'trim', name: 'Central Safehouse', sign: { text: 'SAFEHOUSE', color: '#9be3ff' } });
  W.spawns.push([-18, 18], [12, 22], [-4, 6]);
  const sub = building({ x: 16, z: 18, w: 8, d: 6, h: 4, mat: 'trim', door: 'w', style: 'trim', ground: 'trim', name: 'Subway Entrance', windows: false, sign: { text: 'SUBWAY', color: '#ffffff', mat: 'bluesign' } });
  W.teleports.push({ x: 14, y: 0.27, z: 18, to: 'subway', tx: -36, tz: 9, label: 'Go down to Subway' });
  label('Subway', 16, 18, 'zone');
  atm(-6, 2, 0, 0.15, 'Plaza ATM'); atm(6, 2, 0, 0.15, 'Plaza ATM 2');
  B.box('concrete', 0, 0.15, 14, 6, 0.8, 6); B.box('glass', 0, 0.95, 14, 5, 0.1, 5, { solid: false });
  lampPost(-10, 10); lampPost(10, 10); lampPost(-28, -4); lampPost(28, -4);
  W.teleports.push({ x: 10, y: 0.15, z: -33, to: 'sewer', tx: 0, tz: -40, label: 'Climb down manhole (Thrift sewer)' });
  B.box('metal', 10, 0.15, -33, 1.4, 0.06, 1.4, { solid: false });
  W.airdrops.push([0, 26]);
  woodStack(-26, 28); woodStack(24, 30);

  // ---------- block 2,1: Cafe + Barber ----------
  const cafe = building({ x: 0, z: -60, w: 20, d: 14, h: 5, mat: 'brick', door: 's', ground: 'metal', name: 'Cafe', alarm: true, sign: { text: 'CAFE', color: '#ffb27a' } });
  counter(-3, -60, 8, 1.2); reg(-4, 1.32, -60, 0, cafe);
  B.box('brick', 3.5, 0.27, -64.5, 0.3, 4.6, 4.4); B.box('brick', 6.5, 0.27, -60.3, 6.2, 4.6, 0.3);
  safe(8, 0.27, -65, 0, false, cafe);
  for (const [tx, tz] of [[-6, -55], [0, -55], [6, -55]]) { B.box('wood', tx, 0.27, tz, 1.4, 0.8, 1.4); }
  label('Cafe', 0, -60, 'zone'); atm(-7, -51.5, 0, 0.15, 'Cafe ATM');
  const barber = building({ x: -22, z: -88, w: 12, d: 10, h: 4.5, mat: 'plaster', door: 'e', ground: 'metal', name: 'Barber Shop', alarm: true, sign: { text: 'BARBER', color: '#ff8080' } });
  counter(-20, -91, 1.2, 3); reg(-20, 1.32, -91.5, Math.PI / 2, barber);
  B.box('dark', -25, 0.27, -86, 1.2, 1.2, 1.2); B.box('dark', -25, 0.27, -90, 1.2, 1.2, 1.2);
  label('Barber Shop', -22, -88, 'poi');
  car(-38 + 2, -75, Math.PI / 2); car(-42, -60, Math.PI / 2); lampPost(-28, -50);

  // ---------- block 3,1: Basketball court + dealer ----------
  B.box('court', 75, 0, -78, 26, 0.24, 16);
  for (const zz of [-78]) B.box('line', 75, 0.24, zz, 0.2, 0.02, 16, { solid: false });
  for (const xx of [63.5, 86.5]) { B.box('metal', xx, 0.24, -78, 0.25, 3.2, 0.25); B.box('glass', xx + (xx < 75 ? 0.4 : -0.4), 3.2, -78, 0.1, 1.1, 1.6, { solid: false }); }
  fence(61, -87, 89, -87, 3.4); fence(61, -69, 70, -69, 3.4); fence(80, -69, 89, -69, 3.4); fence(61, -87, 61, -69, 3.4); fence(89, -87, 89, -69, 3.4);
  label('Basketball Court', 75, -78, 'zone');
  dealer(53, -66, Math.PI / 2, 'Basketball Dealer'); B.box('green', 52.3, 2.8, -66, 0.1, 0.25, 0.25, { solid: false });
  atm(52, -90, Math.PI / 2, 0.15, 'Basketball ATM');
  W.airdrops.push([75, -78]);
  const apt1 = building({ x: 80, z: -56, w: 30, d: 12, h: 4, floors: 3, mat: 'brick2', door: 'n', name: 'Apartments', sign: null });
  scrap(70, 0.27, -55); scrap(70, 4.15, -57);

  // ---------- block 3,2: Armory 1 (blue) ----------
  const arm1 = building({ x: 62, z: -24, w: 16, d: 12, h: 5, mat: 'concrete', door: 'n', style: 'trim', ground: 'trim', name: 'Armory 1', sign: { text: 'ARMORY', color: '#9fc6ff', mat: 'bluesign' } });
  counter(62, -24, 10, 1.2);
  W.armories.push({ x: 62, y: 0.27, z: -22, rot: 0, name: 'Armory 1', color: 'blue' });
  label('Armory 1', 62, -24, 'armory');
  car(70, -38 + 2, 0); woodStack(90, 0); container(84, 20, true, 2);
  building({ x: 70, z: 14, w: 22, d: 14, h: 5, mat: 'brick', door: 'w', name: 'Storefronts' });
  scrap(62, 0.27, 14);

  // ---------- block 0,0: Tower ----------
  const tower = building({ x: -142, z: -142, w: 18, d: 18, h: 4, floors: 5, mat: 'concrete', door: 's', name: 'Tower', alarm: true, sign: { text: 'TOWER', color: '#ffffff' } });
  for (let f = 0; f < 5; f++) {
    const yy = f === 0 ? 0.27 : 0.15 + f * 4;
    if (f === 1 || f === 4) safe(-144, yy, -149.5, 0, true, tower);
    if (f === 0 || f === 2 || f === 3) safe(-139.5, yy, -149.5, 0, false, tower);
    if (f === 2 || f === 4) crate(-148, yy, -136, 'red');
    if (f !== 1) scrap(-136, yy, -138);
  }
  label('Tower', -142, -142, 'zone');
  dealer(-142, -153.5, 0, 'Tower Dealer'); B.box('green', -142, 2.8, -152.7, 0.25, 0.25, 0.1, { solid: false });
  atm(-131, -130.5, 0, 0.15, 'Tower ATM');
  W.spawns.push([-142, -125]);
  container(-160, -120, false, 2); car(-125, -116 + 2, 0.1); woodStack(-122, -160);

  // ---------- block 0,1: Motel ----------
  const motel = building({ x: -144, z: -76, w: 34, d: 10, h: 4, mat: 'plaster', door: 'e', doors2: ['w'], name: 'Motel', sign: { text: 'MOTEL', color: '#ff7ad8', mat: 'redsign' } });
  for (let i = 0; i < 4; i++) B.box('plaster', -157 + i * 8, 0.27, -78, 0.3, 3.6, 5.6);
  for (let i = 0; i < 4; i++) B.box('wood', -159 + i * 8, 0.27, -78.6, 2.2, 0.6, 3);
  label('Motel', -144, -76, 'zone'); atm(-126, -70, -Math.PI / 2, 0.15, 'Motel ATM');
  W.spawns.push([-144, -66]); scrap(-150, 0.27, -73);
  car(-140, -58, 0); car(-150, -58, 0.05);

  // ---------- block 4,0: Factory ----------
  const fac = building({ x: 143, z: -140, w: 34, d: 26, h: 10, mat: 'metal', door: 'w', doors2: ['n'], doorW: 4, style: 'metal', ground: 'metal', name: 'Factory', alarm: false, windows: false, sign: { text: 'FACTORY', color: '#ffe08a' } });
  for (let i = 0; i < 3; i++) { B.box('rust', 135 + i * 8, 0.27, -142, 3, 3, 6); }
  B.box('metal', 150, 4, -150, 10, 0.3, 4); for (let s = 0; s < 9; s++) B.box('concrete', 139.9 + s * 0.6, 0.27, -149, 0.6, 0.45 * (s + 1), 1.2);
  safe(131, 0.27, -151, 0, false, fac); safe(151, 4.3, -151, 0, false, fac); safe(157, 0.27, -130, 0, false, fac);
  crate(140, 0.27, -130, 'red'); scrap(152, 0.27, -134); scrap(130, 0.27, -133);
  label('Factory', 143, -140, 'zone');
  dealer(122, -119.5, Math.PI / 2, 'Factory Dealer'); B.box('green', 122, 2.8, -119.8, 0.25, 0.25, 0.1, { solid: false });
  atm(124, -158, Math.PI / 2, 0.15, 'Factory ATM');
  container(160, -110 - 10, true, 2);

  // ---------- block 4,1: Workshop ----------
  const ws = building({ x: 140, z: -80, w: 18, d: 14, h: 5, mat: 'brick2', door: 'w', doorW: 4, ground: 'metal', name: 'Workshop', alarm: true, sign: { text: 'WORKSHOP', color: '#ffcf6b' } });
  counter(144, -84, 6, 1.2); reg(143, 1.32, -84, 0, ws); safe(147, 0.27, -74.5, Math.PI, false, ws);
  B.box('metal', 136, 0.27, -76, 3, 1.1, 1.4); car(140, -80, 0, 'cargray');
  scrap(135, 0.27, -86); label('Workshop', 140, -80, 'zone');
  dealer(124, -64, Math.PI / 2, 'Workshop Dealer'); B.box('green', 123.3, 2.8, -64, 0.1, 0.25, 0.25, { solid: false });
  atm(124, -96, Math.PI / 2, 0.15, 'Workshop ATM');

  // ---------- block 3,0: Warehouse ----------
  const wh = building({ x: 76, z: -142, w: 40, d: 26, h: 9, mat: 'rust', door: 'n', doorW: 5, style: 'metal', ground: 'metal', name: 'Warehouse', windows: false, sign: { text: 'WAREHOUSE', color: '#dddddd' } });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) B.box('wood', 62 + i * 8, 0.27, -138 + j * 7, 4, 2.4 + (i % 2) * 1.2, 2.4);
  B.box('metal', 89, 4.6, -148, 12, 0.3, 4); for (let s = 0; s < 11; s++) B.box('concrete', 76.7 + s * 0.6, 0.27, -148, 0.6, 0.42 * (s + 1), 1.4);
  safe(93, 4.9, -149, 0, false, wh); scrap(60, 0.27, -150); crate(91, 0.27, -132, 'red');
  label('Warehouse', 76, -142, 'zone');
  container(60, -120, true, 1);

  // ---------- block 1,0: construction ----------
  for (let i = 0; i < 4; i++) { B.box('concrete', -90 + i * 10, 0.15, -150, 0.8, 14, 0.8); B.box('concrete', -90 + i * 10, 0.15, -130, 0.8, 14, 0.8); }
  B.box('concrete', -75, 7, -140, 32, 0.4, 22); for (let s = 0; s < 16; s++) B.box('wood', -95, 0.15, -127 - s * 0.7, 2, 0.44 * (s + 1), 0.7);
  woodStack(-80, -125); woodStack(-70, -155); scrap(-70, 7.4, -145); scrap(-85, 0.15, -140); crate(-60, 7.4, -134, 'red');
  label('Construction', -75, -140, 'poi'); W.airdrops.push([-75, -140]);

  // ---------- block 1,1 & 0,2: apartments + alleys ----------
  building({ x: -75, z: -78, w: 26, d: 16, h: 4, floors: 2, mat: 'brick', door: 'e', name: 'Apartments West' });
  scrap(-80, 0.27, -78); container(-60, -55, true, 1);
  building({ x: -145, z: -10, w: 26, d: 20, h: 4, floors: 2, mat: 'brick2', door: 'e', name: 'Row Houses' });
  scrap(-150, 4.15, -12); car(-125, 10, Math.PI / 2);
  label('Alleys', -145, -10, 'poi');

  // ---------- block 1,2: Garages ----------
  for (let i = 0; i < 5; i++) {
    const gx = -95 + i * 11;
    building({ x: gx, z: 16, w: 10, d: 12, h: 4, mat: 'concrete', door: 'n', doorW: 5, name: 'Garage ' + (i + 1), windows: false });
    if (i % 2) car(gx, 17, Math.PI / 2, pick(['carred', 'carblue', 'cargray']));
    else scrap(gx, 0.27, 19);
  }
  label('Garages', -75, 16, 'poi'); atm(-60, -2, 0, 0.15, 'Garages ATM');

  // ---------- block 1,3: Gas station + blown-up tankers ----------
  const gas = building({ x: -80, z: 72, w: 14, d: 10, h: 4.5, mat: 'plaster', door: 'n', ground: 'metal', style: 'trim', name: 'Gas Station', alarm: true, sign: { text: 'GAS', color: '#ffe36b', mat: 'redsign' } });
  counter(-80, 74, 6, 1.2); reg(-81, 1.32, 74, Math.PI, gas);
  B.box('roof', -70, 5.2, 58, 20, 0.5, 10, { solid: false }); for (const [px, pz] of [[-78, 55], [-62, 55], [-78, 61], [-62, 61]]) B.box('metal', px, 0.15, pz, 0.5, 5.05, 0.5);
  B.box('metal', -73, 0.15, 58, 1, 1.6, 0.8); B.box('metal', -67, 0.15, 58, 1, 1.6, 0.8);
  for (const [tx, tz, r] of [[-96, 88, 0], [-92, 95, 0.3]]) { B.box('black', tx, 0.15, tz, 12, 3, 3); B.box('rust', tx + 7.5, 0.15, tz, 3, 3.3, 3); }
  label('Gas Station', -75, 66, 'zone'); atm(-88.5, 66, Math.PI / 2, 0.15, 'Gas Station ATM');
  car(-56, 80, 0.2); W.airdrops.push([-70, 90]);

  // ---------- block 0,3 / 0,4: Vibin' ----------
  const vib = building({ x: -142, z: 142, w: 24, d: 18, h: 6, mat: 'vibe', door: 'n', name: "Vibin'", sign: { text: "VIBIN'", color: '#ff5fc8', mat: 'neon' } });
  B.box('neon', -142, 0.27, 148, 10, 0.6, 1); B.box('dark', -146, 0.27, 140, 2, 1, 2); B.box('dark', -138, 0.27, 140, 2, 1, 2);
  scrap(-150, 0.27, 148); crate(-133, 0.27, 148, 'red');
  label("Vibin'", -142, 142, 'zone'); atm(-129, 128, 0, 0.15, "Vibin' ATM");
  W.teleports.push({ x: -142, y: 0.15, z: 122, to: 'sewer', tx: -142, tz: 112, label: "Climb down manhole (Vibin' sewer)" });
  B.box('metal', -142, 0.15, 122, 1.4, 0.06, 1.4, { solid: false });
  building({ x: -145, z: 70, w: 22, d: 18, h: 4, floors: 2, mat: 'brick', door: 'e', name: 'Tenements' });
  scrap(-140, 0.27, 70); container(-160, 95, true, 2);

  // ---------- block 2,3/2,4: market + south ----------
  building({ x: 0, z: 72, w: 30, d: 16, h: 5, mat: 'brick2', door: 'n', style: 'trim', ground: 'trim', name: 'Market Hall', sign: { text: 'MARKET', color: '#ffffff' } });
  scrap(-8, 0.27, 72); scrap(8, 0.27, 74);
  container(-15, 140, true, 2); container(10, 140, true, 1); container(-15, 155, true, 1); container(10, 155, true, 3); container(25, 148, false, 2);
  label('Container Yard', 0, 148, 'poi'); W.airdrops.push([0, 125]);
  scrap(-2, 0.15, 148); crate(3, 0.15, 132, 'red');

  // ---------- block 3,4: Pizzeria (Illegal Pizza) ----------
  const piz = building({ x: 70, z: 145, w: 18, d: 14, h: 5, mat: 'brick', door: 'n', ground: 'metal', name: 'Pizzeria', alarm: true, sign: { text: 'PIZZA', color: '#ffd36b', mat: 'redsign' } });
  counter(70, 143, 8, 1.2); reg(68, 1.32, 143, Math.PI, piz); B.box('pizza', 74, 0.27, 148, 3, 1.6, 2);
  label('Pizzeria', 70, 145, 'zone'); atm(60, 127.5, 0, 0.15, 'Pizzeria ATM');

  // ---------- block 3,3: Armory 2 (red) behind buildings across from Pizzeria ----------
  building({ x: 70, z: 95, w: 26, d: 10, h: 5, mat: 'brick2', door: 'w', name: 'Shops' });
  const arm2 = building({ x: 92, z: 68, w: 14, d: 12, h: 5, mat: 'concrete', door: 'w', style: 'trim', ground: 'trim', name: 'Armory 2', sign: { text: 'ARMORY', color: '#ff9f9f', mat: 'redsign' } });
  counter(94, 68, 1.2, 8);
  W.armories.push({ x: 96, y: 0.27, z: 68, rot: Math.PI / 2, name: 'Armory 2', color: 'red' });
  label('Armory 2', 92, 68, 'armory');
  W.teleports.push({ x: 100, y: 0.15, z: 82, to: 'sewer', tx: 92, tz: 92, label: 'Enter cave (Armory 2 sewer)' });
  B.box('rock', 100, 0.15, 86, 6, 4, 3);

  // ---------- block 4,3: Junkyard ----------
  fence(118, 60, 170, 60); fence(118, 104, 170, 104); fence(118, 60, 118, 78); fence(118, 86, 118, 104);
  for (let i = 0; i < 14; i++) car(rand(124, 166), rand(66, 88), randi(0, 3) * Math.PI / 2 + rand(-0.3, 0.3), pick(['rust', 'cargray', 'carred']));
  B.box('rust', 160, 0.15, 66, 6, 5, 6);
  const jb = building({ x: 142, z: 96, w: 10, d: 8, h: 4, mat: 'rust', door: 'n', name: 'Junkyard Office', alarm: false });
  counter(142, 97, 4, 1); reg(141, 1.32, 97, Math.PI, jb);
  safe(145.5, 0.27, 99, Math.PI, false, jb); safe(124, 0.15, 101, Math.PI, false, null); safe(164, 0.15, 101, Math.PI, true, null);
  for (let i = 0; i < 6; i++) scrap(rand(124, 166), 0.15, rand(64, 92));
  crate(130, 0.15, 64, 'red');
  label('Junkyard', 144, 82, 'zone'); W.airdrops.push([144, 82]); atm(116, 82, Math.PI / 2, 0.15, 'Junkyard ATM');

  // ---------- block 4,2 / 4,4 ----------
  building({ x: 143, z: 10, w: 30, d: 18, h: 4, floors: 2, mat: 'brick', door: 'w', name: 'Offices' });
  scrap(140, 0.27, 12); scrap(148, 4.15, 6);
  container(130, 140, false, 2); container(150, 140, false, 1); container(160, 155, true, 2); woodStack(130, 160);
  dealer(-22, -33, 0, 'Thrift Store Dealer'); B.box('green', -22, 2.8, -33.6, 0.25, 0.25, 0.1, { solid: false });

  // street props
  for (let i = 0; i < 22; i++) {
    const r = pick(ROADS), t = rand(-160, 160), v = i % 2;
    if (ROADS.some(rr => Math.abs(t - rr) < 10)) continue;
    car(v ? r + rand(-3, 3) : t, v ? t : r + rand(-3, 3), (v ? Math.PI / 2 : 0) + rand(-0.4, 0.4));
  }
  for (const r of ROADS) for (let t = -150; t < 160; t += 40) { if (!ROADS.some(rr => Math.abs(t - rr) < 9)) { lampPost(r + 7.2, t); lampPost(r - 7.2, t + 20); } }

  // ---------- SUBWAY (y -12) ----------
  const dungeon = (zone, ox, oz, y, cs, rows, wallMat, floorMat, ceilH = 5) => {
    const lv = { '.': 0, h: -0.5, t: -1.0, w: -0.5 };
    const R = rows.length, C = rows[0].length;
    for (let j = 0; j < R; j++) {
      let i = 0;
      while (i < C) {
        const ch = rows[j][i];
        if (ch === '#') { let k = i; while (k < C && rows[j][k] === '#') k++; B.box(wallMat, ox + (i + k) / 2 * cs, y - 1.5, oz + (j + 0.5) * cs, (k - i) * cs, ceilH + 1.5, cs, { zone }); i = k; continue; }
        if (ch === 'g') { W.pits.push({ x0: ox + i * cs, z0: oz + j * cs, x1: ox + (i + 1) * cs, z1: oz + (j + 1) * cs, y }); i++; continue; }
        const key = lv[ch] !== undefined ? ch : '.';
        let k = i; while (k < C && rows[j][k] !== '#' && rows[j][k] !== 'g' && ((lv[rows[j][k]] !== undefined ? rows[j][k] : '.') === key)) k++;
        const top = y + lv[key];
        B.box(key === 't' ? 'rail' : key === 'w' ? 'sewer' : floorMat, ox + (i + k) / 2 * cs, y - 1.5, oz + (j + 0.5) * cs, (k - i) * cs, top - (y - 1.5), cs, { zone });
        if (key === 'w') W.waters.push({ x0: ox + i * cs, z0: oz + j * cs, x1: ox + k * cs, z1: oz + (j + 1) * cs, y: y - 0.35 });
        i = k;
      }
    }
    B.box('dark', ox + C * cs / 2, y + ceilH, oz + R * cs / 2, C * cs, 1, R * cs, { zone });
    W.under[zone] = { ox, oz, cs, rows: rows.slice() };
    const cell = (i, j) => [ox + (i + 0.5) * cs, oz + (j + 0.5) * cs];
    return { cell, rows };
  };
  const subRows = [
    '##############################',
    '#............................#',
    '#............................#',
    '#............................#',
    'hhtttttttttttttttttttttttttthh',
    'hhtttttttttttttttttttttttttthh',
    '#............................#',
    '#............................#',
    '#............................#',
    '##############################',
  ];
  const sw = dungeon('subway', -45, 0, -12, 3, subRows, 'subtile', 'concrete', 6);
  B.box('dark', -46.5, -13.5, 15, 3, 7.5, 6, { zone: 'subway' }); B.box('dark', 46.5, -13.5, 15, 3, 7.5, 6, { zone: 'subway' });
  W.trackZone = { x0: -45, x1: 45, z0: 12, z1: 18, y: -13 };
  for (let i = 0; i < 6; i++) { W.lights.push({ x: -38 + i * 15, y: -7, z: 6, zone: 'subway', c: 0xe8f0ff, i: 40 }, { x: -38 + i * 15, y: -7, z: 23, zone: 'subway', c: 0xe8f0ff, i: 40 }); B.box('tube', -38 + i * 15, -6.25, 6, 2.6, 0.12, 0.14, { solid: false, zone: 'subway' }); B.box('tube', -38 + i * 15, -6.25, 23, 2.6, 0.12, 0.14, { solid: false, zone: 'subway' }); }
  for (let i = 0; i < 5; i++) B.box('concrete', -32 + i * 16, -12, 8, 1, 6, 1, { zone: 'subway' });
  safe(-43, -12, 4, 0, false); safe(-10, -12, 4, 0, false); safe(26, -12, 25.8, Math.PI, false); safe(10, -12, 4, 0, true);
  scrap(-20, -12, 4); scrap(30, -12, 25); crate(-25, -12, 26, 'red');
  W.teleports.push({ x: -38, y: -12, z: 8, to: 'surface', tx: 11, tz: 18, label: 'Stairs up to Plaza' });
  for (let s = 0; s < 6; s++) B.box('concrete', -38, -12, 3.3 + s * 0.5, 2.4, 0.3 * (s + 1), 0.5, { solid: false, zone: 'subway' });
  W.teleports.push({ x: 41, y: -12, z: 26, to: 'vibe', tx: 2, tz: -5.5, label: 'Ride elevator down to Vibe Check', elevator: true });
  B.box('metal', 41, -12, 26.6, 4, 5, 0.3, { solid: false, zone: 'subway' }); B.box('lamp', 41, -7.2, 26.3, 1.4, 0.2, 0.3, { solid: false, zone: 'subway' });
  W.teleports.push({ x: -41, y: -12, z: 26, to: 'sewer', tx: 20, tz: 14, label: 'Ladder down to sewer' });
  B.box('rail', -41, -12, 26.8, 1.2, 5, 0.2, { solid: false, zone: 'subway' });
  atm(-28, 4, 0, -12, 'Subway ATM');
  label('Subway platforms', 0, 13, 'zone');
  W.spawnsSub = [[-30, 5], [30, 24]];

  // ---------- SEWERS (y -26) ----------
  const SC = 4, SO = -160, SN = 80;
  const sg = Array.from({ length: SN }, () => Array(SN).fill('#'));
  const toC = (v) => Math.floor((v - SO) / SC);
  const carve = (x0, z0, x1, z1, ch = '.') => { for (let i = toC(Math.min(x0, x1)); i <= toC(Math.max(x0, x1)); i++) for (let j = toC(Math.min(z0, z1)); j <= toC(Math.max(z0, z1)); j++) if (i > 0 && j > 0 && i < SN - 1 && j < SN - 1) sg[j][i] = ch; };
  const tunnel = (x0, z0, x1, z1) => {
    if (z0 === z1) { carve(x0, z0 - 4, x1, z0 + 4); carve(x0, z0, x1, z0, 'w'); }
    else { carve(x0 - 4, z0, x0 + 4, z1); carve(x0, z0, x0, z1, 'w'); }
  };
  tunnel(-142, 0, 100, 0); tunnel(0, -40, 0, 100); tunnel(-142, 0, -142, 112); tunnel(92, 0, 92, 92); tunnel(-142, 100, 0, 100); tunnel(20, 0, 20, 14);
  carve(-12, -52, 12, -36); carve(-82, -14, -58, 14); carve(-150, 104, -134, 118); carve(84, 86, 100, 98); carve(14, 10, 26, 18);
  for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) if (sg[j][i] === 'w') { const n = [sg[j - 1]?.[i], sg[j + 1]?.[i], sg[j]?.[i - 1], sg[j]?.[i + 1]]; if (n.includes('#')) sg[j][i] = '.'; }
  dungeon('sewer', SO, SO, -26, SC, sg.map(r => r.join('')), 'sewer', 'sewer', 5);
  W.sewerBounds = { x0: SO, z0: SO, x1: SO + SN * SC, z1: SO + SN * SC };
  safe(8, -26, -50, 0, true); label('Thrift Sewer Safe Room', 0, -44, 'zone');
  safe(-78, -26, -12, 0, true); crate(-62, -26, 10, 'mystery'); label('?', -70, 0, 'zone');
  safe(24, -26, 12, Math.PI, false);
  scrap(-60, -26, 4); scrap(50, -26, 3); scrap(-140, -26, 60); scrap(2, -26, 60); scrap(-60, -26, 103);
  W.rebelSpots.push([20, 16, 'Subway Sewer Entrance'], [92, 94, 'Armory 2 Cave Access'], [-6, -40, 'Thrift Sewer Safe Room'], [-74, 8, 'Giant Safe Room (?)'], [-142, 108, "Vibin' Sewer Section"]);
  W.teleports.push({ x: 0, y: -26, z: -40, to: 'surface', tx: 10, tz: -31, label: 'Climb ladder to Thrift Store' });
  W.teleports.push({ x: -142, y: -26, z: 112, to: 'surface', tx: -142, tz: 125, label: "Climb ladder to Vibin'" });
  W.teleports.push({ x: 92, y: -26, z: 92, to: 'surface', tx: 104, tz: 82, label: 'Climb out to Armory 2' });
  W.teleports.push({ x: 20, y: -26, z: 14, to: 'subway', tx: -38, tz: 24, label: 'Ladder up to Subway' });
  for (const [lx, lz] of [[0, -40], [-142, 112], [92, 92], [20, 14]]) B.box('rail', lx, -26, lz - 1.8, 1.2, 5, 0.2, { solid: false, zone: 'sewer' });
  for (let i = -140; i < 100; i += 20) { B.box('tube', i, -21.2, -3.5, 2.2, 0.12, 0.14, { solid: false, zone: 'sewer' }); W.lights.push({ x: i, y: -22, z: -3, zone: 'sewer', c: 0xc8ffb0, i: 30 }); }
  for (const [lx, lz] of [[0, 60], [0, 30], [-60, 100], [-120, 100], [-142, 50], [92, 50], [0, -45], [-70, 0], [20, 14]]) W.lights.push({ x: lx, y: -22, z: lz, zone: 'sewer', c: 0xc8ffb0, i: 30 });
  W.spawnsSewer = [[-40, 3], [0, 50], [60, -3]];

  // ---------- VIBE CHECK (y -50) ----------
  const vRows = [
    '######################',
    '#....................#',
    '#....................#',
    '#..gggggggggggggggg..#',
    '#..gggggggggggggggg..#',
    '#..gggggggggggggggg..#',
    '#..gggggggggggggggg..#',
    '#....................#',
    '#....................#',
    '########...###########',
    '#######.....##########',
    '######.......#########',
    '######.......#########',
    '######################',
  ];
  dungeon('vibe', -33, -12, -50, 3, vRows, 'vibe', 'grate', 7);
  B.box('rust', -33 + 33, -64, -12 + 15, 48, 0.5, 12, { solid: false, zone: 'vibe' });
  for (let i = 0; i < 8; i++) B.box('metal', -21 + i * 6, -63.5, -3, 0.6, 10, 0.6, { solid: false, zone: 'vibe' });
  for (let i = 0; i < 5; i++) B.box('neon', -27 + i * 12, -43.3, -10, 4, 0.2, 0.4, { solid: false, zone: 'vibe' });
  safe(-28, -50, -8, 0, true); safe(28, -50, -8, 0, true); safe(0, -50, 23, Math.PI, true);
  crate(-24, -50, 12, 'red'); crate(24, -50, 12, 'red'); crate(0, -50, 20, 'gold');
  scrap(-28, -50, 12, true); scrap(28, -50, 12, true); scrap(-4, -50, 21, true); scrap(10, -50, -8);
  W.teleports.push({ x: 2, y: -50, z: -7.5, to: 'subway', tx: 39, tz: 24, label: 'Elevator (must be called from above)', elevatorBottom: true });
  B.box('metal', 2, -50, -8.85, 4, 6, 0.3, { solid: false, zone: 'vibe' });
  B.box('dark', 0, -64, -3.25, 49, 12.5, 0.5, { zone: 'vibe' }); B.box('dark', 0, -64, 9.25, 49, 12.5, 0.5, { zone: 'vibe' });
  B.box('dark', -24.25, -64, 3, 0.5, 12.5, 12, { zone: 'vibe' }); B.box('dark', 24.25, -64, 3, 0.5, 12.5, 12, { zone: 'vibe' });
  label('Vibe Check', 0, 0, 'zone');
  W.spawnsVibe = [[-26, 5], [26, 5]];

  // ---------- dense filler city ----------
  const reserved = [
    [61, -87, 89, -69], [116, 58, 172, 106], [-84, 50, -56, 66], [-106, 82, -82, 100], [-26, 126, 36, 164], [-100, -158, -50, -118], [-14, -2, 14, 32],
  ];
  for (const b of W.buildings) reserved.push([b.x0 - 5, b.z0 - 5, b.x1 + 5, b.z1 + 5]);
  const pts = [...W.atms, ...W.dealers, ...W.armories, ...W.registers, ...W.safes, ...W.scrap, ...W.crates, ...W.teleports].filter(p => p.y > -6).map(p => [p.x, p.z, 5]);
  for (const [x, z] of W.spawns) pts.push([x, z, 6]);
  for (const [x, z] of W.airdrops) pts.push([x, z, 9]);
  pts.push(...props);
  const free = (x0, z0, x1, z1) => !reserved.some(r => x0 < r[2] && x1 > r[0] && z0 < r[3] && z1 > r[1]) && !pts.some(([px, pz, r]) => px > x0 - r && px < x1 + r && pz > z0 - r && pz < z1 + r);
  let lastNf = 0;
  const fill = (x0, z0, x1, z1, face, forceNf) => {
    x1 = x0 + Math.max(6, Math.round((x1 - x0) / 2) * 2); z1 = z0 + Math.max(6, Math.round((z1 - z0) / 2) * 2);
    let nf = [2, 3, 3, 4, 4, 5, 6][randi(0, 6)]; if (nf === lastNf) nf += nf > 3 ? -1 : 1; if (forceNf) nf = forceNf === lastNf ? forceNf + 1 : forceNf; lastNf = nf;
    const style = Math.random() < 0.82 ? 'brick' : 'trim';
    const ground = pick(['metal', 'metal', 'brick', 'trim']);
    const horiz = face === 'n' || face === 's';
    const along0 = horiz ? x0 : z0, span = horiz ? x1 - x0 : z1 - z0;
    const doorAt = along0 + 1 + 2 * Math.floor((span / 2) * (Math.random() < 0.5 ? 0.3 : 0.65));
    const top = kitShell({ x0, z0, x1, z1, floors: Array(nf).fill(3), style, ground, doors: { [face]: doorAt }, closedDoors: true, cornice: style === 'trim' ? 'trim' : pick(['brick', 'brick', 'metal']) });
    B.box('wall', (x0 + x1) / 2, 0.15, (z0 + z1) / 2, x1 - x0 + 0.4, top + 0.85, z1 - z0 + 0.4, { invisible: true });
    B.box('roofK', (x0 + x1) / 2, top - 0.2, (z0 + z1) / 2, x1 - x0 - 0.02, 0.2, z1 - z0 - 0.02, { solid: false });
    for (let k = 0; k < randi(1, 3); k++) placeK('prop-acunit', rand(x0 + 1.5, x1 - 1.5), top, rand(z0 + 1.5, z1 - 1.5), randi(0, 3) * Math.PI / 2, 1.6);
    if (Math.random() < 0.4) { B.box('metal', (x0 + x1) / 2 - 1, top, (z0 + z1) / 2, 0.3, 2.2, 0.3, { solid: false }); B.box('rust', (x0 + x1) / 2 - 1, top + 2.2, (z0 + z1) / 2, 1.6, 1.8, 1.6, { solid: false }); }
    const sg = face === 's' || face === 'e' ? 1 : -1, fz = face === 'n' ? z0 : z1, fx = face === 'w' ? x0 : x1;
    if (ground !== 'metal' && Math.random() < 0.7) {
      const sx = horiz ? doorAt : fx + sg * 0.2, sz = horiz ? fz + sg * 0.2 : doorAt, r = ROT[face] + Math.PI;
      placeK('stairs-entrance-concrete', sx, 0.15, sz, r, 1, 0.3);
    }
    for (let i = 0; i < Math.floor(span / 2); i++) if (Math.random() < 0.18) { const t = along0 + 1 + 2 * i; if (Math.abs(t - doorAt) < 2) continue; horiz ? placeK('prop-acunit', t, 0.15 + 3 * randi(1, nf - 1) + 0.2, fz + sg * 0.22, ROT[face], 1.3) : placeK('prop-acunit', fx + sg * 0.22, 0.15 + 3 * randi(1, nf - 1) + 0.2, t, ROT[face], 1.3); }
    for (let k = 0; k < randi(0, 3); k++) { const t = along0 + rand(0.8, span - 0.8); if (Math.abs(t - doorAt) < 2) continue; W.bags.push(horiz ? [t, 0.15, fz + sg * rand(0.6, 1.2), rand(0.8, 1.3)] : [fx + sg * rand(0.6, 1.2), 0.15, t, rand(0.8, 1.3)]); }
    const lx = horiz ? doorAt + 1.2 : fx + sg * 0.4, lz = horiz ? fz + sg * 0.4 : doorAt + 1.2;
    B.box('lamp', lx, 3.0, lz, 0.22, 0.3, 0.22, { solid: false });
    if (Math.random() < 0.55) W.lights.push({ x: lx + (horiz ? 0 : sg * 0.6), y: 3.0, z: lz + (horiz ? sg * 0.6 : 0), zone: 'surface', c: pick([0xffb870, 0xffd090, 0xb8d8ff]), i: 16, lamp: true, small: true });
    if (nf >= 3 && Math.random() < 0.55) fireEscape(face, x0, z0, x1, z1, nf, 3);
    W.buildings.push({ name: '', filler: true, x: (x0 + x1) / 2, z: (z0 + z1) / 2, x0, x1, z0, z1, h: top });
    reserved.push([x0 + 0.01, z0 + 0.01, x1 - 0.01, z1 - 0.01]);
    return { x0, z0, x1, z1, face };
  };
  const SB = 3.5;
  BLK.forEach(([bx0, bx1]) => BLK.forEach(([bz0, bz1]) => {
    const ix0 = bx0 + SB + 0.6, ix1 = bx1 - SB - 0.6, iz0 = bz0 + SB + 0.6, iz1 = bz1 - SB - 0.6;
    for (const side of ['n', 's', 'w', 'e']) {
      const horiz = side === 'n' || side === 's';
      const a0 = horiz ? ix0 : iz0, a1 = horiz ? ix1 : iz1;
      let t = a0 + (horiz ? 0 : 22);
      const tEnd = a1 - (horiz ? 0 : 22);
      let k = 0;
      while (t < tEnd - 5) {
        const len = Math.min(2 * randi(4, 8), tEnd - t), dep = 2 * randi(8, 11);
        if (len < 7) break;
        const sb = (k++ % 2) * 0.16;
        const r = side === 'n' ? [t, iz0 + sb, t + len, iz0 + sb + dep] : side === 's' ? [t, iz1 - dep - sb, t + len, iz1 - sb] : side === 'w' ? [ix0 + sb, t, ix0 + sb + dep, t + len] : [ix1 - dep - sb, t, ix1 - sb, t + len];
        let made = null; if (free(...r)) made = fill(...r, side);
        const built = made ? ((side === 'n' || side === 's') ? made.x1 - made.x0 : made.z1 - made.z0) : len;
        t += built + (Math.random() < 0.25 ? rand(3, 4.5) : 0.3);
      }
    }
  }));
  for (const side of ['n', 's', 'w', 'e']) {
    let t = -EDGE - 10;
    while (t < EDGE + 10) {
      const len = 2 * randi(5, 9), dep = 2 * randi(7, 10), o = EDGE + 0.6;
      const r = side === 'n' ? [t, -o - dep, t + len, -o] : side === 's' ? [t, o, t + len, o + dep] : side === 'w' ? [-o - dep, t, -o, t + len] : [o, t, o + dep, t + len];
      const face = side === 'n' ? 's' : side === 's' ? 'n' : side === 'w' ? 'e' : 'w';
      lastNf = randi(4, 8) + 1;
      const m = fill(...r, face, lastNf - 1 + randi(0, 3));
      t += (m ? ((side === 'n' || side === 's') ? m.x1 - m.x0 : m.z1 - m.z0) : len) + 0.3;
    }
  }
  // iron gates across alley mouths, utility poles + wires, trees, litter, potholes
  const fillers = W.buildings.filter(b => b.filler);
  for (const a of fillers) for (const c of fillers) {
    if (a === c || Math.random() > 0.5) continue;
    for (const [side, A, Bb] of [['x', a, c]]) {
      if (Math.abs(a.z0 - c.z0) < 0.01 && c.x0 > a.x1 && c.x0 - a.x1 < 6) {
        const gx0 = a.x1, gx1 = c.x0, z = a.z0 + 0.3, n = Math.floor((gx1 - gx0) / 0.16);
        for (let k = 1; k < n; k++) B.box('iron', gx0 + k * (gx1 - gx0) / n, 0.15, z, 0.04, 2.6, 0.04, { solid: false });
        B.box('iron', (gx0 + gx1) / 2, 2.6, z, gx1 - gx0, 0.08, 0.08, { solid: false }); B.box('iron', (gx0 + gx1) / 2, 1.2, z, gx1 - gx0, 0.06, 0.06, { solid: false });
        B.collider(gx0, 0.15, z - 0.1, gx1, 2.8, z + 0.1);
      }
    }
  }
  BLK.forEach(([bx0, bx1]) => BLK.forEach(([bz0, bz1]) => {
    for (const [ax, fixed] of [[true, bz0 + 0.6], [true, bz1 - 0.6], [false, bx0 + 0.6], [false, bx1 - 0.6]]) {
      const a0 = ax ? bx0 : bz0, a1 = ax ? bx1 : bz1;
      let prev = null;
      for (let t = a0 + 6; t < a1 - 4; t += rand(22, 30)) {
        const [px, pz] = ax ? [t, fixed] : [fixed, t];
        if (!free(px - 0.6, pz - 0.6, px + 0.6, pz + 0.6)) { prev = null; continue; }
        B.box('pole', px, 0.15, pz, 0.3, 9.5, 0.3); B.box('pole', px, 8.6, pz, ax ? 0.2 : 2.6, 0.18, ax ? 2.6 : 0.2, { solid: false });
        for (const o of [-1.1, 1.1]) B.box('frame', px + (ax ? 0 : o), 8.78, pz + (ax ? o : 0), 0.1, 0.18, 0.1, { solid: false });
        reserved.push([px - 0.8, pz - 0.8, px + 0.8, pz + 0.8]);
        if (prev) for (const o of [-1.1, 1.1]) W.wires.push([[prev[0] + (ax ? 0 : o), 8.9, prev[1] + (ax ? o : 0)], [px + (ax ? 0 : o), 8.9, pz + (ax ? o : 0)]]);
        prev = [px, pz];
      }
    }
    for (let t = 0; t < 8; t++) {
      const side = randi(0, 3), along = rand(0.1, 0.9);
      const x = side < 2 ? bx0 + (bx1 - bx0) * along : side === 2 ? bx0 + 1.6 : bx1 - 1.6;
      const z = side >= 2 ? bz0 + (bz1 - bz0) * along : side === 0 ? bz0 + 1.6 : bz1 - 1.6;
      if (!free(x - 1.2, z - 1.2, x + 1.2, z + 1.2)) continue;
      placeK(pick(['tree-1', 'tree-2', 'tree-3', 'tree-5', 'deadtree-1', 'deadtree-2', 'deadtree-4', 'tree-7']), x, 0.15, z, rand(0, 6.28), rand(1.1, 1.5)); B.collider(x - 0.22, 0.15, z - 0.22, x + 0.22, 4, z + 0.22);
      placeK('sidewalk-planter', x, 0.15, z, 0);
      reserved.push([x - 1.5, z - 1.5, x + 1.5, z + 1.5]);
    }
  }));
  for (let i = 0; i < 1400; i++) {
    const x = rand(-EDGE + 2, EDGE - 2), z = rand(-EDGE + 2, EDGE - 2);
    const onRoad = ROADS.some(r => Math.abs(x - r) < 6 || Math.abs(z - r) < 6);
    if (!onRoad && W.buildings.some(b => x > b.x0 - 0.2 && x < b.x1 + 0.2 && z > b.z0 - 0.2 && z < b.z1 + 0.2)) continue;
    W.papers.push([x, onRoad ? 0.012 : 0.162, z, rand(0, 6.28)]);
  }
  for (const rx of ROADS) for (const rz of ROADS) {
    for (const [dx, dz, ry] of [[-7.4, -7.4, 0], [7.4, 7.4, Math.PI], [7.4, -7.4, -Math.PI / 2], [-7.4, 7.4, Math.PI / 2]]) {
      if (Math.random() < 0.6) { placeK(pick(['trafficlight', 'trafficlight-2']), rx + dx, 0.15, rz + dz, ry, 4.6); B.box('wall', rx + dx, 0.15, rz + dz, 0.3, 4, 0.3, { invisible: true }); }
      else { placeK(pick(['sign-stop', 'sign-noparking', 'sign-triangle']), rx + dx, 0.15, rz + dz, ry, 4.4); }
    }
  }
  for (let i = 0; i < 70; i++) { const r = pick(ROADS), t = rand(-165, 165); if (ROADS.some(rr => Math.abs(t - rr) < 10)) continue; const v = Math.random() < 0.5; placeK('prop-manholecover', v ? r + rand(-3, 3) : t, 0.012, v ? t : r + rand(-3, 3), 0, 1.4); }
  for (const r of ROADS) for (let t = -166; t < 166; t += 14) { if (ROADS.some(rr => Math.abs(t - rr) < 9)) continue; for (const o of [-5.7, 5.7]) placeK('prop-drain', r + o, 0.008, t, 0, 1.2); for (const o of [-5.7, 5.7]) placeK('prop-drain', t + 5, 0.008, r + o, 0, 1.2); }
  for (let i = 0; i < 40; i++) {
    const r = pick(ROADS), t = rand(-160, 160), v = Math.random() < 0.5;
    if (ROADS.some(rr => Math.abs(t - rr) < 8)) continue;
    const [x, z] = v ? [r + rand(-3.5, 3.5), t] : [t, r + rand(-3.5, 3.5)];
    for (let k = 0; k < 3; k++) B.box('pothole', x + rand(-0.6, 0.6), 0, z + rand(-0.6, 0.6), rand(0.8, 1.8), 0.012, rand(0.8, 1.8), { solid: false });
  }
  for (let i = 0; i < 160; i++) {
    const [bx0, bx1] = pick(BLK), [bz0, bz1] = pick(BLK);
    const x = rand(bx0 + 4, bx1 - 4), z = rand(bz0 + 4, bz1 - 4);
    if (free(x - 0.6, z - 0.6, x + 0.6, z + 0.6)) W.bags.push([x, 0.15, z, rand(0.9, 1.4)]);
  }
  // second pass: plug frontage gaps with narrow buildings
  BLK.forEach(([bx0, bx1]) => BLK.forEach(([bz0, bz1]) => {
    const ix0 = bx0 + SB + 0.6, ix1 = bx1 - SB - 0.6, iz0 = bz0 + SB + 0.6, iz1 = bz1 - SB - 0.6;
    for (const side of ['n', 's', 'w', 'e']) {
      const horiz = side === 'n' || side === 's', a0 = horiz ? ix0 : iz0, a1 = horiz ? ix1 : iz1;
      for (let t = a0; t < a1 - 8; t += 2) {
        const len = 2 * randi(4, 6), dep = 2 * randi(6, 9);
        const r = side === 'n' ? [t, iz0, t + len, iz0 + dep] : side === 's' ? [t, iz1 - dep, t + len, iz1] : side === 'w' ? [ix0, t, ix0 + dep, t + len] : [ix1 - dep, t, ix1, t + len];
        if (free(r[0] - 0.3, r[1] - 0.3, r[2] + 0.3, r[3] + 0.3)) { const m = fill(...r, side); if (m) t += (horiz ? m.x1 - m.x0 : m.z1 - m.z0); }
      }
    }
  }));
  // curbside parking
  for (const r of ROADS) for (const sd of [-1, 1]) for (let t = -EDGE + 8; t < EDGE - 8; t += rand(6.2, 9)) {
    if (ROADS.some(rr => Math.abs(t - rr) < 15) || Math.random() < 0.3) continue;
    const off = r + sd * 4.55;
    for (const vert of [true, false]) {
      const x = vert ? off : t, z = vert ? t : off;
      if (!free(x - 1.2, z - 1.2, x + 1.2, z + 1.2)) continue;
      car(x, z, vert ? Math.PI / 2 + (sd > 0 ? 0 : Math.PI) : (sd > 0 ? Math.PI : 0));
      reserved.push(vert ? [x - 1.1, z - 2.4, x + 1.1, z + 2.4] : [x - 2.4, z - 1.1, x + 2.4, z + 1.1]);
    }
  }
  // puddles (glossy decals) on roads and walks
  {
    const pm = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false });
    const pc = document.createElement('canvas'); pc.width = pc.height = 128; const px = pc.getContext('2d');
    const gr = px.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    px.fillStyle = gr; for (let i = 0; i < 6; i++) { px.beginPath(); px.ellipse(64 + rand(-18, 18), 64 + rand(-18, 18), rand(24, 44), rand(18, 34), rand(0, 3), 0, 7); px.fill(); }
    pm.alphaMap = new THREE.CanvasTexture(pc);
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const N = 160, im = new THREE.InstancedMesh(g, pm, N), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3();
    let n = 0;
    while (n < N) {
      const r = pick(ROADS), t = rand(-EDGE, EDGE), v = Math.random() < 0.5, side = rand(-5.5, 5.5);
      const x = v ? r + side : t, z = v ? t : r + side, sc = rand(1.5, 4.5);
      Q.setFromAxisAngle(V.set(0, 1, 0), rand(0, 6.28));
      M4.compose(V.set(x, 0.008, z), Q, new THREE.Vector3(sc, 1, sc * rand(0.5, 1))); im.setMatrixAt(n++, M4);
    }
    im.receiveShadow = true; im.renderOrder = 1; scene.add(im);
  }
  // graffiti on ground floors (procedural tags)
  {
    const tags = [];
    const cols = ['#c8c8c8', '#d84040', '#3a7ad8', '#e0c040', '#40c070', '#e070c0', '#ffffff', '#111111'];
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
      x.lineCap = x.lineJoin = 'round'; const col = pick(cols);
      for (let s = 0; s < randi(2, 4); s++) {
        x.strokeStyle = s === 0 ? pick(cols) : col; x.lineWidth = s === 0 ? rand(22, 30) : rand(9, 16);
        x.beginPath(); let px = rand(40, 90), py = rand(90, 170); x.moveTo(px, py);
        for (let k = 0; k < randi(6, 12); k++) { px += rand(20, 50); py = rand(60, 200); x.quadraticCurveTo(px - rand(10, 30), rand(40, 220), px, py); }
        x.stroke();
      }
      x.fillStyle = col; for (let k = 0; k < 30; k++) { x.globalAlpha = rand(0.2, 0.7); x.beginPath(); x.arc(rand(20, 492), rand(20, 236), rand(1, 4), 0, 7); x.fill(); } x.globalAlpha = 1;
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      tags.push(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false }));
    }
    const gg = new THREE.PlaneGeometry(1, 0.5);
    for (const b of W.buildings.filter(b => b.filler && Math.abs(b.x) < EDGE && Math.abs(b.z) < EDGE)) {
      if (Math.random() < 0.45) continue;
      const side = randi(0, 3), w = rand(2, 4.5);
      const along = side < 2 ? rand(b.x0 + w / 2 + 0.6, b.x1 - w / 2 - 0.6) : rand(b.z0 + w / 2 + 0.6, b.z1 - w / 2 - 0.6);
      if (!isFinite(along)) continue;
      const m = new THREE.Mesh(gg, pick(tags)); m.scale.set(w, w, 1);
      const y = 0.15 + rand(0.9, 1.6), off = 0.035;
      if (side === 0) { m.position.set(along, y, b.z0 - off); m.rotation.y = Math.PI; }
      else if (side === 1) { m.position.set(along, y, b.z1 + off); }
      else if (side === 2) { m.position.set(b.x0 - off, y, along); m.rotation.y = -Math.PI / 2; }
      else { m.position.set(b.x1 + off, y, along); m.rotation.y = Math.PI / 2; }
      scene.add(m);
    }
  }
  // street litter on curbs
  for (let i = 0; i < 260; i++) {
    const r = pick(ROADS), t = rand(-EDGE + 4, EDGE - 4), v = Math.random() < 0.5, sd = Math.random() < 0.5 ? -1 : 1;
    const off = r + sd * rand(6.3, 8.2), x = v ? off : t, z = v ? t : off;
    if (ROADS.some(rr => Math.abs(t - rr) < 8) || !free(x - 0.4, z - 0.4, x + 0.4, z + 0.4)) continue;
    const k = Math.random();
    if (k < 0.45) placeK('trashbag.gltf', x, 0.15, z, rand(0, 6), rand(0.9, 1.3));
    else if (k < 0.7) placeK('cardboard_box_01.gltf', x, 0.15, z, rand(0, 6));
    else W.papers.push([x, 0.162, z, rand(0, 6.28)]);
  }

  // scanned props (Poly Haven)
  const ph = (n, x, y, z, ry = 0, sc = 1) => placeK(n + '.gltf', x, y, z, ry, sc);
  const solidAt = (x, z, w, d, h) => B.box('wall', x, 0.15, z, w, h, d, { invisible: true });
  for (let i = 0; i < 140; i++) {
    const [bx0, bx1] = pick(BLK), [bz0, bz1] = pick(BLK);
    const x = rand(bx0 + 4, bx1 - 4), z = rand(bz0 + 4, bz1 - 4);
    if (!free(x - 1.5, z - 1.5, x + 1.5, z + 1.5)) continue;
    const k = Math.random(), r = rand(0, 6.28);
    if (k < 0.2) { ph('metal_trash_can', x, 0.15, z, randi(0, 3) * Math.PI / 2); solidAt(x, z, 1.9, 1.9, 1); for (let j = 0; j < randi(1, 3); j++) ph('trashbag', x + rand(-1.4, 1.4), 0.15, z + rand(-1.4, 1.4), rand(0, 6), rand(0.9, 1.3)); }
    else if (k < 0.35) { for (let j = 0; j < randi(2, 5); j++) ph(pick(['cardboard_box_01', 'cardboard_box_01', 'plastic_crate_01', 'plastic_crate_02']), x + rand(-0.8, 0.8), 0.15 + (j > 2 ? 0.34 : 0), z + rand(-0.8, 0.8), rand(0, 6)); }
    else if (k < 0.5) { ph(pick(['Barrel_01', 'Barrel_02', 'barrel_03']), x, 0.15, z, r); if (Math.random() < 0.6) ph(pick(['Barrel_01', 'barrel_03']), x + 0.7, 0.15, z + 0.2, r); solidAt(x + 0.3, z, 1.4, 0.8, 1); }
    else if (k < 0.62) { ph(pick(['wooden_crate_01', 'wooden_crate_02', 'wooden_military_crate']), x, 0.15, z, r); solidAt(x, z, 1, 1, 0.5); }
    else if (k < 0.72) { for (let j = 0; j < randi(1, 3); j++) ph('old_tyre', x + rand(-0.5, 0.5), 0.15 + j * 0.16, z + rand(-0.5, 0.5), rand(0, 6)); }
    else if (k < 0.8) { ph(pick(['metal_jerrycan', 'propane_tank', 'portable_generator', 'power_box_01']), x, 0.15, z, r); }
    else if (k < 0.88) { ph('covered_car', x, 0.15, z, randi(0, 3) * Math.PI / 2); solidAt(x, z, 4.4, 4.4, 1.4); }
    else { for (let j = 0; j < randi(2, 5); j++) ph('trashbag', x + rand(-1, 1), 0.15, z + rand(-1, 1), rand(0, 6), rand(0.9, 1.3)); if (Math.random() < 0.4) ph('street_rat', x + rand(-1, 1), 0.15, z + rand(-1, 1), rand(0, 6), 5); }
    reserved.push([x - 1.5, z - 1.5, x + 1.5, z + 1.5]);
  }
  for (const [x, y, z, sc] of W.bags) for (let j = 0; j < randi(1, 3); j++) ph('trashbag', x + rand(-0.5, 0.5), y, z + rand(-0.5, 0.5), rand(0, 6), sc * rand(0.85, 1.15));
  W.bags = [];
  for (const rx of ROADS) for (const rz of ROADS) for (const [dx, dz] of [[-8.2, -10], [8.2, 10], [10, -8.2], [-10, 8.2]]) if (Math.random() < 0.5 && free(rx + dx - 0.5, rz + dz - 0.5, rx + dx + 0.5, rz + dz + 0.5)) ph('fire_hydrant', rx + dx, 0.15, rz + dz, rand(0, 6), 1);
  for (const b of W.buildings.filter(b => b.filler)) {
    if (Math.random() < 0.35) { const side = randi(0, 3), t = rand(0.2, 0.8); const [x, z, ry] = side === 0 ? [b.x0 + (b.x1 - b.x0) * t, b.z0 - 0.45, Math.PI] : side === 1 ? [b.x0 + (b.x1 - b.x0) * t, b.z1 + 0.45, 0] : side === 2 ? [b.x0 - 0.45, b.z0 + (b.z1 - b.z0) * t, -Math.PI / 2] : [b.x1 + 0.45, b.z0 + (b.z1 - b.z0) * t, Math.PI / 2]; if (free(x - 0.6, z - 0.6, x + 0.6, z + 0.6)) ph(pick(['utility_box_01', 'utility_box_02', 'power_box_01']), x, 0.15, z, ry); }
    if (Math.random() < 0.3) { const [x, z, ry] = [b.x1 + 0.2, b.z1 + 0.2, Math.PI / 4]; ph('security_camera_01', x, 4.2, z, ry); }
  }
  for (let i = 0; i < 18; i++) { const r = pick(ROADS), t = rand(-150, 150); if (ROADS.some(rr => Math.abs(t - rr) < 14)) continue; const v = Math.random() < 0.5, x = v ? r + rand(-3, 3) : t, z = v ? t : r + rand(-3, 3); ph(pick(['concrete_road_barrier', 'concrete_road_barrier_02']), x, 0.0, z, v ? 0 : Math.PI / 2); B.box('wall', x, 0, z, v ? 1.6 : 0.7, 1.1, v ? 0.7 : 1.6, { invisible: true }); }
  for (let i = 0; i < 4; i++) ph('portable_generator', -78 + i * 6, 0.15, -122, rand(0, 6));
  for (const [ax, az] of [[56, -21], [68, -21], [88, 64], [88, 72]]) { ph('wooden_military_crate', ax, 0.27, az, 0); ph('ammo_box', ax + 0.4, 0.73, az, 0.3); ph('medical_box', ax - 0.3, 0.73, az, 0); }
  ph('metal_tool_chest', 134, 0.27, -86, Math.PI / 2); ph('portable_generator', 150, 0.27, -76, 0.5);
  ph('BarberShopChair_01', -25, 0.27, -86, Math.PI / 2); ph('BarberShopChair_01', -25, 0.27, -90, Math.PI / 2);
  ph('WetFloorSign_01', 2, 0.27, -57, 0.4); ph('WetFloorSign_01', -6, 0.27, -18, 1.2);
  for (let i = 0; i < 6; i++) ph('mounted_fluorescent_lights', -38 + i * 15, -6.05, 12, 0, 1.4);

  B.finish();
  W.colliders = B.colliders;
  return W;
}

export const MAP_MARKERS = {
  zone: '#d9443a', armory: '#3a7bd9', dealer: '#555a60', atm: '#3ac46a', airdrop: '#e8c93a', poi: '#cfcfcf',
};
