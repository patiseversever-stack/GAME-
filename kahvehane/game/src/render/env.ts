// Tam ekran sinematik çuha: kenardan kenara koyu yeşil, ortada sıcak altın ışık, ince lif dokusu,
// kenarlarda belli belirsiz kabartma kart sembolleri, güçlü kenar karartması. Kodla üretilir, 1 çizim çağrısı.
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

/** Kart sembolü yolu (birim boyut, merkez 0,0). Emoji yazı tipine güvenmemek için elle çizilir. */
function suitPath(g: CanvasRenderingContext2D, k: number): void {
  g.beginPath();
  if (k === 2) {
    // karo
    g.moveTo(0, -1); g.lineTo(0.72, 0); g.lineTo(0, 1); g.lineTo(-0.72, 0); g.closePath();
    return;
  }
  if (k === 3) {
    // kupa
    g.moveTo(0, 0.95);
    g.bezierCurveTo(-0.55, 0.45, -1, 0.05, -1, -0.4);
    g.bezierCurveTo(-1, -0.85, -0.45, -1.05, 0, -0.55);
    g.bezierCurveTo(0.45, -1.05, 1, -0.85, 1, -0.4);
    g.bezierCurveTo(1, 0.05, 0.55, 0.45, 0, 0.95);
    g.closePath();
    return;
  }
  if (k === 1) {
    // maça: ters kupa + sap
    g.moveTo(0, -1);
    g.bezierCurveTo(0.55, -0.5, 1, -0.15, 1, 0.25);
    g.bezierCurveTo(1, 0.7, 0.45, 0.85, 0.08, 0.5);
    g.lineTo(0.3, 1); g.lineTo(-0.3, 1); g.lineTo(-0.08, 0.5);
    g.bezierCurveTo(-0.45, 0.85, -1, 0.7, -1, 0.25);
    g.bezierCurveTo(-1, -0.15, -0.55, -0.5, 0, -1);
    g.closePath();
    return;
  }
  // sinek: üç daire + sap
  g.arc(0, -0.45, 0.42, 0, Math.PI * 2);
  g.moveTo(-0.45 + 0.42, 0.12); g.arc(-0.45, 0.12, 0.42, 0, Math.PI * 2);
  g.moveTo(0.45 + 0.42, 0.12); g.arc(0.45, 0.12, 0.42, 0, Math.PI * 2);
  g.moveTo(0.08, 0.2); g.lineTo(0.3, 1); g.lineTo(-0.3, 1); g.lineTo(-0.08, 0.2); g.closePath();
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
  base.addColorStop(0, '#1f6b45');
  base.addColorStop(0.4, '#165437');
  base.addColorStop(0.78, '#0c3824');
  base.addColorStop(1, '#061d13');
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
  // sıcak altın ışık havuzu (sinematik lamba ışığı)
  const warm = g.createRadialGradient(cx, cy, 0, cx, cy, H * 0.6);
  warm.addColorStop(0, 'rgba(255,196,96,0.55)');
  warm.addColorStop(0.5, 'rgba(255,180,80,0.16)');
  warm.addColorStop(1, 'rgba(255,180,80,0)');
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = warm;
  g.fillRect(0, 0, W, H);
  g.restore();
  // görüş alanının kenarlarına yakın, belli belirsiz kabartma kart sembolleri
  const spots: [number, number, number, number][] = [
    [0.29, 0.3, 0.075, -0.35], [0.72, 0.33, 0.065, 0.3], [0.75, 0.7, 0.08, -0.2], [0.26, 0.72, 0.07, 0.25],
  ];
  spots.forEach(([u, vv, sz, rot], i) => {
    for (const [dy, col] of [[3, 'rgba(0,20,10,0.20)'], [0, 'rgba(160,235,180,0.045)']] as const) {
      g.save();
      g.translate(u * W, vv * H + dy);
      g.rotate(rot);
      g.scale(H * sz, H * sz);
      suitPath(g, i % 4);
      g.fillStyle = col;
      g.fill();
      g.restore();
    }
  });
  // kenar koyulaşması
  const v = g.createRadialGradient(cx, cy, H * 0.45, cx, cy, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,6,3,0.72)');
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
