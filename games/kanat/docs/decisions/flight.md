# Uçuş simülasyonu — kararlar (flight ajanı)

Sahip: flight ajanı. Kod: `src/sim/**` (terrain/ ve replay/ hariç), testler `tests/unit/sim*.test.ts`, `tests/jsc/**`.
Kaynak: BRIEF §2.1–2.3, §2.5, §2.9–2.10, §4.3, §4.G.4–4.G.8, §5.G, §9.G-5…12, 16. Tüm sayılar tek yerde: `src/sim/data/tuning.ts`.

## 0. Genel
- **Tick numaralandırma atlayıştan başlar.** `FlightSim` `intro` fazında doğar (pilot `route.start`'ta park), `step()` intro'da tick ilerletmez; `beginJump()` → `jump` (0,8 sn serbest düşüş) → `wingsOpen` olayı → `flying`. Gerekçe: tanıtım atlanabilir/uzunluğu değişken; hayalet kodu ve günün rotası tick'leri tanıtımdan bağımsız olmalı. `skipIntro: true` doğrudan atlayışla başlatır (testler, botlar, hızlı yeniden deneme).
- **Komut sözleşmesi:** `step(cmds)` yalnız `cmd.tick === sim.state.tick` (adım öncesi okunan) ve `actorId === opts.actorId` olan komutları uygular. `axis` yalnız kendi tick'inde uygulanır ve bir sonrakine kadar **tutulur** (30 Hz örnekleme). Değerler komut nesnesinden kopyalanır (ReplayCursor nesneleri geri dönüştürür). Böylece canlı oyun = hayalet tekrarı.
- **SIM_VERSION** `src/sim/version.ts` (u16, şu an 1). Uçuş modeli, ayar, yakınlık, puan, yerleşim ya da komut işleyişi değişince artırılmalı.
- **Yön kuralı:** ψ = 0 kuzey (−z), saat yönünde (+x doğu). `dir = (cosγ sinψ, sinγ, −cosγ cosψ)`. Prop yaw'ı three.js `rotation.y` kuralındadır (yerel +x → (cos, 0, −sin)).
- **Rüzgâr `dirDeg` meteorolojik "nereden"dir** (250° = batı-güneybatıdan eser, doğu-kuzeydoğuya taşır). Rotanın `wind` alanı sim'de kullanılır.
- **`RouteThermal.pos = [x, z]`** (2B).

## 1. Uçuş modeli (§4.G.5)
- Nokta-kütle modeli brifteki denklemlerle; 60 Hz, 2 alt adım, yarı-örtük Euler. **Enerji tabanlı entegrasyon:** açılar → konum (yeni yönle) → hava hızı özgül enerji dengesinden `E' = E − (D·V/m)·dt + g·w·dt`, `V' = √(2(E' − g·y'))`. Böylece termal/yamaç dışı `Ė ≤ 0` **yapı gereği** sağlanır (9.G-12: 1.000 rastgele akış × 240 tick, en kötü ΔE ≤ 1e-9).
- **V ≥ 25 m/sn tabanı enerji-nötrdür:** açık hız, ek çökme (irtifa) olarak ödenir; enerji yaratılmaz.
- **C_trim = 0,635** (brif C_L≈0,55'te (L/D)max der; trim 42 m/sn için gereken C_L 0,635). Sonuç: V_trim 42,0 m/sn, çökme 9,1 m/sn, süzülme 4,5.
- **Çelişki — c_v:** brifteki c_v = 0,004 dikey dalışta 65,2 m/sn (234,7 km/sa) tavan verir; hem "tavan ≈ 64 m/sn" hedefini hem 9.G-10'un "220–232 km/sa" sınırını bozar. **Karar: c_v = 0,006** ve terim **dalış açısıyla ölçeklenir** (`−sinγ`, yalnız alçalırken). Dikey dalış tavanı 64,0 m/sn (230,5 km/sa). Gerekçe: test ve hedef değer esas; ölçekleme dalıştan çıkıp yakın uçuşa taşınan hızı (puanın hız çarpanı) cezalandırmaz.
- **Çelişki — enerji geri kazanımı (9.G-10 %75–95):** k = 0,2 ve C_D0 = 0,06 ile ders kitabı kutup eğrisi tam çekişte %40 verir (ölçüldü). (L/D)max = 4,6 hedefini değiştirmeden çözüm: **"zoom verimi"** — düz yolu taşıyan kaldırma (`C_Ls = W·cosγ/qS`) tam endüklenmiş sürükleme öder, yolu büken fazla kaldırma `η = 0` katsayısıyla öder; **yük faktörü sınırı 4,5 g**; **γ sınırında kaldırma tutma** (yol limitteyken kaldırma yerçekimi normalini dengeler, boşa sürükleme üretmez). Sonuç: tam çekişte %78 (yalnız parazit sürükleme ve stall kaybı). Düz süzülüş kutbu aynen korunur; enerji yaratılmaz. Yan etki: dönüşler ucuzlar (180° dönüş ≈ 71 m irtifa, düz süzülüşte ≈ 67 m) — mobil tek başparmak için olumlu.
- **Çelişki — tepki zamanları:** GDD §2.2 yatış 0,6 sn / burun 0,8 sn, yatış sınırı 80°, yalpa 140°/sn; §4.G.5 τ = 0,4 sn, φ_hedef = sx/31·65°, 150°/sn. GDD kendisi "kesin model 4.G'de" dediği ve kural "algoritmada §4.G esastır" olduğu için **§4.G değerleri** kullanıldı. GDD'nin 55°/sn yunuslama sınırı ek olarak γ̇ kırpması olarak uygulandı.
- **Bırakınca güvenli:** `sy = 0` iken C_L = C_trim − 1,6·(γ − γ_trim) (±0,35) → phugoid sönümlenir, burun en iyi süzülme açısına döner (9.G-9: 20 sn'de V 40,7–42,0 m/sn, süzülme 4,74). Yatışta ve pitch girdisi yokken C_L /= cosφ (koordineli dönüş: yatay sürükleme = irtifayı koruyan dönüş).
- **γ sınırları −80°/+70°** (ψ̇'nin cosγ paydası sonlu kalır; nokta-kütlede takla yok).
- **Stall:** V < 33'te C_L tavanı 1,2 → 0,5'e yumuşakça iner, 0,7 rad/sn burun-aşağı yardım; 9.G-11: NaN yok, V ≥ 25, burun düşer, kaza yok.
- **Termal:** `w0·e^(−(r/R)²)` (detMath.exp), tepe altında 80 m smoothstep sönüm. Termal ödülü (+100) **termal başına bir kez** (gir-çık istismarı yok); `thermalEnter/Exit` olayları her girişte.
- **Yamaç kaldırması:** `k_r·max(0, ∇H·rüzgâr)`, k_r = 1, yalnız AGL < 60 m, yükseklikle doğrusal azalır, ∇H ±4 m merkezi farkla.

## 2. Yakınlık sorgusu (§4.G.6)
- Brifteki hat birebir: 24 örnekli halka ile erken çıkış (±30 m'de hiçbir şey y − 45'e yükselmiyorsa), 13×13 @ 5 m kaba ızgara, 7×7 @ 1 m inceltme, sonra **2 teğet-düzlem izdüşüm adımı** ve düzlem düzeltmesi. 3 m altında 3 cm muhafazakâr pay. Ölçüm (9.G-5, 10.000 nokta, analitik arazi + 3.679 prop + 40 balon + deniz): d<7 m en büyük hata **0,078 m**, d<30 m **0,354 m**, kesin d<0,6 iken "güvenli" **0**. Gerçek Kapadokya'da (400 nokta) d<7 hata 0,030 m.
- **Gövde:** çarpışma küresi r = 0,6 m (brif). "Giysi gövde kapsülü" bu küre ile temsil edilir; `ProximityInfo.d = max(0, merkez mesafesi − 0,6)`. Çarpan ve sıyırma bu `d` ile; temas `merkez < 0,6`.
- **Sınıf:** eğim ≥ 30° → `rock`, aksi `ground`; su `water`; ağaç primitifleri `tree`; diğer prop `prop`; balon `balloon`. `flatSurfaceMaxMult = 3`: su ve eğimi < 8° zemin.
- **Elipsoid SDF tam (Newton):** Inigo Quilez yaklaşımı yassı peri bacası şapkalarında 2–13 m hata verdi (ölçüldü) → Lagrange koşulunda monoton Newton (dış), güvenli ikiye bölme (iç). Kapsül, kesik koni (IQ tam), yuvarlatılmış kutu tam.
- **Prop ızgarası:** 32 m hücre, sınır küresi izdüşümüyle kayıt, CSR listeleri, sorgu başına damga ile tekilleştirme; kaba-kuvvetle birebir aynı sonuç (testte 3.000 nokta).
- **Su:** deniz düzlemi y = 0 (`hasSea`), disk havuz, ve **Pamukkale havuz ızgarası** (`world.json terrain.patchInfo.water` → `loadWorldNode().patchWater`): su yüzeyi arazinin üstündeyse su sayılır.

## 3. Çarpışma ve tünelleme (§4.G.5, §2.2)
- Alt adım başına süpürme: iki uç ≥ r + |Δp|/2 ise segment Lipschitz ile kanıtlı temiz; değilse ≤ 0,3 m aralıklı iç örnekler, ilk temas 4 adım ikiye bölmeyle bulunur, pilot güvenli tarafta kalır. Ucuz yol: dikey açıklık > (r + 0,35)(1 + L), L = tan 85° → arazi kesin olarak r + 0,35'ten uzak.
- 9.G-6: 4 × 2.500 = **10.000** maksimum hız (64 m/sn) dalış/teğet uçuşu (arazi kanyon duvarı/zemin, peri bacası, balon, ağaç gövdesi); bağımsız referansla 2 cm–10 cm örneklenen yörüngede **kaçan temas 0, içinden geçiş 0**.
- **Temas kuralı:** yüzeye dik yaklaşma < 6 m/sn → sekme (iç bileşen 1,3 katsayıyla yansıtılır, hız ×0,75, kombo kırılır, `bounce`); ≥ 6 → `crash`. Sekmeden sonra 0,25 sn "sessiz" pencere (kayarken art arda sekme olayı/kayıp yok). Sekme itmesi enerji yaratmaz (gerekirse hız düşürülür).
- **Su teması da aynı kural** (sınıf `water`, VFX sıçrama). Brif §4.G.5 "su = yumuşak sıçrama kazası" diyor; GDD temas kuralı oyun kuralı olduğundan esas alındı.
- **Rehber Rüzgâr:** d < 2 m'de 8 rad/sn yumuşak yön düzeltme; temas olursa itme + iç hız sıfırlama, hız kaybı/olay yok → çarpma imkânsız.
- **Kaza halka tamponu:** son 3 sn = 180 durum, `CrashBuffer` (giriş başına 12 float: tick, x, y, z, vx, vy, vz, ψ, γ, φ, hız, d; indeks 0 en eski).

## 4. Uçuş yardımı (§2.10)
- **Tam:** d < 2 m ve kapanma > 8 m/sn → 5 rad/sn yumuşak yön düzeltme; τc < 0,6 sn → (1 − τc/0,6)·16° tek seferlik burun kaldırma, 5 sn bekleme; kapı mıknatısı = halka yarıçapı **+%15** + 80 m içinde, halkanın 2R koridorundaysa hafif yönlendirme. τc hem en yakın yüzeye kapanmadan hem de 0,5/1,0 sn düz çizgi ileri bakış problarından alınır.
- **Az:** yalnız uyarı. Yeni olay **`warning`** `{tau, side, pos}` (τ < 1,0 sn, 1 sn bekleme) — UI kenar kırmızı nabız + bip. Tam yardımda da yayılır.
- Tüm yardımlar **yalnız yön döndürür** (enerji-nötr). `state.assistUsed` 🛟 bayrağı için.

## 5. Puan (§2.5)
- Formül aynen; sim zamanıyla (Yavaş Mod'da dt × 0,8). Kombo: d ≥ 15'te geçen süre ≤ 1,5 sn ise t_z **durur** (sıfırlanmaz); 1,5 sn aşılırsa sıfırlanır. `comboBreak` olayı yalnız K > 1 iken (gürültü yok); temas her zaman kırar.
- `multUp`: çarpan yükselince; aynı seviye 0,4 sn düşük kalmadan yeniden duyurulmaz (sınırda titreme spam'i yok).
- **Sıyırma:** d < 1,5 m, temassız, V > 140 km/sa; **geçiş başına tek olay** — geçiş d < 1,5 ile başlar, d > 2 ile biter; d, koşan minimumun 5 cm üstüne çıkınca (yerel minimum onayı) olay o minimumdaki değerlerle atılır. Puan 250 × Ç(d_min) (düz yüzeyde ×3 tavanı), güç `(1,5 − d)/1,5`, `side` = yüzey pilotun sağında +1. Nesne başına 1 sn bekleme (arazi tek nesne sayılır).
- **Kapı:** düzlem kesişimi (normal yönünde) + yarıçap. Düzlemi 4R içinde ama halka dışında geçmek veya sonraki kapıyı önce almak → `gateMissed`. Paraşüt açılınca kalan kapılar kaçırılmış sayılır (Günün Rotası ceza süresi için). Zincir: 500 + min(1.000, 100·(n−1)).
- **Balon İlmeği:** merkezleri ≤ 35 m (3B) iki balon; pilotun önceki→şimdiki konumu xz'de A→B doğrusunu keser (2B çapraz çarpım işaret değişimi), kesişim parametre [0,1]'de, zarf yükseklik bandında ve her iki zarfa ≤ 12 m. Çift başına 2 sn bekleme; 4 sn içinde ardışık ilmek ×1,5 (tavan ×3).
- **İniş:** halka 2/5/10 m → 1.000/500/200; yumuşak iniş = 3 m altında fren ≥ 0,5 uygulanmış ve temas çökmesi ≤ 2,6 m/sn → +300; cesur açılış 60–90 m AGL → +300 (açılışta). Otomatik Paraşüt bunların hepsini yarıya indirir. `sim.breakdown` sonuç ekranı dökümü verir.
- **Yıldız:** `starsFor(route, score, landedInZone, halfFlight)`: bölgede paraşütle iniş ⭐, `score ≥ route.stars[1]` ⭐⭐, `≥ stars[2]` ⭐⭐⭐. Yarım uçuş/kaza 0.

## 6. Paraşüt ve iniş (§2.2, §2.9)
- Açma komutu yalnız iniş bölgesinde (silindir, `route.landing.zoneRadius`, yoksa 250 m) veya Serbest Uçuş'ta. Açılış 1,2 sn (hız τ 0,35 ile kanopi değerlerine, direksiyon yetkisi rampalanır). Kanopi: ileri 10 m/sn, çökme 5 m/sn; fren ileri 4 / çökme 3,2; flare depolanmış "flare enerjisi" ile kısa süreli ek çökme kesintisi (≈1,2 sn). Dönüş ≤ 35°/sn (`sx`).
- **Fren girdisi:** `max(flare komutu, −sy)/31` → doğal modda aşağı sürükleme ve `flare` komutu aynı işi görür (girdi katmanı kanopide aşağı sürüklemeyi `flare` olarak da gönderebilir).
- **Acil paraşüt (çelişki):** GDD "bölgeye varmadan AGL < 20 m → acil paraşüt" der; harfiyen uygulanırsa ×5 yakınlık uçuşu (eğimli zeminde 2–3 m) imkânsızlaşır. **Karar:** acil paraşüt = bölge dışı **ve** AGL < 20 m **ve** enerji yüksekliği `AGL + max(0, V² − V_trim²)/2g < 20 m` **ve** zemine 3 m/sn'den hızlı yaklaşma. Yani "irtifası ve fazla hızı biten" pilot; hızlı ve yamaca paralel yakın uçuş serbest. Sonuç `halfFlight` (olay + faz), puan gösterilir, yıldız/rekor yok; yere değince `landed` (0 puan) gelir.
- **Bölge içi güvenlik:** bölgede açmayı unutan pilot AGL < 15 + aynı enerji koşulunda otomatik açılır (auto, bonus yarım) — "ölüm yok".
- Kanopide prop'a değmek iniş sayılır (yumuşak); deniz yüzeyi iniş yüzeyi; havuzlarda havuz tabanı.

## 7. Prop ve balon yerleşimi (§4.G.4)
- `buildProps(worldId, sampler, config)` saf ve deterministik; `config` doğrudan `world.json` WorldConfig olabilir (`props` sayı/maske/seed ipuçları, `hasSea`, `wind`). Arazi ajanının maske kanalları (`chimney`, `trees`, `tomb`, `coast`, `house`, `cornice`, `ruins`, …) `sampler.mask/maskChannel` varsa kullanılır, yoksa eğim/eğrilik sezgisi.
- Yöntem: 32 m analiz ızgarası (yükseklik, eğim, Laplasyen eğrilik) + **sistematik ağırlıklı örnekleme** (raster sırasında birikimli ağırlık eşikleri → tam istenen sayı) + 4 m doluluk ızgarası (kategoriler iç içe geçmez) + `clear` diskleri (kapı/iniş hedefi, sim ve render aynı listeyi vermeli).
- Ölçülen süre (gerçek dünyalar, ısınmış/soğuk): Kapadokya 75/138 ms (1.197 baca + 2.490 kavak), Likya 95/114 ms, Karadeniz 42 ms (9.000 ladin + 59 ev + 4 şelale), Erciyes 32 ms, Pamukkale 55 ms. Tümü < 300 ms.
- Her çarpışabilir prop tüm kademelerde vardır; `waterfall` yalnız görseldir (`prims = []`) — `PropType`'a eklendi.
- `params` anlamları `src/sim/world/props.ts` başlık yorumunda (render-props ajanı için). Bileşik prop'lar (ev, tiyatro, kemer, deniz feneri, gulet) için en kesin yol görseli `prims`'ten kurmak.
- **Balonlar:** Kapadokya 40, Pamukkale 12; 2–4'lük kümeler, komşular 24–29 m aralıklı, aynı sürüklenme/faz → ilmeklenebilir çiftler uçuş boyunca ≤ 35 m kalır. `balloonPos(def, t)` = p0 + drift·t + A·sin(…) + rise·t; eksenler farklı frekans/faz (0,73ω, 1,17ω) — yorumda birebir. Zarf merkezi döner; çarpışma elipsoit (R, H/2, R) + sepet kutusu. `t = state.timeSec` (atlayıştan beri sim saniyesi). Atlama fazında balon çarpışması yok (başlangıç sepeti).

## 8. Determinizm ve performans
- `detMath`: fdlibm tabanlı sin/cos/tan/atan/atan2/exp/log/pow/asin/acos; Math.sin'e göre ~1 ulp. Bit düzeyinde motor bağımsızlık `tests/jsc/compare.ts` ile kanıtlandı: Node 22 (V8) ve Bun 1.4.2 (JavaScriptCore) **10 analitik + 2 gerçek Kapadokya uçuşu, 486 tick-hash örneği, detMath ham bitleri ve 5 dünya yerleşim hash'i birebir aynı.** Aynı testte yerel `Math.sin/exp/pow` bit hash'i iki motorda **farklı** çıktı (detMath'in gerekçesi).
- `npm run test:jsc` (= `bun tests/jsc/run-determinism.ts`) Bun altında Node'u da çalıştırıp karşılaştırır, fark varsa çıkış kodu 1.
- Tick maliyeti (Node, kanyon uçuşu, 3.679 prop + 40 balon): medyan **~11 µs**, p95 ~20 µs; gerçek Kapadokya'da medyan ~13–21 µs. Bütçe 1,5 ms (Mi 9T için ~4× pay bile ≤ 0,1 ms).
- **Tahsis:** nesne/dizi tahsisi yok (olaylar 64'lük tip başına havuzdan, çift tamponlu liste; tüm vektörler önceden ayrılmış). Ölçülen kalıntı ≈ 30 B/tick: V8'in satır içine almadığı çağrılarda dönen double kutulaması (genç nesil, ihmal edilebilir). Olay nesneleri bir sonraki `drainEvents()`'e kadar geçerlidir.
- Saflık testi (`simPurity`): flight dosyalarında Math.sin/cos/…/random, Date, performance.now, DOM, three, `**`, TODO yok.
