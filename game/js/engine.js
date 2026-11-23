import * as THREE from 'three';
import { getTex, TEXMAP } from './tex.js';

export class Builder {
  constructor(scene) { this.scene = scene; this.buckets = new Map(); this.colliders = []; }
  mat(key, color, opts = {}) {
    if (!this.buckets.has(key)) this.buckets.set(key, { color, opts, pos: [], nor: [], col: [], uv: [], ts: opts.ts || (TEXMAP[key] || [0, 2])[1] });
    return key;
  }
  box(key, x, y, z, w, h, d, o = {}) {
    if (o.invisible) { this.colliders.push({ min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h, z + d / 2], zone: o.zone || 'surface' }); return; }
    const b = this.buckets.get(key);
    const hw = w / 2, hd = d / 2;
    const x0 = x - hw, x1 = x + hw, y0 = y, y1 = y + h, z0 = z - hd, z1 = z + hd;
    const c = new THREE.Color(o.tint ?? b.color);
    const shade = (f) => { const k = 0.55 + f * 0.45; return [c.r * k, c.g * k, c.b * k]; };
    const ts = b.ts;
    const F = (a, bb, cc, dd, n, f) => {
      const s = shade(f);
      for (const v of [a, bb, cc, a, cc, dd]) {
        b.pos.push(...v); b.nor.push(...n); b.col.push(...s);
        if (n[1]) b.uv.push(v[0] / ts, v[2] / ts); else if (n[2]) b.uv.push(v[0] / ts, v[1] / ts); else b.uv.push(v[2] / ts, v[1] / ts);
      }
    };
    if (!o.noTop) F([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], 1);
    if (!o.noBottom) F([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], 0.55);
    F([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], 0.85);
    F([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], 0.8);
    F([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], 0.9);
    F([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], 0.75);
    if (o.solid !== false) this.colliders.push({ min: [x0, y0, z0], max: [x1, y1, z1], zone: o.zone || 'surface', tag: o.tag, glass: o.glass });
  }
  collider(x0, y0, z0, x1, y1, z1, zone = 'surface') { this.colliders.push({ min: [x0, y0, z0], max: [x1, y1, z1], zone }); }
  finish() {
    for (const [key, b] of this.buckets) {
      if (!b.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.computeBoundingSphere();
      const { offset, material, ts, ...mo } = b.opts;
      const tk = TEXMAP[key];
      const m = material || new THREE.MeshLambertMaterial({ vertexColors: true, map: tk ? getTex(tk[0]) : null, ...mo });
      if (offset && !material) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; }
      const mesh = new THREE.Mesh(g, m);
      mesh.matrixAutoUpdate = false;
      mesh.castShadow = !mo.emissive && !mo.transparent && key !== 'line';
      mesh.receiveShadow = true;
      mesh.name = key;
      this.scene.add(mesh);
    }
    this.buckets.clear();
  }
}

export class Physics {
  constructor(colliders) {
    this.all = colliders;
    this.cell = 8;
    this.grid = new Map();
    colliders.forEach((c, i) => {
      for (let gx = Math.floor(c.min[0] / this.cell); gx <= Math.floor(c.max[0] / this.cell); gx++)
        for (let gz = Math.floor(c.min[2] / this.cell); gz <= Math.floor(c.max[2] / this.cell); gz++) {
          const k = gx * 10007 + gz;
          if (!this.grid.has(k)) this.grid.set(k, []);
          this.grid.get(k).push(c);
        }
    });
    this.dyn = [];
  }
  near(x, z, r) {
    const out = new Set();
    for (let gx = Math.floor((x - r) / this.cell); gx <= Math.floor((x + r) / this.cell); gx++)
      for (let gz = Math.floor((z - r) / this.cell); gz <= Math.floor((z + r) / this.cell); gz++) {
        const l = this.grid.get(gx * 10007 + gz);
        if (l) for (const c of l) out.add(c);
      }
    for (const c of this.dyn) out.add(c);
    return out;
  }
  // body: {pos:Vector3 (feet), vel, radius, height, onGround}
  move(body, dt, step = 0.55) {
    const p = body.pos, r = body.radius;
    p.x += body.vel.x * dt; this.pushXZ(body, step);
    p.z += body.vel.z * dt; this.pushXZ(body, step);
    body.vel.y -= 32 * dt;
    if (body.vel.y < -60) body.vel.y = -60;
    const ny = p.y + body.vel.y * dt;
    const ground = this.groundAt(p.x, p.z, r, p.y + step);
    body.onGround = false;
    if (body.vel.y <= 0 && ny <= ground) {
      body.landSpeed = -body.vel.y;
      p.y = ground; body.vel.y = 0; body.onGround = true;
    } else {
      p.y = ny;
      if (body.vel.y > 0) {
        const ceil = this.ceilAt(p.x, p.z, r, p.y + body.height - body.vel.y * dt);
        if (p.y + body.height > ceil) { p.y = ceil - body.height; body.vel.y = 0; }
      }
    }
  }
  pushXZ(body, step) {
    const p = body.pos, r = body.radius;
    for (const c of this.near(p.x, p.z, r + 1)) {
      if (c.max[1] <= p.y + step || c.min[1] >= p.y + body.height) continue;
      const cx = Math.max(c.min[0], Math.min(p.x, c.max[0]));
      const cz = Math.max(c.min[2], Math.min(p.z, c.max[2]));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), k = (r - d) / d;
        p.x += dx * k; p.z += dz * k;
      } else {
        const l = p.x - c.min[0] + r, rr = c.max[0] - p.x + r, b = p.z - c.min[2] + r, f = c.max[2] - p.z + r;
        const m = Math.min(l, rr, b, f);
        if (m === l) p.x = c.min[0] - r; else if (m === rr) p.x = c.max[0] + r; else if (m === b) p.z = c.min[2] - r; else p.z = c.max[2] + r;
      }
    }
  }
  groundAt(x, z, r, maxY) {
    let g = -999;
    const rr = r * 0.7;
    for (const c of this.near(x, z, r)) {
      if (c.max[1] > maxY) continue;
      if (x + rr < c.min[0] || x - rr > c.max[0] || z + rr < c.min[2] || z - rr > c.max[2]) continue;
      if (c.max[1] > g) g = c.max[1];
    }
    return g;
  }
  ceilAt(x, z, r, minY) {
    let g = 999;
    const rr = r * 0.7;
    for (const c of this.near(x, z, r)) {
      if (c.min[1] < minY) continue;
      if (x + rr < c.min[0] || x - rr > c.max[0] || z + rr < c.min[2] || z - rr > c.max[2]) continue;
      if (c.min[1] < g) g = c.min[1];
    }
    return g;
  }
  ray(o, d, maxT, zone) {
    let best = maxT, hit = null;
    const inv = [1 / d.x, 1 / d.y, 1 / d.z], ox = [o.x, o.y, o.z];
    const ex = o.x + d.x * maxT, ez = o.z + d.z * maxT;
    const x0 = Math.min(o.x, ex), x1 = Math.max(o.x, ex), z0 = Math.min(o.z, ez), z1 = Math.max(o.z, ez);
    const test = (c) => {
      if (c.max[0] < x0 || c.min[0] > x1 || c.max[2] < z0 || c.min[2] > z1) return;
      let tmin = 0, tmax = best, axis = -1;
      for (let a = 0; a < 3; a++) {
        let t1 = (c.min[a] - ox[a]) * inv[a], t2 = (c.max[a] - ox[a]) * inv[a];
        if (t1 > t2) [t1, t2] = [t2, t1];
        if (t1 > tmin) { tmin = t1; axis = a; }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return;
      }
      if (tmin < best && tmin >= 0) { best = tmin; hit = { c, axis }; }
    };
    if ((x1 - x0) * (z1 - z0) < 6400) { for (const c of this.near((x0 + x1) / 2, (z0 + z1) / 2, Math.max(x1 - x0, z1 - z0) / 2 + 1)) test(c); }
    else for (const c of this.all) test(c);
    for (const c of this.dyn) test(c);
    return { t: best, hit };
  }
}

const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
export class NavGrid {
  constructor(phys, x0, z0, x1, z1, floorY, res = 2, margin = 0.45) {
    this.x0 = x0; this.z0 = z0; this.res = res; this.y = floorY;
    this.w = Math.ceil((x1 - x0) / res); this.h = Math.ceil((z1 - z0) / res);
    this.block = new Uint8Array(this.w * this.h);
    for (let i = 0; i < this.w; i++) for (let j = 0; j < this.h; j++) {
      const x = x0 + (i + 0.5) * res, z = z0 + (j + 0.5) * res;
      let b = 0;
      for (const c of phys.near(x, z, res)) {
        if (c.max[1] < floorY + 0.6 || c.min[1] > floorY + 1.7) continue;
        if (x + margin > c.min[0] && x - margin < c.max[0] && z + margin > c.min[2] && z - margin < c.max[2]) { b = 1; break; }
      }
      const g = phys.groundAt(x, z, 0.3, floorY + 0.6);
      if (g < floorY - 0.8) b = 1;
      this.block[i + j * this.w] = b;
    }
  }
  idx(x, z) { const i = Math.floor((x - this.x0) / this.res), j = Math.floor((z - this.z0) / this.res); return (i < 0 || j < 0 || i >= this.w || j >= this.h) ? -1 : i + j * this.w; }
  center(k) { return [this.x0 + ((k % this.w) + 0.5) * this.res, this.z0 + (Math.floor(k / this.w) + 0.5) * this.res]; }
  free(k) { return k >= 0 && !this.block[k]; }
  nearestFree(x, z) {
    let k = this.idx(x, z);
    if (this.free(k)) return k;
    for (let r = 1; r < 8; r++) for (let a = -r; a <= r; a++) for (const [di, dj] of [[a, -r], [a, r], [-r, a], [r, a]]) {
      const kk = this.idx(x + di * this.res, z + dj * this.res);
      if (this.free(kk)) return kk;
    }
    return -1;
  }
  path(ax, az, bx, bz, limit = 30000) {
    const s = this.nearestFree(ax, az), t = this.nearestFree(bx, bz);
    if (s < 0 || t < 0) return null;
    const W = this.w, N = this.block.length;
    if (!this.g || this.g.length !== N) { this.g = new Float32Array(N); this.came = new Int32Array(N); this.seen = new Uint32Array(N); this.stamp = 0; }
    const g = this.g, came = this.came, seen = this.seen, st = ++this.stamp;
    const tx = t % W, tz = Math.floor(t / W);
    const heap = [], push = (f, k) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    seen[s] = st; g[s] = 0; came[s] = -1; push(0, s);
    let n = 0;
    while (heap.length && n++ < limit) {
      const [f, cur] = pop();
      if (cur === t) {
        const out = []; let c = cur;
        while (c !== -1) { out.push(this.center(c)); c = came[c]; }
        return out.reverse();
      }
      const ci = cur % W, cj = Math.floor(cur / W), gc = g[cur];
      if (f - Math.hypot(ci - tx, cj - tz) > gc + 1e-3) continue;
      for (const [di, dj, cost] of NB) {
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= this.h) continue;
        const nk = ni + nj * W;
        if (this.block[nk]) continue;
        if (di && dj && (this.block[ci + di + cj * W] || this.block[ci + (cj + dj) * W])) continue;
        const ng = gc + cost;
        if (seen[nk] !== st || ng < g[nk]) { seen[nk] = st; g[nk] = ng; came[nk] = cur; push(ng + Math.hypot(ni - tx, nj - tz), nk); }
      }
    }
    return null;
  }
  randomFree() { for (let i = 0; i < 200; i++) { const k = (Math.random() * this.block.length) | 0; if (!this.block[k]) return this.center(k); } return this.center(0); }
}

export class Sfx {
  constructor() { this.ctx = null; this.vol = 0.6; }
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  out(dist = 0) {
    const g = this.ctx.createGain();
    g.gain.value = Math.max(0, 1 - dist / 140) ** 1.6;
    g.connect(this.master);
    return g;
  }
  burst(freq, dur, gain, dist = 0, type = 'lowpass', q = 0.7) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out(dist));
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  tone(freq, dur, gain, type = 'square', dist = 0, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.out(dist)); o.start(t); o.stop(t + dur + 0.05);
  }
  gun(item, dist = 0) {
    const heavy = { pistol: 1, smg: 0.8, rifle: 1.4, shotgun: 1.8, sniper: 2, launcher: 1.2 }[item.type] || 1;
    this.burst(1800 / heavy, 0.12 * heavy, 0.9, dist);
    this.burst(400, 0.25 * heavy, 0.5 * heavy, dist);
    this.tone(120 / heavy, 0.08, 0.3, 'sine', dist, -60);
  }
  swing() { this.burst(900, 0.12, 0.25, 0, 'bandpass', 2); }
  hit(dist = 0) { this.burst(300, 0.1, 0.6, dist); this.tone(90, 0.08, 0.3, 'sine', dist); }
  headshot() { this.tone(1400, 0.08, 0.15, 'triangle'); this.burst(2500, 0.06, 0.3, 0, 'highpass'); }
  hitmark() { this.tone(1800, 0.04, 0.12, 'square'); }
  metal(dist = 0) { this.tone(600 + Math.random() * 300, 0.25, 0.25, 'triangle', dist, -200); this.burst(3000, 0.08, 0.3, dist, 'highpass'); }
  explosion(dist = 0) { this.burst(200, 1.4, 1.2, dist); this.burst(900, 0.4, 0.8, dist); this.tone(50, 0.8, 0.6, 'sine', dist, -30); }
  reload() { this.tone(400, 0.05, 0.12, 'square'); setTimeout(() => this.tone(300, 0.06, 0.12, 'square'), 180); }
  cash() { this.tone(1300, 0.08, 0.15, 'triangle'); setTimeout(() => this.tone(1700, 0.12, 0.15, 'triangle'), 80); }
  click() { this.tone(900, 0.03, 0.1, 'square'); }
  denied() { this.tone(200, 0.15, 0.15, 'sawtooth'); }
  step(dist = 0) { this.burst(500 + Math.random() * 300, 0.06, 0.12, dist); }
  alarm(dist = 0) { for (let i = 0; i < 6; i++) setTimeout(() => this.tone(i % 2 ? 700 : 950, 0.25, 0.22, 'sawtooth', dist), i * 260); }
  pick() { this.tone(1500, 0.03, 0.12, 'square'); }
  levelup() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 0.18, 'triangle'), i * 110)); }
  elevator() { this.tone(70, 3, 0.25, 'sawtooth'); this.burst(200, 3, 0.15); }
  register() { this.tone(2000, 0.1, 0.2, 'triangle'); setTimeout(() => this.metal(), 60); }
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmt = (n) => '$' + Math.round(n).toLocaleString();
