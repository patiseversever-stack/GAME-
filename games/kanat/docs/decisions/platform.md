# Platform kararları (Engine & Performance)

Biçim: **Karar** — gerekçe. Ana ajan bu dosyayı `docs/KARARLAR.md` ile birleştirir.

## Çekirdek (src/core)

- **FSM: duraklatma durum değil, bayrak.** Duraklatma nedenleri dört bayraktır: `user`, `host`, `hidden`, `contextlost`. Bu bayraklar her durumda (Boot … Result) aynı kuralla işlenir.
  - `host`, `hidden` ve `contextlost` "askıya alma" (suspend) sayılır: rAF, sim ve ses durur.
  - `user` yalnız sim'i durdurur; duraklat menüsü sahnenin üstünde çizilir.
  - Gerekçe: §4.3 "her durumda tanımlı" şartı, durum × olay matrisini tek bir yerde çözmeyi gerektiriyor.
- **"Devam" katmanı yalnız `game` durumunda ve kullanıcı duraklatması yokken açılır.** Askıdan dönünce sahne çizilir ama sim `confirmResume()` gelene kadar bekler. Gerekçe: §5.4 "oyuncu arka plandayken ölmez". Menüde Devam'a gerek yok.
- **`game → game` geçişi geçerlidir** ve yeniden başlatma anlamına gelir. Kaza → tekrar < 1 sn akışı yeni durum gerektirmez.
- **GameLoop:**
  - Yenileme hızı, son 32 rAF aralığının medyanı alınıp yaygın panel hızlarına yuvarlanarak ölçülür.
  - Çizim böleni `floor(refresh/hedef + 0,25)`: 120 Hz → 2, 90 Hz → 1 (45 FPS yerine 90 FPS), 144 Hz → 2, 60 Hz pil modu → 2, iOS LPM 30 Hz → 1.
  - Kare atlama rAF sayısıyla değil zamanla yapılır (`(bölen − ½)` aralık). Böylece kaçan bir vsync aralıkları bozmaz.
  - En fazla 5 yakalama adımı. Fazlası atılır, birikmez.
  - `start()` zamanlamayı sıfırlar; arka plandan dönüşte patlama olmaz.
  - Yavaş Mod `timeScale = 0,8` ile yalnız akümülatörü ölçekler; `dt` sabit kalır, determinizm korunur.
- **Maliyet probu:** Saniyede bir kare, çizimden sonra 1 piksellik `readPixels` ile senkronlanır (`loop.setProbe`). Mobilde GPU zamanlayıcı yok. Sürekli senkron pipeline'ı bozar; saniyede bir kare ise ihmal edilebilir.
- **Kayıt anahtarları:**
  - `kanat.save`: `save.v1`, içinde `v: 1`.
  - `kanat.settings`: `v: 1`.
  - `kanat.perf.profile.v1`: cihaza özel, yalnız yerelde.

  Sürüm anahtar adında değil belgenin içindedir. Böylece migration zinciri aynı anahtarda çalışır.
- **Atomik yazma:** Önce `<key>.tmp`, sonra `<key>`, sonra tmp silinir. Okurken geçerli bir tmp varsa en yeni değer odur ve kurtarılır. Bozuk tmp yok sayılır. Kota hatası eski değere dokunmaz.
- **Host depolama:**
  - Host `storage:get`'e 800 ms içinde cevap vermezse oturumun geri kalanında yalnız yerel önbellek kullanılır.
  - Host `null` döner ama önbellekte değer varsa host'a geri yazılır.
  - Gerekçe: "host birincil, localStorage önbellek ve yedek" (§7.2). Storage'ı uygulamayan bir host her açılışta en fazla 0,8 sn kaybettirir; ayarlar ve kayıt paralel okunur.
- **v0 → v1 migration:** Sürümsüz prototip düzeni `{stars, best}` için yazıldı. Migration zinciri ilk günden testli olsun diye eklendi. Daha yeni sürümden gelen belge çökme olmadan yüklenir (sürüm düşürme güvenli).
- **Rütbe eğrisi:** Rütbe n için kümülatif XP = `60 · (n−1)^1,75`. Rütbe 9 için ≈ 2.280 XP (ilk oturumlarda), rütbe 50 için ≈ 54.500 XP. Kariyerin tamamı (60 yıldız + 60 görev) yaklaşık 30.000 XP verir; Günün Rotası ve SÜRÜ ile 50'ye uzun vadede ulaşılır. Unvan bantları §2.7 ile birebir.
- **Lig puanı:** LP lig içinde tutulur (0–300). Terfide fazlası sonraki lige taşınır. Düşüş yok, 0'ın altı yok. Elmas ligde LP sınırsız sayılır.
- **Profil doğrulaması:** Bilinmeyen anahtarlar atılır, sayılar sınırlanır. Rota anahtarları `w[1-5]r[1-4]` olmalıdır. Kazanılan yıldızlar kilit açtıysa dünya kilitleri asla geri kapanmaz.

## Performans (src/perf)

- **İki ölçü ayrıldı:**
  - **Kare aralığı:** oyuncunun gördüğü, vsync'e kuantize değer. Düşürme ve dinamik çözünürlük kuralları bunu kullanır.
  - **Maliyet:** probla ölçülen seri CPU+GPU süresi. Yükseltme (p90 < 10 ms) ve çözünürlük artırma bunu kullanır.

  Gerekçe: 60 Hz'de kare aralığı hiçbir zaman 10 ms'nin altına inmez. §5.3'teki "p90 < 10 ms" ancak maliyet olarak anlamlıdır. Prob verisi yoksa yükseltme de yoktur (temkinli yön).
- **Eşikler hedefe göre ölçeklenir.** 30 FPS pil modunda ve LPM kısıtında 18,5, 28 ve 10 ms eşiklerinin hepsi ×2 olur.
- **Dinamik çözünürlük:**
  - Baskı varsa (p90 > hedef × 1,1, 1 sn boyunca) %5 düşer.
  - Pay varsa (p90 ≤ hedef × 1,05 ve maliyet p90 < hedef × 0,75) %2,5 artar.
  - En sık 500 ms'de bir değişir. Son düşüşten 4 sn sonra artırabilir.

  Gerekçe: Asimetrik adım ve 4 sn histerezis salınımı önler (testte geri dönüş ≤ 2). 1 sn bekleme tek hitch patlamalarını ve LPM'in ilk saniyesini eler.
- **Acil durum (p90 > 28 ms, 2 sn):**
  1. Önce "rahatlatma" uygulanır: çözünürlük tabana iner, partikül ölçeği 0,5 olur. Shader değişmez.
  2. 2 sn sonra hâlâ kötüyse kademe hemen düşer.

  Gerekçe: §5.3 "shader değiştirmeden önce çözünürlük ve partikül tavanıyla".
- **iOS Düşük Güç Modu tuzağı:** Son 30 kare (≈1 sn) p10 ≥ 30,5 ms, p90 ≤ 36 ms, p90 − p10 ≤ 3 ms ve CPU p90 ≤ 12 ms ise bu bir **kısıttır**.
  - Kısıt varken hedef 30 FPS sayılır. Kademe düşmez, çözünürlük azalmaz.
  - Kısa pencere, 2 sn'lik acil durum kuralından önce karar verebilmek için seçildi.
  - Kontrol testi: aynı 33 ms ama CPU meşgulse gerçek sorun sayılır.
- **Termal sürüklenme:**
  - Her dakika maliyetin (prob yoksa CPU süresinin) medyanı kaydedilir. 1. dakika ısınma sayılır.
  - Taban, 2–4. dakikaların en iyisidir.
  - 10. dakikadan sonra son 2 dakikanın ortalaması tabanı %15 aşarsa bir seviye artar. Seviyeler en az 60 sn arayla gelir.
    - Seviye 1–2: çözünürlük tavanı ×0,92 ve ×0,85 olur. Mevcut MP %5 adımlarla iner.
    - Seviye 3–4: partikül ölçeği 0,75 ve 0,5 olur.
  - Kademe asla değişmez.
  - Her seviyeden sonra taban yeniden ayarlanır; sonraki adım için ek bir yükselme gerekir.
- **Stabil kademe:** 3 dk aktif oyun süresince düşüş yoksa `perf.profile.v1`'e `stable: true` yazılır.
  - Düşüş ve yükselişte de `stable: false` olarak yazılır. Böylece bir sonraki oturum bilinen iyi kademeden başlar, aynı düşüşü tekrar yaşamaz.
  - En fazla 4 parmak izi tutulur, en eskisi silinir.
  - Parmak izi, ekranın kısa×uzun kenarıyla hesaplanır; yönden bağımsızdır.
- **Doğal molalar:** FSM'nin `menu`, `mode`, `result` ve `game` (yeniden başlatma) durumlarına girişi doğal moladır. Bekleyen düşüş ve kazanılmış yükselme yalnız burada uygulanır. Durum değişiminde 1 sn, askıdan dönüşte 1,5 sn ölçüm yapılmaz (shader ısınması ve streaming).
- **Benchmark:**
  - Adaylar `[tahmin − 1, maxTier]` aralığıdır. Gerekçe: §5.3 "telefon Yüksek'i kaldırıyorsa asla Düşük seçme". Yükleme ekranındaki arka plan gürültüsü güçlü bir telefonu iki kademe aşağı itmemeli.
  - Her kademe için 1 ısınma karesi çizilir, sonra 5 ölçümün medyanı alınır.
  - Kademeler yüksekten düşüğe denenir; ≤ 11 ms olan ilk kademe seçilir.
  - Toplam bütçe 1,5 sn. Süre biterse başarısız olan en düşük kademenin bir altı seçilir.
- **Statik tahmin, brifte belirsiz kalan noktalar:**
  - Adreno 620–639 → Orta.
  - Mali-G52/G57 → Düşük, G68 → Orta, G610/615 → Orta, G71–G78 → Orta, G710 ve üstü → Yüksek, Immortalis → Ultra.
  - Maskeli "Apple GPU" → Yüksek (maks. Ultra). Kısa kenarı < 375 olan küçük ekranlarda veya `MAX_TEXTURE_SIZE` < 8192 ise Orta.
  - Masaüstü: NVIDIA/AMD → Yüksek, Intel → Orta. SwiftShader → Düşük.
  - Bilinmeyen → Orta.
- **Manuel kademe:** Governor yalnız o kademenin MP aralığında çözünürlüğü ayarlar. Partikül ve termal partikül adımları da uygulanmaz. Tabanda 10 sn boyunca p90 > 18,5 ms ise oturumda bir kez `suggestion` olayı gönderilir; UI "Akıcılık için Orta önerilir" kartını gösterir.
- **Gizli panel tıklamaları geçirir** (`pointer-events: none`); yalnız × butonu tıklanabilir. Oyun oynanırken açık kalabilir.

## Köprü (src/bridge)

- **Taşıyıcı her gönderimde yeniden tespit edilir.** Gerekçe: Sırada daha önce gelen bir taşıyıcı geç enjekte edilirse (ör. `flutter_inappwebview` çoğu zaman geç gelir) onu yakalamak. Taşıyıcı yokken gönderilen mesajlar ilk 5 sn boyunca kuyrukta tutulur (en fazla 64) ve taşıyıcı gelince iletilir. 5 sn'den sonra mesajlar sessizce düşer.
- **`callHandler`'ın dönüş değeri gelen mesaj sayılır.** Flutter tarafı `storage:get`'e senkron cevap verebilir.
- **Gelen mesajda `game` alanı yoksa kabul edilir, farklı oyunsa reddedilir.** Yalnız host → oyun tipleri işlenir; oyunun kendi olaylarının yankısı yok sayılır.
- **Origin denetimi yok.** Gerekçe: Oyun hangi host'ta çalışacağını bilemez; RN, WKWebView ve Android'de origin zaten `null` veya yereldir. Origin denetimi host tarafında yapılır (INTEGRATION.md §3.6).
- **Haptik:**
  - Saniyede en fazla 150 ms titreşim (§2.12).
  - "Az" seviyesinde `heavy` → `medium` → `light` sırasıyla bir basamak hafifler, `light` atlanır; dizilerde süreler ×0,6.
  - GDD adları (`hafif`, `orta`, `güçlü`, `çift`, `yıldız`) köprü desenlerine çevrilir.
  - Host yoksa yalnız Android'de `navigator.vibrate` kullanılır.
- **Paylaşım sırası:** host → Web Share (`canShare({files})` ise görselle) → pano + indirme URL'si (`blob:`). Kullanıcı iptali (`AbortError`) hata sayılmaz. Sonuç bir nesne olarak UI'a döner; UI "Panoya kopyalandı / Görseli indir" gösterir.
- **`back` komutu:**
  1. Önce katman yığını (`src/core/layers.ts`) kapanır.
  2. Bir katman `close()`'dan `false` dönerse yerinde kalır ve geri tuşu tüketilmiş sayılır. Örneğin uçuş katmanı kapanmak yerine duraklat menüsünü açar.
  3. Yığın boşsa `exit` gönderilir.

  Masaüstünde Escape tuşu aynı yolu izler.
- **URL parametreleri boot'ta sentetik host komutu olarak uygulanır.** Davranış ve test tek yoldan geçer.

## Girdi (src/input)

- **Eksen komutu 30 Hz ızgarada her örnekte gönderilir** (60 Hz sim'de her 2. tick), yalnız değiştiğinde değil. Aynı tick içinde önce eksen, sonra olaylar (`flare`, `tight`, `parachute`) gelir. Gerekçe: Replay kaydedicisinin (`src/sim/replay/recorder.ts`) akış ve olay sıralamasıyla birebir uyum; canlı oyun = replay.
- **Kuantalama `Math.round(x·31) | 0`.** −0 asla üretilmez (replay ajanının ARAYÜZ isteği).
- **Komut nesneleri 64'lük bir halka havuzdan gelir.** Uçuşta tahsis yok. Tüketici, tick'ten uzun tuttuğu komutu kopyalamalıdır; kaydedici zaten typed array'e kopyalar.
- **Şekillendirme sırası:** radyal ölü bölge (yeniden ölçekli) → hassasiyet (kırpılır) → eksen başına expo.
  - Kullanıcı expo'su: `e = e_taban + expo·(1 − e_taban)`, en fazla 0,95.
  - Hassasiyet < 1 ise tam sapma 31'e ulaşmaz; bu bilinçli bir seçim (kullanıcı "yumuşak" istedi).
- **SÜRÜ.io yönü:** ölü bölge 0,10, expo yok, hassasiyet yok, Pilot ters çevirmesi yok. Ekranda yukarı = +y. Gerekçe: Yön vektörü bir kontrol yüzeyi değil, bir istikamet.
- **Kanopi:** 1 R aşağı sürükleme = tam flare (31). `flare` yalnız değişince olay olarak gönderilir.
- **Klavye:** Yön tuşları/WASD ~0,2 sn'de rampayla gelir, ~0,12 sn'de bırakılır. Space, uçuşta paraşüt; kanopide flare; SÜRÜ'de Sıkı Dizi. P paraşüt. Esc geri.
- **Jiroskop eksenleri** ekran açısına (0/90/180/270) göre yeniden eşlenir. Alçak geçiren filtre tek kutuplu, 8 Hz. Jiroskop çıktısı ölü bölgeden geçmez (kendi 3°'si var), hassasiyet ve expo uygulanır. Yalpa modunda yalpa ekseni dokunmatiğe değil jiroskopa aittir.
- **Paylaşılan matematik:** `src/sim/inputQuant.ts` bu oturumda henüz yoktu. Ölü bölge, expo ve kuantalama `src/input/gesture.ts` içinde aynı formüllerle yazıldı ve `setGestureMath()` ile değiştirilebilir. Entegrasyonda sim'deki fonksiyonlar takılmalı (ARAYÜZ İSTEĞİ).

## Tek dosya build'i ve asset'ler

- **Paket biçimi:**
  - Her dosya ayrı bir `<script type="application/x-kanat-asset">` bloğunda base64 olarak durur, yanında bir JSON indeks vardır.
  - Dosyalar talep edilince decode edilir ve DOM'daki base64 metni silinir (bellek).
  - JS string literal kullanılmadı. 20 MB'lık literal parse süresi ve minifier yükü getirirdi.
- **Taşma:** 25.000.000 bayt (ondalık MB; "25 MB"nin sıkı okuması) aşılırsa dünya grupları bütün hâlinde `packs/kanat-pack-N.js` dosyalarına taşar. Bu dosyalar JSONP benzeri klasik scriptlerdir ve `file://`'da da yüklenir. Öncelik: ortak dosyalar, fontlar, Kapadokya, sonra Likya → Pamukkale.
- **`fetch` köprüsü:** Tek dosya build'inde `window.fetch`, belge dizinine göreli paket yollarını paketten servis eder. three.js `FileLoader`, KTX2 transcoder ve WASM ek kod gerektirmez. `<img>` gibi `fetch` dışı yükleyiciler için `assetUrl()` satır içi dosyaya senkron bir `blob:` URL'si döner.
- **Paket raporu `dist/single-pack-report.json`'a yazılır,** `dist/single/` içine değil. Teslim klasöründe yalnız `kanat.html` ve `packs/` bulunur.
- **`define __KANAT_SINGLE__`:** web build'inde `false`, tek dosyada `true`. Kullanılmayan kod tree-shake ile atılır.
- **Favicon:** Tüm sayfalarda satır içi SVG kullanılır. Gerekçe: Masaüstü Chromium'un `/favicon.ico` 404'ü konsol hatası üretir ve "konsol hatası = 0" testlerini kirletirdi.
- **Önyükleme ipucu:** `public/worlds/kapadokya/world.json` build anında varsa `index.html`'e `<link rel="preload" as="fetch" crossorigin>` eklenir. Font önyüklemesi eklenmedi; UI fontları nasıl yüklüyorsa ona göre "kullanılmayan preload" uyarısı verebilirdi.

## Test API'si ve E2E

- **Kayıt defteri:** Her fonksiyon için son kayıt kazanır; kayıt kaldırılınca bir öncekine düşülür. Kayıtsız bir fonksiyon çağrılırsa açık bir hata fırlatılır. Platform varsayılanları `setTier`, `perf` ve `freezeVisuals`'tır; modlar bunları ezebilir.
- **Platforma özel ek API'ler:** `app()`, `emit()`, `bridgeLog()`, `confirmResume()`, `loseContext()`/`restoreContext()`, `handlers()`, `timestamps()`/`mark()`. Gerekçe: Köprü ve yaşam döngüsü e2e testleri modlardan bağımsız doğrulanabilsin.
- **E2E boot başarısızsa hızlı düşer.** `waitGameReady` "fatal" hata fırlatır ve suite'in kalanı "çalıştırılmadı" olarak işaretlenir. Gerekçe: Bağlanmamış bir `main.ts` 5 dakikalık zaman aşımı zinciri yaratmasın.
- **Platform düzeneği:** `dev/platform.html` + `dev/platform.ts` gerçek oyun olmadan platform katmanını boot eder. Oyuncak, deterministik bir sim test kancalarını kaydeder. E2E bu sayfaya `BASE_URL=http://127.0.0.1:5185 GAME_PAGE=dev/platform.html E2E_I18N_TEXT=0` ile koşturulur. Tek dosya düzeneği: `KANAT_SINGLE_ENTRY=dev/platform.html KANAT_SINGLE_OUTDIR=<dizin>`. Bu düzenek build'e girmez.
- **`touch-action: none` `html` ve `body` üzerindedir** (§7.3). UI'daki kaydırılabilir listeler (Ayarlar, Koleksiyon) kendi kapsayıcılarında `touch-action: pan-y` ve `overflow: auto` kullanmalıdır.
