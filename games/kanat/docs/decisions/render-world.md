# render-world — Karar günlüğü

Sahip: render-world (Sanat Yönetmeni + Baş Teknik Sanatçı). Kod/yorum İngilizce, bu belge Türkçe.
Kaynaklar: `docs/BRIEF.md` §1, §2.3, §2.4, §3, §4.1, §4.G.2–3, §5, §9.4, §9.G. Uygulanmış sanat kitabı: `docs/ART_BIBLE.md`.

## Mimari

- **Karar:** Tüm render-world kodu `src/render/**` altında; WebGL'e dokunan her şey `Renderer.ts` içindeki `KanatRenderer` sınıfında (boyut, kademe, dinamik çözünürlük, derleme ısıtması, context lost/restored, `perf()`). — Gerekçe: §4.1 "renderer ince modülün arkasında" (ileride WebGPU Ultra yolu yalnız bu dosyayı değiştirir).
- **Karar:** Kademe sayıları `src/perf/tiers.ts`'den (platform) okunur; render'a özgü düğmeler `renderTierParams()` içinde türetilir (tek doğruluk kaynağı). — Gerekçe: tablo tekrarlanırsa sapma riski.
- **Karar:** `WorldRenderer` tek entegrasyon yüzeyi: `create / loadWorld / setSize / render / setTier / perf / bookmarks / drawBenchmark / rendererStats / rebuild / cloudImmersion / setFogOverride / captureFrame / setMenuLighting / dispose`. İmzalar artık sabit; yalnız ekleme yapılır.

## Atmosfer (paylaşılan API, `src/render/shaders/atmosphere.ts`)

- **Karar:** three'nin `fog_*` chunk'ları + `tonemapping_fragment` / `tonemapping_pars_fragment` global olarak değiştirildi. `fog: true` olan HER materyal (MeshStandard dahil) KANAT yükseklik sisini alır. Sis, ton eşlemeden ÖNCE (doğrusal HDR) uygulanır (`tonemapping_fragment` içinde; ton eşleme parçası olmayan shader'larda `fog_fragment` yedek). — Gerekçe: three'de sis ton eşleme+sRGB'den sonra karışıyordu; Düşük kademede (ton eşleme malzemede) bu yanlış renk verirdi.
- **Karar:** Paylaşılan uniform değerleri `Float32Array`. three `cloneUniforms()` three-nesnesi olmayan değerleri referansla kopyaladığı için ShaderLib'e enjekte edilen diziler tüm yerleşik materyallerde ortak kalır; `setAtmosphere()` yerinde yazar. Tüm uniform'lar "sıfır = nötr" tasarlandı (bağlanmamış bir materyal kararmaz, sadece sissiz/gradesiz kalır).
- **Karar:** Analitik integral kararlı "ortalama yoğunluk" formunda: `τ = a·t·(e^{-b h0} − e^{-b h1}) / (b (h1 − h0))`, üsler ±80'e kenetli. İlk sürüm `e0·(1−e^{−k})/k` idi; yüksek kameradan aşağı bakışta `0·∞ = NaN` verdi (siyah ekran, ekran görüntüsüyle bulundu) → düzeltildi.
- **Karar:** Gökyüzü modeli = **sanat yönetimli analitik model** (palet duraklı zenit/orta/ufuk + güneş tarafı kama + Preetham benzeri ufuk parlaması + HG g=0,76 aureole). Hillaire LUT'ları REDDEDİLDİ. — Gerekçe: (1) brif her dünya için hex paletleri veriyor ve "64×64 küçük resimden paletle ayırt edilme" testi var → palet kilitli olmalı; (2) aynı fonksiyon sis renginde her fragment'te ucuzca değerlendirilebiliyor → ufukta sis/gök dikişi matematiksel olarak sıfır; (3) Hillaire her sisli materyalde LUT örneklemesi gerektirirdi (Düşük kademe için pahalı). Fiziksel tutarlılık için palet renkleri gök renk sıcaklığıyla %12 tonlanır.
- **Karar:** Gökyüzü yüklemede bir kez 256² HalfFloat cubemap'e çizilir (+ufuk bandının üstünde resimsel sirüs) → arka plan kubbesi, PMREM (Orta+ prop IBL) ve SH. SH, GLSL fonksiyonunun CPU ikizinden (`skyRadiance`) 768 Fibonacci yönüyle hesaplanır (GPU okuması yok, context restore'da da çalışır); alt yarıküre = zemin albedo × (güneş + gök) yansıması.
- **Karar:** Kubbe opak listede en sona (renderOrder 1e6) ve `z = w` ile uzak düzleme çizilir → arazi early-Z ile gizli gök piksellerini eler (Düşük'te fill tasarrufu). Kubbe üçgen dither'lıdır (bant yok).
- **Karar:** Kademe görüş mesafesinde sis "tam gök rengine" karışır (`kFogFade`); düğümler bu mesafenin ötesinde çizilmez. Uzak halka 49 km olduğundan ve oynanış alanı ±3,8 km olduğundan kenar en yakın ~20,5 km'de → brif kuralı (uzak halka ≥ 1,3 × sis mesafesi) için **görüş mesafesi tüm kademelerde ≤ 15,5 km** (Düşük 12 km). Yüksek 25 km / Ultra 40 km hedefi veriyle mümkün değil; daha büyük uzak halka bake edilirse `MAX_VIEW_DISTANCE` yükseltilir.
- **Karar:** Bulut içi (Karadeniz): kamera bandın içindeyken `setCloudInside()` sis rampası + kubbe beyaza karışır, uzak impostor'lar gizlenir; ek tam ekran katman yok (≤2 kuralı rahatça sağlanır). `WorldRenderer.cloudImmersion(x,y,z)` ses/HUD için aynı rampayı döndürür.

## Ton eşleme ve renk derecelendirme

- **Doğrulama:** three r186 `AgXToneMapping` VAR; postprocessing 6.39.5 `ToneMappingMode.AGX` (=7) VAR.
- **Karar:** İki yolda da three'nin AgX eğrisi birebir kullanılır: Düşük'te malzeme içinde (`renderer.toneMapping = AgXToneMapping`), Orta+'da kendi `KanatGradeEffect`imizin içinde (three r186 GLSL'inin kopyası). postprocessing'in AGX modu kullanılmadı. — Gerekçe: "Düşük ve Ultra aynı kare" kabulü (§3.6) için eğrilerin bit-düzeyinde aynı olması.
- **Karar:** AgX'e hafif bir "look" eklendi (sigmoid sonrası güç 1,15, doygunluk 1,22; Blender "Punchy"nin yumuşak hâli). Python'la palet kalibrasyonu yapıldı: düz AgX #F6C48E'yi #C9B299'a soldurup siyahları kaldırıyordu; Punchy (1,35/1,4) maviyi aşırı doyuruyordu (#3E5F8A → #0D5387). Ara değer seçildi; ikisi de her iki yolda aynı (`AGX_LOOK_GLSL`).
- **Karar:** Derecelendirme bloğu (lift/gamma/gain, kontrast, doygunluk, gölge/ışık ayrık tonlama, vinyet, gren+dither) tek GLSL fonksiyonu `kanatGradeFinish()`; Düşük'te `tonemapping_fragment` içinde, Orta+'da efektte çalışır. Parametreler dünya bakışından (`looks.ts`).
- **Karar:** Görünüm (gök paleti, sis yoğunluğu/rengi, grade) `src/render/looks.ts`'ten; geometri ve ışık yönü (güneş azimut/yükseklik/K, sis tabanı `fog.baseY`, zemin sisi tepesi, bulut denizi bandı, su seviyesi) `world.json`'dan. — Gerekçe: makro renk haritasındaki pişmiş gölgelerin güneş yönüyle birebir aynı kalması şart; görünüm ise ekran görüntüsüne bakılarak sanat yönetmeni tarafından ayarlanır. `world.json.grading` şimdilik okunmuyor (ARAYÜZ İSTEĞİ: terrain ajanı `looks.ts` değerlerini aynalasın ya da alanı kaldırsın).

## Post (Orta+)

- **Karar:** Tek `RenderPass` + tek birleşik `EffectPass`: [FXAA (Orta) | SMAA (Yüksek+)] → Bloom (mipmapBlur, eşik 1,0, yoğunluk 0,45; Orta'da yarım çözünürlük/4 seviye) → KanatGrade (god rays + AgX + grade + vinyet + gren). God rays ayrı geçiş DEĞİL: bloom mip dokusunun güneşe doğru 14 örneklik radyal bulanıklığı (oklüzyon zaten bloom'da), yalnız Yüksek+ ve güneş ekrandayken. DOF yalnız Ultra + Foto Modu'nda ayrı ikinci EffectPass (yalnız istenince var olur).
- **Karar:** `renderer.info.autoReset = false`, her karede `render()` başında sıfırlanır → composer'ın tüm geçişleri sayılır (aksi hâlde "1 çağrı / 1 üçgen" görünüyordu).

## Arazi (CDLOD)

- **Karar:** Tek quadtree tüm uzak halkayı (49 km) kapsar; vertex shader yüksekliği çekirdek (8 m) içindeyse çekirdekten, değilse uzak (96 m) gridden alır — CPU örnekleyicisiyle birebir aynı kural ve aynı `kanatGridBilinear` (terrain ajanının GLSL ikizi). **Tüm çekirdek+uzak arazi 1 draw call**; Pamukkale 1 m yaması ikinci CDLOD örneği (2. draw call), çekirdek yama alanında 0,5 m alçaltılır ve yamanın etekleri basamağı gizler.
- **Karar:** LOD0 aralığı 1,5 m (33² düğümde 48 m düğüm, 17²'de 24 m düğüm) — brifteki "2 m"den biraz sık; kök boyutu ikinin kuvvetiyle tam katlanabilsin diye (köşe koordinatları float32'de tam). Yamada 1,0 m ve LOD0 yarıçapı ×0,55 (üçgen sayısı sabit kalsın).
- **Karar:** Morf bölgesi menzilin %72–97'si (Strugar), yarıçap oranı 2. Çocuk alanı menzil dışında kalırsa çocuk boyutunda ama ebeveyn yoğunluğuna tamamen morflanmış örnek çizilir (çatlak yok). Seçim tamamen tipli dizilerle, kare başı tahsis yok; min/max yükseklik ızgaraları "min/max mip" yapısında (her sorgu ≤3×3 hücre).
- **Karar:** Ultra LOD0 yarıçapı tablodaki 450 m yerine **340 m**: 450 m'de Kapadokya yatay vista 1,34 M üçgen ölçüldü (Ultra tavanı 1,2 M, props dahil). Üçgen/seviye ∝ (R0/aralık)².
- **Karar:** Ultra'nın "+1 seviye derin" maddesi uygulanmadı: hesap (üçgen/seviye ≈ 0,94·(R0/aralık)²) 0,75 m'de ~2,7 M üçgen veriyor; Ultra 1,5 m / 450 m yarıçap ile ~540–790 k üçgende kalıyor.
- **Karar:** D(x,z) ayrıntı gürültüsü yalnız LOD0 halkasında ve morf faktörüyle sönerek eklenir (LOD0→LOD1 sınırında süreklilik). Kaya maskesi R32F + `texelFetch` bilinear (CPU ile aynı). 3,5 m'lik normal-oktavı analitik türevle (kanatDetailSlope) fragment'te.
- **Karar:** Malzeme tabanı = terrain ajanının **önceden aydınlatılmış makro renk haritası** (çekirdek 4 m/texel, uzak 48 m/texel) × kontrast gamması × pozlama; yakında yalnız yakın ayrıntının aydınlatma DEĞİŞİMİ oran olarak eklenir: `renk = makro × ayrıntıAlbedo × (L(N_ayrıntı)/L(N_taban)) × oluk AO`. — Gerekçe: makro uzak/yakın her mesafede aynı kaynaktan geldiği için 600 m'deki ayrıntı→makro geçişinde renk/ışık bandı oluşmaz; gerçek zamanlı albedo yeniden kurmak (bölme) gölge kenarlarında artefakt üretiyordu.
- **Karar (veri sorunu):** `shadow_ao.png`, `splat_core.png`, `normal_core.png` 256 renkli paletli PNG olarak yazılmış (sharp `effort:10` → `palette:true`), veri kanalları bozuk. Bu yüzden: güneş görünürlüğü + ufuk AO **GPU'da yüklemede yeniden pişirilir** (`ShadowBake.ts`, aynı yükseklik verisi ve aynı güneş), splat katman ağırlıkları katman türünden **otomatik semantik kurallarla** (düz/dik/orta/yüksek → katman eğilimi) türetilir, normaller yüksekliklerden hesaplanır. Producer'a bildirildi; düzeltilse bile render bu yoldan bağımsız çalışır.
- **Karar:** 4 katman ayrıntı dokusu indirilmez; GPU'da yüklemede **prosedürel, dikişsiz** üretilir (512² × 4 dizi, RGB albedo modülasyonu + A yükseklik, mipmapli): tüf, kaya, kuru ot, toprak, kar, traverten, orman zemini, kum. — Gerekçe: lisans/indirme riski yok, sıfır bayt asset, dünya başına ~1 MB×4. CC0 indirme yapılmadı (manifest girdisi yok).
- **Karar:** Projeksiyon: Düşük tek düzlem + dik yüzeyde dikeye dar bantlı geçiş; Orta biplanar (IQ); Yüksek/Ultra triplanar. Baskın katman iki uyumsuz ölçekte çarpılarak örneklenir (büyük ölçek +3 mip bias ile yalnız ton varyasyonu → tekrar ve dev çatlak deseni görünmez). İkinci katman ağırlığı "üçüncü ağırlık çıkarılarak" hesaplanır → katman sırası değişirken sıçrama yok. Düşük'te gölge/AO vertex'te → yakın fragment örneği ≤ 4 (makro + 2 baskın ölçek + 2. katman).
- **Karar:** Kapadokya imzası: (1) dünya-y tabanlı yatay tüf bantları (düşük frekanslı gürültüyle dalgalanan, gül tüf tonu), (2) **erozyon olukları** (dik tüf/kaya yamaçlarında eğim yönünde dar oluklar: normal + oluk AO). Oluklar her ışıkta (önden düşük güneşte de) AO ile okunur. `discard` yok.
- **Karar:** Etek: her düğüm 30 m, kök kenarında −600 m ufuk eteği. Hata ayıklama magenta modu etekleri ve arka planı macenta boyar (`?debug=magenta`, `?horizon=N`).

## Su

- **Karar:** Likya denizi opak, kameraya yapışık düz yüzey (polygonOffset ile kıyıda arazi kazanır); su altı görünümü shader'da batimetriden (aynı R32F ızgaralar): derinlik rengi, sığda görünen kum tabanı (makro renk, emilim), derinlikten kıyı köpüğü, 1–2 kayan prosedürel normal haritası (yüklemede GPU'da üretilir), Schlick Fresnel, gök cubemap yansıması, güneş parıltısı, Yüksek+ kostik. Derinlik rengi Düşük'te de açık (turkuaz kimliği Düşük'te de güzel olmalı). Ultra yarım çözünürlüklü düzlemsel yansıma YAPILMADI (süre).
- **Karar:** Pamukkale havuzları `water_patch.u16.z` ızgarasından (fetchAsset + `decodeHeightGrid`): su yüksekliği > yama arazisi ise yüzey, değilse 0,6 m aşağı itilir (derinlik testi gizler; discard yok). Sakin ayna: düşük pürüzlülükte gök yansıması + gün batımı parıltısı.

## Bulutlar

- **Karar:** 16 kümülüs sprite'ı yüklemede GPU'da 4×4 atlasa üretilir (R yoğunluk; G/B/A sol/sağ/üst ışığa geçirgenlik) → tek instanced billboard draw call, güneş yönüne göre shader'da aydınlatılır (+ arkadan aydınlatmada gümüş kenar), sisli. Soft particle uygulanmadı (bulutlar araziden çok uzakta; derinlik dokusu gerektirmemek için).
- **Karar:** Karadeniz bulut denizi: `world.json fog.cloudSea` bandında opak, vertex'te kabartılmış (billow gürültüsü ±60 m) üst ve alt yüzey → saydam overdraw yok, dağlar delip çıkar.

## Kameralar (`src/render/camera/`)

- **Karar:** `FollowCamera` brif §2.4'ü birebir uygular (80/20 yön karışımı, 4,2→6,0 m, +1,1 m, 0,35 s ileri bakış, kritik sönümlü yaylar ω=7/9 kesin çözümle — kare hızından bağımsız, yatış 0,5×≤35°, FOV portre 74→86°/yatay 48→58° ≤12°/s, 8 noktalı küre taraması + sert taban ≥1,5 m, "yakın plan" nüansı, Konfor, Kask, mesafe seçenekleri). Sarsıntı §2.3 kurallarıyla (yalnız d<7 m ve çarpma, 0,08 m/0,6°, ≤14 Hz, 0,25 s sönüm, 1,5 s üst sınır, reduceMotion/Konfor → 0).
- **Karar:** `ReplayDirector` olay tabanlı otomatik yönetmen (sıyırma → Sabit Zemin/Kaya Kenarı, kapı/ilmek → Telefoto, çarpma → Telefoto + Yörünge, boşluk → Telefoto/Drone), çekimler arası kesme, çekim içinde açısal hız ≤ 90°/s, ağır çekim 0,25–0,5× 0,3 s yumuşak geçişle, `highlight()` ≤8 s klip penceresi.
- **Karar:** `PhotoCamera` 6 filtreyi grade ön ayarı olarak uygular (`looks.ts PHOTO_FILTERS`), çıkışta grade'i geri yükler.

## Performans

- **Karar:** Düşük kademede arazi+gök+su+bulut ≤ 5 draw call ve ~25–60 k üçgen (ölçümler raporda). Program sayısı Düşük 5–8 (props hariç). Doku belleği ~59 MB (Pamukkale 67 MB) — hepsi dünya başına; dünya değişiminde `dispose`.
- **Karar:** `drawBenchmark(tier, mp)` PerformanceDirector sözleşmesine göre senkron tek kare çizer (en ağır yer imi). Kademeye özgü arazi shader varyantları yüklü kademede kalır (belgelenmiş yaklaşıklık); seçimden sonra `await setTier()` tam yeniden kurar.
