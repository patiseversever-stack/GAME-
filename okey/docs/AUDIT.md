# Patisever Okey — `okey-oyunu.html` Audit Raporu

> Kaynak: `legacy/okey-oyunu.original.html` (417.504 bayt).
> Yöntem: dosya formatlanıp baştan sona okundu (≈4.500 satır uygulama JS'i, 7.263 satır CSS),
> orijinal kural motoru Node'a çıkarılıp çalıştırıldı, oyun Chromium'da 7 ekran boyutunda
> (320×568 → 1280×800 + 844×390 yatay) gerçekten açılıp ölçüldü.

## 0. Dosya anatomisi

| Ölçüm | Değer |
|---|---|
| Biçim | Vite + **React 19.3** bundle'ı, tek satırlık minify, kaynak harita yok (`Ze`, `On`, `dy`, `M1`, `k1` gibi adlar) |
| Uygulama JS'i | ≈4.500 satır (toplam JS 306 KB'ın ≈150 KB'ı uygulama, kalanı react-dom) |
| CSS | 7.263 satır · 1.383 kural bloğu · **yalnızca 734 benzersiz seçici** · 279 seçici 2–13 kez yeniden tanımlanmış |
| `@keyframes` | **2 adet** (`pn-slide`, `pn-fade`) |
| Ses / haptik / service worker / manifest | **0 / 0 / 0 / 0** |
| Yüklenen font | **0** (`document.fonts` boş; "DM Sans", "Playfair Display", "Inter" adları var ama `@font-face` yok) |
| Mimari | Saf fonksiyonel kural motoru + **iki ayrı, birbirinden bağımsız UI** (`PremiumNormalTable` ve `a101-*`) |

## 1. Korunacak iyi parçalar

Motoru çöpe atmıyoruz; aşağıdakiler yeni mimariye **taşınacak** ve orijinal motorla diferansiyel testle doğrulanacak:

1. **Kural motoru tasarımı:** saf, deterministik (`mulberry32` + seed), olay günlüğü üreten `apply(state, seat, action)`.
2. **Kural varyantları kataloğu:** katlamalı açılış, çift açma (5 çift), yandan alma cezası, yerdeki okey'i geri alma, deste bitince uzlaşma, kafa / okey-kafa.
3. **Puanlama tabloları:** klasik 20 puan (normal −2, okey/çift −4, çift+okey −8, gösterge −1); 101 (−101×çarpan, açmayan 202, çift açana ×2, elde kalan okey +101…).
4. **Bot görünümü ayrımı** (`x1`): bot rakip elini görmez → "hile yapmayan AI" zemini.
5. **Girdi güvenliği fikirleri:** çoklu dokunuş iptali, pointer capture, `visibilitychange` ile askıya alma, sürükleme eşiği, çift komut koruması.
6. **Doğrulamalı kayıt yükleme** (`V1`): bozuk localStorage oyunu çökertmez.
7. Türkçe terminoloji ve sonuç ekranındaki **ceza nedenlerinin şeffaf listesi**.

## 2. CRITICAL — oynanışı / kuralı / erişimi bozan

| # | Bulgu | Kanıt |
|---|---|---|
| C1 | **Yatay telefonda oyun başlatılamıyor.** `.landing:after` dekoratif devre `pointer-events:none` yok ve kartın üstüne boyanıyor; "Masaya Otur" dokunuşunu yutuyor. | Playwright 844×390: `<div class="landing"> intercepts pointer events`, 30 sn timeout |
| C2 | **101 ikinci sınıf bir mod.** Normal Okey'de sürükle-bırak, uçuş animasyonu, FLIP, girdi makinesi var; 101 tamamen ayrı, animasyonsuz, buton tabanlı bir UI. Taş bileşeni bile farklı (`En` vs `Ku`). 101'de sürükleyerek atma yok. | Kod: `lg()` içinde `_n ? PremiumNormalTable : a101-stage` dalı |
| C3 | **Istakada slot yok.** Taşlar sıralı bir grid; aralarına boşluk bırakıp per gruplamak imkânsız (yalnızca sıra değiştirme). Gerçek Okey/101 oyuncusunun temel davranışı yok. | `a101-rack-grid`, `pn-rack-grid`: `rackOrder` dizisi |
| C4 | **320 px'de düzen kırılıyor.** 101'de ıstaka alt kenardan taşıyor (`scrollHeight 592 > 568`); Ece paneli göstergeye, "Mert attı" stok düğmesine biniyor; Normal'de "Okey: Sarı 3" etiketi "YANDAN AL" başlığına biniyor, Deniz plakası sağdan kırpılıyor. | 320×568 ekran görüntüleri |
| C5 | **Ses yok, haptik yok, müzik yok.** | `AudioContext`/`Audio`/`vibrate` = 0 eşleşme |

## 3. HIGH — amatör / yavaş / rahatsız edici

| # | Bulgu | Kanıt |
|---|---|---|
| H1 | **Botlar 135 ms'de oynuyor, 101'de animasyon yok.** İnsan sırası başlangıçtan 303 ms sonra geliyor; ekran görüntüsünde Deniz daha ilk saniyede 4 per açmış. Kimin ne yaptığı okunamıyor. | `setTimeout(Tt, 135)`; ölçüm: 101 → 303 ms |
| H2 | **Bot AI ana thread'i kilitliyor.** `dy()` her bot turunda C(22,2..5) ≈ 35.000 kombinasyonu `Ze` ile doğruluyor (skor için iki kez daha), `R1` yandan alma kararında tekrar çalışıyor. | Node ölçümü: 101 ilk karar medyan **55 ms**, p90 82, maks **127 ms** (hızlı sunucu CPU'su; telefonda 4–6×) |
| H3 | **Bot yalnızca tek-taş sezgiseli** (`jc`): el yapısı (partition / eksik taş mesafesi), çıkış sayımı (outs), rakip modelleme yok; **zorluk seviyesi yok**. | `jc`, `Ph`, `R1`, `M1` |
| H4 | **Masaüstü/tablet = gerilmiş telefon düzeni.** 1280×800'de devasa boş masa, minik oyuncu plakaları, "TAŞ AT" hedefi "Sayı" düğmesine biniyor; 101 ıstakasında sütunlar arası dev boşluklar. | 1280×800 ve 768×1024 görüntüleri |
| H5 | **Yatay mod yok.** Yalnızca media query yamaları; masa yeniden düzenlenmiyor (C1 bunun sonucu). | 33 `@media` bloğu (16 farklı koşul; 8'i aynı `max-width:700px` dikey koşulunda) |
| H6 | **CSS "yama katmanı".** `.pn-play-zones` 13×, `.pn-stage` 12×, `.pn-rack-grid` 12× tanımlı. Çakışma hatalarının kaynağı bu; bakım yapılamaz. | 1.383 blok / 734 benzersiz seçici |
| H7 | **Font yüklenmiyor.** Başlıklar Georgia/Times, gövde Arial'a düşüyor → tipografi işletim sistemine bağlı. | `document.fonts` = [] |
| H8 | **Animasyon sistemi yetersiz:** tek uçuş animasyonu (WAAPI, doğrusal ara nokta, 170–320 ms); anticipation/settle, yay fiziği, bounce, contact shadow yok. Sıralama FLIP'i yalnızca Normal'de. | `ug()`; 2 `@keyframes` |
| H9 | **Meld'de okey temsil ettiği taşla gösterilmiyor.** Perde "5 6 **11 OKEY** 8" görünüyor ama 7'yi temsil ediyor → per okunamıyor. | 1280×800 101 görüntüsü; `En` bileşeni `as`'ı kullanmıyor |
| H10 | **Atılan taş geçmişi gizli.** Normal'de her oyuncunun son 3 taşı üst üste, 101'de yalnızca son taş. Strateji için şart olan bilgi yok. | `Ey` `slice(-3)`, `a101-discard` |
| H11 | **Geçersiz açış = +101 ceza.** UI açılış geçerliliğini canlı göstermiyor; kullanıcı "Eli aç"a basınca ceza yiyebiliyor. | `OPEN` dalı: `Dc(f, c, 101, "Yanlış açma")` |
| H12 | **Sunum ve mantık yapışık.** `lg()` ≈1.400 satırlık tek bileşen: oyun döngüsü, bot zamanlaması, kalıcılık, 19 `useState`. Sürükleme sırasında her `pointermove` React state'i güncelliyor, `elementFromPoint` + tüm taşlar için `getBoundingClientRect` dolaşılıyor (layout thrash). | `ye()`, `g()` |
| H13 | **"İlk açılıştan sonra internetsiz oynanır" iddiası boş:** service worker/manifest yok, kurulabilir PWA değil. | `serviceWorker` = 0 |
| H14 | **Renk tek ayırt edici.** Dört rengin taş işareti aynı nokta; renk körü için taşlar ayırt edilemiyor. | `.pn-tile-mark` |

## 4. MEDIUM — cila ve UX

| # | Bulgu |
|---|---|
| M1 | Başlangıç akışı yok: "Masaya Otur" → anında dolu masa. Karıştırma, dağıtım, gösterge, okey açıklaması, odak geçişi yok. |
| M2 | El bitirme anı sıradan: modal tablo. Skor sayımı, kutlama, kazanan elin gösterimi yok. |
| M3 | Rakipler: avatar yok (Normal) / tek harf "D E M" placeholder avatar (101). Zorluk/seviye, durum, "düşünüyor" yok. |
| M4 | Kaba ikonografi: "✦" kart arkası, "☰", "↗" karakterleri; `confirm()` ile yeni oyun. |
| M5 | 101 açılışı çok adımlı: çoklu seçim → "Per hazırla" → tekrar → "Eli aç"; canlı "açılış puanı" yok. |
| M6 | Masa: düz `radial-gradient` + 1px çizgiler; gerçek materyal, derinlik, kontrollü ışık yok. Taş: 2D gradient kart; kalınlık/bevel/contact shadow yok. |
| M7 | Bağlamsal öğretim yok; tek uzun yardım modalı. |
| M8 | Tek ayar "hareket efektleri"; ses/müzik/tema/hız/kalite ayarları yok. |
| M9 | İlerleme yok (XP, seviye, başarım, günlük hedef, kozmetik). Tek maçlık demo hissi. |
| M10 | Kural: 101'de **12‑13‑1 geçersiz** (kasıtlı; yardım metninde yazıyor) — kaynaklara göre değişen bir kural, ayarlanabilir olmalı. Per başına tur başına işleme limiti (3 / çift açana 2) standart kuralda yok. |
| M11 | Her durum değişiminde tüm state'in `JSON.stringify` ile `localStorage`'a yazılması (olay listesi büyür). |
| M12 | `body{min-width:960px}` masaüstü-önce taban kuralı; mobilde sonradan ezilmiş. |

## 5. LOW

- Dokunma hedefleri 320 px'de ≈34×46 px, sürükleme sırasında parmak taşı kapatıyor (yukarı ofset yok).
- `viewport` meta'da `maximum-scale` yok; `overscroll-behavior` hiç tanımlı değil (kaydırma/geri çekme kazaları).
- `color-scheme`, favicon, `apple-touch-icon` yok; `theme-color` sabit.
- Klavye erişimi yalnızca seçime izin veriyor; taşları oklarla taşıma yok.
- Marka tutarsızlığı: sayfa başlığı "Patisever Okey", ana ekran "Okey Masası", menü "PATİSEVER OKEY".
- "ISTAKAN" gibi büyük harf Türkçe yazımı (I/İ) tutarsız.

## 6. Verdikten sonra alınan tasarım kararları

1. **React yok.** Oyun; sürekli hareket eden, kimliği sabit nesnelerden (106 taş) oluşuyor. Bu imperatif bir *sahne* (scene) problemi:
   her taşın kalıcı bir DOM öğesi (*sprite*) var; durum değişince **hedef transform** hesaplanıyor, sprite hedefe yay fiziğiyle/yörüngeyle gidiyor.
   Böylece çekme / atma / sıralama / per açma / işleme tek mekanizmadan, ışınlanmadan akıyor.
2. **Tek sahne, iki kural seti.** Okey ve 101 aynı masa, aynı ıstaka, aynı girdi sistemini kullanır; fark yalnızca kural motoru ve birkaç bağlamsal panel.
3. **Slotlu ıstaka** (satır × sütun), boşluk bırakarak gruplama, sürüklerken komşuların yer açması, canlı grup/puan tespiti.
4. **Gerçek yeniden düzen:** ekran sınıfına göre (dar dikey, geniş dikey, yatay, tablet, masaüstü) ayrı yerleşim çözücü; `scale()` ile küçültme yok.
5. **Bot:** el yapısı analizi (eksik-taş mesafesi), görünür taş sayımı, rakip modelleme, 101 açılış optimizasyonu; zorluklar karar kalitesiyle ayrışır (CASUAL / NORMAL / EXPERT). Bot yalnızca kendi eli + herkese açık bilgiyi görür.
6. **Ses:** WebAudio ile sentezlenen (varlık indirmeyen) taş/masa/UI sesleri, üretken ambient müzik, ayrı ses/müzik anahtarı, haptik.
7. **Tema mimarisi:** masa / ıstaka / taş takımı CSS değişkeni paketleri; XP ile açılan kozmetikler (ödeme yok, chip ekonomisi yok).
8. **Kural düzeltmeleri (bilinçli sapmalar):** 101'de 12‑13‑1 varsayılan *kapalı* (orijinalle uyumlu) ama ayarlardan açılabilir; per başına işleme limiti kaldırıldı; okey'in run'lardaki temsili konumsal tutuluyor (orijinal, okeyli serilere taş eklerken temsili yeniden çözüp hata verebiliyordu); geçersiz açış ceza değil hata mesajı + canlı doğrulama.
9. **Tek dosya dağıtım:** kaynak modüler (`src/`, `styles/`), `tools/build.mjs` ile `dist/okey-oyunu.html` tek dosya üretir (file:// altında çalışır) + service worker / manifest ile kurulabilir PWA.
