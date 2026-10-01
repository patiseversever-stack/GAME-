// Taş yüzü dokusu (canvas): fildişi zemin, oyulmuş rakam, renk körü dostu şekil işareti, okey yıldızı, sahte okey amblemi.
// Anahtar başına bir kez üretilir ve paylaşılır.
import * as THREE from 'three';

const INK = { red: '#c0302b', blue: '#1b5ca6', black: '#1e2328', yellow: '#cc8410' };
const cache = new Map();
const W = 320;
const H = Math.round(W * 1.36);

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function mark(g, color, cx, cy, s) {
  g.fillStyle = INK[color];
  g.beginPath();
  if (color === 'red') g.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
  else if (color === 'blue') {
    g.moveTo(cx, cy - s * 0.62);
    g.lineTo(cx + s * 0.5, cy);
    g.lineTo(cx, cy + s * 0.62);
    g.lineTo(cx - s * 0.5, cy);
  } else if (color === 'black') {
    g.moveTo(cx, cy - s * 0.55);
    g.lineTo(cx + s * 0.58, cy + s * 0.45);
    g.lineTo(cx - s * 0.58, cy + s * 0.45);
  } else g.rect(cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84);
  g.closePath();
  g.fill();
}

// oyulmuş görünüm: koyu iç gölge + açık alt kenar
function engraved(g, draw) {
  g.save();
  g.translate(0, 3);
  g.globalAlpha = 0.5;
  g.fillStyle = 'rgba(255,255,255,0.9)';
  draw('light');
  g.restore();
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = 3;
  g.shadowOffsetY = -1.5;
  draw('ink');
  g.restore();
}

function base(g, back = false) {
  g.clearRect(0, 0, W, H);
  const r = W * 0.16;
  roundRect(g, 0, 0, W, H, r);
  g.save();
  g.clip();
  if (back) {
    // arka yüz: fildişi zemin, kabartma çerçeve ve ortada altın Patisever yıldızı (çuhadan net ayrışır)
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#f3e9d2');
    bg.addColorStop(1, '#ddcba6');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const v = g.createRadialGradient(W * 0.4, H * 0.32, W * 0.1, W / 2, H / 2, W * 0.95);
    v.addColorStop(0, 'rgba(255,255,255,0.4)');
    v.addColorStop(1, 'rgba(110,80,30,0.16)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(150,108,40,0.55)';
    g.lineWidth = W * 0.022;
    roundRect(g, W * 0.12, H * 0.1, W * 0.76, H * 0.8, W * 0.09);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = W * 0.008;
    roundRect(g, W * 0.12 + 3, H * 0.1 + 3, W * 0.76, H * 0.8, W * 0.09);
    g.stroke();
    g.save();
    g.translate(W / 2, H / 2);
    const gold = g.createLinearGradient(-W * 0.2, -W * 0.2, W * 0.2, W * 0.2);
    gold.addColorStop(0, 'rgba(190,150,80,0.55)');
    gold.addColorStop(1, 'rgba(140,100,40,0.55)');
    g.fillStyle = gold;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 8;
      const r = i % 2 ? W * 0.085 : W * 0.21;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.fillStyle = '#f3e9d2';
    g.beginPath();
    g.arc(0, 0, W * 0.05, 0, Math.PI * 2);
    g.fill();
    g.restore();
  } else {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fbf6ea');
    bg.addColorStop(1, '#ece0c6');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // kemik dokusu
    g.globalAlpha = 0.05;
    for (let i = 0; i < 60; i++) {
      g.fillStyle = i % 2 ? '#8a6a3a' : '#fff';
      g.fillRect(0, Math.random() * H, W, 1);
    }
    g.globalAlpha = 1;
    // hafif iç çukur
    const v = g.createRadialGradient(W * 0.4, H * 0.35, W * 0.2, W / 2, H / 2, W * 0.9);
    v.addColorStop(0, 'rgba(255,255,255,0.35)');
    v.addColorStop(1, 'rgba(120,90,40,0.12)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
  }
  g.restore();
}

// key: {kind:'num'|'okey'|'fake'|'back', color, value}
export function faceTexture(desc) {
  const key = `${desc.kind}|${desc.color || ''}|${desc.value || ''}|${desc.rep ? 1 : 0}`;
  let t = cache.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  base(g, desc.kind === 'back');
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  if (desc.kind === 'num') {
    const txt = String(desc.value);
    const fs = txt.length > 1 ? W * 0.62 : W * 0.72;
    g.font = `800 ${fs}px "DM Sans", "Segoe UI", system-ui, sans-serif`;
    const col = INK[desc.color];
    engraved(g, (mode) => {
      g.fillStyle = mode === 'light' ? 'rgba(255,255,255,0.9)' : col;
      g.fillText(txt, W / 2, H * 0.56);
    });
    engraved(g, (mode) => {
      if (mode === 'light') return;
      mark(g, desc.color, W / 2, H * 0.74, W * 0.17);
    });
    if (desc.rep) {
      // masadaki okey: köşede küçük yıldız
      // okey rozeti: koyu çerçeveli altın yıldız (okey olduğu ilk bakışta anlaşılır)
      g.fillStyle = '#5a3d06';
      star(g, W * 0.79, H * 0.13, W * 0.15);
      g.fillStyle = '#f2b81c';
      star(g, W * 0.79, H * 0.13, W * 0.12);
    }
  } else if (desc.kind === 'okey') {
    const gg = g.createLinearGradient(0, 0, 0, H);
    gg.addColorStop(0, 'rgba(255,230,160,0.55)');
    gg.addColorStop(1, 'rgba(230,180,70,0.35)');
    g.fillStyle = gg;
    roundRect(g, 0, 0, W, H, W * 0.16);
    g.fill();
    engraved(g, (mode) => {
      g.fillStyle = mode === 'light' ? 'rgba(255,255,255,0.9)' : '#c28f1b';
      star(g, W / 2, H * 0.44, W * 0.3);
    });
    g.font = `800 ${W * 0.15}px "DM Sans", system-ui, sans-serif`;
    g.fillStyle = '#8a6412';
    g.fillText('OKEY', W / 2, H * 0.84);
  } else if (desc.kind === 'fake') {
    g.font = `800 ${W * 0.46}px "DM Sans", system-ui, sans-serif`;
    engraved(g, (mode) => {
      g.fillStyle = mode === 'light' ? 'rgba(255,255,255,0.9)' : INK[desc.color] || '#1e2328';
      g.fillText(String(desc.value), W / 2, H * 0.44);
    });
    g.strokeStyle = '#1f7a58';
    g.lineWidth = 7;
    g.beginPath();
    g.arc(W / 2, H * 0.64, W * 0.13, 0, Math.PI * 2);
    g.stroke();
    g.font = `800 ${W * 0.12}px "DM Sans", system-ui, sans-serif`;
    g.fillStyle = '#1f7a58';
    g.fillText('SAHTE', W / 2, H * 0.9);
  }
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  cache.set(key, t);
  return t;
}

function star(g, cx, cy, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

// Oyma kabartma haritası: zemin yüksek (beyaz), rakam/işaret oyuk (koyu) — lamba ışığında gerçek oyma gölgesi verir
const bumpCache = new Map();
export function faceBump(desc) {
  if (desc.kind === 'back') return null;
  const key = `${desc.kind}|${desc.value || ''}|${desc.color || ''}`;
  let t = bumpCache.get(key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.filter = 'blur(2.2px)';
  g.fillStyle = '#000';
  g.strokeStyle = '#000';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  if (desc.kind === 'num') {
    const txt = String(desc.value);
    const fs = txt.length > 1 ? W * 0.62 : W * 0.72;
    g.font = `800 ${fs}px "DM Sans", "Segoe UI", system-ui, sans-serif`;
    g.fillText(txt, W / 2, H * 0.56);
    const keep = INK[desc.color];
    INK[desc.color] = '#000';
    mark(g, desc.color, W / 2, H * 0.74, W * 0.17);
    INK[desc.color] = keep;
  } else if (desc.kind === 'okey') {
    star(g, W / 2, H * 0.44, W * 0.3);
    g.font = `800 ${W * 0.15}px "DM Sans", system-ui, sans-serif`;
    g.fillText('OKEY', W / 2, H * 0.84);
  } else if (desc.kind === 'fake') {
    g.font = `800 ${W * 0.46}px "DM Sans", system-ui, sans-serif`;
    g.fillText(String(desc.value), W / 2, H * 0.44);
    g.lineWidth = 7;
    g.beginPath();
    g.arc(W / 2, H * 0.64, W * 0.13, 0, Math.PI * 2);
    g.stroke();
  }
  g.filter = 'none';
  t = new THREE.CanvasTexture(c);
  t.anisotropy = 16;
  bumpCache.set(key, t);
  return t;
}

// DOM taş öğesinden yüz tanımı (tile-dom.js'in yazdığı dataset'ten)
export function descFromEl(el) {
  const d = el.dataset;
  const num = el._face?.querySelector('.tile__num')?.textContent;
  if (d.fake) return { kind: 'fake', color: d.color, value: num };
  if (d.okey && !d.rep) return { kind: 'okey' };
  return { kind: 'num', color: d.color, value: num, rep: !!d.rep };
}

export function clearFaceCache() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
  for (const t of bumpCache.values()) t.dispose();
  bumpCache.clear();
}
