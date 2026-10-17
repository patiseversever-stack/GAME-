// Seslendirme PAKETLEME (yayın önizlemesi / tek dosya derlemesi için): 925 ayrı mp3 yerine karakter × grup başına birkaç
// büyük dosya. Her klip eksiksiz bir mp3'tür; paket = kliplerin uç uca eklenmesi, manifest her klibin bayt aralığını tutar:
//   voice/manifest.json   {v: 2, packs: {ad: {url, n, char, group}}, clips: {kimlik: {p: paket, o: bayt, n: uzunluk, dur, h, prio}}}
//   voice/packs/<karakter>-<grup>[-k].bin
// Gruplar (oyunun hangi anda neye ihtiyacı olduğuna göre):
//   pisti · blof    — masadaki botların oyun replikleri
//   bot             — botlar arası atışma (banter) + hızlı sohbete bot cevapları (qr_)
//   say             — oyuncunun KENDİ karakterinin hızlı sohbet söyleyişleri (qc_)
//   meta            — galeri tanıtımı + market (satış, alındı, eksik)
//   end             — el / maç sonu karşılıklı konuşma (Ara Skor, sonuç ekranı, rövanş kabulü, veda: <kar>_end…/mid…_<no>)
// Paylaşılan (takma ad) sesler her grubun paketine ayrıca konur: gruplar kendi içinde tam kalır.
// Paket en çok `maxPack` bayt (varsayılan 2,5 MB); aşan grup -1, -2… diye bölünür.
// Kullanım: node scripts/voice-pack.mjs <kaynak=assets/voice> <hedef=dist-tek/voice>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const META = new Set(['galleryIntro', 'shopPitch', 'shopBought', 'shopPoor']);
export const PACK_GROUPS = ['pisti', 'blof', 'bot', 'say', 'meta', 'end'];

/** Kimlikten grup (dialogue.ts kimlik biçimleri: <kar>_<an>_<no>, banter_…, qc_…, qr_…). */
export function packGroup(id) {
  if (id.startsWith('banter_') || id.startsWith('qr_')) return 'bot';
  if (id.startsWith('qc_')) return 'say';
  const m = /^[a-z]+_([A-Za-z]+)_\d+$/.exec(id);
  if (m && /^(?:end|mid)[A-Z]/.test(m[1])) return 'end';
  if (m && m[1].startsWith('blof')) return 'blof';
  if (m && META.has(m[1])) return 'meta';
  return 'pisti';
}

/**
 * Saf paketleme (dosya sistemi yok; testler de kullanır): manifest + dosya okuyucu → paketli manifest + paket baytları.
 * read(url) dosyanın baytlarını ya da yoksa null verir. Eksik dosyalı kayıtlar atlanır (o replik yalnız balon).
 * @param {Record<string, {url: string, dur?: number, h?: string, p?: number}>} man
 * @param {(url: string) => Uint8Array | null} read
 */
export function packManifest(man, read, {maxPack = 2.5 * 1048576} = {}) {
  const groups = new Map();
  const cache = new Map();
  const get = url => {
    if (!cache.has(url)) cache.set(url, read(url));
    return cache.get(url);
  };
  for (const id of Object.keys(man).sort()) {
    const e = man[id];
    if (!e || typeof e.url !== 'string' || !/^[a-z]+\/[A-Za-z0-9_]+\.mp3$/.test(e.url)) continue;
    const data = get(e.url);
    if (!data || !data.length) continue;
    const char = e.url.split('/')[0];
    const group = packGroup(id);
    const k = `${char}|${group}`;
    let g = groups.get(k);
    if (!g) groups.set(k, (g = {char, group, files: new Map(), ids: []}));
    if (!g.files.has(e.url)) g.files.set(e.url, data.length);
    g.ids.push([id, e]);
  }
  const out = {v: 2, packs: {}, clips: {}};
  const files = new Map();
  for (const g of [...groups.values()].sort((a, b) => (a.char + a.group).localeCompare(b.char + b.group))) {
    // dosyaları sırayla, eşit büyüklükte parçalara böl (her parça ≤ maxPack; tek dosya daha büyükse kendi başına)
    let total = 0;
    for (const n of g.files.values()) total += n;
    const count = Math.max(1, Math.ceil(total / maxPack));
    const target = Math.min(maxPack, total / count);
    const chunks = [];
    let cur = [], size = 0;
    for (const [url, n] of g.files) {
      const last = chunks.length >= count - 1; // son parça kalanı alır (sınırı aşmadıkça)
      if (cur.length && (size + n > maxPack || (!last && size + n / 2 > target))) {
        chunks.push(cur);
        cur = [];
        size = 0;
      }
      cur.push(url);
      size += n;
    }
    if (cur.length) chunks.push(cur);
    const where = new Map(); // url → {name, o, n}
    chunks.forEach((urls, i) => {
      const name = chunks.length > 1 ? `${g.char}-${g.group}-${i + 1}` : `${g.char}-${g.group}`;
      let n = 0;
      for (const u of urls) n += get(u).length;
      const buf = new Uint8Array(n);
      let o = 0;
      for (const u of urls) {
        const d = get(u);
        buf.set(d, o);
        where.set(u, {name, o, n: d.length});
        o += d.length;
      }
      files.set(name, buf);
      out.packs[name] = {url: `packs/${name}.bin`, n, char: g.char, group: g.group};
    });
    for (const [id, e] of g.ids) {
      const w = where.get(e.url);
      out.clips[id] = {p: w.name, o: w.o, n: w.n, dur: e.dur, h: e.h, prio: e.p};
    }
  }
  return {manifest: out, files};
}

/**
 * src (manifest.json + <kar>/<id>.mp3) → dst (paketli: manifest.json + packs/*.bin). dst baştan yazılır.
 * @returns {{packs: number, files: number, bytes: number, clips: number, biggest: number}}
 */
export function packVoice(src, dst, o = {}) {
  const man = JSON.parse(fs.readFileSync(path.join(src, 'manifest.json'), 'utf8'));
  const {manifest, files} = packManifest(man, url => {
    const f = path.join(src, url);
    return fs.existsSync(f) ? new Uint8Array(fs.readFileSync(f)) : null;
  }, o);
  fs.rmSync(dst, {recursive: true, force: true});
  fs.mkdirSync(path.join(dst, 'packs'), {recursive: true});
  let bytes = 0, biggest = 0;
  for (const [name, buf] of files) {
    fs.writeFileSync(path.join(dst, 'packs', name + '.bin'), buf);
    bytes += buf.length;
    biggest = Math.max(biggest, buf.length);
  }
  const json = JSON.stringify(manifest);
  fs.writeFileSync(path.join(dst, 'manifest.json'), json);
  return {packs: files.size, files: files.size + 1, bytes: bytes + json.length, clips: Object.keys(manifest.clips).length, biggest};
}

/** Klasör paketli mi (manifest v2)? */
export function isPacked(dir) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    return !!(m && m.v === 2 && m.packs && m.clips);
  } catch {
    return false;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , src = 'assets/voice', dst = 'dist-tek/voice'] = process.argv;
  const r = packVoice(src, dst);
  console.log(`paketlendi: ${dst}/ — ${r.files} dosya (${r.packs} paket + manifest), ${(r.bytes / 1048576).toFixed(1)} MB, ${r.clips} replik, en büyük paket ${(r.biggest / 1048576).toFixed(2)} MB`);
}
