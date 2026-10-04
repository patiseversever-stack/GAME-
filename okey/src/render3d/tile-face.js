// Taş yüzü dokusu (canvas): fildişi zemin, net baskı rakam, renk körü dostu şekil işareti, okey rozeti, sahte okey amblemi.
// Anahtar başına bir kez üretilir ve paylaşılır. Seçili taş takımı (çini/ebru/yağlı boya) varsa onun boyacısı kullanılır.
import * as THREE from 'three';
import { themed, themedTexture } from './tile-themes/index.js';

// Baskı mürekkebi masa ışığında da okunur kalır (DOM taşlarındaki --ink-* ile aynı)
export const INK = { red: '#b9252b', blue: '#155ca8', black: '#1c2530', yellow: '#b8730a' };
const cache = new Map();
const W = 320;
const H = Math.round(W * 1.36);

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function mark(g, color, cx, cy, s) {
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

export function base(g, back = false) {
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

// key: {kind:'num'|'okey'|'fake'|'back', color, value, rep}
export function faceTexture(desc) {
  return themed() ? themedTexture(desc, ivoryTexture) : ivoryTexture(desc);
}

// Klasik fildişi takım. Okey taşı kendi sayısını, köşede altın yıldızı, ince altın çerçeveyi ve
// altta OKEY yazısını taşır; masadaki okey (rep) temsil ettiği yüzle aynı rozeti alır.
export function ivoryTexture(desc) {
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
  if (desc.kind === 'num' || desc.kind === 'okey') {
    const txt = String(desc.value);
    const fs = txt.length > 1 ? W * 0.62 : W * 0.72;
    g.font = `800 ${fs}px "DM Sans", "Segoe UI", system-ui, sans-serif`;
    g.fillStyle = INK[desc.color];
    g.fillText(txt, W / 2, H * 0.56);
    mark(g, desc.color, W / 2, H * 0.74, W * 0.17);
    if (desc.rep || desc.kind === 'okey') {
      g.fillStyle = '#a76e08';
      star(g, W * 0.83, H * 0.14, W * 0.115);
      g.strokeStyle = '#b47d18';
      g.lineWidth = W * 0.014;
      roundRect(g, W * 0.045, H * 0.035, W * 0.91, H * 0.93, W * 0.13);
      g.stroke();
      g.font = `800 ${W * 0.13}px "DM Sans", system-ui, sans-serif`;
      g.fillStyle = '#77500b';
      g.fillText('OKEY', W / 2, H * 0.91);
    }
  } else if (desc.kind === 'fake') {
    g.strokeStyle = '#126442';
    g.lineWidth = W * 0.025;
    g.beginPath();
    g.arc(W / 2, H * 0.3, W * 0.21, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#126442';
    star(g, W / 2, H * 0.3, W * 0.14);
    g.font = `900 ${W * 0.19}px "DM Sans", system-ui, sans-serif`;
    g.fillText('SAHTE', W / 2, H * 0.64);
    g.font = `800 ${W * 0.27}px "DM Sans", system-ui, sans-serif`;
    g.fillStyle = INK[desc.color];
    g.fillText(String(desc.value), W / 2, H * 0.9);
  }
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  cache.set(key, t);
  return t;
}

export function star(g, cx, cy, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

// DOM taş öğesinden yüz tanımı (tile-dom.js'in yazdığı dataset'ten)
// (sahte okeyin rakamı .tile__value'da: değer dataset.value'dan okunur)
export function descFromEl(el) {
  const d = el.dataset;
  const value = el._face?.querySelector('.tile__num')?.textContent || d.value;
  return { kind: d.fake ? 'fake' : d.okey && !d.rep ? 'okey' : 'num', color: d.color, value, rep: !!d.rep };
}

export function clearFaceCache() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}
