// Masa ortamı — bir kez (her yerleşimde) canvas'a boyanır; DOM taşlar üzerinde GPU ile kompozit olur.
// İçerik: çuha dokusu (lif yönlü gürültü), tepe lambası ışık havuzu, kenar vinyeti, ıstaka ve rakip ıstakalarının
// masaya düşen yumuşak temas gölgeleri, ince deri kenar. Dekoratif metin/logo yok: yüzey sakin, taşlar kahraman.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let feltTile = null;
function makeFeltTile() {
  if (feltTile) return feltTile;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  // değer gürültüsü + lif yönü (yatay hafif eğik)
  const d = img.data;
  const base = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) base[i] = rnd();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0;
      // yatay lif bulanıklığı
      for (let k = -3; k <= 3; k++) v += base[y * S + ((x + k + S) % S)] * (4 - Math.abs(k));
      v /= 16;
      const n = (v - 0.5) * 34 + (base[((y + 1) % S) * S + x] - 0.5) * 10;
      const i = (y * S + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 128 + n;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  feltTile = c;
  return c;
}

// L: yerleşim, colors: CSS değişkenlerinden okunan palet
export function paintTable(canvas, L, { dpr = 1, felt = ['#2c5e52', '#173c34', '#0a1e1a'], lamp = 'rgba(255,236,196,0.16)' } = {}) {
  const W = L.w;
  const H = L.h;
  const q = clamp(dpr, 1, 2);
  canvas.width = Math.round(W * q);
  canvas.height = Math.round(H * q);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const g = canvas.getContext('2d');
  g.setTransform(q, 0, 0, q, 0, 0);
  // 1) çuha taban: merkezde açık, kenarda koyu
  const cx = W / 2;
  const cy = L.profile === 'landscape' ? L.table.y + L.table.h * 0.62 : L.table.y + L.table.h * 0.55;
  const R = Math.hypot(W, H) * 0.62;
  const bg = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  bg.addColorStop(0, felt[0]);
  bg.addColorStop(0.55, felt[1]);
  bg.addColorStop(1, felt[2]);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // 2) lif dokusu (overlay)
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = 0.38;
  g.fillStyle = g.createPattern(makeFeltTile(), 'repeat');
  g.fillRect(0, 0, W, H);
  g.restore();
  // 3) lamba ışık havuzu (oyun alanı üstünde, sıcak)
  const lr = Math.max(W, H) * 0.55;
  const lg = g.createRadialGradient(cx, cy - H * 0.08, 0, cx, cy - H * 0.08, lr);
  lg.addColorStop(0, lamp);
  lg.addColorStop(0.5, lamp.replace(/[\d.]+\)$/, '0.06)'));
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'soft-light';
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  // 4) temas gölgeleri: benim ıstakam ve rakip ıstakaları masaya gölge düşürür
  const shadow = (x, y, w, h, a = 0.55, blur = 18) => {
    g.save();
    g.filter = `blur(${blur}px)`;
    g.fillStyle = `rgba(0,0,0,${a})`;
    g.beginPath();
    g.roundRect(x, y, w, h, 12);
    g.fill();
    g.restore();
  };
  const r = L.rack.rect;
  shadow(r.x + 6, r.y + 14, r.w - 12, r.h, 0.6, 20);
  // 5) ince çizgi: masa üzerindeki oyun alanı sınırı (dikiş) — çok hafif
  const inset = 5;
  g.save();
  g.strokeStyle = 'rgba(255,240,210,0.07)';
  g.lineWidth = 1;
  g.setLineDash([2, 3]);
  g.beginPath();
  g.roundRect(inset + 4, inset + 4, W - 2 * inset - 8, H - 2 * inset - 8, 18);
  g.stroke();
  g.restore();
  // 6) vinyet
  const vg = g.createRadialGradient(cx, cy, Math.min(W, H) * 0.35, cx, cy, R);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
}
