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

**16 Ekim (gece):** Yön yeniden değişti → **PİŞTİ ARENA** (UNO kalitesinde modern, canlı, hızlı). Ayrıntı: `docs/STIL_ARENA.md`. Önizleme (sürüm 5): https://claude.ai/artifact/AGD4e3sw2ecT2Z6NqwoTro
- 3D masa (Three.js) oyundan çıktı; yerine hızlı 2B masa: `src/table2d/` (WAAPI, yalnız transform/opacity). Paket 5.2 MB → 2.4 MB.
- Deste: **Yıldızlı Gece** (Van Gogh esintili, karaktersiz; Papaz=hilal ay+taç, Kız=yıldız+taç, Vale=servi). `src/skins/yildizli.ts`; atlas `src/render/skinAtlas.ts`. Yeni satılık deste = yeni Skin dosyası (`src/skins/contract.ts`). Eski dört renk deste `src/render/cardAtlas.ts` kullanılmıyor. Diğer denenmiş tarzlar: `dev/skins/` (reddedildi).
- Tüm ekranlar Arena dilinde (lobi, giriş, HUD, PİŞTİ efekti, sonuç, pencereler), kod ile çizilmiş yeni logo.
- Oynanış: tek dokunuş (veya yukarı kaydırma) ile kart atma, alan kartlar parlar, hızlı tempo, her atışta renkli halka + kıvılcım.
- Eski 3D kodu (`src/render/stage.ts`, `env.ts`, `cards.ts`, `input/hand.ts`, `game/table.ts`) depoda duruyor ama oyunda kullanılmıyor.
- Test: `?auto=1` kendi oynar, `?seed=2` erken pişti.
- Sıradaki: kullanıcı geri bildirimi; seslendirme; 4 kişilik mod.
