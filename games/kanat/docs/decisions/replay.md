# Replay, Hayalet Kodu ve Günün Rotası tohumlama — kararlar

Sahip: replay ajanı. Kod: `src/sim/replay/**` (saf; DOM/Date/Math.random yok). Testler: `tests/unit/replay*.test.ts`.
Kaynak: BRIEF §2.5 (Mod 2–3), §2.8, §4.3, §4.G.7, §4.G.8, §9.G-13…15, §11.G.

## 1. Kod öneki: `K1.` (kanonik) + `KNT1-` (görünen takma ad)
- **Karar:** Brifte iki önek var: §2.5/§2.8 okunur önek `KNT1-` (`Düello: KNT1-G214-…`), §4.G.8 teknik biçim `"K1." + base64url(...)`. Teknik biçim kazanır: **kanonik kod `K1.<gövde>`**. Paylaşım metninde okunur **görünen biçim** `KNT1-<etiket>-<gövde>` kullanılır (`toDisplayCode`). Çözücü üç biçimi de kabul eder: `K1.<gövde>`, `KNT1-<gövde>`, `KNT1-<etiket>-<gövde>`.
- Etiketler: Günün Rotası `G214`, Kariyer `W1R3` (rota kimliği büyük harf), Serbest `S1` (dünya no). Etiket gövdeden ayrıştırılabilir çünkü formatVersion=1 ilk baytı 0x01 → base64url gövdesi **her zaman `A` ile başlar**; etiketler `A` ile başlamaz (`/^[B-Z][A-Z0-9]{0,11}$/`).
- Etiket başlıkla uyuşmazsa (`KNT1-G215-` + #214 kodu) → `invalid` (elle oynanmış kod).
- Yapıştırma toleransı: kod uzun bir metnin içinden bulunur (paylaşım kartı, derin bağlantı `?c=K1.…&…`); bulunamazsa/CRC tutmazsa tüm boşluklar silinip yeniden denenir (e-posta satır kırma). En fazla 8 aday; en ileri aşamaya ulaşan hatanın kodu döner.

## 2. Bayt düzeni (formatVersion 1) — sabit genişlikli alanlar little-endian
```
header:
  u8  formatVersion = 1
  u16 simVersion                    (alıcının SIM_VERSION'ı ile birebir olmalı)
  u8  mode                          0 Kariyer · 1 Günün Rotası · 2 Serbest
  varint routeRef                   Kariyer: careerRouteNumber('wXrY') 0..19 · GR: dailyIndex ≥1 · Serbest: dünya 0..4
  u32 seed
  u8  flags                         bit0 asistan · bit1 Yavaş Mod · bit2 Rehber Rüzgâr · bit3 isim var · bit4-7 = 0 (değilse invalid)
  varint suitId
  varint tickCount                  ≤ 262144 (2^18 tick ≈ 72,8 dk)
  varint finalTimeMs                gösterilen sonuç süresi (kapı cezaları dahil)
  varint score
  u32 finalStateHash                FlightSim.hash() son tick'te
  [bit3] u8 nameLen (1..16) + UTF-8 isim
payload = deflateRaw(level 9)( axisTicks | sxStream | syStream | events )
crc32   = CRC-32/IEEE (zlib ile aynı), header|payload üzerinde, u32 LE
```
**Payload (ham):**
- `varint axisCount`; >0 ise `varint ilkTick`, sonra tick farkları **(dt, tekrar−1)** çiftleri. Düzenli 30 Hz akış tek çift `(2, n−2)` = 2–3 bayt.
  - **Karar (brife ek):** §4.G.8 yalnız "30 Hz örnekler" diyor; eksen komutlarının tick'leri de kodlanır. Gerekçe: kare takılması sonrası faz kayması, atlanan örnek, aynı tick'te iki eksen komutu gibi durumlarda bile `toCommands()` birebir aynı `Command[]`'ı üretsin; düzenli akışta maliyeti ~0.
- `sxStream`, `syStream`: önceki örnekten fark (ilk referans 0) → zigzag varint; sıfır fark koşusu `(0, uzunluk−1)` RLE. Değerler [−31, 31] dışına çıkarsa invalid.
- `events`: `varint sayı`, her olay `varint tickFarkı | u8 tip | argümanlar(zigzag varint)`; `tip = tür | (argc << 4)`. Türler: 0 eksen (akış dışı), 1 paraşüt, 2 flare [0..31], 3 tight [0|1], 4 pause. paraşüt/pause bugün argümansız; ileride kullanım için ≤3 küçük tamsayıya izin var.
- **Tick içi sıra kuralı:** oynatmada aynı tick'te önce eksen akışı (akış sırasıyla), sonra olaylar (liste sırasıyla). Recorder bunu korur: aynı tick'te bir olaydan *sonra* gelen eksen komutu olay olarak kaydedilir.
- Payload tam tüketilmeli (artık bayt → invalid).

## 3. Çözme sırası ve hata türleri (hiç exception yok)
`format` → `crc` → `version` → `invalid` (brif: "crc32 → SIM_VERSION → yeniden sim").
| Hata | Ne zaman | TR | EN |
|---|---|---|---|
| `format` | önek yok, base64url dışı karakter, imkânsız uzunluk, boş | Bu bir KANAT düello kodu değil | This isn't a KANAT duel code |
| `crc` | CRC uyuşmaz, < 8 bayt, son karakterin kullanılmayan bitleri ≠ 0 | Kod eksik ya da bozuk kopyalanmış; kodun tamamını yeniden kopyala | The code is incomplete or damaged; copy the whole code again |
| `version` | formatVersion ≠ 1 veya simVersion ≠ beklenen (`codeSimVersion` döner) | Bu kod oyunun farklı bir sürümüyle kaydedilmiş | This code was recorded with a different version of the game |
| `invalid` | CRC geçerli ama yapı/aralık bozuk, inflate hatası, etiket uyuşmazlığı; yeniden sim sonucu farklı (`verifyGhostOutcome`) | Kod geçersiz | Invalid code |
- Tek karakter değişimi her zaman `crc` verir: değişim ≤ 6 bitlik bir patlama hatasıdır, CRC-32 ≤ 32 bitlik tüm patlamaları yakalar. Son karakterin yalnız dolgu bitlerini değiştiren durum kanonik-olmayan base64 olarak yakalanır ve yine `crc` sayılır (testte her pozisyon denendi).
- Sınırlar (DoS): metin ≤ 262.144 karakter, kod gövdesi ≤ 65.536 karakter (WhatsApp mesaj sınırı), inflate çıktısı ≤ 2 MB (zip bombası testi: 4 MB sıfır → `invalid`, < 2 s), eksen ≤ 2^18, olay ≤ 65.536.
- Mesajlar `GHOST_ERROR_MESSAGES` tablosunda (saf); UI kendi i18n anahtarlarına eşleyebilir (`duel.err.*`).

## 4. Recorder / oynatma sözleşmesi
- `Recorder(actorId=0)`: sim'e verilen her `Command`'ı **sim'in tükettiği sırayla** `push`/`pushAll`. Başka aktörler yok sayılır. Eksen komutu başına tahsis yok (typed array, ikiye katlayarak büyür).
- Sözleşme dışı komut (aralık dışı/ondalık argüman, geriye giden tick) → `ok=false`, `error` dolu; kayıt durur, uçuş canlı devam eder (exception yok). O uçuştan kod üretilmez.
- `encodeGhostCode` çağıran hatalarında (komut tick'i > tickCount, aralık dışı başlık) `RangeError` atar — kullanıcı verisi değil, entegrasyon hatası.
- `toCommands(input, actorId)` birebir aynı diziyi üretir (1000 rastgele akış testinde `toEqual`). `ReplayCursor` tick tick besler, eksen komut nesnelerini havuzdan yeniden kullanır (sim değerleri kopyalamalı, referans tutmamalı).
- **−0 notu:** `Int8Array` −0'ı 0'a çevirir. Girdi katmanı `Math.round` sonrası `| 0` uygulamalı (−0 üretmemeli); aksi hâlde canlı uçuş −0, hayalet 0 görür (bölme yoksa fark etmez ama determinizm için sıfır risk istiyoruz).
- **Doğrulama:** alıcı `decodeGhostCode(text, SIM_VERSION)` → `ReplayCursor` ile yeniden sim → `verifyGhostOutcome(header, {tickCount, finalTimeMs, score, finalStateHash})`; herhangi bir fark → "Kod geçersiz".
- İsim: kontrol/bidi/görünmez karakterler atılır, boşluk sadeleşir, 16 UTF-8 bayta kod noktası sınırında kesilir (sonda kalan ZWJ/VS/boşluk atılır). Kodlama ve çözmede aynı (idempotent) temizlik.

## 5. Ölçülen kod uzunlukları (`npx vitest run tests/unit/replayGhost.test.ts`)
Gerçekçi başparmak modeli (§2.2 hattı: yüzen çapa, radyal ölü bölge 0,08 + yeniden ölçek, expo 0,35/0,50, ±31 nicemleme, 30 Hz; kritik sönümlü başparmak ω=13, hareket/tutma/yavaş düzeltme/bırakma manevraları, σ≈0,36 pt titreme, 1 pt dokunmatik çözünürlük), 20 seed, isimli başlık:
| Senaryo | Ortalama | Min | Maks |
|---|---|---|---|
| (a) 60 s tipik | 968 | 830 | 1.106 |
| (b) 120 s tipik | **1.827** | 1.653 | **2.022** |
| 120 s sakin başparmak (düşük titreme) | 1.627 | — | 1.851 |
| 120 s tipik + 0,25 adım histerezis | 1.597 | — | 1.842 |
| 120 s agresif (2× manevra, 2× titreme) | 2.281 | — | 2.410 |
| (c) 120 s en kötü (her örnek düzgün rastgele) | 8.337 | | |
- §4.G.8/§9.G-14/§11.G hedefi **120 s tipik ≤ 3.000 karakter: karşılandı** (maks 2.022). Kodlama ~1,3 ms, çözme ~1,1 ms.
- §2.5'teki "≤ 600 karakter tasarım hedefi" 30 Hz tam doğrulukta 120 s insan girdisiyle **ulaşılamaz** (titreme dahil girdi entropisi ~1,2 KB). Kısa kod, §4.G.11'deki gibi çevrimiçi dönemde sunucunun kısa koda dönüştürmesiyle gelir. Deflate düzeyi/mem ayarı fark yaratmıyor (ölçüldü).
- V8 (Node) ve JSC (Bun) aynı akış için **bayt-bayt aynı kodu** ve aynı günlük tohum hash'ini üretti.

## 6. Günün Rotası takvimi ve tohumlar (`daily.ts`)
- **Yayın günü = 2026-10-08 (İstanbul) = #1.** `dailyIndex(key) = gün(key) − gün(20261008) + 1`; yayından önceki günler ≤ 0 döner. `dateKeyForDailyIndex(n)` tersidir (hayalet kodu yalnız #N taşır; alıcı tarihi buradan bulur).
- İstanbul sabit UTC+3 (2016'dan beri yaz saati yok): `gün = floor((utcMs + 3 sa) / 1 gün)`; tarih Hinnant `civil_from_days` ile tamsayı aritmetiğinden — sim'de `Date` yok. Testte 365 gün boyunca gün sınırı tam 21:00 UTC'de, `Intl` (Europe/Istanbul) ile birebir; AB yaz saati geçişlerinde (2027-03-28, 2027-10-31) kayma yok.
- `dailySeed = fnv1a32("KANAT-GR-" + yyyymmdd)`, `suruDaySeed = fnv1a32("KANAT-SG-" + yyyymmdd)` (UTF-8 bayt üzerinde FNV-1a; vektörler testte). 365 ardışık günde tohumlar benzersiz, iki aile çakışmıyor.
- Zorluk ISO hafta gününden: Pzt 3 · Sal 4 · Çar 4 · Per 5 · Cum 6 · Cmt 6 · Paz 7 (3→7 doğrusal, yuvarlanmış).
- **Dünya:** `dailyWorld(seed) = WORLD_IDS[fmix32(seed) % 5]` (brif: "dünya seed ile döner"). Dünya **temel tohumdan** seçilir; rota üreticisi uçulamaz koridorda `seed+1, seed+2…` denerken dünyayı değiştirmemeli. Ardışık iki günde aynı dünya olasılığı %20 — kabul edildi (sezgisel çeşitlilik; 365 günde her dünya 40+ kez).
- Geri sayım için `msUntilNextIstanbulDay(utcMs)`; uygulama zamanı host/platformdan alır (`dailyInfoAt(utcMs)`), sim saat okumaz.

## 7. Yakınlık şeridi (`proximityStrip.ts`)
- `s` = rota spline yay uzunluğu oranı [0,1] (çağıran hesaplar; dışı kırpılır, NaN ve dt ≤ 0 yok sayılır). Parça = `min(4, floor(5s))`.
- Kademe = çarpan: 0→⬜, 1→🟩, 2→🟨, 3→🟧, 5→🟥 (ara değer aşağı yuvarlanır). Her parçada en çok süre geçirilen kademe; **eşitlikte yakın (yüksek) kademe** kazanır. Hiç süre yoksa ⬜ ve `visited=false`.
- `add()` tahsis yapmaz (Float64Array). `timeAtOrAbove(3) ≥ 15` → Günün Rotası 3 yıldız yakınlık şartı.

## 8. Paylaşım metni (`shareText.ts`, saf)
- §2.8 biçimleri birebir: Günün Rotası, Kariyer, SÜRÜ.io kartı, `Düello:` satırı (her zaman görünen `KNT1-` biçimi), hayalet kart başlığı ("Ayşe’nin hayaleti · Günün Rotası #214 · 2:07.4"), düello sonucu ("Kazandın · 0,8 sn"), kapı farkı ("−0,42").
- Süre `m:ss.t`, onda bire **kesilir** (yarış zamanlaması geleneği). Sayılar elle gruplanır (TR `48.210`, EN `48,210`; Intl'e bağımlı değil). Eksi işareti U+2212.
- `🛟`/`🐢` ilk satırın sonuna boşlukla eklenir. Öneri: `assist` = Uçuş Yardımı ≠ Kapalı **veya** Otomatik Paraşüt **veya** Rehber Hat/Rehber Rüzgâr.
- İngilizce terimler UI ajanının `src/ui/strings/en.ts` `share.*` anahtarlarıyla hizalandı (Daily Route, Proximity, Duel, Flock Day, League Match, Practice, Peak N birds, Encircle ×N, Survived to sunset). Türkçe iyelik ünlü uyumuyla, kesme işareti ’ (UI ile aynı).
- **Tekrar:** UI'da `i18n.possessive/ordinal` ve `share.*` dizgeleri var; bu modül sim tarafında saf eşdeğeridir (Node testleri, sunucu doğrulaması, vurgu klibi bitiş kartı için). Ana ajan birini seçebilir.

## 9. ARAYÜZ İSTEKLERİ
1. **flight:** `SIM_VERSION` (u16) dışa aktarılsın (ör. `src/sim/version.ts`); replay bu değeri parametre olarak alır, kendisi sabit tutmaz. Sim davranışı değiştiren her değişiklikte artırılmalı.
2. **platform / input:** eksen nicemlemesi `(Math.round(x) | 0)` ile −0'sız; isteğe bağlı 0,25 adım histerezis (titreme kırpışmasını keser, kodu ~%13 kısaltır, uçuşu da yumuşatır).
3. **integrator:** her tick `recorder.pushAll(cmds)` ardından `sim.step(cmds)`; uçuş sonunda `encodeGhostCode(header, recorder.input())`. Alımda `decodeGhostCode` → `ReplayCursor(input, ghostActorId)` ile hayalet sim → `verifyGhostOutcome`.
