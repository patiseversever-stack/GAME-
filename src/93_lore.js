/* =====================================================================
   HİKÂYE: "Tün Ana'nın Ninnisi"
   Önsöz (3 kart), her dünyanın girişi, her takımyıldızıyla açılan bir
   ninni dizesi ve son. Arkada yavaşça dönen bir sarmal galaksi (bir kez
   pişirilir, CSS ile döner ve kamera gibi kayar: ana iş parçacığına yük
   bindirmez), sabit yıldız katmanı ve altın mürekkeple çizilen canlı
   gök resimleri. Kart açıkken 3B sahne çizilmez (düşük cihazda da akıcı).
   ===================================================================== */
const NINNI = [
  'Zeytin dalında sabır uyur,',
  'değirmen kırık geceyi öğütür;',
  'peri taşında bir kandil yanar,',
  'tuz gölünde gözyaşı donar.',
  'İki güneş bir gölgede barışır,',
  'buz bekler, Kutup yolunu tanır;',
  'aynada çoğalır ışık, gölge çoğalmaz:',
  'sarkaç yürür. Güneş batar, kimse yanmaz.',
];
const LORE = {
  p1: { k: 'Önsöz · I', t: 'İki Kardeş', art: 'siblings', b: [
    'Gök, iki kardeşin eviydi.',
    'Kün Ata gündüzü altınla dokur, Tün Ana geceyi mürekkeple yazardı.'] },
  p2: { k: 'Önsöz · II', t: 'Batmayan Güneş', art: 'shatter', b: [
    'Bir gündönümü Kün Ata kıskandı ve batmadı.',
    'Gece cam bir fener gibi çatladı; yıldızları adaların gölgelerine saçıldı.'] },
  p3: { k: 'Önsöz · III', t: 'Son Damla', art: 'drop', b: [
    'Geriye tek bir mürekkep damlası kaldı: Zifir.',
    'Işık onu yakar, gölge taşır.',
    'Güneşin yayı artık senin elinde.'] },
  w0: { k: 'I. yıldız · Ege Şafağı', t: 'Zeytinin Hafızası', art: 0, b: ['Zeytinler bin yıl unutmaz.', 'Gecenin ilk kırığını gümüş yapraklarının altında saklarlar.'] },
  w1: { k: 'II. yıldız · Rüzgâr Adası', t: 'Değirmenlerin Fısıltısı', art: 1, b: ['Rüzgâr, Tün Ana’nın son nefesidir.', 'Değirmenler döndükçe gölgeler yer değiştirir.'] },
  w2: { k: 'III. yıldız · Peri Bacaları', t: 'Taşa Dönen Periler', art: 2, b: ['Periler geceyi taş bacalara saklayıp kendileri de taşa döndü.', 'Yavaş geç; hâlâ dinliyorlar.'] },
  w3: { k: 'IV. yıldız · Tuz Gölü', t: 'Gözyaşı Gölü', art: 3, b: ['Tün Ana’nın gözyaşları kurudu, tuz oldu.', 'Burada ışık iki kez yakar.'] },
  w4: { k: 'V. yıldız · İkiz Güneş', t: 'İkiye Bölünen Yalnızlık', art: 4, b: ['Kün Ata öyle yalnızdı ki ikiye bölündü.', 'İki ışığın arasında tek bir gölge var.'] },
  w5: { k: 'VI. yıldız · Buz Diyarı', t: 'Bekleyen Gece', art: 5, b: ['Burada gece, birini beklerken dondu.', 'Yolunu kaybedersen Kutup Yıldızı’na bak.'] },
  w6: { k: 'VII. yıldız · Ayna Sarayı', t: 'Kendini Seven Işık', art: 6, b: ['Aynalar ışığı çoğaltır, gölgeyi asla.', 'Başını eğmeyi bilen tek şey laledir.'] },
  w7: { k: 'VIII. yıldız · Gök Saati', t: 'Duran Zaman', art: 7, b: ['Gök Saati, gecenin kırıldığı an durdu.', 'Son yıldızı kalbine koy; güneş ilk kez batsın.'] },
  end: { k: 'Son', t: 'Gündönümü', art: 'sunset', b: ['Kün Ata ufka eğildi, küçük bir gölgeye baktı ve onu yakmadı.', 'Gece eve döndü.', 'Her akşam güneşi uğurlayan ilk gölge artık Zifir.'] },
};
for (let c = 0; c < 8; c++) LORE['c' + c] = { k: `Tün Ana’nın Ninnisi · ${c + 1}/8`, t: `${CHAPTERS[c].constellation} göğe asıldı`, art: { done: c }, ninni: c };
const LORE_PRO = ['p1', 'p2', 'p3'];
// her sayfada galaksiye bakan kamera: [x, y (ekran oranı), yakınlık, dönüş°]
// (çekirdek hiçbir sayfada çizimin arkasına düşmez: çizim ekranın üst ortasında)
const LORE_CAM = { p1: [0.44, -0.44, 1.0, -24], p2: [-0.46, -0.3, 1.1, 16], p3: [0.38, 0.02, 1.2, -38], end: [0, -0.62, 0.78, -6] };
function loreCam(id) {
  const c = +id.slice(1) || 0, near = id[0] === 'c', th = c * 0.9 + 0.6;
  const v = LORE_CAM[id] || [0.46 * Math.cos(th), -0.28 + 0.3 * Math.sin(th), near ? 0.85 : 1.0 + 0.08 * (c % 3), -32 + c * 19];
  if (innerWidth > innerHeight * 1.3) { const a = (v[3] * PI) / 180; return [-0.06 + 0.12 * Math.cos(a), 0.3 + 0.06 * Math.sin(a), v[2] * 0.85, v[3]]; } // yatay: çizim solda; çekirdek altta, kollar çizimin arkasından geçer
  return v;
}
function loreSprite(rgb, size = 64, mid = 0.35) {
  const c = document.createElement('canvas'); c.width = c.height = size; const s = c.getContext('2d'), h = size / 2, g = s.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(mid, `rgba(${rgb},0.32)`); g.addColorStop(1, `rgba(${rgb},0)`); s.fillStyle = g; s.fillRect(0, 0, size, size); return c;
}

const Lore = {
  open: false, opaque: false, pages: [], i: 0, t: 0, done: null, book: false,
  needWorld(ch) { return !Save.seen('lore-w' + ch); },
  worldPages(ch) { const p = []; if (ch === 0 && !Save.seen('lore-p')) p.push(...LORE_PRO); p.push('w' + ch); return p; },
  // bir dizi sayfa oynat; bitince (ya da atlanınca) devam fonksiyonu çağrılır
  play(pages, done) {
    if (window.__noLore || !pages.length) { done && done(); return; }
    this.pages = pages; this.i = 0; this.done = done; this.book = false; this.show();
  },
  openBook() {
    const p = []; if (Save.seen('lore-p')) p.push(...LORE_PRO);
    for (let c = 0; c < 8; c++) { if (Save.seen('lore-w' + c)) p.push('w' + c); if (Save.seen('lore-c' + c)) p.push('c' + c); }
    if (Save.seen('lore-end')) p.push('end');
    if (!p.length) { toast('Hikâye ilk adada başlar. <em>Başla</em>’ya dokun.', 2.4); return; }
    audio.ui(); this.pages = p; this.i = 0; this.done = null; this.book = true; this.show();
  },
  show() {
    const el = $('#lore'); this.open = true; this.opaque = false;
    if (!this.cv) this.init();
    el.classList.add('on'); el.classList.toggle('book', this.book);
    // açılış: uzaktan galaksiye doğru yavaş bir yaklaşma
    const [cx, cy, s, r] = loreCam(this.pages[0]); this.setCam([cx * 0.6, cy + 0.12, s * 0.5, r - 30], true);
    this.page(0); this.last = performance.now(); requestAnimationFrame((t) => this.loop(t));
    const gen = (this.gen = (this.gen || 0) + 1); setTimeout(() => { if (this.open && this.gen === gen) this.opaque = true; }, 800);
  },
  init() {
    this.cv = $('#loreArt'); this.cx = this.cv.getContext('2d'); this.skyW = $('#loreSkyW');
    this.glow = loreSprite('255,214,150'); this.starS = loreSprite('225,232,255', 32, 0.22); this.dark = loreSprite('3,2,9', 64, 0.5);
    const rs = () => {
      const d = Math.min(1.75, window.devicePixelRatio || 1); this.dpr = d; this.cv.width = Math.round(this.cv.clientWidth * d); this.cv.height = Math.round(this.cv.clientHeight * d);
      this.skyW.style.setProperty('--gsz', Math.round(Math.max(innerWidth, innerHeight) * 1.3) + 'px');
      this.bakeStars(); this.makeLive();
      if (this.open && this.pages[this.i]) this.setCam(loreCam(this.pages[this.i]), true);
    };
    rs(); addEventListener('resize', () => this.open && rs());
    this.bake = this.galaxySteps();
    $('#lore').addEventListener('pointerdown', (e) => { if (e.target.closest('#loreSkip,#loreBack')) return; e.preventDefault(); this.tap(); });
    $('#loreSkip').addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });
    $('#loreBack').addEventListener('click', (e) => { e.stopPropagation(); if (this.i > 0) { audio.ui(); this.page(this.i - 1); } });
  },
  setCam([cx, cy, s, r], snap = false) {
    const w = this.skyW; if (snap) w.classList.add('snap');
    w.style.transform = `translate(${(cx * innerWidth).toFixed(1)}px,${(cy * innerHeight).toFixed(1)}px) rotate(${r}deg) scale(${s},${(s * 0.5).toFixed(3)})`;
    if (snap) { void w.offsetWidth; w.classList.remove('snap'); }
  },
  // sabit yıldız katmanı: ekran boyunda bir kez çizilir
  bakeStars() {
    const cv = $('#loreStars'), d = Math.min(1.5, window.devicePixelRatio || 1), W = (cv.width = Math.round(cv.clientWidth * d)), H = (cv.height = Math.round(cv.clientHeight * d)), x = cv.getContext('2d'), rng = new RNG(3);
    x.clearRect(0, 0, W, H);
    const n = Math.round((W * H) / (d * d) / 700), tints = ['235,238,255', '255,236,210', '200,215,255', '255,220,240'];
    for (let i = 0; i < n; i++) {
      const px = rng.next() * W, py = rng.next() * H, m = Math.pow(rng.next(), 3), s = (0.45 + m * 1.4) * d;
      x.fillStyle = `rgba(${tints[i % 4]},${(0.25 + rng.next() * 0.55 + m * 0.2).toFixed(2)})`; x.beginPath(); x.arc(px, py, s * 0.6, 0, TAU); x.fill();
      if (m > 0.55) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.35; const g = s * 7; x.drawImage(this.starS, px - g / 2, py - g / 2, g, g); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    }
  },
  // canlı katman: göz kırpan parlak yıldızlar, altın toz, kayan yıldız
  makeLive() {
    const W = this.cv.width, H = this.cv.height, rng = new RNG(9), lv = Perf.level | 0;
    this.tw = Array.from({ length: [22, 30, 38, 44][lv] || 30 }, (_, i) => ({ x: rng.next() * W, y: rng.next() * H * 0.92, r: 0.8 + rng.next() * 1.6, p: rng.next() * 9, w: 0.7 + rng.next() * 2, spike: i % 5 === 0 }));
    this.motes = Array.from({ length: [12, 18, 24, 28][lv] || 18 }, () => ({ x: rng.next() * W, y: rng.next() * H * 0.7, v: 6 + rng.next() * 12, p: rng.next() * 9, s: 0.6 + rng.next() * 1.4 }));
    this.shoot = null; this.nextShoot = 2 + Math.random() * 3;
  },
  // galaksi: birkaç kareye bölünerek pişirilir (açılışta takılma olmasın), sonra yavaşça belirir
  galaxySteps() {
    const lv = Perf.level | 0, N = [768, 1024, 1280, 1536][lv] || 1024, cv = $('#loreSky'); cv.width = cv.height = N;
    const x = cv.getContext('2d'), C = N / 2, R = N * 0.47, u = N / 1024, rng = new RNG(11), rnd = () => rng.next(), gs = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    const S = { violet: loreSprite('140,90,255'), magenta: loreSprite('255,96,190'), teal: loreSprite('80,170,255'), gold: loreSprite('255,206,140'), white: loreSprite('255,248,236'), dust: loreSprite('5,3,14', 64, 0.5) };
    const ARMS = 2, B = 0.3, r0 = R * 0.07, arm = (t, k, off = 0) => { const r = r0 + t * (R - r0); return [r, (k * TAU) / ARMS + Math.log(r / r0) / B + off]; };
    const at = (r, th) => [C + Math.cos(th) * r, C + Math.sin(th) * r];
    const spr = (img, px, py, s, a) => { x.globalAlpha = a; x.drawImage(img, px - s, py - s, s * 2, s * 2); };
    const NP = [3200, 5200, 7200, 9000][lv] || 5200, steps = [];
    steps.push(() => {
      x.clearRect(0, 0, N, N); x.globalCompositeOperation = 'lighter'; spr(S.violet, C, C, R * 1.05, 0.3); spr(S.teal, C, C, R * 0.8, 0.16); spr(S.magenta, C, C, R * 0.45, 0.08);
      // kolların yumuşak ışık şeridi
      for (let k = 0; k < ARMS; k++) for (let j = 0, n = 260 + lv * 90; j < n; j++) { const t = 0.04 + (j / n) * 0.96, [r, th] = arm(t, k, gs() * 0.09), [px, py] = at(r * (1 + gs() * 0.03), th); spr(t < 0.3 ? S.magenta : t < 0.6 ? S.violet : S.teal, px, py, R * (0.035 + 0.07 * t), 0.045); }
      x.globalAlpha = 1;
    });
    const stars = (n) => () => {
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const t = Math.pow(rnd(), 0.8), disk = rnd() < 0.22;
        let [r, th] = arm(t, (rnd() * ARMS) | 0, gs() * (0.16 + 0.32 * (1 - t)));
        if (disk) th = rnd() * TAU; r *= 1 + gs() * 0.07;
        const [px, py] = at(r, th), q = rnd();
        const c = t < 0.16 ? '255,224,176' : q < 0.035 ? '255,120,196' : t < 0.42 ? '214,196,255' : '156,190,255';
        const a = ((disk ? 0.1 : 0.16) + rnd() * 0.4) * (0.3 + 0.7 * Math.min(1, t * 2.5)), sz = (0.5 + rnd() * rnd() * 1.9) * u;
        x.fillStyle = `rgba(${c},${a.toFixed(3)})`; x.fillRect(px, py, sz, sz);
      }
    };
    for (let k = 0; k < 4; k++) steps.push(stars(NP / 4));
    // bulutsular kolların üstünde, toz şeritleri kolların iç kenarında
    steps.push(() => {
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70 + lv * 25; i++) {
        const t = 0.1 + rnd() * 0.85, [r, th] = arm(t, i % ARMS, gs() * 0.12), [px, py] = at(r, th), s = R * (0.04 + rnd() * 0.09) * (0.7 + t), p = rnd();
        spr(p < 0.42 ? S.violet : p < 0.62 ? S.magenta : p < 0.86 ? S.teal : S.gold, px, py, s, 0.06 + rnd() * 0.09);
      }
      x.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 110 + lv * 40; i++) { const t = 0.08 + rnd() * 0.72, [r, th] = arm(t, i % ARMS, -0.24 + gs() * 0.05), [px, py] = at(r, th); spr(S.dust, px, py, R * (0.018 + rnd() * 0.035), 0.16 + rnd() * 0.2); }
      x.globalAlpha = 1;
    });
    steps.push(() => {
      // çekirdek ve genç, parlak yıldızlar
      x.globalCompositeOperation = 'lighter'; spr(S.gold, C, C, R * 0.42, 0.3); spr(S.gold, C, C, R * 0.18, 0.55); spr(S.white, C, C, R * 0.06, 0.8);
      for (let i = 0; i < 40 + lv * 15; i++) { const t = 0.15 + rnd() * 0.8, [r, th] = arm(t, i % ARMS, gs() * 0.1), [px, py] = at(r, th); spr(rnd() < 0.7 ? S.white : S.teal, px, py, (2.5 + rnd() * 5) * u, 0.5 + rnd() * 0.4); }
      // kenarlar yumuşakça kaybolsun
      x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in';
      const m = x.createRadialGradient(C, C, R * 0.5, C, C, R * 1.02); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = m; x.fillRect(0, 0, N, N);
      x.globalCompositeOperation = 'source-over'; cv.classList.add('ready');
    });
    return steps;
  },
  page(i) {
    this.i = i; this.t = 0; const P = LORE[this.pages[i]], id = this.pages[i];
    // kamera yeni sayfaya kayar (iki kare sonra: açılıştaki uzak çekim önce yerleşsin)
    requestAnimationFrame(() => requestAnimationFrame(() => { if (this.open && this.pages[this.i] === id) this.setCam(loreCam(id)); }));
    $('#loreK').textContent = P.k;
    // başlık harf harf belirir (kelimeler bölünmez)
    let n = 0; $('#loreT').innerHTML = P.t.split(' ').map((w) => `<span class="w">${[...w].map((ch) => `<i style="animation-delay:${(0.2 + n++ * 0.035).toFixed(3)}s">${ch}</i>`).join('')}</span>`).join(' ');
    const body = $('#loreB'); body.innerHTML = '';
    if (P.ninni != null) {
      NINNI.forEach((ln, k) => { if (k > P.ninni) return; const s = document.createElement('span'); s.className = 'nl' + (k === P.ninni ? ' new' : ''); s.textContent = ln; s.style.animationDelay = `${k === P.ninni ? 0.9 + P.ninni * 0.12 : 0.3 + k * 0.12}s`; body.appendChild(s); });
      const c = document.createElement('span'); c.className = 'cap'; c.textContent = P.ninni === 7 ? 'Ninni tamamlandı. Dinle: gece eve geliyor.' : 'Gökte bir dize daha yandı.'; c.style.animationDelay = `${1.8 + P.ninni * 0.12}s`; body.appendChild(c);
    } else P.b.forEach((tx, k) => { const s = document.createElement('span'); s.className = 's'; s.style.animationDelay = `${0.75 + k * 1.0}s`; s.textContent = tx + ' '; body.appendChild(s); });
    body.classList.remove('all'); void body.offsetWidth;
    this.revealT = P.ninni != null ? 2.6 : 0.75 + P.b.length * 1.0;
    $('#loreDots').innerHTML = this.pages.length > 1 ? this.pages.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'past' : ''}"></i>`).join('') : '';
    $('#loreBack').classList.toggle('on', this.book && i > 0);
    $('#lore').classList.remove('turn'); void $('#lore').offsetWidth; $('#lore').classList.add('turn');
    if (/^c\d$/.test(id) || id === 'end') audio.chime(); else audio.whoosh(false, 0.9, 0.035);
    if (!this.book) Save.markSeen(/^p\d$/.test(id) ? 'lore-p' : 'lore-' + id);
  },
  tap() {
    if (this.t < this.revealT) { this.t = this.revealT; $('#loreB').classList.add('all'); $('#lore').classList.add('all'); return; }
    $('#lore').classList.remove('all');
    if (this.i < this.pages.length - 1) { audio.ui(); this.page(this.i + 1); } else this.finish();
  },
  finish() {
    if (!this.open) return;
    if (!this.book) for (const id of this.pages) Save.markSeen(/^p\d$/.test(id) ? 'lore-p' : 'lore-' + id);
    this.open = false; this.opaque = false; $('#lore').classList.remove('on', 'all'); audio.ui();
    const d = this.done; this.done = null; if (d) setTimeout(d, 60);
  },
  loop(now) {
    if (!this.open) return;
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.12, (now - this.last) / 1000); this.last = now; this.t += dt;
    if (this.bake && this.bake.length) this.bake.shift()(); // galaksiyi kare kare pişir
    this.draw(this.t, now / 1000, dt);
  },
  // ---------- canlı gök ve altın mürekkep çizimleri ----------
  draw(t, T, dt) {
    const x = this.cx, W = this.cv.width, H = this.cv.height, d = this.dpr; x.clearRect(0, 0, W, H);
    const wide = W > H * 1.3, S = wide ? H * 0.3 : Math.min(W, H * 0.62) * 0.42, cx = wide ? W * 0.27 : W / 2, cy = wide ? H * 0.45 : H * 0.27;
    // resmin arkasında hafif bir koyuluk: çizim galaksinin önünde okunsun
    x.globalAlpha = 0.55; x.drawImage(this.dark, cx - S * 1.6, cy - S * 1.3, S * 3.2, S * 2.6); x.globalAlpha = 1;
    x.globalCompositeOperation = 'lighter';
    // göz kırpan yıldızlar (parlak olanlarda ışık çizgileri)
    for (const s of this.tw) {
      const a = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(T * s.w + s.p), 2), g = s.r * 5 * d;
      x.globalAlpha = a; x.drawImage(this.starS, s.x - g / 2, s.y - g / 2, g, g);
      if (s.spike) { x.globalAlpha = a * 0.5; x.fillStyle = '#e8eeff'; const L = s.r * 6 * d * (0.7 + 0.3 * a); x.fillRect(s.x - L, s.y - 0.5 * d, L * 2, d); x.fillRect(s.x - 0.5 * d, s.y - L, d, L * 2); }
    }
    // altın toz: yavaşça yükselir
    for (const m of this.motes) {
      m.y -= m.v * d * dt; if (m.y < -10) { m.y = H * 0.72; m.x = Math.random() * W; }
      const px = m.x + Math.sin(T * 0.6 + m.p) * 12 * d, a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(T * 1.7 + m.p)), g = m.s * 7 * d;
      x.globalAlpha = a * clamp01(m.y / (H * 0.12)); x.drawImage(this.glow, px - g / 2, m.y - g / 2, g, g);
    }
    // kayan yıldız
    if (!this.shoot && t > this.nextShoot) { const a = 0.35 + Math.random() * 0.5, sp = (700 + Math.random() * 500) * d; this.shoot = { x: W * (0.15 + Math.random() * 0.7), y: H * (0.04 + Math.random() * 0.3), vx: Math.cos(a) * sp * (Math.random() < 0.5 ? -1 : 1), vy: Math.sin(a) * sp, l: 0 }; }
    if (this.shoot) {
      const s = this.shoot; s.l += dt; s.x += s.vx * dt; s.y += s.vy * dt; const k = Math.sin(Math.min(1, s.l / 0.7) * PI), tx = s.x - s.vx * 0.14, ty = s.y - s.vy * 0.14;
      const g = x.createLinearGradient(s.x, s.y, tx, ty); g.addColorStop(0, `rgba(255,246,225,${0.9 * k})`); g.addColorStop(1, 'rgba(255,220,170,0)');
      x.globalAlpha = 1; x.strokeStyle = g; x.lineWidth = 1.6 * d; x.lineCap = 'round'; x.beginPath(); x.moveTo(s.x, s.y); x.lineTo(tx, ty); x.stroke();
      x.globalAlpha = k; const gg = 10 * d; x.drawImage(this.glow, s.x - gg / 2, s.y - gg / 2, gg, gg);
      if (s.l > 0.7) { this.shoot = null; this.nextShoot = t + 4 + Math.random() * 5; }
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    const P = LORE[this.pages[this.i]]; if (!P) return;
    // yumuşak altın hâle: çizimin arkasında nefes alır
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.1 + 0.04 * Math.sin(T * 0.9); x.drawImage(this.glow, cx - S * 1.2, cy - S * 1.2, S * 2.4, S * 2.4); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    const k = (a, b) => clamp01((t - a) / b), E = (v) => 1 - Math.pow(1 - v, 3);
    const gold = (a, w = 1.6) => { x.strokeStyle = `rgba(255,214,140,${a})`; x.lineWidth = w * d; x.lineCap = 'round'; x.lineJoin = 'round'; };
    const glowLine = (fn, a = 1, w = 1.6) => { x.globalCompositeOperation = 'lighter'; gold(a * 0.08, w * 7); fn(); gold(a * 0.2, w * 3); fn(); gold(a * 0.95, w); fn(); x.globalCompositeOperation = 'source-over'; };
    const dot = (px, py, r, a = 1) => { x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(1, a); const g = r * 8; x.drawImage(this.glow, px - g / 2, py - g / 2, g, g); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; };
    // çizen kalemin ucu: kıvılcım
    const spark = (px, py, f) => { if (f > 0.01 && f < 0.995) { dot(px, py, 2.6 * d, 1); dot(px, py, 6 * d, 0.35); } };
    const circ = (px, py, r, f = 1, a0 = -PI / 2) => { x.beginPath(); x.arc(px, py, r, a0, a0 + TAU * f); x.stroke(); };
    const circS = (px, py, r, f, a0 = -PI / 2) => spark(px + Math.cos(a0 + TAU * f) * r, py + Math.sin(a0 + TAU * f) * r, f);
    const art = P.art;
    if (art === 'siblings') {
      // solda güneş, sağda hilal: aralarında dönen dünya
      const sx = cx - S * 0.62, mx = cx + S * 0.62, f = E(k(0.1, 1.6));
      dot(sx, cy, S * 0.09 * f, 0.5 * f);
      glowLine(() => circ(sx, cy, S * 0.22, f), 1, 1.8); circS(sx, cy, S * 0.22, f);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + T * 0.15, r0 = S * 0.3, r1 = S * (0.38 + (i % 2) * 0.07), q = k(0.6 + i * 0.06, 0.4); if (q <= 0) continue; glowLine(() => { x.beginPath(); x.moveTo(sx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(sx + Math.cos(a) * (r0 + (r1 - r0) * q), cy + Math.sin(a) * (r0 + (r1 - r0) * q)); x.stroke(); }, 0.9, 1.4); }
      const mf = E(k(0.5, 1.6));
      glowLine(() => { x.beginPath(); x.arc(mx, cy, S * 0.24, -PI * 0.62, -PI * 0.62 + PI * 1.24 * mf, false); x.stroke(); if (mf > 0.98) { x.beginPath(); x.arc(mx + S * 0.1, cy - S * 0.03, S * 0.2, PI * 0.42, -PI * 0.5, true); x.stroke(); } }, 1, 1.8);
      spark(mx + Math.cos(-PI * 0.62 + PI * 1.24 * mf) * S * 0.24, cy + Math.sin(-PI * 0.62 + PI * 1.24 * mf) * S * 0.24, mf);
      for (let i = 0; i < 5; i++) { const q = k(1.4 + i * 0.2, 0.5); if (q > 0) dot(mx + S * (0.32 + 0.12 * Math.cos(i * 2.1)), cy - S * (0.25 - i * 0.12), 1.4 * d, q * (0.6 + 0.4 * Math.sin(T * 2 + i))); }
      const wf = E(k(1.2, 1.4)); glowLine(() => { x.setLineDash([3 * d, 7 * d]); x.beginPath(); x.ellipse(cx, cy + S * 0.05, S * 0.95, S * 0.32, 0, PI * 0.08, PI * 0.08 + PI * 0.84 * wf); x.stroke(); x.setLineDash([]); }, 0.6, 1);
      dot(cx + Math.cos(T * 0.5) * S * 0.95 * 0.98, cy + S * 0.05 + Math.sin(T * 0.5) * S * 0.32, 2 * d, wf);
    } else if (art === 'shatter') {
      // tepede batmayan güneş; altta çatlayıp dağılan hilal
      const f = E(k(0.1, 1.2)); dot(cx, cy - S * 0.28, S * 0.08 * f, 0.55 * f); glowLine(() => circ(cx, cy - S * 0.28, S * 0.17, f), 1, 1.8); circS(cx, cy - S * 0.28, S * 0.17, f);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + T * 0.25, q = k(0.5, 0.8); glowLine(() => { x.beginPath(); x.moveTo(cx + Math.cos(a) * S * 0.22, cy - S * 0.28 + Math.sin(a) * S * 0.22); x.lineTo(cx + Math.cos(a) * S * (0.22 + 0.13 * q), cy - S * 0.28 + Math.sin(a) * S * (0.22 + 0.13 * q)); x.stroke(); }, 0.8, 1.2); }
      const br = E(k(1.6, 2.2));
      for (let i = 0; i < 9; i++) {
        const a0 = PI * 0.15 + (i / 9) * PI * 0.7, a1 = a0 + PI * 0.7 / 9, dr = br * S * (0.15 + 0.35 * ((i * 37) % 9) / 9), fall = br * br * S * 0.25 * ((i % 3) + 1) / 3;
        const ox = Math.cos((a0 + a1) / 2) * dr, oy = Math.sin((a0 + a1) / 2) * dr * 0.5 + fall, rot = br * (i % 2 ? 0.6 : -0.5);
        x.save(); x.translate(cx + ox, cy + S * 0.25 + oy); x.rotate(rot);
        glowLine(() => { x.beginPath(); x.arc(0, -S * 0.1, S * 0.34, a0, a1); x.arc(0, -S * 0.18, S * 0.3, a1, a0, true); x.closePath(); x.stroke(); }, 1 - br * 0.35, 1.3);
        x.restore();
        if (br > 0.2 && i % 2 === 0) dot(cx + ox * 1.6, cy + S * 0.3 + oy * 1.4, 1.5 * d, (1 - br) * 0.9 + 0.2);
      }
    } else if (art === 'drop') {
      // düşen mürekkep damlası (Zifir) ve etrafında süzülen kırlangıçlar
      const fall = E(k(0.2, 2.2)), dy = cy - S * 0.55 + fall * S * 0.6 + Math.sin(T * 1.6) * S * 0.015, r = S * 0.18;
      const shape = () => { x.beginPath(); x.moveTo(cx, dy - r * 1.9); x.bezierCurveTo(cx + r * 0.25, dy - r * 1.1, cx + r, dy - r * 0.6, cx + r, dy); x.arc(cx, dy, r, 0, PI, false); x.bezierCurveTo(cx - r, dy - r * 0.6, cx - r * 0.25, dy - r * 1.1, cx, dy - r * 1.9); };
      x.fillStyle = 'rgba(14,9,26,0.94)'; shape(); x.fill(); glowLine(() => { shape(); x.stroke(); }, k(0.1, 0.8), 1.6);
      if (t > 2.4) { const bl = Math.sin(T * 0.7) > 0.96 ? 0.15 : 1; x.fillStyle = 'rgba(255,248,236,0.95)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * r * 0.35, dy - r * 0.05, r * 0.14, r * 0.19 * bl, 0, 0, TAU); x.fill(); } }
      for (let i = 0; i < 5; i++) {
        const q = k(1.0 + i * 0.25, 0.8); if (q <= 0) continue;
        const a = T * (0.55 + i * 0.07) + i * 1.3, bx = cx + Math.cos(a) * S * (0.55 + i * 0.06), by = cy - S * 0.1 + Math.sin(a) * S * 0.22, w = S * 0.07, fl = Math.sin(T * 9 + i) * 0.35;
        glowLine(() => { x.beginPath(); x.moveTo(bx - w, by - w * (0.3 + fl)); x.quadraticCurveTo(bx - w * 0.4, by - w * 0.1, bx, by + w * 0.15); x.quadraticCurveTo(bx + w * 0.4, by - w * 0.1, bx + w, by - w * (0.3 + fl)); x.stroke(); }, q * 0.85, 1.3);
      }
    } else if (art === 'sunset') {
      // ufka eğilen güneş; gece geri gelirken sekiz takımyıldızı yanar
      const hz = cy + S * 0.25, sink = E(k(0.3, 4.5)), hf = E(k(0.1, 1.2));
      glowLine(() => { x.beginPath(); x.moveTo(cx - S * 1.2 * hf, hz); x.lineTo(cx + S * 1.2 * hf, hz); x.stroke(); }, 0.7, 1.2);
      x.save(); x.beginPath(); x.rect(0, 0, W, hz); x.clip();
      const sy = hz - S * 0.35 + sink * S * 0.55; dot(cx, sy, S * 0.1, 0.8 - sink * 0.5); glowLine(() => circ(cx, sy, S * 0.2), 1 - sink * 0.4, 1.8);
      x.restore();
      for (let c = 0; c < 8; c++) {
        const q = k(1.2 + c * 0.35, 0.9); if (q <= 0) continue;
        const a = PI + (c + 0.5) / 8 * PI, ox = cx + Math.cos(a) * S * 1.05, oy = hz - 6 * d + Math.sin(a) * S * 0.62, sc = S * 0.0022;
        const pts = CONST[c].map(([px, py]) => [ox + (px - 50) * sc, oy + (py - 60) * sc]);
        for (const p of pts) dot(p[0], p[1], 0.9 * d, q * (0.7 + 0.3 * Math.sin(T * 2 + c)));
      }
    } else {
      // takımyıldızı: dünya girişinde çizilerek, ninni sayfasında parlayarak
      const ch = typeof art === 'number' ? art : art.done, doneP = typeof art !== 'number';
      const sc = S * 0.0115, pts = CONST[ch].map(([px, py]) => [cx + (px - 50) * sc, cy + (py - 60) * sc]);
      const edges = CONST_EDGES[ch] || SEQ, per = 2.4 / edges.length;
      edges.forEach(([a, b], i) => {
        const q = doneP ? 1 : E(k(0.3 + i * per, per * 1.4)); if (q <= 0) return;
        const ex = pts[a][0] + (pts[b][0] - pts[a][0]) * q, ey = pts[a][1] + (pts[b][1] - pts[a][1]) * q;
        glowLine(() => { x.beginPath(); x.moveTo(pts[a][0], pts[a][1]); x.lineTo(ex, ey); x.stroke(); }, doneP ? 0.75 + 0.25 * Math.sin(T * 2) : 0.85, 1.4);
        spark(ex, ey, q);
      });
      pts.forEach((p, i) => { const q = doneP ? 1 : k(0.2 + i * 0.25, 0.5); if (q > 0) { dot(p[0], p[1], (doneP ? 2.4 : 1.8) * d, q * (0.75 + 0.25 * Math.sin(T * 2.3 + i))); dot(p[0], p[1], 0.8 * d, q); } });
      if (doneP) { const r = E(k(0.2, 1.6)); glowLine(() => circ(cx, cy, S * (0.95 + r * 0.25), 1), (1 - r) * 0.8, 1.2); }
    }
  },
};
// kart açıkken 3B çizimi atla (opak arka plan): düşük cihazda tam akıcılık
