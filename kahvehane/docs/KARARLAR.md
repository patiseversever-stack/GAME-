# Kahvehane — Kararlar (yaşayan belge)

Yeni oturum bu dosyayı okuyup devam edebilsin diye tutulur.

## Ürün
- Telefonda yatay, 3D, premium his veren **Pişti**. Sonra aynı çatı altında **Blöf**, en son **Batak**.
- Expo React Native uygulamasına `react-native-webview` içinde gömülü web oyunu (Three.js). Haberleşme `postMessage`.
- Sadece sanal jeton. Gerçek para / nakde çevirme yok.
- Önce yapay zekâ rakipler, mimari online'a hazır (oyun kuralı saf TS, sunucuda da koşabilir).
- Kitle: herkes → büyük yazı, sade arayüz, hem fırlatma hem iki dokunuşla oynama.

## Oyun
- Klasik Pişti puanı: Pişti 10, Vale ile pişti 20, her As/Vale 1, ♣2 = 2, ♦10 = 3, en çok kart +3.
- Modlar: **1'e 1**, **4 kişi tekli** (herkes kendine), **4 kişi eşli** (2'ye 2, karşılıklı ortak).
- **Oyun uzunluğu (17 Ekim; `src/game/series.ts`):** Tek El · 51 · 101 · 151. Eller art arda dağıtılır, el puanları (kart puanları + pişti 10 /
  vale pişti 20 + çoğunluk 3) toplanır; eşlide takım, 4 kişide herkes kendi toplamı. Dağıtan her el bir sonraki koltuğa geçer (ilk eli insan açar).
  Bir elin sonunda biri hedefe ulaştıysa maç o elde biter, **en yüksek toplam** kazanır; en yüksekte **eşitlik → bir el daha** (uzatma eli,
  eşitlik bozulana dek; 40 el güvenlik sınırında pişti puanı, o da eşitse berabere). Tek El'de eşitlik beraberliktir (bugünkü gibi).
  Bahis maç başına bir kez; ödül çarpanı 51 ×1,5 · 101 ×2 · 151 ×2,5 (Blöf kuralları ve ortak ekonomi: `BLOF.md` "Oyun uzunluğu").
  Ortalama el sayısı (bot simülasyonu, 200 maç): 1'e 1 ve eşli 51 ≈ 3,6 · 101 ≈ 7 · 151 ≈ 10,4; 4 kişi 51 ≈ 5,8 · 101 ≈ 12,4 · 151 ≈ 19 el.
- Bakış: birinci şahıs, oturan oyuncunun gözünden, göz hizasının biraz üstü (~45°).
- Eller görünür: sol el kartları yelpaze tutar (4 kart + başparmak), sağ el kartı alır, kol ortaya uzanıp bırakır/çarpar.
- Rakipler karşıda 3D (bel üstü), tepkili, komik.
- Arkadan akıl veren seyirci ("yancı") + kahvehane ortam sesi.
- Pişti hareketi (masaya vurma vb.) görev/mağazadan açılır. **Sadece gösteriş**, puana/oyuna etkisi yok. Online'da en fazla 2 sn, rakip susturabilir.

## Görsel tarz
- "Arası": gerçekçi ışık ve malzeme (ahşap, çuha, kumaş, ten) + karaktere göre değişen abartı.
- Abes durmaması için: hepsi aynı ışık, aynı renk paleti, aynı render dili; abartı seviyesi bir bant içinde.
- Eller karakterin tarzına uyar. Oyuncunun eli seçilebilir "el görünümü" (yüzük, tesbih, dövme...).

## Performans bütçesi
- Sahne ~60k üçgen (düşük seviyede ~30k), ~10 draw call.
- Pişmiş ışık, gerçek zamanlı gölge yok, sahte yumuşak gölge.
- Karakter 10–15k üçgen, tek doku (1024, düşükte 512), KTX2 + meshopt GLB.
- Uzak kahvehane = tek resim. Kart/masa/jeton kodla.
- 3 kalite seviyesi + FPS düşünce otomatik çözünürlük düşürme. Boştayken çizim durur.

## Varlık üretimi
- Meshy: karakterler, eller, semaver, çay bardağı, tespih, kül tablası.
- Ağ: api.meshy.ai ve api.elevenlabs.io bu ortamdan erişilebilir (anahtarsız 401).
- Anahtarlar ortam ayarlarına gizli değişken olarak eklenir: `MESHY_API_KEY`, (ses için) `ELEVENLABS_API_KEY`. Sohbete yapıştırılmaz.
- Karakter adayları ve promptları: `karakterler.md`. Görseller: `konsept/`.
- **Seçilen karakterler:** 1 Rıza Amca, 7 Cem, 8 Kahveci Dursun, 10 Defne. (4 kişilik masada 3'ü oynar, 4.'sü çay servisi yapan seyirci olur.)
- **Mekân:** A — Eski İstanbul kahvehanesi (ahşap panel, İznik çini, eski fotoğraflar, pirinç semaver).
- **Oyuncu elleri:** 1 — gerçekçi (damarlı, hafif kıllı, kehribar tespih).
- Model sayfaları (A-poz, ön/yan/arka) üretildi: `konsept/_model_sayfalari.jpg`.
- 3D yöntem denemesi (Rıza Amca): A = multi-image Meshy 7.1 (30 kr), B = Smart Topology t2.5 (15 kr). İkisi de ~15k üçgen, 2K doku. Kullanıcı: yüz detayı yetersiz.
- Öncelik: **üst gövde ve yüz kalitesi** (oyunda en çok görünen kısım).
- Sorunun kaynağı: girdi görselde yüz çok küçüktü (~60 px). Çözüm: yüksek çözünürlüklü tek ön görsel (896x1200) + 4K doku + normal map.
- Tur 2 (`konsept/_riza_yuz_tur2.jpg`): **D = Meshy 7.1 image-to-3d, geometry 2k, 4K doku + PBR, remesh yok (664k üçgen) → gltf-transform weld+simplify ile 30k'ya** en iyi sonuç (ham modelle neredeyse aynı). Karakter başı ~44 kredi (9 görsel + 35 model).
- Düşük seviye cihaz için aynı modelden ~12k üçgen + küçültülmüş doku (LOD) üretilecek.

## Yüz ifadeleri
- Meshy yüz ifadesi/yüz iskeleti üretmiyor (yalnız gövde iskeleti).
- Kendi kurduğum 3D ifade altyapısı (`tools/build_rig.py`: MediaPipe yüz noktaları → morph hedefleri, çene ayrımı, göz kapağı/bakış kabuğu) denendi: kaş ve göz idare ediyor, ağız açma yapay. Kullanıcı beğenmedi → **durduruldu**.
- Alternatif deneme: **tepki kartları** (karakterin duygulu 2B görseli, oyunda 1-2 sn beliren kart). `konsept/_riza_tepki_kartlari.jpg`. Karar bekleniyor.

## Optimizasyon hattı (`tools/`)
- `decimate.mjs`: kafa + eller öncelikli sadeleştirme (meshoptimizer).
- `bake.py`: xatlas ile yeni doku haritası (kafa ~%45 pay), yüksek modelden ışınla renk + normal aktarımı.
- `assemble.mjs`: GLB üretimi. Rıza: 664k → 29k üçgen, 2K doku, görsel fark çok az.

## Ses
- Karakter replikleri: ElevenLabs (Türkçe, duygu etiketleri) ile üretim önerildi; ana karakterler ileride gerçek seslendirmenle yapılabilir.
- Ortam sesi: gerçek kahvehane kaydı veya lisanslı paket.

## Durum
- Kod yazılmadı. Kullanıcı önce konuşmak istedi.
