import * as THREE from 'three';
import { RAINBOW, COLORS } from './config.js';

const cache = new Map();
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, opts = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  return t;
}
export function memo(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

// ---------- floor: 12" VCT tiles, slightly scuffed
export function floorTexture(repeatX, repeatY) {
  return memo('floor' + repeatX + 'x' + repeatY, () => {
    const s = 512, c = canvas(s, s), g = c.getContext('2d');
    const n = 4, t = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? COLORS.floorTile : COLORS.floorTile2;
      g.fillRect(i * t, j * t, t, t);
      // marbling flecks
      for (let k = 0; k < 60; k++) {
        g.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${80 + Math.random() * 60 | 0},${70 + Math.random() * 50 | 0},${0.08 + Math.random() * 0.12})`;
        g.fillRect(i * t + Math.random() * t, j * t + Math.random() * t, 1 + Math.random() * 3, 1 + Math.random() * 3);
      }
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.strokeRect(i * t + .5, j * t + .5, t - 1, t - 1);
    }
    return tex(c, { repeat: [repeatX, repeatY] });
  });
}

export function asphaltTexture(rx, ry) {
  return memo('asphalt' + rx + ry, () => {
    const s = 256, c = canvas(s, s), g = c.getContext('2d');
    g.fillStyle = '#3a3a3c'; g.fillRect(0, 0, s, s);
    for (let k = 0; k < 4000; k++) { g.fillStyle = `rgba(${120 + Math.random() * 80 | 0},${120 + Math.random() * 80 | 0},${120 + Math.random() * 80 | 0},.25)`; g.fillRect(Math.random() * s, Math.random() * s, 1, 1); }
    return tex(c, { repeat: [rx, ry] });
  });
}

// ---------- brick facade with running bond
export function brickTexture(rx, ry) {
  return memo('brick' + rx + ry, () => {
    const s = 512, c = canvas(s, s), g = c.getContext('2d');
    g.fillStyle = '#9a8a78'; g.fillRect(0, 0, s, s); // mortar
    const bw = 64, bh = 24;
    for (let y = 0, row = 0; y < s; y += bh, row++) {
      for (let x = -bw; x < s; x += bw) {
        const off = row % 2 ? bw / 2 : 0;
        const shade = 0.85 + Math.random() * 0.3;
        g.fillStyle = `rgb(${183 * shade | 0},${147 * shade | 0},${106 * shade | 0})`;
        g.fillRect(x + off + 2, y + 2, bw - 4, bh - 4);
      }
    }
    return tex(c, { repeat: [rx, ry] });
  });
}

export function concreteTexture(rx, ry) {
  return memo('concrete' + rx + ry, () => {
    const s = 256, c = canvas(s, s), g = c.getContext('2d');
    g.fillStyle = '#c9c4bb'; g.fillRect(0, 0, s, s);
    for (let k = 0; k < 3000; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .12})`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
    return tex(c, { repeat: [rx, ry] });
  });
}

// ---------- The rainbow wordmark. Each letter in a different color; the R is mirrored.
export function drawWordmark(g, x, y, h, opts = {}) {
  const font = `900 ${h}px "Arial Black", Arial, sans-serif`;
  g.font = font; g.textBaseline = 'alphabetic';
  const letters = [['T', RAINBOW[0]], ['O', RAINBOW[1]], ['Y', RAINBOW[2]], ['S', RAINBOW[3]], [' ', null], ['R', RAINBOW[4], true], [' ', null], ['U', RAINBOW[0]], ['S', RAINBOW[1]]];
  let cx = x;
  for (const [ch, col, mirror] of letters) {
    const w = g.measureText(ch).width;
    if (col) {
      g.save();
      if (mirror) { g.translate(cx + w, 0); g.scale(-1, 1); g.translate(-cx, 0); }
      if (opts.outline) { g.lineWidth = h * 0.08; g.strokeStyle = opts.outline; g.strokeText(ch, cx, y); }
      g.fillStyle = col; g.fillText(ch, cx, y);
      g.restore();
    }
    cx += w * (ch === ' ' ? 0.5 : 1);
  }
  return cx - x;
}

export function wordmarkTexture(w = 2048, h = 512, bg = null) {
  return memo('wordmark' + w + h + bg, () => {
    const c = canvas(w, h), g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    const fh = h * 0.78;
    g.font = `900 ${fh}px "Arial Black", Arial, sans-serif`;
    const tw = 6.2 * g.measureText('T').width; // rough width estimate to center
    const x = Math.max(20, (w - tw) / 2);
    drawWordmark(g, x, h * 0.8, fh, { outline: '#ffffff' });
    return tex(c);
  });
}

// ---------- Exterior brown/rainbow stripe band that ran across the facade
export function stripeBandTexture() {
  return memo('band', () => {
    const c = canvas(64, 512), g = c.getContext('2d');
    const bands = [...RAINBOW];
    const bh = 512 / bands.length;
    bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bh, 64, bh); });
    return tex(c, { repeat: [40, 1] });
  });
}

// ---------- hanging aisle sign: big number, department list
export function aisleSignTexture(num, lines) {
  return memo('aisle' + num + lines.join(), () => {
    const w = 512, h = 384, c = canvas(w, h), g = c.getContext('2d');
    g.fillStyle = '#1d4f9e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#fff'; g.font = '900 96px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(num), w / 2, 70);
    g.fillStyle = '#ffffff'; g.fillRect(40, 125, w - 80, 4);
    g.font = 'bold 38px Arial, sans-serif';
    lines.slice(0, 4).forEach((l, i) => g.fillText(l.toUpperCase(), w / 2, 170 + i * 52));
    return tex(c);
  });
}

// ---------- big department banner (e.g. "R ZONE", "BIKES", "BABIES")
export function bannerTexture(text, bg = COLORS.logoRed, fg = '#fff', sub = '') {
  return memo('banner' + text + bg + sub, () => {
    const w = 1024, h = 256, c = canvas(w, h), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, h - 24, w, 24);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${sub ? 120 : 150}px "Arial Black", Arial, sans-serif`;
    g.fillText(text.toUpperCase(), w / 2, sub ? h / 2 - 30 : h / 2);
    if (sub) { g.font = 'bold 48px Arial, sans-serif'; g.fillText(sub, w / 2, h - 62); }
    return tex(c);
  });
}

// ---------- generic sign with lines of text
export function textSignTexture(lines, { w = 1024, h = 512, bg = '#fff', fg = '#111', font = 'bold 72px Arial, sans-serif', stripes = false } = {}) {
  return memo('txt' + lines.join('|') + bg + fg + font + w + h + stripes, () => {
    const c = canvas(w, h), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (stripes) { const bw = w / RAINBOW.length; RAINBOW.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * bw, 0, bw, 28); g.fillRect(i * bw, h - 28, bw, 28); }); }
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lh = parseInt(font.match(/(\d+)px/)[1]) * 1.25;
    const y0 = h / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => g.fillText(l, w / 2, y0 + i * lh));
    return tex(c);
  });
}

// ---------- product packaging. Draw a plausible box front: brand band, product name, hero "art" blob, age badge.
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = seed || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

export function productTexture(p) {
  return memo('prod:' + p.name + p.brand, () => {
    const w = 256, h = 256, c = canvas(w, h), g = c.getContext('2d');
    const r = rng(hashStr(p.name));
    const [c1, c2] = p.colors;
    g.fillStyle = c1; g.fillRect(0, 0, w, h);
    // background "art": some soft shapes in secondary color
    for (let i = 0; i < 6; i++) {
      g.fillStyle = c2; g.globalAlpha = 0.35 + r() * 0.4;
      g.beginPath(); g.ellipse(w * (0.2 + r() * 0.6), h * (0.35 + r() * 0.45), 30 + r() * 60, 25 + r() * 50, r() * 3, 0, 6.28); g.fill();
    }
    g.globalAlpha = 1;
    // starburst
    if (r() > 0.5) {
      g.fillStyle = '#ffd400'; g.beginPath();
      const cx = w * 0.8, cy = h * 0.75, R = 34;
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, rr = i % 2 ? R : R * 0.6; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      g.closePath(); g.fill();
      g.fillStyle = '#e3242b'; g.font = 'bold 13px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NEW!', cx, cy);
    }
    // brand band
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(0, 0, w, 44);
    g.fillStyle = c2; g.font = '900 26px "Arial Black", Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(p.brand.toUpperCase().slice(0, 14), 10, 22);
    // product name (word-wrap)
    g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 4; g.font = '900 24px "Arial Black", Arial, sans-serif';
    const words = p.name.split(' '); let line = '', y = 80; const lines = [];
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w - 20) { lines.push(line); line = wd; } else line = t; }
    lines.push(line);
    lines.slice(0, 4).forEach((l, i) => { g.strokeText(l, 10, y + i * 30); g.fillText(l, 10, y + i * 30); });
    // age badge
    g.fillStyle = '#fff'; g.fillRect(8, h - 34, 60, 26); g.fillStyle = '#111'; g.font = 'bold 14px Arial'; g.fillText(`AGES ${p.age || '5+'}`, 12, h - 21);
    return tex(c);
  });
}

// blister card: white/colored card with clear bubble region
export function blisterTexture(p) {
  return memo('blister:' + p.name, () => {
    const w = 192, h = 256, c = canvas(w, h), g = c.getContext('2d');
    const [c1, c2] = p.colors;
    g.fillStyle = c1; g.fillRect(0, 0, w, h);
    g.fillStyle = c2; g.fillRect(0, 0, w, 56);
    g.fillStyle = '#fff'; g.font = '900 20px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(p.brand.toUpperCase().slice(0, 14), w / 2, 28);
    // bubble
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(28, 70, w - 56, 140, 14); g.fill(); g.stroke();
    // figure silhouette
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.beginPath(); g.ellipse(w / 2, 100, 14, 16, 0, 0, 7); g.fill();
    g.fillRect(w / 2 - 18, 116, 36, 50); g.fillRect(w / 2 - 30, 120, 12, 40); g.fillRect(w / 2 + 18, 120, 12, 40);
    g.fillRect(w / 2 - 16, 166, 12, 36); g.fillRect(w / 2 + 4, 166, 12, 36);
    g.fillStyle = '#fff'; g.font = 'bold 15px Arial'; g.fillText(p.name.slice(0, 22), w / 2, h - 26);
    // peg hole
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(w / 2, 8, 8, 5, 0, 0, 7); g.fill();
    return tex(c);
  });
}

export function priceTagTexture(price) {
  return memo('price' + price, () => {
    const c = canvas(128, 64), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = COLORS.priceChannel; g.fillRect(0, 0, 128, 12);
    g.fillStyle = '#111'; g.font = '900 30px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('$' + price, 64, 40);
    return tex(c);
  });
}

export function posterTexture(title, lines, bg) {
  return memo('poster' + title + bg, () => {
    const w = 512, h = 768, c = canvas(w, h), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 40 + Math.random() * 120, 0, 7); g.fill(); }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 64px "Arial Black", Arial, sans-serif';
    g.fillText(title, w / 2, 110);
    g.font = 'bold 34px Arial, sans-serif';
    lines.forEach((l, i) => g.fillText(l, w / 2, 220 + i * 52));
    return tex(c);
  });
}

// Geoffrey the giraffe silhouette poster (brand mascot, drawn as simple shapes)
export function geoffreyTexture() {
  return memo('geoffrey', () => {
    const w = 512, h = 768, c = canvas(w, h), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    const bw = w / RAINBOW.length; RAINBOW.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * bw, 0, bw, 40); g.fillRect(i * bw, h - 40, bw, 40); });
    g.fillStyle = '#f2a93b';
    // body, neck, head
    g.beginPath(); g.ellipse(256, 560, 110, 70, 0, 0, 7); g.fill();
    g.fillRect(150, 560, 26, 120); g.fillRect(200, 570, 26, 110); g.fillRect(290, 570, 26, 110); g.fillRect(340, 560, 26, 120);
    g.beginPath(); g.moveTo(300, 520); g.lineTo(350, 500); g.lineTo(310, 220); g.lineTo(260, 240); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(292, 200, 52, 40, -0.3, 0, 7); g.fill();
    g.fillRect(270, 130, 8, 40); g.fillRect(300, 128, 8, 40);
    g.fillStyle = '#7a4a1a';
    for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(180 + Math.random() * 150, 500 + Math.random() * 120, 12, 9, Math.random() * 3, 0, 7); g.fill(); }
    g.fillStyle = '#111'; g.beginPath(); g.arc(320, 195, 5, 0, 7); g.fill();
    g.fillStyle = '#1c5aa8'; g.font = '900 54px "Arial Black", Arial, sans-serif'; g.textAlign = 'center';
    g.fillText('GEOFFREY', 256, 100); g.font = 'bold 30px Arial'; g.fillStyle = '#333'; g.fillText('says: I don\'t wanna grow up!', 256, 730 - 30);
    return tex(c);
  });
}

// ---------- Late-90s star logo: rounded rainbow letters with the mirrored R inside a yellow star
export function starLogoTexture(w = 2048, h = 768, bg = null) {
  return memo('starlogo' + w + h + bg, () => {
    const c = canvas(w, h), g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    const fh = h * 0.5; g.font = `900 ${fh}px "Arial Black", Arial, sans-serif`; g.textBaseline = 'middle';
    const L = [['T', '#e4322b'], ['O', '#f58220'], ['Y', '#2fa84f'], ['S', '#7f3f98'], ['R', '#1d4f9e', true], ['U', '#2fa84f'], ['S', '#e4322b']];
    const widths = L.map(l => g.measureText(l[0]).width);
    const gap = fh * 0.08, starR = fh * 0.95;
    const total = widths.reduce((a, b) => a + b, 0) + gap * 6 + starR * 0.9 + fh * 0.3;
    if (total > w * 0.94) { g.setTransform(w * 0.94 / total, 0, 0, w * 0.94 / total, 0, 0); }
    const sc = Math.min(1, w * 0.94 / total);
    let x = (w / sc - total) / 2 + fh * 0.15; const y = h / sc * 0.55;
    L.forEach(([ch, col, mirror], i) => {
      const lw = widths[i];
      if (mirror) {
        const cx = x + starR * 0.45 + lw / 2, cy = y - fh * 0.15;
        g.fillStyle = '#ffd200'; g.strokeStyle = '#fff'; g.lineWidth = fh * 0.08; g.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? starR * 0.45 : starR; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.stroke();
        g.save(); g.translate(cx, cy + fh * 0.1); g.scale(-1, 1); g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = fh * 0.06; g.strokeText(ch, -lw / 2, 0); g.fillText(ch, -lw / 2, 0);
        // eyes in the R
        g.fillStyle = '#fff'; g.beginPath(); g.arc(-lw * 0.12, -fh * 0.22, fh * 0.06, 0, 7); g.arc(lw * 0.12, -fh * 0.22, fh * 0.06, 0, 7); g.fill();
        g.fillStyle = '#111'; g.beginPath(); g.arc(-lw * 0.12, -fh * 0.22, fh * 0.03, 0, 7); g.arc(lw * 0.12, -fh * 0.22, fh * 0.03, 0, 7); g.fill();
        g.restore();
        x += lw + starR * 0.9 + gap;
      } else {
        g.save(); g.translate(x + lw / 2, y + (i % 2 ? -fh * 0.05 : fh * 0.05)); g.rotate((i % 2 ? -1 : 1) * 0.05);
        g.strokeStyle = '#fff'; g.lineWidth = fh * 0.1; g.strokeText(ch, -lw / 2, 0); g.fillStyle = col; g.fillText(ch, -lw / 2, 0); g.restore();
        x += lw + gap;
      }
    });
    g.setTransform(1, 0, 0, 1, 0, 0);
    return tex(c);
  });
}

// ---------- Geoffrey face floor medallion (the round inlay at the front of Concept 2000 stores)
export function medallionTexture() {
  return memo('medallion', () => {
    const s = 1024, c = canvas(s, s), g = c.getContext('2d'), cx = s / 2, cy = s / 2;
    g.clearRect(0, 0, s, s);
    const rings = [['#1d4f9e', 0.5], ['#e4322b', 0.46], ['#2fa84f', 0.43], ['#ffd200', 0.40], ['#1d4f9e', 0.37], ['#f2c14e', 0.34]];
    rings.forEach(([col, r]) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, s * r, 0, 7); g.fill(); });
    // Geoffrey face: yellow-orange head, brown spots, big eyes, red mouth
    g.fillStyle = '#f2a93b';
    g.beginPath(); g.ellipse(cx, cy + 40, 200, 230, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx + 40, cy + 150, 180, 120, 0.2, 0, 7); g.fill(); // muzzle
    g.fillStyle = '#7a4a1a';
    [[-120, -60, 40], [90, -110, 34], [-40, 200, 30], [150, 60, 26], [-160, 120, 28]].forEach(([dx, dy, r]) => { g.beginPath(); g.ellipse(cx + dx, cy + dy, r, r * 0.8, 0.5, 0, 7); g.fill(); });
    // ossicones
    g.fillStyle = '#f2a93b'; g.fillRect(cx - 90, cy - 300, 28, 110); g.fillRect(cx + 60, cy - 300, 28, 110);
    g.fillStyle = '#7a4a1a'; g.beginPath(); g.arc(cx - 76, cy - 300, 24, 0, 7); g.arc(cx + 74, cy - 300, 24, 0, 7); g.fill();
    // eyes
    for (const dx of [-70, 70]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + dx, cy - 60, 52, 62, 0, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(cx + dx + 10, cy - 50, 26, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + dx + 18, cy - 62, 8, 0, 7); g.fill(); }
    // smile
    g.strokeStyle = '#111'; g.lineWidth = 10; g.beginPath(); g.arc(cx + 40, cy + 130, 110, 0.15, 2.9); g.stroke();
    g.fillStyle = '#e4322b'; g.beginPath(); g.ellipse(cx + 40, cy + 190, 70, 34, 0, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(cx + 170, cy + 120, 22, 16, 0.3, 0, 7); g.fill();
    return tex(c);
  });
}

// ---------- hanging department blade: blue panel, yellow lettering, arrow
export function bladeTexture(text, sub = '') {
  return memo('blade' + text + sub, () => {
    const w = 1024, h = 320, c = canvas(w, h), g = c.getContext('2d');
    g.fillStyle = '#1d4f9e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd200'; g.fillRect(0, 0, w, 18); g.fillRect(0, h - 18, w, 18);
    g.beginPath(); g.moveTo(40, h / 2); g.lineTo(110, h / 2 - 50); g.lineTo(110, h / 2 + 50); g.closePath(); g.fill();
    g.fillStyle = '#ffd200'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = `900 ${sub ? 120 : 150}px "Arial Black", Arial, sans-serif`;
    g.fillText(text.toUpperCase(), 140, sub ? h / 2 - 40 : h / 2);
    if (sub) { g.fillStyle = '#fff'; g.font = 'bold 54px Arial, sans-serif'; g.fillText(sub, 140, h / 2 + 75); }
    return tex(c);
  });
}
