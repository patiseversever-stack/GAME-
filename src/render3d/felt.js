// Okey çuhası: kesintisiz tekrar eden, yönsüz (bant/çizgi yok), ince taneli kumaş dokusu.
//   • yükseklik alanı = kısa yün lifleri (her yöne dağılmış) + ince tane + çok yumuşak, yönsüz bulutlanma
//   • renk bu alandan türetilir; normal haritası aynı alandan Sobel ile → lambada gerçek kumaş kabarıklığı
// Dönemli (periyodik) değer gürültüsü kullanıldığından döşeme izi görünmez. Bir kez üretilir, menü ve masa paylaşır.
import * as THREE from 'three';

let cache = null;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// dönemli değer gürültüsü: G×G ızgara, yumuşak (smootherstep) aradeğerleme
function periodicNoise(S, G, rnd) {
  const grid = new Float32Array(G * G);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const out = new Float32Array(S * S);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  for (let y = 0; y < S; y++) {
    const gy = (y / S) * G;
    const y0 = Math.floor(gy);
    const fy = fade(gy - y0);
    const ya = (y0 % G) * G;
    const yb = ((y0 + 1) % G) * G;
    for (let x = 0; x < S; x++) {
      const gx = (x / S) * G;
      const x0 = Math.floor(gx);
      const fx = fade(gx - x0);
      const xa = x0 % G;
      const xb = (x0 + 1) % G;
      const a = grid[ya + xa] + (grid[ya + xb] - grid[ya + xa]) * fx;
      const b = grid[yb + xa] + (grid[yb + xb] - grid[yb + xa]) * fx;
      out[y * S + x] = a + (b - a) * fy;
    }
  }
  return out;
}

export function feltTextures(size = 1024) {
  if (cache) return cache;
  const S = size;
  const rnd = rng(7391);

  // 1) lif katmanı (kısa, ince, rastgele yönlü; kenarlardan taşanlar karşı kenara sarılır)
  const hc = document.createElement('canvas');
  hc.width = hc.height = S;
  const h = hc.getContext('2d');
  h.fillStyle = 'rgb(128,128,128)';
  h.fillRect(0, 0, S, S);
  h.lineCap = 'round';
  const fiber = (x, y, len, ang, w, light) => {
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len;
    h.strokeStyle = light ? `rgba(255,255,255,${0.05 + rnd() * 0.1})` : `rgba(0,0,0,${0.05 + rnd() * 0.1})`;
    h.lineWidth = w;
    for (const ox of [-S, 0, S])
      for (const oy of [-S, 0, S]) {
        if (x + ox + Math.abs(dx) < -4 || x + ox - Math.abs(dx) > S + 4 || y + oy + Math.abs(dy) < -4 || y + oy - Math.abs(dy) > S + 4) continue;
        h.beginPath();
        h.moveTo(x + ox - dx / 2, y + oy - dy / 2);
        h.lineTo(x + ox + dx / 2, y + oy + dy / 2);
        h.stroke();
      }
  };
  const N = Math.round(S * S * 0.055);
  for (let i = 0; i < N; i++) fiber(rnd() * S, rnd() * S, 2 + rnd() * 5, rnd() * Math.PI, 0.5 + rnd() * 0.7, rnd() < 0.5);
  const fib = hc.getContext('2d').getImageData(0, 0, S, S).data;

  // 2) yönsüz tane + bulutlanma (dönemli)
  const cloudA = periodicNoise(S, 6, rnd);
  const cloudB = periodicNoise(S, 14, rnd);
  const grain = periodicNoise(S, 256, rnd);
  const H = new Float32Array(S * S); // son yükseklik (0..1)
  for (let i = 0; i < H.length; i++) {
    const f = (fib[i * 4] - 128) / 128; // lifler -1..1
    H[i] = 0.5 + f * 0.5 + (grain[i] - 0.5) * 0.35;
  }

  // 3) renk: koyu zümrüt taban; lifler ve tane ışık/gölge; yönsüz çok hafif bulutlanma (±%4)
  const cc = document.createElement('canvas');
  cc.width = cc.height = S;
  const cg = cc.getContext('2d');
  const cimg = cg.createImageData(S, S);
  const c = cimg.data;
  for (let i = 0; i < H.length; i++) {
    const cl = (cloudA[i] - 0.5) * 0.06 + (cloudB[i] - 0.5) * 0.05;
    const k = 1 + (H[i] - 0.5) * 0.55 + cl;
    const j = i * 4;
    c[j] = Math.max(0, Math.min(255, 36 * k));
    c[j + 1] = Math.max(0, Math.min(255, 100 * k));
    c[j + 2] = Math.max(0, Math.min(255, 80 * k));
    c[j + 3] = 255;
  }
  cg.putImageData(cimg, 0, 0);

  // 4) normal haritası (Sobel, dönemli kenarlar)
  const nc = document.createElement('canvas');
  nc.width = nc.height = S;
  const ng = nc.getContext('2d');
  const nimg = ng.createImageData(S, S);
  const nd = nimg.data;
  const at = (x, y) => H[((y + S) % S) * S + ((x + S) % S)];
  const strength = 3.2;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) * strength;
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * S + x) * 4;
      nd[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      nd[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      nd[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      nd[i + 3] = 255;
    }
  ng.putImageData(nimg, 0, 0);

  const mk = (canvas, srgb) => {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 16;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  cache = { map: mk(cc, true), normal: mk(nc, false) };
  return cache;
}

// Kumaş malzemesi: hafif kadife parıltısı (sheen); düşük kalitede sade standart malzeme
export function feltMaterial(hq = true) {
  const { map, normal } = feltTextures();
  if (!hq) return new THREE.MeshStandardMaterial({ map, normalMap: normal, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.98, metalness: 0, color: 0xc4e4d8 });
  return new THREE.MeshPhysicalMaterial({
    map,
    normalMap: normal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.95,
    metalness: 0,
    color: 0xc8e8dc,
    sheen: 0.8,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0x4fa88a),
  });
}
