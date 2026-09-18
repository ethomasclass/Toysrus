import * as THREE from 'three';
import { STORE, COLORS, STRIPES, LOGO_LETTERS, FT } from './config.js';
import { floorTexture, asphaltTexture, concreteTexture, textSignTexture, starLogoTexture, memo } from './textures.js';
import { M } from './fixtures.js';

const W = STORE.width, D = STORE.depth, H = STORE.ceiling, R = STORE.roof;

function tex(c, repeat) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; }

// Exterior wall: pale aquamarine block in a rectangular pattern with vertical panel joints
function exteriorTexture(rx, ry) {
  return memo('ext' + rx + ry, () => {
    const s = 512, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d');
    g.fillStyle = COLORS.exteriorJoint; g.fillRect(0, 0, s, s);
    const bw = 128, bh = 32;
    for (let y = 0, row = 0; y < s; y += bh, row++) for (let x = -bw; x < s; x += bw) {
      const sh = 0.94 + Math.random() * 0.1; const col = new THREE.Color(COLORS.exteriorWall).multiplyScalar(sh);
      g.fillStyle = col.getStyle(); g.fillRect(x + (row % 2 ? bw / 2 : 0) + 2, y + 2, bw - 4, bh - 4);
    }
    return tex(c, [rx, ry]);
  });
}
// 1986-era block-letter wordmark drawn per-letter with the mirrored R
export function logoTexture(w = 2048, h = 512, transparent = true) {
  return memo('logo' + w + h + transparent, () => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    if (!transparent) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
    const fh = h * 0.72; g.font = `900 ${fh}px "Arial Black", Arial, sans-serif`; g.textBaseline = 'middle';
    const widths = LOGO_LETTERS.map(l => g.measureText(l[0]).width);
    const gap = fh * 0.12, total = widths.reduce((a, b) => a + b, 0) + gap * (LOGO_LETTERS.length - 1) + fh * 0.5;
    let x = (w - total) / 2;
    LOGO_LETTERS.forEach(([ch, col, mirror], i) => {
      const lw = widths[i]; const y = h / 2 + (i % 2 ? -fh * 0.06 : fh * 0.06);
      g.save(); g.translate(x + lw / 2, y); g.rotate((i % 2 ? -1 : 1) * 0.06);
      if (mirror) { g.scale(-1, 1); }
      g.lineWidth = fh * 0.1; g.strokeStyle = '#fff'; g.strokeText(ch, -lw / 2, 0);
      if (mirror) { g.strokeStyle = col; g.lineWidth = fh * 0.05; g.fillStyle = '#fff'; g.fillText(ch, -lw / 2, 0); g.strokeText(ch, -lw / 2, 0); }
      else { g.fillStyle = col; g.fillText(ch, -lw / 2, 0); }
      g.restore();
      x += lw + gap + (i === 3 || i === 4 ? fh * 0.25 : 0);
    });
    return tex(c);
  });
}
function stripePanelTexture() {
  return memo('stripepanel', () => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
    const n = STRIPES.length, sw = 512 / (n * 2);
    for (let i = 0; i < n * 2; i++) { g.fillStyle = STRIPES[i % n]; g.fillRect(i * sw, 0, sw, 64); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(i * sw + sw - 4, 0, 4, 64); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(i * sw, 0, 3, 64); }
    return tex(c, [3, 1]);
  });
}
function ceilingTexture() {
  return memo('ceil', () => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = COLORS.ceiling; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 900; i++) g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    g.strokeStyle = '#c9c9c4'; g.lineWidth = 3; g.strokeRect(1, 1, 254, 254); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke();
    const t = tex(c, [W / 1.2, D / 0.6]); return t;
  });
}

function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }

export function buildExterior(world) {
  const S = world.scene;
  // ground: parking lot in front (+z) wrapping the west side; concrete apron at the walls
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ map: asphaltTexture(60, 60) }));
  lot.rotation.x = -Math.PI / 2; lot.position.y = -0.02; S.add(lot);
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(W + 12, D + 12), new THREE.MeshLambertMaterial({ map: concreteTexture(30, 30) }));
  apron.rotation.x = -Math.PI / 2; apron.position.y = -0.01; S.add(apron);
  // parking stripes
  const stripeMat = new THREE.MeshBasicMaterial({ color: '#e8e2c0' });
  for (let row = 0; row < 3; row++) for (let i = 0; i < 30; i++) {
    const s = box(0.12, 0.01, 5.4, stripeMat, -60 + i * 2.75 + (row % 2) * 1.2, 0.0, D / 2 + 14 + row * 12);
    S.add(s);
  }
  // light poles
  for (let i = 0; i < 6; i++) { const p = box(0.25, 12, 0.25, M.dark, -55 + i * 22, 6, D / 2 + 26); S.add(p); const head = box(1.6, 0.3, 0.5, M.dark, p.position.x, 12, p.position.z); S.add(head); const lamp = new THREE.PointLight('#ffe8b0', 0, 40); lamp.position.set(p.position.x, 11.5, p.position.z); S.add(lamp); }

  // Loveman's box: tall windowless slab. Toys R Us half + the Books-A-Million half to the east (+x).
  const extMat = new THREE.MeshLambertMaterial({ map: exteriorTexture(24, 10) });
  const t = STORE.wallThick;
  const bamW = W * 0.85;
  const totalW = W + bamW;
  const cx = (bamW) / 2; // center of combined mass (TRU is x in [-W/2, W/2]; BAM continues to W/2 + bamW)
  // front wall (+z) with a door opening left for the vestibule
  const doorX = -6, doorW = 7;
  const frontL = box((doorX - doorW / 2) - (-W / 2), R, t, extMat, ((doorX - doorW / 2) + (-W / 2)) / 2, R / 2, D / 2); S.add(frontL);
  const frontR = box((W / 2 + bamW) - (doorX + doorW / 2), R, t, extMat, ((W / 2 + bamW) + (doorX + doorW / 2)) / 2, R / 2, D / 2); S.add(frontR);
  const lintel = box(doorW, R - 3.2, t, extMat, doorX, 3.2 + (R - 3.2) / 2, D / 2); S.add(lintel);
  S.add(box(totalW, R, t, extMat, cx, R / 2, -D / 2));          // back
  S.add(box(t, R, D, extMat, -W / 2, R / 2, 0));                 // west
  S.add(box(t, R, D, extMat, W / 2 + bamW, R / 2, 0));           // east (BAM end)
  S.add(box(totalW, 0.5, D, new THREE.MeshLambertMaterial({ color: '#777' }), cx, R + 0.25, 0)); // roof slab
  // parapet cap
  S.add(box(totalW + 0.6, 0.4, D + 0.6, new THREE.MeshLambertMaterial({ color: '#e9eeec' }), cx, R + 0.6, 0));
  // vertical panel joints on the front (Loveman's paneling)
  const jointMat = new THREE.MeshLambertMaterial({ color: COLORS.exteriorJoint });
  for (let x = -W / 2 + 6; x < W / 2 + bamW; x += 6) S.add(box(0.12, R, 0.08, jointMat, x, R / 2, D / 2 + t / 2 + 0.02));

  // Big 1986-era wordmark high on the front wall over the entrance
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(20, 7.5), new THREE.MeshBasicMaterial({ map: starLogoTexture(), transparent: true }));
  logo.position.set(doorX + 3, R - 3.6, D / 2 + t / 2 + 0.3); S.add(logo);
  const logoLight = new THREE.PointLight('#fff', 0, 30); logoLight.position.set(doorX, R - 8, D / 2 + 6); S.add(logoLight);
  // rainbow stripe planks flanking the entrance
  const stripes = new THREE.MeshLambertMaterial({ map: stripePanelTexture() });
  S.add(box(9, 4.2, 0.15, stripes, doorX - doorW / 2 - 4.6, 2.1, D / 2 + t / 2 + 0.08));
  S.add(box(9, 4.2, 0.15, stripes, doorX + doorW / 2 + 4.6, 2.1, D / 2 + t / 2 + 0.08));
  // blue fascia band across the storefront (late-90s remodel look)
  S.add(box(W, 1.2, 0.12, new THREE.MeshLambertMaterial({ color: COLORS.blue }), 0, 4.9, D / 2 + t / 2 + 0.07));
  // Books-A-Million lettering on its half
  const bam = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshBasicMaterial({ map: textSignTexture(['BOOKS-A-MILLION'], { bg: '#ffffff', fg: '#1d4f9e', font: '900 90px "Arial Black", Arial' }) }));
  bam.position.set(W / 2 + bamW / 2, R - 6, D / 2 + t / 2 + 0.3); S.add(bam);
  // BAM canopy with split-face block piers
  const canopy = box(bamW - 10, 0.8, 6, new THREE.MeshLambertMaterial({ color: '#e3e3dd' }), W / 2 + bamW / 2, 4.5, D / 2 + 3.2); S.add(canopy);
  const pierMat = new THREE.MeshLambertMaterial({ color: '#c9b591' });
  for (let i = 0; i < 6; i++) S.add(box(0.8, 4.5, 0.8, pierMat, W / 2 + 6 + i * (bamW - 12) / 5, 2.25, D / 2 + 5.8));

  // Entrance vestibule: glass box projecting from the front wall, ENTRANCE/EXIT signs, Geoffrey welcome
  const vW = doorW + 3, vD = 4;
  const vz = D / 2 + t / 2 + vD / 2;
  S.add(box(vW, 0.25, vD, M.white, doorX, 3.3, vz)); // vestibule roof
  const glassMat = M.glass;
  S.add(box(0.1, 3.2, vD, glassMat, doorX - vW / 2, 1.6, vz)); S.add(box(0.1, 3.2, vD, glassMat, doorX + vW / 2, 1.6, vz));
  // front of vestibule: door frames with two openings
  S.add(box(vW, 0.3, 0.1, M.dark, doorX, 3.05, vz + vD / 2)); // header
  S.add(box(0.12, 3.2, 0.12, M.dark, doorX - vW / 2, 1.6, vz + vD / 2)); S.add(box(0.12, 3.2, 0.12, M.dark, doorX, 1.6, vz + vD / 2)); S.add(box(0.12, 3.2, 0.12, M.dark, doorX + vW / 2, 1.6, vz + vD / 2));
  // door glass panels (open passages left clear; add half-height side lites)
  S.add(box(1.4, 3.0, 0.05, glassMat, doorX - vW / 2 + 0.75, 1.5, vz + vD / 2)); S.add(box(1.4, 3.0, 0.05, glassMat, doorX + vW / 2 - 0.75, 1.5, vz + vD / 2));
  const entSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: textSignTexture(['ENTRANCE'], { bg: '#8b4a1a', fg: '#ffffff', font: '900 110px "Arial Black", Arial', w: 1024, h: 256 }) }));
  entSign.position.set(doorX - 2.2, 3.55, vz + vD / 2 + 0.05); S.add(entSign);
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: textSignTexture(['EXIT ONLY'], { bg: '#ffffff', fg: '#1d4f9e', font: '900 110px "Arial Black", Arial', w: 1024, h: 256, stripes: true }) }));
  exitSign.position.set(doorX + 2.2, 3.55, vz + vD / 2 + 0.05); S.add(exitSign);
  // welcome sign
  const welcome = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: textSignTexture(['WELCOME', 'TO TOYS "R" US', 'Huntsville  ·  Store 8809'], { bg: '#ffd200', fg: '#1d4f9e', font: '900 80px "Arial Black", Arial' }) }));
  welcome.position.set(doorX - vW / 2 - 0.06, 1.8, vz); welcome.rotation.y = Math.PI / 2; S.add(welcome);
  // vending machines in the vestibule
  S.add(box(0.9, 1.8, 0.8, new THREE.MeshLambertMaterial({ color: '#c8102e' }), doorX + vW / 2 - 0.6, 0.9, vz - 0.9));
  S.add(box(0.9, 1.8, 0.8, new THREE.MeshLambertMaterial({ color: '#1d4f9e' }), doorX + vW / 2 - 0.6, 0.9, vz + 0.2));
  world.addCollider(doorX + vW / 2 - 0.6, vz - 0.35, 0.9, 1.9);
  // vestibule colliders (side walls)
  world.addCollider(doorX - vW / 2, vz, 0.2, vD); world.addCollider(doorX + vW / 2, vz, 0.2, vD);
  world.addCollider(doorX - vW / 2 + 0.75, vz + vD / 2, 1.4, 0.1); world.addCollider(doorX + vW / 2 - 0.75, vz + vD / 2, 1.4, 0.1);

  // Cart corral + carts out front
  cartCorral(world, doorX + 14, D / 2 + 12);
  for (let i = 0; i < 5; i++) shoppingCart(world, doorX - 8 + i * 0.7, D / 2 + 3, Math.PI);
  for (let i = 0; i < 3; i++) shoppingCart(world, doorX + 13 + i * 0.7, D / 2 + 12, 0);

  // Road pylon sign by the lot entrance
  const pyl = box(0.5, 9, 0.5, M.dark, 40, 4.5, D / 2 + 45); S.add(pyl);
  const pylSign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.6), new THREE.MeshBasicMaterial({ map: starLogoTexture(1024, 384, '#ffffff'), side: THREE.DoubleSide }));
  pylSign.position.set(40, 10.5, D / 2 + 45); S.add(pylSign);
  const pylFrame = box(8.3, 2.9, 0.2, new THREE.MeshLambertMaterial({ color: '#5a3e2b' }), 40, 10.5, D / 2 + 45.15); S.add(pylFrame);

  // exterior colliders
  world.addCollider(((doorX - doorW / 2) + (-W / 2)) / 2, D / 2, (doorX - doorW / 2) - (-W / 2), t);
  world.addCollider(((W / 2 + bamW) + (doorX + doorW / 2)) / 2, D / 2, (W / 2 + bamW) - (doorX + doorW / 2), t);
  world.addCollider(cx, -D / 2, totalW, t); world.addCollider(-W / 2, 0, t, D); world.addCollider(W / 2 + bamW, 0, t, D);
  for (let i = 0; i < 6; i++) world.addCollider(W / 2 + 6 + i * (bamW - 12) / 5, D / 2 + 5.8, 0.8, 0.8);
  for (let i = 0; i < 6; i++) world.addCollider(-55 + i * 22, D / 2 + 26, 0.3, 0.3);
  world.addCollider(40, D / 2 + 45, 0.5, 0.5);
  return { doorX, doorW, bamW };
}

export function shoppingCart(world, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const wire = new THREE.MeshStandardMaterial({ color: '#b8b8b8', metalness: 0.7, roughness: 0.4, transparent: true, opacity: 0.85 });
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.85), wire); basket.position.set(0, 0.75, 0); g.add(basket);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), M.blue); handle.rotation.z = Math.PI / 2; handle.position.set(0, 1.0, 0.5); g.add(handle);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.8), wire); frame.position.set(0, 0.2, 0); g.add(frame);
  for (const [dx, dz] of [[-0.22, -0.35], [0.22, -0.35], [-0.22, 0.35], [0.22, 0.35]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04), M.dark); w.rotation.z = Math.PI / 2; w.position.set(dx, 0.06, dz); g.add(w); }
  world.scene.add(g); world.addCollider(x, z, 0.6, 0.9);
  return g;
}
function cartCorral(world, x, z) {
  const rail = new THREE.MeshLambertMaterial({ color: '#e0e0e0' });
  for (const dx of [-1.2, 1.2]) { const r = box(0.08, 1.0, 8, rail, x + dx, 0.5, z); world.scene.add(r); world.addCollider(x + dx, z, 0.1, 8); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), new THREE.MeshBasicMaterial({ map: textSignTexture(['CART RETURN'], { bg: '#1d4f9e', fg: '#fff', font: '900 100px "Arial Black", Arial', w: 1024, h: 320 }), side: THREE.DoubleSide }));
  sign.position.set(x, 2.2, z - 4); world.scene.add(sign);
  const post = box(0.08, 2, 0.08, rail, x, 1, z - 4); world.scene.add(post);
  for (let i = 0; i < 4; i++) shoppingCart(world, x, z - 2.5 + i * 0.75, 0);
}

export function buildInterior(world, ext) {
  const S = world.scene;
  const t = STORE.wallThick;
  // sales floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - t, D - t), new THREE.MeshLambertMaterial({ map: floorTexture((W - t) / 1.22, (D - t) / 1.22) }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; S.add(floor);
  // interior walls (inside the exterior shell): white block with a royal blue band
  const wallMat = new THREE.MeshLambertMaterial({ color: COLORS.wall });
  const bandMat = new THREE.MeshLambertMaterial({ color: COLORS.wallBand });
  const inner = [
    { w: W, h: H + 1, d: 0.1, x: 0, z: -D / 2 + t / 2 + 0.06 },  // back
    { w: 0.1, h: H + 1, d: D, x: -W / 2 + t / 2 + 0.06, z: 0 },   // west
    { w: 0.1, h: H + 1, d: D, x: W / 2 - t / 2 - 0.06, z: 0 },    // east (party wall to BAM)
  ];
  for (const s of inner) { S.add(box(s.w, s.h, s.d, wallMat, s.x, (H + 1) / 2, s.z)); S.add(box(s.w + 0.02, 0.6, s.d + 0.02, bandMat, s.x, 2.9, s.z)); }
  // front interior wall around the door
  const { doorX, doorW } = ext;
  const fz = D / 2 - t / 2 - 0.06;
  S.add(box((doorX - doorW / 2) + W / 2, H + 1, 0.1, wallMat, ((doorX - doorW / 2) - W / 2) / 2, (H + 1) / 2, fz));
  S.add(box(W / 2 - (doorX + doorW / 2), H + 1, 0.1, wallMat, (W / 2 + doorX + doorW / 2) / 2, (H + 1) / 2, fz));
  S.add(box(doorW, H - 3.2, 0.1, wallMat, doorX, 3.2 + (H - 3.2) / 2, fz));
  S.add(box((doorX - doorW / 2) + W / 2, 0.6, 0.12, bandMat, ((doorX - doorW / 2) - W / 2) / 2, 2.9, fz));
  S.add(box(W / 2 - (doorX + doorW / 2), 0.6, 0.12, bandMat, (W / 2 + doorX + doorW / 2) / 2, 2.9, fz));
  world.addCollider(((doorX - doorW / 2) - W / 2) / 2, fz, (doorX - doorW / 2) + W / 2, 0.2);
  world.addCollider((W / 2 + doorX + doorW / 2) / 2, fz, W / 2 - (doorX + doorW / 2), 0.2);
  world.addCollider(0, -D / 2 + 0.3, W, 0.3); world.addCollider(-W / 2 + 0.3, 0, 0.3, D); world.addCollider(W / 2 - 0.3, 0, 0.3, D);

  // drop ceiling: white 2x4 lay-in tiles
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: ceilingTexture(), side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H; S.add(ceil);
  // fluorescent troffers in rows, running with the aisles (front-to-back)
  const troffer = new THREE.MeshBasicMaterial({ color: '#f6fbff' });
  const geo = new THREE.BoxGeometry(0.6, 0.06, 1.2);
  const cols = Math.floor(W / 3.0), rows = Math.floor(D / 2.4);
  const inst = new THREE.InstancedMesh(geo, troffer, cols * rows);
  let k = 0;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const m = new THREE.Matrix4().makeTranslation(-W / 2 + 1.5 + i * 3.0, H - 0.03, -D / 2 + 1.2 + j * 2.4);
    inst.setMatrixAt(k++, m);
  }
  S.add(inst);
  // steel columns on a 30' grid
  const colMat = new THREE.MeshLambertMaterial({ color: '#e8e8e4' });
  for (let x = -W / 2 + 30 * FT; x < W / 2 - 1; x += 30 * FT) for (let z = -D / 2 + 30 * FT; z < D / 2 - 1; z += 30 * FT) {
    S.add(box(0.35, H, 0.35, colMat, x, H / 2, z)); world.addCollider(x, z, 0.35, 0.35);
  }
  // sealed mall door on the east party wall (the 1998 photo shows this doorway from the mall side)
  const mallDoor = box(2.4, 2.6, 0.12, new THREE.MeshLambertMaterial({ color: '#bfb8a8' }), W / 2 - t / 2 - 0.15, 1.3, -D / 2 + 30);
  S.add(mallDoor);
  const mallSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ map: textSignTexture(['MALL ENTRANCE CLOSED — PLEASE USE FRONT DOORS'], { bg: '#fff', fg: '#c8102e', font: 'bold 44px Arial', w: 1024, h: 200 }) }));
  mallSign.position.set(W / 2 - t / 2 - 0.22, 2.9 + 0.0, -D / 2 + 30); mallSign.rotation.y = -Math.PI / 2; S.add(mallSign);
}
