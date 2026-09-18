import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { STORE, PLAYER } from './config.js';
import { Batcher } from './fixtures.js';
import { buildExterior, buildInterior } from './building.js';
import { buildStore } from './store.js';

const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#9fc4e8');
scene.fog = new THREE.Fog('#9fc4e8', 120, 320);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400);

// Lighting: overcast-ish daylight outside, flat fluorescent wash inside.
const hemi = new THREE.HemisphereLight('#dfe9f3', '#8a8a80', 1.4); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 1.8); sun.position.set(-60, 90, 80); scene.add(sun);
const amb = new THREE.AmbientLight('#ffffff', 0.35); scene.add(amb);
// Interior fluorescent fill: a few wide point lights under the ceiling
const W = STORE.width, D = STORE.depth;
for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
  const l = new THREE.PointLight('#f4f8ff', 0.9, 60, 1.2); l.position.set(i * W / 5, STORE.ceiling - 0.4, j * D / 5); scene.add(l);
}

const world = {
  scene, colliders: [], interactables: [], batch: new Batcher(scene),
  addCollider(x, z, w, d) { this.colliders.push({ x1: x - w / 2, z1: z - d / 2, x2: x + w / 2, z2: z + d / 2 }); },
};
const ext = buildExterior(world);
buildInterior(world, ext);
const ZONES = buildStore(world, ext);
const productMeshes = world.batch.finalize();
$('loading').textContent = `Loaded · ${productMeshes.reduce((a, m) => a + m.count, 0).toLocaleString()} items on the shelves`;

// ---------- player
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());
const start = { x: ext.doorX, z: D / 2 + 22 };
controls.getObject().position.set(start.x, PLAYER.eye, start.z);
camera.lookAt(start.x, PLAYER.eye, 0);
const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; onKey(e); });
addEventListener('keyup', e => { keys[e.code] = false; });
// Pointer lock where available; otherwise fall back to click-and-drag looking.
let dragMode = false, dragging = false, lastX = 0, lastY = 0;
$('overlay').addEventListener('click', () => {
  if (dragMode || isTouch) { $('overlay').style.display = 'none'; return; }
  try { controls.lock(); } catch (e) { enableDrag(); }
  setTimeout(() => { if (!controls.isLocked && !touch.active) enableDrag(); }, 600);
});
function enableDrag() { dragMode = true; $('overlay').style.display = 'none'; $('help').textContent = 'WASD / arrows: walk · Shift: run · drag to look · M: map · E: inspect · Esc: menu'; }
document.addEventListener('pointerlockerror', enableDrag);
controls.addEventListener('lock', () => { $('overlay').style.display = 'none'; });
controls.addEventListener('unlock', () => { if (!dragMode) $('overlay').style.display = 'flex'; });
renderer.domElement.addEventListener('mousedown', e => { if (dragMode) { dragging = true; lastX = e.clientX; lastY = e.clientY; } });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', e => {
  if (!dragMode || !dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
  controls.getObject().rotation.y -= dx * 0.004; camera.rotation.x = Math.max(-1.3, Math.min(1.3, camera.rotation.x - dy * 0.004));
});
addEventListener('keydown', e => { if (e.code === 'Escape' && dragMode) $('overlay').style.display = 'flex'; });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

function onKey(e) {
  if (e.code === 'KeyM') { const m = $('minimap'); m.style.display = m.style.display === 'block' ? 'none' : 'block'; }
  if (e.code === 'KeyE') inspect(true);
  const n = parseInt(e.key);
  if (n >= 1 && n <= 9) {
    const order = ['checkout', 'action', 'games', 'lego', 'dolls', 'preschool', 'bikes', 'baby', 'rzone'];
    const z = ZONES.find(z => z.id === order[n - 1]);
    if (z) { controls.getObject().position.set(z.spawn[0], PLAYER.eye, z.spawn[1]); }
  }
}
addEventListener('mousedown', () => { if (controls.isLocked) inspect(true); });
addEventListener('click', () => { if (dragMode && $('overlay').style.display === 'none') inspect(true); });

// ---------- touch controls (phones): floating move stick on the left half, drag-to-look on the right half
const touch = { active: false, lx: 0, ly: 0, run: false };
const isTouch = matchMedia('(pointer:coarse)').matches;
{
  const area = $('touch'), stick = $('stick'), knob = $('knob');
  let moveId = null, lookId = null, ox = 0, oy = 0, lookX = 0, lookY = 0, lookMoved = 0;
  const R = 45;
  area.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('.tbtn')) continue;
      if (t.clientX < innerWidth / 2 && moveId === null) {
        moveId = t.identifier; ox = t.clientX; oy = t.clientY;
        stick.style.display = 'block'; stick.style.left = (ox - 60) + 'px'; stick.style.top = (oy - 60) + 'px'; knob.style.transform = '';
      } else if (lookId === null) { lookId = t.identifier; lookX = t.clientX; lookY = t.clientY; lookMoved = 0; }
    }
    e.preventDefault();
  }, { passive: false });
  area.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        let dx = t.clientX - ox, dy = t.clientY - oy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`; touch.lx = dx / R; touch.ly = dy / R;
      } else if (t.identifier === lookId) {
        const dx = t.clientX - lookX, dy = t.clientY - lookY; lookX = t.clientX; lookY = t.clientY; lookMoved += Math.abs(dx) + Math.abs(dy);
        controls.getObject().rotation.y -= dx * 0.005; camera.rotation.x = Math.max(-1.3, Math.min(1.3, camera.rotation.x - dy * 0.005));
      }
    }
    e.preventDefault();
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) { moveId = null; touch.lx = touch.ly = 0; stick.style.display = 'none'; }
      if (t.identifier === lookId) { if (lookMoved < 8) inspect(true); lookId = null; }
    }
  };
  area.addEventListener('touchend', end); area.addEventListener('touchcancel', end);
  const btn = (id, fn) => $(id).addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); fn(); }, { passive: false });
  btn('bRun', () => { touch.run = !touch.run; $('bRun').classList.toggle('on', touch.run); });
  btn('bMap', () => { const m = $('minimap'); m.style.display = m.style.display === 'block' ? 'none' : 'block'; $('bMap').classList.toggle('on', m.style.display === 'block'); });
  btn('bLook', () => inspect(true));
  if (isTouch) $('overlay').addEventListener('click', () => { $('overlay').style.display = 'none'; touch.active = true; });
}

// ---------- movement with AABB collision
const vel = new THREE.Vector3();
function collide(p, radius) {
  for (const c of world.colliders) {
    const nx = Math.max(c.x1, Math.min(p.x, c.x2)), nz = Math.max(c.z1, Math.min(p.z, c.z2));
    const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 < 1e-6) { // inside: push out along smallest axis
        const l = p.x - c.x1, r = c.x2 - p.x, t = p.z - c.z1, b = c.z2 - p.z; const m = Math.min(l, r, t, b);
        if (m === l) p.x = c.x1 - radius; else if (m === r) p.x = c.x2 + radius; else if (m === t) p.z = c.z1 - radius; else p.z = c.z2 + radius;
      } else { const d = Math.sqrt(d2); p.x = nx + dx / d * radius; p.z = nz + dz / d * radius; }
    }
  }
}

// ---------- interaction: what am I looking at
const ray = new THREE.Raycaster(); ray.far = 4;
const label = $('label');
let labelTimer = 0;
function inspect(sticky) {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = ray.intersectObjects(productMeshes, false);
  let text = null;
  if (hits.length) {
    const h = hits[0]; const info = h.object.userData.infos[h.instanceId];
    if (info && info.product) {
      const p = info.product;
      text = `<b>${p.name}</b><br>${p.brand} · $${p.price}${p.age ? ' · Ages ' + p.age : ''}<br><span style="opacity:.75">${info.dept.name} — ${info.dept.sub}</span>${info.note ? '<br><i>' + info.note + '</i>' : ''}`;
    }
  }
  if (!text) {
    const p = controls.getObject().position;
    for (const it of world.interactables) { if (Math.hypot(it.x - p.x, it.z - p.z) < it.r + 0.8) { text = `<b>${it.info.title}</b><br>${it.info.text}`; break; } }
  }
  if (text) { label.innerHTML = text; label.style.display = 'block'; labelTimer = sticky ? 4 : 0.4; }
}

// ---------- minimap
const mm = $('minimap'), mg = mm.getContext('2d');
function drawMap() {
  const sx = mm.width / (W + 60), sz = mm.height / (D + 60);
  const X = x => (x + W / 2 + 30) * sx, Z = z => (z + D / 2 + 30) * sz;
  mg.fillStyle = '#eee'; mg.fillRect(0, 0, mm.width, mm.height);
  mg.fillStyle = '#fff'; mg.strokeStyle = '#333'; mg.lineWidth = 2; mg.fillRect(X(-W / 2), Z(-D / 2), W * sx, D * sz); mg.strokeRect(X(-W / 2), Z(-D / 2), W * sx, D * sz);
  for (const z of ZONES) {
    mg.fillStyle = z.color + '66'; mg.fillRect(X(z.x1), Z(z.z1), (z.x2 - z.x1) * sx, (z.z2 - z.z1) * sz);
    mg.fillStyle = '#111'; mg.font = 'bold 12px Arial'; mg.textAlign = 'center'; mg.fillText(z.name.split(' ·')[0], X((z.x1 + z.x2) / 2), Z((z.z1 + z.z2) / 2) + 4);
  }
  mg.fillStyle = '#333'; mg.font = 'bold 11px Arial'; mg.fillText('▲ ENTRANCE / PARKING', X(ext.doorX), Z(D / 2) + 14);
  const p = controls.getObject().position;
  mg.fillStyle = '#e4322b'; mg.beginPath(); mg.arc(X(p.x), Z(p.z), 5, 0, 7); mg.fill();
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  mg.strokeStyle = '#e4322b'; mg.lineWidth = 2; mg.beginPath(); mg.moveTo(X(p.x), Z(p.z)); mg.lineTo(X(p.x) + dir.x * 14, Z(p.z) + dir.z * 14); mg.stroke();
}

// ---------- department HUD
const deptEl = $('dept');
function whereAmI() {
  const p = controls.getObject().position;
  if (p.z > D / 2) return { name: 'Parking Lot', sub: '1001 Memorial Parkway NW · Huntsville, AL' };
  for (const z of ZONES) if (p.x >= z.x1 && p.x <= z.x2 && p.z >= z.z1 && p.z <= z.z2) return { name: z.name, sub: 'Toys "R" Us #8809' };
  return { name: 'Sales Floor', sub: 'Toys "R" Us #8809' };
}

// ---------- ambient audio: fluorescent hum + faint PA tone, started on first click
let audioStarted = false;
function startAudio() {
  if (audioStarted) return; audioStarted = true;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const hum = ac.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 120;
    const hg = ac.createGain(); hg.gain.value = 0.006; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    hum.connect(lp).connect(hg).connect(ac.destination); hum.start();
    const noise = ac.createBufferSource(); const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.02;
    noise.buffer = buf; noise.loop = true; const ng = ac.createGain(); ng.gain.value = 0.25; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
    noise.connect(bp).connect(ng).connect(ac.destination); noise.start();
    world.audio = { ac, hg, ng };
  } catch (e) { /* audio optional */ }
}
$('overlay').addEventListener('click', startAudio);

// ---------- loop
const clock = new THREE.Clock();
let frame = 0;
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const obj = controls.getObject();
  const active = controls.isLocked || touch.active || dragMode;
  if (active) {
    const speed = (keys.ShiftLeft || keys.ShiftRight || touch.run) ? PLAYER.run : PLAYER.walk;
    const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - touch.ly;
    const side = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + touch.lx;
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    vel.set(0, 0, 0).addScaledVector(dir, fwd).addScaledVector(right, side);
    if (vel.lengthSq() > 0) vel.normalize().multiplyScalar(speed * dt);
    obj.position.add(vel);
    collide(obj.position, PLAYER.radius);
    // head bob
    const moving = vel.lengthSq() > 0;
    obj.position.y = PLAYER.eye + (moving ? Math.sin(performance.now() / (speed > 4 ? 90 : 140)) * 0.03 : 0);
    if (frame % 6 === 0) inspect(false);
  }
  if (labelTimer > 0) { labelTimer -= dt; if (labelTimer <= 0) label.style.display = 'none'; }
  if (frame % 15 === 0) { const w = whereAmI(); deptEl.innerHTML = `${w.name}<small>${w.sub}</small>`; if ($('minimap').style.display === 'block') drawMap(); }
  // inside vs outside: fade the ambient hum and swap sky/fog
  const inside = Math.abs(obj.position.x) < W / 2 && Math.abs(obj.position.z) < D / 2;
  if (world.audio) { world.audio.hg.gain.value += ((inside ? 0.006 : 0.0) - world.audio.hg.gain.value) * 0.05; world.audio.ng.gain.value += ((inside ? 0.25 : 0.08) - world.audio.ng.gain.value) * 0.05; }
  hemi.intensity += ((inside ? 1.9 : 1.4) - hemi.intensity) * 0.05;
  sun.intensity += ((inside ? 0.3 : 1.8) - sun.intensity) * 0.05;
  frame++;
  renderer.render(scene, camera);
}
tick();

// expose for debugging / screenshots
window.__tru = { scene, camera, controls, ZONES, world, teleport(x, z, yaw = 0) { controls.getObject().position.set(x, PLAYER.eye, z); controls.getObject().rotation.y = yaw; camera.rotation.x = 0; } };
