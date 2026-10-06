
/* =====================================================================
   ZİFİR'İN HAZİNESİ — oyuncuyu geri getiren kalıcı ilerleme
   • Işık tozu: ada bitince, görevlerde, sandıkta, keşiflerde kazanılır.
   • Günlük görevler: tarihe göre seçilen 3 görev; üçü bitince günün sandığı
     (art arda günlerde büyüyen ödül, ödüllü reklamla ikiye katlanır).
   • Koleksiyon albümü: ada canlıları, gök olayları, 8 Güneş Ejderhası,
     8 gizli yıldız ve özel anlar; her keşif köşede küçük bir kartla duyurulur.
   • Güçler: ışık tozuyla Dal / Tutulma / Bekle / Sürü güçlenir. Yalnızca
     yardımdır; çözücü hiçbir adada onlara güvenmez.
   • Gizli yıldızlar: her dünyanın bir adasında yalnızca gölgede parlayan bir
     yıldız saklı; bulunca o dünyanın Gizli Adası açılır.
   ===================================================================== */
const AICON = {
  cat: '<path d="M5 20c-1.5-2-2-4.5-1.3-7L4 5l4 3.2c1.3-.4 2.7-.4 4 0L16 5l.3 8c.7 2.5.2 5-1.3 7"/><path d="M9 13.5h.01M15 13.5h.01M11 16.5l1 .8 1-.8"/>',
  turtle: '<ellipse cx="12" cy="13" rx="7" ry="5"/><path d="M5 13h14M9 8.6l-1 8.6M15 8.6l1 8.6"/><path d="M19 12.5c1.5-1 3-.5 3 1s-1.5 1.6-3 1"/><path d="M7 17.5l-1.5 2M17 17.5l1.5 2"/>',
  gull: '<path d="M2 11c3-3 6.5-3.2 10 1 3.5-4.2 7-4 10-1"/><path d="M8 17c1.5-1.4 3-1.5 4 0 1-1.5 2.5-1.4 4 0" opacity=".6"/>',
  flamingo: '<path d="M12 21v-6"/><path d="M12 15c-3.5 0-5-2.2-4-4.4 1.1-2.4 5-1.6 6.5-3.8 1-1.5.2-3.6-1.7-3.6-1.4 0-2.2 1-2.3 2"/><path d="M10.5 5.2l-2 1"/><path d="M12 15c2.6 0 4.8-1 5.5-3"/>',
  penguin: '<path d="M12 3c3 0 4.5 3 4.5 7v5c0 3-2 5.5-4.5 5.5S7.5 18 7.5 15v-5C7.5 6 9 3 12 3z"/><path d="M12 9c1.8 0 2.6 1.6 2.6 4v2.3c0 1.8-1.2 3.2-2.6 3.2s-2.6-1.4-2.6-3.2V13C9.4 10.6 10.2 9 12 9z"/><path d="M10.5 6.5h.01M13.5 6.5h.01M7.5 12l-2.5 3M16.5 12l2.5 3"/>',
  rain: '<path d="M7 15a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.6A3.3 3.3 0 0 1 17 15z"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/>',
  storm: '<path d="M7 14a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.6A3.3 3.3 0 0 1 17 14z"/><path d="M12.5 13l-2.5 4h3l-2 4.5"/>',
  fog: '<path d="M3 8c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0M3 12.5c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0M3 17c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0"/>',
  rainbow: '<path d="M2.5 18a9.5 9.5 0 0 1 19 0M5.5 18a6.5 6.5 0 0 1 13 0M8.5 18a3.5 3.5 0 0 1 7 0"/>',
  comet: '<circle cx="17" cy="7" r="3"/><path d="M14.8 9.2L4 20M15.8 10.3L8 18M13.7 8.2L6 16"/>',
  aurora: '<path d="M3 17c1-6 3-10 4-10s1.5 6 3 6 2-9 4-9 2 7 3.5 7S20 9 21 8"/><path d="M3 20h18" opacity=".5"/>',
  dragon: '<path d="M3 15c2-1 3.5-3.5 6-4.5 2-.8 4.2-.5 6 .5l3-3 .3 3.6L21 13l-3.2.6c-.6 2.7-3 4.9-6.3 4.9H6.8L3 20z"/><path d="M14.5 13h.01"/><path d="M9.5 10.6l-1-4 3 2.6M12.6 10.2l.6-4.2 1.6 3.6"/>',
  star4: '<path d="M12 2.5c.8 5.2 3.6 8 8.8 8.8-5.2.8-8 3.6-8.8 8.8-.8-5.2-3.6-8-8.8-8.8 5.2-.8 8-3.6 8.8-8.8z"/>',
  close: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17" stroke-width="3" opacity=".35"/><path d="M16 8l1.8-1.8M17.5 12h2.5"/>',
  breath: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M8.5 11h2l1-2 1.5 4 1-2h1.5"/>',
  flawless: '<path d="M12 4l2.4 5.1 5.6.7-4.1 3.8 1.1 5.5L12 16.4l-5 2.7 1.1-5.5L4 9.8l5.6-.7z"/><circle cx="12" cy="12" r="10.5" opacity=".4"/>',
  flock: '<path d="M3 9c1.5-1.4 3-1.4 4.5.4C9 7.6 10.5 7.6 12 9"/><path d="M12 14c1.5-1.4 3-1.4 4.5.4 1.5-1.8 3-1.8 4.5-.4"/><path d="M5 18c1.5-1.4 3-1.4 4.5.4 1.5-1.8 3-1.8 4.5-.4"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 2.8-5.2 3.6-8.3 1.3 1.6 2 2.7 2.4 4.4.9-1.5 1.1-3.3.5-6.4 3.9 2.2 6.5 6.2 6.5 10.3 0 3.6-2.6 6.2-6.5 6.2z"/><path d="M12 21c-1.7 0-2.8-1.2-2.8-2.8 0-1.9 1.6-2.6 2.8-4.6 1.2 2 2.8 2.7 2.8 4.6 0 1.6-1.1 2.8-2.8 2.8z"/>',
  wisp: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  lantern: '<path d="M12 2.5v2M8 5h8l-1 1.6H9z"/><rect x="8.2" y="6.6" width="7.6" height="10" rx="1.6"/><path d="M12 9.3c1.2 1.4 1.5 2.3 1.5 3.1a1.5 1.5 0 0 1-3 0c0-.8.3-1.7 1.5-3.1zM9 16.6h6l1 2H8z"/>',
  island: '<path d="M3 14c2-2 5-3 9-3s7 1 9 3c-1 3-5 5-9 5s-8-2-9-5z"/><path d="M9 11c0-3 1-5 3-6 1 2 1 4 .5 6"/>',
  drop: '<path d="M12 3s-6 6.8-6 10.8a6 6 0 0 0 12 0C18 9.8 12 3 12 3z"/><path d="M9.5 14a2.5 2.5 0 0 0 2 2.4" opacity=".6"/>',
  dash: '<path d="M5 17c4-.5 7-3.5 8.5-8"/><path d="M4 20.5c5-.5 10-5 11.3-10.3" opacity=".5"/><circle cx="16.5" cy="7.5" r="4"/>',
  ecl: '<circle cx="12" cy="12" r="7.5"/><path d="M15 6.4a6.4 6.4 0 1 1-6 10.8 7.5 7.5 0 0 0 6-10.8z"/>',
  wait: '<rect x="7.5" y="6" width="3.2" height="12" rx="1.2"/><rect x="13.3" y="6" width="3.2" height="12" rx="1.2"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  inf: '<path d="M7 9a3 3 0 1 0 0 6c3 0 7-6 10-6a3 3 0 1 1 0 6c-3 0-7-6-10-6z"/>',
  mask: '<path d="M4 6c3 1 13 1 16 0 0 7-2.5 13-8 13S4 13 4 6z"/><path d="M8.5 10.5c.8-.6 1.7-.6 2.5 0M13 10.5c.8-.6 1.7-.6 2.5 0M9.5 14.5c1.5 1.2 3.5 1.2 5 0"/>',
  starq: '<path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.4 6.6 19.4l1.2-6L3.4 9.3l6-.7z"/>',
};
const aSvg = (k) => `<svg viewBox="0 0 24 24">${AICON[k] || AICON.starq}</svg>`;
const WORLD_COL = { ege: '#ffad5c', ruzgar: '#ffd86a', peri: '#ff8fb8', tuz: '#ffaad2', ikiz: '#7ff2ff', buz: '#9fd2ff', ayna: '#e392ff', saat: '#ffc76e' };
const DRAGON_NAMES = { ege: 'Kor Ejderi', ruzgar: 'Altın Yele', peri: 'Gül Alevi', tuz: 'Pembe Kor', ikiz: 'Çifte Alev', buz: 'Ayaz Ateşi', ayna: 'Erguvan Alev', saat: 'Kehribar Kanat' };
const ALBUM = [
  { cat: 'Ada canlıları', items: [
    ['c:cat', 'Ada kedisi', 'cat', 'Sıcak adaların sokak kedileri. Zifir yaklaşınca sıçrar, miyavlar. Gölgesi Zifir’i korur.', 'Sıcak bir adada dolaşan patili biri'],
    ['c:turtle', 'Caretta', 'turtle', 'Kıyıya çıkan Caretta. Ürkünce kabuğuna çekilir; kabuğunun gölgesi gerçek gölgedir.', 'Yavaş, kabuklu bir dost'],
    ['c:gull', 'Martı', 'gull', 'Adaların üstünde süzülen martılar. Uçarken düşen gölgeleri de korur.', 'Gökte süzülen bir gölge'],
    ['c:flamingo', 'Flamingo', 'flamingo', 'Tuz Gölü’nün pembe konukları. Tek ayak üstünde dinlenir.', 'Tuzlu sularda pembe bir konuk'],
    ['c:penguin', 'Penguen', 'penguin', 'Buz Diyarı’nın sakinleri. Ürkünce karnının üstünde kayar.', 'Buzlar arasında yürüyen biri'],
  ] },
  { cat: 'Gök olayları', items: [
    ['w:rain', 'Sağanak', 'rain', 'Yağmur ışığı yumuşatır: güneş biraz daha az yakar.', 'Bulutlu bir adada…'],
    ['w:storm', 'Fırtına', 'storm', 'Şimşekler adayı bir anlığına aydınlatır; ışık yumuşaktır.', 'Gök gürlerken…'],
    ['w:fog', 'Sis', 'fog', 'Alçak sis ışığı dağıtır; Zifir yürüdükçe açılır.', 'Puslu bir sabah…'],
    ['w:rainbow', 'Gökkuşağı', 'rainbow', 'Yağmur dinince adanın üstünde açar.', 'Yağmurdan sonra…'],
    ['w:comet', 'Kuyruklu yıldız', 'comet', 'Nadiren geçer. Dilek tut: Zifir tazelenir.', 'Gökyüzünü izle…'],
    ['w:aurora', 'Kutup ışıkları', 'aurora', 'Bazı zafer gecelerinde gökyüzü dalgalanır.', 'Bir zafer gecesi…'],
  ] },
  { cat: 'Güneş Ejderhaları', items: CHAPTERS.map((c) => ['d:' + c.key, DRAGON_NAMES[c.key], 'dragon', `${c.name} dünyasının son adasında Zifir’i kovalayan ejderha. Yenince albüme girer.`, `${c.name} finalinde…`, WORLD_COL[c.key]]) },
  { cat: 'Gizli yıldızlar', items: CHAPTERS.map((c) => ['s:' + c.key, `${c.constellation} yıldızı`, 'star4', `${c.name} adalarından birinde saklıydı. Bu dünyanın Gizli Adası’nı açtı.`, `${c.name}: yalnızca gölgede parlar…`, WORLD_COL[c.key]]) },
  { cat: 'Anlar', items: [
    ['m:close', 'Kıl payı', 'close', 'Can neredeyse bitmişken gölgeye döndün.', 'Son anda gölgeye kaç'],
    ['m:breath', 'Son nefes', 'breath', 'Can bittiği an, ağır çekimde gölgeye ulaştın.', 'Her şey bitti sanılırken…'],
    ['m:flawless', 'Lekesiz', 'flawless', 'Bir adayı güneşe hiç yakalanmadan bitirdin.', 'Güneş sana hiç dokunmasın'],
    ['m:flock', 'Tam sürü', 'flock', 'Kapıya 12 gölge kuşuyla vardın.', 'Bütün kuşlar seninle olsun'],
    ['m:streak', 'Gölge serisi ×10', 'flame', 'Gölgede kesintisiz yürüyerek seriyi ×10’a çıkardın.', 'Gölgeden hiç çıkma'],
    ['m:wisp', 'Peri avcısı', 'wisp', 'Bir adada 3 ışık perisi yuttun.', 'Perileri gölgede yakala'],
    ['m:lantern', 'Fener alayı', 'lantern', 'Gece Perdesi’nde bir adanın bütün fenerlerini yaktın.', 'Gece, bütün fenerler…'],
  ] },
];
const ALBUM_IDX = {}; ALBUM.forEach((c) => c.items.forEach((it) => { ALBUM_IDX[it[0]] = it; }));
const ALBUM_N = Object.keys(ALBUM_IDX).length;
// günlük görev havuzu (tarihten tohumlanır; yalnızca açılmış olanlar seçilir)
const QUESTS = [
  { id: 'clear', ev: 'clear', n: [3, 4, 5], t: (n) => `${n} ada geç`, r: 40, ic: 'island' },
  { id: 'flaw', ev: 'flawless', n: [1, 2], t: (n) => (n > 1 ? `${n} adayı lekesiz bitir` : 'Bir adayı lekesiz bitir'), r: 60, ic: 'flawless' },
  { id: 'drop', ev: 'drop', n: [12, 18, 24], t: (n) => `${n} gece damlası topla`, r: 40, ic: 'drop' },
  { id: 'star', ev: 'star', n: [5, 8], t: (n) => `${n} yıldız kazan`, r: 50, ic: 'starq' },
  { id: 'dash', ev: 'dashSave', n: [4, 6], t: (n) => `Işığa yakalanınca ${n} kez dal`, r: 45, ab: 'dash', ic: 'dash' },
  { id: 'ecl', ev: 'eclipse', n: [2, 3], t: (n) => `${n} kez Tutulma yap`, r: 45, ab: 'ecl', ic: 'ecl' },
  { id: 'hold', ev: 'hold', n: [3, 5], t: (n) => `${n} kez Bekle`, r: 40, ab: 'wait', ic: 'wait' },
  { id: 'flock', ev: 'flock', n: [1, 2], t: (n) => (n > 1 ? `Sürüyü ${n} kez sal` : 'Sürüyü bir kez sal'), r: 50, ab: 'flock', ic: 'flock' },
  { id: 'birds', ev: 'birds', max: true, n: [6, 8, 10], t: (n) => `Kapıya ${n} gölge kuşuyla var`, r: 50, ic: 'flock', min: 6 },
  { id: 'streak', ev: 'streak', max: true, n: [4, 6], t: (n) => `Gölge serisi ×${n} yap`, r: 45, ic: 'flame', min: 3 },
  { id: 'wisp', ev: 'wisp', n: [2, 3], t: (n) => `${n} ışık perisi yut`, r: 45, ic: 'wisp', min: 20 },
  { id: 'close', ev: 'close', n: [1, 2], t: (n) => `${n} kez kıl payı kurtul`, r: 45, ic: 'close', min: 2 },
  { id: 'daily', ev: 'daily', n: [1], t: () => 'Günün Adası’nı geç', r: 60, ic: 'sun', min: 4 },
  { id: 'endless', ev: 'endless', n: [3, 5], t: (n) => `Sonsuz Gün’de ${n} ada geç`, r: 60, ic: 'inf', min: 16 },
  { id: 'theater', ev: 'theater', n: [1], t: () => 'Gölge Tiyatrosu’nda bir perde bitir', r: 50, ic: 'mask', min: 1 },
];
// güçler: değerler seviyeye göre; maliyet bir sonraki seviye için
const UPGR = {
  dash: { name: 'Dal', v: [3.0, 2.6, 2.2, 1.8], cost: [150, 320, 560], fx: (a, b) => `Bekleme süresi <em>${a} sn</em> → <em>${b} sn</em>`, f: (v) => v.toFixed(1) },
  ecl: { name: 'Tutulma', v: [2.1, 2.5, 2.9, 3.3], cost: [150, 320, 560], fx: (a, b) => `Karanlık <em>${a} sn</em> → <em>${b} sn</em>`, f: (v) => v.toFixed(1) },
  wait: { name: 'Bekle', v: [3.0, 3.8, 4.6, 5.4], cost: [120, 280, 500], fx: (a, b) => `Sabır <em>${a} sn</em> → <em>${b} sn</em>`, f: (v) => v.toFixed(1) },
  flock: { name: 'Sürü', v: [0.18, 0.23, 0.28, 0.33], cost: [150, 320, 560], fx: (a, b) => `Kuş başına kalkan <em>${a} sn</em> → <em>${b} sn</em>`, f: (v) => v.toFixed(2) },
};
const dayIdx = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
const Meta = {
  tab: 'q', open: false, findQ: [], findOn: false,
  d() {
    const s = Save.data; if (!s.meta) s.meta = {};
    const m = s.meta; m.dust = m.dust || 0; m.album = m.album || {}; m.up = m.up || {}; m.secrets = m.secrets || {}; m.bonus = m.bonus || {}; m.th = m.th || {};
    return m;
  },
  dust() { return this.d().dust; },
  /* ---------- güç değerleri (oyun bunları okur) ---------- */
  lvl(k) { return Math.min(3, this.d().up[k] | 0); },
  val(k) { return UPGR[k].v[G.auto ? 0 : this.lvl(k)]; },
  /* ---------- ışık tozu ---------- */
  addDust(n, from) {
    if (!(n > 0)) return; const m = this.d(); m.dust += Math.round(n); Save.save();
    if (from) this.fly(from, n); else this.syncDust(true);
    this.badges();
  },
  syncDust(bump) { const v = this.dust(); for (const el of $$('.dpill b')) el.textContent = v; if (bump) for (const el of $$('.dpill')) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } },
  // kazanılan toz kaynaktan bakiyeye uçan kıvılcımlar olarak gider
  fly(from, n) {
    const to = $('#hz.on .dpill') || $('#hz .dpill'), r0 = from.getBoundingClientRect(), r1 = to.getBoundingClientRect();
    if (!$('#hz').classList.contains('on') || !r1.width) { this.syncDust(true); return; }
    const k = Math.min(14, 4 + Math.round(n / 15)); let left = k;
    for (let i = 0; i < k; i++) {
      const e = document.createElement('i'); e.className = 'dico dfly'; $('#ui').appendChild(e);
      const x0 = r0.left + r0.width / 2 + (Math.random() - 0.5) * 30, y0 = r0.top + r0.height / 2 + (Math.random() - 0.5) * 20, x1 = r1.left + 18, y1 = r1.top + r1.height / 2;
      e.style.left = x0 + 'px'; e.style.top = y0 + 'px';
      const a = e.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }, { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 60}px),calc(-50% - ${30 + Math.random() * 40}px)) scale(1.2)`, opacity: 1, offset: 0.3 }, { transform: `translate(calc(-50% + ${x1 - x0}px),calc(-50% + ${y1 - y0}px)) scale(.6)`, opacity: 0.9 }], { duration: 700 + i * 45, easing: 'cubic-bezier(.5,0,.3,1)' });
      a.onfinish = () => { e.remove(); if (--left === 0) { this.syncDust(true); audio.pop(3); } else if (i % 3 === 0) audio.pop(i); };
    }
  },
  /* ---------- albüm ---------- */
  has(key) { return !!this.d().album[key]; },
  find(key) {
    if (G.auto || !ALBUM_IDX[key] || this.has(key)) return false;
    const m = this.d(); m.album[key] = Date.now(); m.albumNew = (m.albumNew || 0) + 1; Save.save();
    this.addDust(10); this.findQ.push(key); this.showFind(); this.badges();
    // bir bölümün tamamı: ek ödül
    const cat = ALBUM.find((c) => c.items.some((it) => it[0] === key));
    if (cat && cat.items.every((it) => m.album[it[0]])) setTimeout(() => { banner(`${cat.cat} tamam!`, '+60 ışık tozu'); this.addDust(60); audio.chime && audio.chime(); }, 3200);
    return true;
  },
  showFind() {
    if (this.findOn || !this.findQ.length) return;
    const key = this.findQ.shift(), it = ALBUM_IDX[key], el = $('#find');
    this.findOn = true;
    el.querySelector('.ai').innerHTML = aSvg(it[2]); el.querySelector('.ai').style.setProperty('--c', it[5] || '#ffdf9e');
    el.querySelector('b').textContent = it[1];
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    audio.findChime ? audio.findChime() : audio.chime && audio.chime(); haptic([8, 30, 8]);
    setTimeout(() => { el.classList.remove('on'); setTimeout(() => { this.findOn = false; this.showFind(); }, 450); }, 2800);
  },
  /* ---------- günlük görevler ---------- */
  quests() {
    const m = this.d(), today = dateNum();
    if (m.q && m.q.day === today) return m.q;
    const rng = new RNG(today * 13 + 7), un = Save.data.unlocked | 0;
    const ok = QUESTS.filter((q) => (!q.ab || Save.seen('ab-' + q.ab)) && (q.min == null || un >= q.min));
    const pick = [ok.find((q) => q.id === 'clear')];
    const rest = ok.filter((q) => q.id !== 'clear');
    while (pick.length < 3 && rest.length) pick.push(rest.splice(Math.floor(rng.next() * rest.length), 1)[0]);
    m.q = { day: today, chest: false, list: pick.map((q) => ({ id: q.id, goal: rng.pick(q.n), prog: 0, got: false })) };
    Save.save(); return m.q;
  },
  // oyun olayları: görev ilerlemesi (max türü: en yüksek değer)
  ev(name, v = 1) {
    if (G.auto) return; const Q = this.quests(); let ch = false;
    for (const q of Q.list) {
      const def = QUESTS.find((d) => d.id === q.id); if (!def || def.ev !== name || q.prog >= q.goal) continue;
      const np = def.max ? Math.max(q.prog, v) : q.prog + v; if (np === q.prog) continue;
      q.prog = Math.min(q.goal, np); ch = true;
      if (q.prog >= q.goal) setTimeout(() => { toast(`<span class="tsun"></span>Görev tamam: <em>${def.t(q.goal)}</em>`, 2.6); audio.chime && audio.chime(); }, G.state === 'play' ? 0 : 1200);
    }
    if (ch) { Save.save(); this.badges(); if (this.open && this.tab === 'q') this.renderQ(); }
  },
  claimable() { const Q = this.quests(); return Q.list.filter((q) => q.prog >= q.goal && !q.got).length + (Q.list.every((q) => q.got) && !Q.chest ? 1 : 0); },
  upgradable() { let n = 0; for (const k in UPGR) { const l = this.lvl(k); if (Save.seen('ab-' + k) && l < 3 && this.dust() >= UPGR[k].cost[l]) n++; } return n; },
  badges() {
    const q = this.claimable(), a = this.d().albumNew || 0, u = this.upgradable(), tot = q + (a > 0 ? 1 : 0);
    const set = (id, n) => { const el = $(id); if (!el) return; el.classList.toggle('on', n > 0); el.textContent = n > 9 ? '9+' : n || ''; };
    { const own = Save.data.costumes || [], seen = Save.data.seenCos || []; set('#bdW', own.filter((k) => !seen.includes(k)).length); }
    set('#bdQ', q); set('#bdA', a); set('#bdU', u); set('#bdT', tot + (u > 0 ? 1 : 0)); set('#bdM', tot + (u > 0 ? 1 : 0));
  },
  /* ---------- Hazine ekranı ---------- */
  openHz(from) {
    audio.ui(); hideToast(); this.from = from || 'title'; this.open = true;
    this.quests(); this.syncDust(false); this.setTab(this.claimable() ? 'q' : this.tab);
    UI.show('hz'); AdBridge.screen('hz'); AdBridge.fillNative($('#natHz'), 'native_hz');
  },
  closeHz() { audio.ui(); this.open = false; UI.hide('hz'); $('#aSheet').classList.remove('on'); AdBridge.screen(G.state === 'map' ? 'map' : this.from); this.badges(); },
  setTab(t) {
    this.tab = t; $$('#hz .hztabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    $$('#hz section').forEach((s) => s.classList.remove('on')); $('#hz' + t.toUpperCase()).classList.add('on');
    $('#aSheet').classList.remove('on');
    if (t === 'q') this.renderQ(); else if (t === 'a') this.renderA(); else this.renderU();
    $('#hz .hzbody').scrollTop = 0;
  },
  renderQ() {
    const Q = this.quests(), box = $('#qList');
    const ms = new Date(); ms.setHours(24, 0, 0, 0); const left = ms - new Date(), h = Math.floor(left / 3600000), mi = Math.floor((left % 3600000) / 60000);
    $('#qReset').textContent = `${h} sa ${mi} dk sonra yenilenir`;
    box.innerHTML = Q.list.map((q, i) => {
      const def = QUESTS.find((d) => d.id === q.id), done = q.prog >= q.goal;
      return `<div class="qc${q.got ? ' got' : done ? ' done' : ''}" data-i="${i}"><div class="qi">${aSvg(def.ic)}</div><div class="qt"><b>${def.t(q.goal)}</b><div class="qbar"><i style="width:${((q.prog / q.goal) * 100).toFixed(0)}%"></i></div><small>${q.got ? 'alındı' : `${q.prog} / ${q.goal}`}</small></div><button class="qr tap">${q.got ? '✓' : done ? `Al <i class="dico"></i>${def.r}` : `<i class="dico"></i>${def.r}`}</button></div>`;
    }).join('');
    box.querySelectorAll('.qc.done .qr').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.claim(+b.closest('.qc').dataset.i, b); }));
    const all = Q.list.every((q) => q.got), cb = $('#qChest');
    cb.classList.toggle('ready', all && !Q.chest); cb.classList.toggle('opened', !!Q.chest);
    $('#qChestT').textContent = Q.chest ? 'Bugünün sandığı açıldı. Yarın yenisi gelir.' : all ? 'Hazır! Dokun ve aç.' : `Üç görevi bitir, sandığı aç · ${Q.list.filter((q) => q.got).length}/3`;
    if (!cb.querySelector('svg')) cb.querySelector('.chico').innerHTML = CHEST_SVG(0.62);
  },
  claim(i, btn) {
    const Q = this.quests(), q = Q.list[i]; if (!q || q.got || q.prog < q.goal) return;
    const def = QUESTS.find((d) => d.id === q.id); q.got = true; Save.save();
    audio.abilityLand && audio.abilityLand(); haptic(14);
    this.addDust(def.r, btn); this.renderQ(); this.badges();
  },
  renderA() {
    const m = this.d(), n = Object.keys(m.album).filter((k) => ALBUM_IDX[k]).length;
    $('#aProg b').textContent = `${n} / ${ALBUM_N}`; $('#aProg i').style.width = (n / ALBUM_N) * 100 + '%';
    const fresh = new Set(Object.entries(m.album).filter(([, t]) => t > (m.albumSeenT || 0)).map(([k]) => k));
    $('#aList').innerHTML = ALBUM.map((c) => { const got = c.items.filter((it) => m.album[it[0]]).length; return `<div class="sh"><b>${c.cat}</b><span>${got}/${c.items.length}</span></div><div class="agrid">${c.items.map((it) => `<button class="ac tap${m.album[it[0]] ? '' : ' no'}${fresh.has(it[0]) ? ' new' : ''}" data-k="${it[0]}"><div class="ai" style="--c:${it[5] || '#ffdf9e'}">${aSvg(it[2])}</div><b>${m.album[it[0]] ? it[1] : '???'}</b></button>`).join('')}</div>`; }).join('');
    $$('#aList .ac').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.sheet(b.dataset.k); }));
    m.albumNew = 0; m.albumSeenT = Date.now(); Save.save(); this.badges();
  },
  sheet(key) {
    const it = ALBUM_IDX[key], got = this.has(key), sh = $('#aSheet');
    sh.querySelector('.ai').className = 'ai' + (got ? '' : ' no'); sh.querySelector('.ai').style.setProperty('--c', it[5] || '#ffdf9e'); sh.querySelector('.ai').innerHTML = aSvg(it[2]);
    sh.querySelector('small').textContent = got ? new Date(this.d().album[key]).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : 'Henüz bulunmadı';
    sh.querySelector('b').textContent = got ? it[1] : '???'; sh.querySelector('p').textContent = got ? it[3] : 'İpucu: ' + it[4];
    sh.classList.add('on'); audio.ui();
  },
  renderU() {
    $('#uList').innerHTML = ABIL_ORDER.map((k) => {
      const U = UPGR[k], l = this.lvl(k), open = Save.seen('ab-' + k), max = l >= 3, cost = max ? 0 : U.cost[l], can = open && !max && this.dust() >= cost;
      const pips = [1, 2, 3].map((i) => `<i class="${i <= l ? 'on' : ''}"></i>`).join('');
      const unlockAt = { dash: 3, ecl: 5, wait: 7, flock: 10 }[k];
      return `<div class="uc${open ? '' : ' lk'}" data-k="${k}"><div class="uico">${ABIL[k].icon}</div><div class="ut"><b>${U.name}</b><span class="pips">${pips}</span><small>${!open ? `Ada ${unlockAt}’te açılır` : max ? `En üst seviye · <em>${U.f(U.v[3])} sn</em>` : U.fx(U.f(U.v[l]), U.f(U.v[l + 1]))}</small></div><button class="ub tap${max ? ' max' : can ? '' : ' no'}">${max ? 'Tam' : `Güçlendir<span><i class="dico"></i>${cost}</span>`}</button></div>`;
    }).join('');
    $$('#uList .uc .ub').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.buy(b.closest('.uc').dataset.k); }));
  },
  buy(k) {
    const l = this.lvl(k), U = UPGR[k]; if (l >= 3 || !Save.seen('ab-' + k)) return;
    const cost = U.cost[l], m = this.d();
    if (m.dust < cost) { audio.clunk(); const c = $(`#uList .uc[data-k="${k}"]`); c && c.querySelector('.ub').classList.add('nope'); toast(`<em>${cost - m.dust}</em> ışık tozu daha gerek. Görevler ve sandık hızlı kazandırır.`, 2.6); return; }
    m.dust -= cost; m.up[k] = l + 1; Save.save(); this.syncDust(true);
    audio.abilityLand && audio.abilityLand(); haptic([10, 30, 16]);
    this.renderU(); const c = $(`#uList .uc[data-k="${k}"]`); if (c) { c.classList.add('up'); const r = c.querySelector('.uico').getBoundingClientRect(); const fx = document.createElement('div'); fx.className = 'abBurst'; fx.style.left = (r.left + r.width / 2) + 'px'; fx.style.top = (r.top + r.height / 2) + 'px'; $('#ui').appendChild(fx); setTimeout(() => fx.remove(), 1200); }
    this.badges();
  },
  /* ---------- günün sandığı ---------- */
  chestReward() {
    const m = this.d(), di = dayIdx(), streak = m.chestDay === di - 1 ? (m.chestStreak || 0) + 1 : m.chestDay === di ? m.chestStreak || 1 : 1;
    const rng = new RNG(dateNum() * 31 + 5), base = 110 + Math.round(rng.next() * 6) * 10, bonus = Math.min(5, streak - 1) * 20;
    return { base, bonus, streak, total: base + bonus };
  },
  openChest() {
    const Q = this.quests(); if (Q.chest || !Q.list.every((q) => q.got)) return;
    const R = this.chestReward(), el = $('#chest');
    this.chestR = R; this.chestStage = 0;
    el.querySelector('.box').innerHTML = CHEST_SVG(1);
    const sp = el.querySelector('.sp'); sp.innerHTML = '';
    for (let i = 0; i < 26; i++) { const a = -PI / 2 + (Math.random() - 0.5) * 2.6, r = 120 + Math.random() * 180, e = document.createElement('i'); e.style.setProperty('--x', (Math.cos(a) * r).toFixed(0) + 'px'); e.style.setProperty('--y', (Math.sin(a) * r).toFixed(0) + 'px'); e.style.animationDelay = (Math.random() * 0.25).toFixed(2) + 's'; sp.appendChild(e); }
    $('#chN').textContent = '0'; $('#chP').textContent = R.bonus ? `${R.streak} gün üst üste · seri ödülü +${R.bonus}` : 'Yarın da gel: sandık her gün büyür';
    $('#chDouble').style.display = AdBridge.ready('rewarded') ? '' : 'none';
    el.classList.remove('open', 'shake'); el.classList.add('on'); audio.ui();
    setTimeout(() => this.chestTap(), 650);
  },
  chestTap() {
    const el = $('#chest'); if (this.chestStage !== 0) return; this.chestStage = 1;
    el.classList.add('shake'); audio.chestShake ? audio.chestShake() : audio.tock(true); haptic([10, 40, 10, 40, 10]);
    setTimeout(() => {
      el.classList.remove('shake'); el.classList.add('open'); this.chestStage = 2;
      audio.chestOpen ? audio.chestOpen() : audio.abilityReveal(); haptic([20, 30, 40]);
      const R = this.chestR, n = $('#chN'), t0 = performance.now();
      const step = () => { const k = Math.min(1, (performance.now() - t0) / 1100); n.textContent = Math.round(R.total * Ease.outCubic(k)); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      const m = this.d(), Q = this.quests(); Q.chest = true; m.chestDay = dayIdx(); m.chestStreak = R.streak; m.dust += R.total; Save.save();
    }, 900);
  },
  async chestDouble() {
    if (this.chestStage !== 2) return; const b = $('#chDouble'); b.style.display = 'none';
    const ok = await AdBridge.rewarded('rv_chest_double');
    if (ok) { const R = this.chestR, m = this.d(); m.dust += R.total; Save.save(); $('#chN').textContent = R.total * 2; $('#chP').textContent = 'İkiye katlandı!'; audio.chestOpen ? audio.chestOpen() : audio.chime(); }
  },
  chestClose() { const el = $('#chest'); if (this.chestStage < 2) return; el.classList.remove('on', 'open'); this.chestStage = 0; this.syncDust(true); this.renderQ(); this.badges(); },
  /* ---------- ada sonu ödülü ---------- */
  levelReward(mode, res, lv) {
    const st = G.stars.filter(Boolean).length; let n = 0;
    if (mode === 'story' || mode === 'night') n = res.firstClear ? 20 + 5 * st : 4 + 8 * (res.newStars || 0);
    else if (mode === 'daily') n = res.firstToday ? 40 + 10 * st : 5;
    else if (mode === 'bonus') n = res.firstClear ? 100 + 10 * st : 12;
    n += (G.dropsGot || 0) * (mode === 'bonus' ? 3 : 0);
    return n;
  },
};
// sandık çizimi: gövde + kapak ayrı (kapak açılır)
const CHEST_SVG = (k) => `<svg viewBox="0 0 180 160"><defs><linearGradient id="chW${k > 0.9 ? 'b' : 's'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a5a2e"/><stop offset="1" stop-color="#4a2410"/></linearGradient><linearGradient id="chG${k > 0.9 ? 'b' : 's'}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c8"/><stop offset=".5" stop-color="#f2c46d"/><stop offset="1" stop-color="#b9782e"/></linearGradient></defs>
  <ellipse cx="90" cy="148" rx="70" ry="9" fill="#000" opacity=".35"/>
  <g><rect x="26" y="70" width="128" height="74" rx="10" fill="url(#chW${k > 0.9 ? 'b' : 's'})" stroke="#2a1206" stroke-width="2"/><rect x="26" y="70" width="128" height="12" fill="#000" opacity=".18"/>
  <rect x="40" y="70" width="12" height="74" fill="url(#chG${k > 0.9 ? 'b' : 's'})"/><rect x="128" y="70" width="12" height="74" fill="url(#chG${k > 0.9 ? 'b' : 's'})"/><rect x="26" y="132" width="128" height="10" rx="4" fill="url(#chG${k > 0.9 ? 'b' : 's'})"/>
  <rect x="78" y="76" width="24" height="28" rx="5" fill="url(#chG${k > 0.9 ? 'b' : 's'})" stroke="#6a3a10" stroke-width="1.5"/><circle cx="90" cy="88" r="4" fill="#3a1a06"/><path d="M90 90v8" stroke="#3a1a06" stroke-width="3" stroke-linecap="round"/></g>
  <g class="lid"><path d="M22 72V52c0-20 18-34 68-34s68 14 68 34v20z" fill="url(#chW${k > 0.9 ? 'b' : 's'})" stroke="#2a1206" stroke-width="2"/><path d="M36 72V50c2-13 16-22 18-23v45zM126 72V27c2 1 16 10 18 23v22z" fill="url(#chG${k > 0.9 ? 'b' : 's'})"/>
  <path d="M22 66h136v8H22z" fill="url(#chG${k > 0.9 ? 'b' : 's'})"/><path d="M40 40c12-10 30-14 50-14" stroke="#fff3d0" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/></g></svg>`;

/* ---------- gizli yıldız: her dünyanın bir adasında, yalnızca gölgede parlar ---------- */
const SECRET_I = [3, 2, 4, 5, 3, 2, 4, 5];
const _sL1 = new THREE.Vector3(), _sL2 = new THREE.Vector3(), _sp = {};
const Secret = {
  on: false, k: 0, got: false,
  init() {
    this.g = new THREE.Group(); this.g.visible = false; scene.add(this.g);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(0.9, 0.7, 2.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: new THREE.Color(2.6, 2.3, 3.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    // dört kollu yıldız ışını (iki çapraz ince düzlem, kameraya döner)
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    for (const [w, h] of [[128, 10], [10, 128]]) { const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(220,200,255,.55)'); gr.addColorStop(1, 'rgba(160,130,255,0)'); x.fillStyle = gr; x.save(); x.translate(64, 64); x.scale(w / 128, h / 128); x.beginPath(); x.arc(0, 0, 64, 0, TAU); x.fill(); x.restore(); }
    const tex = new THREE.CanvasTexture(c);
    this.rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(1.6, 1.4, 2.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    this.halo.scale.setScalar(1.6); this.core.scale.setScalar(0.42); this.rays.scale.setScalar(1.3);
    for (const s of [this.halo, this.rays, this.core]) { s.renderOrder = 9; this.g.add(s); }
  },
  // adaya girerken: bu adada saklı yıldız var mı, nereye konacak
  setup(lv) {
    this.on = false; this.g.visible = false; this.k = 0; this.got = false;
    const sp = lv.spec; if (sp.kind !== 'story' || sp.night || sp.i !== SECRET_I[sp.ch] || Meta.d().secrets[sp.ch] || !lv.solution) return;
    const pos = this.place(lv); if (!pos) return;
    this.on = true; this.x = pos.x; this.y = pos.y; this.z = pos.z; this.s = pos.s; this.ch = sp.ch; this.lv = lv;
    this.g.position.set(this.x, this.y, this.z);
  },
  // çözücünün planında Zifir oradan geçerken yıldızın noktası gölgede kalsın (her zaman alınabilir)
  place(lv) {
    const sol = lv.solution, rng = new RNG((lv.spec.seed ^ 0x5ec2e7) >>> 0), L = lv.length, best = [];
    for (let s = L * 0.3; s < L * 0.78; s += 0.35) {
      const T = lv.walkDelay + s / lv.speed, k = Math.min(sol.K - 1, Math.round(T / sol.dt)); sunDirs(sol.traj[k], lv.sun, _sL1, _sL2);
      pathAt(lv.path, s, _sp);
      if (lv.bridges.some((b) => s > b.s0 - 0.5 && s < b.s1 + 0.5)) continue;
      for (const side of [1, -1]) {
        const x = _sp.x + _sp.nx * 0.62 * side, z = _sp.z + _sp.nz * 0.62 * side, y = 0.42;
        const sh = occluded(lv.cols, x, y, z, _sL1, -1) && (!lv.sun.twin || occluded(lv.cols, x, y, z, _sL2, -1));
        if (sh) best.push({ x, y, z, s });
      }
    }
    if (!best.length) return null;
    return best[Math.floor(rng.next() * best.length)];
  },
  update(dt, dtR) {
    if (!this.on || G.lv !== this.lv) { if (this.g.visible) this.g.visible = false; return; }
    const st = G.state, t = U.uTime.value;
    if (st !== 'play' && st !== 'ready' && st !== 'intro' && st !== 'rewind' && st !== 'fail' && st !== 'paused') { this.g.visible = false; return; }
    if (this.got) {
      // Zifir'e süzülür, sonra söner
      this.ft += dtR; const z = zifir.g.position, e = Ease.inOutCubic(clamp01(this.ft / 0.6));
      this.g.position.set(lerp(this.x, z.x, e), lerp(this.y, 0.5, e) + Math.sin(e * PI) * 0.8, lerp(this.z, z.z, e));
      const a = 1 - clamp01((this.ft - 0.5) / 0.4); this.core.material.opacity = a; this.halo.material.opacity = a * 0.8; this.rays.material.opacity = a;
      if (this.ft > 0.95) { this.on = false; this.g.visible = false; }
      return;
    }
    // görünürlük: ışıkta yok denecek kadar soluk bir kıpırtı, gölgede parlar
    const shaded = occluded(G.lv.cols, this.x, this.y, this.z, L1, -1) || Life.occ(this.x, this.y, this.z, L1) || G.ecl.amt > 0.5;
    this.k = damp(this.k, shaded ? 1 : 0, shaded ? 5 : 8, dtR);
    const tw = 0.85 + Math.sin(t * 6.3) * 0.15, faint = 0.05 + 0.05 * Math.max(0, Math.sin(t * 2.1));
    this.g.visible = true;
    this.g.position.y = this.y + Math.sin(t * 1.7) * 0.06;
    this.core.material.opacity = Math.max(faint, this.k) * tw; this.halo.material.opacity = this.k * 0.85 * tw; this.rays.material.opacity = this.k * 0.9;
    this.rays.material.rotation = t * 0.6; this.rays.scale.setScalar(1.1 + this.k * 0.5 + Math.sin(t * 3) * 0.08); this.halo.scale.setScalar(1.2 + this.k * 0.8);
    if (this.k > 0.4 && Math.random() < dtR * 8) fxAdd.spawn(this.x + (Math.random() - 0.5) * 0.4, this.y + (Math.random() - 0.5) * 0.3, this.z + (Math.random() - 0.5) * 0.4, 0, 0.35, 0, { c: [1.2, 0.9, 2.6], a: 0.8, s: 0.06, s1: 0.01, life: 0.7, drag: 1 });
    if (st === 'play' && this.k > 0.6) { const z = zifir.g.position; if (Math.hypot(z.x - this.x, z.z - this.z) < 1.0) this.collect(); }
  },
  collect() {
    this.got = true; this.ft = 0; const ch = this.ch, c = CHAPTERS[ch], m = Meta.d();
    m.secrets[ch] = 1; Save.save();
    audio.secretStar ? audio.secretStar() : audio.chime(); haptic([12, 40, 20, 40]); G.flash = Math.max(G.flash, 0.25); G.flashCol.set(0.75, 0.6, 1.0);
    FX.burst(this.x, this.y, this.z, 34, { add: true, c: [1.4, 1.1, 2.8], a: 1, s: 0.16, s1: 0.02, life: 1.0, sp: 3.4, up: 1.2, drag: 2, t: 2 });
    banner('Gizli yıldız!', `${c.name} · Gizli Ada açıldı`);
    setTimeout(() => Meta.find('s:' + c.key), 1600);
  },
};
Secret.init();
// Gizli Ada: dünyanın ortalarından bir ada, bol damla ve perili; ilk geçişte büyük ödül
function bonusSpec(ch) {
  const base = levelSpec(ch * 8 + 4);
  return Object.assign(base, { kind: 'bonus', g: -1, i: 4, ch, seed: 900001 + ch * 7717, finale: false, boss: false, drops: Math.min(9, base.drops + 3), sprites: Math.max(2, base.sprites || 0), flares: false, margin: base.margin + 0.06, bonus: true });
}
function startBonus(ch) {
  G.mode = 'bonus'; G.bonusCh = ch; G.hint = false; UI.hideAll(); UI.hud(true); $('#hud').classList.remove('endless'); AdBridge.screen('play');
  enterLevel(bonusSpec(ch), { quick: false });
}
