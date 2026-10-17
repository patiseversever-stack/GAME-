# KAHVEHANE PİŞTİ — Finale kadar yol haritası (v2: Premium masa oyunu)

> **Yeni oturuma not:** Önce bu dosyayı, sonra `KARARLAR.md`'yi oku. "📍 KALDIĞIMIZ YER" bölümünden devam et.
> Repo: `patiseversever-stack/GAME-` · Dal: `ccr-eb47d428-2tlc90` · Oyun kodu: `kahvehane/game`

---

## 0. Vizyon

**Türkiye'nin en iyi Pişti oyunu.** Supercell veya Monopoly GO kalitesinde, "çok emek verilmiş" hissi veren premium bir masa oyunu.
- **Yön (16 Ekim'de değişti):** 3D karakter modeli YOK. Masa ve kartlar 2.5D (Three.js; kartlar 3D uçar, döner, gölge yapar). Karakterler **2D premium portreler**: nefes alır, göz kırpar, duygusunu tepki kartlarıyla gösterir, **Türkçe sesli konuşur**.
- **His:** Parmakla fizikli kart fırlatma, pişti anında yavaş çekim, sarsıntı, titreşim, ekran parlaması, altın patlaması, konfeti. Tok sesler, komik ve sesli rakip tepkileri.
- **Performans:** Düşük cihazda bile takılmaz. Animasyonlarda yalnızca transform ve opacity kullanılır, "gerektiğinde çiz" uygulanır, 3 kalite seviyesi var.
- **Platform:** Önce HTML linkiyle test. Sonra kullanıcının Expo uygulamasına `react-native-webview` ile gömülür (7. adım, birlikte).
- **Para:** Sadece sanal jeton. Jeton satılırsa yaş sınırı 17+ olur, karar 4. adımda.

## 1. Kesinleşmiş kararlar

| Konu | Karar |
|---|---|
| Teknoloji | Three.js (masa + kartlar) + HTML/CSS arayüz + TypeScript + Vite. Tek dosya HTML çıktısı (`npm run build:tek`). |
| Görsel dil | Sıcak kahvehane: ahşap, yeşil çuha, pirinç/altın, bordo, krem. Stilize-gerçekçi 3D render tarzı illüstrasyonlar (konsept görsellerle aynı aile). Supercell tarzı tok butonlar, kalın konturlu yazı (Lilita One), okunur gövde yazısı (Nunito). |
| Kamera | Masaya yukarıdan, hafif açıyla (~70°) bakış. Masa ekranı doldurur, kartlar herkes için okunur. |
| Karakterler | Rıza Amca (MVP), sonra Cem, Kahveci Dursun, Defne. Portre + göz kırpma + 6-8 duygu kartı + sesli replikler. |
| Kurallar | Klasik Pişti: pişti 10, vale pişti 20, as/vale 1, ♣2 = 2, ♦10 = 3, çoğunluk +3. 1'e 1, 4 kişi tekli, 4 kişi eşli. |
| Ses | Efektler kodla üretiliyor. Seslendirme ElevenLabs (Türkçe, duygulu); anahtar `ELEVENLABS_API_KEY` ortam değişkeni olarak eklenir. |
| Pişti hareketi | Görev/mağazadan açılır, sadece gösteriş (puana etkisi yok). |
| Online | En sona. Kural motoru saf ve deterministik, aynen sunucuda koşar. |

## 2. Performans kuralları

- Masa: ~10 çizim çağrısı. 52 kart tek InstancedMesh. Boşta çizim yok.
- Arayüz animasyonları: yalnızca `transform` ve `opacity`. Animasyonlu `box-shadow`, `filter` ve `backdrop-filter` yok. Hareketli öğeler `will-change` ile katmanlanır.
- **GPU karo belleği (17 Ekim, "ekran kararıyor / portre bozuluyor" hatası):** canlanan her öğe ayrı katmandır ve Chrome onu animasyonun EN BÜYÜK ölçeğinde, ekran çözünürlüğünde tarar (dpr 2,6'da tam ekran gradyan ≈ 10 MB, 2,6× büyüyen 300 px'lik hâle ≈ 17 MB). Bütçe aşılınca eksik karolar koyu zemin renginde çizilir. Kurallar: büyük/yumuşak ışık, hâle, ışın, şok halkası → küçük `<canvas>` doku katmanı (`src/platform/tex.ts`; bileşimci büyütür, karo tutmaz); canlanan katmanda ya da onun ATASINDA `mask`/`clip-path`/`filter` yok (ayrı maske yüzeyi; `clip-path` + `scale(0)` 2025² px katman doğurdu); görünmeyen süs (opacity 0 parıltı/gölge) `display: none` (yoksa katmanı büyütür); doku tuvalleri zemin yığınının en üstünde (altta kalırsa üstündeki her şey ayrı katmana alınır); portre gibi büyük görseller çözülmeden gösterilmez. Ölçüm: `--force-device-scale-factor` ile GERÇEK dpr (CDP `deviceScaleFactor` yalnız bildirir, 1× tarar) + `--force-gpu-mem-available-mb` ile kısıtlı bütçe + bellek dökümü (`cc/tile_manager` karoları).
- Görseller WebP/JPEG, makul boyutta. Toplam paket hedefi < 8 MB.
- Oyun döngüsünde bellek ayırma yok. Cihaza göre kalite: `?q=low|mid|high`.

## 3. Adımlar

### 🔨 Adım 1: MVP — Rıza Amca'ya karşı tam oyun, tüm ekranlar  ← ŞU AN
**Hazır olanlar:** Kural motoru (2/4 kişi, eşli; 46 test), bot (%79 kazanma), zaman/yavaş çekim sistemi, kart sistemi (instanced, uçuş, gölge), parmakla fırlatma, kalite seviyeleri, oyun akışı iskeleti.
- [ ] **Sanat:** masa illüstrasyonu (3 seçenek), logo, ikonlar (jeton, sandık, yıldız, kupa), Rıza portresi + göz kırpma + duygu kartları
- [ ] **Kart tasarımı** (ajan): 52 yüz + bordo-altın arka
- [ ] **Masa sahnesi:** üstten kamera, illüstrasyon zemin, el yelpazesi altta, rakip portresi üstte, deste/yığın/toplanan kartlar
- [ ] **Ekranlar** (ajan): açılış, ana menü (profil, jeton, Oyna, rakip seçimi, masa seçimi), oyun HUD'u, pişti afişi, el sonu sonuç ekranı, ayarlar, nasıl oynanır, günlük ödül
- [ ] **Efektler:** pişti yavaş çekim + sarsıntı + parlama + altın patlaması + konfeti, uçan jetonlar, sayaçlar, puan baloncukları, buton animasyonları
- [ ] **Ses efektleri** (ajan): kart, pişti, jeton, kahvehane ortamı
- [ ] **Türkçe replikler ve seslendirme** (ajan): Rıza için 40-50 komik replik; ElevenLabs ile üretim betiği + oyunda çalma sistemi. Anahtar gelene kadar konuşma balonu.
- [ ] Otomatik test, telefon ekran görüntüleri, **tek dosya HTML linki**
- **Kabul ölçütü:** Kullanıcı menüden oyuna, oyundan sonuca kadar her ekranı görüp "premium" diyor. Düşük cihazda takılmıyor.

### Adım 2: Karakterler ve modlar
- [ ] Cem, Dursun, Defne: portre, göz kırpma, duygu kartları, replikler + ses
- [ ] Rakip seçimi (zorluk/kişilik), 4 kişi tekli ve eşli masa düzeni, eşli puan ekranı
- [ ] Seyirci laf atmaları ("yancı" sesleri)

### Adım 3: İlerleme ve ekonomi
- [ ] Seviye/XP, masa bahisleri (100 → 10.000), günlük ödül serisi, görevler, başarımlar
- [ ] Kozmetikler: pişti hareketleri (masaya şaplak, kartı öpüp çarpma, tespih, davul-zurna), kart arkaları, çuha renkleri, avatar çerçeveleri
- [ ] Mağaza (sanal); jeton satışı kararı (17+ etkisi)

### Adım 4: Ses ve müzik cilası
- [ ] Tüm replikler seslendirilmiş, ortam kaydı, nostaljik müzik, ses karışımı

### Adım 5: Cila ve performans
- [ ] Gerçek düşük cihaz testi, yükleme süresi, eğitim (ilk oyun rehberi), büyük yazı modu, hata avı

### Adım 6: Uygulamaya gömme (kullanıcıyla)
- [ ] Expo bileşeni (`react-native-webview`, `expo-haptics`, `expo-screen-orientation`), köprü mesajları (`init`, `haptic`, `match:end`, `exit`, `pause/resume`; `src/platform/bridge.ts` hazır)

### Adım 7: Test ve yayın
- [ ] TestFlight + Play iç test, mağaza görselleri ve video, yaş derecelendirmesi

### Finalden sonra
Online (eşleştirme, arkadaşla oyun, emote) → Blöf → Batak

## 4. Varlıklar

- Konseptler: `docs/konsept/` · Promptlar: `docs/karakterler.md`, `docs/konsept/promptlar-*.json`
- Meshy araçları: `tools/meshy_img.py`, `tools/meshy_3d.py` (anahtar `MESHY_API_KEY` ortam değişkeninden okunur, asla dosyaya yazılmaz)
- Eski 3D yönünden kalanlar (artık kullanılmıyor, tanıtım için saklanıyor): `assets-src/karakterler/*.glb`, `tools/decimate.mjs`, `bake.py`, `build_rig.py`
- Rıza konsept görev kimliği (image-to-image tabanı): `01a13fb8-1958-722c-b874-b3e1ff5eed8c`. Cem: `01a13fb8-235a-73ea-a0e7-03c64d1b5ad5`, Dursun: `01a13fb8-24e4-7068-9a83-0bc185864e1d`, Defne: `01a13fb8-27e1-76af-9624-07d92856348f`
- Meshy kredisi: ~241 (16 Ekim). Aylık yenilenme 25 Ekim.

## 5. Çalışma şekli

- Türkçe, kısa açıklamalar (kullanıcı mobilde). Seçenek gerektiren her şey seçenekli sunulur.
- Adım adım ilerlenir; her adımın sonunda durulur, **tüm ekranların görselleri** ve oynanabilir HTML linki verilir.
- En fazla 5 ajan: önemli işte Opus, rutin işte Sonnet. İlerleme tabloyla bildirilir.
- Yarım ve çirkin hâller "ilerleme" diye gösterilmez.
- API anahtarları sohbete yazılmaz, ortam ayarlarına eklenir. (Meshy anahtarı sohbete yazıldı; iş bitince yenilenmeli.)

## 📍 KALDIĞIMIZ YER

**17 Ekim gece — sürüm 15–16 (karakter sesleri + görsel cila):** https://claude.ai/artifact/AGD4e3sw2ecT2Z6NqwoTro
- **Seslendirme (ElevenLabs, Starter):** sesler tasarlandı ve `tools/voice/voices.json`'da: Rıza (80 yaş dede), Dursun (kısık-hızlı kahveci), Cem (enerjik yayıncı), Defne (hanımefendi). ~1000 replik (`src/ai/dialogue.ts`: Pişti, Blöf, banter, hazır mesaj, galeri/market), 924 klip `assets/voice/` (mono 64 kbps, ~20 MB). Üretim: `ELEVENLABS_VIA_PROXY=1 node tools/voice/generate.mjs` (anahtar ortamın ağ gizli anahtarında, `xi-api-key` başlığıyla vekilden eklenir). `defne_playerWin_2` boş döndü → yalnız balon (metni değiştirip `--only … --force`).
- **Konuşma yönetmeni** `src/audio/speech.ts`: tek kanal, öncelik/kesme, banter atomik, balon ≥ ses süresi, duraklat/çıkışta susar, "Konuşmalar" kapalı → yalnız balon. Hazır mesajlı sohbet (`src/ui/quickchat.ts`, `src/game/quickChat.ts`, protokol `{t:'chat'}` + host hız sınırı `src/net/chat.ts`). Galeri tanıtımı, market satış/aldı/eksik sesleri.
- **Sesin barındırılması:** `dist/voice/` tek tek mp3 (Expo); önizleme (`dist-tek/voice/`) 21 paket + manifest v2 (`scripts/voice-pack.mjs`, oynatıcı 8 MB paket LRU). Yayın: sayfa + `voice/manifest.json` + `voice/packs/*.bin` (Artifact `files`, 23 dosya).
- **Görsel cila (v16):** ipucu yazısı ele binmiyor, Pişti destesi ve Blöf KENAR kenarda, orta halkanın atış/alma/pişti tepkileri (pişti: altın-beyaz ışınlar), 4 renkli şerit geçişi ekranı tam kaplıyor + yavaş + parlak logo, VS bant çizgileri portrelerin arkasında.
- **Sıradaki:** gerçek telefonda performans + ses; çevrimiçi (oda/eşleşme/kimlik); Okey; banter sıklığını oynayarak ayarlama; `docs/karakterler.md`'de Defne'nin eski tarifi.

**16 Ekim gece — sürüm 14 (Blöf geldi):** https://claude.ai/artifact/AGD4e3sw2ecT2Z6NqwoTro
- **İkinci oyun Blöf** — kurallar `docs/BLOF.md` (anketle kararlaştırıldı). Modlar 1'e 1 · 3 Kişi · 4 Kişi · Eşli; 5 sn blöf penceresi (BLÖF düğmesi/yığına dokun/Geç), ağır çekim açılış, YAKALANDI!/DOĞRU ÇIKTI!, yığın kaybedene uçar, karakter lafları (`src/ai/blofDialogue.ts`), Rıza Amca öğreticisi (ilk Blöf eli).
- **Motor ve çevrimiçi altyapı** (`src/core/blofTypes.ts`, `blof.ts`, `game.ts` GameEngine arayüzü, `pistiEngine.ts`; `src/net/` LocalHost/GameClient/LocalTransport, protokol, `remote.ts` WebSocket iskeleti). Oyun bugün telefonda yerel sunucuyla koşuyor; gerçek sunucuya taşınınca istemci kodu değişmez. Mimari ve yapılacaklar: `docs/ONLINE.md`. Pişti adaptörü hazır ama `match.ts` henüz host üzerinden oynamıyor.
- **Botlar** `src/ai/blofBot.ts` kolay/orta/zor (yalnız kendi görünümü + açık olaylar; zor her kartı hatırlar). Gerçek oyuncuya karşı denge oynanarak ayarlanmalı.
- **Masa/oynanış** `src/table2d/blofTable.ts`, `src/ui/blofHud.ts`, `src/game/blofMatch.ts` (Match ile aynı şekil). **El düzeni oyuncu seçimi:** Gruplu (değere göre yığınlar, ≥47 px dokunma) / Klasik (iki sıra); ilk Blöf'te bölünmüş ekran seçici (`src/ui/handchooser.ts`), Ayarlar'da "Blöf el düzeni" (oyun içinde canlı değişir). Hızlı seçim "7'lerini seç", değer seçilince kartlar otomatik seçilir.
- **Uygulama:** ana ekranda Pişti | Blöf seçici + zorluk hapı, 3 koltuklu VS/sonuç, profil v4 (oyun başına istatistik, `settings.blofHand`), 6 Blöf görevi, kurallar sekmeleri. Ekonomi `src/game/setup.ts`.
- **Test:** vitest 173/173; tam otomatik oyunlar (statik derleme) Pişti 1v1/4 + Blöf 1v1/3/4/eşli, iki el düzeni — hepsi sonuç ekranına, konsol temiz. Kancalar: `?auto=1&game=blof&mode=3&diff=zor&hand=spread`, `?blof=0`; geliştirici: `dev/blof.html?scene=table|open|window|reveal`, `scripts/blof-perf.mjs`.
- **Performans (başsız, 4× yavaş CPU):** boşta 0 kare; oynanış p95 17 ms, blöf anı 17–33 ms, dağıtımda ara sıra 67–117 ms tek kare. Gerçek telefonda ölçülmedi.
- **Sıradaki:** gerçek cihaz ölçümü; Blöf seslendirmesi; çevrimiçi (oda/eşleşme/kimlik, sunucu tarafı ekonomi); Okey; 52 kart karıştırma patlamasını karelere bölmek.

**16 Ekim akşamı — sürüm 13 (premium efektler):** https://claude.ai/artifact/AGD4e3sw2ecT2Z6NqwoTro
- **Pişti efektleri baştan** (`src/ui/fx.ts`, `fxsprites.ts`, `fxlib.ts`, `fxpreview.ts`): ~45 sprite (parlama, lens, yıldız pırıltısı, gerçek yıldırım, lale, cam nazar, altın taç, galaksi, 3D takım amblemleri…) açılıştan ~2,5 sn sonra boşta bir kez çizilir; efektler yalnız transform/opacity, ≤ ~40 düğüm, ≤ 2 sn, tam ekran beyaz parlama yok. 9 efekt: Zafer Işığı (ücretsiz, eski klasik), Altın Yağmuru, Havai Fişek, Yıldız Yağmuru, Şimşek, Lale Rüzgârı, Nazar, Taç Giyme (yeni; Davul Zurna kaldırıldı), Kozmik Girdap. Kahraman kutlamasında efekt karakterin arkasında (yüz açık), taç şapkanın üstünde.
- **Dönen ışınlar** geri: arena (`src/ui/img/arena-rays.webp`) ve market önizlemeleri (`rays-white/gold.webp`, `scripts/bake-rays.mjs`) — işlenmiş görsel + yalnız transform dönüşü, `.kh-keep` (calm.ts durdurmaz).
- **Masa küçük resimleri** gerçek boyamadan pişirilir: `node scripts/bake-tables.mjs` → `src/ui/tablepv/`. Efekt küçük resimleri: `node scripts/bake-fx.mjs`. Deste: `scripts/bake-decks.mjs`. İçerik değişince üçünü de çalıştır.

**16 Ekim öğleden sonra — "Yeni market + yağlı boya" (sürüm 11):** https://claude.ai/artifact/AGD4e3sw2ecT2Z6NqwoTro
- **Yükleme ekranı ~3 sn** (aşamalı çubuk; deste atlası + ses motoru arkada hazırlanır). **VS ekranı ~3,2 sn**: darbe halkası, kıvılcım, parıltı, "Masa kuruluyor → Hazır!", perde açılışı (`src/ui/intro.ts`).
- **Market baştan** (`src/ui/shop.ts`, `showcase.ts`, `tryon.ts`, `sets.ts`, `previews.ts`, `deckpv.ts`): Öne Çıkan (Günün Teklifi, Özel Setler, Yeni Gelenler, Efsanevi Vitrin, Hemen Alabileceklerin), sekme başına vitrin + ızgara + "Sende", Yeni/Popüler rozetleri, tema setleri (%20–30), etkileşimli ürün penceresi (deste: kaydır/çevir/ışık), DENE (ürünle mini masa: kart at, pişti, efekt), jeton yetmeyince "N EKSİK" + kazanma yolları. Deste önizlemeleri derlemede pişirilir: `node scripts/bake-decks.mjs` (deste ekleyince/değiştirince tekrar çalıştır), efekt küçük resimleri `scripts/bake-fx.mjs`.
- **Yeni içerik** (`src/skins/`, `src/themes/`, `src/ui/fx.ts`): desteler Ebru, Boğaz Gecesi, Kapadokya Şafağı (yağlı boya: `src/themes/oil.ts`, `scenes.ts`, `src/skins/oilcard.ts`); masalar Ebru Salonu, Boğaz Gecesi, Kapadokya Şafağı (oyun alanı koyu/sakin — okunurluk kuralı); 7 çerçeve (Sultan Tacı, Mücevher, Buz Kristali, Neon Halka, Ebru, Kapadokya Balonları, Nazar); 5 pişti efekti (Nazar, Lale, Şimşek, Davul Zurna, Girdap). Kullanıcı Hazine ve Neon deste/masalarını reddetti → kaldırıldı. Koleksiyon 40 parça.
- **Performans:** masa kartları tek atlas görseli (çizim geçişi/kare 108 → 3); çerçeve animasyonları akıcı (steps yok), market sekme geçişi p95 33 ms (4× yavaş CPU), Desteler ilk açılış en uzun görev 1015 → 57 ms; boşta kare/sn ≈ 0. Ölçüm: `scripts/perf.mjs`, `jank.mjs`, `market-perf.mjs`. Gerçek telefonda ölçülmedi.
- **Kalanlar:** eski 4 deste kullanılmayınca belleği bırakmıyor; pişti damgası ışınlarında maske; yeni efektlerin oyun içi kahraman arka deseni varsayılan; seslendirme (ElevenLabs anahtarı), çevrimiçi, uygulamaya gömme.

**16 Ekim öğleden sonra — "Sakin ve akıcı" turu (sürüm 9):** https://claude.ai/artifact/AGD4e3sw2ecT2Z6NqwoTro
- **Sadeleşen ana ekran:** karakter + iki yuvarlak buton (günlük ödül, bedava sandık) + tek satır "Çevrimiçi" + tek maç kartı (1'e 1 · 4 Kişi · Eşli, rakip/masa şeridi, 4 bahis) + OYNA. "Arkadaşla" artık Çevrimiçi'nin içinde ("Arkadaşınla" sekmesi). (`src/ui/lobby.ts`, `home.css`)
- **Karakter ekranlarında tek resim:** poz/duygu değişimi ve çapraz geçiş yok (hayalet yüz bitti); yalnız nefes. Konuşma balonu hep yüzün üstünde/yanında (`placeBubble`), sonuç ekranında küçük yüzlerin altında. (`src/ui/parts.ts`, `onboarding.ts`, `results.css`)
- **Performans (ölçülen):** boşta kare/sn ≈ 0 (onboarding, ana ekran, koleksiyon, oyun); sekme açılışında stil hesabı 53/sn → 3/sn (ekran dışı döngüler durur, `src/platform/calm.ts`); masa kartları 52 canvas yerine tek atlas görseli + pişirilmiş gölge (çizim geçişi/kare 108 → 3, `src/table2d/table.ts`); parçacık havuzlarında zorlanmış stil hesabı yok (`src/platform/anim.ts`); ses motoru boşta kurulur (ilk dokunuş takılması yok); market/koleksiyon bir kez kurulur, önizlemeler kare başına bir tane, donmuş efekt küçük resimleri.
- **Ölçüm araçları:** `scripts/perf.mjs` (ekran başına boşta kare/boyama/stil), `scripts/jank.mjs` (geçiş/atış kare süreleri), `scripts/boot.mjs`. Gerçek telefonda henüz ölçülmedi (hepsi başsız Chromium + yazılım GL, 4× yavaş CPU).
- **Sonuç ekranı:** 4 kişi/eşli tablo artık kırpılmıyor (TOPLAM satırı görünür), 412×839, 360×640, 360×800, 393×873 boyutlarında doğrulandı.

**16 Ekim sabahı — "Tam paket" (sürüm 7):**
- **İlk açılış:** lamba yanar, Kahveci Dursun karşılar, hediye kutusu → kaydırmalı galeriden hikâyeli karakter seçimi (ücretsiz) → ad → hoş geldin. (`src/ui/onboarding.ts`)
- **Oyun:** 2/4 koltuk + eşli; karakter rozetleri 10 hâl (`assets/chars/`), büyük pişti kutlaması, değerli kart parıltısı, SERİ/SÜPÜRDÜ, son el, el sonu sayımı; pişti efektleri klasik/havai/yıldız/altın. (`src/table2d/`, `src/game/match.ts`, `src/ui/hud.ts`, `fx.ts`)
- **Market:** karakterler, desteler (Yıldızlı Gece, İznik Çinisi, Büyük Dalga, Ayçiçekleri), masalar (Mavi Arena, Yıldızlı Gece, Çini Salon, Kızıl Salon, Zümrüt Kadife), efektler, çerçeveler; günün teklifi; canlı önizleme. (`src/ui/shop.ts`, `src/skins/`, `src/themes/`)
- **Koleksiyon/Profil**, **Günlük Görevler** (3 görev + Günün Sandığı), N oyunculu VS ve sayarak akan sonuç ekranı, seviye atlama.
- Ekonomi ve kayıt: `src/game/profile.ts`. Katalog: `src/game/catalog.ts`. Karakterler: `src/game/roster.ts`.
- Test: `?auto=1` (+`&mode=4|esli`), `?seed=N`, `?reset=1`, `?skipintro=1`, `?q=low|mid|high`, `?idle=ms`, `?calm=0`; geliştirici sayfaları `dev/game.html`, `dev/screens.html` (ör. `?s=results&mode=4&anim=0`), `dev/skins.html`, `dev/themes.html`.
- Henüz yok / sıradaki: gerçek telefonda performans ölçümü, seslendirme (ElevenLabs anahtarı), çevrimiçi oyun, uygulamaya gömme (Adım 6).
