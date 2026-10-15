# KAHVEHANE — Finale kadar yol haritası (PHASES)

> **Yeni oturuma not:** Bu dosyayı ve `KARARLAR.md`'yi oku. "📍 KALDIĞIMIZ YER" bölümünden devam et.
> Repo: `patiseversever-stack/GAME-` · Çalışma dalı: `ccr-eb47d428-2tlc90` · Proje klasörü: `kahvehane/`

---

## 0. Proje özeti

- **Ne:** Telefonda **yatay** oynanan, 3D, premium hissiyatlı **Pişti**. Sonra aynı "Kahvehane" çatısı altında **Blöf**, en son **Batak**. Masa, kartlar, karakterler ve jeton ekonomisi ortak.
- **Nerede:** Kullanıcının **Expo React Native** uygulamasına (iOS + Android) `react-native-webview` içinde gömülecek web oyunu. Haberleşme `postMessage` ile.
- **His hedefi:** "Milyon dolarlık şirket yapmış" hissi. Bu his poligondan değil **oyun hissinden** gelir: parmakla fizikli fırlatma, pişti anında yavaş çekim + kamera sarsıntısı + titreşim, kaliteli sesler, komik rakip tepkileri.
- **Kitle:** Herkes (gençten yaşlıya). Büyük yazı, sade arayüz, hem fırlatma hem iki dokunuşla oynama.
- **Para:** Sadece **sanal jeton**. Gerçek parayla bahis ya da nakde çevirme yok. Jeton satılırsa oyun "simüle kumar" sayılır ve yaş sınırı 17+ olur. Bu karar 5. adımda verilecek.
- **Viral hedef:** Türkiye'de viral olacak kalite. Düşük cihazda takılmadan, iyi cihazda kusursuz.

## 1. Kesinleşmiş kararlar

| Konu | Karar |
|---|---|
| Teknoloji | Three.js (WebGL) + TypeScript + Vite. Unity/Unreal yok. Tek dosya HTML çıktısı (`npm run build:tek`). |
| Görsel tarz | "Arası": gerçekçi ışık ve malzeme + karaktere göre değişen hafif karikatür. Abes durmaması için ortak ışık, palet ve render dili. |
| Kurallar | **Klasik Pişti:** pişti 10, vale ile pişti 20, her as ve vale 1, ♣2 = 2, ♦10 = 3, en çok kart +3 (eşitlikte kimse almaz). İlk açık kart vale ise desteye geri konur. Kalan yığın son alan oyuncuya gider. |
| Modlar | 1'e 1, 4 kişi tekli, 4 kişi eşli (2'ye 2). Koltuklar saat yönünün tersine: 0 alt (sen), 1 sağ, 2 üst, 3 sol. |
| Bakış | Birinci şahıs, oturan oyuncunun gözünden (göz hizasının biraz üstü). Kartlar okunurluk için gerçek boyutun ~2 katı. |
| Eller | Görünür. Sol el kartları yelpaze tutar, sağ el kartı alıp ortaya fırlatır. **Gerçekçi el** seçildi (konsept: `konsept/el_1_gercekci.jpg`). |
| Mekân | **A: Eski İstanbul kahvehanesi** (ahşap panel, İznik çini, eski fotoğraflar, pirinç semaver). |
| Karakterler | **Rıza Amca** (kibirli usta), **Cem** (öğrenci), **Kahveci Dursun** (önlüksüz; seyirci/4. oyuncu), **Defne** (poker yüzlü mimar). |
| Yüz ifadeleri | Meshy yüz ifadesi yapamıyor; 3D yüz bükme denemesi beğenilmedi. **Tepki kartları** seçildi: karakterin duygulu 2B görseli 1-2 sn belirir + gövde animasyonu + replik. 3D yüzde sadece göz kırpma, bakış ve kafa hareketi. İleride (oyun tutarsa) profesyonel yüz animasyonu yaptırılabilir. |
| Pişti hareketi | Görev/mağazadan açılır, **sadece gösteriş** (puana etkisi yok). Online'da en fazla 2 sn sürer, rakip susturabilir. |
| Seyirci | Arkadan akıl veren "yancı" sesleri + Kahveci Dursun. |
| Ses | Şimdilik prosedürel (kodla üretilen). Seslendirme: ElevenLabs (Türkçe, duygu etiketleri). Anahtar ortam değişkeni `ELEVENLABS_API_KEY` olacak. Ana karakterler ileride gerçek seslendirmenle yapılabilir. Ortam sesi: gerçek kahvehane kaydı veya lisanslı paket. |
| Online | En sona. Kural motoru saf ve deterministik yazıldı, aynen sunucuda koşar. |
| Gömme | 7. adımda kullanıcıyla birlikte. O zamana kadar oyun HTML linkiyle test edilir. |

## 2. Performans kuralları (her adımda geçerli)

- **Gerektiğinde çiz:** Hiçbir şey hareket etmiyorsa kare çizilmez (`Stage.invalidate`). Boşta GPU uyur.
- 52 kart **tek InstancedMesh** (1 çizim çağrısı), gölgeler 1 çizim çağrısı. Sahne toplamı ~10-15 çizim çağrısı.
- Oyun döngüsünde **bellek ayırma yok** (havuzlar, tekrar kullanılan vektörler). Takılma yaratan çöp toplama tetiklenmez.
- Pişmiş ışık ve sahte gölge, gerçek zamanlı gölge yok. Tek spot lamba + yarımküre + kontur ışığı.
- **3 kalite seviyesi** (`src/quality.ts`): düşük/orta/yüksek. GPU adına göre otomatik, `?q=low|mid|high` ile zorlanabilir. Animasyon sırasında kare süresi uzarsa çözünürlük otomatik düşer.
- Karakter bütçesi: ~30k üçgen (yüksek), ~12k (düşük); 2K doku (yüz %45 pay), KTX2 + meshopt ile paketleme.
- Uzak mekân tek resim. Masa, kart ve jeton kodla üretilir.

## 3. Adımlar (final = Pişti v1.0 mağazada)

### ✅ Hazırlık (bitti)
- [x] Kararlar, karakter seçimi (10 aday → 4), mekân, el stili
- [x] Meshy ile 4 karakterin 3D modeli (yöntem D: image-to-3d Meshy 7.1, 4K doku + PBR)
- [x] Optimizasyon hattı: `kahvehane/tools/` (`decimate.mjs`, `bake.py`, `assemble.mjs`). Rıza: 664k → 29k üçgen, 2K doku, görsel kayıp çok az.
- [x] Tepki kartı denemesi (Rıza: kahkaha, kızgın, şaşkın, üzgün)

### 🔨 Adım 1: Oynanabilir masa + kahvehane odası  ← ŞU AN
- [x] Proje iskeleti: `kahvehane/game` (Vite + TS + Three.js + vitest)
- [x] Kural motoru (`src/core/pisti.ts`): 2/4 kişi + eşli, saf/deterministik. 46 test geçiyor.
- [x] Bot (`src/ai/bot.ts`): hafıza, risk hesabı, kişilik. Rastgele oyuncuya karşı %79.
- [x] Zaman/yavaş çekim sistemi, kalite seviyeleri, sahne (gerektiğinde çiz), masa/çuha/ahşap, arka plan, lamba, çay bardakları
- [x] Kart sistemi (instanced, uçuş fiziği, gölge)
- [x] El girişi (parmakla çek-fırlat, iki dokunuş)
- [ ] Kart tasarımı atlası (ajan: Opus): 52 yüz + kart arkası (bordo-altın)
- [ ] Prosedürel sesler (ajan: Sonnet)
- [ ] HUD: rakip paneli, jeton, tepki kartları, PİŞTİ afişi, başlangıç ve bitiş ekranı, ayarlar
- [ ] Sunum ve oyun akışı: karıştırma, dağıtım, oynama, toplama, pişti yavaş çekim + sarsıntı + titreşim + kıvılcım
- [ ] Otomatik oyun testi (Playwright), ekran görüntüleri, tek dosya HTML → kullanıcıya link
- **Kabul ölçütü:** Telefonda link açılır, Rıza Amca'ya karşı baştan sona oyun oynanır, pişti anı "vay be" dedirtir, takılma yok.

### Adım 2: Rıza Amca masada + eller + masa eşyaları
- [ ] Meshy rig (5 kredi) + animasyonlar (~8 × 3 kredi): oturma/bekleme, kart tutma, kart atma, masaya vurma, kahkaha (gövde), kafa sallama, çay içme, düşünme
- [ ] Oturma pozu ve masaya yerleşim, kart tutan eller (rakibin eli kartları tutar)
- [ ] Göz kırpma + bakış + kafa takibi (göz kabuğu tekniği hazır: `tools/build_rig.py`)
- [ ] Tepki kartları oyunda (Rıza için 6-8 duygu, kullanıcı seçer)
- [ ] **Oyuncunun gerçekçi elleri:** sol el yelpaze tutar, sağ el kartı fırlatır (Meshy: sabit pozlu el modelleri, kol hareketi kodla)
- [ ] Masa eşyaları (Meshy, smart topology ~15 kr): semaver, tespih, kül tablası, şeker kâsesi
- [ ] Doku sıkıştırma (KTX2) + LOD paketleme

### Adım 3: Diğer karakterler + 4 kişilik modlar
- [ ] Cem, Dursun, Defne: optimizasyon (`tools/`), rig, animasyon, tepki kartları
- [ ] 4 kişi tekli ve eşli masa düzeni, kamera, sıra göstergesi, eşli puan ekranı
- [ ] Rakip seçme ekranı (karakter kartları)
- [ ] Seyirci: Kahveci Dursun dolaşır, çay getirir, laf atar

### Adım 4: Ses
- [ ] ElevenLabs ile her karakter için 40-50 replik (duygulu), yancı sesleri
- [ ] Kahvehane ortam kaydı ve müzik (hafif, nostaljik)
- [ ] Ses karışımı, yavaş çekimde ses efekti

### Adım 5: İlerleme ve mağaza (sanal)
- [ ] Jeton ekonomisi, masa bahisleri (100/500/1000…), günlük ödül, görevler
- [ ] Pişti hareketleri (kozmetik): masaya şaplak, kartı öpüp çarpma, tespihle şaklatma, çay kaldırma, davul-zurna
- [ ] El görünümleri (yüzük, tespih, dövme…), kart arkası desenleri, masa çuhası renkleri
- [ ] Karar: jeton satılacak mı? (17+ etkisi)

### Adım 6: Cila ve performans
- [ ] Gerçek düşük cihaz testleri (3-4 GB RAM Android), kalite ayarları, yükleme süresi
- [ ] Menüler, "nasıl oynanır" eğitimi, erişilebilirlik (büyük yazı modu)
- [ ] Hata avı, kenar durumları, arka plana alma/geri gelme

### Adım 7: Uygulamaya gömme (kullanıcıyla)
- [ ] Expo bileşeni: `react-native-webview`, `expo-haptics`, `expo-screen-orientation` (yatay kilit)
- [ ] Köprü mesajları: `init` (kullanıcı, jeton), `haptic`, `match:end`, `exit`, `pause/resume` (`src/platform/bridge.ts` hazır)
- [ ] Yerel dosya mı CDN mi kararı, çevrimdışı çalışma

### Adım 8: Test ve yayın
- [ ] Kapalı test (TestFlight + Play iç test), geri bildirim, düzeltmeler
- [ ] Mağaza görselleri ve video, yaş derecelendirmesi

### Finalden sonra
- 9. **Online:** sunucu (kural motoru aynen), eşleştirme, arkadaşla oyun, sohbet/emote
- 10. **Blöf**
- 11. **Batak**

## 4. Varlıklar ve kayıtlar

- Konsept görseller: `docs/konsept/` (karakterler, mekânlar, eller, model sayfaları, tepki kartları)
- Promptlar: `docs/karakterler.md`, `docs/konsept/promptlar-*.json`
- Ham 3D modeller (meshopt sıkıştırılmış): `assets-src/karakterler/*_ham_meshopt.glb` · oyun sürümü: `riza_oyun_30k.glb`
- Meshy görev kimlikleri (API ile tekrar indirilebilir, saklama süresi sınırlı olabilir):
  - Rıza 3D (D): `01a13fcf-098f-719b-9044-348d48d2dc93`
  - Cem 3D: `01a13fd7-51cd-72cf-a489-1458cb4451f8`
  - Dursun 3D: `01a13fd7-5d50-71a7-ac1e-9a7f4498e446`
  - Defne 3D: `01a13fd7-69b3-73fc-ba86-bb07807a9295`
  - Rıza konsept: `01a13fb8-1958-722c-b874-b3e1ff5eed8c` (tepki kartları bunun üzerinden image-to-image)
  - Cem/Dursun/Defne konsept: `01a13fb8-235a-73ea-a0e7-03c64d1b5ad5`, `01a13fb8-24e4-7068-9a83-0bc185864e1d`, `01a13fb8-27e1-76af-9624-07d92856348f`
- Meshy kredisi (15 Ekim 2026 itibarıyla): ~241. Aylık yenilenme: 25 Ekim.
- Araçlar: `tools/meshy_img.py`, `tools/meshy_3d.py` (anahtar `MESHY_API_KEY` ortam değişkeninden okunur, **asla dosyaya yazılmaz**)

## 5. Çalışma şekli

- Türkçe konuş, kullanıcı mobilde, açıklamalar kısa.
- Her üretilecek şeyi **seçenekli** sun, kullanıcı seçsin.
- **Sürekli görsel gönder.** Her adımın sonunda oynanabilir HTML linki ver.
- Ajanlar: önemli işte Opus, rutin işte Sonnet (kalite düşmeden). İlerlemeyi ara ara tabloyla bildir.
- API anahtarları sohbete yazılmaz; ortam ayarlarına gizli değişken olarak eklenir. (Not: Meshy anahtarı bu oturumda sohbete yazıldı → iş bitince Meshy'den yenilenmeli.)

## 📍 KALDIĞIMIZ YER

**Adım 1 sürüyor** (15 Ekim 2026). Bitenler: kural motoru + bot + testler, sahne motoru, masa/ortam, kart sistemi, el girişi. Sürenler: kart tasarımı (ajan), sesler (ajan), HUD, oyun akışı, test, HTML linki.
