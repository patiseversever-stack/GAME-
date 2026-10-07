
/* =====================================================================
   YETENEKLER — kademeli açılış, tanıtım töreni, ilk kullanım koçu
   Hikâyede her yetenek kendi adasında açılır: Dal 3, Tutulma 5, Bekle 7, Sürü 10.
   İlk geldiği adada oyun başlamadan kısa bir tören oynar (amblem, canlı mini
   sahne, tek cümle); "Anladım"da amblem süzülüp gerçek düğmenin yerine oturur.
   Sonra ilk doğru anda düğme nabız atar ve zaman bir an yavaşlar.
   Yetenekler çözücü için yalnızca yardımdır: hiçbir ada onlara muhtaç değildir.
   ===================================================================== */
const ZF_MINI = (x, y) => `<g transform="translate(${x},${y})"><g class="zf"><g class="zfw"><ellipse rx="11" ry="9" fill="#0e0a1a" stroke="#b9adff" stroke-width="1.3"/><circle cx="4" cy="-2.5" r="2.7" fill="#fff"/><circle cx="4.9" cy="-2.2" r="1.25" fill="#120e1f"/></g></g></g>`;
const DM_GROUND = '<path d="M6 97Q140 90 274 97L274 124L6 124Z" fill="#2a2145"/><path d="M6 97Q140 90 274 97" fill="none" stroke="#5d4c8e" stroke-width="1.6"/>';
const DM_BTN = (icon) => `<g transform="translate(25,25)"><g class="bpress"><circle r="13" fill="#1c1436" stroke="#c9bfff" stroke-width="1.2"/>${icon}</g><circle class="tp" r="13" fill="none" stroke="#ffe2a6" stroke-width="2.2"/></g>`;
const DM_SUN = (x, y, id) => `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#fff6d2"/><stop offset=".55" stop-color="#ffc35c"/><stop offset="1" stop-color="#ff8a3a"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="22" fill="#ffc35c" opacity=".16"/><circle cx="${x}" cy="${y}" r="12" fill="url(#${id})"/>`;
const IC_DASH = '<svg viewBox="0 0 40 40"><path d="M8 26c6-1 10-6 12-12" stroke="#b9adff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".55"/><path d="M6 31c8-1 15-8 17-16" stroke="#e9e2ff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".35"/><circle cx="26" cy="13" r="7.5" fill="#120e1f" stroke="#c9bfff" stroke-width="1.6"/><circle cx="28.4" cy="11.6" r="1.6" fill="#fff"/></svg>';
const IC_ECL = (id) => `<svg viewBox="-20 -20 40 40"><defs><radialGradient id="${id}"><stop offset="0" stop-color="#ffe9b0"/><stop offset=".55" stop-color="#ffb347"/><stop offset="1" stop-color="#ff7a2a"/></radialGradient></defs><circle r="16.5" fill="none" stroke="#ffe9b0" stroke-width=".9" opacity=".55"/><circle r="12" fill="url(#${id})"/><circle cx="5" cy="-3" r="11" fill="#120e1f"/></svg>`;
const IC_WAIT = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="#9ff0ff" stroke-width="1.8" stroke-dasharray="78 29" stroke-linecap="round" transform="rotate(-90 20 20)"/><rect x="12.5" y="11" width="5.5" height="18" rx="2.4" fill="#e9e2ff"/><rect x="22" y="11" width="5.5" height="18" rx="2.4" fill="#e9e2ff"/></svg>';
const IC_FLOCK = '<svg viewBox="-24 -16 48 32"><path d="M0 3C-5-2-11-6-21-5-13-3-8 1-4 6L0 10 4 6C8 1 13-3 21-5 11-6 5-2 0 3Z" fill="#120e1f" stroke="#cdbfff" stroke-width="1.6" stroke-linejoin="round"/><path d="M-13-9c3-1 6 0 8 2M6-12c3-1 6 0 8 2" stroke="#cdbfff" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".55"/></svg>';
const mini = (svg, s = 18) => svg.replace('<svg ', `<svg x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" `);
function flockDemoBirds() {
  let o = '';
  for (let i = 0; i < 7; i++) {
    const a = PI * (0.9 - (i / 6) * 0.8), side = i < 3.5 ? -1 : 1;
    const v = {
      x0: side * (150 + i * 9), y0: -60 - (i % 3) * 8,
      xa: Math.cos(i * 1.7) * 46, ya: -6 + Math.sin(i * 2.3) * 12,
      x1: Math.cos(a) * 27, y1: 18 - Math.sin(a) * 15,
      x2: side * (120 + i * 12), y2: -70 - i * 4,
    };
    const st = Object.entries(v).map(([k, n]) => `--${k}:${n.toFixed(1)}px`).join(';');
    o += `<g transform="translate(140,62)"><g class="bird" style="${st}"><g class="wing"><path d="M-7 1Q-3.5-4 0 0.5Q3.5-4 7 1" stroke="#d9cfff" stroke-width="1.7" fill="none" stroke-linecap="round"/></g></g></g>`;
  }
  return o;
}
const ABIL = {
  dash: {
    name: 'Dal', btn: '#dashBtn', on: (lv) => !!lv.spec.dash, tag: 'Şimdi dal!', how: ['Sol alttaki düğme', '↑'], icon: IC_DASH,
    desc: 'Zifir bir anlığına mürekkebe gömülür. Işığa yakalanınca bas: yanma <em>%85</em> azalır, ışık perilerini de yutar.',
    demo: () => `<svg class="dm dd" viewBox="0 0 280 120"><defs><linearGradient id="ddB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a8" stop-opacity="0"/><stop offset=".6" stop-color="#ffd27a" stop-opacity=".42"/><stop offset="1" stop-color="#fff0c8" stop-opacity=".9"/></linearGradient></defs>${DM_SUN(252, 22, 'ddS')}${DM_GROUND}<g class="light"><path d="M12 0L46 0L58 96L0 96Z" fill="url(#ddB)"/><ellipse cx="29" cy="96" rx="32" ry="4.5" fill="#ffe2a0" opacity=".75"/></g><ellipse class="ink" cx="140" cy="94" rx="17" ry="3.8" fill="#0b0716"/>${ZF_MINI(140, 84)}${DM_BTN(mini(IC_DASH))}</svg>`,
  },
  ecl: {
    name: 'Tutulma', btn: '#eclipseBtn', on: (lv) => !!lv.spec.eclipse, tag: 'Tutulma hazır!', how: ['Sağ alttaki düğme', 'Boşluk'], icon: IC_ECL('abEc1'),
    desc: 'Ay güneşin önüne geçer: <em>2 saniye</em> her yer karanlık, ışık hiçbir yeri yakmaz. Damla topladıkça yeniden dolar.',
    demo: () => `<svg class="dm de" viewBox="0 0 280 120"><rect class="dark" width="280" height="120" fill="#05031a" opacity="0"/>${[[40, 20], [92, 34], [130, 14], [176, 40], [70, 52], [200, 16]].map(([x, y]) => `<circle class="star" cx="${x}" cy="${y}" r="1.3" fill="#fff" opacity="0"/>`).join('')}${DM_SUN(226, 32, 'deS')}<circle class="corona" cx="226" cy="32" r="16" fill="none" stroke="#ffe9b0" stroke-width="2.6" opacity="0"/><circle class="moon" cx="226" cy="32" r="12.5" fill="#120e1f"/>${DM_GROUND}<rect class="lit" x="66" y="91.5" width="138" height="5" rx="2.5" fill="#ffd98a"/><rect x="34" y="56" width="11" height="38" rx="2" fill="#3b2f61"/><ellipse cx="56" cy="95.5" rx="24" ry="3.4" fill="#0b0716" opacity=".75"/><rect x="232" y="56" width="11" height="38" rx="2" fill="#3b2f61"/><ellipse cx="214" cy="95" rx="24" ry="3.4" fill="#0b0716" opacity=".75"/>${ZF_MINI(52, 84)}${DM_BTN(mini(IC_ECL('deI'), 20))}</svg>`,
  },
  wait: {
    name: 'Bekle', btn: '#waitBtn', on: (lv) => !!lv.spec.wait, tag: 'Basılı tut!', how: ['Soldaki düğmeyi basılı tut', '↓'], icon: IC_WAIT,
    desc: 'Basılı tuttuğun sürece Zifir gölgede durur. Bulutun, sarkacın ya da patlamanın geçmesini bekle. <em>Sabrı sınırlı</em>, yürüdükçe dolar.',
    demo: () => `<svg class="dm dw" viewBox="0 0 280 120"><defs><linearGradient id="dwB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a8" stop-opacity="0"/><stop offset=".6" stop-color="#ffd27a" stop-opacity=".45"/><stop offset="1" stop-color="#fff0c8" stop-opacity=".9"/></linearGradient></defs>${DM_SUN(250, 20, 'dwS')}${DM_GROUND}<rect x="72" y="58" width="6" height="36" fill="#3b2f61"/><rect x="120" y="58" width="6" height="36" fill="#3b2f61"/><rect x="64" y="51" width="70" height="8" rx="3" fill="#4a3b78"/><ellipse cx="100" cy="95.5" rx="32" ry="3.6" fill="#0b0716" opacity=".8"/><g class="beam"><path d="M160 0L194 0L206 96L148 96Z" fill="url(#dwB)"/><ellipse cx="177" cy="96" rx="31" ry="4.5" fill="#ffe2a0" opacity=".75"/></g><g transform="translate(100,66)"><g class="hold"><rect x="-5" y="-6" width="3.4" height="11" rx="1.5" fill="#9ff0ff"/><rect x="1.6" y="-6" width="3.4" height="11" rx="1.5" fill="#9ff0ff"/></g></g>${ZF_MINI(100, 84)}<g transform="translate(25,25)"><g class="bpress"><circle r="13" fill="#1c1436" stroke="#c9bfff" stroke-width="1.2"/>${mini(IC_WAIT, 19)}</g><circle class="ring" r="10" fill="none" stroke="#9ff0ff" stroke-width="2" transform="rotate(-90)" opacity=".9"/></g></svg>`,
  },
  flock: {
    name: 'Sürü', btn: '#flockBtn', on: (lv) => flockAvail(lv), tag: 'Sürüyü sal!', how: ['Sağdaki düğme', 'F'], icon: IC_FLOCK,
    desc: 'Gölgede yürüdükçe mürekkep kuşları sana katılır. En az <em>4 kuşla</em> bas: kanatlarıyla üstünde gölge kubbesi olurlar.',
    demo: () => `<svg class="dm df" viewBox="0 0 280 120"><defs><linearGradient id="dfB" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".5"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></linearGradient></defs>${DM_SUN(250, 22, 'dfS')}<path class="lit" d="M246 24L60 96L250 96Z" fill="url(#dfB)" opacity=".1"/>${DM_GROUND}<rect class="lit" x="24" y="91.5" width="232" height="5" rx="2.5" fill="#ffd98a" opacity=".1"/><ellipse class="dome" cx="140" cy="95" rx="27" ry="4.6" fill="#0b0716" opacity="0"/>${ZF_MINI(140, 84)}${flockDemoBirds()}${DM_BTN(mini(IC_FLOCK, 21))}</svg>`,
  },
};
const ABIL_ORDER = ['dash', 'ecl', 'wait', 'flock'];
const _ap = {};
const Abil = {
  open: false, queue: [], cur: null, total: 0, idx: 0, coachK: null, coachT: 0, coachCd: 0, coachN: 0, aheadT: 0, ahead: false,
  // düğme görünsün mü / çalışsın mı: töreni görülmüş (ya da çözücü oynuyor)
  shown(k) { return G.auto || Save.seen('ab-' + k); },
  pending(lv) { if (!lv || G.auto || window.__noAbil) return []; return ABIL_ORDER.filter((k) => ABIL[k].on(lv) && !Save.seen('ab-' + k)); },
  // oyun başlamadan önce: açılmamış yetenek varsa tören başlar, başlangıç bekler
  gate() { if (this.open) return true; const q = this.pending(G.lv); if (!q.length) return false; this.begin(q); return true; },
  init() {
    const sp = $('#abil .sp');
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + Math.random() * 0.3, r = 74 + Math.random() * 64, el = document.createElement('i'); el.style.setProperty('--x', (Math.cos(a) * r).toFixed(0) + 'px'); el.style.setProperty('--y', (Math.sin(a) * r * 0.8).toFixed(0) + 'px'); el.style.animationDelay = (Math.random() * 2.6).toFixed(2) + 's'; sp.appendChild(el); }
    $('#abil .go').addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
  },
  begin(q) {
    this.queue = q.slice(); this.total = q.length; this.idx = 0; this.open = true;
    hideToast(); G.drag = null; G.keyDir = 0; G.holdWait = false;
    this.show(this.queue.shift());
  },
  show(k) {
    const A = ABIL[k], el = $('#abil'), emb = el.querySelector('.emb');
    this.cur = k;
    el.classList.remove('out', 'ready', 'on');
    emb.classList.remove('fly'); emb.style.transform = ''; emb.style.opacity = '';
    el.querySelector('.ic').innerHTML = A.icon;
    el.querySelector('h3').textContent = A.name;
    el.querySelector('.d').innerHTML = A.desc;
    el.querySelector('.demo').innerHTML = A.demo();
    const fine = matchMedia('(pointer:fine)').matches;
    el.querySelector('.how').innerHTML = fine ? `${A.how[0]} · klavye <kbd>${A.how[1]}</kbd>` : A.how[0];
    el.querySelector('.cnt').textContent = this.total > 1 ? `${this.idx + 1} / ${this.total}` : '';
    void el.offsetWidth; el.classList.add('on');
    requestAnimationFrame(() => { const r = emb.getBoundingClientRect(); el.style.setProperty('--ex', (r.left + r.width / 2).toFixed(0) + 'px'); el.style.setProperty('--ey', (r.top + r.height / 2).toFixed(0) + 'px'); });
    audio.abilityReveal && audio.abilityReveal(); haptic([8, 50, 14]);
    clearTimeout(this._rt); this._rt = setTimeout(() => { if (this.cur === k) el.classList.add('ready'); }, 1650);
    if (window.__gdHook) window.__gdHook('abil', k);
  },
  // "Anladım": metin söner, amblem gerçek düğmeye süzülür ve oturur
  next() {
    const el = $('#abil'); if (!this.open || !el.classList.contains('ready')) return;
    const k = this.cur, A = ABIL[k], emb = el.querySelector('.emb');
    el.classList.remove('ready'); el.classList.add('out'); audio.ui();
    Save.markSeen('ab-' + k); this.refreshHud();
    const b = $(A.btn); b.classList.add('abHide');
    requestAnimationFrame(() => {
      const r0 = emb.getBoundingClientRect(), r1 = b.getBoundingClientRect();
      if (r1.width > 0) {
        const dx = r1.left + r1.width / 2 - (r0.left + r0.width / 2), dy = r1.top + r1.height / 2 - (r0.top + r0.height / 2), s = r1.width / r0.width;
        emb.classList.add('fly'); emb.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${s.toFixed(3)})`; emb.style.opacity = '0';
      } else { emb.classList.add('fly'); emb.style.opacity = '0'; }
      audio.whoosh(true, 0.7, 0.06);
      setTimeout(() => this.land(k), 800);
    });
  },
  land(k) {
    const A = ABIL[k], b = $(A.btn), el = $('#abil');
    b.classList.remove('abHide', 'abLand'); void b.offsetWidth; b.classList.add('abLand'); setTimeout(() => b.classList.remove('abLand'), 760);
    const r = b.getBoundingClientRect();
    if (r.width > 0) { const fx = document.createElement('div'); fx.className = 'abBurst'; fx.style.left = (r.left + r.width / 2).toFixed(0) + 'px'; fx.style.top = (r.top + r.height / 2).toFixed(0) + 'px'; $('#ui').appendChild(fx); setTimeout(() => fx.remove(), 1300); }
    audio.abilityLand && audio.abilityLand(); haptic([12, 30, 18]);
    if (this.queue.length) { this.idx++; const nk = this.queue.shift(); setTimeout(() => this.show(nk), 420); return; }
    el.classList.remove('on', 'out'); this.open = false; this.cur = null;
    G.readyT = 0; G.readyHint = false;
  },
  refreshHud() { act.hud(true); updateHud(true); ShadowBirds.hud(true); },
  /* ---------- ilk kullanım koçu ---------- */
  need(k, lv) { return ABIL[k].on(lv) && Save.seen('ab-' + k) && !Save.seen('abu-' + k); },
  reset() { this.uncoach(); this.coachN = 0; this.coachCd = 1.5; this.aheadT = 0; this.ahead = false; },
  used(k) { if (!Save.seen('abu-' + k)) Save.markSeen('abu-' + k); if (this.coachK === k) this.uncoach(); },
  coach(k) {
    const A = ABIL[k], b = $(A.btn); if (!b || !b.classList.contains('show')) return;
    this.coachK = k; this.coachT = 2.8; this.coachN++;
    b.classList.add('coach'); const t = document.createElement('span'); t.className = 'ctag'; t.textContent = A.tag; b.appendChild(t); this._tag = t;
    if (k !== 'wait') { G.slowT = Math.max(G.slowT, 0.9); G.slowK = 0.4; }
    audio.coach && audio.coach(); haptic(10);
  },
  uncoach() {
    if (!this.coachK) return; const b = $(ABIL[this.coachK].btn);
    b.classList.remove('coach'); if (this._tag) this._tag.remove(); this._tag = null; this.coachK = null; this.coachCd = 5;
  },
  // ileride ışık var mı (Bekle'nin anlamlı olduğu an)
  litAhead(lv, dtR) {
    if ((this.aheadT -= dtR) > 0) return this.ahead;
    this.aheadT = 0.2; const mh = G.mirHit;
    pathAt(lv.path, Math.min(lv.length, G.s + 0.9), _ap); this.ahead = exposureNow(lv, _ap.x, _ap.z, _ap.nx, _ap.nz) > 0.6;
    G.mirHit = mh; return this.ahead;
  },
  update(dtR) {
    // adaya varınca (kamera yerine oturunca) tören kendiliğinden açılır
    if (G.state === 'ready' && !this.open && G.readyT > 0.3 && !G.drag && $('#hud').classList.contains('on')) this.gate();
    if (this.coachK && ((this.coachT -= dtR) <= 0 || G.state !== 'play')) this.uncoach();
    const lv = G.lv;
    if (G.state !== 'play' || G.auto || !lv || this.coachK) return;
    if ((this.coachCd -= dtR) > 0 || this.coachN >= 3 || G.T < lv.walkDelay + 0.4 || G.breathT > 0) return;
    let k = null;
    if (this.need('dash', lv) && G.f > 0.3 && act.canDash()) k = 'dash';
    else if (this.need('ecl', lv) && G.f > 0.3 && G.ecl.charge >= 1 && !G.ecl.active) k = 'ecl';
    else if (this.need('flock', lv) && G.f > 0.3 && ShadowBirds.count() >= FLOCK_MIN && !(ShadowBirds.canT > 0)) k = 'flock';
    else if (this.need('wait', lv) && G.f === 0 && !G.holding && !G.waiting && G.patience > 1.5 && (lv.hasMovers || lv.flares || lv.spec.boss) && this.litAhead(lv, dtR)) k = 'wait';
    if (k) this.coach(k);
  },
};
Abil.init();
