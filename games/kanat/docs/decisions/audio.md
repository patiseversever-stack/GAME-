# Ses, müzik, haptik — kararlar (ajan: audio)

Kapsam: `src/audio/**`, `dev/audio.*`, `tests/unit/audio*`. Brif: §1 (ilk 30 sn, kalite çıtası), §2.3, §2.6, §2.12, §2.13, §4.G.9, §5.4/§5.5, §6.2, §6.G, §7.2, §7.3.

## 1. Üretim yöntemi
- **Karar: Tüm sesler (≈55 SFX/yatak + 5 dünya + menü + SÜRÜ müziği) kodla sentezlenir; tek bir örnek/kayıt dosyası yok.** Gerekçe: lisans riski sıfır (§6.2 CC0 kontrolüne gerek kalmıyor), indirme boyutu sıfır (tek dosya build'e gömülecek ses verisi yok), `decodeAudioData` hiç yok (§5.5), iOS WebView AAC/MP3 codec riski yok.
- **Karar (§6.G sapması):** §6.G müziği "OfflineAudioContext → AAC/M4A" olarak öneriyordu. Bunun yerine müzik **gerçek zamanlı lookahead sekansörü** ile çalınır; yalnız telli/çan/vurmalı sesler yüklemede PCM olarak üretilir. Gerekçe: K0–K3 katmanları ve SÜRÜ gün batımı bölümleri **bar sınırında** oyuna göre değişmeli (önceden render edilmiş stem'lerle bu ya çok sayıda dosya ya da kaba geçiş demek), ayrıca 5 dünya × 4 katman × birkaç dakikalık AAC ~10+ MB indirme getirirdi.
- **Karar: Ses bankası yüklemede üretilir, bir inline Web Worker içinde** (`bankWorker.ts?worker&inline`, çok dosyalı ve tek dosyalı build'de doğrulandı, `file://` dahil). Worker yoksa/başarısızsa ana iş parçacığında ≤12 ms dilimlerle üretim (rAF arası). Ölçüm: masaüstü Chromium'da senkron üretim ~1,1–1,7 s CPU, **22,3 MB PCM**. Uzun/karanlık yataklar (rüzgâr gürültüsü, dalga, fırtına, uğultu, termal…) ve enstrüman örnekleri **24 kHz**'e indirgenir (yarı bellek). Kendi AudioContext'imizde her klip AudioBuffer'a yüklenince JS kopyası bırakılır.
- **Karar: Üretim seed'lidir** (mulberry32 + klip adının FNV özeti): her build bit-düzeyinde aynı sesi üretir (birim testi doğrular).

## 2. Mikser, bus'lar, limitör
- Bus'lar: `music` (kuru + ortak ConvolverNode yankı) → çarpma alçak geçireni → duck → pause-muffle → müzik düzeyi; `amb` (rüzgâr, yataklar, fly-by) → bulut alçak geçireni → düzey; `sfx`; `ui`; hepsi `master`.
- Master: **glue compressor** (eşik −14 dB, diz 8, 3,5:1, 4 ms / 200 ms) → −3 dB trim (Web Audio'nun otomatik make-up kazancını dengeler) → **WaveShaper güvenlik limitörü**: −6 dBFS'e kadar birebir, üstünde tanh diz, **−1,5 dBFS tavan, 4× oversampling** (örnekler arası tepeleri de görür). İşkence testi (+6 dBFS sinüs + +3 dBFS gürültü doğrudan master'a): true peak **−1,4 dBFS**. §1 şartı (≤ −1 dBFS, klip yok) tüm ölçümlerde sağlandı.
- Ses düzeyi eğrisi: kaydırıcı² (alçak uçta kullanılabilir). Varsayılanlar (`DEFAULT_SETTINGS` 0,9/0,7/0,9) ile müzik tam katman ≈ −17,5 LUFS, rüzgâr 198 km/s'de ≈ −19 LUFS, imza SFX anlık ≈ −16…−19 LUFS.
- **Karar: Rüzgâr/ambiyans bus'ı SFX düzeyini izler ama 0,12 tabanının altına inmez** — "ses hiçbir anda tamamen susmaz" (§1). Tam sessizlik yalnız `muted` / ana düzey 0 ile (kullanıcı tercihi).
- **Tek ConvolverNode** (yalnız müzik; 2,0 s sentetik IR: erken yansımalar + zamanla kararan üstel gürültü). SFX yankıları (çan, kapı, yıldız…) üretimde küçük bir FDN ile **bake** edilir → CPU'da ikinci konvolüsyon yok.
- **Bulunan hata ve düzeltme:** ConvolverNode IR'ı bağlam örnekleme hızıyla aynı olmalı (cihaz 44,1 veya 48 kHz). IR, bağlam hızına yeniden örneklenir (`BufferCache.getAtContextRate`).

## 3. Rüzgâr motoru (§2.12, §4.G.9)
- 3 katman + kumaş: alçak gürleme (kahverengi gürültü, LP 90→350 Hz, **taban kazanç: dinlenmede bile ≈ −34 LUFS**), orta "vuuş" (2 pembe kaynak farklı ofset + ±0,35 pan, bant geçiren merkez **400 Hz→2,5 kHz**), yüksek ıslık (dar BP 1,8→5 kHz, ~140 km/s üstünde açılır, yatışın tersine hafif pan), kumaş çırpınması (BP gürültü × üçgen LFO; hız 12→32 Hz hıza göre, derinlik |yatış hızı| ve 170 km/s üstü hızla).
- Toplam rüzgâr alçak geçireni **600→6.000 Hz** (log) hızla; bulut içinde kesim ×0,45 + amb bus 900 Hz'e kadar boğulur.
- Kanopi: orta katman −5 dB, ıslık kapalı, 7 Hz kumaş dalgalanması.
- Uçuş girdisi gelmeyince (menü, SÜRÜ, duraklat) rüzgâr 6 m/s esintiye yumuşakça iner.
- Rüzgâr ve yüksek hız uzak yatakları (deniz, yağmur, martı, brülör) maskeleyip bir miktar geri iter.

## 4. Yakın geçiş "vuuş" (fly-by)
- SimEvent'te ayrı bir "yakın geçiş" olayı yok (yalnız d < 1,5 m `graze`). **Karar:** motor `setFlight` içindeki `prox` (m) değerinden **d < 7 m** geçişleri kendisi algılar: en yakın an geçilince (d > min + 0,6 m) tek vuuş, ≥ 0,35 s aralık, uzun sırt sıyırmalarında yüzey 2,5 m uzaklaşıp yeniden yaklaşınca yeniden kurulur. Ayrıca açık `{type:'closePass', cls, side, d}` olayı da kabul edilir.
- 3 doku: `water` → su (alçak vuuş + sprey), `tree` → ağaç (yaprak hışırtısı taneleri), diğer → kaya (sert vuuş + çakıl çıtırtısı). Doppler hissi klipte (bant merkezi sigmoid düşüş) + playbackRate hızla 0,8→1,35; pan geçilen tarafa 120 ms'de kayar. Düzey yakınlık ve hızla.
- `FlightAudioAdapter` `FlightState`'ten bankRate (φ türevi) ve taraf (sağ vektör (cos ψ, 0, sin ψ) · (nearest − pos)) üretir; nesne her kare yeniden kullanılır.

## 5. SFX eşlemesi (§2.3)
| Olay | Ses | Haptik | Müzik |
|---|---|---|---|
| wingsOpen | kumaş patlaması + flap | kanat 25 ms | duck −2 dB |
| multUp | pentatonik ton ×1 Do, ×2 Mi, ×3 Sol, ×5 üst Do | çift 10-40-10 | — |
| graze | hava yırtılması + ıslık, `side` ile pan | hafif 12 ms | duck −4 dB |
| comboBreak | inen iki ton (Mi→Do) | yumuşak 30 ms | — |
| gate | havalı çan (zincirle pentatonik yükselir) | kapı 18 ms | duck −2,5 dB |
| thermalEnter/Exit | alçak uğultu döngüsü | 6 ms @ 6 Hz (Az'da kapalı) | — |
| balloonThread | brülör "fuu" + sıcak çan | orta 25 ms | duck −5 dB |
| parachuteOpen | "pat" + ipek hışırtısı | paraşüt 50-60-30 | duck −3 dB |
| landed | yumuşak iniş / tok iniş | hafif / orta | — |
| star (ek olay) | ağır "tok" | yıldız 40 ms | duck −5 dB |
| crash | boğuk "vumf" (şiddetsiz) | çarpma 90 ms | **400 ms sonra 300 Hz LP** |
| bounce | sürtünme / su sıçraması | orta | — |
- Ek olaylar: `jump`, `burner{far}`, `tally{i}`, `tallyEnd`, `uiTap/uiSwish/uiConfirm/uiBack/uiToggle`, `reward`, `photo`, `collisionWarn{side}` (§2.10 "Az" yardım bip'i), `restart`; SÜRÜ: `suruJoin`, `suruConvert{count}`, `kusatmaStart`, `kusatma`, `hawkWarn{pan}`, `gustWarn{pan}`, `stormStart/stormEnd`, `thunder`, `lighthouse`/`sunsetBell`, `roundEnd{win}`, `eliminated`, `breathEmpty`.
- **Karar: Çarpan tonları "movable-do"** — aralıklar brifteki gibi (Do-Mi-Sol-üst Do), ama ton o anki dünya müziğinin toniğine taşınır (Kapadokya Re, Likya La…), kayıt C5 bandında kalır. Müzik yokken C5-E5-G5-C6. Gerekçe: tonlar müzikle çatışmaz.
- Çarpma sonrası müzik filtresi `phase` 'crashed'den çıkınca veya `restart` olayında açılır.
- Ses havuzları: sfx 16, ui 6, amb 8 ses; dolunca en düşük öncelikli/en eski 8 ms'de sönerek çalınır. Sabit Gain+Panner düğümleri; çalma başına yalnız tek kullanımlık AudioBufferSourceNode.

## 6. Uyarlanır müzik (§2.12)
- Lookahead zamanlayıcı ("iki saat" deseni): 25 ms JS zamanlayıcısı + her `setFlight`, 0,2 s ileriye bakar; adım zamanı `start + n·dur` (birikimli hata yok); geciken adımlar çalınmaz, atlanır (takılma sonrası nota yağmuru yok). Offline render'da aynı `pump()` suspend noktalarından çağrılır.
- Katmanlar: **K0 pad daima**, **K1 ritim hız > 160 km/s** (150'de kapanır), **K2 melodi kombo ≥ 1,5** (1,3'te kapanır), **K3 vurmalı ×5** (+2,5 s kuyruk). Geçişler **yalnız bar başında** (`LayerGates`). Bar süreleri 1,05–3,5 s.
- Dünya renkleri / dizi / ölçü:
  - Kapadokya — Hicaz (Re), 4/4 ~88 bpm: yaylı pad + ney benzeri üflemeli (reed dalga + bant geçiren nefes gürültüsü, 5,2 Hz vibrato, notaya kayarak giriş), bendir/darbuka/davul.
  - Likya — Uşşak (La), 6/8: sıcak pad + naylon gitar arpejleri (Karplus-Strong) + flüt, **deniz dalgası yatağı + uzak martılar**.
  - Karadeniz — Hüseyni (La), aksak 7/8 (2+2+3): kemençe esintili yaylı sentez (nazal gövde EQ'su, 6,2 Hz vibrato) ostinato + uzun melodi, **yağmur yatağı**.
  - Erciyes — Rast renkli (Sol), 4/4 ~75 bpm: koro pad (3 formant) + çan ostinatosu/melodisi.
  - Pamukkale — Uşşak (Re), aksak 9/8 (2+2+2+3): sıcak yaylılar + **ud benzeri tel (Karplus-Strong, mızrap atağı, ahşap gövde rezonansları)**, **su şırıltısı yatağı**.
  - Menü — Hüseyni (Mi): sıcak pad + yumuşak pluck + seyrek ney; uzak brülörler.
  - **SÜRÜ.io** — timeFrac < 0,45 Fa majör (pluck arpej + çan), 0,45–0,8 Re yumuşak minör (ney), ≥ 0,8 **"mavi saat"** cam pad + seyrek çan (ritim yok). 3:00 ≈ 56 bar.
  - Serbest Uçuş "sakin" katmanı: `music.setWorld(id, {calm:true})` veya `setCalm(true)` → K1/K3 yok, K2 her iki barda bir, %70 hızda.
- **Makam:** 12-TET üstünde kesirli koma dereceleri (Uşşak/Hüseyni 2. derece 1,75 yarım ton, Rast nötr 3./7.). **Karar:** nötr dereceler yalnız melodide; pad akorları kök-beşli/sus voicing ile (akor uyumu bozulmaz). Tüm motifler KANAT için yazıldı; bilinen bir eserden alıntı yok.
- CPU: oyuncu başına paylaşılan enstrüman zincirleri (filtre/formant/vibrato LFO/pan/yankı gönderimi), nota başına 2–5 düğüm, eşzamanlı ses tavanı 28; Kapadokya tam katmanda canlı ölçüm 11–16 ses.
- Dünya değişince eski tema 2 s'de söner, yenisi 1,5 s'de açılır; sönenler 3 s sonra `dispose`.

## 7. SÜRÜ.io sesi (§2.6, §2.12)
- "Binlerce kanat" tek uğultu katmanı: pembe gürültü × periyodik kanat çırpma AM'i (7–14 Hz, döngüyle tam periyodik) + seyrek tekil kanat taneleri; alçak geçiren **450→5.200 Hz**, açılma = yoğunluk + log(sürü boyu) + Sıkı Dizi; düzey log(sürü boyu) ile.
- `suru.setState({flockSize, density, timeFrac, tight})` müzik bölümünü ve otomatik yoğunluğu da sürer (K1 ≥ 30 kuş, K2 ≥ 120 kuş veya Sıkı Dizi, K3 ≥ 250 kuş).
- Martılar ve dalgalar **sentezdir** (§2.12 "uzak martılar (CC0)" yerine; lisans riski sıfır).
- KUŞATMA: tek vurmalı akor (bendir + 6 telli KS akor + çan) **+** 1,5 s yükselen uğultu + 0,45 s sonra dönüşüm tık dalgası; müzik −7 dB duck, haptik `kuşatma`.

## 8. Haptik (§2.3, §7.2)
- Desenler (navigator.vibrate biçimi): hafif [12], orta [25], güçlü [50], çift [10,40,10], yıldız [40], yumuşak [30], kapı [18], kanat [25], paraşüt [50,60,30], çarpma [90], termal [6], kuşatma [30,60,30,60,50], uyarı [15,80,15]. İngilizce/ASCII takma adlar (light, heavy, star…).
- **Yorgunluk sınırı:** 1 s kayan pencerede toplam titreşim ≤ 150 ms. Öncelik ≥ 3 (çarpma, yıldız, paraşüt, kuşatma) kalan bütçeye kırpılır (≥ 8 ms kaldıysa), diğerleri düşer. Rastgele 2.000 isteklik testte hiçbir pencere 150 ms'yi aşmadı.
- Modlar: **Açık**; **Az** = süreler ×0,6 (en az 8 ms), termal tıklar kapalı; **Kapalı**.
- Çıkış `setHapticSink((pattern, name, bridge) => …)`: `pattern` ms dizisi, `name` kanonik Türkçe ad, `bridge` §7.2 adı (light/medium/heavy/success/warning). Varsayılan sink: varsa `navigator.vibrate`; ana ajan GameBridge `haptic` olayına bağlar.
- Haptikler AudioContext açılmadan da çalışır (olaylar `event()`'ten).

## 9. Yaşam döngüsü, iOS (§5.4, §7.3)
- **Ses asla kendiliğinden başlamaz:** `unlock()` kullanıcı hareketinde çağrılmalı (veya `installAutoLifecycle()` ilk pointerup/touchend/click/keydown'da çağırır). Eski iOS için 1 örneklik sessiz tampon hilesi, `webkitAudioContext` yedeği.
- iOS 16.4+: `navigator.audioSession.type = 'ambient'` → sessiz anahtarına saygı, diğer uygulamaların sesiyle karışır.
- `interrupted` (arama/Siri) veya OS kaynaklı askıya alma: bir sonraki dokunuşta / sayfa görünür olunca `resume()`.
- `suspend(reason)` / `resume(reason)` nedenleri yığılır ('hidden', 'host'…); hepsi kalkınca devam. Arka planda zamanlayıcı da durur.
- Duraklat ekranı için `setPauseMuffle(true)`: müzik + dünya sesleri 700 Hz alçak geçirenle geri çekilir, UI sesleri net kalır (susmaz).
- §2.13: görsel-reaktif kullanım için yalnız `musicIntensity()` (bar başına en fazla bir değişim, ≤ 1 Hz) sunulur → 3 Hz yanıp sönme kuralı ihlal edilemez.

## 10. Ölçüm (dev/audio.html, OfflineAudioContext, gerçek master zinciri)
Komut: `node tests/unit/audio-measure.mjs` (Vite 5186 + headless Chromium `--autoplay-policy=no-user-gesture-required`). Rapor: `.cache/audio-measure.{json,md}`, WAV: `.cache/audio-previews/` (commit edilmez).

| Ölçüm | tür | peak dBFS | true peak dBFS | RMS dBFS | LUFS (int.) | max M LUFS | min 400 ms RMS | NaN | sonuç |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| wind 0 m/s (dinlenme) | wind | -22.1 | -22.1 | -32.7 | -33.6 | -32.2 | -33.9 | 0 | OK |
| wind 15 m/s | wind | -16.9 | -16.9 | -28.3 | -28.1 | -27.0 | -29.4 | 0 | OK |
| wind 30 m/s | wind | -12.6 | -12.6 | -24.8 | -24.0 | -23.1 | -25.6 | 0 | OK |
| wind 45 m/s (162 km/s) | wind | -10.3 | -10.3 | -22.1 | -20.7 | -20.0 | -22.6 | 0 | OK |
| wind 55 m/s (198 km/s) | wind | -9.1 | -9.1 | -20.6 | -18.9 | -18.2 | -21.0 | 0 | OK |
| wind 65 m/s | wind | -7.9 | -7.9 | -19.4 | -17.4 | -16.8 | -19.7 | 0 | OK |
| wind 75 m/s (270 km/s) | wind | -7.5 | -7.4 | -19.0 | -16.8 | -16.3 | -19.2 | 0 | OK |
| wind 55 + yatış 2.5 rad/s | wind | -8.0 | -8.0 | -20.2 | -18.3 | -17.8 | -20.4 | 0 | OK |
| wind 50 bulut içi | wind | -9.5 | -9.5 | -21.3 | -20.2 | -19.4 | -21.8 | 0 | OK |
| wind 9 kanopi | wind | -18.6 | -18.6 | -30.0 | -30.1 | -28.8 | -31.0 | 0 | OK |
| wingsOpen | sfx | -12.8 | -12.7 | -27.3 | -28.9 | -23.7 | -32.5 | 0 | OK |
| jump | sfx | -10.0 | -10.0 | -25.9 | -22.0 | -18.8 | -31.7 | 0 | OK |
| graze | sfx | -11.0 | -11.0 | -27.9 | -25.2 | -19.2 | -31.8 | 0 | OK |
| flyRock | sfx | -8.3 | -8.2 | -27.2 | -23.7 | -18.5 | -33.8 | 0 | OK |
| flyTree | sfx | -7.1 | -6.8 | -27.0 | -21.5 | -17.4 | -33.8 | 0 | OK |
| flyWater | sfx | -8.0 | -7.2 | -26.4 | -22.5 | -18.2 | -33.6 | 0 | OK |
| mult1 | sfx | -11.1 | -11.1 | -23.8 | -20.2 | -16.0 | -33.8 | 0 | OK |
| mult2 | sfx | -12.2 | -12.1 | -24.7 | -20.7 | -17.3 | -33.8 | 0 | OK |
| mult3 | sfx | -11.1 | -11.1 | -24.6 | -20.6 | -16.3 | -33.8 | 0 | OK |
| mult5 | sfx | -11.2 | -11.2 | -25.2 | -20.8 | -17.3 | -33.8 | 0 | OK |
| comboBreak | sfx | -11.8 | -11.8 | -26.2 | -24.2 | -20.8 | -31.5 | 0 | OK |
| gateChime | sfx | -9.3 | -9.2 | -25.2 | -20.0 | -16.1 | -32.8 | 0 | OK |
| gateMiss | sfx | -21.4 | -21.4 | -31.2 | -32.2 | -30.2 | -33.0 | 0 | OK |
| burner | sfx | -9.0 | -9.0 | -22.9 | -21.8 | -20.2 | -33.0 | 0 | OK |
| burnerFar | sfx | -17.5 | -17.5 | -30.5 | -31.1 | -28.6 | -32.5 | 0 | OK |
| warmChime | sfx | -9.3 | -9.3 | -25.0 | -20.7 | -17.1 | -33.1 | 0 | OK |
| parachutePat | sfx | -12.5 | -11.5 | -28.9 | -29.6 | -24.8 | -33.2 | 0 | OK |
| silkRustle | sfx | -12.1 | -12.1 | -31.2 | -28.9 | -24.6 | -33.8 | 0 | OK |
| landThud | sfx | -13.5 | -13.3 | -25.1 | -26.9 | -22.0 | -31.8 | 0 | OK |
| landSoft | sfx | -10.0 | -10.0 | -26.6 | -26.3 | -21.7 | -31.8 | 0 | OK |
| starTok | sfx | -9.1 | -9.1 | -24.8 | -26.4 | -19.4 | -33.8 | 0 | OK |
| crashVumf | sfx | -11.7 | -11.6 | -24.2 | -27.0 | -21.0 | -33.8 | 0 | OK |
| bounceScrape | sfx | -11.2 | -11.1 | -29.5 | -28.4 | -23.5 | -32.0 | 0 | OK |
| bounceWater | sfx | -13.1 | -13.1 | -29.7 | -27.1 | -22.1 | -31.8 | 0 | OK |
| landingCue | sfx | -13.0 | -13.0 | -28.4 | -26.3 | -20.8 | -33.8 | 0 | OK |
| collisionBeep | sfx | -12.2 | -12.2 | -26.1 | -21.7 | -21.2 | -33.2 | 0 | OK |
| halfFlight | sfx | -11.8 | -11.8 | -26.8 | -25.9 | -19.3 | -33.8 | 0 | OK |
| uiTap | sfx | -23.5 | -23.5 | -33.5 | -34.5 | -34.3 | -34.0 | 0 | OK |
| uiSwish | sfx | -18.2 | -18.2 | -32.5 | -31.7 | -30.9 | -33.1 | 0 | OK |
| uiConfirm | sfx | -16.8 | -16.8 | -29.7 | -28.9 | -26.1 | -31.6 | 0 | OK |
| uiBack | sfx | -18.7 | -18.7 | -31.0 | -31.4 | -29.5 | -32.7 | 0 | OK |
| uiToggle | sfx | -23.5 | -23.5 | -33.6 | -34.7 | -34.3 | -34.1 | 0 | OK |
| tallyTick | sfx | -23.5 | -23.5 | -33.7 | -34.7 | -34.3 | -34.2 | 0 | OK |
| tallyEnd | sfx | -12.6 | -12.5 | -27.2 | -22.4 | -18.7 | -33.8 | 0 | OK |
| reward | sfx | -10.9 | -10.9 | -27.3 | -22.2 | -18.0 | -33.7 | 0 | OK |
| photoShutter | sfx | -21.9 | -21.8 | -33.6 | -34.6 | -34.3 | -34.1 | 0 | OK |
| joinFlutter | sfx | -19.5 | -19.5 | -32.5 | -32.6 | -31.4 | -33.1 | 0 | OK |
| convertTicks | sfx | -12.4 | -12.4 | -30.2 | -26.2 | -23.8 | -31.8 | 0 | OK |
| kusatmaRise | sfx | -10.1 | -9.7 | -28.1 | -22.8 | -18.7 | -34.2 | 0 | OK |
| kusatmaChord | sfx | -8.8 | -8.8 | -26.0 | -25.0 | -16.6 | -32.3 | 0 | OK |
| hawkWhistle | sfx | -13.1 | -13.1 | -26.6 | -18.8 | -16.9 | -33.8 | 0 | OK |
| gustWhoosh | sfx | -11.1 | -11.1 | -26.6 | -22.1 | -18.5 | -34.2 | 0 | OK |
| thunder | sfx | -12.7 | -12.7 | -27.4 | -28.3 | -22.7 | -32.8 | 0 | OK |
| sunsetBell | sfx | -10.0 | -10.0 | -24.6 | -21.5 | -17.0 | -33.5 | 0 | OK |
| gull1 | sfx | -18.2 | -18.2 | -32.0 | -30.5 | -28.0 | -33.8 | 0 | OK |
| gull2 | sfx | -20.3 | -20.3 | -32.2 | -31.1 | -29.2 | -33.8 | 0 | OK |
| roundEnd | sfx | -8.9 | -8.9 | -25.3 | -23.3 | -16.9 | -32.3 | 0 | OK |
| eliminated | sfx | -12.8 | -12.8 | -26.6 | -24.7 | -21.2 | -33.2 | 0 | OK |
| breathEmpty | sfx | -15.6 | -15.6 | -30.0 | -28.2 | -26.5 | -31.3 | 0 | OK |
| thermalHum (termal) | bed | -13.8 | -13.8 | -24.9 | -24.7 | -23.6 | -26.4 | 0 | OK |
| storm (fırtına) | bed | -8.1 | -8.0 | -19.5 | -17.2 | -15.8 | -21.9 | 0 | OK |
| murmur 400 kuş sıkı | bed | -7.3 | -7.3 | -19.3 | -16.7 | -15.4 | -21.2 | 0 | OK |
| music kapadokya K0-K3 | music | -7.2 | -7.2 | -19.6 | -17.5 | -15.9 | -27.9 | 0 | OK |
| music likya K0-K3 | music | -7.8 | -7.8 | -19.2 | -17.3 | -15.4 | -25.7 | 0 | OK |
| music karadeniz K0-K3 | music | -7.3 | -7.3 | -19.8 | -18.0 | -15.5 | -27.6 | 0 | OK |
| music erciyes K0-K3 | music | -8.0 | -8.0 | -21.3 | -19.0 | -16.1 | -28.9 | 0 | OK |
| music pamukkale K0-K3 | music | -7.7 | -7.7 | -20.5 | -18.3 | -16.6 | -29.7 | 0 | OK |
| music menu K0-K3 | music | -7.3 | -7.3 | -20.1 | -18.0 | -16.2 | -26.3 | 0 | OK |
| music suru majör | music | -7.6 | -7.6 | -19.4 | -17.0 | -15.6 | -26.3 | 0 | OK |
| music suru yumuşak minör | music | -7.6 | -7.6 | -19.7 | -17.3 | -15.6 | -26.3 | 0 | OK |
| music suru mavi saat | music | -7.6 | -7.6 | -20.7 | -18.3 | -15.6 | -26.3 | 0 | OK |
| music kapadokya sakin (Serbest Uçuş) | music | -7.7 | -7.7 | -20.2 | -18.0 | -16.3 | -25.4 | 0 | OK |
| STRES: rüzgâr 75 + müzik K3 + 7 SFX + çarpma | stress | -3.3 | -3.3 | -17.1 | -14.9 | -12.5 | -20.2 | 0 | OK |
| STRES %100 ses: 9 olay aynı anda | stress | -2.4 | -2.2 | -15.1 | -12.9 | -11.2 | -17.4 | 0 | OK |
| STRES SÜRÜ: kuşatma + doğan + rüzgâr + fırtına + çan | stress | -6.1 | -6.0 | -19.0 | -16.2 | -13.0 | -29.9 | 0 | OK |
| LİMİTÖR işkence: +6 dBFS sinüs + +3 dBFS gürültü | limiter | -2.2 | -1.4 | -7.6 | -4.4 | -4.2 | -7.8 | 0 | OK |
| preview kapadokya (K0→K3, 24 s) | preview | -7.4 | -7.4 | -19.7 | -17.7 | -15.8 | -27.9 | 0 | OK |
| preview likya (K0→K3, 24 s) | preview | -7.5 | -7.5 | -19.2 | -17.4 | -15.1 | -25.7 | 0 | OK |
| preview suru (K0→K3, 24 s) | preview | -7.6 | -7.6 | -19.4 | -17.0 | -15.6 | -26.4 | 0 | OK |
| UÇUŞ DEMO 18 s (olay + yakın geçiş zinciri) | demo | -4.3 | -4.0 | -18.4 | -16.2 | -13.7 | -32.7 | 0 | OK |

Toplam 80 ölçüm, 0 başarısız. En yüksek true peak -1.4 dBFS; en sessiz 400 ms pencere -34.2 dBFS.
Ses bankası (tarayıcı, ana iş parçacığı, senkron): 1738 ms, 22.3 MB PCM. Toplam ölçüm süresi 39.5 s.

ffmpeg (volumedetect + ebur128 true peak + astats) çapraz kontrolü:
```
WAV önizlemeleri (.cache/audio-previews):
  kapadokya.wav  max_volume -7.4 dB · mean_volume -19.7 dB · I -17.7 LUFS · true peak -7.4 dBFS · NaN 0 · DC 0.000314
  likya.wav  max_volume -7.5 dB · mean_volume -19.2 dB · I -17.4 LUFS · true peak -7.5 dBFS · NaN 0 · DC -0.000043
  suru.wav  max_volume -7.6 dB · mean_volume -19.4 dB · I -17.0 LUFS · true peak -7.6 dBFS · NaN 0 · DC -0.000132
  ucus-demo.wav  max_volume -4.3 dB · mean_volume -18.4 dB · I -16.2 LUFS · true peak -4.1 dBFS · NaN 0 · DC 0.000663
```
Kendi LUFS ölçerimiz ffmpeg ile ±0,1 LU uyumlu (K-ağırlıklandırma ITU 48 kHz referans katsayılarını birebir üretir; birim testi −3,01 LUFS kalibrasyonunu doğrular).

## 11. Testler
`npx vitest run tests/unit/audio-scheduler.test.ts tests/unit/audio-haptics.test.ts tests/unit/audio-scales.test.ts tests/unit/audio-dsp.test.ts tests/unit/audio-engine.test.ts` → 5 dosya, 44 test geçti (zamanlayıcı kesinliği/atlama/bar kuantizasyonu, katman histerezisi, tema verisi tutarlılığı, makam tabloları, çarpan tonları, haptik limit/öncelik/mod/termal, tüm klipler sonlu ve −3 dBFS'e normalize, determinizm, döngü dikişleri, tık-yok başlangıç/bitiş, KS akort ±5 cent, limitör eğrisi, BS.1770 kalibrasyonu, true peak, FlightAudioAdapter, AudioContext'siz motor güvenliği).
