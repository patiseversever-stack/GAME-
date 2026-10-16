#!/usr/bin/env node
/**
 * Kahvehane Pişti — ElevenLabs seslendirme üretici (Node 22.18+, ek paket yok).
 *
 * Tek kaynak: src/ai/dialogue.ts. Node 22 bu dosyayı tip ayıklamayla doğrudan import eder; her çalıştırmada
 * tools/voice/lines.json dışa aktarımı da yazılır (inceleme için; elle düzenlenmez).
 *
 * Komutlar (game/ klasöründen):
 *   node tools/voice/generate.mjs --dry                      Ne üretileceğini + tahmini karakter (kredi) sayısını yazar. Anahtar gerekmez.
 *   node tools/voice/generate.mjs --design [--char riza]     voice_id'si boş karakterler için Voice Design önizlemeleri üretir
 *                                                            → tools/voice/previews/<char>/<n>.mp3 (dinleyip seçin)
 *   node tools/voice/generate.mjs --pick riza=2              Seçilen önizlemeden kalıcı ses oluşturur, voice_id'yi voices.json'a yazar
 *   node tools/voice/generate.mjs --design --auto            Tasarla ve ilk önizlemeyi otomatik seç
 *   node tools/voice/generate.mjs                            Eksik replikleri üretir → normalize eder → manifest yazar
 *   node tools/voice/generate.mjs --char riza --only riza_botPisti_1 --force   Tek repliği yeniden üret
 *   node tools/voice/generate.mjs --stale                    Metni değişmiş replikleri yeniden üret
 *   node tools/voice/generate.mjs --v2                       Yedek model eleven_multilingual_v2 (ses etiketleri metinden silinir)
 *   node tools/voice/generate.mjs --renorm | --manifest      Ağsız: ham dosyalardan yeniden normalize et | yalnız manifest yaz
 *
 * ElevenLabs uç noktaları:
 *   POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128   {text, model_id, voice_settings, seed, language_code?}
 *   POST /v1/text-to-voice/design?output_format=mp3_44100_128        {voice_description, model_id: eleven_ttv_v3, text} → previews[]
 *   POST /v1/text-to-voice                                           {voice_name, voice_description, generated_voice_id} → voice_id
 *   GET  /v1/history?voice_id=…  ve  GET /v1/history/{id}/audio      (belirsiz hatadan sonra ücretli çıktıyı kurtarmak için)
 *
 * Anahtar YALNIZCA process.env.ELEVENLABS_API_KEY'den okunur, asla yazdırılmaz/dosyaya yazılmaz.
 *
 * Ağ / vekil sunucu: Bu sandbox'ta dış HTTPS bir vekilden geçer (HTTPS_PROXY). Node'un fetch'i bunu ancak
 *   NODE_USE_ENV_PROXY=1 ile kullanır ve vekilin sertifikasına NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt ile güvenir.
 *   HTTPS_PROXY tanımlıyken betik kendini bu değişkenlerle otomatik yeniden başlatır; elle:
 *     NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node tools/voice/generate.mjs
 *
 * Tekrar deneme kuralı: 429 (açık ret) → bekleyip tekrar. Ağ hatası / zaman aşımı / 5xx / yarım gövde "belirsiz"dir
 *   (istek başarılı olup ücretlendirilmiş olabilir): tekrar denemeden ÖNCE çıktı dosyası, sonra ElevenLabs geçmişi
 *   kontrol edilir; orada bulunursa yeniden üretilmez, indirilir. Dosyalar önce .part'a yazılıp atomik taşınır.
 *
 * Çıktı: ham → tools/voice/.raw/<char>/<id>.mp3 (git dışı; yeniden normalize için saklanır)
 *        son → assets/voice/<char>/<id>.mp3 (mono, 64 kbps, ~-16 LUFS, tepe -1.5 dBTP, baş/son sessizlik kırpılmış)
 *        manifest → assets/voice/manifest.json  {id: {url: "<char>/<id>.mp3", dur, h, p}}
 *                   (h = ttsHash: metin değişimi takibi; p = momentPriority: oynatıcının varsayılan önceliği)
 */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const HERE = path.dirname(SELF);
const GAME = path.resolve(HERE, '..', '..');
const DIALOGUE_TS = path.join(GAME, 'src', 'ai', 'dialogue.ts');
const VOICES_JSON = path.join(HERE, 'voices.json');
const LINES_JSON = path.join(HERE, 'lines.json');
const RAW_DIR = path.join(HERE, '.raw');
const PREVIEW_DIR = path.join(HERE, 'previews');
const OUT_DIR = path.join(GAME, 'assets', 'voice');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const CA_BUNDLE = '/root/.ccr/ca-bundle.crt';

const API = (process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io').replace(/\/+$/, ''); // test için değiştirilebilir
const RAW_FORMAT = 'mp3_44100_128';
const LOUD = {I: -16, TP: -1.5, LRA: 11};
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const MAX_ATTEMPTS = 5;
const MIN_GAP_MS = 350; // iki istek başlangıcı arası en az

// ───────────────────────── küçük yardımcılar ─────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rel = p => path.relative(GAME, p) || '.';

function safe(s) {
  const k = process.env.ELEVENLABS_API_KEY;
  let t = String(s ?? '');
  if (k && k.length > 4) t = t.split(k).join('***');
  return t.length > 400 ? t.slice(0, 400) + '…' : t;
}

function log(...a) {
  console.log(...a.map(safe));
}

function warn(...a) {
  console.warn('⚠', ...a.map(safe));
}

function die(msg) {
  console.error('✖', safe(msg));
  process.exit(1);
}

function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const tmp = `${file}.${process.pid}.part`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

function writeJson(file, obj) {
  writeAtomic(file, JSON.stringify(obj, null, 2) + '\n');
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const backoff = attempt => Math.min(60_000, 2000 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 500);

// ───────────────────────── argümanlar ─────────────────────────

function parseArgs(argv) {
  const a = {
    dry: false, design: false, auto: false, pick: [], chars: null, only: null, force: false, stale: false,
    model: null, designModel: null, concurrency: 2, manifestOnly: false, renorm: false, help: false,
  };
  const list = v => v.split(',').map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    let t = argv[i];
    let inline;
    if (t.startsWith('--') && t.includes('=') && !t.startsWith('--pick=')) [t, inline] = [t.slice(0, t.indexOf('=')), t.slice(t.indexOf('=') + 1)];
    if (t.startsWith('--pick=')) [t, inline] = ['--pick', t.slice(7)];
    const val = () => {
      if (inline !== undefined) return inline;
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) die(`${t} bir değer ister`);
      return v;
    };
    switch (t) {
      case '--dry': case '--dry-run': a.dry = true; break;
      case '--design': a.design = true; break;
      case '--auto': a.auto = true; break;
      case '--pick': a.pick.push(...list(val())); break;
      case '--char': case '--chars': a.chars = list(val()); break;
      case '--only': a.only = list(val()); break;
      case '--force': a.force = true; break;
      case '--stale': a.stale = true; break;
      case '--model': a.model = val(); break;
      case '--v2': a.model = 'eleven_multilingual_v2'; break;
      case '--design-model': a.designModel = val(); break;
      case '--concurrency': a.concurrency = Math.max(1, Math.min(8, Number(val()) || 2)); break;
      case '--manifest': a.manifestOnly = true; break;
      case '--renorm': a.renorm = true; break;
      case '-h': case '--help': a.help = true; break;
      default: die(`Bilinmeyen seçenek: ${argv[i]} (--help)`);
    }
  }
  return a;
}

function help() {
  const src = fs.readFileSync(SELF, 'utf8');
  const m = src.match(/\/\*\*([\s\S]*?)\*\//);
  console.log((m ? m[1] : '').replace(/^ \* ?/gm, ''));
}

// ───────────────────────── ağ ─────────────────────────

/** HTTPS_PROXY varsa Node fetch'inin vekili kullanması için kendini doğru ortamla yeniden başlat. */
function ensureProxyEnv() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy || process.env.NODE_USE_ENV_PROXY === '1' || process.env.KH_VOICE_CHILD) return;
  const env = {...process.env, NODE_USE_ENV_PROXY: '1', KH_VOICE_CHILD: '1'};
  if (!env.NODE_EXTRA_CA_CERTS && fs.existsSync(CA_BUNDLE)) env.NODE_EXTRA_CA_CERTS = CA_BUNDLE;
  const r = spawnSync(
    process.execPath,
    ['--disable-warning=ExperimentalWarning', '--disable-warning=UNDICI-EHPA', SELF, ...process.argv.slice(2)],
    {stdio: 'inherit', env},
  );
  process.exit(r.status ?? 1);
}

function apiKey() {
  const k = (process.env.ELEVENLABS_API_KEY || '').trim();
  // Ortamın "ağ gizli anahtarı" vekilde xi-api-key başlığını kendisi ekliyorsa anahtar sürece hiç gelmez.
  if (!k && process.env.ELEVENLABS_VIA_PROXY === '1') return '';
  if (!k) die('ELEVENLABS_API_KEY ortam değişkeni yok. Anahtarı sohbete yazmayın; ortam ayarlarına (secret) ekleyin. Bkz. tools/voice/README.md');
  return k;
}

async function http(method, pathname, {json, timeoutMs = 90_000, accept} = {}) {
  const key = apiKey();
  const headers = key ? {'xi-api-key': key} : {};
  if (json !== undefined) headers['content-type'] = 'application/json';
  if (accept) headers.accept = accept;
  return fetch(API + pathname, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function bodyText(res) {
  try {
    return safe(await res.text());
  } catch {
    return '';
  }
}

// istek aralığı + 429 sonrası ortak bekleme
let pauseUntil = 0;
let nextSlot = 0;
async function slot() {
  for (;;) {
    const now = Date.now();
    const wait = Math.max(pauseUntil, nextSlot) - now;
    if (wait <= 0) {
      nextSlot = now + MIN_GAP_MS;
      return;
    }
    await sleep(wait);
  }
}

// ───────────────────────── veri ─────────────────────────

async function loadLines() {
  let D;
  try {
    D = await import(pathToFileURL(DIALOGUE_TS).href);
  } catch (e) {
    die(`src/ai/dialogue.ts okunamadı. Node 22.18+ gerekir (daha eskisinde: node --experimental-strip-types …). Hata: ${e?.message ?? e}`);
  }
  const lines = D.allLines().map(l => ({
    id: l.id, char: l.char, moment: l.moment, text: l.text, tts: l.tts, mood: l.mood ?? null, weight: l.weight ?? 1,
    hash: D.ttsHash(l.tts), prio: D.momentPriority(l.moment),
  }));
  writeJson(LINES_JSON, {_note: 'Üretilmiş dosya — kaynak: src/ai/dialogue.ts. Elle düzenlemeyin.', count: lines.length, lines});
  return {lines, stripTags: D.stripTags};
}

const readVoices = () => {
  const v = readJson(VOICES_JSON, null);
  if (!v || !v.characters) die(`${rel(VOICES_JSON)} okunamadı`);
  return v;
};
const rawPath = l => path.join(RAW_DIR, l.char, `${l.id}.mp3`);
const finalPath = l => path.join(OUT_DIR, l.char, `${l.id}.mp3`);
const creditsPerChar = model => (/flash|turbo/.test(model) ? 0.5 : 1);

function selectLines(lines, a) {
  let out = lines;
  if (a.chars) {
    const bad = a.chars.filter(c => !lines.some(l => l.char === c));
    if (bad.length) die(`Bilinmeyen karakter: ${bad.join(', ')}`);
    out = out.filter(l => a.chars.includes(l.char));
  }
  if (a.only) {
    const bad = a.only.filter(id => !lines.some(l => l.id === id));
    if (bad.length) die(`Bilinmeyen replik: ${bad.join(', ')}`);
    out = out.filter(l => a.only.includes(l.id));
  }
  return out;
}

/** Her replik için durum: var mı, ham var mı, metni değişmiş mi, üretilecek mi. */
function plan(lines, a, manifest) {
  return lines.map(l => {
    const hasFinal = fs.existsSync(finalPath(l));
    const hasRaw = fs.existsSync(rawPath(l));
    const old = manifest[l.id];
    const stale = hasFinal && !!old?.h && old.h !== l.hash;
    const force = a.force || (a.stale && stale);
    return {line: l, hasFinal, hasRaw, stale, force, synth: force || (!hasFinal && !hasRaw)};
  });
}

// ───────────────────────── TTS ─────────────────────────

function ttsRequest(l, voice, model, stripTags) {
  const v3 = model === 'eleven_v3';
  const s = voice.settings || {};
  const text = v3 ? l.tts : stripTags(l.tts); // v2 etiketleri sesli okur → sil
  const st = Number(s.stability ?? 0.5);
  const body = {text, model_id: model, seed: fnv(l.id)};
  body.voice_settings = v3
    ? {stability: st < 0.25 ? 0 : st > 0.75 ? 1 : 0.5} // v3: 0 Creative, 0.5 Natural, 1 Robust
    : {stability: st, similarity_boost: s.similarity_boost ?? 0.8, style: s.style ?? 0.3, use_speaker_boost: s.use_speaker_boost ?? true};
  return {text, body};
}

/** Belirsiz bir hatadan sonra: aynı metin bu ses + model ile az önce üretildiyse geçmişten indir (yeniden ücret yok). */
async function recoverFromHistory(voiceId, text, model, sinceUnix) {
  try {
    await sleep(4000); // geçmiş kaydı birkaç sn gecikebilir
    const r = await http('GET', `/v1/history?page_size=100&voice_id=${encodeURIComponent(voiceId)}`, {timeoutMs: 30_000});
    if (!r.ok) return null;
    const j = await r.json();
    const item = (j.history || []).find(
      h => h.text === text && (h.date_unix ?? 0) >= sinceUnix - 120 && (!h.model_id || h.model_id === model),
    );
    if (!item) return null;
    const a = await http('GET', `/v1/history/${encodeURIComponent(item.history_item_id)}/audio`, {timeoutMs: 60_000});
    if (!a.ok) return null;
    const buf = Buffer.from(await a.arrayBuffer());
    return buf.length > 512 ? buf : null;
  } catch {
    return null;
  }
}

async function synth(job, g) {
  const l = job.line;
  const raw = rawPath(l);
  // zorla üretimde eski ham dosya kenara alındı; yalnızca yeni ham dosya "bitti" sayılır
  const done = () => fs.existsSync(raw) || (!job.force && fs.existsSync(finalPath(l)));
  const {text, body} = ttsRequest(l, job.voice, g.model, g.stripTags);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (g.fatal) return {status: 'skipped'};
    if (done()) return {status: 'exists'};
    await slot();
    const sinceUnix = Math.floor(Date.now() / 1000);
    const req = {...body};
    if (g.lang && g.model === 'eleven_v3') req.language_code = 'tr';
    let res = null;
    let ambiguous = false;
    let why = '';
    try {
      res = await http('POST', `/v1/text-to-speech/${encodeURIComponent(job.voiceId)}?output_format=${RAW_FORMAT}`, {json: req, accept: 'audio/mpeg', timeoutMs: 120_000});
    } catch (e) {
      ambiguous = true;
      why = e?.name === 'TimeoutError' ? 'zaman aşımı' : `ağ hatası: ${e?.cause?.code || e?.message || e}`;
    }
    if (res && res.ok) {
      try {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 512) throw new Error(`çok küçük yanıt (${buf.length} B)`);
        writeAtomic(raw, buf);
        return {status: 'ok', chars: text.length};
      } catch (e) {
        ambiguous = true; // gövde yarıda kaldı: sunucu üretmiş (ücret almış) olabilir
        why = `yanıt okunamadı: ${e?.message || e}`;
      }
    } else if (res) {
      const status = res.status;
      const detail = await bodyText(res);
      if (status === 401 || status === 403) {
        g.fatal = `Yetki hatası (${status}). Anahtarı / izinleri kontrol edin. ${detail}`;
        return {status: 'failed', error: g.fatal};
      }
      if (status === 429) {
        if (/quota_exceeded|insufficient|credits/i.test(detail)) {
          g.fatal = `Kredi yetersiz (429): ${detail}`;
          return {status: 'failed', error: g.fatal};
        }
        const ra = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : backoff(attempt);
        pauseUntil = Math.max(pauseUntil, Date.now() + wait);
        log(`  … ${l.id}: 429 hız sınırı, ${Math.round(wait / 1000)} sn bekleniyor`);
        continue; // açık ret: ücret yok, güvenle tekrar
      }
      if (status >= 500) {
        ambiguous = true;
        why = `sunucu ${status}: ${detail}`;
      } else {
        if (g.lang && /language/i.test(detail)) {
          g.lang = false; // bu model language_code kabul etmiyor: kapat ve (ücretsiz ret olduğu için) tekrar dene
          warn('language_code=tr reddedildi; dil kodu olmadan devam ediliyor');
          attempt--;
          continue;
        }
        return {status: 'failed', error: `${status}: ${detail}`};
      }
    }
    if (ambiguous) {
      // ÖNCE çıktıyı kontrol et: istek başarılı olmuş olabilir
      if (done()) return {status: 'exists'};
      log(`  … ${l.id}: ${why} — geçmiş kontrol ediliyor`);
      const rec = await recoverFromHistory(job.voiceId, text, g.model, sinceUnix);
      if (rec) {
        writeAtomic(raw, rec);
        return {status: 'recovered', chars: text.length};
      }
      if (done()) return {status: 'exists'};
      if (attempt < MAX_ATTEMPTS) await sleep(backoff(attempt));
    }
  }
  return {status: 'failed', error: 'deneme sınırı aşıldı'};
}

// ───────────────────────── ffmpeg ─────────────────────────

const TRIM = [
  'aformat=channel_layouts=mono',
  'silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB:start_silence=0.03',
  'areverse',
  'silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB:start_silence=0.08',
  'afade=t=in:d=0.04', // ters çevrilmişken baştaki solma = sondaki solma
  'areverse',
  'afade=t=in:d=0.006',
].join(',');

function checkFfmpeg() {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-version'], {encoding: 'utf8'});
  if (r.status !== 0) die(`ffmpeg bulunamadı (${FFMPEG}). FFMPEG ortam değişkeniyle yol verin.`);
}

function measure(src) {
  const r = spawnSync(
    FFMPEG,
    ['-hide_banner', '-nostdin', '-i', src, '-af', `${TRIM},loudnorm=I=${LOUD.I}:TP=${LOUD.TP}:LRA=${LOUD.LRA}:print_format=json`, '-f', 'null', '-'],
    {encoding: 'utf8'},
  );
  const s = r.stderr || '';
  const i = s.lastIndexOf('{');
  const j = s.lastIndexOf('}');
  if (r.status !== 0 || i < 0 || j < i) return null;
  try {
    const m = JSON.parse(s.slice(i, j + 1));
    const I = parseFloat(m.input_i);
    if (!Number.isFinite(I) || I < -60) return null; // çok kısa / sessiz: tek geçişli moda düş
    return m;
  } catch {
    return null;
  }
}

function normalize(src, dst) {
  const m = measure(src);
  let ln = `loudnorm=I=${LOUD.I}:TP=${LOUD.TP}:LRA=${LOUD.LRA}`;
  if (m) {
    ln += `:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}`;
    ln += `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  }
  fs.mkdirSync(path.dirname(dst), {recursive: true});
  const tmp = `${dst}.${process.pid}.part.mp3`;
  const r = spawnSync(
    FFMPEG,
    ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y', '-i', src, '-af', `${TRIM},${ln},aresample=44100`,
      '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', tmp],
    {encoding: 'utf8'},
  );
  if (r.status !== 0 || !fs.existsSync(tmp)) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* yoksay */
    }
    throw new Error(`ffmpeg: ${(r.stderr || '').trim().split('\n').pop()}`);
  }
  fs.renameSync(tmp, dst);
}

function duration(file) {
  const r = spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], {encoding: 'utf8'});
  const d = parseFloat(r.stdout);
  return Number.isFinite(d) ? Math.round(d * 100) / 100 : 0;
}

// ───────────────────────── manifest ─────────────────────────

function writeManifest(allLines, fresh) {
  const old = readJson(MANIFEST, {});
  const out = {};
  let n = 0;
  for (const l of [...allLines].sort((a, b) => a.id.localeCompare(b.id))) {
    const f = finalPath(l);
    if (!fs.existsSync(f)) continue;
    const h = fresh.has(l.id) ? l.hash : old[l.id]?.h ?? l.hash;
    out[l.id] = {url: `${l.char}/${l.id}.mp3`, dur: duration(f), h, p: l.prio};
    n++;
  }
  const orphans = Object.keys(old).filter(id => !allLines.some(l => l.id === id));
  if (orphans.length) warn(`dialogue.ts'de artık olmayan ${orphans.length} ses manifestten çıkarıldı (dosyalar duruyor): ${orphans.join(', ')}`);
  writeJson(MANIFEST, out);
  log(`manifest: ${rel(MANIFEST)} (${n} replik)`);
}

// ───────────────────────── komutlar ─────────────────────────

function dry(rows, voices, model, allLines) {
  const byChar = new Map();
  for (const r of rows) {
    const c = byChar.get(r.line.char) ?? {total: 0, done: 0, stale: 0, todo: [], chars: 0};
    c.total++;
    if (r.hasFinal) c.done++;
    if (r.stale) c.stale++;
    if (r.synth) {
      c.todo.push(r);
      c.chars += (model === 'eleven_v3' ? r.line.tts : stripTagsLocal(r.line.tts)).length;
    }
    byChar.set(r.line.char, c);
  }
  log(`Model: ${model}  ·  toplam replik: ${allLines.length}\n`);
  let sum = 0;
  let todo = 0;
  for (const [char, c] of byChar) {
    const vid = voices.characters[char]?.voice_id;
    log(`■ ${char}: ${c.total} replik · hazır ${c.done} · metni değişmiş ${c.stale} · üretilecek ${c.todo.length} (${c.chars} karakter) · voice_id: ${vid ? 'var' : 'YOK → önce --design'}`);
    for (const r of c.todo) log(`   ${r.force ? '↻' : '+'} ${r.line.id.padEnd(30)} ${r.line.tts}`);
    sum += c.chars;
    todo += c.todo.length;
  }
  const cost = Math.round(sum * creditsPerChar(model));
  log(`\nÜretilecek: ${todo} replik · ${sum} karakter · tahmini ≈ ${cost} kredi (${model}: ${creditsPerChar(model)} kredi/karakter; ses etiketleri de sayılır).`);
  const stale = rows.filter(r => r.stale && !r.force).length;
  if (stale) log(`Not: ${stale} replik metni değişmiş ama sesi eski; yeniden üretmek için --stale.`);
}

function stripTagsLocal(s) {
  return s.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').replace(/\s+([!?.,…])/g, '$1').trim();
}

async function designVoices(a, voices) {
  const model = a.designModel || voices.designModel || 'eleven_ttv_v3';
  const ids = a.chars ?? Object.keys(voices.characters);
  for (const id of ids) {
    const c = voices.characters[id];
    if (!c) die(`voices.json'da karakter yok: ${id}`);
    if (c.voice_id && !a.force) {
      log(`■ ${id}: voice_id zaten var, atlanıyor (yeniden tasarım için --force)`);
      continue;
    }
    if ((c.previewText || '').length < 100) warn(`${id}: previewText 100 karakterden kısa; API reddedebilir`);
    log(`■ ${id}: Voice Design (${model}) …`);
    let res;
    try {
      res = await http('POST', `/v1/text-to-voice/design?output_format=${RAW_FORMAT}`, {
        json: {voice_description: c.designPrompt, model_id: model, text: c.previewText},
        timeoutMs: 180_000,
      });
    } catch (e) {
      // tasarım isteği otomatik tekrarlanmaz (ücretlendirilmiş olabilir); kullanıcı yeniden çalıştırır
      warn(`${id}: ağ hatası (${e?.cause?.code || e?.message}); tekrar denemek için komutu yeniden çalıştırın`);
      continue;
    }
    if (!res.ok) {
      warn(`${id}: ${res.status} ${await bodyText(res)}`);
      if (res.status === 401 || res.status === 403) process.exit(1);
      continue;
    }
    const j = await res.json();
    const dir = path.join(PREVIEW_DIR, id);
    c.previews = (j.previews || []).map((p, i) => {
      const f = path.join(dir, `${i + 1}.mp3`);
      writeAtomic(f, Buffer.from(p.audio_base_64 || '', 'base64'));
      return {n: i + 1, generated_voice_id: p.generated_voice_id, file: path.relative(HERE, f)};
    });
    writeJson(VOICES_JSON, voices);
    for (const p of c.previews) log(`   ${p.n}: ${rel(path.join(HERE, p.file))}`);
    if (!c.previews.length) warn(`${id}: önizleme dönmedi`);
    else if (a.auto) await createVoice(id, c, c.previews[0], voices);
    else log(`   Dinleyin ve seçin: node tools/voice/generate.mjs --pick ${id}=1`);
  }
}

async function createVoice(id, c, preview, voices) {
  const res = await http('POST', '/v1/text-to-voice', {
    json: {voice_name: `Kahvehane ${c.name}`, voice_description: String(c.designPrompt).slice(0, 1000), generated_voice_id: preview.generated_voice_id},
    timeoutMs: 120_000,
  });
  if (!res.ok) {
    warn(`${id}: ses oluşturulamadı ${res.status} ${await bodyText(res)} (önizleme kimlikleri bir süre sonra geçersizleşir; gerekirse --design --force)`);
    return;
  }
  const j = await res.json();
  c.voice_id = j.voice_id;
  writeJson(VOICES_JSON, voices);
  log(`   ✓ ${id}: voice_id kaydedildi (önizleme ${preview.n})`);
}

async function pickVoices(specs, voices) {
  for (const s of specs) {
    const [id, which] = s.split('=');
    const c = voices.characters[id];
    if (!c) die(`voices.json'da karakter yok: ${id}`);
    const p = (c.previews || []).find(p => String(p.n) === which || p.generated_voice_id === which);
    if (!p) die(`${id}: önizleme bulunamadı (${which}). Önce --design çalıştırın.`);
    await createVoice(id, c, p, voices);
  }
}

async function generate(a, rows, voices, allLines, stripTags) {
  const model = a.model || voices.model || 'eleven_v3';
  const g = {model, stripTags, lang: model === 'eleven_v3', fatal: ''};
  const jobs = [];
  const missingVoice = new Set();
  for (const r of rows.filter(r => r.synth)) {
    const v = voices.characters[r.line.char];
    if (!v?.voice_id) {
      missingVoice.add(r.line.char);
      continue;
    }
    jobs.push({...r, voice: v, voiceId: v.voice_id});
  }
  if (missingVoice.size) warn(`voice_id yok, atlandı: ${[...missingVoice].join(', ')} → önce --design / --pick ya da voices.json'a kimlik yazın`);

  // zorla üretimde eski ham dosyayı kenara al (yenisi gelmezse geri koymak için .bak)
  for (const j of jobs) {
    if (!j.force) continue;
    const raw = rawPath(j.line);
    if (fs.existsSync(raw)) fs.renameSync(raw, `${raw}.bak`);
  }

  const fresh = new Set();
  const stats = {ok: 0, recovered: 0, exists: 0, failed: 0, skipped: 0, chars: 0};
  if (jobs.length) {
    log(`Üretiliyor: ${jobs.length} replik · model ${model} · eşzamanlı ${a.concurrency}`);
    let k = 0;
    const worker = async () => {
      while (k < jobs.length) {
        const j = jobs[k++];
        const r = await synth(j, g);
        stats[r.status] = (stats[r.status] ?? 0) + 1;
        stats.chars += r.chars ?? 0;
        if (r.status === 'ok' || r.status === 'recovered') fresh.add(j.line.id);
        const mark = {ok: '✓', recovered: '✓ (geçmişten)', exists: '=', failed: '✖', skipped: '-'}[r.status];
        log(`  ${mark} ${j.line.id}${r.error ? '  ' + r.error : ''}`);
      }
    };
    await Promise.all(Array.from({length: Math.min(a.concurrency, jobs.length)}, worker));
    for (const j of jobs) {
      const raw = rawPath(j.line);
      if (j.force && !fs.existsSync(raw) && fs.existsSync(`${raw}.bak`)) fs.renameSync(`${raw}.bak`, raw);
      else if (fs.existsSync(`${raw}.bak`)) fs.unlinkSync(`${raw}.bak`);
    }
  } else log('Üretilecek yeni replik yok.');

  normalizeRows(rows, a, fresh);
  writeManifest(allLines, fresh);
  log(`\nÖzet: üretildi ${stats.ok} · geçmişten kurtarıldı ${stats.recovered} · zaten vardı ${stats.exists} · hata ${stats.failed} · ${stats.chars} karakter`);
  if (g.fatal) die(g.fatal);
  if (stats.failed) process.exitCode = 2;
}

function normalizeRows(rows, a, fresh) {
  checkFfmpeg();
  let n = 0;
  for (const r of rows) {
    const raw = rawPath(r.line);
    const fin = finalPath(r.line);
    if (!fs.existsSync(raw)) continue;
    if (fs.existsSync(fin) && !a.renorm && !fresh.has(r.line.id)) continue;
    try {
      normalize(raw, fin);
      n++;
    } catch (e) {
      warn(`${r.line.id}: ${e.message}`);
    }
  }
  if (n) log(`normalize: ${n} dosya → ${rel(OUT_DIR)}`);
}

// ───────────────────────── giriş ─────────────────────────

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) return help();
  const offline = a.dry || a.manifestOnly || a.renorm;
  if (!offline) ensureProxyEnv();

  const {lines: allLines, stripTags} = await loadLines();
  const voices = readVoices();
  const model = a.model || voices.model || 'eleven_v3';
  const manifest = readJson(MANIFEST, {});
  const rows = plan(selectLines(allLines, a), a, manifest);

  if (a.dry) return dry(rows, voices, model, allLines);
  if (a.manifestOnly) return writeManifest(allLines, new Set());
  if (a.renorm) {
    normalizeRows(rows, a, new Set());
    return writeManifest(allLines, new Set());
  }
  apiKey(); // erken ve net hata
  if (a.pick.length) return pickVoices(a.pick, voices);
  if (a.design) return designVoices(a, voices);
  return generate(a, rows, voices, allLines, stripTags);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  main().catch(e => die(e?.stack || e));
}

export {normalize, measure, duration, TRIM};
