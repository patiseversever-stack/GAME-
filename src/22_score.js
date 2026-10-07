
/* =====================================================================
   SKOR — ana oyunun kodla üretilen müziği (örnek ses yok)
   • Telli: Karplus–Strong fiziksel modeli (gerçek tel gibi titreşen gecikme
     hattı) ile kanun/ud tınısı; her nota bir kez hesaplanıp tampona yazılır.
   • Ney: sinüs + üçgen gövde, notanın perdesinde süzülmüş nefes, giriş
     "çiff"i, geç açılan titreşim ve notalar arası kayış.
   • Def ve zil: Türk usulleriyle (Düyek, Sofyan) vurmalı.
   • Pad: üç ince ayarlı testere, sağ/sol açılmış, nefes alan süzgeç.
   Düzen: 2 ölçüde bir akor, 8 ölçülük bölümler (A sade · B ezgi · C usul ·
   D durgun). Oyuncu ışıktaysa bas nabzı ve def öne çıkar, gölgedeyse ney
   söyler. Final/ejderha/patlamada usul güçlenir.
   ===================================================================== */
const SCORE_PAT = {
  akis: [0, 2, 1, 3, 2, 4, 3, 1], dalga: [0, 1, 2, 3, 4, 3, 2, 1], kanun: [0, 2, 4, 2, 1, 3, 4, 3],
  seyrek: [0, -1, 2, -1, 1, -1, 3, -1], cark: [0, 3, 1, 4, 2, 4, 1, 3],
};
// 8'lik vuruşlar: 1 düm · 2 tek · 3 ke (hafif)
const USUL = { duyek: [1, 0, 2, 2, 0, 1, 2, 0], sofyan: [1, 0, 0, 3, 2, 0, 3, 0], nim: [1, 3, 2, 0, 1, 0, 2, 3] };
const STYLE = [
  { pat: 'akis', br: 0.55, usul: 'sofyan', oct: 12 }, // Ege
  { pat: 'dalga', br: 0.62, usul: 'duyek', oct: 12 }, // Rüzgâr
  { pat: 'kanun', br: 0.5, usul: 'duyek', oct: 12 }, // Peri (Hicaz)
  { pat: 'seyrek', br: 0.7, usul: 'sofyan', oct: 24 }, // Tuz
  { pat: 'cark', br: 0.45, usul: 'nim', oct: 12 }, // İkiz
  { pat: 'seyrek', br: 0.78, usul: 'sofyan', oct: 24 }, // Buz
  { pat: 'kanun', br: 0.58, usul: 'duyek', oct: 12 }, // Ayna (Hüseyni)
  { pat: 'cark', br: 0.6, usul: 'nim', oct: 12 }, // Saat
  { pat: 'kanun', br: 0.45, usul: 'duyek', oct: 12 },
];
// ezgi ritmi (8'lik birimlerle): motif notaları bu sürelerle söylenir
const RHY = [[2, 1, 1, 2, 2, 1, 1, 4, 4], [3, 1, 2, 2, 1, 1, 2, 4, 4], [2, 2, 1, 1, 2, 2, 2, 4, 4]];
Object.assign(AudioEngine.prototype, {
  // müzik yolu: tel gövdesi (ud/kanun rezonansı) → müzik kanalı
  scoreBus() {
    if (this.plk) return this.plk;
    const c = this.ctx, b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), hs = c.createBiquadFilter();
    b1.type = 'peaking'; b1.frequency.value = 190; b1.Q.value = 1.1; b1.gain.value = 3.5;
    b2.type = 'peaking'; b2.frequency.value = 1150; b2.Q.value = 1.4; b2.gain.value = 2;
    hs.type = 'highshelf'; hs.frequency.value = 4200; hs.gain.value = -6;
    this.plk = c.createGain(); this.plk.gain.value = 1; this.plk.connect(b1); b1.connect(b2); b2.connect(hs); hs.connect(this.mus);
    return this.plk;
  },
  // Karplus–Strong: kesirli gecikme (allpass) ile doğru perde, istenen sönüm süresi
  ksBuf(midi, br) {
    const C = this.ksC || (this.ksC = new Map()), key = midi * 16 + Math.round(br * 15);
    let b = C.get(key); if (b) return b;
    const f = mtof(midi), sr = f > 520 ? 44100 : 22050, T60 = clamp(3.4 - (midi - 40) * 0.045, 0.8, 3.4), dur = Math.min(2.8, T60 * 0.85), N = Math.floor(sr * dur);
    b = this.ctx.createBuffer(1, N, sr); const d = b.getChannelData(0);
    const D = sr / f, L = Math.max(2, Math.floor(D - 0.5 - 0.15)), da = D - 0.5 - L, Ca = (1 - da) / (1 + da);
    const S = Math.min(0.99995, Math.pow(10, -3 / (T60 * f)) / Math.cos((PI * f) / sr));
    const line = new Float32Array(L); let lp = 0, mean = 0;
    // uyarım: süzülmüş gürültü + mızrap konumu (köprüye yakın çekim üst harmonikleri biçimlendirir)
    const k = 0.14 + br * 0.5; for (let i = 0; i < L; i++) { lp += (Math.random() * 2 - 1 - lp) * k; line[i] = lp; mean += lp; }
    mean /= L; const pk = Math.max(1, Math.round(L * (0.13 - br * 0.05)));
    const ex = line.slice(); for (let i = 0; i < L; i++) line[i] = (ex[i] - mean) - 0.6 * (ex[(i + pk) % L] - mean);
    let idx = 0, lpPrev = 0, apx = 0, apy = 0, peak = 1e-6;
    for (let n = 0; n < N; n++) {
      const out = line[idx], lpv = 0.5 * (out + lpPrev); lpPrev = out;
      const ap = Ca * lpv + apx - Ca * apy; apx = lpv; apy = ap;
      line[idx] = ap * S; d[n] = out; if (n < L * 3) peak = Math.max(peak, Math.abs(out));
      if (++idx === L) idx = 0;
    }
    const nrm = 0.8 / peak, fo = Math.floor(sr * 0.08), fi = Math.floor(sr * 0.0025); for (let n = 0; n < N; n++) d[n] *= nrm * (n > N - fo ? (N - n) / fo : 1) * (n < fi ? n / fi : 1);
    C.set(key, b); return b;
  },
  pluck(midi, t0, g, { br = 0.55, pan = 0, verb = 0.32, dly = 0 } = {}) {
    const c = this.ctx; t0 = Math.max(t0, c.currentTime);
    const s = c.createBufferSource(), gn = c.createGain(); s.buffer = this.ksBuf(midi, br); gn.gain.value = g; s.connect(gn);
    let out = gn; if (c.createStereoPanner && pan) { const p = c.createStereoPanner(); p.pan.value = pan; gn.connect(p); out = p; }
    out.connect(this.scoreBus());
    if (verb) { const v = c.createGain(); v.gain.value = verb; gn.connect(v); v.connect(this.verbMus); }
    if (dly) { const v = c.createGain(); v.gain.value = dly; gn.connect(v); v.connect(this.dlyIn); }
    s.start(t0);
  },
  // ney: nefesli, geç açılan titreşim, önceki notadan kayış
  ney(f, t0, dur, g, from = 0) {
    const c = this.ctx; t0 = Math.max(t0, c.currentTime); const end = t0 + dur + 0.5;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator(), vib = c.createOscillator(), vg = c.createGain(), lp = c.createBiquadFilter(), env = c.createGain();
    o1.type = 'sine'; o2.type = 'triangle'; o3.type = 'sine';
    for (const [o, mul] of [[o1, 1], [o2, 1], [o3, 2]]) { if (from) { o.frequency.setValueAtTime(from * mul, t0); o.frequency.exponentialRampToValueAtTime(f * mul, t0 + 0.085); } else o.frequency.setValueAtTime(f * mul, t0); }
    vib.frequency.value = 4.8 + Math.random() * 0.7; vg.gain.setValueAtTime(0, t0); vg.gain.linearRampToValueAtTime(0, t0 + Math.min(0.3, dur * 0.4)); vg.gain.linearRampToValueAtTime(f * 0.0075, t0 + Math.min(dur, 0.9));
    vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
    const g2 = c.createGain(); g2.gain.value = 0.2; const g3 = c.createGain(); g3.gain.value = 0.07;
    lp.type = 'lowpass'; lp.frequency.value = Math.min(5200, f * 5); lp.Q.value = 0.4;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); o3.connect(g3); g3.connect(lp);
    // nefes: perdede süzülen gürültü + üstte hava
    const ns = c.createBufferSource(); ns.buffer = this.noise; ns.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.8; const ng = c.createGain(); ng.gain.value = 0.5;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200; const hg = c.createGain(); hg.gain.value = 0.045;
    ns.connect(bp); bp.connect(ng); ng.connect(lp); ns.connect(hp); hp.connect(hg); hg.connect(env);
    lp.connect(env);
    const a = from ? 0.05 : 0.12;
    env.gain.setValueAtTime(0.0001, t0); env.gain.linearRampToValueAtTime(g, t0 + a); env.gain.linearRampToValueAtTime(g * 0.86, t0 + a + 0.2);
    env.gain.setValueAtTime(g * 0.86, t0 + Math.max(a + 0.2, dur - 0.05)); env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.28);
    env.connect(this.mus); const v = c.createGain(); v.gain.value = 0.62; env.connect(v); v.connect(this.verbMus); const dl = c.createGain(); dl.gain.value = 0.22; env.connect(dl); dl.connect(this.dlyIn);
    if (!from) this.noiseHit(t0, 0.07, g * 0.5, { type: 'bandpass', f: Math.min(4000, f * 3.2), q: 2.2, dest: this.mus });
    for (const o of [o1, o2, o3, vib]) { o.start(t0); o.stop(end); } ns.start(t0, Math.random()); ns.stop(end);
  },
  // def: düm (gövde) · tek (kenar) · ke (parmak)
  def(t0, kind, g) {
    if (kind === 1) { this.osc('sine', 86, t0, 0.34, 0.12 * g, this.mus, { a: 0.002, f1: 50 }); this.noiseHit(t0, 0.1, 0.035 * g, { type: 'lowpass', f: 520, dest: this.mus }); }
    else if (kind === 2) { this.noiseHit(t0, 0.075, 0.05 * g, { type: 'bandpass', f: 2300, q: 1.5, dest: this.mus }); this.osc('sine', 340, t0, 0.07, 0.03 * g, this.mus, { a: 0.001, f1: 300 }); }
    else this.noiseHit(t0, 0.04, 0.022 * g, { type: 'bandpass', f: 3400, q: 2.2, dest: this.mus });
  },
  zil(t0, g) { this.bell(mtof(98), t0, 1.5, 0.011 * g, { ratio: 3.42, index: 1.5, dest: this.mus, verb: 0.6 }); this.bell(mtof(105), t0 + 0.004, 1.2, 0.007 * g, { ratio: 2.76, index: 1.1, dest: this.mus, verb: 0.6 }); },
  // pad: her nota üç ince ayarlı testere (sol · orta · sağ), nefes alan süzgeç, altta yumuşak bas
  padChord(notes, t0, dur) {
    const c = this.ctx, m = MUSIC[this.chapter], f = c.createBiquadFilter(), g = c.createGain(); t0 = Math.max(t0, c.currentTime);
    const fc = 560 + m.bright * 300; f.type = 'lowpass'; f.Q.value = 0.6;
    f.frequency.setValueAtTime(fc * 0.55, t0); f.frequency.linearRampToValueAtTime(fc * 1.2, t0 + dur * 0.45); f.frequency.linearRampToValueAtTime(fc * 0.7, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.028, t0 + 2.4); g.gain.setValueAtTime(0.028, t0 + dur - 3); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    f.connect(g); g.connect(this.mus); const v = c.createGain(); v.gain.value = 0.85; g.connect(v); v.connect(this.verbMus);
    const pans = c.createStereoPanner ? [-0.65, 0, 0.65].map((p) => { const n = c.createStereoPanner(); n.pan.value = p; n.connect(f); return n; }) : [f, f, f];
    for (const n of notes) [-9, 1, 8].forEach((det, i) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = det + (Math.random() * 3 - 1.5);
      const og = c.createGain(); og.gain.value = i === 1 ? 0.16 : 0.22; o.connect(og); og.connect(pans[i]); o.start(t0); o.stop(t0 + dur + 0.1);
    });
    this.osc('sine', mtof(notes[0] - 12), t0, dur * 0.85, 0.045, this.mus, { a: 1.4 });
  },
  // bir sonraki notaların tamponlarını boş karelerde önceden hazırla (ilk çalışta takılma olmasın)
  warmScore(m, st) {
    if (this.ksWarmCh !== this.chapter) { this.ksWarmCh = this.chapter; if (this.ksC) this.ksC.clear(); this.ksWarm = []; for (const ch of m.chords) for (const n of ch) { this.ksWarm.push(n + st.oct, n + st.oct + 12, n - 12); } for (const s of m.scale) this.ksWarm.push(m.root + 12 + s, m.root + 24 + s); }
    if (this.ksWarm && this.ksWarm.length && (this.ksWarmN = (this.ksWarmN || 0) + 1) % 3 === 0) { const n = this.ksWarm.shift(); if (n > 24 && n < 110) this.ksBuf(n, st.br); }
  },
  // ana düzenleyici: 8'lik ızgara, ileriye bakarak kurar
  score(t, m, playing) {
    const md = this.mood || {}, st = STYLE[this.chapter] || STYLE[0], S = this.sc || (this.sc = { next: 0, step: 0, chord: m.chords[0], prevF: 0, mel: null });
    this.warmScore(m, st);
    const bpm = 64 + m.tempo * 38, e8 = 30 / bpm, tens = playing ? this.intensity : 0;
    if (S.next < t - 0.5) { S.next = t + 0.12; S.step = 0; }
    while (S.next < t + 0.25) {
      const bt = S.next, step = S.step++, pos = step % 8, bar = Math.floor(step / 8), sec = Math.floor(bar / 8) % 4; S.next = bt + e8;
      const sw = pos % 2 ? e8 * 0.08 : 0, hum = () => (Math.random() - 0.5) * 0.012, tt = bt + sw;
      // akor (2 ölçüde bir)
      if (pos === 0 && bar % 2 === 0) { S.chord = m.chords[this.chordIdx++ % m.chords.length]; this.padChord(S.chord, bt, e8 * 16 + 2.6); }
      const ch = S.chord, tones = ch.slice(1).concat([ch[1] + 12, ch[2] + 12]).sort((a, b) => a - b);
      // telli arpej
      const skip = [0.42, 0.14, 0.1, 0.72][sec] - tens * 0.15, pi = SCORE_PAT[st.pat][pos];
      if (pi >= 0 && Math.random() > skip) {
        const n = tones[pi % tones.length] + st.oct, acc = pos === 0 ? 1 : pos === 4 ? 0.85 : pos % 2 ? 0.62 : 0.75;
        this.pluck(n, tt + hum(), 0.085 * acc * (0.85 + Math.random() * 0.3) * (playing ? 1 : 0.85), { br: st.br, pan: ((pi % 5) / 4 - 0.5) * 0.9, verb: 0.3, dly: pos === 6 ? 0.18 : 0 });
      }
      // bas: B/C bölümlerinde ve ışıkta nabız
      if (pos === 0 || (pos === 4 && (sec === 1 || sec === 2 || tens > 0.3))) this.pluck(ch[0] - (ch[0] > 45 ? 12 : 0) + (pos === 4 && Math.random() < 0.5 ? 7 : 0), bt + 0.004, (pos === 0 ? 0.11 : 0.08) * (0.8 + tens * 0.4), { br: 0.32, verb: 0.12 });
      if (tens > 0.25 && pos % 2 === 0) this.osc('sine', mtof(ch[0] - 12), bt, e8 * 1.6, 0.05 * tens, this.mus, { a: 0.01, f1: mtof(ch[0] - 12) * 0.92 });
      // usul (def): C bölümü, ışık, final, patlama, ejderha
      const drum = Math.max(sec === 2 && playing ? 0.55 : 0, tens > 0.35 ? 0.45 + tens * 0.3 : 0, playing && (md.finale || md.flare > 0.2) ? (md.flare > 0.2 ? 1 : 0.7) : 0, playing && md.dragon ? 0.75 + (md.boss || 0) * 0.35 : 0);
      if (drum > 0.05) { const u = USUL[st.usul][pos]; if (u) this.def(tt + hum(), u, drum * (u === 1 ? 1 : 0.8)); }
      if (sec === 2 && pos === 0 && bar % 2 === 0) this.zil(bt, playing ? 1 : 0.7);
      // ejderha: alçak, uğursuz nabız
      if (playing && md.dragon && pos % 4 === 0) this.osc('triangle', mtof(ch[0] - 12), bt, e8 * 3.4, 0.03 + (md.boss || 0) * 0.04, this.mus, { a: 0.05, f1: mtof(ch[0] - 12) * 0.985 });
      // gölge serisi: üst çanlar
      if (playing && (md.streak || 0) >= 2 && pos % 2 === 1 && Math.random() < 0.4) this.bell(mtof(m.root + 36 + m.scale[(step * 3) % m.scale.length]), tt, 1.2, 0.011 + Math.min(0.011, md.streak * 0.002), { ratio: 3.0, index: 0.8, dest: this.mus, verb: 0.8 });
      // D bölümü: seyrek kristal çanlar
      if (sec === 3 && pos % 4 === 2 && Math.random() < 0.5) this.bell(mtof(m.root + 24 + m.scale[Math.floor(Math.random() * m.scale.length)]), tt, 1.8, 0.022, { ratio: 2.0, index: 1.0 * m.bright, dest: this.mus, verb: 0.7, dly: 0.5 });
      // ney: B ve C bölümlerinin başında, gölgede/sakinken
      if (pos === 0 && bar % 8 === 0 && (sec === 1 || sec === 2) && tens < 0.5) {
        const mot = MOTIFS[this.chapter % MOTIFS.length], rv = (this.motifN = (this.motifN || 0) + 1) % 3, rhy = RHY[rv], sc = m.scale, nn = sc.length;
        let at = bt, prevF = 0;
        mot.forEach((deg, i) => {
          const dd = rv === 1 ? (i === mot.length - 1 ? deg : deg + 1) : deg, o = Math.floor(dd / nn), id = ((dd % nn) + nn) % nn;
          const f = mtof(m.root + 12 + o * 12 + sc[id]), len = (rhy[i % rhy.length] || 2) * e8 * (i === mot.length - 1 ? 1.6 : 1);
          this.ney(f, at, len * 0.94, playing ? 0.04 : 0.034, i > 0 && Math.random() < 0.55 ? prevF : 0); prevF = f; at += len;
        });
      }
    }
  },
});
