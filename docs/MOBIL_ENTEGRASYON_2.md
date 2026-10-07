# DEVAM — Gündönümü entegrasyonu, 2. kısım (4–10. bölümler)

Önceki belge 3. bölümde kesildi. Bu, kalan kısım. Reklam kurallarını ve testleri oyunun kodundan
çıkardın; aşağıdakilerle karşılaştır ve **farklı olan her yeri bu belgeye göre düzelt**. Sonra
9. bölümdeki test listesini uygula ve sonuçları yaz.

## 0. Senin kurulumuna göre notlar (Capacitor, https://localhost, ortak origin)

- **Ortak origin uygun.** Oyunun kayıtları yalnızca `gundonumu.v1` (ve test sürümünde
  `gundonumu.deneme.v1`) anahtarlarında; başka oyunlarla çakışmaz. Şartlar:
  - Hiçbir oyun ya da arena kodu `localStorage.clear()` çağırmamalı; yalnızca kendi anahtarlarını silmeli.
  - Uygulama güncellemesinde origin (`https://localhost`, `androidScheme`/`iosScheme`) **değişmemeli**,
    yoksa tüm oyunların ilerlemesi sıfırlanır.
- **Oyun sayfa olarak açılıyorsa** (WebView `https://localhost/.../gundonumu.html` adresine gidiyorsa):
  oyun Capacitor'ı kendisi tanır, "Arena" düğmesi görünür. `window.GundonumuHost = { exit, haptic, onEvent }`
  tanımlamazsan "Arena" düğmesi `history.back()` ile arena sayfasına döner.
- **Oyun arenanın içinde iframe ile açılıyorsa:** oyun bunu da kendisi tanır. Tüm mesajlarını
  (`gd-ad`, `gd-exit`, `gd-back`, `gd-event`) `window.parent.postMessage` ile arena sayfasına yollar.
  Arena yanıtları `iframe.contentWindow.gdAdResult({...})` ile verir (aynı origin olduğu için doğrudan
  çağrılabilir); `gdBack()`, `gdPause()` vb. de `iframe.contentWindow` üzerinden çağrılır.
  Native reklam dikdörtgeni (`rect`) iframe'in sol üst köşesine göredir; iframe'in ekrandaki konumunu ekle.
- **Durum ve gezinme çubuğu:** Capacitor'da oyun kendi tarayıcı tam ekranını açmaz. Oyun ekranına
  girerken `@capacitor/status-bar` ile durum çubuğunu gizle, Android'de immersive moda geç (gezinme
  çubuğu da gizlensin); arenaya dönünce eski hâline getir.

## 4. Yaşam döngüsü, geri tuşu, arenaya dönüş

| Durum | Yapılacak |
|---|---|
| Uygulama arka plana geçti / ekran kilitlendi | `gdPause()` çağır (oyun duraklar, ses susar) |
| Uygulama öne geldi | `gdResume()` çağır (ses geri gelir; oyuncu duraklatma menüsünden devam eder) |
| **Android geri tuşu / geri hareketi** | `gdBack()` çağır. **true** dönerse oyun işledi (pencere kapattı, duraklattı, önceki ekrana döndü), hiçbir şey yapma. **false** dönerse oyuncu karşılama ekranında: oyun ekranını kapat, arenaya dön |
| Oyundaki "Arena" (‹) düğmesi | Oyun `gd-exit` mesajı yollar (ya da `GundonumuHost.exit()` çağırır): oyun ekranını kapat, arenaya dön |
| Oyun ekranı kapanırken | Açık banner ve native reklam görünümlerini kaldır, durum/gezinme çubuklarını geri getir |

- `gdBack()` sonucunu okuyamayan köprülerde (React Native `injectJavaScript`) oyun ayrıca
  `{ type: 'gd-back', handled: true|false }` mesajını yollar; `handled: false` ise arenaya dön.
- **Titreşim:** iOS WebView'de `navigator.vibrate` yoktur. `GundonumuHost.haptic(ms)` sağlarsan
  (aşağıda) oyun titreşimi sana devreder; hafif bir haptic ver.
- Oyun olayları (isteğe bağlı analitik): `ready` (oyun açıldı, kendi yükleme göstergeni kapat),
  `level_complete`, `level_fail`.

## 5. Köprü: oyun ile uygulama nasıl konuşur?

İki yoldan **birini** seç. Platformuna en uygun olanı kullan.

### Yol A — Mesaj protokolü (React Native, Flutter, Android, iOS hepsinde çalışır; önerilen)

**Oyun → uygulama:** Oyun her isteği tek satır JSON olarak şu kanallardan ilk bulduğuna yollar:
- React Native: `window.ReactNativeWebView.postMessage(str)` (otomatik vardır)
- iOS WKWebView: `window.webkit.messageHandlers.gundonumu.postMessage(str)` → `userContentController.add(self, name: "gundonumu")`
- Android yerli: `webView.addJavascriptInterface(obj, "GundonumuNative")` → `@JavascriptInterface fun postMessage(json: String)`
- Flutter webview_flutter: `JavaScriptChannel(name: 'GundonumuNative')` (`window.GundonumuNative.postMessage(str)`)
- flutter_inappwebview: `addJavaScriptHandler(handlerName: 'gundonumu')`

**Uygulama → oyun (yanıt):** Her `gd-ad` isteğinin `id`'siyle şu JS'i çalıştır
(`evaluateJavascript` / `injectJavaScript` / `runJavaScript`):
```js
gdAdResult({ id: 12, ok: true });                       // ödül kazanıldı / reklam gösterildi
gdAdResult({ id: 12, ok: false, reason: 'closed' });    // başarısız (nedenler aşağıda)
gdAdResult({ id: 7,  ok: true, height: 50 });           // banner gösterildi, gerçek yükseklik (CSS px)
```
Mesaj yolunu kullanıyorsan oyun açılmadan önce şunu da ekle (native yerleşimi için):
```js
window.GUNDONUMU_AD_CONFIG = { test: false, native: { overlay: true } };
```

**Oyunun gönderdiği mesajlar ve senin yapacağın:**

| Mesaj | Yapacağın | Yanıt |
|---|---|---|
| `{type:'gd-ad', action:'load', kind:'rewarded'\|'interstitial'}` | O türü önceden yükle | gerekmez |
| `{type:'gd-ad', action:'show', kind:'rewarded', placement}` | Ödüllü videoyu göster | **Yalnızca ödül kazanıldı callback'i gelince** `{id, ok:true}`. Aksi hâlde `{id, ok:false, reason}`. **150 sn içinde mutlaka yanıtla** |
| `{type:'gd-ad', action:'show', kind:'interstitial', placement}` | Geçiş reklamını göster | Kapandığında `{id, ok:true}`; gösterilemediyse `{id, ok:false, reason}`. 90 sn içinde |
| `{type:'gd-ad', action:'show'\|'hide', kind:'banner', placement:'banner_menu'}` | Banner'ı ekranın en altında göster/gizle | show için `{id, ok:true, height:<CSS px>}`; yüklenmediyse `{id, ok:false, height:0}` |
| `{type:'gd-ad', action:'place', kind:'native', placement:'native_title', rect:{x,y,w,h,dpr}}` | Native reklam görünümünü (NativeAdView) bu dikdörtgenin **üstüne** yerleştir | gerekmez |
| `{type:'gd-ad', action:'hide', kind:'native', placement:'native_title'}` | Native görünümü gizle (oyunda bir pencere açıldı ya da ekran değişti) | gerekmez |
| `{type:'gd-ad', action:'load', kind:'native', placement:'native_hz'}` | Hazine kartı için native verisi | `{id, ok:true, data:{title, body, cta, icon, image}}` ya da `{id, ok:false}` (aşağıya bak) |
| `{type:'gd-ad-log', kind, placement, result}` | Kayıt/analitik (her reklam sonucunun özeti) | gerekmez |
| `{type:'gd-exit'}` | Oyun ekranını kapat, arenaya dön | — |
| `{type:'gd-back', handled}` | `handled:false` ise arenaya dön | — |
| `{type:'gd-event', name, data}` | İsteğe bağlı analitik | — |

### Yol B — JS nesnesi (Capacitor ya da kendi WebView köprün varsa)

Sayfa yüklenmeden önce `window.GundonumuAds` ve `window.GundonumuHost` nesnelerini tanımla.
Metotlar Promise döndürür; içeride yerli tarafa git, sonucu geri ver:
```js
window.GundonumuHost = {
  exit() {},                        // arenaya dön
  haptic(ms) {},                    // titreşim
  onEvent(name, data) {}            // 'ready', 'level_complete', 'level_fail'
};
window.GundonumuAds = {
  init(cfg, info) {},
  isReady(kind) { return true; },   // 'rewarded' | 'interstitial'
  load(kind) {},
  async showRewarded(placement) { return { ok: true }; },      // ya da { ok:false, reason }
  async showInterstitial(placement) {},                        // kapanınca çöz
  async showBanner(placement) { return 50; },                  // gerçek yükseklik (CSS px), yoksa 0
  hideBanner() {},
  showNativeAt(placement, rect) {}, hideNativeAt(placement) {},// native görünümü yuvaya yerleştir/gizle
  async loadNative(placement) { return null; },                // Hazine kartı (aşağıya bak)
  onResult(kind, placement, result) {}                         // her reklam sonucunun özeti
};
```

## 6. Reklam yerleri (oyunda hepsi hazır, tek tek bağla)

**Ödüllü (rewarded):** Hepsini tek bir ödüllü reklam birimiyle gösterebilirsin. `placement`
adını analitikte ayırmak için kullan. Ödül **yalnızca** "ödül kazanıldı" olayında verilir.

| placement | Oyunda nerede | Oyuncu ne kazanır |
|---|---|---|
| `rv_revive` | Kayıp ekranı "▶ Bir şans daha" | Kaldığı yerden devam |
| `rv_shield` | Aynı adada 2. kayıptan sonra kayıp ekranı "▶ Kalkanla dene" | Ada baştan, ilk yanış affedilir |
| `rv_dust_double` | Ada bitince "Tozu ikiye katla" | Işık tozu ×2 |
| `rv_chest_double` | Günün sandığı açılınca "İzle · ikiye katla" | Sandık ×2 |
| `rv_skip` | Haritada ▶ rozetli sıradaki kilitli ada | Ada açılır (günde 3) |
| `rv_compass` | Harita paneli "▶ İpucu" → Pusula | Gizli yıldızın yeri gösterilir |
| `rv_bonus` | Aynı pencerede "Gizli Ada'yı aç" | Gizli Ada açılır |
| `rv_rent` | Gardırop "▶ 24 saat giy" | Kostüm/renk 24 saat |
| `rv_piece` | Gardırop "▶ Gölge parçası" | Kostüm parçası (günde 1) |
| `rv_gift` | Haritada uçan Hediye Zifir | Işık tozu ya da parça (günde 3) |
| `rv_reroll` | Hazine görev kartı "▶ Değiştir" | Yeni görev (günde 1) |

**Geçiş (interstitial):** `int_level_complete` (iki ada arası), `int_to_map` (haritaya dönüş).
Sıklığı **oyun yönetir**: ilk reklam 5. adadan sonra, iki reklam arası en az 3 ada ve 150 sn,
ödüllü izlendiyse 2 dk yok, oturumda 6, günde 20. **Oyun içine kendi ek geçiş reklamını koyma.**
Arena tarafında, oyuna giriş ya da çıkışta geçiş reklamı göstereceksen oyun ekranı kapandıktan
sonra göster.

**Banner:** `banner_menu`. Yalnızca oyunun Gökyüzü haritası ve Hazine ekranında ister, oyun
oynanırken asla. Ekranın en altına, güvenli alanın üstüne yerleştir. Gerçek yüksekliği bildir
(uyarlanabilir banner 50–90 px olabilir). Oyun tüm düğmelerini bu kadar yukarı kaydırır.
Banner gelmezse `height:0` bildir; yer kapanır. Banner'ı oyunun "hide" mesajında hemen gizle.

**Native (karşılama ekranı):** `native_title`. Karşılama ekranının en altında oyun **150 px**
yüksekliğinde bir yuva ayırır. Senin native şablonun farklı yükseklikteyse oyunu açmadan önce
bildir:
```js
window.GUNDONUMU_AD_CONFIG = { native: { overlay: true, titleHeightPx: 150 } }; // kendi yüksekliğin
```
- Oyun yuvanın konumunu `rect` olarak verir: **CSS piksel, WebView'in sol üst köşesine göre**.
  Ekran koordinatına çevir: `ekranX = webViewX + rect.x * yoğunluk`, `ekranY = webViewY + rect.y * yoğunluk`,
  genişlik/yükseklik × yoğunluk (Android `displayMetrics.density`, iOS pt olduğu için çarpma yok).
- Yuva yalnızca karşılama ekranı açık ve üstünde pencere yokken görünür. Ayarlar, Gardırop,
  Hazine, hikâye kitabı, reklam teklif penceresi açılınca ya da başka ekrana geçilince oyun
  **hide** gönderir. Native görünüm hiçbir zaman oyunun bir penceresinin üstünde kalmamalı.
- Native reklam gelmediyse (no fill/hata) `gdNativeFilled('native_title', false)` çağır: oyun yuvayı
  kapatır, düzen eski hâline döner. Reklam sonradan gelirse `gdNativeFilled('native_title', true)`.
- Yatay telefonda (yükseklik < 520 px) yuva gösterilmez; o durumda place gelmez.

**Native (Hazine kartı):** `native_hz`. Ağın NativeAdView zorunluysa (AdMob öyle) bu kart için
`{ok:false}` dön; kart gizlenir, sorun olmaz. Gösterim karşılama yuvasından gelir.

## 7. Başarısızlık durumları (hepsini uygula)

Oyun her sonucu oyuncuya Türkçe açıklar; senin işin doğru `reason` vermek ve **her isteği yanıtlamak**.

| Durum | Senin yanıtın | Oyunun davranışı |
|---|---|---|
| Video sonuna kadar izlendi, ödül callback'i geldi | `ok:true` | Ödül verilir |
| Oyuncu reklamı **bitmeden kapattı** | `ok:false, reason:'closed'` | Ödül yok: "Ödül için videoyu sonuna kadar izlemelisin." |
| Reklam ağı reklam döndürmedi (no fill) / henüz yüklenmedi | `ok:false, reason:'nofill'` | "Şu an uygun reklam yok…" |
| Yükleme/gösterim hatası | `ok:false, reason:'error'` | "Reklam açılamadı…" |
| İnternet yok | `ok:false, reason:'offline'` | "İnternet bağlantısı yok…" (oyun da `navigator.onLine` kontrol eder) |
| Zaten bir reklam gösteriliyor (çift dokunma) | `ok:false, reason:'error'` (ikinciyi gösterme) | Oyun da aynı anda iki reklam istemez |
| Hiç yanıt gelmezse | — | Oyun ödüllüde 150 sn, geçişte 90 sn sonra kendini kurtarır; asla kilitli kalmaz. **Yine de her zaman yanıtla** |

Ek kurallar:
- Ödülü **asla** "reklam kapandı" olayında verme; yalnızca "ödül kazanıldı" (`onUserEarnedReward`)
  geldiyse ve reklam kapandıktan sonra `ok:true` yolla.
- Her gösterimden sonra aynı türü yeniden **önceden yükle**. Yükleme başarısızsa artan
  aralıklarla tekrar dene (30 sn, 60 sn, 120 sn…).
- Reklam sırasında uygulama arka plana gidip dönerse reklam SDK'sı akışı sürdürür. Sonucu reklam
  kapandığında ver.
- Reklam tam ekrandayken oyun kendi sesini kısar. Ek bir şey gerekmez.
- GDPR/UMP onayı reklam yüklenmeden önce alınmalı (AB). iOS'ta gerekiyorsa ATT izni.
- Geliştirmede **test reklam birimleri** kullan, yayında gerçeklerini.
- "Reklamları kaldır" satın alınırsa `gdSetNoAds(true)`: geçiş, banner ve native kapanır;
  ödüllüler oyuncunun isteğiyle olduğu için kalır.

## 8. Kabuk tarafından çağrılabilecek oyun işlevleri (özet)

```js
gdBack()                        // geri tuşu → true: oyun işledi, false: arenaya dön
gdPause(); gdResume();          // arka plan / ön plan
gdSetSafe({ top, bottom, left, right })       // güvenli alan, CSS px
gdSetBannerHeight(px)           // banner yüksekliği sonradan değişirse (0 = yok)
gdNativeFilled('native_title', true|false)    // native reklam geldi mi
gdSetNoAds(true|false)          // reklamları kaldır satın alımı
gdAdResult({ id, ok, reason, height, data })  // Yol A yanıtları
```

## 9. Test listesi (gerçek cihazda, test reklam birimleriyle; her birinin sonucunu yaz)

**Açılış ve ekran**
1. Arenada oyun kartına dokun → oyun beyaz parlama olmadan açılıyor, açılış filmi ve müzik çalışıyor.
2. Durum çubuğu ve gezinme çubuğu gizli; kenardan kaydırınca kısa görünüp kayboluyor.
3. Çentikli/kamera delikli bir cihazda üst düğmeler deliğin altında kalmıyor.
4. Uygulamayı kapat-aç: oyundaki ilerleme (açılan adalar, toz, kostümler) duruyor.
5. Ekranı döndür: oyun yeniden yüklenmiyor.

**Geri ve çıkış**
6. Karşılama ekranında "Arena" (‹) düğmesi → arenaya dönülüyor; çubuklar geri geliyor; açık reklam görünümü kalmıyor.
7. Android geri tuşu: oyun oynarken → duraklatma; tekrar → devam; haritada → karşılama; karşılamada → arenaya dönüş.
8. Oyun sırasında uygulamayı arka plana al, geri gel: oyun duraklatılmış, ses doğru.

**Ödüllü (her biri için: sonuna kadar izle, yarıda kapat, uçak modunda dene)**
9. Kayıp ekranı "Bir şans daha" (`rv_revive`): izlenirse devam, kapatılırsa ödül yok ve mesaj.
10. İkinci kayıptan sonra "Kalkanla dene" (`rv_shield`): üstte "Kalkan" rozeti, ilk yanış affediliyor.
11. Ada sonu "Tozu ikiye katla" (`rv_dust_double`) ve sandık "İzle · ikiye katla" (`rv_chest_double`).
12. Haritada ▶ rozetli ada (`rv_skip`), "İpucu" → Pusula (`rv_compass`) ve "Gizli Ada'yı aç" (`rv_bonus`).
13. Gardırop: "24 saat giy" (`rv_rent`), "Gölge parçası" (`rv_piece`).
14. Haritada Hediye Zifir (`rv_gift`). Geliştirmede hızlı görmek için oyun açılmadan önce:
    `GUNDONUMU_AD_CONFIG.gift = { firstMin: 0.2, minMin: 0.5, maxMin: 1 }` (yayında bu satırı kaldır;
    varsayılan ilk geliş 3 dk, sonra 20–30 dk).
15. Hazine "Değiştir" (`rv_reroll`).
16. Reklam yokken (no fill) her ödüllü düğmeye basınca oyun "uygun reklam yok" diyor, hiçbir şey donmuyor.
17. Ödüllü düğmeye arka arkaya iki kez hızla bas: tek reklam açılıyor.

**Geçiş**
18. 5 ada bitir, "Sonraki Ada": geçiş reklamı iki ada arasında çıkıyor; kapanınca oyun kaldığı yerden sürüyor.
19. Geçiş reklamı yüklenemediğinde oyun takılmadan sonraki adaya geçiyor.

**Banner**
20. Gökyüzü haritası ve Hazine'de banner en altta; hiçbir düğmenin üstüne binmiyor (gerçek yükseklik bildirildi).
21. Ada oynanırken banner yok; haritadan adaya geçince banner kayboluyor.
22. Banner gelmediğinde boşluk kalmıyor.

**Native**
23. Karşılama ekranında native reklam en altta, ayrılmış yuvanın tam üstünde; düğmelerle çakışmıyor.
24. Ayarlar, Gardırop, Hazine, Hikâye, Nasıl? açılınca native kayboluyor; kapanınca geri geliyor.
25. Haritaya ya da oyuna geçince native kayboluyor.
26. Native gelmediğinde yuva kapanıyor (`gdNativeFilled(..., false)`), boş kutu kalmıyor.
27. Native reklama dokununca reklam ağının sayfası açılıyor; geri dönünce oyun bozulmuyor.

**Diğer**
28. iOS'ta titreşim `GundonumuHost.haptic` ile hissediliyor (Ayarlar → Titreşim açıkken).
29. "Reklamları kaldır" senaryosu varsa `gdSetNoAds(true)` sonrası banner/native/geçiş çıkmıyor, ödüllüler duruyor.
30. 10 dakika oynayıp ısınma ve kare hızı kontrolü (düşük seviye bir Android'de de).

## 10. Bitti sayılması için

- Yukarıdaki 30 maddenin hepsi geçti, sonuçlar bana listelendi.
- Oyun kodunda (`Gundonumu.html`) değişiklik **yapılmadı**. Gerekirse yalnızca sayfa yüklenmeden
  önce `GUNDONUMU_EMBED` ve `GUNDONUMU_AD_CONFIG` tanımlandı.
- Test reklam birimleri yayın öncesi gerçekleriyle değiştirildi, onay (UMP/ATT) akışı çalışıyor.
