// Yüksek çözünürlüklü, kesintisiz tekrar eden okey çuhası: dokuma zemin + binlerce kısa yün lifi + yumuşak renk
// dalgalanması. Aynı yükseklik alanından normal haritası üretilir → lamba ışığında gerçek kumaş dokusu (kabarık lifler).
// Bir kez üretilir (≈80 ms), menü ve masa paylaşır.
import * as THREE from 'three';

let cache = null;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function feltTextures(size = 1024) {
  if (cache) return cache;
  const S = size;
  const rnd = rng(20240917);
  // 1) yükseklik alanı: lifler (kesintisiz için kenarlardan taşanlar karşı kenara da çizilir)
  const hc = document.createElement('canvas');
  hc.width = hc.height = S;
  const h = hc.getContext('2d');
  h.fillStyle = 'rgb(128,128,128)';
  h.fillRect(0, 0, S, S);
  const fiber = (x, y, len, ang, w, light) => {
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len;
    h.strokeStyle = light ? `rgba(255,255,255,${0.05 + rnd() * 0.09})` : `rgba(0,0,0,${0.05 + rnd() * 0.09})`;
    h.lineWidth = w;
    for (const ox of [-S, 0, S])
      for (const oy of [-S, 0, S]) {
        if (x + ox + Math.abs(dx) < -4 || x + ox - Math.abs(dx) > S + 4 || y + oy + Math.abs(dy) < -4 || y + oy - Math.abs(dy) > S + 4) continue;
        h.beginPath();
        h.moveTo(x + ox - dx / 2, y + oy - dy / 2);
        h.quadraticCurveTo(x + ox + (rnd() - 0.5) * len * 0.3, y + oy + (rnd() - 0.5) * len * 0.3, x + ox + dx / 2, y + oy + dy / 2);
        h.stroke();
      }
  };
  h.lineCap = 'round';
  const N = Math.round(S * S * 0.03);
  for (let i = 0; i < N; i++) fiber(rnd() * S, rnd() * S, 3 + rnd() * 9, rnd() * Math.PI, 0.6 + rnd() * 1.1, rnd() < 0.5);
  // ince tüylenme (çok kısa, yoğun)
  const img = h.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 26;
    d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, d[i] + n));
  }
  h.putImageData(img, 0, 0);
  // hafif yumuşatma: tek piksellik keskinliği alır, lif hissi kalır
  const hs = document.createElement('canvas');
  hs.width = hs.height = S;
  const hsg = hs.getContext('2d');
  hsg.filter = 'blur(0.6px)';
  for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) hsg.drawImage(hc, ox, oy);
  const H = hsg.getImageData(0, 0, S, S).data;

  // 2) renk: koyu zümrüt + düşük frekanslı renk dalgası + liflerden ışık/gölge
  const cc = document.createElement('canvas');
  cc.width = cc.height = S;
  const cg = cc.getContext('2d');
  const cimg = cg.createImageData(S, S);
  const c = cimg.data;
  // düşük frekanslı gürültü (kesintisiz: sinüs toplamı)
  const waves = Array.from({ length: 5 }, () => ({ fx: 1 + Math.floor(rnd() * 3), fy: 1 + Math.floor(rnd() * 3), ph: rnd() * 6.28, a: 0.3 + rnd() * 0.7 }));
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      let lf = 0;
      for (const w of waves) lf += w.a * Math.sin(((x * w.fx) / S) * 6.283 + ((y * w.fy) / S) * 6.283 + w.ph);
      lf /= 5;
      const v = (H[i] - 128) / 128; // lif yüksekliği
      const k = 1 + v * 0.34 + lf * 0.07;
      c[i] = Math.max(0, Math.min(255, 34 * k));
      c[i + 1] = Math.max(0, Math.min(255, 96 * k + lf * 4));
      c[i + 2] = Math.max(0, Math.min(255, 78 * k));
      c[i + 3] = 255;
    }
  cg.putImageData(cimg, 0, 0);

  // 3) normal haritası (Sobel)
  const nc = document.createElement('canvas');
  nc.width = nc.height = S;
  const ng = nc.getContext('2d');
  const nimg = ng.createImageData(S, S);
  const nd = nimg.data;
  const at = (x, y) => H[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  const strength = 2.4;
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

// Kadife/yün parlaklığı (sheen) olan çuha malzemesi; düşük kalitede sade standart malzeme
export function feltMaterial(hq = true) {
  const { map, normal } = feltTextures();
  if (!hq) return new THREE.MeshStandardMaterial({ map, normalMap: normal, normalScale: new THREE.Vector2(0.55, 0.55), roughness: 0.96, metalness: 0, color: 0xb2d4c8 });
  return new THREE.MeshPhysicalMaterial({
    map,
    normalMap: normal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughness: 0.92,
    metalness: 0,
    color: 0xb6d8cb,
    sheen: 1,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(0x5fbf9a),
  });
}
