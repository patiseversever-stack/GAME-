// Kahvehane sazı — tamamen sentez, dosya yok.
// Enstrümanlar: ud ve kanun (Karplus-Strong tel modeli, çift tel, gövde rezonansı), ney (nefesli; vibrato ve
// notalar arası kayış), def (düm / tek), dem (makamın durak sesinde alçak bir yatak).
// Ezgiler makam seyrine göre üretilir: durak ve güçlü çevresinde adım adım ilerleyen cümleler, yarım kalış güçlüde,
// tam kalış durakta. İki ruh hali: menüde rubato taksim (ney + ud, ritimsiz), oyunda dikkat dağıtmayan hafif bir
// oyun havası (ud + kanun cevabı + def usulü). Birkaç cümlede bir makam değişir.
//
// Arayüz eski müzik sınıfıyla aynıdır: start(volume, mood) / setVolume / duck / stop / playing.

// Makamlar: dizinin cent değerleri (durak = 0), durak frekansı (Hz) ve güçlü perdenin dizideki yeri.
const MAKAMS = {
  hicaz: { name: 'Hicaz', root: 110, cents: [0, 113, 384, 498, 702, 882, 996], strong: 3 },
  ussak: { name: 'Uşşak', root: 110, cents: [0, 150, 294, 498, 702, 792, 996], strong: 3 },
  rast: { name: 'Rast', root: 98, cents: [0, 204, 384, 498, 702, 906, 1088], strong: 4 },
  nihavend: { name: 'Nihavend', root: 98, cents: [0, 204, 294, 498, 702, 792, 996], strong: 4 },
  kurdi: { name: 'Kürdi', root: 110, cents: [0, 90, 294, 498, 702, 792, 996], strong: 3 },
};
const ORDER = ['hicaz', 'ussak', 'rast', 'nihavend', 'kurdi'];

// Ritim hücreleri (vuruş cinsinden); toplamları 4 vuruş = bir ölçü
const CELLS = [
  [1, 1, 2],
  [0.5, 0.5, 1, 2],
  [1.5, 0.5, 2],
  [0.5, 0.5, 0.5, 0.5, 2],
  [1, 0.5, 0.5, 2],
  [2, 1, 1],
  [1, 1, 1, 1],
  [0.75, 0.25, 1, 2],
];
// Usuller: [vuruş, tür] — d: düm, t: tek, k: ke (hafif tek)
const USUL = {
  sofyan: { beats: 4, hits: [[0, 'd'], [1.5, 'k'], [2, 't'], [3, 't'], [3.5, 'k']] },
  duyek: { beats: 4, hits: [[0, 'd'], [0.5, 'k'], [1, 't'], [2, 'd'], [2.5, 'k'], [3, 't'], [3.5, 'k']] },
};

const hz = (root, cents) => root * Math.pow(2, cents / 1200);

export class Music {
  constructor(ctx, out, rand = Math.random) {
    this.ctx = ctx;
    this.out = out;
    this.rand = rand;
    this.playing = false;
    this.mood = 'game';
    this.timer = 0;
    this.pluckCache = new Map();
    this.live = new Set();

    this.root = ctx.createGain();
    this.root.gain.value = 0;
    this.root.connect(out);
    // oda yankısı (kısa, sıcak kahvehane salonu)
    this.rev = ctx.createConvolver();
    this.rev.buffer = this._impulse(2.2, 2.6);
    this.revGain = ctx.createGain();
    this.revGain.gain.value = 0.42;
    this.rev.connect(this.revGain).connect(this.root);
    this.dry = ctx.createGain();
    this.dry.gain.value = 0.9;
    this.dry.connect(this.root);

    // enstrüman kanalları: gövde rezonansı + konum
    this.udBus = this._bus([
      ['peaking', 190, 1.1, 5],
      ['peaking', 1100, 1.4, -3],
      ['lowpass', 4200, 0.7, 0],
    ], -0.18, 0.95);
    this.kanunBus = this._bus([
      ['peaking', 520, 1, 3],
      ['highshelf', 3000, 0.7, 2],
      ['lowpass', 7600, 0.7, 0],
    ], 0.3, 0.55);
    this.neyBus = this._bus([['peaking', 900, 0.8, 2]], 0.06, 0.62, 0.65);
    this.defBus = this._bus([['lowpass', 5200, 0.7, 0]], -0.05, 0.6, 0.2);
    this.demBus = this._bus([['lowpass', 520, 0.6, 0]], 0, 0.5, 0.5);
  }

  // ───────────── genel arayüz ─────────────
  start(volume = 1, mood = this.mood) {
    if (mood !== this.mood) {
      this.mood = mood;
      if (this.playing) this._restartFlow();
    }
    if (this.playing) return this.setVolume(volume);
    this.playing = true;
    const t = this.ctx.currentTime;
    this.root.gain.cancelScheduledValues(t);
    this.root.gain.setValueAtTime(this.root.gain.value, t);
    this.root.gain.linearRampToValueAtTime(this._level(volume), t + 3);
    this.volume = volume;
    this._restartFlow();
    this._tick();
  }

  setVolume(v) {
    this.volume = v;
    const t = this.ctx.currentTime;
    this.root.gain.cancelScheduledValues(t);
    this.root.gain.setTargetAtTime(this._level(v), t, 0.3);
  }

  duck(amount = 0.45, seconds = 1.4) {
    const t = this.ctx.currentTime;
    const cur = this.root.gain.value;
    this.root.gain.cancelScheduledValues(t);
    this.root.gain.setValueAtTime(cur, t);
    this.root.gain.linearRampToValueAtTime(cur * amount, t + 0.15);
    this.root.gain.linearRampToValueAtTime(cur, t + seconds);
  }

  stop(fade = 1.2) {
    if (!this.playing) return;
    this.playing = false;
    clearTimeout(this.timer);
    const t = this.ctx.currentTime;
    this.root.gain.cancelScheduledValues(t);
    this.root.gain.setValueAtTime(this.root.gain.value, t);
    this.root.gain.linearRampToValueAtTime(0, t + fade);
    const nodes = [...this.live];
    this.live.clear();
    this.dem = null;
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.stop?.();
          n.disconnect?.();
        } catch {}
      }
    }, fade * 1000 + 150);
  }

  // Zafer cümlesi: o an çalan makamda kanun glisandosu (dizi boyunca yukarı) ve ud'un durakta tremololu kalışı.
  // Yeni ezgi bir nefes sonra başlar.
  flourish() {
    if (!this.playing) return;
    const m = MAKAMS[this.makam];
    const t = this.ctx.currentTime + 0.05;
    for (let i = 0; i <= 8; i++) this._pluck(this.kanunBus, t + i * 0.045, this._freq(m, i, 2), 0.2 + i * 0.012, 'kanun');
    const top = t + 9 * 0.045;
    this._pluck(this.kanunBus, top, this._freq(m, 7, 2), 0.3, 'kanun');
    this._pluck(this.kanunBus, top + 0.01, this._freq(m, 4, 2), 0.18, 'kanun');
    const land = top + 0.42;
    for (const [deg, g] of [
      [0, 0.38],
      [m.strong, 0.22],
      [7, 0.2],
    ])
      this._pluck(this.udBus, land, this._freq(m, deg, 1), g, 'ud');
    for (let k = 1; k < 10; k++) this._pluck(this.udBus, land + k * 0.1, this._freq(m, 0, 1), 0.16 * Math.pow(0.88, k), 'ud');
    this.cursor = Math.max(this.cursor, land + 2.6);
  }

  // Seviye atlama: kanunda yükselen şedd (glissando), tepede tremolo, def düm-tek-tek-düm, ud ve ney ile kalış.
  // Müzik kapalıyken de çalabilmesi için bağımsız örnekte (stinger) kullanılır; dönen süre sn.
  fanfare(makam = 'rast') {
    const m = MAKAMS[makam] || MAKAMS.rast;
    const t = this.ctx.currentTime + 0.06;
    // 1) dolum: alt bölgeden tepeye hızlanan şedd (halka dolarken)
    const N = 14;
    let x = t;
    for (let i = 0; i <= N; i++) {
      this._pluck(this.kanunBus, x, this._freq(m, i, 1), 0.13 + i * 0.008, 'kanun');
      x += 0.085 - i * 0.0042;
    }
    // 2) patlama: tepe notada tremolo + alt oktav, def düm
    const top = t + 1.12;
    this._dum(top, 0.5);
    for (let k = 0; k < 9; k++) this._pluck(this.kanunBus, top + k * 0.06, this._freq(m, 7, 2), 0.24 * Math.pow(0.9, k), 'kanun');
    this._pluck(this.kanunBus, top + 0.01, this._freq(m, 0, 1), 0.2, 'kanun');
    this._pluck(this.udBus, top, this._freq(m, 0, 1), 0.34, 'ud');
    // 3) cevap: iniş cümlesi ve kalış (tek-tek-düm)
    const seq = [6, 5, 4, 2, 3, 1, 0];
    seq.forEach((d, i) => this._pluck(this.kanunBus, top + 0.62 + i * 0.12, this._freq(m, d, 2), 0.2, 'kanun'));
    this._tek(top + 0.62, 0.3);
    this._tek(top + 0.86, 0.26);
    const land = top + 0.62 + seq.length * 0.12 + 0.08;
    this._dum(land, 0.45);
    for (const [deg, g] of [
      [0, 0.36],
      [m.strong, 0.2],
      [7, 0.18],
    ])
      this._pluck(this.udBus, land, this._freq(m, deg, 1), g, 'ud');
    this._ney(land + 0.02, 1.5, this._freq(m, 7, 1), 0.2);
    for (let k = 1; k < 8; k++) this._pluck(this.kanunBus, land + k * 0.09, this._freq(m, 7, 2), 0.1 * Math.pow(0.85, k), 'kanun');
    return land + 1.6 - this.ctx.currentTime;
  }

  // menü taksimi biraz daha belirgin; oyunda efektlerin altında kalır
  _level(v) {
    return (this.mood === 'menu' ? 0.3 : 0.22) * v;
  }

  // ───────────── akış: bölümler ve zamanlayıcı ─────────────
  _restartFlow() {
    const t = this.ctx.currentTime + 0.2;
    this.cursor = Math.max(this.cursor || 0, t);
    this.queue = [];
    this.section = 0;
    if (!this.makam) this.makam = ORDER[(this.rand() * ORDER.length) | 0];
    this.periods = 0;
    this._demStart();
  }

  _tick() {
    if (!this.playing) return;
    const now = this.ctx.currentTime;
    // kuyruk 2 sn'den kısa kalınca sıradaki bölümü üret
    while (this.cursor < now + 2.2) this.cursor = this._compose(Math.max(this.cursor, now + 0.1));
    this.timer = setTimeout(() => this._tick(), 120);
  }

  // Bir bölüm üretip zamanlar; bölümün bitiş zamanını döndürür.
  _compose(t) {
    this.periods++;
    // makam değişimi: menüde her 4 taksimde bir, oyunda her döngü başında (taksimle yeni makama geçilir)
    if (this.mood === 'menu' ? this.periods % 4 === 0 : this.section % 5 === 0 && this.periods > 1) this._nextMakam(t);
    const m = MAKAMS[this.makam];
    if (this.mood === 'menu') return this._taksim(t, m, this.periods % 2 === 1 ? 'ney' : 'ud');
    // oyun: taksim → A (ud) → A′ (ud, kalışı değişir, kanun cevaplar) → B (kanun, üst bölge) → A (ney), döngü.
    // Motifin tekrar edip dönmesi ezgiyi akılda tutar.
    const step = this.section++ % 5;
    if (step === 0) {
      this.motif = null;
      this.usul = this.rand() < 0.6 ? USUL.sofyan : USUL.duyek;
      this.bpm = 72 + ((this.rand() * 12) | 0);
      return this._taksim(t, m, 'ud', 0.8);
    }
    const beat = 60 / this.bpm;
    const plan = [null, ['ud', 'none'], ['ud', 'first'], ['kanun', 'high'], ['ney', 'all']][step];
    const end = this._period(t, beat, m, plan[0], plan[1]);
    for (let x = t; x < end - 0.01; x += this.usul.beats * beat) this._usul(x, beat, this.usul, step === 4 ? 0.5 : step === 3 ? 0.7 : 0.85);
    return end;
  }

  _nextMakam(t) {
    const i = ORDER.indexOf(this.makam);
    this.makam = ORDER[(i + 1 + ((this.rand() * (ORDER.length - 1)) | 0)) % ORDER.length];
    this._demStart(t);
  }

  // ───────────── ezgi ─────────────
  // Dizideki derece → frekans (dereceler oktavı aşabilir)
  _freq(m, deg, oct = 1) {
    const n = m.cents.length;
    const o = Math.floor(deg / n);
    const d = ((deg % n) + n) % n;
    return hz(m.root * Math.pow(2, oct), m.cents[d] + 1200 * o);
  }

  // Seyir: hedefe doğru çoğunlukla adım adım; sıçrayıştan sonra ters yöne adım
  _line(m, from, to, count, span = [-3, 9]) {
    const out = [];
    let cur = from;
    let last = 0;
    for (let i = 0; i < count; i++) {
      const left = count - i;
      const pull = to - cur;
      let mv;
      if (left <= 2 && Math.abs(pull) <= 2) mv = Math.sign(pull) * Math.min(1, Math.abs(pull)) || 0;
      else {
        const r = this.rand();
        const dir = Math.abs(pull) > left ? Math.sign(pull) : r < 0.5 + 0.12 * Math.sign(pull) ? 1 : -1;
        mv = Math.abs(last) >= 2 ? -Math.sign(last) : r < 0.12 ? 0 : r < 0.82 ? dir : 2 * dir;
      }
      cur = Math.max(span[0], Math.min(span[1], cur + mv));
      last = mv;
      out.push(cur);
    }
    if (out.length) out[out.length - 1] = to;
    return out;
  }

  // Dört ölçülük dönem: ilk iki ölçü güçlüye (yarım kalış), son iki ölçü durağa (tam kalış).
  // reuse: 'none' yeni motif, 'first' ilk cümle aynı / kalış yeni, 'all' motifin tamamı, 'high' üst bölgede yeni cümle (meyan)
  _period(t, beat, m, lead, reuse = 'none') {
    const g = m.strong;
    const make = (from, mid, to) => {
      const durs = [CELLS[(this.rand() * CELLS.length) | 0], CELLS[(this.rand() * 4) | 0]].flat();
      const half = Math.ceil(durs.length / 2);
      return { durs, degs: [...this._line(m, from, mid, half), ...this._line(m, mid, to, durs.length - half)] };
    };
    let phrases;
    if (reuse === 'all' && this.motif) phrases = this.motif;
    else if (reuse === 'first' && this.motif) phrases = [this.motif[0], make(g + 1, g - 1, 0)];
    else if (reuse === 'high') phrases = [make(g, g + 4, g + 2), make(g + 3, g + 1, g)];
    else phrases = [make(this.rand() < 0.5 ? 0 : g - 1, g + 2, g), make(g + 1, g + 2, 0)];
    if (reuse === 'none' || !this.motif) this.motif = phrases;
    let x = t;
    const notes = [];
    for (const { durs, degs } of phrases) {
      durs.forEach((d, i) => {
        notes.push({ t: x, d: d * beat, deg: degs[i], last: i === durs.length - 1 });
        x += d * beat;
      });
    }
    for (const n of notes) {
      const f = this._freq(m, n.deg, 1);
      if (lead === 'ney') this._ney(n.t, n.d * 0.98, f * 2, 0.26);
      else if (lead === 'kanun') this._kanunNote(n.t, n.d, f * 2, n.last);
      else this._udNote(n.t, n.d, f, n.last);
    }
    // kanun cevabı: uzun notalarda kısa yankı cümlesi (oktav üstü, kısık)
    if (lead === 'ud') {
      for (let i = 2; i < notes.length; i++) {
        const n = notes[i];
        if (n.d >= 2 * beat && !n.last && this.rand() < 0.7) {
          const echo = notes.slice(Math.max(0, i - 2), i + 1);
          echo.forEach((e, k) => this._pluck(this.kanunBus, n.t + beat * 0.5 + k * beat * 0.5, this._freq(m, e.deg, 2), 0.16, 'kanun'));
        }
      }
    }
    return x;
  }

  // Taksim: ritimsiz, nefes alan uzun cümleler; durak ve güçlü çevresinde dolaşıp durakta kalır
  _taksim(t, m, inst, scale = 1) {
    const g = m.strong;
    const plan = [
      [0, g, 5 + ((this.rand() * 3) | 0)],
      [g, g + 2 + ((this.rand() * 2) | 0), 4 + ((this.rand() * 3) | 0)],
      [g + 1, 0, 6 + ((this.rand() * 3) | 0)],
    ];
    let x = t + 0.3;
    for (const [from, to, count] of plan) {
      const degs = this._line(m, from, to, count);
      degs.forEach((deg, i) => {
        const last = i === degs.length - 1;
        const d = (last ? 1.8 + this.rand() * 0.9 : 0.26 + this.rand() * (this.rand() < 0.25 ? 0.7 : 0.3)) * scale * (inst === 'ney' ? 1.5 : 1);
        const f = this._freq(m, deg, 1);
        if (inst === 'ney') this._ney(x, d * 0.97, f * 2, 0.3);
        else this._udNote(x, d, f, last);
        x += d;
      });
      x += (0.5 + this.rand() * 0.6) * scale; // nefes
    }
    return x + 0.4;
  }

  // ───────────── enstrümanlar ─────────────
  _udNote(t, d, f, last) {
    // çarpma: bazen üstten kısa süsleme
    if (!last && d > 0.3 && this.rand() < 0.16) this._pluck(this.udBus, t - 0.06, f * Math.pow(2, 2 / 12), 0.1, 'ud');
    this._pluck(this.udBus, t, f, last ? 0.34 : 0.26 + this.rand() * 0.06, 'ud');
    // uzun kalışta mızrap tekrarı (ud tremolosu)
    if (last && d > 1.4) for (let k = 1, x = t + 0.16; x < t + d - 0.3 && k < 9; k++, x += 0.11) this._pluck(this.udBus, x, f, 0.13 * Math.pow(0.9, k), 'ud');
  }

  _kanunNote(t, d, f, last) {
    this._pluck(this.kanunBus, t, f, 0.22, 'kanun');
    this._pluck(this.kanunBus, t + 0.012, f / 2, 0.1, 'kanun'); // alt oktav, iki elle
    if (d > 0.7) for (let x = t + 0.09, k = 0; x < t + d - 0.12; x += 0.075, k++) this._pluck(this.kanunBus, x, f, 0.09 * (1 - k * 0.03), 'kanun');
    if (last) this._pluck(this.kanunBus, t + 0.02, f * 1.5, 0.06, 'kanun');
  }

  _pluck(bus, t, f, gain, kind) {
    if (t < this.ctx.currentTime) return;
    const buf = this._pluckBuffer(f, kind);
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(bus);
    src.start(t);
    this._track(src, buf.duration + t - ctx.currentTime);
  }

  // Karplus-Strong: gürültü darbesi → gecikme hattı + ortalama süzgeç (kesirli gecikme, tüm geçiren)
  // Çift tel: iki telin hafif kayık akordu doğal "koro" verir.
  _pluckBuffer(f, kind) {
    const key = kind + Math.round(f * 4);
    const hit = this.pluckCache.get(key);
    if (hit) return hit;
    const ctx = this.ctx;
    const sr = ctx.sampleRate;
    const ud = kind === 'ud';
    const dur = ud ? 2.3 : 2.9;
    const t60 = ud ? 1.5 : 2.4;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    for (const detune of ud ? [-3, 3] : [-2, 2]) {
      const ff = f * Math.pow(2, detune / 1200);
      const period = sr / ff - 0.5; // ortalama süzgeç yarım örnek geciktirir
      const N = Math.floor(period);
      const frac = period - N;
      const C = (1 - frac) / (1 + frac);
      const line = new Float32Array(N + 2);
      // uyarım: mızrap konumu (tarak) + parlaklık (tek kutuplu alçak geçiren)
      let lp = 0;
      const bright = ud ? 0.45 : 0.75;
      for (let i = 0; i < line.length; i++) {
        lp += bright * (this.rand() * 2 - 1 - lp);
        line[i] = lp;
      }
      const pick = Math.max(1, Math.floor(N * (ud ? 0.18 : 0.12)));
      for (let i = line.length - 1; i >= pick; i--) line[i] -= line[i - pick] * 0.8;
      const rho = Math.pow(10, -3 / (t60 * ff));
      let idx = 0;
      let prev = 0;
      let apX = 0;
      let apY = 0;
      for (let i = 0; i < len; i++) {
        const cur = line[idx];
        const avg = 0.5 * (cur + prev) * rho;
        prev = cur;
        const y = C * avg + apX - C * apY; // kesirli gecikme
        apX = avg;
        apY = y;
        line[idx] = y;
        idx = idx + 1 >= N ? 0 : idx + 1;
        out[i] += cur * 0.5;
      }
    }
    // başlangıç tıkını yumuşat, sonu sustur
    const a = Math.floor(sr * 0.002);
    for (let i = 0; i < a; i++) out[i] *= i / a;
    const r = Math.floor(sr * 0.25);
    for (let i = 0; i < r; i++) out[len - 1 - i] *= i / r;
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 0) for (let i = 0; i < len; i++) out[i] /= peak;
    this.pluckCache.set(key, buf);
    return buf;
  }

  // Ney: temel + üst tınılar, nefes gürültüsü, yavaş giriş, gecikmeli vibrato, kısa kayışla bağlanır
  _ney(t, d, f, gain) {
    if (t < this.ctx.currentTime) return;
    const ctx = this.ctx;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.16, d * 0.35));
    env.gain.setTargetAtTime(gain * 0.8, t + 0.2, 0.4);
    env.gain.setTargetAtTime(0.0001, t + d - 0.08, 0.07);
    env.connect(this.neyBus);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5 + this.rand() * 0.8;
    const vibG = ctx.createGain();
    vibG.gain.setValueAtTime(0, t);
    vibG.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.5, d * 0.6));
    vib.connect(vibG);
    const prevF = this._neyLast && Math.abs(this._neyLast.t - t) < 0.12 ? this._neyLast.f : f;
    const parts = [
      [1, 0.75],
      [2, 0.18],
      [3, 0.06],
    ];
    const end = t + d + 0.3;
    for (const [mul, amp] of parts) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(prevF * mul, t);
      o.frequency.setTargetAtTime(f * mul, t, 0.035);
      vibG.connect(o.frequency);
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(env);
      o.start(t);
      o.stop(end);
      this._track(o, end - ctx.currentTime);
    }
    // nefes: perdeye ayarlı dar bant + geniş, çok kısık hışırtı
    const nz = ctx.createBufferSource();
    nz.buffer = this._noiseBuf();
    nz.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = 9;
    const bg = ctx.createGain();
    bg.gain.value = 0.55;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const hg = ctx.createGain();
    hg.gain.value = 0.05;
    nz.connect(bp).connect(bg).connect(env);
    nz.connect(hp).connect(hg).connect(env);
    nz.start(t, this.rand() * 2);
    nz.stop(end);
    vib.start(t);
    vib.stop(end);
    this._track(nz, end - ctx.currentTime);
    this._track(vib, end - ctx.currentTime);
    this._neyLast = { t: t + d, f };
  }

  // Def: düm (perdesi düşen derin vuruş) ve tek (kenar, parlak)
  _usul(t, beat, usul, gain) {
    for (const [b, kind] of usul.hits) {
      const x = t + b * beat + (this.rand() - 0.5) * 0.012;
      if (kind === 'd') this._dum(x, 0.34 * gain);
      else this._tek(x, (kind === 't' ? 0.16 : 0.07) * gain);
    }
  }

  _dum(t, gain) {
    if (t < this.ctx.currentTime) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(96, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g).connect(this.defBus);
    o.start(t);
    o.stop(t + 0.45);
    this._track(o, t + 0.5 - ctx.currentTime);
  }

  _tek(t, gain) {
    if (t < this.ctx.currentTime) return;
    const ctx = this.ctx;
    const nz = ctx.createBufferSource();
    nz.buffer = this._noiseBuf();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2100 + this.rand() * 400;
    bp.Q.value = 1.3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    nz.connect(bp).connect(g).connect(this.defBus);
    nz.start(t, this.rand());
    nz.stop(t + 0.09);
    this._track(nz, t + 0.12 - ctx.currentTime);
  }

  // Dem: durak ve beşlisinde çok alçak, yavaş nefes alan yatak (makam değişince yumuşakça geçer)
  _demStart(at) {
    const ctx = this.ctx;
    const t = Math.max(at || 0, ctx.currentTime + 0.05);
    if (this.dem) {
      const old = this.dem;
      old.g.gain.cancelScheduledValues(t);
      old.g.gain.setTargetAtTime(0.0001, t, 1.2);
      for (const o of old.oscs) {
        try {
          o.stop(t + 5);
        } catch {}
      }
    }
    const m = MAKAMS[this.makam];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.setTargetAtTime(this.mood === 'menu' ? 0.05 : 0.035, t, 2);
    g.connect(this.demBus);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lg = ctx.createGain();
    lg.gain.value = 0.012;
    lfo.connect(lg).connect(g.gain);
    const oscs = [lfo];
    for (const [f, a] of [
      [m.root, 0.6],
      [m.root * 1.5, 0.25],
      [m.root * 2, 0.2],
    ]) {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = det;
        const og = ctx.createGain();
        og.gain.value = a;
        o.connect(og).connect(g);
        o.start(t);
        oscs.push(o);
      }
    }
    lfo.start(t);
    for (const o of oscs) this.live.add(o);
    this.dem = { g, oscs };
  }

  // ───────────── yardımcılar ─────────────
  _bus(filters, pan, dryAmt, revAmt = 0.5) {
    const ctx = this.ctx;
    const input = ctx.createGain();
    let node = input;
    for (const [type, f, q, gain] of filters) {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      b.gain.value = gain;
      node.connect(b);
      node = b;
    }
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) {
      p.pan.value = pan;
      node.connect(p);
      node = p;
    }
    const d = ctx.createGain();
    d.gain.value = dryAmt;
    const r = ctx.createGain();
    r.gain.value = revAmt;
    node.connect(d).connect(this.dry);
    node.connect(r).connect(this.rev);
    return input;
  }

  _track(node, seconds) {
    this.live.add(node);
    setTimeout(() => this.live.delete(node), Math.max(0, seconds) * 1000 + 200);
  }

  _noiseBuf() {
    if (this._nb) return this._nb;
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return (this._nb = b);
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += 0.35 * (Math.random() * 2 - 1 - lp); // ahşap salon: tizleri yutulmuş kuyruk
        d[i] = lp * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }
}
