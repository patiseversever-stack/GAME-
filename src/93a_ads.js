
/* =====================================================================
   REKLAM KÖPRÜSÜ — sağlayıcıdan bağımsız taslak (ayrıntı: docs/REKLAM_KURULUMU.md)
   Oyun yalnızca bu nesneyi çağırır:
     AdBridge.rewarded('yer')      → Promise<boolean>  (ödül kazanıldı mı)
     AdBridge.interstitial('yer')  → Promise<void>     (sıklık kuralları uygun değilse hiç göstermez)
     AdBridge.screen('ad')         → banner/native yalnızca menü ekranlarında açılır, oyunda kapanır
   Gerçek SDK sonradan bağlanır (öncelik sırası):
     1) window.GundonumuAds = { init(cfg), isReady(kind), load(kind, placement), showRewarded(p), showInterstitial(p),
                                showBanner(p), hideBanner(), loadNative(p) }   (Capacitor/Cordova/RN köprüsü doldurur)
     2) WebView postMessage: { type:'gd-ad', id, action, kind, placement }  →  yanıt { type:'gd-ad-result', id, ok, data }
     3) hiçbiri yoksa test modu: ekranda "Test reklamı" gösterilir, ödül verilir.
   Ayarlar: window.GUNDONUMU_AD_CONFIG (oyundan önce tanımlanır) AD_DEFAULTS'un üstüne yazılır.
   Kullanıcıyı rahatsız etmeme kuralları burada uygulanır: oyun sırasında asla reklam yok, geçiş reklamı
   yalnızca doğal molalarda (ada bitince, menüye dönünce), ödüllü reklam her zaman oyuncunun isteğiyle.
   ===================================================================== */
const AD_DEFAULTS = {
  enabled: true,
  test: true, // gerçek SDK bağlanınca false yapılır (yoksa zaten test moduna düşer)
  provider: 'none', // 'admob' | 'applovin' | 'unity' | 'ironsource' ... (yalnızca bilgi; köprü kullanır)
  ids: { // sağlayıcı reklam birimi kimlikleri (köprüye aynen iletilir)
    android: { rewarded: '', interstitial: '', banner: '', native: '', appId: '' },
    ios: { rewarded: '', interstitial: '', banner: '', native: '', appId: '' },
  },
  interstitial: {
    firstAfterLevels: 5, // ilk geçiş reklamı en erken bu kadar ada bittikten sonra
    minLevelsBetween: 3, // iki geçiş reklamı arasında en az bu kadar ada
    minIntervalSec: 150, // iki geçiş reklamı arasında en az bu kadar saniye
    afterRewardedSec: 120, // ödüllü reklam izlendiyse bu süre geçiş reklamı yok
    sessionMax: 6, // oturum başına en fazla
    dailyMax: 20,
    placements: ['level_complete', 'to_map'], // izin verilen doğal molalar
    timeoutSec: 90,
  },
  // limits: her ödüllü yer için günlük üst sınır (dengeli: günde ~10 fırsat)
  // timeoutSec: kabuk bu sürede yanıt vermezse reklam başarısız sayılır (oyun asla kilitli kalmaz)
  rewarded: { cooldownSec: 2, dailyMax: 25, timeoutSec: 150, limits: { skip: 3, rent: 2, piece: 1, shield: 3, gift: 3, reroll: 1 } },
  banner: { enabled: true, screens: ['map', 'hz'], heightPx: 56 }, // yalnızca menü ekranlarında, oyunda asla
  // title: açılışta görünen karşılama ekranı (her açılışta bir gösterim). titleHeightPx: karşılama yuvasının yüksekliği.
  // overlay: postMessage köprüsü yerel native görünümü yuvanın üstüne çiziyorsa true (GundonumuAds.showNativeAt varsa kendiliğinden)
  native: { enabled: true, screens: ['title', 'hz'], titleHeightPx: 150, overlay: false },
  gift: { firstMin: 3, minMin: 20, maxMin: 30 }, // Hediye Zifir: ilk geliş ve aralık (dakika); testte küçült
  noAdsKey: 'noAds', // "Reklamları kaldır" satın alınırsa: Save.data.noAds = true → geçiş + banner kapanır, ödüllü kalır
};
// oyun içindeki reklam yerleri (köprü bu adlarla çağrılır; raporlama için)
const AD_PLACEMENTS = {
  rv_revive: 'Bir şans daha (ölünce kaldığın yerden devam)',
  rv_dust_double: 'Ada sonu ışık tozunu ikiye katla',
  rv_chest_double: 'Günün sandığını ikiye katla',
  rv_skip: 'Haritada sıradaki kilitli adayı aç',
  rv_bonus: 'Gizli Adayı yıldızı bulmadan aç',
  rv_compass: 'Gizli yıldız pusulası (adayı ve yeri gösterir)',
  rv_rent: 'Kilitli kostümü ya da rengi 24 saat giy',
  rv_piece: 'Kostüm için gölge parçası topla',
  rv_shield: 'Gölge kalkanıyla yeniden dene',
  rv_gift: 'Hediye Zifir’in paketini aç',
  rv_reroll: 'Günlük görevi değiştir',
  int_level_complete: 'Sonraki adaya geçerken (doğal mola)',
  int_to_map: 'Gökyüzü haritasına dönerken',
  banner_menu: 'Gökyüzü ve Hazine ekranlarının altı',
  native_title: 'Karşılama ekranının altında sponsorlu kart',
  native_hz: 'Hazine ekranında sponsorlu kart',
};
function adMerge(a, b) { const o = Array.isArray(a) ? a.slice() : Object.assign({}, a); if (!b) return o; for (const k in b) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? adMerge(a[k], b[k]) : b[k]; return o; }
// Kabuğa mesaj kanalı: React Native, iOS WKWebView, Android/Flutter JavaScript kanalı, flutter_inappwebview ya da iframe
const hostChan = () => { const w = window, wk = w.webkit && w.webkit.messageHandlers; return w.ReactNativeWebView || (wk && (wk.gundonumu || wk.gdAds)) || w.GundonumuNative || (w.flutter_inappwebview && w.flutter_inappwebview.callHandler ? w.flutter_inappwebview : null) || null; };
function hostSend(m) {
  const w = window, s = JSON.stringify(m), wk = w.webkit && w.webkit.messageHandlers;
  try {
    if (w.ReactNativeWebView) w.ReactNativeWebView.postMessage(s);
    else if (wk && (wk.gundonumu || wk.gdAds)) (wk.gundonumu || wk.gdAds).postMessage(s);
    else if (w.GundonumuNative && w.GundonumuNative.postMessage) w.GundonumuNative.postMessage(s);
    else if (w.flutter_inappwebview && w.flutter_inappwebview.callHandler) w.flutter_inappwebview.callHandler('gundonumu', s);
    else if (w.parent !== w) w.parent.postMessage(m, '*');
    else return false;
    return true;
  } catch (e) { return false; }
}
// başarısız ödüllü reklamda oyuncuya ne olduğunu söyle
const AD_FAIL = {
  closed: 'Ödül için videoyu sonuna kadar izlemelisin.', skipped: 'Ödül için videoyu sonuna kadar izlemelisin.', not_rewarded: 'Ödül için videoyu sonuna kadar izlemelisin.',
  nofill: 'Şu an uygun reklam yok. Biraz sonra tekrar dene.', no_fill: 'Şu an uygun reklam yok. Biraz sonra tekrar dene.', not_ready: 'Şu an uygun reklam yok. Biraz sonra tekrar dene.',
  offline: 'İnternet bağlantısı yok. Bağlanınca tekrar dene.', timeout: 'Reklam yanıt vermedi. Biraz sonra tekrar dene.',
  unknown: 'Ödül verilemedi: video tamamlanmadı ya da şu an reklam yok.', error: 'Reklam açılamadı. Biraz sonra tekrar dene.',
};
const AdBridge = {
  cfg: null, st: null, sess: { int: 0, lastInt: 0, lastRv: 0, levels: 0 }, busy: false, seq: 0, wait: new Map(), bannerOn: false, scr: '',
  init() {
    this.cfg = adMerge(AD_DEFAULTS, window.GUNDONUMU_AD_CONFIG || {});
    const today = dateNum(), d = Save.data.ads || (Save.data.ads = {});
    if (d.day !== today) { d.day = today; d.int = 0; d.rv = 0; d.use = {}; }
    d.use = d.use || {}; d.total = d.total || 0;
    d.levels = d.levels || 0; this.st = d;
    this.sess.lastInt = performance.now(); // açılışta hemen geçiş reklamı yok
    document.documentElement.style.setProperty('--nath', (this.cfg.native.titleHeightPx | 0 || 150) + 'px');
    const onRes = (m) => { if (typeof m === 'string') try { m = JSON.parse(m); } catch (e) { return; } if (!m || m.type !== 'gd-ad-result' || !this.wait.has(m.id)) return; const r = this.wait.get(m.id); this.wait.delete(m.id); r(m); };
    window.addEventListener('message', (e) => onRes(e.data));
    window.gdAdResult = (m) => onRes(Object.assign({ type: 'gd-ad-result' }, typeof m === 'string' ? JSON.parse(m) : m)); // evaluateJavascript ile doğrudan yanıt
    window.gdSetBannerHeight = (px) => this.setBannerH(px); // kabuk gerçek banner yüksekliğini (CSS px) bildirir; 0 = banner yok
    window.gdNativeFilled = (placement, ok) => { this.natFill = this.natFill || {}; this.natFill[placement] = !!ok; if (placement === 'native_title') { this._sk = null; this.titleNative(true); } };
    const N = this.native(); if (N && N.init) try { N.init(this.cfg, { placements: AD_PLACEMENTS }); } catch (e) { console.warn('reklam köprüsü init', e); }
    this.preload('rewarded'); this.preload('interstitial');
  },
  native() { return window.GundonumuAds || null; },
  rn() { return hostChan(); },
  noAds() { return !!Save.data[this.cfg.noAdsKey]; },
  // WebView köprüsüne mesaj: yanıt bekler (zaman aşımı → başarısız)
  post(action, kind, placement, timeout = 45000, extra = null) {
    const id = ++this.seq, msg = Object.assign({ type: 'gd-ad', id, action, kind, placement }, extra);
    return new Promise((res) => {
      this.wait.set(id, res); setTimeout(() => { if (this.wait.has(id)) { this.wait.delete(id); res({ ok: false, reason: 'timeout', timeout: true }); } }, timeout);
      if (!hostSend(msg)) { this.wait.delete(id); res({ ok: false, reason: 'error' }); }
    });
  },
  mode() { return this.native() ? 'native' : this.rn() || window.parent !== window ? 'post' : 'mock'; },
  preload(kind) { const N = this.native(); try { if (N && N.load) N.load(kind); else if (this.mode() === 'post') this.post('load', kind, '', 3000); } catch (e) {} },
  ready(kind) { if (!this.cfg.enabled) return false; const N = this.native(); if (N && N.isReady) { try { return !!N.isReady(kind); } catch (e) { return false; } } return true; },
  // ödüllü: oyuncu kendisi ister; sonuç true ise ödül verilir
  async rewarded(placement) {
    if (!this.cfg.enabled || this.busy) return false;
    const now = performance.now();
    if (now - this.sess.lastRv < this.cfg.rewarded.cooldownSec * 1000 && this.sess.lastRv) { toast('Bir an… reklam hazırlanıyor, birkaç saniye sonra tekrar dene.', 2.2); return false; }
    if (this.st.rv >= this.cfg.rewarded.dailyMax) { toast('Bugünlük ödüllü reklam hakkın doldu.', 2.4); return false; }
    const m = this.mode(), tmo = (this.cfg.rewarded.timeoutSec || 150) * 1000;
    if (m !== 'mock' && navigator.onLine === false) { this.fail('offline'); return false; }
    this.busy = true; audio.duck && audio.duck(true);
    let res = { ok: false, reason: 'error' };
    try {
      if (m === 'native') {
        const N = this.native();
        if (!(await this.waitReady('rewarded', 6000))) res = { ok: false, reason: 'nofill' };
        else res = this.norm(await this.within(Promise.resolve(N.showRewarded(placement)), tmo));
      } else if (m === 'post') res = this.norm(await this.post('show', 'rewarded', placement, tmo));
      else res = this.norm(await this.mock('rewarded', placement));
    } catch (e) { console.warn('ödüllü reklam', e); res = { ok: false, reason: 'error' }; }
    const ok = res.ok;
    this.busy = false; audio.duck && audio.duck(false); lastT = performance.now();
    this.sess.lastRv = performance.now(); if (ok) { this.st.rv++; this.st.total = (this.st.total || 0) + 1; Save.save(); Wardrobe.glowCheck(); }
    this.preload('rewarded');
    if (!ok) this.fail(res.reason);
    this.log('rewarded', placement, ok ? 'rewarded' : res.reason);
    return ok;
  },
  // kabuğun yanıtı: true/false ya da { ok|rewarded, reason }
  norm(r) {
    if (r === true) return { ok: true, reason: '' };
    if (!r) return { ok: false, reason: r === false ? 'unknown' : 'error' };
    const ok = !!(r.ok || r.rewarded);
    return { ok, reason: ok ? '' : r.reason || (r.timeout ? 'timeout' : 'unknown') };
  },
  fail(reason) { toast(AD_FAIL[reason] || AD_FAIL.error, 2.8); },
  within(p, ms) { return Promise.race([p, new Promise((r) => setTimeout(() => r({ ok: false, reason: 'timeout' }), ms))]); },
  // kabuk hazır değil diyorsa yükletip kısa süre bekle (oyuncuya "hazırlanıyor" der)
  async waitReady(kind, ms) {
    const N = this.native(); if (!N || !N.isReady) return true;
    try { if (N.isReady(kind)) return true; } catch (e) { return true; }
    try { N.load && N.load(kind); } catch (e) {}
    toast('Reklam hazırlanıyor…', 1.6);
    for (let t = 0; t < ms; t += 250) { await new Promise((r) => setTimeout(r, 250)); try { if (N.isReady(kind)) return true; } catch (e) { return true; } }
    return false;
  },
  // test ve analitik için: kabuk dinliyorsa her sonucu bildir
  log(kind, placement, result) { const N = this.native(); try { if (N && N.onResult) N.onResult(kind, placement, result); else if (this.mode() === 'post') hostSend({ type: 'gd-ad-log', kind, placement, result }); } catch (e) {} },
  // geçiş: yalnızca doğal molada ve sıklık kuralları uygunsa
  canInterstitial(placement) {
    const c = this.cfg.interstitial, now = performance.now();
    if (!this.cfg.enabled || this.noAds() || this.busy || !c.placements.includes(placement)) return false;
    if (this.st.levels < c.firstAfterLevels || this.sess.levels < c.minLevelsBetween) return false;
    if (now - this.sess.lastInt < c.minIntervalSec * 1000) return false;
    if (this.sess.lastRv && now - this.sess.lastRv < c.afterRewardedSec * 1000) return false;
    if (this.sess.int >= c.sessionMax || this.st.int >= c.dailyMax) return false;
    return this.ready('interstitial');
  },
  async interstitial(placement) {
    if (!this.canInterstitial(placement)) return false;
    this.busy = true; audio.duck && audio.duck(true);
    const tmo = (this.cfg.interstitial.timeoutSec || 90) * 1000;
    try { const m = this.mode(); if (m === 'native') await this.within(Promise.resolve(this.native().showInterstitial(placement)), tmo); else if (m === 'post') await this.post('show', 'interstitial', placement, tmo); else await this.mock('interstitial', placement); } catch (e) { console.warn('geçiş reklamı', e); }
    this.busy = false; audio.duck && audio.duck(false); lastT = performance.now(); this.log('interstitial', placement, 'shown');
    this.sess.int++; this.sess.levels = 0; this.sess.lastInt = performance.now(); this.st.int++; Save.save(); this.preload('interstitial');
    return true;
  },
  // her ada sonu sayılır (geçiş reklamı aralığı için)
  levelDone() { this.sess.levels++; this.st.levels = (this.st.levels || 0) + 1; },
  // ekran değişince çağrılır: banner yalnızca izinli menülerde görünür
  screen(name) {
    this.scr = name;
    if (name === 'title') this.titleNative();
    const b = this.cfg.banner, on = this.cfg.enabled && b.enabled && !this.noAds() && b.screens.includes(name);
    if (on === this.bannerOn) return; this.bannerOn = on;
    document.body.classList.toggle('adbanner', on && b.heightPx > 0); document.documentElement.style.setProperty('--adb', on ? b.heightPx + 'px' : '0px');
    const N = this.native(), m = this.mode(), hv = (v) => { if (typeof v === 'number') this.setBannerH(v); else if (v && typeof v.height === 'number') this.setBannerH(v.height); };
    try {
      if (m === 'native') { if (on) { const r = N.showBanner && N.showBanner('banner_menu'); if (r && r.then) r.then(hv).catch(() => this.setBannerH(0)); else hv(r); } else N.hideBanner && N.hideBanner(); }
      else if (m === 'post') this.post(on ? 'show' : 'hide', 'banner', 'banner_menu', 4000).then((r) => { if (on) hv(r); });
      else this.mockBanner(on);
    } catch (e) {}
  },
  // gerçek banner yüksekliği (CSS px): düğmeler bu kadar yukarı kayar; 0 = banner gelmedi, yer kapanır
  setBannerH(px) {
    px = Math.max(0, Math.round(+px || 0)); this.cfg.banner.heightPx = px;
    if (this.bannerOn) { document.body.classList.toggle('adbanner', px > 0); document.documentElement.style.setProperty('--adb', px + 'px'); }
    if (SkyMap) SkyMap._lay = null;
  },
  // karşılama ekranı kartı: ekran her açıldığında yenilenir (en sık dakikada bir); kart dolu kalırsa tekrar yüklenmez
  titleNative(force) {
    const now = performance.now(), box = $('#natT'), nc = this.cfg.native;
    if (!box) return;
    if (this.overlay()) { // yerel görünüm: yuva ayrılır, reklamı köprü yuvanın üstüne çizer (slotTick)
      const on = this.cfg.enabled && nc.enabled && !this.noAds() && nc.screens.includes('title') && !(this.natFill && this.natFill.native_title === false);
      box.innerHTML = ''; box.className = on ? 'slot' : ''; box.style.display = on ? '' : 'none'; this.slotOn = on; this._sk = null;
      this.setTnat(on); return;
    }
    if (!force && box.childElementCount && now - (this.natT || 0) < 60000) return;
    this.natT = now; this.fillNative(box, 'native_title');
  },
  overlay() { const N = this.native(); return N ? !!N.showNativeAt : this.mode() === 'post' && !!this.cfg.native.overlay; },
  setTnat(on) { if (document.body.classList.contains('tnat') === on) return; document.body.classList.toggle('tnat', on); if (G.lv) requestAnimationFrame(() => Cam.fitTitle(G.lv)); },
  // yerel görünüm kaplaması: yuva ekranda ve üstü açıksa konumu köprüye bildirilir; başka ekran ya da pencere örterse gizlenir
  slotTick(dtR) {
    if (!this.slotOn || (this._st = (this._st || 0) - dtR) > 0) return; this._st = 0.25;
    const box = $('#natT'), r = box.getBoundingClientRect();
    // ekran katmanları dokunuşa kapalı olduğundan (pointer-events) isabet testi yetmez: örten katmanlar açıkça sayılır
    const cover = document.querySelector('#ui > .screen.on:not(#title), #lore.on, #kh.on, #wardrobe.on, #abil.on, #find.on, #chest.on, #fader.on, #chapterCard.on, #tutorial.on, #adOffer.on, .admock, #loader:not(.off)');
    const vis = G.state === 'title' && !Ward3D.on && !cover && r.height > 4 && $('#title').classList.contains('on') && +getComputedStyle($('#title')).opacity > 0.6;
    const rect = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), dpr: devicePixelRatio };
    const key = vis ? `${rect.x},${rect.y},${rect.w},${rect.h}` : '';
    if (key === this._sk) return; this._sk = key;
    const N = this.native();
    try {
      if (N) { if (vis) N.showNativeAt('native_title', rect); else N.hideNativeAt && N.hideNativeAt('native_title'); }
      else this.post(vis ? 'place' : 'hide', 'native', 'native_title', 1500, vis ? { rect } : null);
    } catch (e) {}
  },
  // haritada sıradaki kilitli ada videoyla açılabilir mi: yalnızca hemen sonraki ada, aynı dünyada (ejderha adası atlanmaz), günlük sınırla
  canSkip(g) { return !TEST_ALL && g === Save.data.unlocked + 1 && g % 8 !== 0 && g < STORY_LEVELS && this.left('skip') > 0; },
  // bir ödüllü yerin bugün kalan hakkı (genel günlük sınır da sayılır)
  left(kind) { if (!this.cfg.enabled || this.st.rv >= this.cfg.rewarded.dailyMax) return 0; const L = this.cfg.rewarded.limits || {}; return L[kind] == null ? 99 : Math.max(0, L[kind] - (this.st.use[kind] || 0)); },
  spend(kind) { this.st.use[kind] = (this.st.use[kind] || 0) + 1; Save.save(); },
  // native: kutuya sponsorlu kart doldurur (yoksa kutu gizli kalır)
  async fillNative(box, placement) {
    const nc = this.cfg.native; if (!box) return;
    const big = box.id === 'natT';
    box.innerHTML = ''; box.style.display = 'none'; if (big) { box.className = ''; this.setTnat(false); }
    if (!this.cfg.enabled || !nc.enabled || this.noAds() || !nc.screens.includes(this.scr)) return;
    let ad = null; const m = this.mode();
    try { if (m === 'native' && this.native().loadNative) ad = await this.native().loadNative(placement); else if (m === 'post') { const r = await this.post('load', 'native', placement, 4000); ad = r.ok ? r.data : null; } else if (this.cfg.test) ad = { title: 'Test sponsorlu kart', body: 'Gerçek native reklam bağlanınca burada görünür.', cta: 'İncele', icon: '' }; } catch (e) { ad = null; }
    if (!ad) return;
    box.style.display = ''; if (big) this.setTnat(true);
    const ico = ad.icon ? `<img src="${String(ad.icon).replace(/"/g, '')}" alt="">` : '<i></i>';
    box.innerHTML = big ? `<div class="nat"><span class="nk">Sponsorlu</span><div class="nh">${ico}<div><b></b><small></small></div><button class="tap"></button></div><div class="nm">${ad.image ? '' : 'Reklam görseli'}</div></div>`
      : `<div class="nat"><span class="nk">Sponsorlu</span>${ico}<div><b></b><small></small></div><button class="tap"></button></div>`;
    if (big && ad.image) box.querySelector('.nm').style.backgroundImage = `url("${String(ad.image).replace(/["\\]/g, '')}")`;
    box.querySelector('b').textContent = ad.title || ''; box.querySelector('small').textContent = ad.body || ''; box.querySelector('button').textContent = ad.cta || 'Aç';
    box.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); try { ad.click && ad.click(); } catch (er) {} if (m === 'post') this.post('click', 'native', placement, 2000); });
  },
  /* ---------- test modu (SDK yokken) ---------- */
  mock(kind, placement) {
    const to = this.cfg.testOutcome; // 'nofill' | 'error' | 'timeout' | 'closed': başarısız durumları kabuk olmadan dene
    if (kind === 'rewarded' && to && to !== 'ok') return new Promise((r) => setTimeout(() => r({ ok: false, reason: to }), 600));
    return new Promise((res) => {
      const el = document.createElement('div'); el.className = 'admock';
      const rv = kind === 'rewarded'; let n = rv ? 3 : 2;
      el.innerHTML = `<div class="am"><small>${rv ? 'Ödüllü' : 'Geçiş'} reklamı · test</small><b>${AD_PLACEMENTS[(rv ? 'rv_' : 'int_') + placement.replace(/^(rv_|int_)/, '')] || placement}</b><p>Gerçek reklam SDK'sı bağlanınca burada video oynar.</p><i>${n}</i><button class="btn ghost tap">${rv ? 'Vazgeç' : 'Kapat'}</button></div>`;
      $('#ui').appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
      let done = false;
      const fin = (ok) => { if (done) return; done = true; clearInterval(tm); el.classList.remove('on'); setTimeout(() => el.remove(), 400); res(ok); };
      const tm = setInterval(() => { n--; el.querySelector('i').textContent = n > 0 ? n : '✓'; if (n <= 0) fin(rv ? true : undefined); }, 1000);
      el.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); fin(rv ? { ok: false, reason: 'closed' } : undefined); });
    });
  },
  mockBanner(on) {
    let el = $('#admockBanner');
    if (!on || !this.cfg.test) { if (el) el.classList.remove('on'); return; }
    if (!el) { el = document.createElement('div'); el.id = 'admockBanner'; el.textContent = 'Test banner · 320×50'; $('#ui').appendChild(el); }
    el.classList.add('on');
  },
};

/* Videoyla açılan kilitler (Gökyüzü haritası). Hiçbiri kendiliğinden açılmaz: oyuncu kilitli
   adaya ya da Gizli Ada düğmesine dokunur, kısa bir pencere ne kazanacağını söyler, isterse izler. */
const AdOffer = {
  o: null,
  open(o) {
    this.o = o; $('#aoT').innerHTML = o.title; $('#aoP').innerHTML = o.text; $('#aoN').textContent = o.note || '';
    $('#aoYes').lastChild.textContent = o.cta || 'İzle · Aç';
    const alt = $('#aoAlt'); alt.style.display = o.alt ? '' : 'none'; if (o.alt) alt.lastChild.textContent = o.alt.cta;
    $('#adOffer').classList.add('on'); audio.ui(); haptic(8);
  },
  async alt() { const o = this.o, a = o && o.alt; this.o = null; this.close(); if (a && (await AdBridge.rewarded(a.placement))) a.done(); else if (o && o.onClose) o.onClose(); },
  close() { $('#adOffer').classList.remove('on'); },
  // izlemeden kapatılırsa (Şimdi değil / dışına dokun) teklif sahibine haber verilir
  dismiss() { const o = this.o; this.o = null; this.close(); if (o && o.onClose) o.onClose(); },
  async yes() {
    const o = this.o; this.o = null; this.close(); if (!o) return;
    if (await AdBridge.rewarded(o.placement)) o.done(); else if (o.onClose) o.onClose();
  },
  skip(g) {
    const left = this.skipLeft();
    this.open({
      placement: 'rv_skip', title: `Ada ${g + 1} şimdi açılsın mı?`,
      text: `Kısa bir video izle, bu ada hemen uyansın. <em>Ada ${g}</em> seni bekliyor olacak; yıldızlarını sonra toplarsın.`,
      note: `Bugün ${left} hakkın var`,
      done: () => {
        Save.data.unlocked = Math.max(Save.data.unlocked, g); AdBridge.spend('skip'); Save.save();
        SkyMap.refresh(); SkyMap.updatePanel(true); audio.chime && audio.chime(); haptic(18);
        toast(`Ada ${g + 1} <em>uyandı</em>.`, 2.4);
      },
    });
  },
  skipLeft() { return AdBridge.left('skip'); },
  // gizli yıldız: önce pusula (keşif kalır), yanında doğrudan açma seçeneği
  secret(ci) {
    const md = Meta.d(), bonusDone = () => { (md.adOpen || (md.adOpen = {}))[ci] = 1; Save.save(); SkyMap.updatePanel(true); audio.chime && audio.chime(); haptic(18); toast('<em>Gizli Ada</em> açıldı.', 2.4); };
    if (md.compass && md.compass[ci]) return this.bonus(ci);
    const g = ci * 8 + SECRET_I[ci];
    this.open({
      placement: 'rv_compass', title: 'Gizli yıldız', cta: 'Pusula',
      text: `Pusula, yıldızın <em>hangi adada</em> ve nerede saklandığını gösterir. Bulunca Gizli Ada açılır, albüme işlenir.`,
      note: 'ya da Gizli Ada’yı hemen aç',
      done: () => {
        (md.compass || (md.compass = {}))[ci] = 1; Save.save(); SkyMap.refresh(); SkyMap.updatePanel(true); audio.chime && audio.chime(); haptic(18);
        toast(`Pusula açıldı: yıldız <em>Ada ${g + 1}</em> içinde, gölgede parlar`, 3);
      },
      alt: { cta: 'Gizli Ada’yı aç', placement: 'rv_bonus', done: bonusDone },
    });
  },
  bonus(ci) {
    this.open({
      placement: 'rv_bonus', title: 'Gizli Ada',
      text: 'Gölgedeki yıldızı bulamadın mı? Kısa bir video izle, bu dünyanın Gizli Adası açılsın. Yıldız yine yerinde; albüm için bulabilirsin.',
      done: () => {
        const md = Meta.d(); (md.adOpen || (md.adOpen = {}))[ci] = 1; Save.save();
        SkyMap.updatePanel(true); audio.chime && audio.chime(); haptic(18);
        toast('<em>Gizli Ada</em> açıldı.', 2.4);
      },
    });
  },
};
