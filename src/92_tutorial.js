/* =====================================================================
   ÖĞRETİCİ: "Nasıl oynanır?" (5 sayfa)
   Her sayfada oyunun gerçek 3B parçalarıyla canlı bir gösteri oynar
   (bkz. TutStage); altta kısa bir açıklama ve gösteriyle eşzamanlı yanan
   küçük göstergeler (Kaydır, Dal, Bekle, Tutulma, kuşlar, Sürü, yıldızlar).
   ===================================================================== */
const r2 = (v) => Math.round(v * 100) / 100;
const TI = {
  drag: '<svg viewBox="0 0 24 24"><path d="M8 13V6a1.5 1.5 0 0 1 3 0v6M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V7a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7-2.5 0-4-1.5-5.5-4L4 14a1.5 1.5 0 0 1 2.5-1.6L8 14"/><path d="M3 4h4M17 4h4M5 2 3 4l2 2M19 2l2 2-2 2"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7Z"/></svg>',
  dive: '<svg viewBox="0 0 24 24"><path d="M4 15c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2M12 4v8M8.5 8.5 12 12l3.5-3.5"/></svg>',
  wait: '<svg viewBox="0 0 24 24"><rect x="7" y="5" width="3.4" height="14" rx="1.2"/><rect x="13.6" y="5" width="3.4" height="14" rx="1.2"/></svg>',
  ecl: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M15.5 6.2a7 7 0 1 1-6.9 11.5A6 6 0 0 0 15.5 6.2Z" fill="currentColor"/></svg>',
  bird: '<svg viewBox="0 0 24 24"><path d="M3 9c3 0 5 1 9 5 4-4 6-5 9-5-3 1-5 3-6.5 6.5L12 13l-2.5 2.5C8 12 6 10 3 9Z"/></svg>',
  flock: '<svg viewBox="0 0 24 24"><path d="M2 12c2.5 0 4 .8 6 3 2-2.2 3.5-3 6-3M10 7c2 0 3.2.6 4.8 2.4C16.4 7.6 17.6 7 19.6 7M12 17c1.6 0 2.6.5 3.8 1.9 1.2-1.4 2.2-1.9 3.8-1.9"/></svg>',
  world: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 3.6 5.5 3.6 8.5s-1 5.9-3.6 8.5M12 3.5C9.4 6.1 8.4 9 8.4 12s1 5.9 3.6 8.5"/></svg>',
  mask: '<svg viewBox="0 0 24 24"><path d="M4 6c5-2 11-2 16 0 0 7-3 12-8 12S4 13 4 6Z"/><path d="M8 10h2.5M13.5 10H16M9.5 14c1.5 1 3.5 1 5 0"/></svg>',
  hanger: '<svg viewBox="0 0 24 24"><path d="M12 6a2 2 0 1 1 2 2c-1 0-2 1-2 2M12 10 3 17h18Z"/></svg>',
  inf: '<svg viewBox="0 0 24 24"><path d="M7 9a3 3 0 1 0 0 6c2.5 0 7.5-6 10-6a3 3 0 1 1 0 6c-2.5 0-7.5-6-10-6Z"/></svg>',
};
const TUT_CARDS = [
  { k: 'Kontrol', t: 'Güneşi sen çevir', dur: 10, chips: [['drag', 'Kaydır']],
    b: 'Parmağını <em>sağa sola kaydır</em>: güneş yayında kayar, gölgeler onunla döner; alçak güneş uzun gölge verir. Zifir ışıkta <em>erir</em>, gölgede <em>toparlanır</em>.' },
  { k: 'Hedef', t: 'Kapıya ulaş', dur: 12, chips: [['star', 'Kapı'], ['star', 'Tüm damlalar'], ['star', 'Lekesiz']],
    b: 'Zifir yolda kendiliğinden yürür. <em>Gece damlaları</em> ışıkta erir; gölgede tutup topla. <em>Gece Kapısı</em>’na varınca ada geceye bürünür.' },
  { k: 'Yetenekler', t: 'Dal · Bekle · Tutulma', dur: 12, chips: [['dive', 'Dal'], ['wait', 'Bekle'], ['ecl', 'Tutulma']],
    b: '<em>Dal</em>: mürekkebe gömül, ışık az yakar, ışık perilerini yutar. <em>Bekle</em>: basılı tut, Zifir durur. <em>Tutulma</em>: güneşi birkaç saniye karart.' },
  { k: 'Gölge Kuşları', t: 'Sürünü topla', dur: 11, chips: [['bird', 'Kuşlar 0/4'], ['flock', 'Sürü']],
    b: 'Gölgede yürüdükçe <em>Gölge Kuşları</em> katılır. Dört kuş olunca <em>Sürü</em>’ye bas: kanatlarıyla Zifir’e gölge olurlar.' },
  { k: 'Dahası', t: 'Sekiz dünya, bir tiyatro', dur: 14, chips: [['world', '8 dünya'], ['mask', 'Tiyatro'], ['hanger', 'Gardırop'], ['inf', 'Sonsuz Gün']],
    b: 'Bulut, balon, kristal köprü, ikiz güneş, buz, ayna, sarkaç: her dünyanın yeni bir kuralı var, ilk görüşte oyun anlatır. <em>Gölge Tiyatrosu</em>’nda kazandığın <em>kostümleri</em> Zifir’e giydir.' },
];
const TUT = {
  open: false, i: 0, t: 0, hold: false, from: null, token: 0, down: null,
  el: null, segs: [],
  init() {
    this.el = $('#tutorial'); this.hand = $('#tHand'); this.handI = $('#tHand i'); this.hint = $('#tutorial .thint');
    const box = $('#tSegs');
    TUT_CARDS.forEach((c, i) => { const s = document.createElement('button'); s.className = 'seg tap'; s.setAttribute('aria-label', `Adım ${i + 1}`); s.innerHTML = '<i></i>'; s.addEventListener('click', (e) => { e.stopPropagation(); this.go(i); }); box.appendChild(s); this.segs.push(s); });
    $('#tSkip').addEventListener('click', (e) => { e.stopPropagation(); audio.ui(); this.close(false); });
    $('#tNext').addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
    $('#tPrev').addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
    // gösteri alanı: dokun ileri, kaydır gez, basılı tut durdur
    const st = $('#tStage');
    st.addEventListener('pointerdown', (e) => { audio.unlock(); this.down = { x: e.clientX, y: e.clientY, lx: e.clientX, drag: false }; this.holdTimer = setTimeout(() => { if (this.down && !this.down.drag) { this.hold = true; this.el.classList.add('held'); } }, 260); });
    // ilk sayfada sağa sola sürüklemek gerçekten güneşi çevirir (oyundaki gibi)
    st.addEventListener('pointermove', (e) => {
      const d = this.down; if (!d) return;
      if (this.i === 0 && !d.drag && Math.abs(e.clientX - d.x) > 8 && Math.abs(e.clientX - d.x) > Math.abs(e.clientY - d.y)) { d.drag = true; clearTimeout(this.holdTimer); this.hold = false; this.el.classList.remove('held'); }
      if (d.drag) TutStage.userDrag((e.clientX - d.lx) * sens());
      d.lx = e.clientX;
    });
    const up = (e) => {
      clearTimeout(this.holdTimer);
      const d = this.down; this.down = null; const wasHold = this.hold; this.hold = false; this.el.classList.remove('held');
      if (d && d.drag) { TutStage.userUp(); return; }
      if (!d || e.type === 'pointercancel') return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? this.next() : this.prev(); return; }
      if (wasHold || Math.hypot(dx, dy) > 12) return;
      if (e.clientX < innerWidth * 0.3) this.prev(); else this.next();
    };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  },
  show(from) {
    if (!this.el) this.init();
    this.from = from; this.open = true; hideToast();
    for (const s of ['title', 'pause', 'settings']) UI.hide(s);
    TutStage.open(); TutStage.resize(innerWidth, innerHeight);
    this.el.classList.add('on');
    this.go(0, true);
  },
  close(play) {
    if (!this.open) return;
    this.open = false; this.token++;
    Save.markSeen('tutorial');
    this.el.classList.remove('on'); TutStage.close();
    if (play) { audio.ui(); startStory(nextStoryG()); return; }
    if (this.from === 'pause') UI.show('pause');
    else if (this.from === 'settings') { refreshToggles(); UI.show('settings'); }
    else if (G.state === 'title') UI.show('title');
  },
  next() { if (this.i >= TUT_CARDS.length - 1) { this.close(true); return; } this.go(this.i + 1); },
  prev() { if (this.i > 0) this.go(this.i - 1); },
  go(n, first = false) {
    n = clamp(n, 0, TUT_CARDS.length - 1);
    const dir = n >= this.i ? 1 : -1, card = TUT_CARDS[n], tok = ++this.token;
    if (!first) { audio.whoosh(dir > 0, 0.32, 0.035); audio.ui(); }
    this.i = n; this.t = 0;
    this.segs.forEach((s, k) => { s.style.setProperty('--p', k < n ? 1 : 0); s.classList.toggle('cur', k === n); });
    $('#tNext').textContent = n === TUT_CARDS.length - 1 ? 'Oyna' : 'İleri';
    $('#tPrev').style.visibility = n === 0 ? 'hidden' : 'visible';
    const cardEl = $('#tCard'); cardEl.style.setProperty('--dx', dir * 36 + 'px');
    cardEl.classList.remove('in'); cardEl.classList.add('out');
    setTimeout(() => {
      if (tok !== this.token) return;
      this.hint.textContent = n === 0 ? 'Dene: güneşi kaydır · Dokun: ileri' : 'Dokun: ileri · Kaydır: gez · Basılı tut: durdur';
      $('#tK').textContent = `${n + 1} / ${TUT_CARDS.length} · ${card.k}`; $('#tT').textContent = card.t; $('#tB').innerHTML = card.b;
      $('#tChips').innerHTML = card.chips.map(([ic, l]) => `<span class="tchip">${TI[ic]}<b>${l}</b></span>`).join('');
      this.chips = [...$('#tChips').children];
      TutStage.setPage(n);
      cardEl.classList.remove('out'); void cardEl.offsetWidth; cardEl.classList.add('in');
    }, first ? 0 : 200);
  },
  update(dt) {
    if (!this.open) return;
    if (!this.hold) { if (TutStage.userT <= 0) this.t += dt; TutStage.update(dt); }
    const card = TUT_CARDS[this.i], p = clamp01(this.t / card.dur);
    this.segs[this.i] && this.segs[this.i].style.setProperty('--p', r2(p));
    // göstergeler gösteriyle eşzamanlı yanar
    if (this.chips) {
      const c = TutStage.chip, pg = TutStage.page;
      this.chips.forEach((el, k) => el.classList.toggle('on', pg === 1 ? k < (TutStage.stars || 0) : k === c));
      if (pg === 3 && this.chips[0]) { const b = this.chips[0].querySelector('b'), txt = `Kuşlar ${TutStage.birdsN}/4`; if (b.textContent !== txt) b.textContent = txt; }
    }
    const h = TutStage.page === 0 ? TutStage.hand : -1;
    this.hand.classList.toggle('on', h >= 0); if (h >= 0) { const dir = TutStage.spot && TutStage.spot.uL < TutStage.spot.uS ? -1 : 1; this.handI.style.transform = `translateX(${((h - 0.5) * 200 * dir).toFixed(1)}px)`; }
    if (this.t >= card.dur && this.i < TUT_CARDS.length - 1) this.go(this.i + 1);
  },
  key(e) {
    if (e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); this.next(); }
    else if (e.code === 'ArrowLeft') this.prev();
    else if (e.code === 'Escape') this.close(false);
  },
};
