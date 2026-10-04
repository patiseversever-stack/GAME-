// Çuhaya işlenmiş altın Patisever amblemi (menü masası; oyun masası da aynı dokuyu paylaşır).
// 2048 px yaldızlı mühür: oyma bant, kavisli PATISEVER · OKEY · 101 yazısı, faset pusula yıldızı.
// Başlık yazı tipi yüklenince bir kez yeniden çizilir.
import * as THREE from 'three';

let cached = null;

export function emblemTexture() {
  if (cached) return cached;
  const S = 2048;
  const R = S / 2;
  const T = Math.PI * 2;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;

  const gold = () => {
    const g = x.createLinearGradient(-R, -R, R, R);
    g.addColorStop(0, '#fff0c4');
    g.addColorStop(0.3, '#e6ba5e');
    g.addColorStop(0.56, '#a8732a');
    g.addColorStop(0.8, '#f2d083');
    g.addColorStop(1, '#b8863a');
    return g;
  };

  // n kollu yıldız; shade: kolların bir yarısı koyulaşır (faset kabartma)
  const star = (ro, ri, n, rot = 0, shade = false) => {
    x.beginPath();
    for (let k = 0; k < n * 2; k++) {
      const a = rot - Math.PI / 2 + (k * Math.PI) / n;
      const r = k % 2 ? ri : ro;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.closePath();
    x.fill();
    if (!shade) return;
    x.save();
    x.shadowColor = 'transparent';
    x.fillStyle = 'rgba(84,52,12,.38)';
    for (let k = 0; k < n; k++) {
      const a = rot - Math.PI / 2 + (k * 2 * Math.PI) / n;
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(Math.cos(a) * ro, Math.sin(a) * ro);
      x.lineTo(Math.cos(a + Math.PI / n) * ri, Math.sin(a + Math.PI / n) * ri);
      x.closePath();
      x.fill();
    }
    x.restore();
  };

  // çember üzerine harf aralıklı yazı (üstte saat yönünde, altta tersine)
  const arcText = (text, r, top, px) => {
    x.save();
    x.font = `800 ${px}px "Playfair Display", Georgia, serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    const sp = px * 0.2;
    const chars = Array.from(text);
    const w = chars.map((ch) => x.measureText(ch).width + sp);
    const tot = w.reduce((a, b) => a + b, 0) - sp;
    let p = 0;
    chars.forEach((ch, i) => {
      const a = (p + (w[i] - sp) / 2 - tot / 2) / r;
      x.save();
      if (top) {
        x.rotate(a);
        x.translate(0, -r);
      } else {
        x.rotate(-a);
        x.translate(0, r);
      }
      x.lineWidth = px * 0.11;
      x.lineJoin = 'round';
      x.strokeStyle = 'rgba(34,22,4,.78)';
      x.strokeText(ch, 0, 0);
      x.fillText(ch, 0, 0);
      x.restore();
      p += w[i];
    });
    x.restore();
  };

  const draw = () => {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, S, S);
    x.translate(R, R);
    const G = gold();
    x.fillStyle = G;
    x.strokeStyle = G;
    x.shadowColor = 'rgba(0,0,0,.5)';
    x.shadowBlur = 14;
    x.shadowOffsetY = 6;
    // dış bant ve halkalar
    x.beginPath();
    x.arc(0, 0, R * 0.965, 0, T);
    x.moveTo(R * 0.905, 0);
    x.arc(0, 0, R * 0.905, 0, T, true);
    x.fill('evenodd');
    x.lineWidth = R * 0.012;
    x.beginPath();
    x.arc(0, 0, R * 0.872, 0, T);
    x.stroke();
    x.lineWidth = R * 0.018;
    x.beginPath();
    x.arc(0, 0, R * 0.615, 0, T);
    x.stroke();
    x.lineWidth = R * 0.007;
    x.beginPath();
    x.arc(0, 0, R * 0.575, 0, T);
    x.stroke();
    // kavisli yazı
    const TG = x.createLinearGradient(0, -R, 0, R);
    TG.addColorStop(0, '#fff6d8');
    TG.addColorStop(0.5, '#f3cf78');
    TG.addColorStop(1, '#fff1c8');
    x.fillStyle = TG;
    arcText('PATISEVER', R * 0.745, true, R * 0.178);
    arcText('OKEY · 101', R * 0.745, false, R * 0.15);
    // yazılar arasında küçük yıldızlar
    x.fillStyle = G;
    for (const r of [0, Math.PI]) {
      x.save();
      x.rotate(r);
      x.translate(R * 0.742, 0);
      star(R * 0.05, R * 0.018, 4);
      x.restore();
    }
    x.shadowBlur = 0;
    x.shadowOffsetY = 0;
    x.shadowColor = 'transparent';
    // oyma bant çentikleri
    x.fillStyle = 'rgba(70,45,10,.55)';
    for (let i = 0; i < 120; i++) {
      x.save();
      x.rotate((i / 120) * T);
      x.fillRect(-R * 0.004, -R * 0.958, R * 0.008, R * 0.046);
      x.restore();
    }
    // iç ışınlar
    x.strokeStyle = 'rgba(232,190,110,.32)';
    x.lineWidth = R * 0.004;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * T;
      x.beginPath();
      x.moveTo(Math.cos(a) * R * 0.16, Math.sin(a) * R * 0.16);
      x.lineTo(Math.cos(a) * R * 0.54, Math.sin(a) * R * 0.54);
      x.stroke();
    }
    // faset pusula yıldızı
    x.shadowColor = 'rgba(0,0,0,.55)';
    x.shadowBlur = 16;
    x.shadowOffsetY = 6;
    x.fillStyle = G;
    star(R * 0.29, R * 0.075, 8, Math.PI / 8, true);
    star(R * 0.5, R * 0.1, 4, 0, true);
    x.shadowColor = 'transparent';
    x.beginPath();
    x.arc(0, 0, R * 0.065, 0, T);
    x.fillStyle = G;
    x.fill();
    x.lineWidth = R * 0.012;
    x.strokeStyle = 'rgba(60,38,8,.65)';
    x.stroke();
  };

  draw();
  if (document.fonts?.load) {
    document.fonts
      .load('800 100px "Playfair Display"')
      .then(() => {
        draw();
        tex.needsUpdate = true;
      })
      .catch(() => {});
  }
  cached = tex;
  return tex;
}
