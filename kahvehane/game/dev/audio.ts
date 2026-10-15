// Ses deneme sayfası: elle dinleme düğmeleri + otomatik ölçüm modu (?auto=1).
// Otomatik modda her ses OfflineAudioContext ile işlenir; tepe / RMS / süre / tayf merkezi konsola yazılır.
import {renderSfxOffline, Sfx, type SfxStats} from '../src/audio/sfx';

interface SoundDef {
  id: string;
  label: string;
  hint?: string;
  group: string;
  /** çevrimdışı işleme süresi (sn) */
  seconds: number;
  /** canlı çalma */
  play: (s: Sfx) => void;
  /** çevrimdışı plan (yoksa play) */
  plan?: (s: Sfx) => void;
  /** hedef tepe seviyesi (dBFS); ±3 dB tolerans */
  target?: number;
  /** hedef 100 ms RMS medyanı (dBFS); ±3 dB tolerans (ortam yatağı) */
  medTarget?: number;
  /** beklenen tayf: 'bright' parlak (merkez > 1.5 kHz), 'low' alçak (merkez < 1 kHz) */
  tone?: 'bright' | 'low' | 'mid';
}

const seq = (s: Sfx, n: number, gap: number, fn: () => void): void => {
  for (let i = 0; i < n; i++) s.runAt(i * gap, fn);
};

const SOUNDS: SoundDef[] = [
  {id: 'slide-soft', group: 'Kart', label: 'Kart al', hint: 'hafif', seconds: 0.6, play: (s) => s.cardSlide(0.3), tone: 'mid'},
  {id: 'slide', group: 'Kart', label: 'Kart kaydır', hint: 'orta', seconds: 0.6, play: (s) => s.cardSlide(), tone: 'mid'},
  {id: 'slide-hard', group: 'Kart', label: 'Kart kaydır', hint: 'güçlü', seconds: 0.6, play: (s) => s.cardSlide(1), target: -14, tone: 'bright'},
  {id: 'throw-slow', group: 'Kart', label: 'Fırlat', hint: 'yavaş', seconds: 0.7, play: (s) => s.cardThrow(0.2), tone: 'bright'},
  {id: 'throw-fast', group: 'Kart', label: 'Fırlat', hint: 'hızlı', seconds: 0.7, play: (s) => s.cardThrow(1), target: -14, tone: 'bright'},
  {id: 'land-soft', group: 'Kart', label: 'Düş', hint: 'yumuşak', seconds: 0.6, play: (s) => s.cardLand(0.25), tone: 'mid'},
  {id: 'land', group: 'Kart', label: 'Düş', hint: 'orta', seconds: 0.6, play: (s) => s.cardLand(), tone: 'mid'},
  {id: 'land-hard', group: 'Kart', label: 'Düş', hint: 'sert', seconds: 0.6, play: (s) => s.cardLand(1), target: -12, tone: 'mid'},
  {id: 'flip', group: 'Kart', label: 'Kart çevir', seconds: 0.5, play: (s) => s.cardFlip(), target: -13, tone: 'bright'},
  {id: 'deal', group: 'Kart', label: 'Dağıt', hint: '1 kart', seconds: 0.5, play: (s) => s.deal(), target: -13, tone: 'mid'},
  {
    id: 'deal8', group: 'Kart', label: 'Dağıt ×8', hint: '80 ms aralık', seconds: 1.4,
    play: (s) => {
      for (let i = 0; i < 8; i++) setTimeout(() => s.deal(), i * 80);
    },
    plan: (s) => seq(s, 8, 0.08, () => s.deal()),
    target: -13, tone: 'mid',
  },
  {id: 'shuffle', group: 'Kart', label: 'Karıştır', hint: '~1.3 sn', seconds: 2.0, play: (s) => s.shuffle(), target: -12, tone: 'bright'},
  {id: 'capture2', group: 'Kart', label: 'Topla', hint: '2 kart', seconds: 1.2, play: (s) => s.capture(2), tone: 'mid'},
  {id: 'capture6', group: 'Kart', label: 'Topla', hint: '6 kart', seconds: 1.2, play: (s) => s.capture(6), tone: 'mid'},
  {id: 'capture14', group: 'Kart', label: 'Topla', hint: '14 kart', seconds: 1.4, play: (s) => s.capture(14), target: -12, tone: 'mid'},

  {
    id: 'slowmo-shuffle', group: 'Kart', label: 'Karıştır (ağır çekim 0.15)', hint: 'alçak geçiren ~800 Hz', seconds: 2.6,
    play: (s) => { s.setSlowMo(0.15); s.shuffle(); setTimeout(() => s.setSlowMo(1), 2200); },
    plan: (s) => { s.setSlowMo(0.15); s.runAt(0.6, () => s.shuffle()); }, tone: 'low',
  },
  {id: 'pisti', group: 'Büyük anlar', label: 'PİŞTİ!', seconds: 2.6, play: (s) => s.pisti(false), target: -4},
  {id: 'pisti-jack', group: 'Büyük anlar', label: 'VALE PİŞTİ!', hint: 'daha büyük', seconds: 2.8, play: (s) => s.pisti(true), target: -4},
  {id: 'coin1', group: 'Büyük anlar', label: 'Jeton ×1', seconds: 0.8, play: (s) => s.coin(1), tone: 'bright'},
  {id: 'coin3', group: 'Büyük anlar', label: 'Jeton ×3', seconds: 1.0, play: (s) => s.coin(3), tone: 'bright'},
  {id: 'coin8', group: 'Büyük anlar', label: 'Jeton ×8', seconds: 1.6, play: (s) => s.coin(8), target: -16, tone: 'bright'},
  {id: 'tap', group: 'Büyük anlar', label: 'Arayüz tıkı', hint: 'ahşap', seconds: 0.5, play: (s) => s.uiTap(), target: -16},
  {id: 'win', group: 'Büyük anlar', label: 'Kazandın', seconds: 3.6, play: (s) => s.win(), target: -8},
  {id: 'lose', group: 'Büyük anlar', label: 'Kaybettin', seconds: 3.2, play: (s) => s.lose(), target: -8},

  {
    id: 'stress-mix', group: 'Yük testi', label: 'Hepsi aynı anda', hint: 'sınırlayıcı kırpmamalı', seconds: 3.0,
    play: (s) => {
      s.pisti(true); s.capture(14); s.coin(8); s.shuffle(); s.win(); s.cardLand(1); s.uiTap();
      for (let i = 0; i < 8; i++) setTimeout(() => s.deal(), i * 80);
    },
    plan: (s) => {
      s.pisti(true); s.capture(14); s.coin(8); s.shuffle(); s.win(); s.cardLand(1); s.uiTap();
      seq(s, 8, 0.08, () => s.deal());
    },
  },
  {
    id: 'stress-land24', group: 'Yük testi', label: '24 sert iniş üst üste', hint: 'voice sınırı', seconds: 1.0,
    play: (s) => { for (let i = 0; i < 24; i++) s.cardLand(1); },
    plan: (s) => { for (let i = 0; i < 24; i++) s.cardLand(1); },
  },
  {id: 'amb-glass', group: 'Ortam olayları', label: 'Çay bardağı', hint: 'ortam olayı', seconds: 1.6, play: (s) => s.ambOnce(0), target: -30},
  {id: 'amb-stir', group: 'Ortam olayları', label: 'Kaşık karıştırma', seconds: 1.6, play: (s) => s.ambOnce(1), target: -30},
  {id: 'amb-dice', group: 'Ortam olayları', label: 'Tavla zarı', seconds: 1.6, play: (s) => s.ambOnce(2), target: -30},
  {id: 'amb-creak', group: 'Ortam olayları', label: 'Sandalye gıcırtısı', seconds: 1.6, play: (s) => s.ambOnce(3), target: -30},
  {
    id: 'amb-bed', group: 'Ortam olayları', label: 'Yalnız mırıltı yatağı (çevrimdışı 20 sn)', seconds: 20,
    play: () => undefined, plan: (s) => { s.setAmbEvents(false); s.startAmbience(); }, medTarget: -42.5, tone: 'mid',
  },
  {
    id: 'ambience', group: 'Ortam olayları', label: 'Ortam: yatak + olaylar (çevrimdışı 40 sn)', seconds: 40,
    play: () => undefined, plan: (s) => s.startAmbience(), target: -27, medTarget: -42.5,
  },
];

// ───────────────────────── çözümleme ─────────────────────────

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

const db = (x: number): number => 20 * Math.log10(Math.max(x, 1e-9));

interface Analysis {
  peakDb: number;
  rmsDb: number;
  durS: number;
  startS: number;
  centroid: number;
  loPct: number;
  hiPct: number;
  medWinDb: number;
}

const NF = 2048;
const hann = new Float64Array(NF).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (NF - 1)));

function analyze(l: Float32Array, r: Float32Array, sr: number, skipS = 0): Analysis {
  const n = l.length;
  const mono = new Float32Array(n);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    mono[i] = 0.5 * (l[i] + r[i]);
    peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  }
  const thr = Math.pow(10, -50 / 20);
  const s0 = Math.floor(skipS * sr);
  let first = -1;
  let last = -1;
  for (let i = s0; i < n; i++) {
    if (Math.abs(mono[i]) > thr) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return {peakDb: db(peak), rmsDb: -120, durS: 0, startS: 0, centroid: 0, loPct: 0, hiPct: 0, medWinDb: -120};
  let e = 0;
  for (let i = first; i <= last; i++) e += mono[i] * mono[i];
  const rms = Math.sqrt(e / (last - first + 1));
  // ortalama güç tayfı
  const re = new Float64Array(NF);
  const im = new Float64Array(NF);
  const ps = new Float64Array(NF / 2);
  let frames = 0;
  const hop = NF / 2;
  for (let p = first; p + NF <= Math.max(last + 1, first + NF); p += hop) {
    for (let i = 0; i < NF; i++) {
      re[i] = (mono[p + i] ?? 0) * hann[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < NF / 2; k++) ps[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
  }
  let sum = 0;
  let wsum = 0;
  let lo = 0;
  let hi = 0;
  const df = sr / NF;
  for (let k = 1; k < NF / 2; k++) {
    const f = k * df;
    sum += ps[k];
    wsum += ps[k] * f;
    if (f < 300) lo += ps[k];
    if (f > 3000) hi += ps[k];
  }
  // 100 ms pencere RMS medyanı (ortam yatağı seviyesi)
  const w = Math.floor(sr * 0.1);
  const wins: number[] = [];
  for (let p = Math.max(s0, 0); p + w <= n; p += w) {
    let ee = 0;
    for (let i = 0; i < w; i++) ee += mono[p + i] * mono[p + i];
    wins.push(Math.sqrt(ee / w));
  }
  wins.sort((a, b) => a - b);
  return {
    peakDb: db(peak),
    rmsDb: db(rms),
    durS: (last - first) / sr,
    startS: first / sr,
    centroid: wsum / Math.max(sum, 1e-30),
    loPct: (100 * lo) / Math.max(sum, 1e-30),
    hiPct: (100 * hi) / Math.max(sum, 1e-30),
    medWinDb: db(wins[Math.floor(wins.length / 2)] ?? 0),
  };
}

/** Dalga biçimi + tayfçizim (log frekans) çiz. */
function drawViz(cv: HTMLCanvasElement, l: Float32Array, r: Float32Array, sr: number): void {
  const W = 720;
  const H = 230;
  const WH = 70;
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  if (!c) return;
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  const n = l.length;
  let pk = 1e-6;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(l[i]), Math.abs(r[i]));
  const per = n / W;
  c.fillStyle = '#e0a24a';
  for (let x = 0; x < W; x++) {
    let mn = 1;
    let mx = -1;
    const a = Math.floor(x * per);
    const b = Math.min(n, Math.floor((x + 1) * per) + 1);
    for (let i = a; i < b; i++) {
      const v = 0.5 * (l[i] + r[i]);
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    const y1 = WH / 2 - (mx / pk) * (WH / 2 - 2);
    const y2 = WH / 2 - (mn / pk) * (WH / 2 - 2);
    c.fillRect(x, Math.min(y1, y2), 1, Math.max(1, Math.abs(y2 - y1)));
  }
  // tayfçizim
  const N = 1024;
  const win = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const SH = H - WH - 4;
  const fmin = 60;
  const fmax = Math.min(18000, sr / 2);
  for (let x = 0; x < W; x++) {
    const p = Math.min(n - N, Math.floor(x * ((n - N) / W)));
    if (p < 0) break;
    for (let i = 0; i < N; i++) {
      re[i] = 0.5 * (l[p + i] + r[p + i]) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let y = 0; y < SH; y++) {
      const f = fmin * Math.pow(fmax / fmin, 1 - y / SH);
      const k = Math.min(N / 2 - 1, Math.round((f / sr) * N));
      const mag = (4 * Math.hypot(re[k], im[k])) / N;
      const d = db(mag);
      const t = Math.max(0, Math.min(1, (d + 110) / 80));
      const rr = Math.floor(255 * Math.min(1, t * 2));
      const gg = Math.floor(255 * Math.max(0, Math.min(1, t * 2 - 0.6)));
      const bb = Math.floor(255 * Math.max(0, 0.6 - Math.abs(t - 0.3) * 2.2));
      c.fillStyle = `rgb(${rr},${gg},${bb})`;
      c.fillRect(x, WH + 4 + y, 1, 1);
    }
  }
  c.fillStyle = '#9a8';
  c.font = '10px monospace';
  for (const f of [100, 500, 1000, 3000, 6000, 12000]) {
    const y = WH + 4 + SH * (1 - Math.log(f / fmin) / Math.log(fmax / fmin));
    c.fillRect(0, y, 6, 1);
    c.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, 8, y + 3);
  }
}

// ───────────────────────── otomatik mod ─────────────────────────

interface Row extends Analysis {
  id: string;
  label: string;
  seconds: number;
  target?: number;
  verdict: string;
  ok: boolean;
}

interface FloodMethodReport {
  method: string;
  calls: number;
  maxVoices: number;
  maxAmbVoices: number;
  avgCallMs: number;
  nodesPerCall: number;
  threw: boolean;
}

interface FloodReport {
  state: string;
  methods: FloodMethodReport[];
  droppedTotal: number;
  nodesAfterSettle: number;
  voicesAfterSettle: number;
  errors: number;
  lastError: string;
  ok: boolean;
  note: string;
}

function evaluate(def: SoundDef, a: Analysis): {ok: boolean; verdict: string} {
  const issues: string[] = [];
  const isAmb = def.id === 'ambience' || def.id === 'amb-bed';
  if (a.peakDb < -70) issues.push('SESSİZ');
  if (a.peakDb >= -1) issues.push('KIRPMA');
  if (def.target !== undefined && Math.abs(a.peakDb - def.target) > 3) issues.push(`hedef ${def.target} dBFS dışında`);
  if (def.medTarget !== undefined && Math.abs(a.medWinDb - def.medTarget) > 3) issues.push(`RMS medyan hedefi ${def.medTarget} dBFS dışında`);
  if (def.tone === 'bright' && a.centroid < 1500) issues.push('tayf merkezi düşük (parlak bekleniyordu)');
  if (def.tone === 'low' && a.centroid > 1500) issues.push('tayf merkezi yüksek (alçak bekleniyordu)');
  if (!isAmb && a.durS > def.seconds * 0.97) issues.push('süre işleme penceresini aşıyor');
  return {ok: issues.length === 0, verdict: issues.length ? issues.join('; ') : 'ok'};
}

async function renderOne(def: SoundDef): Promise<{row: Row; l: Float32Array; r: Float32Array; sr: number}> {
  const res = await renderSfxOffline(def.seconds, def.plan ?? def.play, {seed: 12345, sampleRate: 44100});
  const isAmb = def.id === 'ambience' || def.id === 'amb-bed';
  const a = analyze(res.left, res.right, res.sampleRate, isAmb ? 4 : 0);
  const ev = evaluate(def, a);
  const row: Row = {id: def.id, label: `${def.label}${def.hint ? ' (' + def.hint + ')' : ''}`, seconds: def.seconds, target: def.target, ...a, ...ev};
  if (res.stats.errors) {
    row.ok = false;
    row.verdict += ` MOTOR HATASI: ${res.stats.lastError}`;
  }
  return {row, l: res.left, r: res.right, sr: res.sampleRate};
}

const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

/** Gerçek AudioContext ile yığın testi: her yöntem 200 kez art arda. */
async function floodTest(): Promise<FloodReport> {
  Sfx.debug = true; // motor içi hata fırlatsın
  const s = new Sfx();
  const rep: FloodReport = {state: 'none', methods: [], droppedTotal: 0, nodesAfterSettle: -1, voicesAfterSettle: -1, errors: 0, lastError: '', ok: false, note: ''};
  await s.unlock();
  rep.state = s.stats().state;
  if (rep.state !== 'running') {
    rep.note = 'AudioContext çalışmıyor; yığın testi atlandı';
    s.dispose();
    return rep;
  }
  const rnd = Math.random;
  const calls: Array<[string, () => void]> = [
    ['cardSlide', () => s.cardSlide(rnd())],
    ['cardThrow', () => s.cardThrow(rnd())],
    ['cardLand', () => s.cardLand(rnd())],
    ['cardFlip', () => s.cardFlip()],
    ['deal', () => s.deal()],
    ['shuffle', () => s.shuffle()],
    ['capture', () => s.capture(1 + Math.floor(rnd() * 14))],
    ['pisti', () => s.pisti(rnd() < 0.5)],
    ['coin', () => s.coin(1 + Math.floor(rnd() * 8))],
    ['uiTap', () => s.uiTap()],
    ['win', () => s.win()],
    ['lose', () => s.lose()],
    ['ambOnce', () => s.ambOnce(Math.floor(rnd() * 4))],
  ];
  for (const [name, fn] of calls) {
    const n0 = s.stats().nodesAlive;
    fn();
    const m: FloodMethodReport = {method: name, calls: 200, maxVoices: 0, maxAmbVoices: 0, avgCallMs: 0, nodesPerCall: s.stats().nodesAlive - n0, threw: false};
    const t0 = performance.now();
    try {
      for (let i = 0; i < 200; i++) {
        fn();
        const st = s.stats();
        m.maxVoices = Math.max(m.maxVoices, st.voices);
        m.maxAmbVoices = Math.max(m.maxAmbVoices, st.ambVoices);
      }
    } catch (e) {
      m.threw = true;
      rep.lastError = String(e);
    }
    m.avgCallMs = (performance.now() - t0) / 200;
    rep.methods.push(m);
    await sleep(30);
  }
  // ayar çağrıları + ortam aç/kapa yığını
  try {
    for (let i = 0; i < 200; i++) {
      s.setVolume(Math.random());
      s.setMuted(i % 7 === 0);
      s.setSlowMo(0.1 + Math.random() * 0.9);
      if (i % 2) s.startAmbience();
      else s.stopAmbience();
    }
    s.setMuted(false);
    s.setVolume(1);
    s.setSlowMo(1);
    s.stopAmbience();
  } catch (e) {
    rep.lastError = String(e);
  }
  // bitmelerini bekle (en uzun ses ~3 sn + planlı kuyruk)
  for (let i = 0; i < 100; i++) {
    await sleep(100);
    const st = s.stats();
    if (st.voices === 0 && st.ambVoices === 0 && st.nodesAlive === 0) break;
  }
  const st: SfxStats = s.stats();
  rep.droppedTotal = st.dropped;
  rep.nodesAfterSettle = st.nodesAlive;
  rep.voicesAfterSettle = st.voices + st.ambVoices;
  rep.errors = st.errors;
  rep.lastError = rep.lastError || st.lastError;
  rep.ok =
    rep.methods.every((m) => !m.threw && m.maxVoices <= 24 && m.maxAmbVoices <= 8) &&
    rep.nodesAfterSettle === 0 &&
    rep.voicesAfterSettle === 0 &&
    rep.errors === 0 &&
    rep.droppedTotal > 0;
  s.dispose();
  return rep;
}

const fmt = (x: number, d = 1): string => (Number.isFinite(x) ? x.toFixed(d) : String(x));

async function runAuto(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const only = params.get('only');
  const list = only ? SOUNDS.filter((d) => only.split(',').includes(d.id)) : SOUNDS;
  const host = document.getElementById('report') as HTMLElement;
  const rows: Row[] = [];
  console.log('[SFX] otomatik ölçüm başlıyor');
  for (const def of list) {
    const {row, l, r, sr} = await renderOne(def);
    rows.push(row);
    console.log(
      `[SFX] ${row.id.padEnd(11)} peak=${fmt(row.peakDb).padStart(6)} dBFS rms=${fmt(row.rmsDb).padStart(6)} dBFS ` +
        `dur=${fmt(row.durS, 2).padStart(5)} s  centroid=${fmt(row.centroid, 0).padStart(5)} Hz  lo=${fmt(row.loPct, 0)}% hi=${fmt(row.hiPct, 0)}%  ${row.ok ? 'OK' : 'UYARI: ' + row.verdict}`,
    );
    const el = document.createElement('div');
    el.className = 'row';
    el.dataset.id = row.id;
    el.innerHTML = `<h3><span>${row.label}</span><span class="${row.ok ? 'ok' : 'bad'}">${row.ok ? 'OK' : row.verdict}</span></h3><canvas></canvas><pre></pre>`;
    (el.querySelector('pre') as HTMLElement).textContent =
      `tepe ${fmt(row.peakDb)} dBFS | rms ${fmt(row.rmsDb)} dBFS | süre ${fmt(row.durS, 2)} s | tayf merkezi ${fmt(row.centroid, 0)} Hz | <300Hz %${fmt(row.loPct, 0)} | >3kHz %${fmt(row.hiPct, 0)}` +
      (row.id === 'ambience' || row.id === 'amb-bed' ? ` | 100ms RMS medyan ${fmt(row.medWinDb)} dBFS` : '');
    host.appendChild(el);
    drawViz(el.querySelector('canvas') as HTMLCanvasElement, l, r, sr);
    await sleep(0);
  }
  let flood: FloodReport | null = null;
  if (!params.get('noflood')) {
    flood = await floodTest();
    console.log(`[SFX] yığın testi: durum=${flood.state} ok=${flood.ok} düşürülen=${flood.droppedTotal} kalan düğüm=${flood.nodesAfterSettle} hata=${flood.errors} ${flood.note}`);
    for (const m of flood.methods) {
      console.log(`[SFX]   ${m.method.padEnd(10)} 200x maxVoices=${m.maxVoices} maxAmb=${m.maxAmbVoices} ort=${fmt(m.avgCallMs, 3)} ms/çağrı düğüm/çağrı=${m.nodesPerCall} ${m.threw ? 'FIRLATTI' : ''}`);
    }
  }
  (window as unknown as {__audioReport: unknown}).__audioReport = {rows, flood};
  (window as unknown as {__audioDone: boolean}).__audioDone = true;
  console.log('[SFX] bitti');
}

// ───────────────────────── elle dinleme arayüzü ─────────────────────────

function buildUi(): void {
  const sfx = new Sfx();
  (window as unknown as {__sfx: Sfx}).__sfx = sfx;
  const app = document.getElementById('app') as HTMLElement;
  const status = document.createElement('div');
  status.id = 'status';
  const refresh = (): void => {
    const st = sfx.stats();
    status.textContent = `bağlam: ${st.state} | voice: ${st.voices}/${24} | ortam voice: ${st.ambVoices} | düğüm: ${st.nodesAlive} | düşürülen: ${st.dropped} | hata: ${st.errors}${st.lastError ? ' (' + st.lastError + ')' : ''}`;
  };
  const press = async (fn: () => void): Promise<void> => {
    await sfx.unlock();
    fn();
    refresh();
  };

  // ayarlar
  const ctl = document.createElement('div');
  ctl.className = 'ctl';
  ctl.innerHTML = `
    <label><input type="checkbox" id="mute"> Sessiz</label>
    <label>Ses <input type="range" id="vol" min="0" max="1" step="0.01" value="1"><output id="volo">1.00</output></label>
    <label>Ağır çekim <input type="range" id="slow" min="0.1" max="1" step="0.01" value="1"><output id="slowo">1.00</output></label>`;
  app.appendChild(ctl);
  const q = <T extends HTMLElement>(id: string): T => ctl.querySelector('#' + id) as T;
  q<HTMLInputElement>('mute').addEventListener('change', (e) => sfx.setMuted((e.target as HTMLInputElement).checked));
  q<HTMLInputElement>('vol').addEventListener('input', (e) => {
    const v = Number((e.target as HTMLInputElement).value);
    sfx.setVolume(v);
    q('volo').textContent = v.toFixed(2);
  });
  q<HTMLInputElement>('slow').addEventListener('input', (e) => {
    const v = Number((e.target as HTMLInputElement).value);
    sfx.setSlowMo(v);
    q('slowo').textContent = v.toFixed(2);
  });

  const groups = new Map<string, SoundDef[]>();
  for (const d of SOUNDS) {
    if (d.id === 'ambience' || d.id === 'amb-bed') continue;
    if (!groups.has(d.group)) groups.set(d.group, []);
    groups.get(d.group)?.push(d);
  }
  for (const [name, defs] of groups) {
    const h = document.createElement('h2');
    h.textContent = name;
    app.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const d of defs) {
      const b = document.createElement('button');
      b.className = 'snd';
      b.innerHTML = `${d.label}${d.hint ? `<small>${d.hint}</small>` : ''}`;
      b.addEventListener('pointerdown', () => void press(() => d.play(sfx)));
      grid.appendChild(b);
    }
    if (name === 'Ortam olayları') {
      const amb = document.createElement('button');
      amb.className = 'snd big';
      amb.textContent = 'Kahvehane ortamı: aç / kapat';
      let on = false;
      amb.addEventListener('pointerdown', () =>
        void press(() => {
          on = !on;
          amb.classList.toggle('on', on);
          if (on) sfx.startAmbience();
          else sfx.stopAmbience();
        }),
      );
      grid.prepend(amb);
    }
    app.appendChild(grid);
  }

  const h = document.createElement('h2');
  h.textContent = 'Sınama';
  app.appendChild(h);
  const g = document.createElement('div');
  g.className = 'grid';
  const flood = document.createElement('button');
  flood.className = 'snd';
  flood.innerHTML = '200× yığın testi<small>hepsini art arda çağırır</small>';
  flood.addEventListener('pointerdown', () => {
    void (async () => {
      await sfx.unlock();
      const run = (fn: () => void): void => {
        for (let i = 0; i < 200; i++) fn();
      };
      run(() => sfx.cardSlide(Math.random()));
      run(() => sfx.cardThrow(Math.random()));
      run(() => sfx.cardLand(Math.random()));
      run(() => sfx.cardFlip());
      run(() => sfx.deal());
      run(() => sfx.shuffle());
      run(() => sfx.capture(1 + Math.floor(Math.random() * 14)));
      run(() => sfx.pisti(Math.random() < 0.5));
      run(() => sfx.coin(1 + Math.floor(Math.random() * 8)));
      run(() => sfx.uiTap());
      refresh();
    })();
  });
  g.appendChild(flood);
  app.appendChild(g);
  app.appendChild(status);
  const tick = (): void => {
    refresh();
    setTimeout(tick, 500); // yalnızca geliştirme sayfası: durum satırı
  };
  tick();
}

const win = window as unknown as {__audioApi: unknown};
win.__audioApi = {SOUNDS, renderOne, analyze, floodTest};

if (new URLSearchParams(location.search).get('auto')) {
  void runAuto().catch((e) => {
    console.error('[SFX] otomatik mod hatası', e);
    (window as unknown as {__audioDone: boolean}).__audioDone = true;
  });
} else {
  buildUi();
}
