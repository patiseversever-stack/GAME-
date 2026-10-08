# KANAT — Gerçek cihaz test listesi (15 dakika)

Container'da ölçülemeyenler burada. Headless Chromium + SwiftShader'da FPS anlamsızdır: GPU yazılımsaldır, termal ve Düşük Güç Modu yoktur.

Bu protokolü şu 4 hedef cihazda koşun:
- **Xiaomi Mi 9T** (Adreno 618)
- **iPhone 11** (A13)
- **iPhone 13** (A15)
- **Xiaomi 13** (Adreno 740, 120 Hz)

Sonuçları bu dosyanın sonundaki tabloya yazın.

## 0. Hazırlık (1 dk)
- Uygulama yerine `host-demo.html` kullanılabilir. Gerçek WebView'de test daha değerlidir: RN, Flutter, WKWebView veya Android WebView (`docs/INTEGRATION.md`).
- **Temiz başlangıç.** Uygulama verisini silin ya da `localStorage`'da `kanat.perf.profile.v1` anahtarını silin. Böylece Otomatik kademe kayıtlı profilden değil, statik tahmin + benchmark'tan başlar.
- **Gizli performans panelini açın:** Ayarlar → en alttaki sürüm yazısına 5 kez dokunun. Panel sol üstte açılır ve dokunuşları engellemez. Kapatmak için ×'e ya da yine 5 kez sürüm yazısına dokunun.
- Cihaz şarjda **olmasın**. Ekran parlaklığı %50. Termal ölçüm için oda sıcaklığında başlayın.

### Panelde okunacak değerler (her adımda aynı)
| Alan | Anlamı | Beklenen |
|---|---|---|
| `FPS` | Sunulan kare hızı (EMA) | 60 Hz ekranda ~60. 30 FPS (Pil) modunda ~30. |
| `p50 / p90` | Kare aralığı yüzdelikleri (ms) | p90 ≤ 18,5 ms (60 FPS hedefi) |
| `maliyet p90` | 1 piksellik `readPixels` probuyla ölçülen CPU+GPU kare maliyeti | Yükseltme koşulu < 10 ms. Düşürme riski > 18,5 ms. |
| `CPU p90` | Kare başına JS süresi | ≤ 8 ms (§5.2 JS bütçesi) |
| `Kademe` | Seçili kademe, Otomatik/Manuel, kaynak (`profile`, `guess`, `benchmark`, `manual`) | Tabloya yazın |
| `Render MP` | Dinamik çözünürlük (megapiksel) ve pixel ratio | Kademe aralığında: Düşük 0,45–0,65, Orta 0,65–1,0, Yüksek 1,0–1,6, Ultra 1,6–2,4 |
| `Draw call` / `Üçgen` / `Program` | `renderer.info` | Kademe bütçesi altında. Program ≤ 40. |
| `Doku bellek` | Doku belleği tahmini (MB) | Düşük ≤ 96, Orta ≤ 160, Yüksek ≤ 256, Ultra ≤ 320 |
| `JS heap` | Kullanılan heap (MB). Yalnız Chromium tabanlı WebView'de görünür. | ≤ 150 MB |
| `Partikül` | Partikül tavanı ve ölçek | Termal ve acil durumda ölçek < 1,00 olur |
| `Ekran` | Ölçülen hedef yenileme | 60 Hz. Xiaomi 13'te Ultra 120 Hz açıksa 120. |
| `Kısıt (LPM)` | iOS Düşük Güç Modu tuzağı algılandı mı | Yalnız LPM açıkken **EVET** |
| `Termal` | Termal kademe (0–4) | 0'dan başlar, uzun oyunda 1–2'ye çıkabilir |
| `Bekleyen düşüş` | Bir sonraki doğal molada kademe düşecek mi | Normalde "hayır" |
| `GPU` / `Tahmin` / `Benchmark` | Renderer dizesi, regex kuralı, kademe başına benchmark ms | Tabloya yazın |

## 1. Otomatik kademe seçimi (2 dk)
1. Uygulamayı soğuk başlatın. Yükleme ekranı ≤ 1,5 sn'lik benchmark içerir ve fark edilmemelidir.
2. Ana menüde panelden `Kademe`, `Tahmin` ve `Benchmark` satırlarını not edin.
3. Beklenen başlangıç kademeleri (statik tahmin; benchmark bir üst kademeye çıkarabilir):

   | Cihaz | Statik tahmin | Benchmark sonrası beklenti |
   |---|---|---|
   | Mi 9T | Orta (Adreno 618) | Orta. Düşük'e asla inmemeli. |
   | iPhone 11 | Yüksek ("Apple GPU") | Yüksek |
   | iPhone 13 | Yüksek | Yüksek veya Ultra |
   | Xiaomi 13 | Ultra (Adreno 740) | Ultra |

4. Ayarlar → Grafik satırı "Otomatik (şu an: …)" göstermeli. Xiaomi 13'te "Ultra 120 Hz" seçeneği görünmeli, diğerlerinde görünmemeli.

## 2. Oynanış ve FPS (3 dk)
1. Kapadokya · Balon Yolu'nu (w1r3) oynayın. Bu en ağır sahnedir: 40 balon ve peri bacaları.
2. Yere yakın uçarken panelden `p90`, `maliyet p90`, `Draw call` ve `Üçgen` değerlerini not edin.
3. Kaza → yeniden deneme 1 saniyenin altında olmalı. Takılma olmamalı.
4. SÜRÜ.io turunu 1 dakika oynayın: 1.500 kuş, tam ekran yoğun an. `p90`'ı not edin.
5. Xiaomi 13: Ultra 120 Hz'i açın → `Ekran` 120 Hz olur, FPS ~120. Kapatın → 60'a döner, judder olmamalı.
6. Ayarlar → FPS: 30 (Pil tasarrufu) → `FPS` ~30, kare aralıkları eşit, oyun hızı değişmemeli. Sonra 60'a geri alın.

## 3. Isınma: 10 dakika sonra (dakika 3–13)
1. Kesintisiz 10 dakika oynayın: Kariyer rotaları art arda.
2. 5. ve 10. dakikada panelden `FPS`, `p90`, `maliyet p90`, `Termal`, `Render MP` ve `Partikül` değerlerini not edin.
3. Beklenen:
   - Kademe düşüşü bir rota sonunda, bir doğal molada olmalı. Oyun ortasında olmamalı.
   - Termal kademe yükselirse önce `Render MP` düşer, sonra `Partikül` ölçeği. Oyuncu bunu fark etmemeli.
   - Cihazın arkası elle "çok sıcak" mı? Not edin.
   - 10. dakikada `JS heap` başlangıçtaki değerin yaklaşık %10 fazlasını geçmemeli.

## 4. Düşük Güç Modu (iPhone; 1 dk)
1. Denetim Merkezi'nden Düşük Güç Modu'nu açın ve oyuna dönün.
2. `FPS` ~30 ve `Kısıt (LPM)`: **EVET** olmalı.
3. Bir rota bitirin. Kademe **düşmemeli**, `Bekleyen düşüş` "hayır" kalmalı.
4. LPM'i kapatın → 1–2 saniye içinde `Kısıt (LPM)` "hayır" olur, FPS ~60'a döner.
5. Android: Pil tasarrufu modunda aynısını deneyin ve sonucu not edin. Üreticiye göre değişir.

## 5. Ses kesintisi: arama gelmesi (1 dk)
1. Uçuş sırasında cihazı başka bir telefondan arayın. Ya da iOS'ta Siri, Android'de alarm başlatın.
2. Beklenen:
   - Ses kesilir ve oyun durur.
   - Arama bitince "Devam" katmanı görünür. Oyuncu bu arada ölmemiş olmalı.
   - "Devam"a dokununca müzik ve rüzgâr sesi geri gelir.
   - Sessiz anahtarı açıkken (iOS) ses çalmamalı.
3. Sesin hiç gelmemesi (AudioContext `interrupted` kalması) **P0** hatadır.

## 6. Arka plan ve geri dönüş (1 dk)
1. Uçuşun ortasında Ana ekrana gidin, 30 sn bekleyin, geri dönün.
2. Beklenen:
   - Sim durmuş olmalı: pilot aynı yerde.
   - "Devam" katmanı görünür. Arkada sahne çizilir, sim beklemededir.
   - Ses yalnız Devam'dan sonra başlar.
3. Uygulama değiştiriciden 5 dakika uzak kalın. iOS süreci öldürebilir; bu durumda uygulama yeniden yüklenir. Ayarlar ve ilerleme kaybolmamalı.
4. Android geri tuşu:
   - Ayarlar açıkken → Ayarlar kapanır.
   - Uçuşta → Duraklat menüsü açılır.
   - Menüde, açık katman yokken → oyun `exit` gönderir ve uygulama ekranı kapanır.

## 7. Bellek uyarısı ve WebGL context kaybı (2 dk)
1. Arka planda ağır bir uygulama açın: kamera 4K video veya büyük bir oyun. Sonra KANAT'a dönün.
2. Beklenen:
   - WebGL context kaybolduysa sahne kendini yeniden kurar ve "Devam" görünür. Siyah ekran ve çökme olmamalı.
   - iOS WebContent süreci öldüyse sayfa yeniden yüklenir (host `webViewWebContentProcessDidTerminate` → `reload`). İlerleme ve ayarlar korunur.
3. 5 dünya arasında art arda geçiş yapın (Kariyer → dünya seçimi). Her geçişten sonra `Doku bellek` ve `JS heap` değerlerini not edin. Geçişlerden sonra değerler aynı aralıkta kalmalı ve sürekli artmamalı.

## 8. Dokunma, yön ve güvenli alan (1 dk)
1. Tek başparmakla "her yeri sürükle": çapa parmağın indiği yerde doğar ve sürükledikçe parmağı takip eder.
2. Pinch, çift dokunma ve uzun basma hiçbir zaman zoom ya da menü açmamalı.
3. Yatay yöne çevirin (host izin veriyorsa). Oyun devam etmeli ve HUD güvenli alana sığmalı. Ayarlar → İki Başparmak'ı açın: sol yarı yalpa, sağ yarı yunuslama.
4. Çentik ve Dynamic Island: HUD öğeleri kesilmemeli.
5. Jiroskop (iPhone): Ayarlar → Jiroskop: Yalpa. İzin diyaloğu bir kez çıkar. "Atla"da nötr açı kalibre edilir. Telefonu yatırınca 3°'ye kadar tepki olmamalı, 28°'de tam yatış olmalı.

## 9. Kayıt formu

| Cihaz | Otomatik kademe (kaynak) | Benchmark (ms/kademe) | 2. dk p90 | 10. dk FPS / p90 / Termal | LPM: Kısıt EVET? kademe sabit mi? | Arama sonrası ses | Arka plan dönüşü | Bellek: context kaybı | Notlar |
|---|---|---|---|---|---|---|---|---|---|
| Mi 9T | | | | | — | | | | |
| iPhone 11 | | | | | | | | | |
| iPhone 13 | | | | | | | | | |
| Xiaomi 13 | | | | | — | | | | |

Kritik eşikler:
- **P0:** Ses geri gelmiyor, siyah ekran, ilerleme kaybı, çökme.
- **P1:** Oyun ortasında kademe değişimi (popping), Mi 9T'de p90 > 18,5 ms'nin sürekli olması, LPM'de kademe düşmesi.
