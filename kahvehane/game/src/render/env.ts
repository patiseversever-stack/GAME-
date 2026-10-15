// Tam ekran premium çuha: kenardan kenara yeşil, ortada sıcak ışık havuzu, ince lif dokusu,
// yığının altında kabartma altın amblem halkası. Kodla üretilir, 1 çizim çağrısı.
import * as THREE from 'three';
import type {Stage} from './stage';
import {TABLE} from '../game/layout';

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Laleli amblem: kabartma (koyu gölge + açık kenar) olarak çizilir. */
function tulip(g: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(0, -1);
  g.bezierCurveTo(0.35, -0.7, 0.42, -0.15, 0.12, 0.25);
  g.bezierCurveTo(0.3, 0.05, 0.62, -0.25, 0.55, -0.7);
  g.bezierCurveTo(0.85, -0.2, 0.6, 0.45, 0.0, 0.55);
  g.bezierCurveTo(-0.6, 0.45, -0.85, -0.2, -0.55, -0.7);
  g.bezierCurveTo(-0.62, -0.25, -0.3, 0.05, -0.12, 0.25);
  g.bezierCurveTo(-0.42, -0.15, -0.35, -0.7, 0, -1);
  g.closePath();
  g.moveTo(0.04, 0.55);
  g.lineTo(0.04, 1.0);
  g.lineTo(-0.04, 1.0);
  g.lineTo(-0.04, 0.55);
  g.restore();
}

function feltCanvas(W: number, H: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const r = prng(11);
  const cx = W / 2, cy = H * TABLE.feltCenterV;
  // temel renk: merkezden kenara
  const base = g.createRadialGradient(cx, cy, H * 0.05, cx, cy, Math.hypot(W, H) * 0.55);
  base.addColorStop(0, '#22774f');
  base.addColorStop(0.35, '#1a6342');
  base.addColorStop(0.75, '#0f4430');
  base.addColorStop(1, '#082a1d');
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  // ince çuha lifleri
  const n = Math.round((W * H) / 90);
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = 1.5 + r() * 4;
    const light = r() < 0.5;
    g.strokeStyle = light ? `rgba(150,220,170,${0.025 + r() * 0.04})` : `rgba(0,20,10,${0.04 + r() * 0.06})`;
    g.lineWidth = 0.6 + r() * 0.7;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // amblem halkası (yığının altı): çift ince altın çizgi + laleler + KAHVEHANE yazısı (kabartma)
  const R = H * 0.19;
  const emboss = (draw: () => void) => {
    g.save();
    g.translate(0, 2);
    g.globalAlpha = 0.5;
    g.strokeStyle = g.fillStyle = 'rgba(0,18,10,1)';
    draw();
    g.restore();
    g.save();
    g.translate(0, -1);
    g.globalAlpha = 0.22;
    g.strokeStyle = g.fillStyle = 'rgba(190,240,200,1)';
    draw();
    g.restore();
  };
  const goldLine = (rad: number, wdt: number, alpha: number) => {
    g.save();
    g.strokeStyle = `rgba(232,196,110,${alpha})`;
    g.lineWidth = wdt;
    g.beginPath();
    g.arc(cx, cy, rad, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  };
  emboss(() => {
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.stroke();
  });
  goldLine(R, 2.2, 0.32);
  goldLine(R - 10, 1, 0.18);
  goldLine(R * 1.18, 1, 0.12);
  // dört lale
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const x = cx + Math.cos(a) * R * 1.09, y = cy + Math.sin(a) * R * 1.09;
    emboss(() => {
      tulip(g, x, y, H * 0.026, a + Math.PI / 2);
      g.fill();
    });
    g.save();
    g.globalAlpha = 0.28;
    g.fillStyle = '#e8c46e';
    tulip(g, x, y, H * 0.026, a + Math.PI / 2);
    g.fill();
    g.restore();
  }
  // KAHVEHANE yazısı halkanın üst yayında
  const text = 'K A H V E H A N E';
  g.save();
  g.font = `900 ${Math.round(H * 0.024)}px "Playfair Display", serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const span = 1.0; // radyan
  for (let i = 0; i < text.length; i++) {
    const a = -Math.PI / 2 - span / 2 + (i / (text.length - 1)) * span;
    const x = cx + Math.cos(a) * R * 0.84, y = cy + Math.sin(a) * R * 0.84;
    g.save();
    g.translate(x, y);
    g.rotate(a + Math.PI / 2);
    g.fillStyle = 'rgba(0,18,10,0.45)';
    g.fillText(text[i], 0, 2);
    g.fillStyle = 'rgba(232,196,110,0.22)';
    g.fillText(text[i], 0, 0);
    g.restore();
  }
  g.restore();
  // kenar koyulaşması
  const v = g.createRadialGradient(cx, cy, H * 0.45, cx, cy, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,8,4,0.55)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return c;
}

export async function buildEnvironment(stage: Stage): Promise<void> {
  try {
    await document.fonts.load('900 40px "Playfair Display"');
  } catch {
    /* yazı tipi yoksa sistem yazısı */
  }
  const hi = stage.q.tier !== 'low';
  const W = hi ? 2048 : 1280, H = Math.round(W * (TABLE.feltD / TABLE.feltW));
  const tex = new THREE.CanvasTexture(feltCanvas(W, H));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(stage.q.anisotropy, stage.renderer.capabilities.getMaxAnisotropy());
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(TABLE.feltW, TABLE.feltD), new THREE.MeshBasicMaterial({map: tex, toneMapped: false}));
  plane.rotation.x = -Math.PI / 2;
  // amblem merkezi yığının altına gelsin
  plane.position.set(0, TABLE.y - 0.0005, (TABLE.feltCenterV - 0.5) * -TABLE.feltD);
  plane.renderOrder = -1;
  stage.scene.add(plane);
  stage.scene.background = new THREE.Color(0x082a1d);
}
