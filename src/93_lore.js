/* =====================================================================
   HİKÂYE — "Tün Ana'nın Ninnisi"
   Önsöz (4 sayfa), her dünyanın girişi, her takımyıldızıyla açılan bir
   ninni dizesi ve son. Kartlar tuval üzerinde altın mürekkeple çizilen
   canlı gök resimleri ve tek tek beliren cümlelerden oluşur.
   Kart açıkken 3B sahne çizilmez (düşük cihazda da akıcı).
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
    'Evvel zaman içinde gök, iki kardeşin eviydi.',
    'Kün Ata gündüzü dokurdu; altın iplikleri tarlaları ısıtır, meyveleri tatlandırırdı.',
    'Tün Ana geceyi dokurdu; mürekkebiyle yıldızları yazar, yorgun dünyaya ninni söylerdi.',
    'Biri yorulunca öbürü uyanır, dünya ikisinin arasında huzurla dönerdi.'] },
  p2: { k: 'Önsöz · II', t: 'Batmayan Güneş', art: 'shatter', b: [
    'Bir gündönümü sabahı Kün Ata gölgelere baktı ve kıskandı: “Ben varken karanlığa ne gerek?”',
    'O gün batmadı. Ertesi gün de, ondan sonraki gün de.',
    'Tün Ana ışığa dayanamadı; bir cam fener gibi çatladı, yıldızları adaların gölgelerine saçıldı.',
    'Rüzgâr sustu, saatler öğlede durdu. Dünyada gece diye bir şey kalmadı.'] },
  p3: { k: 'Önsöz · III', t: 'Son Damla', art: 'drop', b: [
    'Ama her kırılışta geriye bir şey kalır.',
    'Tün Ana’nın divitinden son bir damla mürekkep düştü: sıcacık, küçücük, biraz da korkak.',
    'Gecenin kırlangıçları onu tanıdı ve kulağına adını fısıldadı: Zifir.',
    'Zifir ışığa çıkamaz; güneş değdiği yerde buhar olur. Ama her adada bir Gece Kapısı vardır ve ardında Tün Ana’nın bir yıldızı uyur.'] },
  p4: { k: 'Önsöz · IV', t: 'Senin Elin', art: 'bow', b: [
    'Kün Ata pişman. Ama batmayı unuttu; ışığını kendi kendine durduramıyor.',
    'Bu yüzden yayını sana verdi.',
    'Güneşi sen çevireceksin. Gölgeyi sen koruyacaksın.',
    'Zifir’i Gece Kapıları’na ulaştır; yıldızlar yerine dönsün, gece eve gelsin.'] },
  w0: { k: 'I. yıldız · Ege Şafağı', t: 'Zeytinin Hafızası', art: 0, b: [
    'Zeytin ağaçları bin yıl yaşar, bin yıl unutmaz.',
    'Tün Ana kırıldığında ilk kırığını onlar sakladı, gümüş yapraklarının altına.',
    '“Acele etme,” derler Zifir’e, “gölge de bir yoldur, sabır da bir ışık.”'] },
  w1: { k: 'II. yıldız · Rüzgâr Adası', t: 'Değirmenlerin Fısıltısı', art: 1, b: [
    'Rüzgâr, Tün Ana’nın son nefesiydi; gökten düşünce adaları dolaşmaya başladı.',
    'Değirmenler o nefesi öğütür; kanatlar döndükçe gölgeler yer değiştirir, bulutlar sürü gibi geçer.',
    'Burada gölgeyi bekleyen değil, gölgenin peşine düşen kazanır.'] },
  w2: { k: 'III. yıldız · Peri Bacaları', t: 'Taşa Dönen Periler', art: 2, b: [
    'Periler geceyi taş bacaların içine sakladı; kimse onu yakamasın diye kendileri de taşa döndüler.',
    'Şafakta balonlar yükselir; her balonun altında küçük, yüzen bir gece taşınır.',
    'Kayaların arasından geçerken yavaş konuş: periler hâlâ dinliyor.'] },
  w3: { k: 'IV. yıldız · Tuz Gölü', t: 'Gözyaşı Gölü', art: 3, b: [
    'Tün Ana kırılırken ağladı. Gözyaşları ovaya aktı, kurudu, tuz oldu.',
    'Bu göl güneşin aynasıdır; ışık burada iki kez yakar, köprüler ancak kristaller parlayınca belirir.',
    'Flamingolar tek ayak üstünde bekler: acele eden yanar, bekleyen geçer.'] },
  w4: { k: 'V. yıldız · İkiz Güneş', t: 'İkiye Bölünen Yalnızlık', art: 4, b: [
    'Kün Ata öyle yalnız kaldı ki bir gün ikiye bölündü, kendine bir yoldaş olsun diye.',
    'Şimdi iki güneş birbirini arar ama hiç buluşamaz; biri yükselirken öbürü alçalır.',
    'İki ışığın arasında tek bir gölge vardır. Onu bulan geçer.'] },
  w5: { k: 'VI. yıldız · Buz Diyarı', t: 'Bekleyen Gece', art: 5, b: [
    'Burada gece, birinin dönmesini bekleyerek dondu. Buz, sabrın ta kendisidir.',
    'Ama güneş değince buz erir, gölgesi kısalır; her an değerlidir.',
    'Gökte hiç kıpırdamayan bir yıldız var: Kutup. Yolunu kaybedenler ona bakar.'] },
  w6: { k: 'VII. yıldız · Ayna Sarayı', t: 'Kendini Seven Işık', art: 6, b: [
    'Kün Ata kendini daha iyi görmek için bir saray yaptırdı, duvarlarını aynalarla kaplattı.',
    'Aynalar ışığı çoğaltır ama gölgeyi asla; burası ışığın ışıkla dövüştüğü yerdir.',
    'Sarayın bahçesinde tek bir alçakgönüllü çiçek açar: lale. Başını eğmeyi bilen tek şey.'] },
  w7: { k: 'VIII. yıldız · Gök Saati', t: 'Duran Zaman', art: 7, b: [
    'Tün Ana kırıldığı an Gök Saati öğlede durdu. Sarkaç o günden beri aynı yerde salınır, dişliler aynı saniyeyi öğütür.',
    'Son yıldız bu saatin kalbinde.',
    'Onu yerine koy; saat yürüsün. Güneş ilk kez batabilsin.'] },
  end: { k: 'Son', t: 'Gündönümü', art: 'sunset', b: [
    'Ve gündönümünden beri ilk kez Kün Ata batmayı hatırladı.',
    'Ufka eğilirken küçük bir gölgeye baktı ve onu yakmadı.',
    'Tün Ana’nın gecesi eve döndü. Zifir şimdi onun yıldızlarını taşıyor; her akşam güneşi uğurlayan ilk gölge o.'] },
};
for (let c = 0; c < 8; c++) LORE['c' + c] = { k: `Tün Ana’nın Ninnisi · ${c + 1}/8`, t: `${CHAPTERS[c].constellation} göğe asıldı`, art: { done: c }, ninni: c };

const Lore = {
  open: false, opaque: false, pages: [], i: 0, t: 0, done: null, book: false, stars: null,
  needWorld(ch) { return !Save.seen('lore-w' + ch); },
  worldPages(ch) { const p = []; if (ch === 0 && !Save.seen('lore-p')) p.push('p1', 'p2', 'p3', 'p4'); p.push('w' + ch); return p; },
  // bir dizi sayfa oynat; bitince (ya da atlanınca) devam fonksiyonu çağrılır
  play(pages, done) {
    if (window.__noLore || !pages.length) { done && done(); return; }
    this.pages = pages; this.i = 0; this.done = done; this.book = false; this.show();
  },
  openBook() {
    const p = []; if (Save.seen('lore-p')) p.push('p1', 'p2', 'p3', 'p4');
    for (let c = 0; c < 8; c++) { if (Save.seen('lore-w' + c)) p.push('w' + c); if (Save.seen('lore-c' + c)) p.push('c' + c); }
    if (Save.seen('lore-end')) p.push('end');
    if (!p.length) { toast('Hikâye ilk adada başlar. <em>Başla</em>’ya dokun.', 2.4); return; }
    audio.ui(); this.pages = p; this.i = 0; this.done = null; this.book = true; this.show();
  },
  show() {
    const el = $('#lore'); this.open = true; this.opaque = false;
    if (!this.cv) this.init();
    el.classList.add('on'); el.classList.toggle('book', this.book);
    this.page(0); this.last = performance.now(); requestAnimationFrame((t) => this.loop(t));
    setTimeout(() => { if (this.open) this.opaque = true; }, 700);
  },
  init() {
    this.cv = $('#loreArt'); this.cx = this.cv.getContext('2d');
    const rs = () => { const d = Math.min(1.75, window.devicePixelRatio || 1); this.dpr = d; this.cv.width = Math.round(this.cv.clientWidth * d); this.cv.height = Math.round(this.cv.clientHeight * d); };
    rs(); addEventListener('resize', () => this.open && rs());
    let s = 7; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    this.stars = Array.from({ length: 150 }, () => ({ x: R(), y: R(), r: 0.4 + R() * 1.3, p: R() * 9, w: 0.6 + R() * 2.2 }));
    $('#lore').addEventListener('pointerdown', (e) => { if (e.target.closest('#loreSkip,#loreBack')) return; e.preventDefault(); this.tap(); });
    $('#loreSkip').addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });
    $('#loreBack').addEventListener('click', (e) => { e.stopPropagation(); if (this.i > 0) { audio.ui(); this.page(this.i - 1); } });
  },
  page(i) {
    this.i = i; this.t = 0; const P = LORE[this.pages[i]], id = this.pages[i];
    $('#loreK').textContent = P.k; $('#loreT').textContent = P.t;
    const body = $('#loreB'); body.innerHTML = '';
    if (P.ninni != null) {
      NINNI.forEach((ln, k) => { if (k > P.ninni) return; const s = document.createElement('span'); s.className = 'nl' + (k === P.ninni ? ' new' : ''); s.textContent = ln; s.style.animationDelay = `${k === P.ninni ? 0.9 + P.ninni * 0.12 : 0.25 + k * 0.12}s`; body.appendChild(s); });
      const c = document.createElement('span'); c.className = 'cap'; c.textContent = P.ninni === 7 ? 'Ninni tamamlandı. Dinle: gece eve geliyor.' : 'Gökte bir dize daha yandı.'; c.style.animationDelay = `${1.8 + P.ninni * 0.12}s`; body.appendChild(c);
    } else P.b.forEach((tx, k) => {
      const s = document.createElement('span'); s.className = 's'; s.style.animationDelay = `${0.55 + k * 1.15}s`;
      if (k === 0) { const dc = document.createElement('b'); dc.className = 'dc'; dc.textContent = tx[0]; s.appendChild(dc); s.appendChild(document.createTextNode(tx.slice(1) + ' ')); } else s.textContent = tx + ' ';
      body.appendChild(s);
    });
    body.classList.remove('all'); void body.offsetWidth;
    this.revealT = P.ninni != null ? 2.6 : 0.55 + P.b.length * 1.15;
    $('#loreDots').innerHTML = this.pages.length > 1 ? this.pages.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'past' : ''}"></i>`).join('') : '';
    $('#loreBack').classList.toggle('on', this.book && i > 0);
    $('#lore').classList.remove('turn'); void $('#lore').offsetWidth; $('#lore').classList.add('turn');
    if (/^c\d$/.test(id) || id === 'end') audio.chime(); else audio.whoosh(false, 0.9, 0.035);
    if (!this.book) Save.markSeen(id === 'p1' || id === 'p2' || id === 'p3' || id === 'p4' ? 'lore-p' : 'lore-' + id);
  },
  tap() {
    if (this.t < this.revealT) { this.t = this.revealT; $('#loreB').classList.add('all'); return; }
    if (this.i < this.pages.length - 1) { audio.ui(); this.page(this.i + 1); } else this.finish();
  },
  finish() {
    if (!this.open) return;
    if (!this.book) for (const id of this.pages) Save.markSeen(/^p\d$/.test(id) ? 'lore-p' : 'lore-' + id);
    this.open = false; this.opaque = false; $('#lore').classList.remove('on'); audio.ui();
    const d = this.done; this.done = null; if (d) setTimeout(d, 60);
  },
  loop(now) {
    if (!this.open) return;
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.12, (now - this.last) / 1000); this.last = now; this.t += dt;
    this.draw(this.t, now / 1000);
  },
  // ---------- altın mürekkep çizimleri ----------
  draw(t, T) {
    const x = this.cx, W = this.cv.width, H = this.cv.height, d = this.dpr; x.clearRect(0, 0, W, H);
    // yıldız tozu
    for (const s of this.stars) { const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(T * s.w + s.p)); x.fillStyle = `rgba(235,228,255,${a.toFixed(3)})`; x.fillRect(s.x * W, s.y * H, s.r * d, s.r * d); }
    const P = LORE[this.pages[this.i]]; if (!P) return;
    const S = Math.min(W, H * 0.62) * 0.42, cx = W / 2, cy = H * 0.27;
    const k = (a, b) => clamp01((t - a) / b), E = (v) => 1 - Math.pow(1 - v, 3);
    const gold = (a, w = 1.6) => { x.strokeStyle = `rgba(255,214,140,${a})`; x.lineWidth = w * d; x.lineCap = 'round'; x.lineJoin = 'round'; };
    const glowLine = (fn, a = 1, w = 1.6) => { x.globalCompositeOperation = 'lighter'; gold(a * 0.18, w * 4); fn(); gold(a * 0.95, w); fn(); x.globalCompositeOperation = 'source-over'; };
    const dot = (px, py, r, a = 1) => { x.globalCompositeOperation = 'lighter'; const g = x.createRadialGradient(px, py, 0, px, py, r * 4); g.addColorStop(0, `rgba(255,236,190,${a})`); g.addColorStop(0.25, `rgba(255,200,120,${a * 0.45})`); g.addColorStop(1, 'rgba(255,180,90,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, r * 4, 0, TAU); x.fill(); x.globalCompositeOperation = 'source-over'; };
    const partial = (pts, f, closed = false) => { const n = pts.length - (closed ? 0 : 1); const m = f * n; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= Math.ceil(m); i++) { const a = pts[(i - 1) % pts.length], b = pts[i % pts.length], u = Math.min(1, m - (i - 1)); x.lineTo(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); } x.stroke(); };
    const circ = (px, py, r, f = 1, a0 = -PI / 2) => { x.beginPath(); x.arc(px, py, r, a0, a0 + TAU * f); x.stroke(); };
    const art = P.art;
    if (art === 'siblings') {
      // solda güneş, sağda hilal: aralarında dönen dünya
      const sx = cx - S * 0.62, mx = cx + S * 0.62, f = E(k(0.1, 1.6));
      glowLine(() => circ(sx, cy, S * 0.22, f), 1, 1.8);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + T * 0.15, r0 = S * 0.3, r1 = S * (0.38 + (i % 2) * 0.07), q = k(0.6 + i * 0.06, 0.4); if (q <= 0) continue; glowLine(() => { x.beginPath(); x.moveTo(sx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(sx + Math.cos(a) * (r0 + (r1 - r0) * q), cy + Math.sin(a) * (r0 + (r1 - r0) * q)); x.stroke(); }, 0.9, 1.4); }
      const mf = E(k(0.5, 1.6));
      glowLine(() => { x.beginPath(); x.arc(mx, cy, S * 0.24, -PI * 0.62, -PI * 0.62 + PI * 1.24 * mf, false); x.stroke(); if (mf > 0.98) { x.beginPath(); x.arc(mx + S * 0.1, cy - S * 0.03, S * 0.2, PI * 0.42, -PI * 0.5, true); x.stroke(); } }, 1, 1.8);
      for (let i = 0; i < 5; i++) { const q = k(1.4 + i * 0.2, 0.5); if (q > 0) dot(mx + S * (0.32 + 0.12 * Math.cos(i * 2.1)), cy - S * (0.25 - i * 0.12), 1.4 * d, q * (0.6 + 0.4 * Math.sin(T * 2 + i))); }
      const wf = E(k(1.2, 1.4)); glowLine(() => { x.setLineDash([3 * d, 7 * d]); x.beginPath(); x.ellipse(cx, cy + S * 0.05, S * 0.95, S * 0.32, 0, PI * 0.08, PI * 0.08 + PI * 0.84 * wf); x.stroke(); x.setLineDash([]); }, 0.6, 1);
      dot(cx + Math.cos(T * 0.5) * S * 0.95 * 0.98, cy + S * 0.05 + Math.sin(T * 0.5) * S * 0.32, 2 * d, wf);
    } else if (art === 'shatter') {
      // tepede batmayan güneş; altta çatlayıp dağılan hilal
      const f = E(k(0.1, 1.2)); glowLine(() => circ(cx, cy - S * 0.28, S * 0.17, f), 1, 1.8);
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
      x.fillStyle = 'rgba(14,9,26,0.92)'; shape(); x.fill(); glowLine(() => { shape(); x.stroke(); }, k(0.1, 0.8), 1.6);
      if (t > 2.4) { const bl = Math.sin(T * 0.7) > 0.96 ? 0.15 : 1; x.fillStyle = 'rgba(255,248,236,0.95)'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * r * 0.35, dy - r * 0.05, r * 0.14, r * 0.19 * bl, 0, 0, TAU); x.fill(); } }
      for (let i = 0; i < 5; i++) {
        const q = k(1.0 + i * 0.25, 0.8); if (q <= 0) continue;
        const a = T * (0.55 + i * 0.07) + i * 1.3, bx = cx + Math.cos(a) * S * (0.55 + i * 0.06), by = cy - S * 0.1 + Math.sin(a) * S * 0.22, w = S * 0.07, fl = Math.sin(T * 9 + i) * 0.35;
        glowLine(() => { x.beginPath(); x.moveTo(bx - w, by - w * (0.3 + fl)); x.quadraticCurveTo(bx - w * 0.4, by - w * 0.1, bx, by + w * 0.15); x.quadraticCurveTo(bx + w * 0.4, by - w * 0.1, bx + w, by - w * (0.3 + fl)); x.stroke(); }, q * 0.85, 1.3);
      }
    } else if (art === 'bow') {
      // güneşin yayı: çentikli yay, üzerinde güneş; altında gölgede bekleyen damla
      const f = E(k(0.1, 1.8)), R = S * 0.78, by = cy + S * 0.42;
      glowLine(() => { x.beginPath(); x.arc(cx, by, R, PI, PI + PI * f); x.stroke(); }, 1, 2.2);
      glowLine(() => { x.beginPath(); x.arc(cx, by, R * 0.93, PI, PI + PI * f); x.stroke(); }, 0.6, 1.1);
      for (let i = 0; i <= 12; i++) { const u = i / 12; if (u > f) break; const a = PI + PI * u, l = i % 3 ? 0.05 : 0.09; glowLine(() => { x.beginPath(); x.moveTo(cx + Math.cos(a) * R, by + Math.sin(a) * R); x.lineTo(cx + Math.cos(a) * R * (1 + l), by + Math.sin(a) * R * (1 + l)); x.stroke(); }, 0.8, 1.2); }
      const u = 0.5 + Math.sin(T * 0.45) * 0.32, a = PI + PI * u, sx = cx + Math.cos(a) * R, sy = by + Math.sin(a) * R, q = k(1.6, 0.8);
      if (q > 0) { dot(sx, sy, 5 * d, q); glowLine(() => circ(sx, sy, S * 0.07), q, 1.6); }
      if (t > 2.2) { // gölge kaması ve damla
        const zx = cx, zy = by - S * 0.02, sh = Math.atan2(zy - sy, zx - sx), L = S * 0.5, q2 = k(2.2, 1);
        x.fillStyle = `rgba(30,18,60,${0.55 * q2})`; x.beginPath(); x.moveTo(zx - Math.cos(sh + 1.57) * S * 0.12, zy - Math.sin(sh + 1.57) * S * 0.12); x.lineTo(zx + Math.cos(sh) * L - Math.cos(sh + 1.57) * S * 0.2, zy + Math.sin(sh) * L * 0.4); x.lineTo(zx + Math.cos(sh) * L + Math.cos(sh + 1.57) * S * 0.2, zy + Math.sin(sh) * L * 0.4); x.lineTo(zx + Math.cos(sh + 1.57) * S * 0.12, zy + Math.sin(sh + 1.57) * S * 0.12); x.fill();
        x.fillStyle = 'rgba(14,9,26,0.95)'; x.beginPath(); x.arc(zx, zy - S * 0.06, S * 0.07, 0, TAU); x.fill(); glowLine(() => circ(zx, zy - S * 0.06, S * 0.07), q2 * 0.7, 1.1);
      }
    } else if (art === 'sunset') {
      // ufka eğilen güneş; gece geri gelirken sekiz takımyıldızı yanar
      const hz = cy + S * 0.25, sink = E(k(0.3, 4.5));
      glowLine(() => { x.beginPath(); x.moveTo(cx - S * 1.2, hz); x.lineTo(cx + S * 1.2, hz); x.stroke(); }, 0.7, 1.2);
      x.save(); x.beginPath(); x.rect(0, 0, W, hz); x.clip();
      const sy = hz - S * 0.35 + sink * S * 0.55; dot(cx, sy, 7 * d, 1 - sink * 0.6); glowLine(() => circ(cx, sy, S * 0.2), 1 - sink * 0.4, 1.8);
      x.restore();
      for (let c = 0; c < 8; c++) {
        const q = k(1.2 + c * 0.35, 0.9); if (q <= 0) continue;
        const a = PI + (c + 0.5) / 8 * PI, ox = cx + Math.cos(a) * S * 1.05, oy = hz - 6 * d + Math.sin(a) * S * 0.62, sc = S * 0.0022;
        const pts = CONST[c].map(([px, py]) => [ox + (px - 50) * sc, oy + (py - 60) * sc]);
        for (const p of pts) dot(p[0], p[1], 0.9 * d, q * 0.8);
      }
    } else {
      // takımyıldızı: dünya girişinde çizilerek, ninni sayfasında parlayarak
      const ch = typeof art === 'number' ? art : art.done, doneP = typeof art !== 'number';
      const sc = S * 0.0115, pts = CONST[ch].map(([px, py]) => [cx + (px - 50) * sc, cy + (py - 60) * sc]);
      const edges = CONST_EDGES[ch] || SEQ, per = 2.4 / edges.length;
      edges.forEach(([a, b], i) => { const q = doneP ? 1 : E(k(0.3 + i * per, per * 1.4)); if (q <= 0) return; glowLine(() => { x.beginPath(); x.moveTo(pts[a][0], pts[a][1]); x.lineTo(pts[a][0] + (pts[b][0] - pts[a][0]) * q, pts[a][1] + (pts[b][1] - pts[a][1]) * q); x.stroke(); }, doneP ? 0.75 + 0.25 * Math.sin(T * 2) : 0.85, 1.4); });
      pts.forEach((p, i) => { const q = doneP ? 1 : k(0.2 + i * 0.25, 0.5); if (q > 0) dot(p[0], p[1], (doneP ? 2.4 : 1.8) * d, q * (0.75 + 0.25 * Math.sin(T * 2.3 + i))); });
      if (doneP) { const r = E(k(0.2, 1.6)); glowLine(() => circ(cx, cy, S * (0.95 + r * 0.25), 1), (1 - r) * 0.8, 1.2); }
    }
  },
};
// kart açıkken 3B çizimi atla (opak arka plan): düşük cihazda tam akıcılık
