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

## Entegrasyon kancaları (yapımcı isteği)
- **Karar:** UI sesleri `callbacks.onSound(e)` ile, doğrudan `audio.event(e)`'ye verilebilecek nesneler olarak yayınlanır: `uiTap`, `uiSwish` (sayfa açılışı), `uiConfirm` (Uç/Tekrar/Devam/Yarış), `uiBack`, `uiToggle`, `{type:'tally', i}` (döküm satırı başına), `tallyEnd`, `{type:'star', index}` (0 tabanlı), `reward` (yeni rekor, açılış kartı), `photo` (deklanşör). Yıldız haptiği ses motorunda olduğu için UI ayrıca haptik göndermez.
- **Karar:** Sürüm etiketi `callbacks.onVersionLabel(el)` ile entegratöre verilir (`return attachVersionTapTrigger(el)`); kanca yoksa UI kendi 5-dokunuş sayacıyla `openPerfPanel()` çağırır — çift tetik yok.
- **Karar:** "Devam" katmanı `UI.show('resume')`; dokunuş → `onResumeTap()`; platform `resumePrompt {show:false}` gelince `UI.close('resume')`.
- **Karar:** Async işleyiciler (düello doğrulama) ekranın canlı kopyasını kararlı `key` ile bulur; dil değişimi sırasında yeniden çizilen ekran kaybolmaz.

## Paylaşım
- **Karar:** Metin kartları §2.8/§2.6 birebir; 🛟/🐢 birinci satırın sonuna, düello kodu ikinci satıra. TR'de sıra "1./15", EN "1st/15". Birim testleri `tests/unit/ui-share.test.ts`.
- **Karar:** Görsel kart 1080×1350 canvas → varsayılan JPEG 0,9 dataURL (foto ağırlıklı kart PNG'de 2–3 MB olur). Kahraman kare verilmezse dünya sanatı kullanılır.

## Doğrulama
- `dev/ui.html` galerisi her ekranı sahte veriyle çizer; `node dev/ui.shots.mjs <dir>` 41 ekran × TR/EN × dikey/yatay ekran görüntüsü alır ve otomatik kontrol yapar: metin taşması/kırpılması, ekran dışı, dokunma hedefi ≥ 44 pt, güvenli alan ihlali, konsol/ağ hatası. Kontak sayfaları `docs/shots/ui/`.
- Headless SwiftShader `backdrop-filter`'ı çizmiyor; panel opaklıkları blur olmadan da okunur olacak şekilde seçildi.

## F1 incelemesi (Ü-10) — uygulananlar
- **Karar:** Usta Görevi metinleri `src/ui/usta.ts → taskText()` ile meta `ustaI18n()`'den gelir: Kılavuz ölçütü varsa gerçek eşik (`1:18.4 altında bitir`, `41.275 puanı geç`), yoksa göreli anahtar (`usta.timeUnderRel` / `usta.scoreOverRel`, "(yardımsız)" dahil); `unassistedOnly` görevlere "(yardımsız)" eki şablonla (`usta.withUnassisted`). Test: 60 görevin hiçbiri `usta.generic`'e düşmüyor, iki dilde.
- **Karar:** Rozet ad/açıklamaları meta `badges.ts` ile birebir (test her 30 rozeti iki dilde karşılaştırır).
- **Karar:** Yeni ekranlar: `levelUp` (kart: rütbe diski + tek ödül + "Giy"), `weekly` (rota + hava değiştirici + ödül önizlemesi; ad/açıklama meta `WEEKLY_MODIFIERS`'tan), `suruResults` (sıra, lig puanı değişimi, "YZ ortalamasına göre %", Elmas'ta son 20 tur ortalaması, istatistikler, Yeni tur / Paylaş / İzle / Çık). **`suruHud` yapılmadı**: SÜRÜ ajanı `src/modes/suru/hud/SuruHud.ts`'i (ve oradaki sonuç kartını) zaten kurmuş; çoğaltma yok. Entegratör SÜRÜ sonucunda KANAT tasarım diliyle tutarlı olan `UI.show('suruResults')`'u ya da SuruHud'un kartını seçebilir.
- **Karar:** Sonuç ekranı: XP çubuğu (sayarak dolar), "Usta 2/3", "Karadeniz'e 3 yıldız" (TR yönelme ekleri `worldTo.<id>` anahtarlarında; UI'da emoji yerine yıldız ikonu), ödül çipi + "Giy", Paylaş → Klip/Kart/Metin seçimi (Klip yalnız `shareKinds` içinde gelirse), yardımla kurulan rekorda can simidi ikonu. FTUE için `compact: true` kompakt kart (yıldızlar, Usta n/3, ilk kozmetik + Giy, tek Devam).
- **Karar:** Düello paylaşımı insan cümlesi + bağlantı (`duelShareText`); Günün Rotası kartının 1. satırı değişmez, 2. satırda kod yerine bağlantı (`duelLink`).
- **Karar:** Büyük yazı: kök ölçek 1,0/1,2/1,4 (`textScale`; ekranlara CSS `zoom`, HUD 1,2/1,35); en küçük metin 13 px; 16 px altı metin Inter (göz atma etiketleri Barlow'dan Inter'e geçti); panel üstü soluk metin opaklığı 0,84 / 0,8; dekoratif çizgiler ayrı `--kn-deco` (0,42). HUD metinlerine parlak zeminde (kar, traverten) okunurluk için tasarlanmış yumuşak koyu hale.
- **Karar:** Halka kayması: `hud.setStickAnchor(x, y)` çapa halka dikdörtgenine düşerse halka 0,25 sn'de ~90 px yukarı; "Orta" ayarı kalıcı yukarıda. İniş yönü: `hud.setLanding(açı, m)` → sarı ok + "İNİŞ 820 m" (kapı oku gizlenir). ANTRENMAN etiketi `mode: 'practice'`.
- **Karar:** Ana menüde "Dünyalar ve rotalar" bağlantısı; "Modlar" alt yazısı "Düello · Serbest Uçuş · Haftalık"; yeni açılan modda "YENİ" rozeti (`newModes`); aynı anda açılan modlar tek kartta satır satır (`UnlockProps.modes`).
- **Karar:** Dünya kartı görseli `previewUrl` ya da `mountWorldPreview(el, world)` kancasıyla gerçek arazi küçük resmi; boyalı SVG yalnız yüklenirken yer tutucu (GDD §9). Rota haritası yalnız gerçek `line` varsa çizilir; uydurma çizgi kaldırıldı.
- **Karar:** Ayarlarda sade dil (Yalpa → "Sağa-sola yatma", Pilot → "Ters (pilot)", Expo → "Ortada daha yumuşak", Okabe-Ito → "Renk körlüğüne uygun renkler", LP → "lig puanı", Yavaş Mod "Oyun %20 daha yavaş akar"); hassasiyet kaydırıcıları sayısız, "Daha sakin ↔ Daha çevik"; Erişilebilirlik bölümü birleşik (Büyük yazı, hareketi azalt, sol el, Konfor Kamerası, renkler, Otomatik Paraşüt, Yavaş Mod, Flare ipucu, halka konumu, Sakin kontrol).
- **Karar:** Koleksiyonda Kanopi ve Çerçeve sekmeleri (adlar/renkler meta `CANOPIES`/`CARD_FRAMES`); kaynak etiketleri "{n} kartpostalda açılır", "{n} SÜRÜ turunda", "{lig} ligde"; Foto Modu'nda kilitli filtre "{n} kartpostalda".
- **Karar:** `SuruSub` kimlikleri meta ile birebir: 'league' | 'daily' | 'practice'. `onHelpChoice` 3. seçenek 'practice' ("Bu bölümü çalış"). "Ters mi?" kartı → "Yukarı çekince burun insin mi?" [Evet, çevir] / [Hayır, böyle kalsın].
- Henüz yapılmadı (zaman): Uçuş Günlüğü / hayalet rengi / menü saati koleksiyon sekmeleri, ayrı "Daha sakin kamera?" ve "Kontrol daha sakin olsun mu?" kartları (aynı `help` kart kalıbıyla kolay eklenir), kontrastın otomatik sayısal ölçümü (görsel kontrol Erciyes/Pamukkale zeminlerinde yapıldı: `?bg=erciyes`).
