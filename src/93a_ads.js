
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
  },
  rewarded: { cooldownSec: 2, dailyMax: 25, skipDaily: 3 }, // skipDaily: haritada videoyla açılabilen sıradaki ada sayısı (günlük)
  banner: { enabled: true, screens: ['map', 'hz'], heightPx: 56 }, // yalnızca menü ekranlarında, oyunda asla
  native: { enabled: true, screens: ['title', 'hz'] }, // title: açılışta görünen karşılama ekranı (her açılışta bir gösterim)
  noAdsKey: 'noAds', // "Reklamları kaldır" satın alınırsa: Save.data.noAds = true → geçiş + banner kapanır, ödüllü kalır
};
// oyun içindeki reklam yerleri (köprü bu adlarla çağrılır; raporlama için)
const AD_PLACEMENTS = {
  rv_revive: 'Bir şans daha (ölünce kaldığın yerden devam)',
  rv_dust_double: 'Ada sonu ışık tozunu ikiye katla',
  rv_chest_double: 'Günün sandığını ikiye katla',
  rv_skip: 'Haritada sıradaki kilitli adayı aç',
  rv_bonus: 'Gizli Adayı yıldızı bulmadan aç',
  int_level_complete: 'Sonraki adaya geçerken (doğal mola)',
  int_to_map: 'Gökyüzü haritasına dönerken',
  banner_menu: 'Gökyüzü ve Hazine ekranlarının altı',
  native_title: 'Karşılama ekranının altında sponsorlu kart',
  native_hz: 'Hazine ekranında sponsorlu kart',
};
function adMerge(a, b) { const o = Array.isArray(a) ? a.slice() : Object.assign({}, a); if (!b) return o; for (const k in b) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? adMerge(a[k], b[k]) : b[k]; return o; }
const AdBridge = {
  cfg: null, st: null, sess: { int: 0, lastInt: 0, lastRv: 0, levels: 0 }, busy: false, seq: 0, wait: new Map(), bannerOn: false, scr: '',
  init() {
    this.cfg = adMerge(AD_DEFAULTS, window.GUNDONUMU_AD_CONFIG || {});
    const today = dateNum(), d = Save.data.ads || (Save.data.ads = {});
    if (d.day !== today) { d.day = today; d.int = 0; d.rv = 0; d.skip = 0; }
    d.levels = d.levels || 0; this.st = d;
    this.sess.lastInt = performance.now(); // açılışta hemen geçiş reklamı yok
    window.addEventListener('message', (e) => { const m = e.data; if (!m || m.type !== 'gd-ad-result' || !this.wait.has(m.id)) return; const r = this.wait.get(m.id); this.wait.delete(m.id); r(m); });
    const N = this.native(); if (N && N.init) try { N.init(this.cfg, { placements: AD_PLACEMENTS }); } catch (e) { console.warn('reklam köprüsü init', e); }
    this.preload('rewarded'); this.preload('interstitial');
  },
  native() { return window.GundonumuAds || null; },
  rn() { return window.ReactNativeWebView || (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.gdAds) || null; },
  noAds() { return !!Save.data[this.cfg.noAdsKey]; },
  // WebView köprüsüne mesaj: yanıt bekler (zaman aşımı → başarısız)
  post(action, kind, placement, timeout = 45000) {
    const id = ++this.seq, msg = { type: 'gd-ad', id, action, kind, placement };
    const rn = this.rn();
    return new Promise((res) => {
      this.wait.set(id, res); setTimeout(() => { if (this.wait.has(id)) { this.wait.delete(id); res({ ok: false, timeout: true }); } }, timeout);
      try { if (rn && rn.postMessage) rn.postMessage(JSON.stringify(msg)); else window.parent.postMessage(msg, '*'); } catch (e) { this.wait.delete(id); res({ ok: false }); }
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
    this.busy = true; audio.duck && audio.duck(true);
    let ok = false;
    try {
      const m = this.mode();
      if (m === 'native') ok = !!(await this.native().showRewarded(placement));
      else if (m === 'post') ok = !!(await this.post('show', 'rewarded', placement)).ok;
      else ok = await this.mock('rewarded', placement);
    } catch (e) { console.warn('ödüllü reklam', e); ok = false; }
    this.busy = false; audio.duck && audio.duck(false);
    this.sess.lastRv = performance.now(); if (ok) { this.st.rv++; Save.save(); }
    this.preload('rewarded');
    if (!ok) toast('Reklam şu an hazır değil. Biraz sonra tekrar dene.', 2.4);
    return ok;
  },
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
    try { const m = this.mode(); if (m === 'native') await this.native().showInterstitial(placement); else if (m === 'post') await this.post('show', 'interstitial', placement); else await this.mock('interstitial', placement); } catch (e) { console.warn('geçiş reklamı', e); }
    this.busy = false; audio.duck && audio.duck(false);
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
    document.body.classList.toggle('adbanner', on); document.documentElement.style.setProperty('--adb', on ? b.heightPx + 'px' : '0px');
    const N = this.native(), m = this.mode();
    try { if (m === 'native') { if (on) N.showBanner && N.showBanner('banner_menu'); else N.hideBanner && N.hideBanner(); } else if (m === 'post') this.post(on ? 'show' : 'hide', 'banner', 'banner_menu', 2000); else this.mockBanner(on); } catch (e) {}
  },
  // karşılama ekranı kartı: ekran her açıldığında yenilenir (en sık dakikada bir); kart dolu kalırsa tekrar yüklenmez
  titleNative() {
    const now = performance.now(), box = $('#natT');
    if (!box || (box.childElementCount && now - (this.natT || 0) < 60000)) return;
    this.natT = now; this.fillNative(box, 'native_title');
  },
  // haritada sıradaki kilitli ada videoyla açılabilir mi: yalnızca hemen sonraki ada, aynı dünyada (ejderha adası atlanmaz), günlük sınırla
  canSkip(g) {
    return this.cfg.enabled && !TEST_ALL && g === Save.data.unlocked + 1 && g % 8 !== 0 && g < STORY_LEVELS && (this.st.skip || 0) < this.cfg.rewarded.skipDaily && this.st.rv < this.cfg.rewarded.dailyMax;
  },
  // native: kutuya sponsorlu kart doldurur (yoksa kutu gizli kalır)
  async fillNative(box, placement) {
    const nc = this.cfg.native; if (!box) return;
    box.innerHTML = ''; box.style.display = 'none'; if (box.id === 'natT') document.body.classList.remove('tnat');
    if (!this.cfg.enabled || !nc.enabled || this.noAds() || !nc.screens.includes(this.scr)) return;
    let ad = null; const m = this.mode();
    try { if (m === 'native' && this.native().loadNative) ad = await this.native().loadNative(placement); else if (m === 'post') { const r = await this.post('load', 'native', placement, 4000); ad = r.ok ? r.data : null; } else if (this.cfg.test) ad = { title: 'Test sponsorlu kart', body: 'Gerçek native reklam bağlanınca burada görünür.', cta: 'İncele', icon: '' }; } catch (e) { ad = null; }
    if (!ad) return;
    box.style.display = ''; if (box.id === 'natT') document.body.classList.add('tnat');
    box.innerHTML = `<div class="nat"><span class="nk">Sponsorlu</span>${ad.icon ? `<img src="${String(ad.icon).replace(/"/g, '')}" alt="">` : '<i></i>'}<div><b></b><small></small></div><button class="tap"></button></div>`;
    box.querySelector('b').textContent = ad.title || ''; box.querySelector('small').textContent = ad.body || ''; box.querySelector('button').textContent = ad.cta || 'Aç';
    box.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); try { ad.click && ad.click(); } catch (er) {} if (m === 'post') this.post('click', 'native', placement, 2000); });
  },
  /* ---------- test modu (SDK yokken) ---------- */
  mock(kind, placement) {
    return new Promise((res) => {
      const el = document.createElement('div'); el.className = 'admock';
      const rv = kind === 'rewarded'; let n = rv ? 3 : 2;
      el.innerHTML = `<div class="am"><small>${rv ? 'Ödüllü' : 'Geçiş'} reklamı · test</small><b>${AD_PLACEMENTS[(rv ? 'rv_' : 'int_') + placement.replace(/^(rv_|int_)/, '')] || placement}</b><p>Gerçek reklam SDK'sı bağlanınca burada video oynar.</p><i>${n}</i><button class="btn ghost tap">${rv ? 'Vazgeç' : 'Kapat'}</button></div>`;
      $('#ui').appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
      let done = false;
      const fin = (ok) => { if (done) return; done = true; clearInterval(tm); el.classList.remove('on'); setTimeout(() => el.remove(), 400); res(ok); };
      const tm = setInterval(() => { n--; el.querySelector('i').textContent = n > 0 ? n : '✓'; if (n <= 0) fin(rv ? true : undefined); }, 1000);
      el.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); fin(rv ? false : undefined); });
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
    $('#adOffer').classList.add('on'); audio.ui(); haptic(8);
  },
  close() { $('#adOffer').classList.remove('on'); },
  async yes() {
    const o = this.o; this.o = null; this.close(); if (!o) return;
    if (await AdBridge.rewarded(o.placement)) o.done();
  },
  skip(g) {
    const left = this.skipLeft();
    this.open({
      placement: 'rv_skip', title: `Ada ${g + 1} şimdi açılsın mı?`,
      text: `Kısa bir video izle, bu ada hemen uyansın. <em>Ada ${g}</em> seni bekliyor olacak; yıldızlarını sonra toplarsın.`,
      note: `Bugün ${left} hakkın var`,
      done: () => {
        Save.data.unlocked = Math.max(Save.data.unlocked, g); AdBridge.st.skip = (AdBridge.st.skip || 0) + 1; Save.save();
        SkyMap.refresh(); SkyMap.updatePanel(true); audio.chime && audio.chime(); haptic(18);
        toast(`Ada ${g + 1} <em>uyandı</em>.`, 2.4);
      },
    });
  },
  skipLeft() { return Math.max(0, AdBridge.cfg.rewarded.skipDaily - (AdBridge.st.skip || 0)); },
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
