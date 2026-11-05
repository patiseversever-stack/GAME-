// Kodla üretilen dokular (kredisiz). İleride Meshy/Higgsfield dokularıyla değiştirilebilir.
import * as THREE from 'three/webgpu';

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

// Tekrarlanabilir değer gürültüsü (sarmal)
function makeNoise(size, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const grid = (n) => {
    const g = new Float32Array(n * n);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = g[((yi % n + n) % n) * n + ((xi % n + n) % n)];
      const b = g[((yi % n + n) % n) * n + (((xi + 1) % n + n) % n)];
      const c = g[(((yi + 1) % n + n) % n) * n + ((xi % n + n) % n)];
      const d = g[(((yi + 1) % n + n) % n) * n + (((xi + 1) % n + n) % n)];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  };
  const octaves = [4, 8, 16, 32, 64].map((n) => [n, grid(n)]);
  return (x, y) => {
    // x,y ∈ [0,1)
    let v = 0, amp = 0.5, tot = 0;
    for (const [n, f] of octaves) {
      v += f(x * n, y * n) * amp;
      tot += amp;
      amp *= 0.5;
    }
    return v / tot;
  };
}

function heightToNormal(h, size, strength) {
  const [c, ctx] = canvas(size);
  const img = ctx.createImageData(size, size);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function toTexture(c, { repeat = 1, srgb = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function rockNormal(size = 512) {
  const n = makeNoise(size, 7);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = n(x / size, y / size);
    h[y * size + x] = Math.pow(v, 1.4) + 0.25 * Math.abs(n((x / size) * 2 % 1, (y / size) * 2 % 1) - 0.5);
  }
  return toTexture(heightToNormal(h, size, 6), { repeat: 1 });
}

export function waterNormal(size = 512) {
  const n = makeNoise(size, 3);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    h[y * size + x] = n(u, v) + 0.5 * Math.sin((u * 6 + n(v, u) * 2) * Math.PI * 2) * 0.15;
  }
  return toTexture(heightToNormal(h, size, 3.5), { repeat: 1 });
}

// Taş döşeme: düzensiz dikdörtgen plakalar, aralarında derz
export function stoneSlabs(size = 1024) {
  const [c, ctx] = canvas(size);
  const n = makeNoise(256, 11);
  ctx.fillStyle = '#4a4238';
  ctx.fillRect(0, 0, size, size);
  let s = 5;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const y0 = (r / rows) * size;
    const hh = size / rows;
    let x = -rnd() * 80;
    while (x < size) {
      const w = 110 + rnd() * 170;
      const base = 118 + rnd() * 40;
      const tint = rnd();
      ctx.fillStyle = `rgb(${base + 10 * tint},${base + 4},${base - 14 + 6 * tint})`;
      const g = 5 + rnd() * 4;
      ctx.fillRect(x + g, y0 + g, w - g * 2, hh - g * 2);
      x += w;
    }
  }
  // kir, yosun ve aşınma
  const img = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const v = n(x / size, y / size);
    const moss = Math.max(0, n((x / size + 0.37) % 1, (y / size + 0.11) % 1) - 0.58) * 2.4;
    const k = 0.72 + v * 0.5;
    img.data[i] = img.data[i] * k * (1 - moss * 0.45) + 40 * moss;
    img.data[i + 1] = img.data[i + 1] * k * (1 - moss * 0.15) + 60 * moss;
    img.data[i + 2] = img.data[i + 2] * k * (1 - moss * 0.55) + 18 * moss;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true });
}

export function planks(size = 1024) {
  const [c, ctx] = canvas(size);
  const n = makeNoise(256, 21);
  const count = 8;
  let s = 9;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const y0 = (i / count) * size;
    const base = 92 + rnd() * 34;
    for (let y = 0; y < size / count; y++) {
      for (let x = 0; x < size; x += 2) {
        const grain = Math.sin((x / size) * 60 + n(x / size, (y0 + y) / size) * 18) * 0.5 + 0.5;
        const v = base * (0.75 + grain * 0.35);
        ctx.fillStyle = `rgb(${v * 1.08},${v * 0.82},${v * 0.58})`;
        ctx.fillRect(x, y0 + y, 2, 1);
      }
    }
    ctx.fillStyle = 'rgba(20,12,6,0.85)';
    ctx.fillRect(0, y0, size, 4);
  }
  return toTexture(c, { srgb: true });
}

export function sand(size = 512) {
  const [c, ctx] = canvas(size);
  const n = makeNoise(size, 31);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const v = n(x / size, y / size);
    const speck = ((x * 7919 + y * 104729) % 97) / 97;
    const k = 0.82 + v * 0.3 + (speck > 0.96 ? -0.15 : 0);
    img.data[i] = 214 * k;
    img.data[i + 1] = 194 * k;
    img.data[i + 2] = 158 * k;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true });
}

export function softDot(size = 64) {
  const [c, ctx] = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function bannerTexture(text, bg = '#d9772b', fg = '#1b1410') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * 1024, 0, 2, 256);
  ctx.fillStyle = fg;
  ctx.font = '900 170px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '40px';
  ctx.fillText(text, 512, 138);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
