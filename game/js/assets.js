import * as THREE from 'three';
import { GLTFLoader } from './pp/loaders/GLTFLoader.js';
import { detailedGun } from './guns3d.js';

const lib = {};
const mats = {};
export const A = { lib, mats, anims: null };

export async function loadAssets(onProgress) {
  const loader = new GLTFLoader();
  const files = ['downtown', 'guns', 'street', 'trees', 'char', 'props', 'phweapons', 'deagle'];
  let done = 0;
  await Promise.all(files.map(async (f) => {
    const g = await loader.loadAsync('./assets/' + f + '.glb');
    for (const n of g.scene.children) lib[n.name] = n;
    if (f === 'char') A.anims = g.animations;
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) if (m.name) mats[m.name] = m;
    });
    onProgress?.(++done / files.length, f);
  }));
  const decal = mats.MI_StreetDecals;
  if (decal) { decal.polygonOffset = true; decal.polygonOffsetFactor = -4; decal.polygonOffsetUnits = -4; decal.depthWrite = false; }
  for (const m of Object.values(mats)) if (m.isMeshStandardMaterial) m.envMapIntensity = 0.55;
  if (mats.MI_Glass) { mats.MI_Glass.envMapIntensity = 0.3; mats.MI_Glass.roughness = 0.12; mats.MI_Glass.metalness = 0.1; mats.MI_Glass.color.multiplyScalar(0.45); }
  if (mats.MI_FakeInterior) { mats.MI_FakeInterior.color.setHex(0x1c1e22); mats.MI_FakeInterior.roughness = 0.9; mats.MI_FakeInterior.envMapIntensity = 0.2; }
  for (const k of ['MI_FakeInterior_2', 'MI_FakeInterior_3', 'MI_FakeInterior_4']) if (mats[k]) { mats[k].emissive = new THREE.Color(0xffffff); mats[k].emissiveMap = mats[k].map; mats[k].emissiveIntensity = 0.06; mats[k].color.multiplyScalar(0.4); }
  return A;
}

export function size(name) {
  const n = lib[name]; if (!n) return null;
  const b = new THREE.Box3().setFromObject(n);
  return { min: b.min, max: b.max, size: b.getSize(new THREE.Vector3()) };
}

export function clone(name) {
  const n = lib[name];
  if (!n) { console.warn('missing asset', name); return new THREE.Group(); }
  const c = n.clone(true);
  c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.scale.set(1, 1, 1);
  return c;
}

// static instancing: collects placements, then builds one InstancedMesh per (geometry, material)
export class Instancer {
  constructor() { this.groups = new Map(); }
  add(name, x, y, z, ry = 0, s = 1, sy) {
    const n = lib[name]; if (!n) return;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(s, sy ?? s, s));
    n.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(n.matrixWorld).invert();
    n.traverse(o => {
      if (!o.isMesh) return;
      const local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const key = o.geometry.uuid + '|' + ms.map(q => q.uuid).join(',');
      if (!this.groups.has(key)) this.groups.set(key, { geo: o.geometry, mat: o.material, list: [] });
      this.groups.get(key).list.push(new THREE.Matrix4().multiplyMatrices(m, local));
    });
  }
  flush(scene) {
    let count = 0;
    for (const g of this.groups.values()) {
      const im = new THREE.InstancedMesh(g.geo, g.mat, g.list.length);
      g.list.forEach((m, i) => im.setMatrixAt(i, m));
      im.computeBoundingSphere();
      const ms = Array.isArray(g.mat) ? g.mat : [g.mat];
      const transparent = ms.some(m => m.transparent);
      im.castShadow = !transparent; im.receiveShadow = true;
      scene.add(im); count += g.list.length;
    }
    this.groups.clear();
    return count;
  }
}

// ---------- guns ----------
const GUN = {
  beretta: 'pistol-2', g17: 'pistol-1', g18: 'pistol-1', hawkeye: 'pistol-6', m1911: 'pistol-3', fnp45: 'pistol-4', deagle: 'pistol-5', magnum: 'revolver-4',
  tec9: 'submachinegun-1', mac10: 'submachinegun-4', uzi: 'submachinegun-2', mp7: 'submachinegun-3', ump45: 'submachinegun-5', tommy: 'assaultrifle-1',
  supershorty: 'shotgun-shortstock', doublebarrel: 'shotgun-sawedoff', ithaca: 'shotgun-2', r870: 'shotgun-1',
  sks: 'assaultrifle-5', aks74u: 'assaultrifle-4', m4a1: 'assaultrifle2-1', fal: 'assaultrifle2-4', scarh: 'assaultrifle2-3', akm: 'assaultrifle-3',
  mosin: 'sniperrifle-2', scout: 'sniperrifle-4',
};
const LEN = { pistol: 0.22, smg: 0.42, rifle: 0.86, shotgun: 0.92, sniper: 1.12 };
const gunCache = {};
export function hasGun(id) { return !!GUN[id] && !!lib[GUN[id]]; }
export function gunModel(item) {
  const eg = extGun(item.id); if (eg) return eg;
  const dg = detailedGun(item.id); if (dg) return dg;
  const key = GUN[item.id];
  if (!key || !lib[key]) return null;
  if (!gunCache[item.id]) {
    const src = clone(key);
    const b = new THREE.Box3().setFromObject(src), sz = b.getSize(new THREE.Vector3());
    const s = (LEN[item.type] || 0.5) / sz.x;
    const holder = new THREE.Group();
    src.scale.setScalar(s);
    src.rotation.y = Math.PI / 2;
    src.position.set(0, -b.min.y * s - sz.y * s * 0.55, b.min.x * s + sz.x * s * (item.type === 'pistol' ? 0.28 : 0.42));
    src.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); o.material.envMapIntensity = 1.1; if (item.id === 'deagle' || item.id === 'g18') o.material.color.multiplyScalar(item.id === 'deagle' ? 6 : 1.6); } });
    holder.add(src);
    holder.userData.tipZ = -(LEN[item.type] || 0.5) * (1 - (item.type === 'pistol' ? 0.28 : 0.42));
    gunCache[item.id] = holder;
  }
  const c = gunCache[item.id].clone(true); c.userData = { ...gunCache[item.id].userData }; return c;
}

// ---------- real scanned / modeled weapons ----------
const PISTOL = { node: 'service_pistol.gltf', fwd: 'x', scale: 1.05, grip: [-0.025, 0.035], keep: /_a$/, parts: { slide: 'service_pistol_slide_a', hammer: 'service_pistol_hammer_a' }, sightY: 0.085, type: 'pistol' };
const EXT = {
  deagle: { node: 'deagle_rt', fwd: 'x', scale: 1, grip: [-0.08, -0.049], parts: { slide: 'Slide', mag: 'Magazine', hammer: 'Hammer' }, sightY: 0.05, type: 'pistol' },
  mosin: { node: 'bolt_action_rifle_7_62.gltf', fwd: 'x', scale: 1, grip: [-0.31, 0.0], hide: /bullet|scope/, parts: { bolt: 'bolt_action_rifle_7_62_bolt_a' }, sightY: 0.075, type: 'sniper' },
  scout: { node: 'bolt_action_rifle_7_62.gltf', fwd: 'x', scale: 1, grip: [-0.31, 0.0], hide: /bullet|wrap/, parts: { bolt: 'bolt_action_rifle_7_62_bolt_a' }, sightY: 0.085, type: 'sniper' },
  beretta: PISTOL, m1911: PISTOL, fnp45: PISTOL, hawkeye: PISTOL,
  crowbar: { node: 'crowbar_01.gltf', up: true, handle: -0.22 }, machete: { node: 'machete.gltf', up: true, handle: -0.15 },
  bat: { node: 'baseball_bat.gltf', up: true, handle: -0.18 }, metalbat: { node: 'baseball_bat.gltf', up: true, handle: -0.18, tint: 0x9aa0a8 },
  sledgehammer: { node: 'sledgehammer_01.gltf', up: true, handle: 0.16, flip: true }, fireaxe: { node: 'wooden_axe.gltf', up: true, handle: -0.16 },
  katana: { node: 'antique_katana_01.gltf', up: true, handle: -0.22 }, hatchet: { node: 'hatchet.gltf', up: true, handle: -0.03 }, taiga: { node: 'hatchet.gltf', up: true, handle: -0.03 },
  frag: { node: 'stick_grenade.gltf', up: true, handle: -0.1 },
};
const extCache = {};
export function hasExt(id) { const c = EXT[id]; return !!(c && lib[c.node]); }
export function extGun(id) {
  const c = EXT[id]; if (!c || !lib[c.node]) return null;
  if (!extCache[id]) {
    const src = clone(c.node);
    src.traverse(o => { if (o.name && ((c.hide && c.hide.test(o.name)) || (c.keep && o.isMesh && !c.keep.test(o.name) && o.parent === src))) o.visible = false; });
    for (const ch of [...src.children]) if (c.keep && !c.keep.test(ch.name)) ch.visible = false;
    src.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); o.material.envMapIntensity = 0.55; if (c.tint) o.material.color.setHex(c.tint); } });
    const model = new THREE.Group(), inner = new THREE.Group(); model.add(inner); inner.add(src);
    if (c.up) {
      inner.rotation.z = c.flip ? Math.PI / 2 : -Math.PI / 2;
      inner.position.x = c.flip ? c.handle : -c.handle;
    } else {
      const s = c.scale; inner.scale.setScalar(s);
      if (c.fwd === 'z') inner.rotation.y = Math.PI / 2;
      inner.position.set(-c.grip[0] * s, -c.grip[1] * s, 0);
    }
    const holder = new THREE.Group(); model.rotation.y = Math.PI / 2; holder.add(model);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3();
    src.traverse(o => { if (o.isMesh && o.visible) box.expandByObject(o); });
    holder.userData = { tipZ: box.min.z, sightY: c.sightY ?? 0.07, partNames: c.parts || {} };
    extCache[id] = holder;
  }
  const h = extCache[id].clone(true);
  h.userData = { ...extCache[id].userData };
  h.updateMatrixWorld(true);
  const modelSpace = h.children[0];
  const inv = new THREE.Matrix4();
  for (const [k, name] of Object.entries(h.userData.partNames)) {
    let part = null; h.traverse(o => { if (!part && o.name === name) part = o; });
    if (!part) continue;
    h.userData[k] = part;
    part.userData.rest = part.position.clone();
    inv.copy(part.parent.matrixWorld).invert();
    const toParent = (v) => { const a = modelSpace.localToWorld(new THREE.Vector3(0, 0, 0)), b = modelSpace.localToWorld(v.clone()); a.applyMatrix4(inv); b.applyMatrix4(inv); return b.sub(a); };
    part.userData.back = toParent(new THREE.Vector3(-1, 0, 0));
    part.userData.down = toParent(new THREE.Vector3(0, -1, 0));
  }
  return h;
}

// ---------- scanned PBR surfaces (Poly Haven, CC0) ----------
const PBR_SETS = ['asphalt_02', 'concrete_pavement', 'red_brick_03', 'red_bricks_04', 'concrete_wall_006', 'concrete_floor_worn_001', 'concrete_floor_02', 'rusty_metal_shutter', 'dirty_tiles', 'smooth_concrete_floor', 'painted_plaster_wall', 'dark_brick_wall', 'metal_plate'];
export const PBR = {};
export async function loadPBR(maxAniso = 8) {
  const L = new THREE.TextureLoader();
  const ld = (u, srgb) => L.loadAsync(u).then(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }).catch(() => null);
  await Promise.all(PBR_SETS.map(async id => {
    const [map, normalMap, arm] = await Promise.all([ld(`./assets/tex/${id}_diff.jpg`, true), ld(`./assets/tex/${id}_nor.jpg`), ld(`./assets/tex/${id}_arm.jpg`)]);
    if (map) PBR[id] = { map, normalMap, arm };
  }));
}
// material from a scanned set; rep = texture repeats per UV unit
export function pbrMat(id, { color = 0xffffff, rep = [1, 1], rough = 1, normal = 1, metal = false } = {}) {
  const s = PBR[id]; if (!s) return null;
  const c = (t) => { if (!t) return null; const k = t.clone(); k.repeat.set(rep[0], rep[1]); k.needsUpdate = true; return k; };
  const arm = c(s.arm);
  return new THREE.MeshStandardMaterial({ color, map: c(s.map), normalMap: c(s.normalMap), normalScale: new THREE.Vector2(normal, normal), roughnessMap: arm, metalnessMap: metal ? arm : null, aoMap: arm, aoMapIntensity: 0.8, roughness: rough, metalness: metal ? 1 : 0, envMapIntensity: 0.55 });
}
// swap the city kit's flat textures for scanned ones (kit UVs: 0..1 per 2m x 4m panel)
export function upgradeKit() {
  const swap = (name, id, rep, extra = {}) => { const m = mats[name]; const s = PBR[id]; if (!m || !s) return; const n = pbrMat(id, { rep, ...extra }); m.map = n.map; m.normalMap = n.normalMap; m.normalScale = n.normalScale; m.roughnessMap = n.roughnessMap; m.aoMap = n.aoMap; m.aoMapIntensity = 0.8; m.roughness = 1; m.metalness = 0; m.color.setHex(extra.color ?? 0xffffff); m.needsUpdate = true; };
  swap('MI_RedBrick', 'red_brick_03', [2, 4]);
}
