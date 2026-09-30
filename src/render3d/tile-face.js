// Taş yüzü dokusu (canvas): fildişi zemin, oyulmuş rakam, renk körü dostu şekil işareti, okey yıldızı, sahte okey amblemi.
// Anahtar başına bir kez üretilir ve paylaşılır.
import * as THREE from 'three';

const INK = { red: '#c0302b', blue: '#1b5ca6', black: '#1e2328', yellow: '#cc8410' };
const cache = new Map();
const W = 256;
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
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#3f6a5e');
    bg.addColorStop(1, '#1f3c34');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(226,196,130,0.6)';
    g.lineWidth = 5;
    roundRect(g, W * 0.14, H * 0.12, W * 0.72, H * 0.76, W * 0.08);
    g.stroke();
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(Math.PI / 4);
    g.strokeStyle = 'rgba(226,196,130,0.75)';
    g.strokeRect(-W * 0.12, -W * 0.12, W * 0.24, W * 0.24);
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
      g.fillStyle = '#c99722';
      star(g, W * 0.82, H * 0.12, W * 0.09);
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
  t.anisotropy = 4;
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
}
