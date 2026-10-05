/* =====================================================================
   KARAGÖZ İLE HACİVAT — perdeler arası ara sahneler
   Kandille arkadan aydınlanan amber perde; renkli, yarı saydam deri
   tasvirler (delik süslemeler, eklemli baş ve kol); daktilo gibi akan
   atışmalar, nareke ve def. Hepsi tek bir 2B tuvalde, perde bir kez
   pişirilir; kart açıkken 3B sahne çizilmez (düşük cihazda da akıcı).
   ===================================================================== */
// sahne sonrası atışmalar: tiyatrodaki sahne sırası → satırlar (K: Karagöz, H: Hacivat; g: hareket)
const KH_SCENES = {
  0: [
    ['H', 'Hay Hak! Karagözüm, gördün mü? Bülbül güle âşık olmuş, sabaha dek feryâd ü figân eyledi!'],
    ['K', 'Feryat mı? Ben de komşunun horozu sandım; sabahtan beri uyutmadı!'],
    ['H', 'Aman efendim, o bülbül! Gül bahçesinin sultanı, aşkın ta kendisi.'],
    ['K', 'Aşk dediğin bu mu? Gece boyu bağır, sabah dikene konup ah vah et… Bizim mahallede buna “evlilik” derler!', 'zipla'],
  ],
  1: [
    ['H', 'Karagözüm, kedi kelebeği avlamak için ne sabır gösterdi, ne zarafet!'],
    ['K', 'Zarafet mi? Benim kedi geçen hafta ciğerciyi avladı; ciğerci de beni avladı!'],
    ['H', 'Yâ Karagöz, sabır acıdır, meyvesi tatlıdır.'],
    ['K', 'Hacivat, sen bana o meyveden ver; acısını ben zaten her gün yiyorum!'],
  ],
  3: [
    ['H', 'Ah Karagözüm, bahr-i muhîtin en cesîm mahlûkunu gördün!'],
    ['K', 'Cesim mi? Kaç kilo, onu söyle! Balıkçı Ali tartısıyla gelsin.'],
    ['H', 'Efendim, balina balık değildir. Nefes almak için suyun yüzüne çıkar.'],
    ['K', 'Tıpkı ben! Kira boğazıma kadar çıktı; ben de nefes almaya kahvehaneye çıkıyorum!', 'zipla'],
  ],
  4: [
    ['H', 'Gördün mü Karagöz, koca fil yavrusunu nasıl da şefkatle kuyruğunda taşıdı!'],
    ['K', 'Şefkat mi? Yavru çekiyor, fil gidiyor. Bizim evde de aynı: çocuklar çeker, ben giderim!'],
    ['H', 'Fil, hafızası kuvvetli bir hayvandır; hiçbir şeyi unutmaz.'],
    ['K', 'Hiçbir şeyi mi? Ona borç vermem o hâlde. Sana veririm Hacivat; sen hepsini unutursun!'],
  ],
  5: [
    ['H', 'Hay Hak! Karagözüm, perdemize misafir geldi: Tün Ana’nın son damlası, Zifir!'],
    ['K', 'Damla mı? Bizim tavandan da damla akıyor; ev sahibine gösterelim, belki çatıyı yapar!'],
    ['H', 'Yâ Karagöz, o damla güneşten kaçan bir gölgedir. Gün boyu yürür, geceyi eve getirir.'],
    ['K', 'Güneşten kaçan gölge… Ben de alacaklıdan kaçan Karagöz’üm! Al Zifir kardeş, şu kavuğu da tak başına; güneş tepeni yakmasın.', 'kavuk'],
  ],
  7: [
    ['H', 'Karagözüm, geyik başında koca bir orman taşıyor. Ne heybet, ne vakar!'],
    ['K', 'Onun başında orman varsa benim başımda çöl var Hacivat!', 'kel'],
    ['H', 'Kelliğin de bir hikmeti vardır efendim: güneş seni ısıtır.'],
    ['K', 'Isıtmıyor, yakıyor! Güneşi kim çeviriyorsa söyleyin, biraz da benim tarafa gölge düşürsün!'],
  ],
  9: [
    ['H', 'Kartal gökten süzüldü, balık sudan sıçradı; aynı anda buluştular. Ne tevafuk!'],
    ['K', 'Tevafuk değil Hacivat, randevu! Balık geç kalsa kartal aç kalacaktı.'],
    ['H', 'Âlemde her şeyin bir vakti vardır.'],
    ['K', 'Doğru! Yemek vakti, uyku vakti… Bir de senin lafının bitme vakti var; o hiç gelmiyor!', 'kafa'],
  ],
  12: [
    ['H', 'Çölün gemileri, kervan hâlinde, bir kılavuz yıldızın peşinde…'],
    ['K', 'Gemi mi? Deve yüzer mi Hacivat? Ben buna binip denize açılırsam ıslanırım!'],
    ['H', 'Mecaz Karagözüm, mecaz! Deve sabrıyla meşhurdur; susuz günlerce yürür.'],
    ['K', 'Susuz günlerce… Bizim mahallenin çeşmesi de öyle; demek o da deve!'],
  ],
  14: [
    ['H', 'Karagözüm, son efsane de canlandı. Kaçak gölgelerin hepsi perdeye döndü.'],
    ['K', 'Bitti mi yani? Ben de tam ejderhadan bir ateş alıp çay demleyecektim!'],
    ['H', 'Şimdi Usta yeni bir perde asıyor: bizim destanımız. Bu perde şakaya gelmez.'],
    ['K', 'Haklısın Hacivat. Kavuğumu çıkarır, hürmetle izlerim.', 'selam'],
  ],
  24: [
    ['H', 'Hay Hak! Yüzyıllar bir perdeden geçti; Ergenekon’dan Cumhuriyet’e…'],
    ['K', 'Hacivat, bu perdede güldüm, ağladım, alkışladım. Ellerim nasır tuttu!'],
    ['H', 'Perde kapanır, Karagözüm; gölgeler kalplerde yaşar.'],
    ['K', 'Yıktın perdeyi, eyledin viran; varayım sahibine haber vereyim, heman!', 'selam'],
  ],
};
// tasvir parçaları (figür uzayı: ayak tabanı orijin, y aşağı, yüz sağa)
const KH_FIG = {
  K: {
    h: 252, neck: [2, -152], shoulder: [10, -136],
    parts: [
      { d: 'M -34 -54 C -40 -36 -34 -20 -26 -12 L -20 -6 L 22 -6 L 26 -12 C 34 -24 36 -40 32 -54 Z', c: '#2f8a5a', dots: [[-24, -40], [-16, -28], [14, -30], [22, -42]] },
      { d: 'M -26 -8 C -27 -1 -22 3 -12 3 L 28 3 C 38 3 44 -2 48 -14 C 43 -9 37 -8 30 -9 Z', c: '#c42a2a' },
      { d: 'M -16 -150 C -32 -146 -38 -130 -38 -112 C -38 -96 -34 -86 -32 -80 L -46 -52 L 42 -52 L 36 -80 C 46 -98 44 -124 32 -140 C 24 -149 14 -153 4 -153 Z', c: '#e9a227', dots: [[-36, -56], [-24, -56], [-12, -56], [0, -56], [12, -56], [24, -56], [36, -56], [8, -128], [14, -120], [6, -112], [-2, -120], [6, -120]] },
      { d: 'M -34 -86 L 38 -86 L 39 -76 L -33 -76 Z', c: '#b8232f', dots: [[-24, -81], [-10, -81], [4, -81], [18, -81], [30, -81]] },
    ],
    head: [
      { d: 'M -14 0 C -26 -8 -30 -28 -24 -44 L 16 -47 C 20 -41 22 -35 22 -31 C 32 -31 44 -27 44 -18 C 44 -10 36 -8 29 -10 L 29 -6 L 20 -3 Z', c: '#e9bb8c' },
      { d: 'M -12 -18 C -5 -8 6 -5 26 -5 C 35 3 31 18 17 23 C 2 27 -11 19 -15 7 C -17 0 -15 -10 -12 -18 Z', c: '#141010', solid: true },
      { d: 'M -25 -42 L 21 -46 L 22 -55 L -25 -52 Z', c: '#e9a227', dots: [[-16, -48], [-4, -49], [8, -50]] },
      { d: 'M 20 -55 C 23 -73 19 -91 5 -103 C -9 -113 -27 -101 -31 -87 C -35 -77 -37 -69 -31 -65 C -27 -61 -25 -57 -24 -52 Z', c: '#c4232f', dots: [[2, -92], [-8, -86], [6, -78], [-14, -74], [-4, -66], [10, -64]] },
    ],
    eye: [10, -31, 7.5, 6.5, 4.2], brow: 'M 2 -40 Q 10 -45 19 -39', tassel: [-32, -64],
    arm: { up: [7, 30], lo: [26, 42], w: 13, c: '#e9a227', hand: '#e9bb8c' },
  },
  H: {
    h: 270, neck: [0, -158], shoulder: [8, -142],
    parts: [
      { d: 'M -20 -8 L 36 -8 C 46 -8 48 -2 42 3 L -22 3 Z', c: '#e7c35a' },
      { d: 'M -14 -158 C -30 -152 -34 -132 -32 -102 C -30 -72 -40 -32 -44 -8 L 30 -8 C 28 -32 30 -72 32 -102 C 34 -130 26 -150 10 -160 Z', c: '#2a7f86', dots: [[-38, -14], [-26, -12], [-12, -12], [2, -12], [16, -12], [-28, -40], [-26, -70], [-24, -100], [-22, -128]] },
      { d: 'M 12 -148 C 22 -122 24 -62 23 -9 L 30 -9 C 30 -62 31 -112 23 -148 Z', c: '#b8323a', dots: [[24, -130], [26, -100], [27, -70], [27, -40]] },
      { d: 'M -32 -98 L 33 -98 L 33 -90 L -31 -90 Z', c: '#e7c35a' },
    ],
    head: [
      { d: 'M -12 0 C -21 -10 -23 -30 -17 -46 L 14 -48 C 17 -41 19 -35 20 -31 L 33 -24 L 22 -20 C 22 -16 20 -12 18 -10 L 14 -7 Z', c: '#ecc296' },
      { d: 'M -9 -14 C 2 -10 14 -9 18 -9 C 19 1 16 14 28 31 C 9 27 -4 15 -11 2 Z', c: '#141010', solid: true },
      { d: 'M -21 -44 C -27 -70 -25 -96 -15 -110 L 15 -112 C 23 -96 23 -70 17 -46 Z', c: '#efe6cf', stripes: true },
      { d: 'M -13 -108 C -7 -122 7 -122 13 -110 Z', c: '#2f8a5a' },
    ],
    eye: [7, -32, 6.5, 3.6, 2.8], brow: 'M 0 -38 Q 8 -42 16 -38',
    arm: { up: [4, 32], lo: [22, 30], w: 12, c: '#2a7f86', hand: '#ecc296' },
  },
};
// göstermelik: solda Karagöz'ün evi, sağda Hacivat'ın cumbalı köşkü (perdeye bir kez pişirilir)
const KH_SET = {
  K: [
    { d: 'M 76 -146 L 76 -172 L 90 -172 L 90 -134 Z', c: '#7a3b1e' },
    { d: 'M 0 0 L 0 -110 L 104 -110 L 104 0 Z', c: '#c8742f', dots: [[10, -100], [94, -100], [10, -10], [94, -10], [30, -100], [50, -100], [70, -100]] },
    { d: 'M -14 -104 L 52 -162 L 118 -104 Z', c: '#a8322a', dots: [[8, -112], [22, -124], [36, -136], [52, -148], [68, -136], [82, -124], [96, -112], [52, -126], [52, -114]] },
    { d: 'M 58 0 L 58 -50 Q 74 -72 90 -50 L 90 0 Z', c: '#2f6b45', dots: [[84, -24]] },
    { d: 'M 14 -90 L 44 -90 L 44 -58 L 14 -58 Z', c: '#f0cf72', lattice: true },
  ],
  H: [
    { d: 'M 6 0 L 6 -104 L 112 -104 L 112 0 Z', c: '#d9b877', dots: [[16, -12], [102, -12], [16, -94], [102, -94]] },
    { d: 'M -14 -104 L 6 -104 L 6 -88 Z M 112 -104 L 126 -104 L 112 -88 Z', c: '#6b3a1c' },
    { d: 'M -14 -104 L -14 -166 L 126 -166 L 126 -104 Z', c: '#3e8a8e', dots: [[-6, -110], [118, -110], [-6, -160], [118, -160], [56, -160]] },
    { d: 'M -26 -162 L 56 -208 L 138 -162 Z', c: '#4a5a8c', dots: [[-8, -168], [10, -178], [28, -188], [56, -200], [84, -188], [102, -178], [120, -168], [56, -178]] },
    { d: 'M 2 -114 L 2 -140 Q 14 -156 26 -140 L 26 -114 Z M 44 -114 L 44 -140 Q 56 -156 68 -140 L 68 -114 Z M 86 -114 L 86 -140 Q 98 -156 110 -140 L 110 -114 Z', c: '#f3dc8a', lattice: true },
    { d: 'M 62 0 L 62 -58 Q 80 -80 98 -58 L 98 0 Z', c: '#7a2f2f', dots: [[70, -30], [90, -30]] },
    { d: 'M 18 -84 L 44 -84 L 44 -40 L 18 -40 Z', c: '#f0cf72', lattice: true },
  ],
};
const KH_INK = 'rgba(38,16,4,0.92)';
// arkadan aydınlanan deri: renk perdeyle çarpılır (ışık içinden geçer), üstüne biraz kendi rengi; delikler ışık sızdırır
function khLeather(x, path, part, lw = 2.4, lit = null) {
  // önce arkadaki perdeyi geri koy: tasvir göstermeliği örter, ışık yalnızca derinin içinden geçer
  if (lit) { lit.setTransform(x.getTransform().invertSelf()); x.fillStyle = lit; x.fill(path); }
  x.globalCompositeOperation = 'multiply'; x.globalAlpha = 1; x.fillStyle = part.c; x.fill(path);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = part.solid ? 0.9 : 0.4; x.fill(path); x.globalAlpha = 1;
  if (part.stripes || part.lattice) {
    x.save(); x.clip(path);
    if (part.stripes) { x.strokeStyle = 'rgba(40,128,84,0.9)'; x.lineWidth = 4; for (let k = -120; k < 0; k += 12) { x.beginPath(); x.moveTo(-30, k); x.lineTo(30, k - 10); x.stroke(); } }
    else { x.strokeStyle = 'rgba(70,34,10,0.75)'; x.lineWidth = 1.6; x.beginPath(); for (let k = -240; k < 240; k += 7) { x.moveTo(k, -240); x.lineTo(k + 240, 0); x.moveTo(k + 240, -240); x.lineTo(k, 0); } x.stroke(); }
    x.restore();
  }
  x.strokeStyle = KH_INK; x.lineWidth = lw; x.stroke(path);
  if (part.dots) {
    x.fillStyle = 'rgba(255,226,160,0.2)'; x.beginPath(); for (const [a, b] of part.dots) { x.moveTo(a + 2.8, b); x.arc(a, b, 2.8, 0, TAU); } x.fill();
    x.fillStyle = 'rgba(255,244,212,0.92)'; x.beginPath(); for (const [a, b] of part.dots) { x.moveTo(a + 1.35, b); x.arc(a, b, 1.35, 0, TAU); } x.fill();
  }
}
const KH_BALD = 'M -25 -42 C -29 -62 -8 -73 6 -71 C 17 -69 24 -58 21 -46 Z';
const KH = {
  open: false, opaque: false, lines: [], li: 0, chars: 0, t: 0, lineT: 0, done: null, gag: null, gen: 0,
  has(i) { return !!KH_SCENES[i] && !Save.seen('kh' + i) && !window.__noKH; },
  play(i, done) {
    if (!this.cv) this.init();
    const gen = ++this.gen;
    this.lines = KH_SCENES[i]; this.sceneIdx = i; this.done = done; this.li = -1; this.t = 0; this.gag = null; this.kav = false; this.kavGone = false; this.exitT = null; this.text = ''; this.fx = null; this.hatFly = null;
    this.P = { K: { x: -0.3, y: 0, r: 0, hr: 0, ar: 0, talk: 0, hat: 0 }, H: { x: 1.3, y: 0, r: 0, hr: 0, ar: 0, talk: 0, hat: 0 } };
    this.open = true; this.opaque = false; $('#kh').classList.add('on'); $('#khTxt').textContent = ''; this.resize();
    setTimeout(() => { if (this.open && this.gen === gen) this.opaque = true; }, 650);
    if (stMus.ok) stMus.bus.gain.setTargetAtTime(0.3, stMus.c.currentTime, 0.5); // atışma duyulsun
    audio.khNareke(); this.last = performance.now(); requestAnimationFrame((t) => this.loop(t));
    setTimeout(() => { if (this.gen === gen && this.li < 0) this.next(); }, 1500);
    Save.markSeen('kh' + i);
  },
  init() {
    this.cv = $('#khArt'); this.cx = this.cv.getContext('2d');
    const P2 = (a) => a.map((p) => new Path2D(p.d));
    this.paths = {}; for (const w of ['K', 'H']) { const F = KH_FIG[w]; this.paths[w] = { parts: P2(F.parts), head: P2(F.head), brow: new Path2D(F.brow) }; }
    this.bald = new Path2D(KH_BALD);
    addEventListener('resize', () => this.open && this.resize());
    $('#kh').addEventListener('pointerdown', (e) => { if (e.target.closest('#khSkip')) return; e.preventDefault(); this.tap(); });
    $('#khSkip').addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });
  },
  resize() {
    const d = Math.min(1.6, window.devicePixelRatio || 1); this.dpr = d;
    const cw = this.cv.clientWidth, ch = this.cv.clientHeight, W = (this.cv.width = Math.round(cw * d)), H = (this.cv.height = Math.round(ch * d));
    // dikeyde perde üstte, yazı altta; yatayda perde solda, yazı sağda
    const wide = cw > ch * 1.3; $('#kh').classList.toggle('wide', wide);
    const top = wide ? H * 0.15 : H * 0.1, bot = wide ? H * 0.9 : Math.min(H * 0.72, H - 215 * d), l = W * 0.04, r = wide ? W * 0.62 : W - l;
    this.cur = { top, bot, l, r }; this.s = ((bot - top) * 0.62) / 260;
    $('#khCap').style.top = wide ? '' : Math.round(bot / d + 26) + 'px';
    // perde: bir kez pişirilir (kandil ışığı, dokuma, göstermelik evler, çerçeve, üst süsleme)
    const bg = this.bg || (this.bg = document.createElement('canvas')); bg.width = W; bg.height = H; const x = bg.getContext('2d');
    const wood = x.createLinearGradient(0, 0, 0, H); wood.addColorStop(0, '#2b170b'); wood.addColorStop(0.5, '#1d0f07'); wood.addColorStop(1, '#0d0603'); x.fillStyle = wood; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(${i % 2 ? '70,40,20' : '10,5,2'},0.18)`; x.lineWidth = d; const yy = Math.random() * H; x.beginPath(); x.moveTo(0, yy); x.bezierCurveTo(W * 0.3, yy + 6 * d, W * 0.6, yy - 6 * d, W, yy + 3 * d); x.stroke(); }
    const cxm = (l + r) / 2, cym = (top + bot) / 2;
    const g = x.createRadialGradient(cxm, cym + (bot - top) * 0.08, 0, cxm, cym, Math.max(r - l, bot - top) * 0.75);
    g.addColorStop(0, '#fff4d6'); g.addColorStop(0.35, '#f7d48e'); g.addColorStop(0.75, '#d99a50'); g.addColorStop(1, '#8a4c1e');
    x.fillStyle = g; x.fillRect(l, top, r - l, bot - top);
    // patiska dokusu: küçük karo, desen olarak
    const tile = document.createElement('canvas'); tile.width = tile.height = 48; const tx = tile.getContext('2d'), id = tx.createImageData(48, 48);
    for (let k = 0; k < 48 * 48; k++) { const u = k % 48, v = (k / 48) | 0, w = ((u & 1) ^ (v & 1)) ? 14 : -10, n = (Math.random() - 0.5) * 34 + w; id.data[k * 4] = id.data[k * 4 + 1] = id.data[k * 4 + 2] = 128 + n; id.data[k * 4 + 3] = 255; }
    tx.putImageData(id, 0, 0);
    x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.16; x.fillStyle = x.createPattern(tile, 'repeat'); x.fillRect(l, top, r - l, bot - top); x.restore();
    const vg = x.createLinearGradient(l, 0, r, 0); vg.addColorStop(0, 'rgba(60,25,5,0.42)'); vg.addColorStop(0.1, 'rgba(60,25,5,0)'); vg.addColorStop(0.9, 'rgba(60,25,5,0)'); vg.addColorStop(1, 'rgba(60,25,5,0.42)'); x.fillStyle = vg; x.fillRect(l, top, r - l, bot - top);
    const lit = this.lit || (this.lit = document.createElement('canvas')); lit.width = W; lit.height = H; lit.getContext('2d').drawImage(bg, 0, 0); this.litPat = this.cx.createPattern(lit, 'no-repeat');
    // göstermelik evler (perdenin iki ucunda)
    x.save(); x.beginPath(); x.rect(l, top, r - l, bot - top); x.clip(); x.lineJoin = 'round';
    const s = this.s * 0.82;
    for (const w of ['K', 'H']) {
      x.save(); x.translate(w === 'K' ? l + 4 * d : r - 4 * d, bot - 4 * d); x.scale(w === 'K' ? s : -s, s);
      for (const part of KH_SET[w]) khLeather(x, new Path2D(part.d), part, 2.2);
      x.restore();
    }
    x.restore();
    // çerçeve ve üstte lale kemerli oyma
    x.strokeStyle = '#4a2a12'; x.lineWidth = 6 * d; x.strokeRect(l - 3 * d, top - 3 * d, r - l + 6 * d, bot - top + 6 * d);
    x.strokeStyle = '#c9963f'; x.lineWidth = 1.5 * d; x.strokeRect(l - 7 * d, top - 7 * d, r - l + 14 * d, bot - top + 14 * d);
    const n = Math.max(6, Math.round((r - l) / (46 * d))), aw = (r - l) / n;
    x.fillStyle = '#1d0f07';
    for (let i = 0; i < n; i++) { const a = l + i * aw; x.beginPath(); x.moveTo(a, top); x.lineTo(a + aw, top); x.lineTo(a + aw, top + 10 * d); x.quadraticCurveTo(a + aw * 0.78, top + 10 * d, a + aw * 0.62, top + 22 * d); x.quadraticCurveTo(a + aw / 2, top + 30 * d, a + aw * 0.38, top + 22 * d); x.quadraticCurveTo(a + aw * 0.22, top + 10 * d, a, top + 10 * d); x.closePath(); x.fill(); }
    x.fillStyle = '#c9963f'; for (let i = 0; i < n; i++) { x.beginPath(); x.arc(l + (i + 0.5) * aw, top + 24 * d, 2 * d, 0, TAU); x.fill(); }
    // alt tahta (peşdahta)
    const sh = x.createLinearGradient(0, bot - 5 * d, 0, bot + 4 * d); sh.addColorStop(0, 'rgba(40,18,4,0)'); sh.addColorStop(1, 'rgba(40,18,4,0.55)'); x.fillStyle = sh; x.fillRect(l, bot - 5 * d, r - l, 5 * d);
    if (this.cx) this.draw();
  },
  next() {
    if (!this.open) return;
    this.li++;
    if (this.li >= this.lines.length) { const gen = this.gen; this.exitT = this.t; this.text = ''; setTimeout(() => { if (this.gen === gen) this.finish(); }, 1300); $('#khCap').classList.remove('on'); return; }
    const [who, text, gag] = this.lines[this.li]; this.chars = 0; this.lineT = 0; this.who = who; this.text = text; this.gagNext = gag || null;
    $('#khName').textContent = who === 'K' ? 'Karagöz' : 'Hacivat'; $('#khCap').className = 'on ' + who; $('#khTxt').textContent = '';
    audio.khDef();
  },
  tap() {
    if (!this.text || this.li < 0) return;
    if (this.chars < this.text.length) { this.chars = this.text.length; $('#khTxt').textContent = this.text; return; }
    if (this.gagNext && !this.gag) { this.startGag(this.gagNext); return; }
    if (this.gag) return;
    audio.ui(); this.next();
  },
  startGag(g) {
    this.gag = { k: g, t: 0 }; this.gagNext = null;
    if (g === 'kavuk' && !this.kav) {
      this.kav = true; const gen = this.gen, own = Save.data.costumes || (Save.data.costumes = []);
      if (!own.includes('karagoz')) { own.push('karagoz'); Save.save(); setTimeout(() => { if (this.open && this.gen === gen) { $('#khGift').classList.add('on'); audio.chime(); } }, 1250); }
    }
  },
  finish() {
    if (!this.open) return; this.open = false; this.opaque = false; this.gen++;
    $('#kh').classList.remove('on'); $('#khCap').classList.remove('on'); $('#khGift').classList.remove('on');
    if (stMus.ok && stMus.mode !== 'off') stMus.bus.gain.setTargetAtTime(1, stMus.c.currentTime, 0.6);
    const d = this.done; this.done = null; if (d) setTimeout(d, 80);
  },
  loop(now) {
    if (!this.open) return;
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.t += dt; this.lineT += dt;
    // daktilo + konuşma sesi
    if (this.text && this.chars < this.text.length) {
      const prev = Math.floor(this.chars); this.chars = Math.min(this.text.length, this.chars + dt * 34);
      const c = Math.floor(this.chars); if (c !== prev) { $('#khTxt').textContent = this.text.slice(0, c); if (c % 3 === 0 && /\S/.test(this.text[c - 1] || '')) audio.khBlip(this.who); }
      if (c >= this.text.length && this.gagNext) this.startGag(this.gagNext);
    }
    this.anim(dt); this.draw();
  },
  anim(dt) {
    const P = this.P, t = this.t, ent = Math.min(1, t / 1.4), exit = this.exitT != null ? Math.min(1, (t - this.exitT) / 1.1) : 0;
    const ease = (v) => 1 - Math.pow(1 - v, 3);
    P.K.x = -0.3 + 0.62 * ease(ent) - 0.7 * exit * exit; P.H.x = 1.3 - 0.62 * ease(ent) + 0.7 * exit * exit;
    for (const w of ['K', 'H']) {
      const p = P[w], walking = ent < 1 || exit > 0, talk = this.who === w && this.text && this.chars < this.text.length;
      p.talk += ((talk ? 1 : 0) - p.talk) * Math.min(1, dt * 10);
      p.y = walking ? -Math.abs(Math.sin(t * 9 + (w === 'H' ? 1 : 0))) * 7 : Math.sin(t * 2.1 + (w === 'H' ? 2 : 0)) * 1.5;
      p.r = walking ? Math.sin(t * 9) * 0.04 : Math.sin(t * 1.7 + (w === 'H' ? 1 : 0)) * 0.015;
      p.hr = p.talk * Math.sin(t * 13) * 0.06; p.ar = -0.15 + p.talk * (Math.sin(t * 5.5) * 0.45 - 0.2);
      p.jx = 0; p.jy = 0; p.hat = 0; p.dizzy = 0; p.armL = 1;
    }
    if (this.fx) { this.fx.t += dt; if (this.fx.t > 0.5) this.fx = null; }
    if (this.hatFly) { this.hatFly.t += dt; if (this.hatFly.t > 1.3) this.hatFly = null; }
    if (!this.gag) return;
    const G = this.gag; G.t += dt; const u = G.t, bell = (k) => Math.sin(Math.min(1, k) * Math.PI);
    const lift = (h) => { P.K.hat = h; P.K.ar = -0.15 - 2.3 * h; P.K.armL = 1 + 0.85 * h; }; // el kavuğun kenarından tutar
    if (G.k === 'zipla') { const k = Math.min(1, u / 0.9); P.K.y -= bell(k) * 38; P.K.r += Math.sin(k * Math.PI * 2) * 0.12; if (u > 1.0) this.gag = null; }
    else if (G.k === 'kel') {
      // kavuğu kaldırıp kel kafasını gösterir
      const k = Math.min(1, u / 1.8), b = bell(k); lift(Math.min(1, b * 1.6)); P.K.hr -= b * 0.1; if (u > 1.85) this.gag = null;
    } else if (G.k === 'kavuk') {
      // kavuğu çıkarır ve perdeden dışarı, Zifir'e fırlatır
      if (u < 0.55) lift(Math.sin((u / 0.55) * Math.PI / 2));
      else { if (!this.kavGone) { this.kavGone = true; this.hatFly = { t: 0 }; audio.whoosh(true, 0.6, 0.04); } const k = Math.min(1, (u - 0.55) / 0.6); P.K.ar = -2.45 + 2.3 * k * k + Math.sin(k * Math.PI) * 0.4; P.K.armL = 1.85 - 0.85 * k; }
      if (u > 1.2) this.gag = null;
    } else if (G.k === 'selam') {
      const k = Math.min(1, u / 1.9), b = bell(k); P.K.jx -= b * 0.1; P.H.jx += b * 0.1; P.K.r += b * 0.1; P.H.r += b * 0.12; P.K.hr += b * 0.3; P.H.hr += b * 0.4; lift(Math.min(1, b * 1.5)); if (u > 1.95) this.gag = null;
    } else if (G.k === 'kafa') {
      // meşhur kafa atma: Karagöz geri çekilir, fırlar; Hacivat dönerek perdeden uçar, sonra sendeleyerek döner
      const back = Math.min(1, u / 0.35), hit = Math.min(1, Math.max(0, (u - 0.35) / 0.16)), fly = Math.max(0, u - 0.51), rel = 1 - Math.min(1, fly * 2);
      P.K.jx = -0.05 * back * (1 - hit) + 0.045 * hit * rel; P.K.hr += -0.4 * back * (1 - hit) + 0.45 * hit * rel; P.K.r += 0.05 * hit * rel;
      if (hit >= 1 && !G.bonk) { G.bonk = true; this.fx = { t: 0 }; audio.khBonk(); haptic([20, 30, 20]); }
      if (fly > 0) {
        // dönerek perdenin dışına uçar (tam tur, dik iner), sonra sekerek ve sersem döner
        const f = Math.min(1, fly / 0.9), b2 = Math.max(0, Math.min(1, (fly - 1.1) / 1.0)), eo = 1 - Math.pow(1 - f, 2), ei = b2 * b2 * (3 - 2 * b2);
        P.H.jx = 0.75 * eo * (1 - ei); P.H.jy = -70 * Math.sin(f * Math.PI) - Math.abs(Math.sin(b2 * Math.PI * 3)) * 12 * (b2 > 0 && b2 < 1 ? 1 : 0);
        P.H.r += (TAU * f) % TAU + Math.sin(b2 * 9) * 0.1 * (b2 > 0 ? 1 : 0);
        P.H.dizzy = b2 > 0.3 ? Math.min(1, (b2 - 0.3) * 4) * Math.min(1, (3.4 - u) * 2) : 0;
      }
      if (u > 3.4) this.gag = null;
    }
  },
  drawFig(w, p) {
    const x = this.cx, F = KH_FIG[w], Pp = this.paths[w], C = this.cur, d = this.dpr, s = this.s, mir = w === 'H';
    const X = C.l + (p.x + p.jx) * (C.r - C.l), Y = C.bot - 6 * d + (p.y + p.jy) * s;
    x.save(); x.translate(X, Y); x.rotate(p.r * (mir ? -1 : 1)); x.scale(mir ? -s : s, s);
    x.lineJoin = 'round'; x.lineCap = 'round';
    const arm = (front) => {
      const A = F.arm, [sx, sy] = F.shoulder; x.save(); x.translate(sx, sy); x.rotate(front ? p.ar : 0.25);
      const k = front ? p.armL : 1, line = () => { x.beginPath(); x.moveTo(0, 0); x.lineTo(A.up[0] * k, A.up[1] * k); x.lineTo(A.lo[0] * k, A.lo[1] * k); };
      line(); x.strokeStyle = KH_INK; x.lineWidth = A.w + 4.8; x.stroke();
      const L = this.litPat; L.setTransform(x.getTransform().invertSelf()); x.strokeStyle = L; x.lineWidth = A.w; x.stroke();
      x.globalCompositeOperation = 'multiply'; x.strokeStyle = front ? A.c : '#7a5a3a'; x.lineWidth = A.w; x.stroke();
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 0.4; x.stroke(); x.globalAlpha = 1;
      x.fillStyle = A.hand; x.strokeStyle = KH_INK; x.lineWidth = 2.2; x.beginPath(); x.arc(A.lo[0] * k + 4, A.lo[1] * k + 1, 6.5, 0, TAU); x.fill(); x.stroke();
      x.restore();
    };
    arm(false);
    const L = this.litPat; F.parts.forEach((part, k) => khLeather(x, Pp.parts[k], part, 2.4, L));
    // baş (eklemli)
    x.save(); x.translate(F.neck[0], F.neck[1]); x.rotate(p.hr);
    const isK = w === 'K', bare = isK && (p.hat > 0.02 || this.kavGone);
    F.head.forEach((part, k) => { if (isK && k >= 2) return; khLeather(x, Pp.head[k], part, 2.4, L); });
    if (isK) {
      if (bare) { khLeather(x, this.bald, { c: '#e9bb8c' }, 2.4, L); x.strokeStyle = 'rgba(255,250,235,0.85)'; x.lineWidth = 2.2; x.beginPath(); x.arc(-2, -54, 9, -2.5, -1.7); x.stroke(); }
      if (!this.kavGone) {
        // kavuk: kaldırılınca kafadan yukarı ve geriye kalkar
        x.save(); x.translate(0, -30 * p.hat); x.rotate(-0.1 * p.hat);
        khLeather(x, Pp.head[2], F.head[2], 2.4, L); khLeather(x, Pp.head[3], F.head[3], 2.4, L);
        x.fillStyle = '#e9a227'; x.beginPath(); x.arc(F.tassel[0], F.tassel[1], 5, 0, TAU); x.fill(); x.strokeStyle = KH_INK; x.lineWidth = 1.6; x.stroke();
        this.hatM = x.getTransform(); x.restore();
      }
    }
    const [ex, ey, rx, ry, pr] = F.eye; x.fillStyle = '#fffaf0'; x.beginPath(); x.ellipse(ex, ey, rx, ry, 0, 0, TAU); x.fill(); x.strokeStyle = KH_INK; x.lineWidth = 1.6; x.stroke();
    x.fillStyle = '#120a06'; x.beginPath(); x.arc(ex + 1.5, ey, pr, 0, TAU); x.fill();
    x.strokeStyle = '#1a0e08'; x.lineWidth = 3; x.stroke(Pp.brow);
    if (isK) this.noseM = x.getTransform();
    if (p.dizzy > 0.01) { // sersemleyen Hacivat'ın başında dönen yıldızlar
      x.globalAlpha = p.dizzy; x.fillStyle = '#ffd36a'; x.strokeStyle = KH_INK; x.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { const a = this.t * 5 + (i * TAU) / 3, sx = Math.cos(a) * 30, sy = -128 + Math.sin(a) * 8, rr = 7 + Math.sin(a) * 1.5; x.beginPath(); for (let j = 0; j < 10; j++) { const b = (j / 10) * TAU - Math.PI / 2, q = j % 2 ? rr * 0.45 : rr; x.lineTo(sx + Math.cos(b) * q, sy + Math.sin(b) * q); } x.closePath(); x.fill(); x.stroke(); }
      x.globalAlpha = 1;
    }
    x.restore();
    arm(true);
    x.restore();
  },
  // perdeden dışarı uçan kavuk: artık seyircinin dünyasında, önden aydınlık
  drawHat() {
    const x = this.cx, H = this.hatFly, M = this.hatM; if (!H || !M) return;
    const f = Math.min(1, H.t / 1.2), e = 1 - Math.pow(1 - f, 2), sc = Math.hypot(M.a, M.b), o = M.transformPoint({ x: -6, y: -80 });
    const W = this.cv.width, Ht = this.cv.height, tx = o.x + (W * 0.5 - o.x) * e, ty = o.y - Ht * 0.18 * Math.sin(f * Math.PI) - (o.y - Ht * 0.3) * e * 0.4;
    const F = KH_FIG.K, P = this.paths.K;
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = Math.max(0, 1 - f * f);
    x.translate(tx, ty); x.rotate(-0.25 - 3.4 * e); x.scale(sc * (1 + 2.4 * e * e), sc * (1 + 2.4 * e * e)); x.translate(6, 80);
    x.shadowColor = 'rgba(255,200,110,0.8)'; x.shadowBlur = 24 * this.dpr * (1 - f);
    for (const k of [2, 3]) { x.fillStyle = F.head[k].c; x.fill(P.head[k]); }
    x.shadowBlur = 0; x.strokeStyle = KH_INK; x.lineWidth = 2.2; x.stroke(P.head[3]); x.stroke(P.head[2]);
    x.fillStyle = '#fff8e2'; x.beginPath(); for (const [a, b] of F.head[3].dots) { x.moveTo(a + 1.8, b); x.arc(a, b, 1.8, 0, TAU); } x.fill();
    x.fillStyle = '#e9a227'; x.beginPath(); x.arc(F.tassel[0], F.tassel[1], 5, 0, TAU); x.fill();
    x.restore();
  },
  // kafa atma çarpışması: ışık yıldızı
  drawBonk() {
    const x = this.cx, M = this.noseM; if (!this.fx || !M) return;
    const k = this.fx.t / 0.5, o = M.transformPoint({ x: 30, y: -52 }), R = (22 + 60 * Math.pow(k, 0.5)) * this.dpr;
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 1 - k; x.translate(o.x, o.y); x.rotate(k * 0.6);
    x.fillStyle = 'rgba(255,214,120,0.9)'; x.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rr = i % 2 ? R * 0.38 : R; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    x.closePath(); x.fill(); x.fillStyle = 'rgba(255,250,230,0.9)'; x.beginPath(); x.arc(0, 0, R * 0.22, 0, TAU); x.fill();
    x.restore();
  },
  draw() {
    const x = this.cx, C = this.cur, t = this.t, d = this.dpr;
    const sh = this.fx && this.fx.t < 0.25 ? (1 - this.fx.t / 0.25) * 7 * d : 0;
    x.setTransform(1, 0, 0, 1, sh ? (Math.random() - 0.5) * sh : 0, sh ? (Math.random() - 0.5) * sh : 0);
    x.drawImage(this.bg, 0, 0);
    // kandil titreşimi
    x.save(); x.beginPath(); x.rect(C.l, C.top, C.r - C.l, C.bot - C.top); x.clip();
    this.drawFig('H', this.P.H); this.drawFig('K', this.P.K);
    const fl = 0.05 + 0.035 * Math.sin(t * 7.3) + 0.025 * Math.sin(t * 17.1 + 1.3);
    x.fillStyle = `rgba(40,16,0,${fl.toFixed(3)})`; x.fillRect(C.l, C.top, C.r - C.l, C.bot - C.top);
    x.restore();
    this.drawBonk(); this.drawHat();
    x.setTransform(1, 0, 0, 1, 0, 0);
  },
};
