import * as THREE from 'three';
import { COLORS } from './config.js';
import { productTexture, blisterTexture, priceTagTexture, aisleSignTexture, memo } from './textures.js';

// Batches all product placements into InstancedMeshes (one per product) so 30k boxes stay cheap.
export class Batcher {
  constructor(scene) { this.scene = scene; this.groups = new Map(); this.meshes = []; }
  add(key, factory, matrix, info) {
    let g = this.groups.get(key);
    if (!g) { g = { factory, mats: [], infos: [] }; this.groups.set(key, g); }
    g.mats.push(matrix); g.infos.push(info);
  }
  finalize() {
    for (const [key, g] of this.groups) {
      const { geometry, material } = g.factory();
      const m = new THREE.InstancedMesh(geometry, material, g.mats.length);
      g.mats.forEach((mat, i) => m.setMatrixAt(i, mat));
      m.instanceMatrix.needsUpdate = true;
      m.userData.infos = g.infos; m.userData.interactive = true;
      m.frustumCulled = true;
      this.scene.add(m); this.meshes.push(m);
    }
    this.groups.clear();
    return this.meshes;
  }
}

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

export function boxDims(p) {
  const r = hash(p.name);
  if (p.pack === 'big') return { w: 0.75 + r * 0.5, h: 0.55 + r * 0.45, d: 0.45 + r * 0.25 };
  if (p.pack === 'blister') return { w: 0.15 + r * 0.05, h: 0.22 + r * 0.06, d: 0.035 };
  const big = /Console|System|Deck|House|Playset|Set$|Station|Castle|Kitchen|Factory|Zord|Falcon|Truck|Farm|Slot|Train/i.test(p.name);
  return big ? { w: 0.42 + r * 0.2, h: 0.30 + r * 0.15, d: 0.16 + r * 0.1 } : { w: 0.22 + r * 0.12, h: 0.26 + r * 0.1, d: 0.09 + r * 0.06 };
}

function boxFactory(p) {
  return () => {
    const { w, h, d } = boxDims(p);
    const geometry = new THREE.BoxGeometry(w, h, d);
    const front = new THREE.MeshLambertMaterial({ map: productTexture(p) });
    const side = new THREE.MeshLambertMaterial({ color: new THREE.Color(p.colors[0]).multiplyScalar(0.85) });
    const top = new THREE.MeshLambertMaterial({ color: new THREE.Color(p.colors[1]).lerp(new THREE.Color(p.colors[0]), 0.5) });
    // +x, -x, +y, -y, +z(front), -z
    return { geometry, material: [side, side, top, top, front, side] };
  };
}
function blisterFactory(p) {
  return () => {
    const { w, h } = boxDims(p);
    const geometry = new THREE.PlaneGeometry(w, h);
    return { geometry, material: new THREE.MeshLambertMaterial({ map: blisterTexture(p), side: THREE.DoubleSide }) };
  };
}
function tagFactory(price) {
  return () => ({ geometry: new THREE.PlaneGeometry(0.09, 0.045), material: new THREE.MeshBasicMaterial({ map: priceTagTexture(price) }) });
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
export function mat(x, y, z, ry = 0) { _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry); _p.set(x, y, z); return new THREE.Matrix4().compose(_p, _q, _s); }

// Shared fixture materials
export const M = {
  steel: new THREE.MeshLambertMaterial({ color: COLORS.gondola }),
  base: new THREE.MeshLambertMaterial({ color: COLORS.gondolaBase }),
  channel: new THREE.MeshLambertMaterial({ color: COLORS.priceChannel }),
  peg: new THREE.MeshLambertMaterial({ color: '#f4f1ea' }),
  hook: new THREE.MeshLambertMaterial({ color: '#c8c8c8' }),
  carton: new THREE.MeshLambertMaterial({ color: '#b98a5a' }),
  carton2: new THREE.MeshLambertMaterial({ color: '#a97b4c' }),
  blue: new THREE.MeshLambertMaterial({ color: COLORS.blue }),
  yellow: new THREE.MeshLambertMaterial({ color: COLORS.yellow }),
  white: new THREE.MeshLambertMaterial({ color: '#f5f5f5' }),
  dark: new THREE.MeshLambertMaterial({ color: '#222' }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.25, roughness: 0.1 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d8d8d8', metalness: 0.8, roughness: 0.3 }),
};

export function pegboardTexture() {
  return memo('pegboard', () => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#c9c4ba';
    for (let y = 8; y < 128; y += 16) for (let x = 8; x < 128; x += 16) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 16); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
}

/**
 * A double-sided gondola run.
 * @param opts {x,z,len, ry, height, deptA, deptB, styleA, styleB('shelf'|'peg'), aisleA, aisleB, overstock}
 * Runs along local +x; sides face +z (A) and -z (B).
 */
export function gondola(world, o) {
  const g = new THREE.Group();
  const len = o.len, H = o.height || 3.6, depth = 1.0, shelfD = 0.45;
  g.position.set(o.x, 0, o.z); g.rotation.y = o.ry || 0;
  // base deck + back panel
  const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.15, depth), M.base); base.position.y = 0.075; g.add(base);
  const back = new THREE.Mesh(new THREE.BoxGeometry(len, H, 0.05), M.steel); back.position.y = H / 2; g.add(back);
  // uprights every 1.2 m
  const bays = Math.round(len / 1.2);
  const upG = new THREE.BoxGeometry(0.06, H, depth);
  const ups = new THREE.InstancedMesh(upG, M.steel, bays + 1);
  for (let i = 0; i <= bays; i++) ups.setMatrixAt(i, mat(-len / 2 + i * len / bays, H / 2, 0));
  g.add(ups);
  // overstock cartons on top (warehouse look)
  if (o.overstock !== false) {
    for (let i = 0; i < bays; i++) {
      const n = 1 + Math.floor(hash(o.x + ':' + i + o.z) * 3);
      for (let k = 0; k < n; k++) {
        const cw = 0.5 + hash(i + 'w' + k) * 0.5, ch = 0.35 + hash(i + 'h' + k) * 0.35, cd = 0.6 + hash(i + 'd' + k) * 0.35;
        const c = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), k % 2 ? M.carton : M.carton2);
        c.position.set(-len / 2 + (i + 0.5) * 1.2 + (hash('cx' + i + k) - 0.5) * 0.4, H + ch / 2 + (k > 1 ? 0.35 : 0), (hash('cz' + i + k) - 0.5) * 0.3);
        c.rotation.y = (hash('cr' + i + k) - 0.5) * 0.3;
        g.add(c);
      }
    }
  }
  const sides = [{ sign: 1, dept: o.deptA, style: o.styleA || 'shelf', aisle: o.aisleA }, { sign: -1, dept: o.deptB, style: o.styleB || 'shelf', aisle: o.aisleB }];
  for (const s of sides) {
    if (!s.dept) continue;
    if (s.style === 'peg') pegSide(world, g, s, len, H, depth);
    else shelfSide(world, g, s, len, H, depth, shelfD);
  }
  // collider (world space, axis aligned only for ry = 0 or PI/2)
  world.addCollider(o.x, o.z, o.ry ? depth : len, o.ry ? len : depth);
  world.scene.add(g);
  return g;
}

const SHELF_Y = [0.15, 0.62, 1.09, 1.56, 2.03, 2.5];
function shelfSide(world, g, s, len, H, depth, shelfD) {
  const zoff = s.sign * (depth / 2 - shelfD / 2);
  const shelfGeo = new THREE.BoxGeometry(len, 0.03, shelfD);
  const chanGeo = new THREE.BoxGeometry(len, 0.05, 0.02);
  for (const y of SHELF_Y) {
    const sh = new THREE.Mesh(shelfGeo, M.steel); sh.position.set(0, y, zoff); g.add(sh);
    const ch = new THREE.Mesh(chanGeo, M.channel); ch.position.set(0, y + 0.03, s.sign * (depth / 2 - 0.01)); g.add(ch);
  }
  // fill bays with facings
  const bays = Math.round(len / 1.2);
  const prods = s.dept.products.filter(p => p.pack !== 'big');
  let pi = Math.floor(hash(s.dept.id + g.position.x + s.sign) * prods.length);
  const gq = new THREE.Quaternion().setFromEuler(g.rotation);
  for (let b = 0; b < bays; b++) {
    for (let li = 0; li < SHELF_Y.length; li++) {
      const y = SHELF_Y[li];
      const clearance = (li < SHELF_Y.length - 1 ? SHELF_Y[li + 1] - y : 0.6) - 0.06;
      const p = prods[pi++ % prods.length];
      const isBl = p.pack === 'blister';
      const { w, h, d } = boxDims(p);
      if (h > clearance) { pi++; continue; }
      const n = Math.max(1, Math.floor(1.14 / (w + 0.02)));
      const stack = Math.max(1, Math.floor(clearance / (h + 0.01)));
      const rows = isBl ? 1 : Math.min(3, Math.floor(shelfD / (d + 0.02)));
      const rot = s.sign > 0 ? 0 : Math.PI;
      for (let i = 0; i < n; i++) for (let st = 0; st < Math.min(stack, 2); st++) for (let r = 0; r < rows; r++) {
        const lx = -len / 2 + b * 1.2 + 0.06 + w / 2 + i * (w + 0.02);
        const lz = s.sign * (depth / 2 - 0.02 - d / 2 - r * (d + 0.02));
        const lp = new THREE.Vector3(lx, y + 0.015 + h / 2 + st * (h + 0.01), isBl ? lz : lz).applyEuler(g.rotation).add(g.position);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot).premultiply(gq);
        const m = new THREE.Matrix4().compose(lp, q, new THREE.Vector3(1, 1, 1));
        world.batch.add((isBl ? 'bl:' : 'bx:') + p.name, isBl ? blisterFactory(p) : boxFactory(p), m, { product: p, dept: s.dept });
      }
      // price tag on channel
      const tp = new THREE.Vector3(-len / 2 + b * 1.2 + 0.15, y + 0.03, s.sign * (depth / 2 + 0.002)).applyEuler(g.rotation).add(g.position);
      const tq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot).premultiply(gq);
      world.batch.add('tag:' + p.price, tagFactory(p.price), new THREE.Matrix4().compose(tp, tq, new THREE.Vector3(1, 1, 1)), { product: p, dept: s.dept });
    }
  }
}

function pegSide(world, g, s, len, H, depth) {
  const zoff = s.sign * (depth / 2 - 0.02);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(len, H - 0.3), new THREE.MeshLambertMaterial({ map: pegboardTexture() }));
  board.position.set(0, H / 2 + 0.05, zoff); board.rotation.y = s.sign > 0 ? 0 : Math.PI; g.add(board);
  // bottom shelf for boxed items
  const sh = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.45), M.steel); sh.position.set(0, 0.15, s.sign * 0.27); g.add(sh);
  const prods = s.dept.products.filter(p => p.pack === 'blister');
  const boxed = s.dept.products.filter(p => p.pack === 'box');
  let pi = Math.floor(hash('peg' + s.dept.id + g.position.z) * prods.length);
  const gq = new THREE.Quaternion().setFromEuler(g.rotation);
  const rot = s.sign > 0 ? 0 : Math.PI;
  const bays = Math.round(len / 1.2);
  const hookGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.22);
  const hooks = [];
  for (let b = 0; b < bays; b++) {
    // 5 columns x 8 rows of cards per bay, each column one product
    for (let col = 0; col < 5; col++) {
      const p = prods[pi++ % prods.length];
      const { w, h } = boxDims(p);
      const lx = -len / 2 + b * 1.2 + 0.12 + col * 0.235;
      for (let row = 0; row < 8; row++) {
        const y = 0.55 + row * 0.36;
        if (y + h / 2 > H - 0.2) break;
        for (let k = 0; k < 3; k++) { // 3 cards deep on each hook
          const lp = new THREE.Vector3(lx, y, s.sign * (depth / 2 + 0.03 + 0.19 - k * 0.04)).applyEuler(g.rotation).add(g.position);
          const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot).premultiply(gq);
          world.batch.add('bl:' + p.name, blisterFactory(p), new THREE.Matrix4().compose(lp, q, new THREE.Vector3(1, 1, 1)), { product: p, dept: s.dept });
        }
        hooks.push(new THREE.Vector3(lx, y + h / 2 - 0.02, s.sign * (depth / 2 + 0.11)));
      }
      const tp = new THREE.Vector3(lx, 0.36, s.sign * (depth / 2 + 0.002)).applyEuler(g.rotation).add(g.position);
      world.batch.add('tag:' + p.price, tagFactory(p.price), new THREE.Matrix4().compose(tp, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot).premultiply(gq), new THREE.Vector3(1, 1, 1)), { product: p, dept: s.dept });
    }
    // boxes on bottom shelf
    if (boxed.length) {
      const p = boxed[(b + Math.floor(hash(s.dept.id) * 7)) % boxed.length];
      const { w, h, d } = boxDims(p);
      const n = Math.max(1, Math.floor(1.1 / (w + 0.02)));
      for (let i = 0; i < n; i++) {
        const lp = new THREE.Vector3(-len / 2 + b * 1.2 + 0.08 + w / 2 + i * (w + 0.02), 0.165 + h / 2, s.sign * (depth / 2 - 0.02 - d / 2)).applyEuler(g.rotation).add(g.position);
        world.batch.add('bx:' + p.name, boxFactory(p), new THREE.Matrix4().compose(lp, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot).premultiply(gq), new THREE.Vector3(1, 1, 1)), { product: p, dept: s.dept });
      }
    }
  }
  const hm = new THREE.InstancedMesh(hookGeo, M.hook, hooks.length);
  hooks.forEach((v, i) => { const m = new THREE.Matrix4().compose(v, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)); hm.setMatrixAt(i, m); });
  g.add(hm);
}

// Floor stack of large cartons (Power Wheels, Little Tikes, diapers, swing sets)
export function floorStack(world, dept, x, z, cols, rows, ry = 0, tiers = 2, filter = p => p.pack === 'big') {
  const prods = dept.products.filter(filter);
  if (!prods.length) return;
  let pi = Math.floor(hash(dept.id + x + z) * prods.length);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
  const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(q), dz = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  let cx = 0;
  for (let c = 0; c < cols; c++) {
    const p = prods[pi++ % prods.length]; const { w, h, d } = boxDims(p);
    for (let r = 0; r < rows; r++) for (let t = 0; t < tiers; t++) {
      const pos = new THREE.Vector3(x, h / 2 + t * (h + 0.01), z).addScaledVector(dir, cx + w / 2).addScaledVector(dz, -r * (d + 0.03));
      world.batch.add('bx:' + p.name, boxFactory(p), new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)), { product: p, dept });
    }
    cx += w + 0.05;
  }
  world.addCollider(x + dir.x * cx / 2 - dz.x * rows * 0.35, z + dir.z * cx / 2 - dz.z * rows * 0.35, Math.abs(dir.x) * cx + Math.abs(dz.x) * rows * 0.7 + 0.2, Math.abs(dir.z) * cx + Math.abs(dz.z) * rows * 0.7 + 0.2);
}

export function aisleSign(world, x, z, num, lines, y = 3.9, ry = 0) {
  const t = aisleSignTexture(num, lines);
  const geo = new THREE.PlaneGeometry(1.5, 1.1);
  const mesh = new THREE.Group(); mesh.position.set(x, y, z); mesh.rotation.y = ry;
  const a = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t })); a.position.z = 0.01;
  const b = new THREE.Mesh(geo, a.material); b.position.z = -0.01; b.rotation.y = Math.PI; mesh.add(a, b);
  world.scene.add(mesh);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.5), M.hook); wire.position.set(x, y + 0.8, z); world.scene.add(wire);
  return mesh;
}
