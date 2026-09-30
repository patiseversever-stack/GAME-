// Remotion filmlerini render eder (Node API: bundle + renderMedia).
//   node scripts/render-film.mjs oyun   → oyuna gömülecek H.264 dosyaları (yatay/dikey × giriş-döngü/çıkış) + meta
//   node scripts/render-film.mjs test   → aynı dosyaların VP9/WebM sürümü (tescilli codec içermeyen test tarayıcıları için)
//   node scripts/render-film.mjs film   → 15 sn önizleme filmleri (docs/)
//   node scripts/render-film.mjs poster → oynatma engellenirse gösterilecek durağan kareler
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const what = process.argv[2] || 'oyun';
const browserExecutable = process.env.GP_BROWSER || null;
const out = p => path.join(root, p);
fs.mkdirSync(out('game/media'), { recursive: true });
fs.mkdirSync(out('docs/film'), { recursive: true });

console.log('paketleniyor…');
const serveUrl = await bundle({ entryPoint: out('remotion/index.ts'), publicDir: out('remotion/public') });

const x264 = ({ type, args }) => {
  // -tune animation: düz renk alanları ve keskin tipografi için; faststart: dosya başından hemen oynasın
  if (type !== 'stitcher') return args;
  const o = args.pop();
  return [...args, '-tune', 'animation', '-movflags', '+faststart', o];
};

async function render(id, file, { codec = 'h264', crf = 20, gop = 30 } = {}) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  const t0 = Date.now();
  await renderMedia({
    composition, serveUrl, codec, crf, outputLocation: file, muted: true, browserExecutable,
    imageFormat: 'jpeg', jpegQuality: 96, concurrency: 4, pixelFormat: 'yuv420p', gopSize: gop,
    x264Preset: codec === 'h264' ? 'slow' : undefined, ffmpegOverride: codec === 'h264' ? x264 : undefined,
    onProgress: ({ progress }) => { if (Math.round(progress * 100) % 25 === 0) process.stdout.write(`\r${id} %${Math.round(progress * 100)}   `); },
  });
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`\r✓ ${path.relative(root, file)}  ${kb} KB  (${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
}

// Videodaki son (çıkış) karede sayfanın dört köşesi — oyun bu dörtgeni gerçek 3B sayfaya eşler.
// remotion/lib/stage.ts final pozu + components/PagePlane.tsx CSS 3B zinciri ile aynı hesap.
function finalQuad(W, H) {
  const land = W >= H, P = (H / 2) / Math.tan((16 * Math.PI) / 180);
  const f = land ? { cx: W * 0.5, cy: H * 0.52, w: W * 0.685, rx: 15, rz: 0.3, s: 1 } : { cx: W * 0.5, cy: H * 0.515, w: W * 0.76, rx: 15, rz: 0.3, s: 1 };
  const h = f.w * 1160 / 1800, a = f.rx * Math.PI / 180, b = f.rz * Math.PI / 180;
  return [[0, 0], [f.w, 0], [f.w, h], [0, h]].map(([x, y]) => {
    let px = (x - f.w / 2) * f.s, py = (y - h / 2) * f.s;
    const zx = px * Math.cos(b) - py * Math.sin(b), zy = px * Math.sin(b) + py * Math.cos(b);
    const ry = zy * Math.cos(a), rz = zy * Math.sin(a), k = P / (P - rz);
    return { x: +(f.cx + zx * k).toFixed(2), y: +(f.cy + ry * k).toFixed(2) };
  });
}

if (what === 'oyun' || what === 'test') {
  const vp9 = what === 'test', ext = vp9 ? 'webm' : 'mp4', opt = vp9 ? { codec: 'vp9', crf: 32 } : { codec: 'h264', crf: 21 };
  await render('Oyun-Yatay-GirisDongu', out(`game/media/yatay-giris-dongu.${ext}`), opt);
  await render('Oyun-Yatay-Cikis', out(`game/media/yatay-cikis.${ext}`), opt);
  await render('Oyun-Dikey-GirisDongu', out(`game/media/dikey-giris-dongu.${ext}`), opt);
  await render('Oyun-Dikey-Cikis', out(`game/media/dikey-cikis.${ext}`), opt);
  const meta = {
    fps: 30, giris: 162, dongu: 120, donguSayisi: 2, cikis: 48,
    yatay: { w: 1920, h: 1080, finalQuad: finalQuad(1920, 1080) },
    dikey: { w: 1080, h: 1920, finalQuad: finalQuad(1080, 1920) },
  };
  fs.writeFileSync(out('game/media/film-meta.json'), JSON.stringify(meta, null, 1));
  console.log('meta:', JSON.stringify(meta));
}
if (what === 'film') {
  await render('GecePostasi-Yatay', out('docs/film/gece-postasi-yukleme-yatay.mp4'), { codec: 'h264', crf: 19 });
  await render('GecePostasi-Dikey', out('docs/film/gece-postasi-yukleme-dikey.mp4'), { codec: 'h264', crf: 19 });
}
if (what === 'poster') {
  for (const [id, name, frame] of [['Oyun-Yatay-GirisDongu', 'yatay', 162], ['Oyun-Dikey-GirisDongu', 'dikey', 162]]) {
    const composition = await selectComposition({ serveUrl, id, browserExecutable });
    await renderStill({ composition, serveUrl, output: out(`game/media/${name}-poster.jpg`), frame, imageFormat: 'jpeg', jpegQuality: 82, browserExecutable, scale: 0.5 });
    console.log('✓ poster', name, Math.round(fs.statSync(out(`game/media/${name}-poster.jpg`)).size / 1024), 'KB');
  }
}
