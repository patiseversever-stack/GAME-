// Seslendirme klasörü eklentisi (vite.config.ts ve dev/vite-game.config.ts kullanır).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {packVoice} from './scripts/voice-pack.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const VOICE_SRC = path.join(ROOT, 'assets', 'voice');
/** Yalnız bunlar sunulur / kopyalanır: manifest + <karakter>/<kimlik>.mp3 (başka dosya sızmaz). */
const VOICE_FILE = /^(?:manifest\.json|[a-z]+\/[A-Za-z0-9_]+\.mp3)$/;

/**
 * Seslendirme dosyaları pakete GİRMEZ (tek dosya derlemesi ~15 MB mp3 ile şişmesin): oyun onları index.html'in yanındaki
 * göreli `voice/` klasöründen okur (src/ui/assets.ts → voiceManifestUrl).
 *  · derleme: assets/voice → <outDir>/voice/ (dist/voice, dist-tek/voice) — manifest + mp3'ler, olduğu kadar.
 *  · geliştirme: her sayfa yolunun altındaki /voice/… isteği assets/voice'tan sunulur (/, /dev/game.html …).
 *  · packed: true (tek dosya derlemesi / yayın önizlemesi): 925 dosya yerine karakter × grup paketleri
 *    (voice/manifest.json v2 + voice/packs/*.bin, ≤ 2,5 MB; scripts/voice-pack.mjs). Yayın sunucusu sürüm başına en çok
 *    511 dosya kabul ettiği için.
 * @param {{packed?: boolean}} [o]
 */
/** @returns {import('vite').Plugin} */
export function khVoice(o = {}) {
  let outDir = '';
  let build = false;
  return {
    name: 'kh-voice',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
      build = c.command === 'build';
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const u = (req.url ?? '').split(/[?#]/)[0];
        const i = u.lastIndexOf('/voice/');
        if (i < 0) return next();
        let rel = '';
        try {
          rel = decodeURIComponent(u.slice(i + 7));
        } catch {
          return next();
        }
        if (!VOICE_FILE.test(rel)) return next();
        const f = path.join(VOICE_SRC, rel);
        if (!f.startsWith(VOICE_SRC + path.sep) || !fs.existsSync(f)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader('Content-Type', rel.endsWith('.json') ? 'application/json' : 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(f).pipe(res);
      });
    },
    closeBundle() {
      // geliştirme sunucusu kapanırken / yeniden başlarken de çağrılır: yalnız derlemede kopyala
      if (!build || !outDir || !fs.existsSync(VOICE_SRC)) return;
      const dst = path.join(outDir, 'voice');
      if (o.packed) {
        if (!fs.existsSync(path.join(VOICE_SRC, 'manifest.json'))) return;
        const r = packVoice(VOICE_SRC, dst);
        console.log(`[kh-voice] voice/ (paketli) → ${path.relative(ROOT, dst)}/ (${r.files} dosya: ${r.packs} paket + manifest, ${(r.bytes / 1048576).toFixed(1)} MB, en büyük ${(r.biggest / 1048576).toFixed(2)} MB)`);
        return;
      }
      fs.rmSync(dst, {recursive: true, force: true});
      let n = 0, bytes = 0;
      const walk = (dir, rel) => {
        for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
          const r = rel ? `${rel}/${e.name}` : e.name;
          const src = path.join(dir, e.name);
          if (e.isDirectory()) {
            if (/^[a-z]+$/.test(e.name) && !rel) walk(src, r);
            continue;
          }
          if (!VOICE_FILE.test(r)) continue;
          const to = path.join(dst, r);
          fs.mkdirSync(path.dirname(to), {recursive: true});
          fs.copyFileSync(src, to);
          n++;
          bytes += fs.statSync(to).size;
        }
      };
      walk(VOICE_SRC, '');
      console.log(`[kh-voice] voice/ → ${path.relative(ROOT, dst)}/ (${n} dosya, ${(bytes / 1048576).toFixed(1)} MB)`);
    },
  };
}
