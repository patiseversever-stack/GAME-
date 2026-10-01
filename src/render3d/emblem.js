// Çuhaya işlenmiş altın Patisever amblemi (menü ve oyun masası ortak).
import * as THREE from 'three';

let cached = null;
export // çuhaya işlenmiş altın amblem: çift halka, süsleme, kavisli PATISEVER yazısı, ortada yıldız
function emblemTexture() {
  if (cached) return cached;
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const C = S / 2;
  g.translate(C, C);
  const gold = g.createLinearGradient(-C, -C, C, C);
  gold.addColorStop(0, '#f7dc95');
  gold.addColorStop(0.5, '#c99a43');
  gold.addColorStop(1, '#f1d082');
  g.strokeStyle = gold;
  g.fillStyle = gold;
  g.globalAlpha = 0.92;
  g.lineWidth = 9;
  g.beginPath();
  g.arc(0, 0, C * 0.92, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, C * 0.86, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, C * 0.56, 0, Math.PI * 2);
  g.stroke();
  // halka içi noktalı süsleme
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.2) continue;
    g.beginPath();
    g.arc(Math.cos(a) * C * 0.6, Math.sin(a) * C * 0.6, 4, 0, Math.PI * 2);
    g.fill();
  }
  // kavisli yazı: üstte saat yönünde, altta harfler dik kalacak biçimde soldan sağa
  const arcText = (txt, r, top, size) => {
    g.save();
    g.font = `700 ${size}px "Playfair Display", Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const sp = size * 0.22;
    const ws = [...txt].map((ch) => g.measureText(ch).width + sp);
    const total = ws.reduce((x, y) => x + y, 0) - sp;
    let cum = 0;
    [...txt].forEach((ch, i) => {
      const phi = (cum + (ws[i] - sp) / 2 - total / 2) / r;
      g.save();
      if (top) {
        g.rotate(phi);
        g.fillText(ch, 0, -r);
      } else {
        g.rotate(-phi);
        g.fillText(ch, 0, r);
      }
      g.restore();
      cum += ws[i];
    });
    g.restore();
  };
  arcText('PATISEVER', C * 0.72, true, 92);
  arcText('OKEY · 101', C * 0.72, false, 70);
  // merkez yıldız
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 8;
    const r = i % 2 ? C * 0.17 : C * 0.4;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.globalAlpha = 0.85;
  g.lineWidth = 5;
  g.stroke();
  g.globalAlpha = 0.28;
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  cached = t;
  return t;
}

