import * as THREE from 'three';
import { GLTFLoader } from './pp/loaders/GLTFLoader.js';

const lib = {};
const mats = {};
export const A = { lib, mats, anims: null };

export async function loadAssets(onProgress) {
  const loader = new GLTFLoader();
  const files = ['downtown', 'guns', 'street', 'trees', 'char'];
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
  if (mats.MI_Glass) { mats.MI_Glass.envMapIntensity = 1.4; mats.MI_Glass.roughness = 0.08; mats.MI_Glass.metalness = 0.2; }
  for (const k of ['MI_FakeInterior_2', 'MI_FakeInterior_3']) if (mats[k]) { mats[k].emissive = new THREE.Color(0xffffff); mats[k].emissiveMap = mats[k].map; mats[k].emissiveIntensity = 0.12; mats[k].color.multiplyScalar(0.55); }
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
