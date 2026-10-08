# Arazi (terrain) — kararlar

Sahip: terrain ajanı. Kaynak kod: `tools/bake-terrain.ts`, `tools/terrain/**`, `src/sim/terrain/**`,
`src/content/worlds.ts`, `src/content/worldConfig.ts`. Çıktılar: `public/worlds/<id>/`.
Yeniden üretim: `node tools/bake-terrain.ts` (tümü, ~8 dk, 4 çekirdekte iki süreçle ~4 dk) veya
`--world <id>`; ağ yoksa `--synthetic` (fBm + ridged, yalnız geliştirme). Karolar `.cache/tiles/`,
yavaş türetilmiş alanlar (AO, gölge, akış) `.cache/bake/` altında içerik anahtarıyla önbelleklenir.

## Veri kaynağı
- **Karar:** AWS Terrain Tiles terrarium; çekirdek **z=13** (~15 m/piksel), uzak halka **z=11** (~60 m/piksel; brif z=10
  diyordu, 96 m ızgara için z=10'un 119 m pikseli kaba kaldığından z=11 seçildi, indirme maliyeti ihmal edilebilir).
- URL ve atıf metni 2026-10-08'de doğrulandı; atıf `docs/credits/terrain.md`'de aynen.
- Yerel çerçeve: merkezde eşdikdörtgen ENU (x doğu, z güney), enlem/boylamdan tam Web Mercator piksel koordinatına,
  Catmull-Rom bikübik örnekleme. Ardından 3×3 binom süzgeç (yeniden örnekleme faz çizgilerini — hillshade'de yatay
  "tarak" izleri — siliyor; Karadeniz verisinde açıkça görülüyordu).

## Merkezler (scout hillshade önizlemelerine bakılarak; `--scout <id>`)
| Dünya | Merkez | Gerekçe |
|---|---|---|
| Kapadokya | 38.6508 K, 34.8415 D | Göreme'nin ~1,2 km KD'su: Aktepe sırtı + Kızılçukur/Güllüdere (Kızıl/Gül vadileri) çekirdeğe tam girdi; Göreme, Güvercinlik vadisi, Çavuşin ve Uçhisar da içeride. Brif merkezi Aktepe'yi kenarda bırakıyordu. |
| Likya | 36.2435 K, 29.4444 D | Kaputaş'ın 1,5 km K'si: çekirdeğin ~%45'i denizdi; kaydırınca Kalkan koyu, Kaputaş plajı/kanyonu, kıyı falezleri ve Bezirgan yamacı içeride, güneyde ~2,5 km deniz şeridi (guletler) kaldı. |
| Karadeniz | 40.9626 K, 41.1000 D | **Ayder seçildi** (Uzungöl değil): brifin kahraman prop'ları (şelale, yayla evi, yayla yolu, ladin) Ayder'e ait; Uzungöl ayrı bir göl su düzlemi (y≠0) gerektirirdi. Merkez 1,4 km K'ye kaydırıldı: güneyde ~1 km'lik SRTM boşluk-dolgu basamağı (yapay dik duvar) çekirdek dışında kaldı; D-B uzanan derin vadiler ve sırtlar ortada. |
| Erciyes | 38.5300 K, 35.4431 D | Zirve çekirdeğin ortasına gelsin diye ~600 m B'ye kaydırıldı; doğudaki buzul vadisi ve GD lav akıntıları içeride. |
| Pamukkale | 37.9272 K, 29.1314 D | ~1 km D / 0,8 km K: traverten yamacı + Hierapolis platosu + arkadaki oyuklu tepeler; batıdaki Çürüksu ovası iniş alanı ve gün batımı manzarası. Traverten yaması 37.9214 K, 29.1200 D. |

## Dikey ölçek
Kapadokya 1,15 (brif), Likya 1,10, Karadeniz 1,00, Erciyes 1,00 (zirve testi ve gerçeklik), Pamukkale 1,20.
CREDITS'te "sanatsal abartı" olarak belirtildi.

## Izgaralar ve dosya biçimi
- Çekirdek 1024² @ 8 m, örnekler hücre merkezinde: `originX = originZ = -4092`, doku kapsamı tam **[-4096, 4096]**
  (tüm çekirdek dokuları için `uv = (x + 4096) / 8192`). Uzak 512² @ 96 m, kapsam [-24576, 24576].
  Maskeler 512² @ 16 m (aynı kapsam). Pamukkale yaması 1024² @ 1 m (HeightGrid sözleşmesi kare olduğu için
  1024×640 m teras alanı kare yamanın içinde; yama kenarı çekirdek bilineer yüzeyine birebir oturur).
- Görüntü satırı 0 = kuzey (min z). ImageBitmap'ler `flipY=false` ile yüklenmeli.
- `*.u16.z`: Uint16 nicemleme (min/max `world.json`'da, mm'ye yuvarlı), 2B delta (sol+üst−sol-üst; ilk satır/sütun
  yalnız sol/üst — brifin "satır-delta"sının genellemesi), bayt düzlemleri (önce düşük baytlar), raw DEFLATE (fflate).
  Çözüm: `src/sim/terrain/decode.ts` (saf, Node+tarayıcı).
- Çekirdek → uzak birleşimi: 256 m yumuşak bant. Uzak ızgaranın çekirdek içindeki örnekleri çekirdekten (48 m
  kutu süzgeçli) alınır; çekirdeğin dış 256 m bandı uzak yüzeye doğru karışır, kenarda **uzak bilineer ile eşit**
  (dikiş yok; fark yalnız iki ızgaranın nicemleme hatası, < 3 cm). Oynanabilir sınır = çekirdek − 320 m.
- Kaya maskesi çekirdek ızgarasıyla hizalı u8 (`rock_core.u8.z`, ayrıca `shadow_ao.png` A kanalı); dış 64 m'de 0'a
  iner → D(x,z) çekirdek kenarında sürekli.

## Oynanış yüzeyi H(x,z)
- `H = base_bilinear + D`, D = 2 oktav value noise × kaya maskesi; a = [1,2; 0,5] m, dalga boyu [24; 9] m.
- Hash: `Math.imul` + xor + kaydırma (uint32 aritmetiği V8/JSC/GLSL ES 3.0'da birebir), indeksler +65536 kaydırılır
  (GLSL'de negatif int→uint dönüşümü belirsizliğine girmemek için). İnterpolasyon yalnız + − × ÷.
  GLSL eşleniği `src/sim/terrain/detailNoise.glsl.ts` (`TERRAIN_GLSL`); float32 öykünmesiyle fark < 1 mm (test).
- 3,5 m'lik 3. oktav yalnız normal detayı (`kanatDetailSlope`), çarpışmaya girmez.
- `slopeDeg` için `Math.atan` yerine yalnız + − × ÷ kullanan deterministik `atanPositive` (hata < 1e-8 rad).

## Erozyon
- Damla tabanlı (Beyer/Lague), sabit tohum, 160k–220k damla, ~1–4 s/dünya (zaman kutusu 120 s; aşılmadı).
  Yükseklik hücre biriminde (h/8 m) işlenir. Fırça yarıçapı 4, atalet 0,25, birikim hızı 0,12 (teraslanma "dalgacık"
  izlerini azaltmak için düşük), değişim −10…+3 m ile sınırlı, 3×3 yumuşatılmış, kenarda 40 hücrede söner.
  Likya'da deniz seviyesinin (1,5 m) altı aşınmaz (kıyı çizgisi korunur).

## Deniz (Likya)
- Kaynakta deniz ≈ 0 m ve kıyıda ±6 m SRTM gürültüsü var (dama tahtası kıyı). Karar: büyük bağlı alçak bileşen = deniz,
  yumuşatılmış işaretli kıyı mesafesinden dik bir Likya şelfi üretilir (`tools/terrain/coast.ts`; ~300 m açıkta ~40 m,
  en çok 380 m); kara tarafında kıyıya yakın ≥0,5 m. Deniz y=0, negatif = batimetri.

## Dokular ve ışık
- `normal_core.png` RGB8 (R,G = oktahedral y-yukarı; B kullanılmaz), `splat_core.png` RGBA8 (51 seviye, toplam 255),
  `shadow_ao.png` RGBA8 (R: güneş gölgesi, G: AO, B: oyukluk 32 seviye, A: kaya maskesi). **Palet PNG yasak**:
  sharp'ta `effort` paleti açıyordu (render ajanının hata raporu) → `palette:false`, testle korunuyor.
- Güneş gölgesi: güneş yönünde büyüyen adımlı ufuk yürüyüşü (çekirdek dışına uzak ızgarayla devam, 16 km),
  yumuşak yarı gölge (alçak güneşte 2,2°, diğerlerinde 1,5°). Karadeniz "dağınık güneş" → gölge gücü 0,45.
- AO: 12 yön × 18 adım, 900 m ufuk. Oyukluk: 16 m ölçekli konvekslik.
- `color_macro` 2048² (4 m/texel) **önceden aydınlatılmış**: albedo × (güneş·gölge·B(N·L) + gök/gölge tonu·AO).
  Gölge içindeki dolgu rengi dünya başına (Kapadokya mor #6B4E5E, Erciyes mavi #A9C2E0, Pamukkale lavanta #9AA7C7)
  yalnız güneşin ulaşmadığı yerde karışır. Tam formül ve sabitler `world.json → bakeLighting`.
- Boyalar (`tools/terrain/paint.ts`): eğim, yükseklik, konvekslik, çok ölçekli akış (vadi tabanı genişliği log akışla
  büyür), kıyı mesafesi, bakı ve dünya maskeleri. Tarlalar: Voronoi bloklarına bölünmüş, blok başına yönlü şerit tarlalar.
- `color_macro.ktx2`: ETC1S + mip (ktx2-encoder) — web derlemesi KTX2, tek-dosya derlemesi WebP kullanır.
- Boyut: dünya başına toplam ~4–4,6 MB (KTX2 ve WebP birlikte); bir derleme yalnız birini taşıdığından derleme başına ≤ ~4 MB.

## Referans testleri (9.G-2) ve kaynakları
- Erciyes çekirdek max 3.861 m (gerçek 3.917 m, Wikipedia) → ±100 içinde.
- Likya: Kaputaş plajında (36.2297 K, 29.4495 D) kıyı geçişi 250 m içinde, 2 km açıkta < −20 m.
- Karadeniz: Ayder "ortalama 1.350 m" (en.wikipedia.org/wiki/Ayder; Rize ÇŞİM raporu "1350 metre rakımda").
  Koordinat dakika hassasiyetinde olduğundan 900 m yarıçapta eğimi < 20° olan arazinin medyanı karşılaştırılır.
- Pamukkale: traverten oluşumu "160 m yüksek" (en.wikipedia.org/wiki/Pamukkale); Hierapolis (37°55′30″K 29°07′33″D)
  ile batıdaki ova tabanı arasındaki fark ±60 m.
