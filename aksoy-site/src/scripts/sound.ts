// Sesli deneyim: ortam müziği ve kısa efektler tamamen tarayıcıda (Web Audio) üretilir; dosya indirilmez.
// Varsayılan kapalıdır. Tercih bu cihazda saklanır (localStorage 'aksoy-ses'); bize gönderilmez.
// Ses motoru ancak kullanıcı sesi açtıktan ve sayfayla etkileşime girdikten sonra kurulur.

const KEY = 'aksoy-ses';
type Fx = { cut: number; coolant: number; jet: number; screw0: number; screw1: number; flash: number };

let on = false;
try { on = localStorage.getItem(KEY) === '1'; } catch { /* gizli sekme */ }

let ctx: AudioContext | null = null;
let master: GainNode, music: GainNode, fxBus: GainNode, verb: ConvolverNode;
let noise: AudioBuffer;
let chordTimer = 0, pingTimer = 0, raf = 0, chordIdx = 0, bed = false;
let drill: { whine: OscillatorNode; whineG: GainNode; rumbleG: GainNode; chipG: GainNode; hissG: GainNode } | null = null;

const now = () => ctx!.currentTime;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Oda yankısı: üstel sönen, iki kanalda farklı gürültü (yaklaşık 3,5 sn) */
function impulse(c: AudioContext, sec = 3.6, decay = 2.8) {
  const len = Math.floor(c.sampleRate * sec);
  const b = c.createBuffer(2, len, c.sampleRate);
  const pre = c.sampleRate * 0.015;
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      // Hafif alçak geçiren: kuyruk parlak tıslamasın
      lp += 0.42 * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - i / len, decay) * Math.min(1, i / pre);
    }
  }
  return b;
}

/** Pembe gürültü (Paul Kellet), 3 sn döngü */
function pink(c: AudioContext) {
  const len = c.sampleRate * 3;
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return b;
}

function noiseSrc(loop = true) {
  const s = ctx!.createBufferSource();
  s.buffer = noise;
  s.loop = loop;
  s.loopStart = Math.random() * 2;
  return s;
}

function build() {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return false;
  ctx = new AC({ latencyHint: 'playback' });
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
  master = ctx.createGain(); master.gain.value = 0;
  master.connect(comp).connect(ctx.destination);
  verb = ctx.createConvolver(); verb.buffer = impulse(ctx);
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.8;
  verb.connect(verbOut).connect(master);
  music = ctx.createGain(); music.gain.value = 0;
  music.connect(master);
  const mv = ctx.createGain(); mv.gain.value = 0.7; music.connect(mv).connect(verb);
  fxBus = ctx.createGain(); fxBus.gain.value = 0.6; fxBus.connect(master);
  const fv = ctx.createGain(); fv.gain.value = 0.3; fxBus.connect(fv).connect(verb);
  noise = pink(ctx);
  buildDrill();
  if (location.search.includes('debug')) (window as any).__aksoySound = { ctx, master, whoosh, clink, boom };
  return true;
}

/* ---------------- Ortam müziği ---------------- */

// La minör çevresinde ağır, sinematik akorlar (Hz)
const CHORDS = [
  [110, 164.81, 246.94, 261.63], // Am(add9)
  [87.31, 130.81, 164.81, 220], // Fmaj7
  [98, 146.83, 164.81, 246.94], // G6/9
  [82.41, 123.47, 146.83, 185], // Em(add9)
];
const CHORD_LEN = 11;

function padVoice(f: number, t0: number, dur: number, gain: number) {
  const c = ctx!;
  const g = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 0.5;
  lp.frequency.setValueAtTime(300, t0);
  lp.frequency.linearRampToValueAtTime(rand(820, 1100), t0 + dur * 0.5);
  lp.frequency.linearRampToValueAtTime(360, t0 + dur);
  const pan = c.createStereoPanner(); pan.pan.value = rand(-0.45, 0.45);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 3.6);
  g.gain.setValueAtTime(gain, t0 + dur - 4.8);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  lp.connect(g).connect(pan).connect(music);
  for (const det of [-7, 6]) {
    const o = c.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det + rand(-2, 2);
    o.connect(lp); o.start(t0); o.stop(t0 + dur + 0.1);
  }
  const s = c.createOscillator(); // yumuşak gövde
  s.type = 'triangle'; s.frequency.value = f;
  const sg = c.createGain(); sg.gain.value = 0.6;
  s.connect(sg).connect(lp); s.start(t0); s.stop(t0 + dur + 0.1);
}

function nextChord() {
  if (!ctx) return;
  const t0 = now() + 0.05;
  const ch = CHORDS[chordIdx++ % CHORDS.length];
  ch.forEach((f, i) => padVoice(f, t0 + i * 0.35, CHORD_LEN + 5, i === 0 ? 0.03 : 0.022));
  // Kök sesin bir oktav altı: zemin
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = ch[0] / 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 4); g.gain.setValueAtTime(0.05, t0 + CHORD_LEN); g.gain.linearRampToValueAtTime(0, t0 + CHORD_LEN + 5);
  o.connect(g).connect(music); o.start(t0); o.stop(t0 + CHORD_LEN + 5.1);
  chordTimer = window.setTimeout(nextChord, CHORD_LEN * 1000);
}

/** Uzaktan gelen metal tınısı: tezgâha bırakılan uç gibi */
function bell(f: number, t: number, gain: number, dest: AudioNode, decay = 2.2, pan = 0) {
  const c = ctx!;
  const P = [1, 2.756, 5.404, 8.933];
  const A = [1, 0.5, 0.32, 0.18];
  const out = c.createStereoPanner(); out.pan.value = pan; out.connect(dest);
  P.forEach((p, i) => {
    if (f * p > 15000) return; // duyulmayacak kısmi sesleri atla
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * p;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * A[i], t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay / (1 + i * 0.9));
    o.connect(g).connect(out); o.start(t); o.stop(t + decay + 0.1);
  });
}

function airBed() {
  // Atölye havası: çok kısık, yavaş nefes alan bant gürültüsü
  const c = ctx!;
  const s = noiseSrc();
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.4;
  const g = c.createGain(); g.gain.value = 0.014;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
  const lg = c.createGain(); lg.gain.value = 0.008;
  lfo.connect(lg).connect(g.gain);
  s.connect(bp).connect(g).connect(music);
  s.start(); lfo.start();
}

function schedulePing() {
  pingTimer = window.setTimeout(() => {
    if (ctx && on) bell([1318.5, 1568, 1760, 2093][Math.floor(Math.random() * 4)], now() + 0.02, 0.012, music, 3, rand(-0.7, 0.7));
    schedulePing();
  }, rand(9000, 19000));
}

/* ---------------- Delme sesi (vitrin) ---------------- */

function buildDrill() {
  const c = ctx!;
  const whine = c.createOscillator(); whine.type = 'sawtooth'; whine.frequency.value = 180;
  const wbp = c.createBiquadFilter(); wbp.type = 'bandpass'; wbp.frequency.value = 720; wbp.Q.value = 2.2;
  const whineG = c.createGain(); whineG.gain.value = 0;
  whine.connect(wbp).connect(whineG).connect(fxBus); whine.start();

  const r = noiseSrc(); const rlp = c.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 240;
  const rumbleG = c.createGain(); rumbleG.gain.value = 0;
  r.connect(rlp).connect(rumbleG).connect(fxBus); r.start();

  const ch = noiseSrc(); const cbp = c.createBiquadFilter(); cbp.type = 'bandpass'; cbp.frequency.value = 2400; cbp.Q.value = 0.9;
  const chipG = c.createGain(); chipG.gain.value = 0;
  ch.connect(cbp).connect(chipG).connect(fxBus); ch.start();

  const h = noiseSrc(); const hhp = c.createBiquadFilter(); hhp.type = 'highpass'; hhp.frequency.value = 3800;
  const hissG = c.createGain(); hissG.gain.value = 0;
  h.connect(hhp).connect(hissG).connect(fxBus); h.start();
  drill = { whine, whineG, rumbleG, chipG, hissG };
}

let lastScrew = 0, lastFlash = 0;
function drillLoop() {
  raf = 0;
  if (!ctx || !on || !drill) return;
  const S = (window as any).__aksoyFx as Fx | undefined;
  if (S) {
    const t = now();
    const cut = Math.min(1, S.cut || 0);
    const cool = Math.min(1, (S.coolant || 0) * 0.6 + (S.jet || 0) * 0.6);
    drill.whine.frequency.setTargetAtTime(170 + cut * 70, t, 0.08);
    drill.whineG.gain.setTargetAtTime(cut * 0.05, t, 0.06);
    drill.rumbleG.gain.setTargetAtTime(cut * 0.22, t, 0.06);
    // Talaş kırılması: rastgele kısa patlamalar
    drill.chipG.gain.setTargetAtTime(cut * (Math.random() < 0.35 ? 0.12 : 0.03), t, 0.012);
    drill.hissG.gain.setTargetAtTime(cool * 0.05, t, 0.1);
    // Vida sıkma/gevşetme: cırcır tıkırtısı
    const sc = (S.screw0 || 0) + (S.screw1 || 0);
    if (Math.abs(sc - lastScrew) > 0.09) { tick(2600, 0.045, 0.006); lastScrew = sc; }
    // Yeni kesme kenarı parlaması: küçük metal tını
    if ((S.flash || 0) > 0.6 && lastFlash <= 0.6) bell(2350, t + 0.01, 0.05, fxBus, 1.2, 0.2);
    lastFlash = S.flash || 0;
  }
  raf = requestAnimationFrame(drillLoop);
}

/* ---------------- Kısa efektler ---------------- */

function tick(freq = 3600, gain = 0.035, len = 0.018) {
  if (!ctx) return;
  const t = now();
  const s = noiseSrc(false);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(bp).connect(g).connect(fxBus); s.start(t); s.stop(t + len + 0.02);
}

function click() {
  if (!ctx) return;
  const t = now();
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(620, t + 0.05);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g).connect(fxBus); o.start(t); o.stop(t + 0.08);
  tick(5200, 0.03, 0.01);
}

/** Sepete ekleme: karbür ucun kutuya düşüşü (iki tını) */
function clink() {
  if (!ctx) return;
  const t = now();
  tick(7000, 0.05, 0.008);
  bell(2350, t, 0.07, fxBus, 1.1, -0.1);
  bell(2610, t + 0.075, 0.035, fxBus, 0.8, 0.15);
}

function whoosh(dir = 1) {
  if (!ctx) return;
  const t = now(), d = 0.75;
  const s = noiseSrc(false);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(dir > 0 ? 280 : 2200, t);
  bp.frequency.exponentialRampToValueAtTime(dir > 0 ? 2200 : 280, t + d);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + d * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  const p = ctx.createStereoPanner();
  p.pan.setValueAtTime(-0.6 * dir, t); p.pan.linearRampToValueAtTime(0.6 * dir, t + d);
  s.connect(bp).connect(g).connect(p).connect(fxBus); s.start(t); s.stop(t + d + 0.05);
}

/** Açılış: derin vuruş ve parlak tını */
function boom() {
  if (!ctx) return;
  const t = now() + 0.02;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(36, t + 1.4);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
  o.connect(g).connect(master); o.start(t); o.stop(t + 2.1);
  const s = noiseSrc(false);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.6);
  const ng = ctx.createGain(); ng.gain.setValueAtTime(0.25, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  s.connect(lp).connect(ng).connect(fxBus); s.start(t); s.stop(t + 0.8);
  shimmer(0.25);
}

function shimmer(delay = 0) {
  if (!ctx) return;
  const t = now() + delay;
  [2637, 3136, 3951, 5274].forEach((f, i) => bell(f, t + i * 0.06, 0.018, verb, 2.6, (i - 1.5) * 0.3));
}

/* ---------------- Açma / kapama ---------------- */

function start() {
  if (!ctx && !build()) return;
  ctx!.resume();
  const t = now();
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(1, t, 0.08);
  music.gain.cancelScheduledValues(t);
  music.gain.setValueAtTime(music.gain.value, t);
  music.gain.linearRampToValueAtTime(1, t + 2.5);
  if (!bed) { airBed(); bed = true; }
  if (!chordTimer) { nextChord(); schedulePing(); }
  if (!raf) raf = requestAnimationFrame(drillLoop);
}

function stop() {
  if (!ctx) return;
  const t = now();
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(0, t, 0.12);
  clearTimeout(chordTimer); clearTimeout(pingTimer); chordTimer = 0;
  cancelAnimationFrame(raf); raf = 0;
  const c = ctx;
  setTimeout(() => { if (!on) c.suspend(); }, 700);
}

function syncUI() {
  document.documentElement.classList.toggle('sound-on', on);
  document.querySelectorAll<HTMLElement>('[data-sound-toggle]').forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('is-on', on);
    const l = b.querySelector('[data-sound-label]');
    if (l) l.textContent = on ? (b.dataset.on ?? 'Açık') : (b.dataset.off ?? 'Kapalı');
  });
}

export function setSound(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* yok say */ }
  syncUI();
  if (v) { start(); setTimeout(shimmer, 60); }
  else stop();
}

/* ---------------- Sayfa bağlantıları ---------------- */

syncUI();
// Ses açık kaydedildiyse tarayıcı ilk dokunuşu bekler; motor o anda kurulur
if (on) {
  const wake = () => { removeEventListener('pointerdown', wake, true); removeEventListener('keydown', wake, true); if (on) start(); };
  addEventListener('pointerdown', wake, true);
  addEventListener('keydown', wake, true);
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const tog = t.closest<HTMLElement>('[data-sound-toggle]');
  if (tog) { e.preventDefault(); setSound(!on); return; }
  if (!on || !ctx) return;
  if (t.closest('[data-quote-add]')) clink();
  else if (t.closest('button, a, [role="button"], label')) click();
});

let lastHover: Element | null = null, lastHoverT = 0;
document.addEventListener('pointerover', (e) => {
  if (!on || !ctx || e.pointerType !== 'mouse') return;
  const el = (e.target as HTMLElement).closest('a, button, .cat, .pcard, .qcard, [role="button"]');
  if (!el || el === lastHover) return;
  lastHover = el;
  const t = performance.now();
  if (t - lastHoverT < 50) return;
  lastHoverT = t;
  tick();
});

addEventListener('aksoy:chapter', (e) => { if (on) whoosh((e as CustomEvent).detail?.dir ?? 1); });
addEventListener('aksoy:intro', () => { if (on) boom(); });
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else if (on) ctx.resume();
});
