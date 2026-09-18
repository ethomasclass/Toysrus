import * as THREE from 'three';
import { STORE, COLORS } from './config.js';
import { DEPARTMENTS, byId } from './products.js';
import { gondola, floorStack, aisleSign, M, boxDims } from './fixtures.js';
import { shoppingCart } from './building.js';
import { bannerTexture, textSignTexture, posterTexture, geoffreyTexture, medallionTexture, bladeTexture, productTexture, memo } from './textures.js';

const W = STORE.width, D = STORE.depth, H = STORE.ceiling;
const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const plane = (w, h, tex, x, y, z, ry = 0, ds = false) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); m.position.set(x, y, z); m.rotation.y = ry;
  if (!ds) return m;
  // two-sided sign: a second plane facing the other way so the text never reads mirrored
  const g = new THREE.Group(); g.position.copy(m.position); g.rotation.y = ry; m.position.set(0, 0, 0.01); m.rotation.y = 0;
  const b = new THREE.Mesh(m.geometry, m.material); b.position.set(0, 0, -0.01); b.rotation.y = Math.PI; g.add(m, b); return g;
};

// Teleport / minimap zones. Coordinates: x left(-)..right(+), z back(-)..front(+, entrance).
export const ZONES = [];
function zone(id, name, x1, z1, x2, z2, color, spawn) { ZONES.push({ id, name, x1, z1, x2, z2, color, spawn: spawn || [(x1 + x2) / 2, (z1 + z2) / 2] }); }

export function buildStore(world, ext) {
  const S = world.scene;
  const { doorX } = ext;
  const front = D / 2, back = -D / 2, left = -W / 2, right = W / 2;

  // ---------- FRONT END: action alley, checkouts, customer service, Geoffrey medallion
  const medallion = plane(7, 7, medallionTexture(), doorX + 2, 0.004, front - 9);
  medallion.rotation.x = -Math.PI / 2; medallion.rotation.z = 0; S.add(medallion);
  // colored tile border inlay along the action alley
  const inlay = new THREE.Mesh(new THREE.PlaneGeometry(W - 4, 0.3), new THREE.MeshLambertMaterial({ color: '#2f8f8f' })); inlay.rotation.x = -Math.PI / 2; inlay.position.set(0, 0.003, front - 13.5); S.add(inlay);
  const inlay2 = inlay.clone(); inlay2.material = new THREE.MeshLambertMaterial({ color: COLORS.blue }); inlay2.position.z = front - 13.9; S.add(inlay2);

  // Geoffrey statue on a plinth by the entrance
  geoffreyStatue(world, doorX - 7, front - 5);

  // checkout lanes: 9 lanes to the right of the entrance
  for (let i = 0; i < 9; i++) checkoutLane(world, doorX + 7 + i * 2.6, front - 6.5, i + 1);
  zone('checkout', 'Checkout', doorX + 5, front - 9, doorX + 32, front - 1, '#ffd200', [doorX + 2, front - 4]);
  // customer service / layaway counter, left of the entrance
  serviceCounter(world, doorX - 16, front - 5);
  // video game pickup booth "the cage" by the exit, far left front
  pickupBooth(world, left + 8, front - 5);

  // ---------- LEFT REAR: R ZONE (video games) glass-fronted department
  rZone(world, left + 1, back + 1, 26, 22);
  zone('rzone', 'R Zone · Video Games', left + 1, back + 1, left + 27, back + 23, '#e4322b', [left + 14, back + 26]);

  // ---------- BACK WALL: bikes hung on racks, ride-ons below
  bikeWall(world, left + 30, right - 24, back + 0.6);
  zone('bikes', 'Bikes "R" Us', left + 28, back + 1, right - 22, back + 9, '#2fa84f', [0, back + 7]);

  // ---------- RIGHT REAR: Babies R Us corner with diaper pallets & juvenile racking
  babyCorner(world, right - 22, back + 1, 21, 26);
  zone('baby', 'Babies "R" Us', right - 22, back + 1, right - 1, back + 27, '#8ec5ff', [right - 12, back + 29]);

  // ---------- RIGHT SIDE: Preschool & Little Tikes floor displays, plush wall
  const ltx = right - 12;
  floorStack(world, byId.preschool, ltx - 6, back + 32, 4, 2, 0, 1);
  floorStack(world, byId.preschool, ltx - 6, back + 38, 4, 2, 0, 2);
  floorStack(world, byId.bikes, ltx - 6, back + 44, 3, 2, 0, 2);
  littleTikesDisplay(world, ltx + 2, back + 34);
  S.add(plane(9, 2.2, bannerTexture('Preschool', COLORS.orange, '#fff', 'Fisher-Price · Playskool · Little Tikes'), right - 0.35, 4.6, back + 38, -Math.PI / 2));
  zone('preschool', 'Preschool & Little Tikes', right - 22, back + 28, right - 1, back + 50, '#f58220', [right - 10, back + 41]);

  // ---------- CENTER GRID: gondola runs front-to-back, two blocks with a cross aisle
  // Center-of-store fixtures are low (1.8 m, Concept 2000 style) so you can see across the floor;
  // perimeter runs are 3.6 m warehouse racking with overstock cartons on top.
  const gx0 = left + 30;   // first gondola x
  const pitch = 3.1;       // gondola + 2.1 m aisle
  const nG = 12;
  const blocks = [
    { z: back + 22, len: 20 },   // rear block  (z -22 .. -2 relative)
    { z: front - 27, len: 20 },  // front block (z 3 .. 23)
  ];
  const plan = [
    // [deptA (faces +x side... actually faces +z? no: runs are rotated 90deg so sides face +x/-x)], code letter
    { a: 'action', sa: 'peg', b: 'action', sb: 'peg', code: 'A' },
    { a: 'action', sa: 'shelf', b: 'rc', sb: 'peg', code: 'A' },
    { a: 'rc', sa: 'shelf', b: 'sports', sb: 'peg', code: 'B' },
    { a: 'sports', sa: 'shelf', b: 'games', sb: 'shelf', code: 'B' },
    { a: 'games', sa: 'shelf', b: 'games', sb: 'shelf', code: 'C' },
    { a: 'lego', sa: 'shelf', b: 'lego', sb: 'shelf', code: 'C' },
    { a: 'lego', sa: 'shelf', b: 'crafts', sb: 'shelf', code: 'D' },
    { a: 'crafts', sa: 'shelf', b: 'preschool', sb: 'shelf', code: 'D' },
    { a: 'preschool', sa: 'shelf', b: 'plush', sb: 'peg', code: 'E' },
    { a: 'plush', sa: 'shelf', b: 'dolls', sb: 'shelf', code: 'E' },
    { a: 'dolls', sa: 'shelf', b: 'dolls', sb: 'shelf', code: 'F' },
    { a: 'dolls', sa: 'shelf', b: 'dolls', sb: 'peg', code: 'F' },
  ];
  let aisleNo = 1;
  for (let i = 0; i < nG; i++) {
    const x = gx0 + i * pitch, p = plan[i];
    const low = i >= 2 && i <= 9; const peg = p.sa === 'peg' || p.sb === 'peg';
    for (const b of blocks) {
      const height = low ? (peg ? 2.6 : 2.2) : 3.6;
      gondola(world, { x, z: b.z, len: b.len, ry: Math.PI / 2, height, overstock: !low,
        deptA: byId[p.a], styleA: p.sa, deptB: byId[p.b], styleB: p.sb });
      // end-caps: a 1.2 m bay of feature product on each end of the run
      gondola(world, { x, z: b.z + b.len / 2 + 0.5, len: 1.2, ry: 0, height, overstock: false, deptA: byId[i % 2 ? p.a : p.b], styleA: 'shelf' });
      gondola(world, { x, z: b.z - b.len / 2 - 0.5, len: 1.2, ry: 0, height, overstock: false, deptB: byId[i % 2 ? p.b : p.a], styleB: 'shelf' });
    }
    // aisle signs over the aisle to the right of this gondola (between i and i+1) at both blocks' front ends
    const nextP = plan[i + 1];
    const lines = [byId[p.b].name, nextP ? byId[nextP.a].name : ''].filter(Boolean);
    const sx = x + pitch / 2;
    aisleSign(world, sx, front - 15.5, p.code + aisleNo, [...new Set([...byId[p.b].aisles.slice(0, 2), ...(nextP ? byId[nextP.a].aisles.slice(0, 1) : [])])], 3.9, 0);
    aisleSign(world, sx, back + 34, p.code + aisleNo, lines, 3.9, 0);
    aisleNo++;
  }
  // department zones for the map / teleport (by gondola index)
  const zx = i => gx0 + i * pitch;
  zone('action', 'Action Figures', zx(0) - 1.6, back + 10, zx(1) + 1.6, front - 15, '#1f4fbf', [zx(0) + pitch / 2, front - 17]);
  zone('rc', 'R/C · Hot Wheels', zx(1) + 1.6, back + 10, zx(2) + 1.6, front - 15, '#7f3f98', [zx(1) + pitch / 2, front - 17]);
  zone('sports', 'Sporting Goods', zx(2) + 1.6, back + 10, zx(3) + 1.6, front - 15, '#f58220', [zx(2) + pitch / 2, front - 17]);
  zone('games', 'Games & Puzzles', zx(3) + 1.6, back + 10, zx(5) - 1.6, front - 15, '#2fa84f', [zx(4) + pitch / 2 - pitch, front - 17]);
  zone('lego', 'LEGO', zx(5) - 1.6, back + 10, zx(6) + 1.6, front - 15, '#ffd200', [zx(5) + pitch / 2, front - 17]);
  zone('crafts', 'Arts & Crafts', zx(6) + 1.6, back + 10, zx(7) + 1.6, front - 15, '#2fa84f', [zx(6) + pitch / 2, front - 17]);
  zone('plush', 'Plush & Collectibles', zx(8) + 1.6, back + 10, zx(9) + 1.6, front - 15, '#7f3f98', [zx(8) + pitch / 2, front - 17]);
  zone('dolls', 'The Pink Aisle · Barbie', zx(9) + 1.6, back + 10, zx(11) + 1.6, front - 15, '#ff2d9b', [zx(10) + pitch / 2, front - 17]);

  // LEGO carpet patch under the LEGO aisle (blue carpet, per ex-customer accounts)
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(pitch, 44), new THREE.MeshLambertMaterial({ color: COLORS.carpet }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(zx(5) + pitch / 2, 0.002, back + 34); S.add(carpet);
  // lit LEGO display case at the cross aisle
  displayCase(world, zx(5) + pitch / 2, back + 34 - 22 + 0.5, byId.lego);

  // hanging department blades down the front action alley (blue/yellow, Concept 2000 style)
  const blades = [['Action Figures', zx(0)], ['Hot Wheels & R/C', zx(2)], ['Games', zx(4)], ['LEGO', zx(5) + 1], ['Crafts', zx(7)], ['Plush', zx(9)], ['Barbie', zx(11)]];
  for (const [txt, x] of blades) S.add(plane(3.4, 1.05, bladeTexture(txt), x + pitch / 2, 3.4, front - 14.2, 0, true));
  S.add(plane(3.4, 1.05, bladeTexture('R Zone', 'Video Games · Electronics'), left + 14, 3.4, back + 26, 0, true));
  S.add(plane(3.4, 1.05, bladeTexture('Bikes', 'Ride-Ons · Outdoor'), 0, 3.4, back + 12, 0, true));
  S.add(plane(3.4, 1.05, bladeTexture('Babies', 'Diapers · Formula · Car Seats'), right - 12, 3.4, back + 29, 0, true));
  S.add(plane(3.4, 1.05, bladeTexture('Checkout', 'Layaway · Customer Service'), doorX - 6, 3.4, front - 11, 0, true));

  // Seasonal pad between R Zone and the bikes: pools, swing sets, Power Wheels
  floorStack(world, byId.bikes, left + 30, back + 12, 4, 2, 0, 2);
  floorStack(world, byId.bikes, left + 30, back + 17, 4, 1, 0, 1);
  powerWheels(world, left + 33, back + 21);
  powerWheels(world, left + 36, back + 21, '#ff69b4');

  // wall posters and banners
  S.add(plane(4, 6, geoffreyTexture(), left + 0.4, 4.5, front - 24, Math.PI / 2));
  S.add(plane(4, 6, posterTexture('BIG TOY BOOK', ['Holiday 1996', 'Ask for your', 'FREE copy', 'at the front!'], '#e4322b'), left + 0.4, 4.5, front - 31, Math.PI / 2));
  S.add(plane(4, 6, posterTexture('GEOFFREY\'S', ['BIRTHDAY CLUB', 'Sign up at', 'Customer Service', 'Free balloon & crown!'], '#1d4f9e'), doorX - 24, 4.5, front - 0.6));
  S.add(plane(4, 6, posterTexture('LAYAWAY', ['Now taking', 'holiday layaway', '10% down', 'holds it till Dec 20'], '#2fa84f'), doorX - 19, 4.5, front - 0.6));
  S.add(plane(4, 6, posterTexture('NINTENDO 64', ['NOW IN STOCK', '$199.99', 'Super Mario 64', 'Wave Race 64'], '#e60012'), left + 0.4, 4.5, back + 12, Math.PI / 2));
  S.add(plane(4, 6, posterTexture('TICKLE ME', ['ELMO', 'Sold out —', 'rain checks at', 'customer service'], '#e4322b'), right - 0.4, 4.5, front - 20, -Math.PI / 2));
  S.add(plane(9, 2.2, bannerTexture('Bikes "R" Us', COLORS.green, '#fff', 'Huffy · Murray · Roadmaster · Free assembly'), 0, 6.5, back + 0.45));
  S.add(plane(9, 2.2, bannerTexture('Babies "R" Us', COLORS.blue, '#ffd200', 'Everything for baby'), right - 12, 5.4, back + 0.45));
  S.add(plane(12, 2.4, bannerTexture('Toys "R" Us Kids', '#ffffff', COLORS.blue, '"I don\'t wanna grow up!"'), doorX + 18, 4.2, front - 0.6));

  // a few carts left around the store
  shoppingCart(world, doorX + 4, front - 16, 0.4);
  shoppingCart(world, zx(6) + pitch / 2, back + 30, Math.PI / 2);
  shoppingCart(world, right - 14, back + 30, 1.2);

  return ZONES;
}

function checkoutLane(world, x, z, n) {
  const S = world.scene;
  const g = new THREE.Group(); g.position.set(x, 0, z);
  // counter with belt, register, bagging area, candy rack on the approach
  g.add(box(0.8, 0.9, 4.0, M.blue, 0, 0.45, 0));
  g.add(box(0.7, 0.05, 2.2, M.dark, 0, 0.92, 0.6)); // belt
  g.add(box(0.7, 0.05, 1.2, M.steel, 0, 0.92, -1.2));
  g.add(box(0.5, 0.35, 0.5, new THREE.MeshLambertMaterial({ color: '#dcdcd2' }), 0, 1.1, -0.9)); // register
  const screen = box(0.3, 0.2, 0.02, new THREE.MeshBasicMaterial({ color: '#2fd36b' }), 0, 1.4, -0.7); g.add(screen);
  g.add(box(0.06, 2.4, 0.06, M.steel, 0, 2.3, -1.9)); // lane light pole
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), new THREE.MeshBasicMaterial({ map: textSignTexture([String(n)], { bg: '#ffd200', fg: '#1d4f9e', font: '900 220px "Arial Black", Arial', w: 256, h: 256 }) }));
  lamp.position.set(0, 3.6, -1.9); g.add(lamp);
  // candy rack beside the belt
  const rack = box(0.3, 1.3, 2.0, M.steel, 0.75, 0.65, 0.9); g.add(rack);
  const candy = byId.checkout.products;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) {
    const p = candy[(r * 6 + i) % candy.length];
    const pos = new THREE.Vector3(x + 0.92, 0.25 + r * 0.3, z + 0.1 + i * 0.3);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    world.batch.add('bl:' + p.name, () => ({ geometry: new THREE.PlaneGeometry(0.16, 0.24), material: new THREE.MeshLambertMaterial({ map: productTexture(p), side: THREE.DoubleSide }) }), new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)), { product: p, dept: byId.checkout });
  }
  // bag stand
  g.add(box(0.5, 0.9, 0.5, new THREE.MeshLambertMaterial({ color: '#f5f5f5' }), 0, 0.45, -2.3));
  S.add(g);
  world.addCollider(x, z, 0.8, 4.4); world.addCollider(x + 0.75, z + 0.9, 0.3, 2.0);
}

function serviceCounter(world, x, z) {
  const S = world.scene;
  S.add(box(9, 1.1, 0.9, M.blue, x, 0.55, z)); S.add(box(9.2, 0.08, 1.0, M.yellow, x, 1.12, z));
  S.add(box(0.9, 1.1, 5, M.blue, x - 4.5, 0.55, z - 2.4)); S.add(box(1.0, 0.08, 5.1, M.yellow, x - 4.5, 1.12, z - 2.4));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.0), new THREE.MeshBasicMaterial({ map: textSignTexture(['CUSTOMER SERVICE  ·  LAYAWAY  ·  RETURNS'], { bg: '#ffd200', fg: '#1d4f9e', font: '900 60px "Arial Black", Arial', w: 1536, h: 256 }), side: THREE.DoubleSide }));
  sign.position.set(x, 3.2, z); S.add(sign);
  // layaway boxes behind the counter
  for (let i = 0; i < 6; i++) S.add(box(0.6, 0.5, 0.5, i % 2 ? M.carton : M.carton2, x - 3.5 + i * 1.2, 0.25 + (i % 3) * 0.05, z - 3.5));
  world.addCollider(x, z, 9, 0.9); world.addCollider(x - 4.5, z - 2.4, 0.9, 5);
}

function pickupBooth(world, x, z) {
  // "the booth": blue counter with a small window and a big steel door to the stockroom
  const S = world.scene;
  S.add(box(6, 3.4, 0.3, M.blue, x, 1.7, z - 3));                       // booth wall
  S.add(box(1.6, 1.2, 0.05, M.glass, x + 1, 1.7, z - 2.82));            // window
  S.add(box(1.2, 0.08, 0.6, M.yellow, x + 1, 1.1, z - 2.7));            // counter ledge
  S.add(box(1.4, 2.6, 0.1, new THREE.MeshLambertMaterial({ color: '#8d8d8d' }), x - 1.5, 1.3, z - 2.82)); // steel door
  S.add(box(0.3, 3.4, 5, M.blue, x - 3, 1.7, z - 0.5));
  const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.9), new THREE.MeshBasicMaterial({ map: textSignTexture(['VIDEO GAME PICK-UP  ·  CUSTOMEЯ PICK UP'], { bg: '#ffffff', fg: '#1d4f9e', font: '900 60px "Arial Black", Arial', w: 1536, h: 256, stripes: true }) }));
  s.position.set(x, 3.0, z - 2.82); S.add(s);
  const s2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshBasicMaterial({ map: textSignTexture(['Bring your paid', 'ticket here'], { bg: '#ffd200', fg: '#111', font: 'bold 70px Arial', w: 512, h: 256 }) }));
  s2.position.set(x + 1, 2.45, z - 2.82); S.add(s2);
  world.addCollider(x, z - 3, 6, 0.3); world.addCollider(x - 3, z - 0.5, 0.3, 5);
}

function rZone(world, x0, z0, w, d) {
  // Glass-fronted "R" Zone: ticket walls, console cases, demo kiosks, black/red trim
  const S = world.scene;
  const cx = x0 + w / 2, cz = z0 + d / 2;
  const dark = new THREE.MeshLambertMaterial({ color: '#2a2a2a' });
  const floorM = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color: '#4a4a52' }));
  floorM.rotation.x = -Math.PI / 2; floorM.position.set(cx, 0.003, cz); S.add(floorM);
  // glass wall on the front (+z) side with an opening, and on the right (+x) side
  const fz = z0 + d;
  S.add(box(w - 6, 3.0, 0.08, M.glass, cx - 3, 1.5, fz)); S.add(box(w - 6, 0.3, 0.3, dark, cx - 3, 3.15, fz));
  S.add(box(0.08, 3.0, d - 6, M.glass, x0 + w, 1.5, cz - 3)); S.add(box(0.3, 0.3, d - 6, dark, x0 + w, 3.15, cz - 3));
  world.addCollider(cx - 3, fz, w - 6, 0.2); world.addCollider(x0 + w, cz - 3, 0.2, d - 6);
  // red header
  S.add(plane(10, 2.4, bannerTexture('R ZONE', '#e4322b', '#fff', 'VIDEO GAMES · ELECTRONICS'), cx, 4.2, fz + 0.05));
  S.add(plane(8, 2.4, bannerTexture('R ZONE', '#111111', '#ffd200', 'Take a ticket · pay up front · pick up at the booth'), x0 + w + 0.05, 4.2, cz, Math.PI / 2));
  // ticket walls: rows of game boxes under clear flaps, with a pouch (yellow slips) below each
  const games = byId.rzone.products.filter(p => !/Console|System|Deck|Pocket|Handheld|Tamagotchi|Furby/.test(p.name));
  const flap = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, roughness: 0.05 });
  const walls = [
    { x: x0 + 0.6, z: cz, ry: Math.PI / 2, len: d - 2, label: 'SUPER NES · GENESIS' },
    { x: cx, z: z0 + 0.6, ry: 0, len: w - 2, label: 'NINTENDO 64 · PLAYSTATION · SATURN' },
  ];
  let gi = 0;
  for (const wl of walls) {
    const g = new THREE.Group(); g.position.set(wl.x, 0, wl.z); g.rotation.y = wl.ry;
    g.add(box(wl.len, 3.2, 0.5, dark, 0, 1.6, 0));
    for (let row = 0; row < 4; row++) {
      const y = 0.7 + row * 0.62;
      g.add(box(wl.len, 0.03, 0.55, M.steel, 0, y - 0.12, 0.05));
      for (let i = 0; i < Math.floor(wl.len / 0.4); i++) {
        const p = games[gi++ % games.length];
        const lx = -wl.len / 2 + 0.25 + i * 0.4;
        const pos = new THREE.Vector3(lx, y + 0.08, 0.27).applyEuler(g.rotation).add(g.position);
        const q = new THREE.Quaternion().setFromEuler(g.rotation);
        world.batch.add('gm:' + p.name, () => ({ geometry: new THREE.PlaneGeometry(0.3, 0.34), material: new THREE.MeshLambertMaterial({ map: productTexture(p) }) }), new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1)), { product: p, dept: byId.rzone, note: 'Lift the flap to read the back. Take a yellow slip from the pouch and pay at the register; pick up at the booth by the exit.' });
        const f = box(0.34, 0.38, 0.01, flap, lx, y + 0.08, 0.29); g.add(f);
        const pouch = box(0.3, 0.12, 0.03, new THREE.MeshLambertMaterial({ color: '#1f4fbf', transparent: true, opacity: 0.7 }), lx, y - 0.16, 0.29); g.add(pouch);
        const slips = box(0.26, 0.06, 0.02, new THREE.MeshLambertMaterial({ color: '#fff3a0' }), lx, y - 0.13, 0.30); g.add(slips);
      }
    }
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.7), new THREE.MeshBasicMaterial({ map: textSignTexture([wl.label], { bg: '#e4322b', fg: '#fff', font: '900 80px "Arial Black", Arial', w: 1536, h: 200 }) }));
    lbl.position.set(0, 3.0, 0.27); g.add(lbl);
    S.add(g);
    world.addCollider(wl.x, wl.z, wl.ry ? 0.6 : wl.len, wl.ry ? wl.len : 0.6);
  }
  // console glass cases in the middle
  const consoles = byId.rzone.products.filter(p => /Console|System|Deck|Pocket|Saturn/.test(p.name));
  for (let i = 0; i < 2; i++) {
    const px = cx - 4 + i * 8, pz = cz - 2;
    S.add(box(4, 0.9, 1.0, dark, px, 0.45, pz)); S.add(box(4, 0.9, 1.0, M.glass, px, 1.35, pz));
    world.addCollider(px, pz, 4, 1.0);
    for (let k = 0; k < 4; k++) {
      const p = consoles[(i * 4 + k) % consoles.length]; const { w: bw, h: bh, d: bd } = boxDims(p);
      const pos = new THREE.Vector3(px - 1.5 + k * 1.0, 0.9 + bh / 2, pz);
      world.batch.add('bx:' + p.name, () => { const geo = new THREE.BoxGeometry(bw, bh, bd); const front = new THREE.MeshLambertMaterial({ map: productTexture(p) }); const side = new THREE.MeshLambertMaterial({ color: p.colors[0] }); return { geometry: geo, material: [side, side, side, side, front, side] }; }, new THREE.Matrix4().compose(pos, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)), { product: p, dept: byId.rzone, note: 'Consoles stay locked in the glass case; an associate rings one up from the stockroom.' });
    }
  }
  // demo kiosks: N64 pod, SNES kiosk, PlayStation kiosk, with glowing screens
  kiosk(world, cx + 6, cz + 4, 'NINTENDO 64', '#e60012', '#3a6cff');
  kiosk(world, cx + 2, cz + 4, 'PLAYSTATION', '#4a4a5a', '#2fd36b');
  kiosk(world, cx - 2, cz + 4, 'SUPER NES', '#6a5acd', '#ffb000');
  kiosk(world, cx - 6, cz + 4, 'SEGA SATURN', '#1c1c1c', '#3aa0ff');
  // Tiger handheld / Tamagotchi peg gondola inside
  gondola(world, { x: cx + 3, z: cz - 6, len: 8, ry: 0, height: 1.85, overstock: false, deptA: byId.rzone, styleA: 'peg', deptB: byId.rzone, styleB: 'peg' });
  // Nintendo Power / strategy guide wire rack
  S.add(box(0.6, 1.6, 0.6, M.steel, x0 + w - 2, 0.8, z0 + d - 2)); world.addCollider(x0 + w - 2, z0 + d - 2, 0.6, 0.6);
  S.add(plane(0.5, 0.7, textSignTexture(['NINTENDO', 'POWER', '$3.95'], { bg: '#e60012', fg: '#fff', font: '900 90px "Arial Black", Arial', w: 512, h: 700 }), x0 + w - 2, 1.4, z0 + d - 1.68));
}

function kiosk(world, x, z, name, color, glow) {
  const S = world.scene;
  const body = new THREE.MeshLambertMaterial({ color });
  S.add(box(1.0, 1.9, 0.8, body, x, 0.95, z));
  S.add(box(0.7, 0.5, 0.02, new THREE.MeshBasicMaterial({ color: glow }), x, 1.45, z + 0.41)); // screen
  S.add(box(0.8, 0.06, 0.3, M.dark, x, 0.95, z + 0.5)); // controller shelf
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.35), new THREE.MeshBasicMaterial({ map: textSignTexture([name], { bg: '#fff', fg: color, font: '900 90px "Arial Black", Arial', w: 1024, h: 320 }) }));
  s.position.set(x, 2.05, z + 0.41); S.add(s);
  const s2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), new THREE.MeshBasicMaterial({ map: textSignTexture(['TRY ME!'], { bg: '#ffd200', fg: '#111', font: '900 120px "Arial Black", Arial', w: 1024, h: 280 }) }));
  s2.position.set(x, 0.55, z + 0.41); S.add(s2);
  const light = new THREE.PointLight(glow, 0.6, 3); light.position.set(x, 1.5, z + 0.9); S.add(light);
  world.addCollider(x, z, 1.0, 0.8);
  world.interactables.push({ x, z, r: 1.4, info: { title: name + ' demo kiosk', text: 'A playable demo station. Kids queued here for a turn on the pad.' } });
}

function bikeWall(world, x1, x2, z) {
  const S = world.scene;
  // wall rack with hung bikes at two heights, floor bikes below on a rail
  const rail = new THREE.MeshLambertMaterial({ color: '#c9c9c9' });
  S.add(box(x2 - x1, 0.08, 0.08, rail, (x1 + x2) / 2, 2.4, z + 0.3));
  S.add(box(x2 - x1, 0.08, 0.08, rail, (x1 + x2) / 2, 3.6, z + 0.3));
  const bikeProds = byId.bikes.products.filter(p => /Bike/.test(p.name));
  let i = 0;
  for (let x = x1 + 0.8; x < x2 - 0.5; x += 0.9) {
    const p = bikeProds[i % bikeProds.length];
    bike(world, x, 3.35, z + 0.55, p.colors[0], 0.9, p); // hung high, front wheel up
    bike(world, x + 0.45, 2.15, z + 0.55, bikeProds[(i + 1) % bikeProds.length].colors[0], 0.8, bikeProds[(i + 1) % bikeProds.length]);
    if (i % 2 === 0) bike(world, x, 0, z + 1.8, bikeProds[(i + 2) % bikeProds.length].colors[0], 1.0, bikeProds[(i + 2) % bikeProds.length], true);
    i++;
  }
  world.addCollider((x1 + x2) / 2, z + 1.8, x2 - x1, 1.4);
  // ride-ons and Big Wheels along the floor in front
  floorStack(world, byId.bikes, x1 + 2, z + 4.5, 6, 1, 0, 1, p => /Wheel|Wagon|Tricycle/.test(p.name));
  bigWheel(world, x1 + 14, z + 4.5); bigWheel(world, x1 + 15.2, z + 4.5); radioFlyer(world, x1 + 17, z + 4.5);
  world.interactables.push({ x: (x1 + x2) / 2, z: z + 2, r: 3, info: { title: 'Bikes "R" Us', text: 'Assembled Huffys and Murrays hung on the back wall. You took the tag to the register, then waited at Customer Pick Up while "the guys in the back" wheeled yours out.' } });
}

function bike(world, x, y, z, color, s = 1, p, floor = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  const frame = new THREE.MeshLambertMaterial({ color });
  const tire = new THREE.MeshLambertMaterial({ color: '#222' });
  const wheel = () => new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 20), tire);
  const w1 = wheel(), w2 = wheel();
  if (floor) { w1.position.set(-0.5, 0.3, 0); w2.position.set(0.5, 0.3, 0); g.rotation.y = Math.PI / 2; }
  else { g.rotation.z = Math.PI / 2; g.rotation.y = Math.PI / 2; w1.position.set(-0.5, 0.3, 0); w2.position.set(0.5, 0.3, 0); }
  g.add(w1, w2);
  const tube = (ax, ay, bx, by) => { const len = Math.hypot(bx - ax, by - ay); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len), frame); m.position.set((ax + bx) / 2, (ay + by) / 2, 0); m.rotation.z = Math.atan2(bx - ax, by - ay) * -1; return m; };
  g.add(tube(-0.5, 0.3, -0.1, 0.75), tube(-0.1, 0.75, 0.4, 0.75), tube(0.4, 0.75, 0.5, 0.3), tube(-0.5, 0.3, 0.05, 0.3), tube(0.05, 0.3, 0.4, 0.75), tube(0.05, 0.3, -0.1, 0.75));
  const bars = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5), M.chrome); bars.rotation.x = Math.PI / 2; bars.position.set(0.45, 0.85, 0); g.add(bars);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.1), M.dark); seat.position.set(-0.12, 0.82, 0); g.add(seat);
  world.scene.add(g);
  if (p) world.interactables.push({ x, z, r: 0.9, info: { title: p.name, text: `${p.brand} · $${p.price}` } });
  return g;
}
function bigWheel(world, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const red = new THREE.MeshLambertMaterial({ color: '#e4322b' }), yel = new THREE.MeshLambertMaterial({ color: '#ffd200' }), blu = new THREE.MeshLambertMaterial({ color: '#1f4fbf' });
  const fw = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16), yel); fw.rotation.z = Math.PI / 2; fw.position.set(0, 0.28, 0.45); g.add(fw);
  for (const dx of [-0.25, 0.25]) { const rw = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), blu); rw.rotation.z = Math.PI / 2; rw.position.set(dx, 0.12, -0.35); g.add(rw); }
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.9), red); body.position.set(0, 0.2, -0.05); g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.25), red); seat.position.set(0, 0.35, -0.3); g.add(seat);
  world.scene.add(g); world.addCollider(x, z, 0.6, 1.0);
  world.interactables.push({ x, z, r: 0.8, info: { title: 'The Original Big Wheel', text: 'Empire · $29.99 · Ages 3-8' } });
}
function radioFlyer(world, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const red = new THREE.MeshLambertMaterial({ color: '#c8102e' });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.9), red); bed.position.y = 0.3; g.add(bed);
  for (const [dx, dz] of [[-0.28, 0.3], [0.28, 0.3], [-0.28, -0.3], [0.28, -0.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), M.dark); w.rotation.z = Math.PI / 2; w.position.set(dx, 0.1, dz); g.add(w); }
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7), M.dark); handle.rotation.x = -0.9; handle.position.set(0, 0.5, 0.7); g.add(handle);
  world.scene.add(g); world.addCollider(x, z, 0.5, 1.0);
  world.interactables.push({ x, z, r: 0.8, info: { title: 'Radio Flyer Red Wagon', text: 'Radio Flyer · $49.99' } });
}

function powerWheels(world, x, z, color = '#111') {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 1.3), new THREE.MeshLambertMaterial({ color })); body.position.y = 0.35; g.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.5), new THREE.MeshLambertMaterial({ color: color === '#111' ? '#ffd200' : '#fff' })); hood.position.set(0, 0.62, 0.3); g.add(hood);
  for (const [dx, dz] of [[-0.42, 0.45], [0.42, 0.45], [-0.42, -0.45], [0.42, -0.45]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 14), M.dark); w.rotation.z = Math.PI / 2; w.position.set(dx, 0.18, dz); g.add(w); }
  world.scene.add(g); world.addCollider(x, z, 0.9, 1.4);
  world.interactables.push({ x, z, r: 1.1, info: { title: color === '#111' ? 'Power Wheels Jeep' : 'Power Wheels Barbie Corvette', text: 'Fisher-Price/Kransco · $199.99–$229.99 · 6-volt · floor model — take a ticket to the register' } });
}

function littleTikesDisplay(world, x, z) {
  // assembled Little Tikes: Cozy Coupe, Turtle Sandbox, Party Kitchen, Log Cabin — molded primary colors, no boxes
  const S = world.scene;
  const red = new THREE.MeshLambertMaterial({ color: '#e4322b' }), yel = new THREE.MeshLambertMaterial({ color: '#ffd200' }), grn = new THREE.MeshLambertMaterial({ color: '#2fa84f' }), blu = new THREE.MeshLambertMaterial({ color: '#1f6fd0' }), tan = new THREE.MeshLambertMaterial({ color: '#c9a070' });
  // Cozy Coupe
  const c = new THREE.Group(); c.position.set(x, 0, z);
  const cb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.9), red); cb.position.y = 0.35; c.add(cb);
  const ct = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.6), yel); ct.position.set(0, 0.95, -0.05); c.add(ct);
  for (const [dx, dz] of [[-0.32, 0.3], [0.32, 0.3], [-0.32, -0.3], [0.32, -0.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08), yel); w.rotation.z = Math.PI / 2; w.position.set(dx, 0.12, dz); c.add(w); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), yel); p.position.set(dx * 0.85, 0.65, dz); c.add(p); }
  S.add(c); world.addCollider(x, z, 0.7, 1.0);
  world.interactables.push({ x, z, r: 0.9, info: { title: 'Little Tikes Cozy Coupe', text: 'Little Tikes · $39.99 · Ages 1½–5. Floor model; boxed ones came from the back.' } });
  // Turtle sandbox
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.25, 20), grn); tb.position.set(x + 2.2, 0.125, z); S.add(tb);
  const th = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), grn); th.position.set(x + 2.2, 0.25, z + 0.85); S.add(th);
  world.addCollider(x + 2.2, z, 1.5, 1.5);
  world.interactables.push({ x: x + 2.2, z, r: 1.1, info: { title: 'Little Tikes Turtle Sandbox', text: 'Little Tikes · $29.99' } });
  // Party Kitchen
  const pk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.45), blu); pk.position.set(x + 4.2, 0.5, z); S.add(pk);
  const pkt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.1), yel); pkt.position.set(x + 4.2, 1.25, z - 0.17); S.add(pkt);
  world.addCollider(x + 4.2, z, 1.0, 0.5);
  world.interactables.push({ x: x + 4.2, z, r: 1.0, info: { title: 'Little Tikes Party Kitchen', text: 'Little Tikes · $89.99' } });
  // Log cabin playhouse
  const lc = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.4), tan); lc.position.set(x + 2.2, 0.65, z - 3.2); S.add(lc);
  const lr = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.6, 4), red); lr.rotation.y = Math.PI / 4; lr.position.set(x + 2.2, 1.6, z - 3.2); S.add(lr);
  world.addCollider(x + 2.2, z - 3.2, 1.6, 1.4);
  world.interactables.push({ x: x + 2.2, z: z - 3.2, r: 1.5, info: { title: 'Little Tikes Log Cabin', text: 'Little Tikes · $199.99 · the one everybody wanted for the backyard' } });
}

function babyCorner(world, x0, z0, w, d) {
  const S = world.scene;
  // pale blue carpeted "Baby's Corner"
  const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color: '#cfe4f7' })); c.rotation.x = -Math.PI / 2; c.position.set(x0 + w / 2, 0.002, z0 + d / 2); S.add(c);
  // diaper pallets
  floorStack(world, byId.baby, x0 + 1, z0 + 3, 3, 3, 0, 3, p => /Diapers/.test(p.name));
  floorStack(world, byId.baby, x0 + 1, z0 + 8, 3, 2, 0, 3, p => /Diapers/.test(p.name));
  // juvenile racking: strollers, car seats, formula, feeding
  gondola(world, { x: x0 + w - 1.2, z: z0 + d / 2, len: d - 2, ry: Math.PI / 2, height: 3.6, deptA: null, deptB: byId.baby, styleB: 'shelf' });
  gondola(world, { x: x0 + 8, z: z0 + d - 4, len: 10, ry: 0, height: 1.85, overstock: false, deptA: byId.baby, styleA: 'peg', deptB: byId.baby, styleB: 'shelf' });
  floorStack(world, byId.baby, x0 + 8, z0 + 14, 4, 1, 0, 1, p => /Stroller|Car Seat|Pack|Exersaucer|Swing|High Chair/.test(p.name));
  // a crib floor model
  const crib = new THREE.Group(); crib.position.set(x0 + 4, 0, z0 + 16);
  const wood = new THREE.MeshLambertMaterial({ color: '#f1e9dc' });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 1.3), wood); base.position.y = 0.5; crib.add(base);
  for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9), wood); s.position.set(-0.35, 0.65, -0.6 + i * 0.17); crib.add(s); const s2 = s.clone(); s2.position.x = 0.35; crib.add(s2); }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 1.3), wood); rail.position.y = 1.1; crib.add(rail);
  S.add(crib); world.addCollider(x0 + 4, z0 + 16, 0.8, 1.4);
  world.interactables.push({ x: x0 + 4, z: z0 + 16, r: 1.0, info: { title: 'Crib floor model', text: 'Cribs came flat-boxed from the back. Gift registry scanners were a Concept 2000 addition.' } });
}

function displayCase(world, x, z, dept) {
  const S = world.scene;
  S.add(box(1.4, 0.9, 0.8, M.blue, x, 0.45, z)); S.add(box(1.4, 0.9, 0.8, M.glass, x, 1.35, z));
  const light = new THREE.PointLight('#fff', 0.8, 3); light.position.set(x, 1.7, z); S.add(light);
  // built LEGO model: a little pirate ship of colored bricks
  const g = new THREE.Group(); g.position.set(x, 0.9, z);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.3), new THREE.MeshLambertMaterial({ color: '#7a4a1a' })); hull.position.y = 0.1; g.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.25), new THREE.MeshLambertMaterial({ color: '#c9a070' })); deck.position.y = 0.24; g.add(deck);
  for (const dx of [-0.2, 0.2]) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5), M.dark); mast.position.set(dx, 0.5, 0); g.add(mast); const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), new THREE.MeshLambertMaterial({ color: '#fff', side: THREE.DoubleSide })); sail.position.set(dx, 0.55, 0); g.add(sail); }
  S.add(g);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshBasicMaterial({ map: textSignTexture(['LEGO PIRATES — Skull\'s Eye Schooner  $119.99'], { bg: '#ffd200', fg: '#111', font: 'bold 44px Arial', w: 1024, h: 200 }), side: THREE.DoubleSide })); s.position.set(x, 1.95, z); S.add(s);
  world.addCollider(x, z, 1.4, 0.8);
  world.interactables.push({ x, z, r: 1.2, info: { title: 'LEGO display case', text: 'A built-up model in a lit glass case at the end of the LEGO aisle. Skull\'s Eye Schooner (6286), 1993 — $119.99.' } });
}

function geoffreyStatue(world, x, z) {
  const S = world.scene;
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.5, 24), M.blue); plinth.position.y = 0.25; g.add(plinth);
  const yel = new THREE.MeshLambertMaterial({ color: '#f2a93b' }), brn = new THREE.MeshLambertMaterial({ color: '#7a4a1a' });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.5, 6, 12), yel); body.position.set(0, 1.3, 0); g.add(body);
  for (const [dx, dz] of [[-0.2, 0.15], [0.2, 0.15], [-0.2, -0.15], [0.2, -0.15]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.8), yel); l.position.set(dx, 0.9, dz); g.add(l); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.4), yel); neck.position.set(0, 2.3, 0.2); neck.rotation.x = -0.25; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), yel); head.position.set(0, 3.05, 0.45); g.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), yel); muzzle.position.set(0, 2.95, 0.75); g.add(muzzle);
  for (const dx of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.white); e.position.set(dx, 3.15, 0.66); g.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.dark); p.position.set(dx, 3.15, 0.72); g.add(p); const oss = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25), yel); oss.position.set(dx, 3.4, 0.4); g.add(oss); const k = new THREE.Mesh(new THREE.SphereGeometry(0.05), brn); k.position.set(dx, 3.53, 0.4); g.add(k); }
  for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07 + Math.random() * 0.04, 8, 6), brn); const a = Math.random() * 6.28; s.position.set(Math.cos(a) * 0.36, 1.1 + Math.random() * 0.6, Math.sin(a) * 0.36); g.add(s); }
  // shirt: red and white stripes
  const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.35, 16), new THREE.MeshLambertMaterial({ color: '#e4322b' })); shirt.position.y = 1.5; g.add(shirt);
  S.add(g); world.addCollider(x, z, 2.2, 2.2);
  world.interactables.push({ x, z, r: 2, info: { title: 'Geoffrey the Giraffe', text: 'The store mascot, on his plinth by the front doors. On weekends the walk-around Geoffrey costume handed out balloons here.' } });
}
