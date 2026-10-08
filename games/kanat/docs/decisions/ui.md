# UI / UX kararları (ui ajanı)

Kapsam: `src/ui/**`, `public/fonts/**`, `tools/fonts-fetch.ts`, `dev/ui.*`, `tests/unit/ui-*.test.ts`. Her karar: **Karar** — gerekçe.

## Fontlar
- **Karar:** Barlow Condensed 600 / 700 / 600 italik, Inter (değişken, 400–600), Playfair Display italik (değişken, 400–600) Google Fonts CSS2 API'sinden yalnız `latin` + `latin-ext` alt kümeleriyle indirildi (`node tools/fonts-fetch.ts`, 10 woff2, toplam ~310 KB). — `latin` ı/ç/ö/ü'yü, `latin-ext` ğ/Ğ/ş/Ş/İ'yi taşır; kiril/yunan/vietnam alt kümeleri gereksiz yük.
- **Karar:** Fontlar `FontFace(ArrayBuffer)` ile `fetchAsset()` üzerinden yüklenir (URL değil). — Tek dosya build'de gömülü paketten okunabilir; `file://` altında da çalışır.
- **Karar:** Sistem fontu yalnız yükleme öncesi 'Kanat Fallback' (Arial/Roboto, `size-adjust`) olarak tanımlı; ilk ekran `UI.fontsReady` sonrası gösterilir. — "Sistem fontu yasak" kuralı; yine de CSS geçerli kalsın.
- Test dizesi "Ağaçlı Şelâle · İĞNEADA · ığdır · ÇÖŞÜ · 2:07.4" her yüzde doğru çiziliyor (`dev/ui.html?screen=fonts`, `docs/shots/ui/fonts.png`). Inter'in `tnum` özelliği alt kümede korunuyor (tabular rakamlar hizalı).

## Tasarım dili
- **Karar:** "Altimetre ve harita": 1 px kılcal (#FFFFFF22), arduvaz yarı saydam paneller rgba(14,20,28,0.55) + backdrop blur, metin #F5F1E8; birincil buton dolu "kâğıt beyazı" (#F5F1E8 zemin, mürekkep metin), dünya vurgu rengi yalnız ince çubuk/etiket/ilerlemede. — Apple Fitness/Strava sadeliği; neon ve doygun düğmeler yok.
- **Karar:** Tam ekran sayfaların zemini %80–95 opak koyu degrade + blur; altında kalan ekranlar `visibility:hidden` (is-covered). — Bulanıklığı desteklemeyen/zayıf GPU'larda okunurluk; üst üste blur maliyeti yok.
- **Karar:** Büyük harf her zaman `upper()` (= `toLocaleUpperCase('tr-TR')`) ile JS'te yapılır; CSS `text-transform: uppercase` hiç kullanılmaz. — Türkçe İ/ı doğruluğu tarayıcının `lang` desteğine bırakılmaz.
- **Karar:** Göz alıcı ama sakin "boyalı dünya sanatı" (SVG, §3.2 paletleri) dünya kartlarında, yükleme ekranında, kartpostal siluetlerinde ve paylaşım kartı yedeğinde kullanılır; render-to-texture önizleme gelirse `previewUrl` ile yer değiştirir. — Gri kutu/placeholder yasak; 3D önizleme hazır olmadan da ekranlar premium görünür.
- **Karar:** Rozetler altıgen amblem (kazanılmamış: kesikli kontur), kozmetik desenler SVG `<pattern>` kumaş dokusu olarak önizlenir; gerçek giysi önizlemesi `mountPilotPreview` kancasıyla 3D'ye bağlanır.
- **Karar:** İkon seti 70+ satır içi SVG, 24 ızgara, tek 1,6 px çizgi, yuvarlak uç; emoji UI'da yok (yalnız paylaşım metni). Yavaş Mod için 🐢 yerine kaplumbağa SVG'si.
- **Karar:** Renk körü modu `.kn-cb` kök sınıfıyla CSS değişkenlerini (--kn-p1..p5) Okabe-Ito'ya çevirir; HUD yayında dilim kalınlığı kademeyle artar (3/4/6/8/10 px) ve "×N" yazısı daima görünür.
- **Karar:** Sol el modu: HUD'da duraklat, paraşüt, hız ve irtifa göstergeleri aynalanır; menüler aynalanmaz. — Brif yalnız bağlamsal butonları ve HUD'u istiyor; menü düzeni tutarlı kalsın.
- **Karar:** Büyük HUD = HUD öğelerine `zoom: 1.25`. — Konumlar ve 88 pt paraşüt dahil her şey orantılı büyür; ayrı yerleşim kodu gerekmez.
- **Karar:** Hareketi azalt (`.kn-rm` veya sistem tercihi): animasyonlar 1 ms, geçişler 120 ms, sayaçlar anında son değer.

## Ekran yapısı ve gezinme
- **Karar:** `UI.show(screen, props)` + katman yığını: `root` (loading/menu/results/flight) yığını sıfırlar; `page` tam ekran itilir; `overlay` (pause, photo, resume) oyunun üstünde; `card` (unlock/help/inverted/assistOff) küçük modal, HUD görünür kalır. `UI.back()` en üst katmanı kapatır (ilgili `onBack` geri çağrısıyla); uçuşta hiçbir katman yokken duraklatmayı açar; sonuç ekranında menüye döner; menü/yükleme kökünde `false` döner → host `exit`.
- **Karar:** Görünüm modelleri yalnız kimlik + sayı taşır, bütün metin UI içinde i18n'den çözülür (rota adı `route.<id>`, dünya `world.<id>` …). — Dil değişince UI tüm yığını yeniden çizer (`onLangChange`), oyun kodunun metin bilmesi gerekmez.
- **Karar:** Gezinme verisi `callbacks.get*()` sağlayıcılarıyla çekilir (getWorlds, getRoutes(w), getDaily…); eylemler `on*` geri çağrılarıdır. Tüm üyeler isteğe bağlı. — Entegratör adım adım bağlayabilir; galeri aynı arayüzü sahte veriyle kullanır.
- **Karar:** Kilitli modlar her zaman açılma koşulunu yazar ("1. rotayı bitirince açılır"); "yakında" hiçbir yerde yok (testle kontrol).
- **Karar:** Ana menüde Kariyer'e giriş "Modlar" kartından; ayrıca alt sayfada beş kart (Devam, Günün Rotası, SÜRÜ.io, Modlar, Koleksiyon), sağ üstte rütbe rozeti + ayarlar düğmesi. Yatay ekranda alt sayfa sağ sütuna taşınır, 3D sahne solda nefes alır.
- **Karar:** Sonuç ekranında yakınlık şeridi skorun altında (paylaşımla aynı dil); döküm paneli kaydırılabilir ve alt kenarı maskeyle yumuşar. Yarım uçuşta yıldız yerine tek satır not, Paylaş/Düello Kodu pasif.
- **Karar:** Grafik seçimi tek bölmeli segment: "Otomatik / şu an: Yüksek" (geniş) | Ultra | Yüksek | Orta | Düşük. Ultra 120 Hz anahtarı yalnız `ultraCapable` ise görünür. Sürüm etiketine 1,6 sn içinde 5 dokunuş → `openPerfPanel()`.
- **Karar:** Ayar değişikliğinde UI tam yeni `Settings` nesnesini `onSettingsChange(next, path)` ile bildirir ve kök bayrakları/dili hemen uygular; kalıcılık platformun işi.
- **Karar:** Düello kartı tek satır: "Ayşe’nin hayaleti · Günün Rotası #214 · 2:07.4"; Türkçe iyelik eki ünlü uyumuyla üretilir (Ayşe’nin, Mehmet’in, Can’ın, Umut’un, Öykü’nün). Tipografik kesme işareti (’) kullanılır.
- **Karar:** Foto Modu çerçevesi önizlemede gerçek kaydın kompozisyonunu gösterir (ince kâğıt-beyazı kontur + Playfair yer adı + tarih + KANAT logosu); "Arayüzü gizle" tüm kontrolleri kaldırır, dokununca geri gelir.

## HUD
- **Karar:** 180° yakınlık yayı 4 eşit dilim (×1 30–15 m, ×2 15–7, ×3 7–3, ×5 <3); dolu dilimler alttan yukarı "gösterge" gibi yanar, ibre mesafeyi sürekli gösterir. — Hem kademe hem "bir sonraki kademeye ne kadar kaldı" tek bakışta.
- **Karar:** Paraşüt butonu portrede yayın sağ ucunun üstüne (alt boşluk + 122 px) yerleştirildi; 390 pt genişlikte yay ile çakışıyordu. Yatayda köşede.
- **Karar:** `update(state)` yalnız ekrandaki (nicemlenmiş) değer değişince DOM'a yazar: skor tamsayı, süre 0,1 sn, hız/irtifa 1 birim, ibre 0,5°, kombo 0,01. Kararlı durumda tahsis yok.
- **Karar:** Kapı oku ekran-uzayı açısıyla beslenir (`setArrow(rad|null)`) — UI kamerayı bilmez; projeksiyonu entegratör yapar.
- **Karar:** `intro`/`jump` evresinde HUD göstergeleri gizlenir, yalnız FTUE katmanı ve duraklat kalır (ilk 30 saniye filmi: tek ipucu "Atla").
- **Karar:** Olay yazıları ekranın üst üçte birinde (merkez %40 boş), 1,4 sn ömür; çarpma uyarısı kenar nabzı 1 Hz (≤ 3 Hz ışık kuralı).

## Paylaşım
- **Karar:** Metin kartları §2.8/§2.6 birebir; 🛟/🐢 birinci satırın sonuna, düello kodu ikinci satıra. TR'de sıra "1./15", EN "1st/15". Birim testleri `tests/unit/ui-share.test.ts`.
- **Karar:** Görsel kart 1080×1350 canvas → varsayılan JPEG 0,9 dataURL (foto ağırlıklı kart PNG'de 2–3 MB olur). Kahraman kare verilmezse dünya sanatı kullanılır.

## Doğrulama
- `dev/ui.html` galerisi her ekranı sahte veriyle çizer; `node dev/ui.shots.mjs <dir>` 41 ekran × TR/EN × dikey/yatay ekran görüntüsü alır ve otomatik kontrol yapar: metin taşması/kırpılması, ekran dışı, dokunma hedefi ≥ 44 pt, güvenli alan ihlali, konsol/ağ hatası. Kontak sayfaları `docs/shots/ui/`.
- Headless SwiftShader `backdrop-filter`'ı çizmiyor; panel opaklıkları blur olmadan da okunur olacak şekilde seçildi.
