// Ahşap damarı dokusu: bir kez canvas ile üretilir, data-URI olarak CSS değişkenine yazılır (indirme yok).
let cache = null;
let canvasCache = null;
export function woodCanvas() {
  woodTexture();
  return canvasCache;
}
export function woodTexture() {
  if (cache) return cache;
  try {
    const w = 640;
    const h = 160;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#7a4a22';
    g.fillRect(0, 0, w, h);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // uzun damar çizgileri
    for (let i = 0; i < 90; i++) {
      const y0 = rnd() * h;
      const amp = 2 + rnd() * 7;
      const freq = 0.004 + rnd() * 0.012;
      const ph = rnd() * 6.28;
      const dark = rnd() < 0.6;
      g.strokeStyle = dark ? `rgba(40,20,6,${0.08 + rnd() * 0.22})` : `rgba(255,214,160,${0.04 + rnd() * 0.1})`;
      g.lineWidth = 0.6 + rnd() * 2.2;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * 0.25;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    // budak
    for (let k = 0; k < 2; k++) {
      const x = 80 + rnd() * (w - 160);
      const y = 30 + rnd() * (h - 60);
      for (let r = 14; r > 1; r -= 2.5) {
        g.strokeStyle = `rgba(35,16,4,${0.12 + (14 - r) * 0.015})`;
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(x, y, r * 2.4, r * 0.8, 0, 0, 6.28);
        g.stroke();
      }
    }
    canvasCache = c;
    cache = `url(${c.toDataURL('image/jpeg', 0.82)})`;
  } catch {
    cache = 'none';
  }
  return cache;
}
