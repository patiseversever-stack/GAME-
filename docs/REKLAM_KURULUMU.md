# Gündönümü: reklam kurulumu

Bu belge, oyuna gerçek reklam SDK'sını bağlamak içindir. Oyun tarafı hazır. Yalnızca
**köprü** (SDK ile oyun arasındaki küçük katman) ve **reklam birimi kimlikleri**
eklenecek. Vibe coding aracına şunu söylemen yeterli:

> "docs/REKLAM_KURULUMU.md dosyasına göre Gündönümü reklamlarını bağla. AdMob ödüllü,
> geçiş, banner ve native kimliklerim şunlar: ..."

Kod tarafında tek giriş noktası `src/93a_ads.js` içindeki `AdBridge` nesnesidir.
Oyun hiçbir yerde doğrudan SDK çağırmaz.

---

## 1. Reklamlar nerede çıkar?

Oyuncuyu rahatsız etmeyecek, gösterim oranı yüksek yerler seçildi.

| Yer (placement)      | Tür      | Ne zaman                                                     | Ödül                              |
|----------------------|----------|--------------------------------------------------------------|-----------------------------------|
| `rv_revive`          | Ödüllü   | Zifir yanınca, kayıp ekranında "Bir şans daha"               | Kaldığı yerden devam, 2 sn koruma |
| `rv_dust_double`     | Ödüllü   | Ada bitince, "Tozu ikiye katla"                              | O adanın ışık tozu ×2             |
| `rv_chest_double`    | Ödüllü   | Günün sandığı açılınca, "İzle · ikiye katla"                 | Sandık ödülü ×2                   |
| `rv_skip`            | Ödüllü   | Gökyüzü haritasında ▶ rozetli sıradaki kilitli adaya dokununca | O ada hemen açılır               |
| `rv_compass`         | Ödüllü   | Gökyüzü panelinde "▶ İpucu" (gizli yıldız bulunmadıysa)      | Yıldızın adası ve yeri gösterilir |
| `rv_bonus`           | Ödüllü   | Aynı pencerede "Gizli Ada'yı aç" seçeneği                    | O dünyanın Gizli Adası açılır     |
| `rv_rent`            | Ödüllü   | Gardırop'ta kilitli kostüm/renk seçiliyken "▶ 24 saat giy"   | 24 saat giyilir                   |
| `rv_piece`           | Ödüllü   | Gardırop'ta "▶ Gölge parçası n/3" (bazı kostümler)           | 3 parçada kostüm kalıcı açılır    |
| `rv_shield`          | Ödüllü   | Aynı adada 2. kayıptan sonra "▶ Kalkanla dene"               | İlk yanış bir kez affedilir       |
| `rv_gift`            | Ödüllü   | Haritada uçan Hediye Zifir'e dokununca                       | Işık tozu ya da gölge parçası     |
| `rv_reroll`          | Ödüllü   | Hazine'de görev kartında "▶ Değiştir"                        | Görev yenisiyle değişir           |
| `int_level_complete` | Geçiş    | "Sonraki Ada"ya basınca, iki ada arasında                    | –                                 |
| `int_to_map`         | Geçiş    | Ada bitince ya da kaybedince Gökyüzü haritasına dönünce      | –                                 |
| `banner_menu`        | Banner   | Yalnızca Gökyüzü haritası ve Hazine ekranında, altta         | –                                 |
| `native_title`       | Native   | Karşılama ekranının en altında "Sponsorlu" kart (her açılışta) | –                               |
| `native_hz`          | Native   | Hazine ekranında, görevlerin altında "Sponsorlu" kart        | –                                 |

### Videoyla açılan kilitler (Gökyüzü haritası)

- **Sıradaki ada:** Yalnızca oyuncunun bulunduğu adanın hemen sonrasındaki ada. Üstünde küçük
  altın ▶ rozeti görünür. Dokununca kısa bir pencere ne kazanacağını söyler. Oyuncu "Şimdi değil"
  derse hiçbir şey olmaz.
- **Sınırlar:** Dünyanın son adası (Güneş Ejderhası) atlanamaz, dünyalar arası geçilemez. Günde
  en fazla 3 kez (`rewarded.limits.skip`). Atlanan ada açık kalır, yıldızları sonra toplanır.
- **Gizli yıldız:** "▶ İpucu" önce **pusula** sunar: haritada yıldızın adası ✦ ile işaretlenir, o
  adada yıldız ışıkta da hafifçe görünür. Aynı pencerede Gizli Ada'yı doğrudan açma seçeneği de
  vardır. Yıldız yerinde kalır, albüm için yine bulunabilir.

### Gardırop

- **24 saat giy:** Kilitli kostüm ya da renk videoyla 24 saat giyilir. Süre dolunca kendiliğinden
  çıkarılır. Kalıcı açmanın yolu (tiyatro, 24 yıldız) değişmez.
- **Gölge parçaları:** Karagöz Kavuğu ve Ejderha Kanatları dışındaki kostümler 3 parçayla kalıcı
  açılır. Günde 1 parça videoyla alınır; Hediye Zifir'den de parça çıkabilir.
- **Işıltılar:** Yalnızca ödüllü video sayısıyla açılır: Kıvılcım (toplam 5), Ay Tozu (15),
  Ateş Böceği (30). Zifir'in çevresinde parçacık olarak görünür.

### Oyun içi ve harita

- **Gölge kalkanı:** Aynı adada 2. kayıptan sonra, "Bir şans daha" yoksa kayıp ekranında çıkar.
  Ada baştan başlar; ilk yanış bir kez affedilir (HUD'da "Kalkan" rozeti).
- **Hediye Zifir:** Haritada 20–30 dakikada bir paketle uçarak geçer. Dokunup izleyen ışık tozu ya
  da gölge parçası kazanır. Kaçırılırsa birkaç dakika sonra yine gelir. Günde en fazla 3.
- **Görev yenile:** Hazine'de bitmemiş görevi yenisiyle değiştirir. Günde 1.

Ödüllü reklamlar **her zaman oyuncunun isteğiyle** açılır. Değerli bir ödül verdikleri
için izlenme oranları yüksek olur. Oyun sırasında (Zifir yürürken) **hiçbir reklam çıkmaz**.

### Geçiş reklamı kuralları

Bu kurallar `AdBridge` içinde uygulanır, SDK'dan bağımsızdır:

- İlk geçiş reklamı en erken 5 ada bittikten sonra çıkar.
- İki geçiş reklamı arasında en az 3 ada ve en az 150 saniye olur.
- Ödüllü reklam izlendikten sonraki 120 saniye geçiş reklamı yoktur.
- Oturum başına en fazla 6, günde en fazla 20 geçiş reklamı gösterilir.
- Reklam sırasında oyunun sesi kısılır, reklam bitince geri açılır.
- `Save.data.noAds = true` olursa (ileride "Reklamları kaldır" satın alımı) geçiş
  reklamları ve banner kapanır. Ödüllü reklamlar oyuncunun isteğiyle açıldığı için kalır.

---

## 2. Ayarlar: `window.GUNDONUMU_AD_CONFIG`

Oyunun `<script type="module">` etiketinden **önce** tanımlanır. Verilmeyen her alan
`src/93a_ads.js` içindeki `AD_DEFAULTS` değerini kullanır.

```html
<script>
window.GUNDONUMU_AD_CONFIG = {
  enabled: true,
  test: false,              // gerçek SDK bağlanınca false
  provider: 'admob',
  ids: {
    android: { appId: 'ca-app-pub-XXX~YYY', rewarded: 'ca-app-pub-XXX/111', interstitial: 'ca-app-pub-XXX/222', banner: 'ca-app-pub-XXX/333', native: 'ca-app-pub-XXX/444' },
    ios:     { appId: '', rewarded: '', interstitial: '', banner: '', native: '' }
  },
  interstitial: { firstAfterLevels: 5, minLevelsBetween: 3, minIntervalSec: 150, afterRewardedSec: 120, sessionMax: 6, dailyMax: 20 },
  rewarded: { cooldownSec: 2, dailyMax: 25, limits: { skip: 3, rent: 2, piece: 1, shield: 3, gift: 3, reroll: 1 } },
  banner: { enabled: true, screens: ['map', 'hz'], heightPx: 56 },
  native: { enabled: true, screens: ['title', 'hz'], titleHeightPx: 150, overlay: false }
};
</script>
```

Bu etiketi eklemenin iki kolay yolu var:

- **Derlenmiş HTML'e:** `Gundonumu.html` içinde ilk `<script type="module">` satırının hemen üstüne.
- **Kalıcı olarak:** `src/00_head.html` sonundaki `</style>` … `<body>` arasına. Sonra
  `python3 scripts/build_game.py` ile yeniden derle.

---

## 3. Köprü: SDK'yı oyuna bağlamak

`AdBridge` sırayla şunlara bakar. Hangisi varsa onu kullanır:

### A) `window.GundonumuAds` nesnesi (Capacitor / Cordova / kendi WebView'in)

Uygulama kabuğu bu nesneyi oyundan önce (ya da oyun açılırken) tanımlar:

```js
window.GundonumuAds = {
  init(cfg, info) {},                       // cfg = birleşik ayarlar, info.placements = yer listesi
  isReady(kind) { return true; },           // 'rewarded' | 'interstitial' | 'banner' | 'native'
  load(kind) {},                            // önceden yükle (oyun her gösterimden sonra çağırır)
  async showRewarded(placement) { return true; },     // ödül kazanıldıysa true
  async showInterstitial(placement) {},               // reklam kapanınca çöz
  showBanner(placement) {}, hideBanner() {},
  async loadNative(placement) { return { title, body, cta, icon, image, click() {} } }, // ya da null
  // isteğe bağlı: yerel native görünümü karşılama yuvasının üstüne çiz (önerilen; gösterim böyle sayılır)
  showNativeAt(placement, rect) {},   // rect = { x, y, w, h, dpr } (CSS piksel, sol üstten)
  hideNativeAt(placement) {}
};
```

#### Örnek: Capacitor + `@capacitor-community/admob`

```js
import { AdMob, RewardAdPluginEvents, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
const cfg = () => window.GUNDONUMU_AD_CONFIG || {};
const id = (k) => { const p = /android/i.test(navigator.userAgent) ? 'android' : 'ios'; return cfg().ids?.[p]?.[k]; };
let rvReady = false, intReady = false;
window.GundonumuAds = {
  async init() {
    await AdMob.initialize({ initializeForTesting: !!cfg().test });
    await AdMob.requestConsentInfo?.(); // GDPR/UMP onayı (AB oyuncuları için gerekli)
    this.load('rewarded'); this.load('interstitial');
  },
  isReady(k) { return k === 'rewarded' ? rvReady : k === 'interstitial' ? intReady : true; },
  async load(k) {
    try {
      if (k === 'rewarded') { await AdMob.prepareRewardVideoAd({ adId: id('rewarded') }); rvReady = true; }
      if (k === 'interstitial') { await AdMob.prepareInterstitial({ adId: id('interstitial') }); intReady = true; }
    } catch (e) {}
  },
  async showRewarded() {
    rvReady = false;
    try { const r = await AdMob.showRewardVideoAd(); return !!(r && r.amount !== undefined); }
    catch (e) { return false; } finally { this.load('rewarded'); }
  },
  async showInterstitial() { intReady = false; try { await AdMob.showInterstitial(); } catch (e) {} this.load('interstitial'); },
  showBanner() { AdMob.showBanner({ adId: id('banner'), adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER }); },
  hideBanner() { AdMob.hideBanner().catch(() => {}); },
  async loadNative() { return null; } // Capacitor AdMob native desteklemez; native kart gizli kalır
};
```

### B) React Native / Flutter WebView: `postMessage` köprüsü

`window.GundonumuAds` yoksa ve oyun bir WebView içindeyse, oyun şu mesajı gönderir:

```json
{ "type": "gd-ad", "id": 12, "action": "show", "kind": "rewarded", "placement": "rv_revive" }
```

- `action` değerleri: `load`, `show`, `hide`, `click`.
- `kind` değerleri: `rewarded`, `interstitial`, `banner`, `native`.

Kabuk reklamı gösterir ve şu yanıtı geri yollar:

```js
webview.postMessage(JSON.stringify({ type: 'gd-ad-result', id: 12, ok: true }))
```

Yanıtı oyun `window` üzerindeki `message` olayıyla alır. Mesaj **nesne olarak**
gelmelidir. React Native'de `injectJavaScript("window.postMessage({...}, '*')")` ile yollanabilir.

- **Ödüllü:** `ok: true` gelirse ödül verilir.
- **Native:** `ok: true` ile birlikte `data: { title, body, cta, icon }` gönderilir.
- **Zaman aşımı:** yanıt 45 sn içinde gelmezse oyun "başarısız" sayar ve devam eder.

### C) Hiçbiri yoksa: test modu

Tarayıcıda ya da köprü bağlanmadan önce oyun kendi **test reklamlarını** gösterir:

- Ödüllü ve geçiş reklamları için "Test reklamı" ekranı ve geri sayım çıkar.
- Banner yerine çizgili bir "Test banner" şeridi görünür.

Böylece akışın tamamı (ödül, ikiye katlama, bir şans daha) SDK olmadan denenebilir.

---

## 4. Native kartın gösterim sayılması

### Karşılama ekranı yuvası (`native_title`)

- Ekranın en altında **150 px** yüksekliğinde bir yuva ayrılır (`native.titleHeightPx` ile
  değişir). Hikâye, Nasıl?, Gardırop, Hazine ve Ayarlar üst çubuktadır. Ana düğmeler yuvanın
  hemen üstünde sıkı bir blok olur. Ada kamerası başlık ile düğmeler arasında kalan boşluğa
  sığdırılır, düğmelerin arkasında kalmaz.
- 720 px'ten kısa dikey ekranlarda "Güneşi sürükle" ipucu gizlenir. 600 px'ten kısa ekranlarda
  slogan da gizlenir.
- **Yatay telefonda** (yükseklik 520 px'ten az) yuva gösterilmez, çünkü 150 px adayı ezer. Yatay
  tablette sağ altta durur.

### Gerçek native reklamı yuvaya koymak (önerilen)

AdMob dahil ağlar native reklamın yerel görünümle (NativeAdView) çizilmesini ister. HTML'e
yalnızca yazı ve resim koymak gösterim saydırmayabilir. Bu yüzden köprü iki yoldan birini kullanır:

1. **Kaplama (önerilen):** `window.GundonumuAds.showNativeAt` tanımlıysa oyun HTML kart çizmez,
   yalnızca yeri boş bırakır. Yuva görünür olduğunda `showNativeAt('native_title', rect)` çağrılır.
   Kabuk yerel reklam görünümünü bu dikdörtgenin üstüne yerleştirir.
   - Ayarlar, Gardırop, Hazine, hikâye kitabı, ödüllü teklif penceresi açılınca ya da başka
     ekrana geçilince `hideNativeAt('native_title')` çağrılır. Böylece reklam hiçbir pencerenin
     üstünde kalmaz.
   - Konum değişirse (ekran dönmesi) `showNativeAt` yeni dikdörtgenle tekrar çağrılır.
   - postMessage köprüsünde (`native.overlay: true`) aynı bilgi `action: 'place'` (mesajda
     `rect`) ve `action: 'hide'` olarak gelir.
2. **HTML kart:** `loadNative` başlık, metin, düğme yazısı, simge ve görsel (`image`) döndürürse
   oyun kartı kendisi çizer. Yalnızca bunu destekleyen ağlar için uygundur.

`@capacitor-community/admob` native desteklemez. Onunla `loadNative` `null` döner ve yuva
gizlenir (yer kaplamaz). Native gelir için native destekleyen bir eklenti seç.

### Hazine kartı (`native_hz`)

Görevlerin altındadır. Küçük ekranlarda ancak aşağı kaydırınca görünür. Bu yüzden gösterimin
ana kaynağı karşılama yuvasıdır.

---

## 5. Banner payı

Banner açıkken `body` öğesine `adbanner` sınıfı eklenir ve `--adb` CSS değişkeni
banner yüksekliğini alır (varsayılan 56 px). Haritanın alt düğmeleri ve Hazine'nin
alt boşluğu bu kadar yukarı kayar, banner hiçbir düğmenin üstüne binmez. Farklı bir
banner yüksekliği kullanırsan `banner.heightPx` değerini değiştir.

---

## 6. Kontrol listesi (mağazaya çıkmadan önce)

- [ ] `test: false` yapıldı ve gerçek reklam birimi kimlikleri girildi.
- [ ] AB'deki oyuncular için GDPR/UMP onay penceresi kabukta gösteriliyor.
- [ ] Google Play'de "Uygulama reklam içeriyor" işaretlendi, içerik derecelendirmesi güncellendi.
- [ ] `app-ads.txt` dosyası geliştirici sitesinde yayında.
- [ ] Çocuklara yönelik değilse "Families" politikası dışında kalındı. Yönelikse sertifikalı reklam ağı seçildi.
- [ ] Native yerel görünümü karşılama yuvasına oturuyor; Ayarlar ve Gardırop açılınca gizleniyor.
- [ ] Test cihazında her reklam yeri denendi: bir şans daha, kalkan, toz ×2, sandık ×2, ada aç, pusula, Gizli Ada, 24 saat giy, gölge parçası, Hediye Zifir, görev yenile, iki ada arası, haritaya dönüş, banner, karşılama ve Hazine native kartı.
