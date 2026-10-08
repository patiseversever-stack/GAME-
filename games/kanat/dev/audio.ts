// KANAT audio lab (port 5186).
//  • Interactive: unlock on tap, audition every SFX, music worlds/layers, wind speed/bank/cloud.
//  • ?measure=1: renders every mix through OfflineAudioContext with the real master chain and
//    reports peak / true peak / RMS / LUFS / silence / NaN; also builds WAV previews.
//    Results: window.__audioReport, window.__audioPreviews (base64 WAV), window.__audioDone.
import { AudioEngine } from '../src/audio/AudioEngine.ts';
import { SoundBank } from '../src/audio/bank.ts';
import { Haptics } from '../src/audio/haptics.ts';
import { meter } from '../src/audio/measure.ts';
import { Mixer } from '../src/audio/mixer.ts';
import type { MeterReport } from '../src/audio/measure.ts';
import { MUSIC_WORLDS } from '../src/audio/music/patterns.ts';
import type { MusicWorld } from '../src/audio/music/patterns.ts';
import { SFX, SFX_IDS } from '../src/audio/sfxLib.ts';
import type { SfxId } from '../src/audio/sfxLib.ts';

const SR = 48000;
const params = new URLSearchParams(location.search);
const app = document.getElementById('app') as HTMLDivElement;
const status = document.getElementById('status') as HTMLDivElement;

interface Row extends MeterReport {
  name: string;
  kind: string;
  pass: boolean;
  note: string;
}

declare global {
  interface Window {
    __audioReport?: { rows: Row[]; bankMs: number; bankMB: number; renderMs: number };
    __audioPreviews?: Record<string, string>;
    __audioDone?: boolean;
    __audioError?: string;
  }
}

// ---------------------------------------------------------------------------------------------
// Offline rendering

type Step = (eng: AudioEngine, t: number) => void;

async function render(bank: SoundBank, sec: number, setup: (eng: AudioEngine) => void, step?: Step): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.round(sec * SR), SR);
  const eng = new AudioEngine({ bank, haptics: new Haptics({ sink: null }) });
  eng.attachContext(ctx, { instantMusic: true });
  setup(eng);
  eng.pump();
  const dt = 0.05;
  for (let k = 1; k * dt < sec - 0.01; k++) {
    const t = k * dt;
    ctx.suspend(t).then(() => {
      step?.(eng, t);
      eng.pump();
      void ctx.resume();
    });
  }
  const buf = await ctx.startRendering();
  eng.dispose();
  return buf;
}

function channels(buf: AudioBuffer): Float32Array[] {
  const out: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) out.push(buf.getChannelData(c));
  return out;
}

function judge(name: string, kind: string, m: MeterReport, opts: { minRms?: number } = {}): Row {
  const notes: string[] = [];
  let pass = true;
  if (m.peakDb > -1) {
    pass = false;
    notes.push('peak>-1');
  }
  if (m.truePeakDb > -1) {
    pass = false;
    notes.push('TP>-1');
  }
  if (m.nanCount > 0) {
    pass = false;
    notes.push('NaN');
  }
  if (m.clipCount > 0) {
    pass = false;
    notes.push('clip');
  }
  const minRms = opts.minRms ?? -75;
  if (m.minWindowRmsDb < minRms) {
    pass = false;
    notes.push(`silent<${minRms}`);
  }
  return { ...m, name, kind, pass, note: notes.join(' ') };
}

function wav(buf: AudioBuffer): string {
  const ch = channels(buf);
  const n = ch[0].length;
  const nc = ch.length;
  const bytes = 44 + n * nc * 2;
  const dv = new DataView(new ArrayBuffer(bytes));
  const w4 = (o: number, s: string) => {
    for (let i = 0; i < 4; i++) dv.setUint8(o + i, s.charCodeAt(i));
  };
  w4(0, 'RIFF');
  dv.setUint32(4, bytes - 8, true);
  w4(8, 'WAVE');
  w4(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, nc, true);
  dv.setUint32(24, buf.sampleRate, true);
  dv.setUint32(28, buf.sampleRate * nc * 2, true);
  dv.setUint16(32, nc * 2, true);
  dv.setUint16(34, 16, true);
  w4(36, 'data');
  dv.setUint32(40, n * nc * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      const v = Math.max(-1, Math.min(1, ch[c][i]));
      dv.setInt16(o, Math.round(v * 32767), true);
      o += 2;
    }
  }
  const u8 = new Uint8Array(dv.buffer);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

const ONE_SHOTS = SFX_IDS.filter((id) => !SFX[id].loop);

async function measureAll(): Promise<void> {
  const t0 = performance.now();
  const bank = new SoundBank();
  bank.generateSync();
  const bankMs = performance.now() - t0;
  const bankMB = bank.bytes() / 1048576;
  const rows: Row[] = [];
  const push = (r: Row) => {
    rows.push(r);
    status.textContent = `ölçülüyor… ${rows.length} (${r.name})`;
  };

  // A. Wind at several speeds (never silent).
  const winds: [string, number, number, number, boolean][] = [
    ['wind 0 m/s (dinlenme)', 0, 0, 0, false],
    ['wind 15 m/s', 15, 0, 0, false],
    ['wind 30 m/s', 30, 0, 0, false],
    ['wind 45 m/s (162 km/s)', 45, 0, 0, false],
    ['wind 55 m/s (198 km/s)', 55, 0, 0, false],
    ['wind 65 m/s', 65, 0, 0, false],
    ['wind 75 m/s (270 km/s)', 75, 0, 0, false],
    ['wind 55 + yatış 2.5 rad/s', 55, 2.5, 0, false],
    ['wind 50 bulut içi', 50, 0.5, 1, false],
    ['wind 9 kanopi', 9, 0.3, 0, true],
  ];
  for (const [name, v, br, cloud, canopy] of winds) {
    const buf = await render(bank, 4, (e) => e.setFlight({ speedMs: v, bankRate: br, inCloud: cloud, canopy, phase: canopy ? 'canopy' : 'flying', prox: 40 }));
    push(judge(name, 'wind', meter(channels(buf), SR, 0.4, 0.3), { minRms: -60 }));
  }

  // B. Every one-shot SFX over the resting wind bed.
  for (const id of ONE_SHOTS) {
    const p = bank.get(id);
    const len = p ? p.ch[0].length / p.sr : 1;
    const buf = await render(bank, Math.max(0.6, len + 0.35), (e) => e.play(id as SfxId));
    push(judge(id, 'sfx', meter(channels(buf), SR)));
  }

  // B2. Loops / beds through their gameplay triggers.
  const beds: [string, (e: AudioEngine) => void][] = [
    ['thermalHum (termal)', (e) => e.event({ type: 'thermalEnter', tick: 0, index: 0 })],
    ['storm (fırtına)', (e) => { e.music.setWorld('suru'); e.music.setIntensity(0, 0, 0); e.event({ type: 'stormStart' }); }],
    ['murmur 400 kuş sıkı', (e) => { e.music.setWorld('suru'); e.music.setIntensity(0, 0, 0); e.suru.setState({ flockSize: 400, density: 0.9, tight: true, timeFrac: 0.3 }); }],
  ];
  for (const [name, fn] of beds) {
    const buf = await render(bank, 5, fn);
    push(judge(name, 'bed', meter(channels(buf), SR, 0.4, 0.5)));
  }

  // C. Music: every theme with all layers (K0..K3) for 8 s.
  for (const w of MUSIC_WORLDS) {
    if (w === 'suru') continue;
    const buf = await render(bank, 8, (e) => {
      e.music.setWorld(w as MusicWorld);
      e.music.setIntensity(1, 1, 1);
    });
    push(judge(`music ${w} K0-K3`, 'music', meter(channels(buf), SR, 0.4, 0.2)));
  }
  for (const [frac, label] of [
    [0.2, 'majör'],
    [0.6, 'yumuşak minör'],
    [0.95, 'mavi saat'],
  ] as const) {
    const buf = await render(bank, 8, (e) => {
      e.music.setWorld('suru');
      e.music.setIntensity(1, 1, 1);
      e.suru.setState({ flockSize: 300, density: 0.6, timeFrac: frac, tight: false });
    });
    push(judge(`music suru ${label}`, 'music', meter(channels(buf), SR, 0.4, 0.2)));
  }
  {
    const buf = await render(bank, 8, (e) => {
      e.music.setWorld('kapadokya', { calm: true });
    });
    push(judge('music kapadokya sakin (Serbest Uçuş)', 'music', meter(channels(buf), SR, 0.4, 0.2)));
  }

  // D. Stress: everything at once over max wind + full music.
  {
    const buf = await render(
      bank,
      6,
      (e) => {
        e.music.setWorld('kapadokya');
        e.music.setIntensity(1, 1, 1);
        e.setFlight({ speedMs: 75, bankRate: 2.5, phase: 'flying', prox: 3, mult: 5, combo: 3 });
      },
      (e, t) => {
        if (Math.abs(t - 1.0) < 0.01) {
          e.event({ type: 'graze', tick: 0, points: 250, strength: 1, pos: [0, 0, 0], cls: 'rock', side: 1 });
          e.event({ type: 'multUp', tick: 0, mult: 5 });
          e.event({ type: 'gate', tick: 0, index: 1, points: 100, chain: 4 });
          e.event({ type: 'balloonThread', tick: 0, a: 0, b: 1, points: 500, mult: 3 });
          e.event({ type: 'star', index: 2 });
          e.event({ type: 'wingsOpen', tick: 0 });
          e.event({ type: 'closePass', cls: 'tree', side: -1, d: 1 });
        }
        if (Math.abs(t - 3.0) < 0.01) e.event({ type: 'crash', tick: 0, pos: [0, 0, 0], cls: 'rock' });
      },
    );
    push(judge('STRES: rüzgâr 75 + müzik K3 + 7 SFX + çarpma', 'stress', meter(channels(buf), SR)));
  }
  {
    // Same burst with every slider at 100 % (worst case for the limiter).
    const buf = await render(
      bank,
      4,
      (e) => {
        e.setVolumes({ master: 1, music: 1, sfx: 1 });
        e.music.setWorld('likya');
        e.music.setIntensity(1, 1, 1);
        e.setFlight({ speedMs: 75, bankRate: -2.5, phase: 'flying', prox: 2, mult: 5, combo: 3, proxCls: 'water', proxSide: 1 });
      },
      (e, t) => {
        if (Math.abs(t - 1.0) < 0.01) {
          for (const type of ['graze', 'balloonThread', 'parachuteOpen', 'crash']) e.event({ type, strength: 1, side: -1, cls: 'rock', chain: 5, mult: 5 });
          e.event({ type: 'multUp', mult: 5 });
          e.event({ type: 'gate', chain: 5 });
          e.event({ type: 'star', index: 3 });
          e.event({ type: 'kusatma' });
          e.event({ type: 'roundEnd', win: true });
        }
      },
    );
    push(judge('STRES %100 ses: 9 olay aynı anda', 'stress', meter(channels(buf), SR)));
  }
  {
    const buf = await render(
      bank,
      6,
      (e) => {
        e.music.setWorld('suru');
        e.music.setIntensity(1, 1, 1);
        e.suru.setState({ flockSize: 500, density: 1, tight: true, timeFrac: 0.7 });
        e.event({ type: 'stormStart' });
      },
      (e, t) => {
        if (Math.abs(t - 0.5) < 0.01) {
          e.event({ type: 'kusatma', pan: 0.3 });
          e.event({ type: 'hawkWarn', pan: -0.5 });
          e.event({ type: 'gustWarn', pan: 0.6 });
          e.event({ type: 'sunsetBell' });
          e.event({ type: 'suruConvert', count: 80 });
        }
      },
    );
    push(judge('STRES SÜRÜ: kuşatma + doğan + rüzgâr + fırtına + çan', 'stress', meter(channels(buf), SR)));
  }

  // D2. Limiter torture: +6 dBFS sine + +3 dBFS noise bursts straight into the master bus.
  for (const os of ['none', '2x'] as const) {
    const sec = 2;
    const ctx = new OfflineAudioContext(2, sec * SR, SR);
    const mx = new Mixer(ctx, null);
    mx.setVolumes({ master: 1, music: 1, sfx: 1, muted: false });
    const osc = ctx.createOscillator();
    osc.frequency.value = 997;
    const g = ctx.createGain();
    g.gain.value = 2.0;
    osc.connect(g).connect(mx.masterIn);
    osc.start(0);
    const nb = ctx.createBuffer(1, sec * SR, SR);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * ((i / SR) % 0.5 < 0.1 ? 1.41 : 0.1);
    const ns = ctx.createBufferSource();
    ns.buffer = nb;
    ns.connect(mx.masterIn);
    ns.start(0);
    void os;
    const buf = await ctx.startRendering();
    push(judge('LİMİTÖR işkence: +6 dBFS sinüs + +3 dBFS gürültü', 'limiter', meter(channels(buf), SR)));
    break;
  }

  // E. Previews: three themes with layers entering every 6 s.
  const previews: Record<string, string> = {};
  for (const w of ['kapadokya', 'likya', 'suru'] as MusicWorld[]) {
    const buf = await render(
      bank,
      24,
      (e) => {
        e.music.setWorld(w);
        e.music.setIntensity(0, 0, 0);
        if (w === 'suru') e.suru.setState({ flockSize: 200, density: 0.5, timeFrac: 0.1 });
      },
      (e, t) => {
        if (Math.abs(t - 6) < 0.01) e.music.setIntensity(1, 0, 0);
        if (Math.abs(t - 12) < 0.01) e.music.setIntensity(1, 1, 0);
        if (Math.abs(t - 18) < 0.01) e.music.setIntensity(1, 1, 1);
      },
    );
    push(judge(`preview ${w} (K0→K3, 24 s)`, 'preview', meter(channels(buf), SR, 0.4, 0.2)));
    previews[w] = wav(buf);
  }

  // F. Flight demo (§1 film rhythm compressed): jump → wings → close passes → ×5 → gate → balloon
  //    → thermal → parachute → soft landing → stars. Exercises setFlight, fly-by detection, ducking.
  {
    const dips: [number, number, 'rock' | 'tree' | 'water', number][] = [
      [4.0, 2.5, 'rock', -1],
      [5.0, 3.5, 'tree', 1],
      [6.0, 1.2, 'rock', 1],
      [7.0, 4.0, 'water', -1],
    ];
    const f = { speedMs: 0, bankRate: 0, prox: 30, proxCls: 'none' as 'none' | 'rock' | 'tree' | 'water', proxSide: 0, mult: 0, combo: 1, inCloud: 0, canopy: false, phase: 'intro' as 'intro' | 'jump' | 'flying' | 'canopy' | 'landed' };
    const at = (t: number, x: number) => Math.abs(t - x) < 0.01;
    const buf = await render(
      bank,
      18,
      (e) => {
        e.music.setWorld('kapadokya');
        e.setFlight(f);
      },
      (e, t) => {
        if (t >= 1.0 && t < 12) {
          f.phase = t < 2.5 ? 'jump' : 'flying';
          f.speedMs = Math.min(56, (t - 1.0) * 16);
        }
        let d = 30;
        for (const [tc, dmin, cls, side] of dips) {
          const v = dmin + 30 * Math.abs(t - tc);
          if (v < d) {
            d = v;
            f.proxCls = cls;
            f.proxSide = side;
          }
        }
        f.prox = d;
        f.bankRate = Math.sin(t * 1.3) * 1.2;
        f.mult = t > 6.5 && t < 11 ? 5 : t > 5 ? 3 : t > 4 ? 2 : t > 3.5 ? 1 : 0;
        f.combo = t > 5.5 && t < 11 ? 2 : 1;
        if (t >= 12 && t < 15) {
          f.phase = 'canopy';
          f.canopy = true;
          f.speedMs = Math.max(9, f.speedMs - 3);
        }
        if (t >= 15) {
          f.phase = 'landed';
          f.speedMs = 0;
          f.canopy = false;
        }
        e.setFlight(f);
        if (at(t, 1.0)) e.event({ type: 'jump' });
        if (at(t, 1.8)) e.event({ type: 'wingsOpen', tick: 0 });
        if (at(t, 3.6)) e.event({ type: 'multUp', tick: 0, mult: 1 });
        if (at(t, 4.1)) e.event({ type: 'multUp', tick: 0, mult: 2 });
        if (at(t, 5.1)) e.event({ type: 'multUp', tick: 0, mult: 3 });
        if (at(t, 6.0)) e.event({ type: 'graze', tick: 0, points: 250, strength: 0.9, pos: [0, 0, 0], cls: 'rock', side: 1 });
        if (at(t, 6.5)) e.event({ type: 'multUp', tick: 0, mult: 5 });
        if (at(t, 7.5)) e.event({ type: 'gate', tick: 0, index: 1, points: 100, chain: 2 });
        if (at(t, 8.3)) e.event({ type: 'balloonThread', tick: 0, a: 0, b: 1, points: 500, mult: 5 });
        if (at(t, 9.2)) e.event({ type: 'thermalEnter', tick: 0, index: 0 });
        if (at(t, 10.6)) e.event({ type: 'thermalExit', tick: 0, index: 0 });
        if (at(t, 11.0)) e.event({ type: 'comboBreak', tick: 0 });
        if (at(t, 11.4)) e.event({ type: 'enterLandingZone', tick: 0 });
        if (at(t, 12.0)) e.event({ type: 'parachuteOpen', tick: 0, heightAGL: 120, auto: false });
        if (at(t, 15.0)) e.event({ type: 'landed', tick: 0, distToTarget: 1, soft: true, points: 300 });
        if (at(t, 16.0)) e.event({ type: 'star', index: 0 });
        if (at(t, 16.5)) e.event({ type: 'star', index: 1 });
        if (at(t, 17.0)) e.event({ type: 'star', index: 2 });
      },
    );
    push(judge('UÇUŞ DEMO 18 s (olay + yakın geçiş zinciri)', 'demo', meter(channels(buf), SR)));
    previews['ucus-demo'] = wav(buf);
  }

  window.__audioReport = { rows, bankMs, bankMB, renderMs: performance.now() - t0 };
  window.__audioPreviews = previews;
  window.__audioDone = true;
  renderTable(rows);
  const fails = rows.filter((r) => !r.pass).length;
  status.textContent = `bitti: ${rows.length} ölçüm, ${fails} başarısız · bank ${bankMs.toFixed(0)} ms / ${bankMB.toFixed(1)} MB`;
}

function renderTable(rows: Row[]): void {
  const f = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : String(x));
  const t = document.createElement('table');
  t.innerHTML =
    '<tr><th>ölçüm</th><th>peak dBFS</th><th>TP dBFS</th><th>RMS</th><th>LUFS</th><th>max M</th><th>min pencere</th><th>NaN</th><th>sonuç</th></tr>' +
    rows
      .map(
        (r) =>
          `<tr><td>${r.name}</td><td>${f(r.peakDb)}</td><td>${f(r.truePeakDb)}</td><td>${f(r.rmsDb)}</td><td>${f(r.lufs)}</td><td>${f(r.maxMomentaryLufs)}</td><td>${f(r.minWindowRmsDb)}</td><td>${r.nanCount}</td><td class="${r.pass ? 'pass' : 'fail'}">${r.pass ? 'OK' : r.note}</td></tr>`,
      )
      .join('');
  app.appendChild(t);
}

// ---------------------------------------------------------------------------------------------
// Interactive lab

function interactive(): void {
  const eng = new AudioEngine();
  (window as unknown as { __audioEngine: AudioEngine }).__audioEngine = eng;
  void eng.prepare((k) => (status.textContent = `ses üretiliyor… ${(k * 100).toFixed(0)}%`)).then(() => {
    status.textContent = `hazır · ${JSON.stringify(eng.stats())} — dokun/tıkla: ses açılır`;
  });
  eng.installAutoLifecycle();
  eng.setHapticSink((p, name) => console.log('haptic', name, p));
  const flight = { speedMs: 0, bankRate: 0, prox: 40, mult: 1, combo: 1, inCloud: 0, canopy: false, phase: 'flying' as const };
  let flying = false;
  const tick = () => {
    if (flying) eng.setFlight(flight);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const section = (title: string) => {
    const h = document.createElement('h2');
    h.textContent = title;
    app.appendChild(h);
    const d = document.createElement('div');
    d.className = 'row';
    app.appendChild(d);
    return d;
  };
  const btn = (parent: HTMLElement, label: string, fn: (b: HTMLButtonElement) => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => {
      void eng.unlock();
      fn(b);
    };
    parent.appendChild(b);
    return b;
  };
  const slider = (parent: HTMLElement, label: string, min: number, max: number, step: number, val: number, fn: (v: number) => void) => {
    const l = document.createElement('label');
    l.textContent = label;
    const i = document.createElement('input');
    i.type = 'range';
    i.min = String(min);
    i.max = String(max);
    i.step = String(step);
    i.value = String(val);
    i.oninput = () => fn(Number(i.value));
    parent.append(l, i);
  };

  const w = section('Rüzgâr');
  btn(w, 'uçuş girdisi aç/kapa', (b) => {
    flying = !flying;
    b.classList.toggle('on', flying);
  });
  slider(w, 'hız m/s', 0, 80, 1, 0, (v) => (flight.speedMs = v));
  slider(w, 'yatış hızı', -3, 3, 0.1, 0, (v) => (flight.bankRate = v));
  slider(w, 'bulut', 0, 1, 0.05, 0, (v) => (flight.inCloud = v));
  slider(w, 'yakınlık m', 0.5, 20, 0.1, 40, (v) => (flight.prox = v));

  const m = section('Müzik');
  for (const id of MUSIC_WORLDS) btn(m, id, () => eng.music.setWorld(id as MusicWorld));
  btn(m, 'müzik yok', () => eng.music.setWorld(null));
  btn(m, 'K1', () => eng.music.setIntensity(1, 0, 0));
  btn(m, 'K1+K2', () => eng.music.setIntensity(1, 1, 0));
  btn(m, 'K1+K2+K3', () => eng.music.setIntensity(1, 1, 1));
  btn(m, 'yalnız K0', () => eng.music.setIntensity(0, 0, 0));
  btn(m, 'otomatik', () => eng.music.clearIntensity());
  btn(m, 'sakin', (b) => {
    eng.music.setCalm(!eng.music.calm);
    b.classList.toggle('on', eng.music.calm);
  });
  slider(m, 'SÜRÜ timeFrac', 0, 1, 0.01, 0, (v) => eng.suru.setState({ timeFrac: v }));
  slider(m, 'sürü boyu', 1, 600, 1, 16, (v) => eng.suru.setState({ flockSize: v }));

  const s = section('SFX (play)');
  for (const id of ONE_SHOTS) btn(s, id, () => eng.play(id as SfxId));

  const e = section('Olaylar (event)');
  const evs: Record<string, object> = {
    wingsOpen: { tick: 0 },
    multUp1: { type: 'multUp', mult: 1 },
    multUp2: { type: 'multUp', mult: 2 },
    multUp3: { type: 'multUp', mult: 3 },
    multUp5: { type: 'multUp', mult: 5 },
    comboBreak: {},
    graze: { strength: 1, side: 1, cls: 'rock' },
    gate: { chain: 3 },
    thermalEnter: {},
    thermalExit: {},
    balloonThread: {},
    parachuteOpen: {},
    landed: { soft: true },
    crash: { cls: 'rock' },
    restart: {},
    star: { index: 1 },
    kusatma: {},
    hawkWarn: { pan: -0.6 },
    gustWarn: { pan: 0.6 },
    stormStart: {},
    stormEnd: {},
    sunsetBell: {},
    roundEnd: { win: true },
  };
  for (const [k, v] of Object.entries(evs)) btn(e, k, () => eng.event({ type: k.replace(/\d$/, ''), ...v } as { type: string }));

  const v = section('Ses düzeyleri');
  slider(v, 'ana', 0, 1, 0.01, 0.9, (x) => eng.setVolumes({ master: x }));
  slider(v, 'müzik', 0, 1, 0.01, 0.7, (x) => eng.setVolumes({ music: x }));
  slider(v, 'efekt', 0, 1, 0.01, 0.9, (x) => eng.setVolumes({ sfx: x }));
  btn(v, 'sessiz', (b) => {
    const on = !b.classList.contains('on');
    b.classList.toggle('on', on);
    eng.setVolumes({ muted: on });
  });
}

if (params.get('measure') === '1') {
  measureAll().catch((err: unknown) => {
    window.__audioError = String(err instanceof Error ? err.stack : err);
    status.textContent = `hata: ${window.__audioError}`;
    window.__audioDone = true;
  });
} else {
  interactive();
}
