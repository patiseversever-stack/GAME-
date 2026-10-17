# BOTLAR — denetim ve ayar notları (17 Ekim)

Kullanıcı isteği: "Botlarda sıkıntı var mı? Hile gibi çok akıllı olmasın, salak da olmasın; teke tek, 4'lü, eşli…
Blöf her açıdan mükemmel olmalı." Bu belge bulunanları, düzeltmeleri ve önce/sonra ölçümleri özetler.

**Ölçüm araçları** (repoda, tekrar koşulabilir):
- `tests/blofAudit.ts` — Blöf zaman çizelgeli simülatör (ev sahibi akışı: sunum süreleri, bot bekleme, pencere — 17 Ekim'den beri
  sıradaki insan vekiliyse 5 sn, değilse 3 sn; ceza kartı sunumu dahil) + "sıradan oyuncu" insan vekili (`CasualHuman`: kart saymaz,
  doğru açar, arada araya yalan katar ve blöf yapar, son karta hep "Blöf!" der, kendi elinden kesin yalanı ve masada 4'ü aşan iddiayı
  yakalar). 17 Ekim'den beri varsayılan vekil ceza kuralını bilir (`CASUAL`: açışa %4 yalan, elinde yokken 1'e 1'de %40, kalabalıkta
  %30 blöf); eski "saf" tarz `CASUAL_NAIVE` (%12 / %70 / %45) karşılaştırma için durur. §7.
- `tests/pistiAudit.ts` — Pişti simülatörü + basit insan vekili (alabiliyorsa alır, Valeyi saklar, kart saymaz).
- Testler: `tests/blofAudit.test.ts` (hile yok, salak hamle yok, zamanlama, canlı el, zorluk merdiveni),
  `tests/pistiAudit.test.ts` (hile yok, Vale, düşünme süresi, kalite), `tests/blofBot.test.ts` (bot-bot sıralaması).
- Süreler tahminîdir: animasyon/sunum ≈ atış 0,6 sn, blöf anı ≈ 2–3,5 sn, kenara ≈ 1 sn; insan vekili 2–6 sn düşünür,
  pencerede %55 "Geç"e basar, yoksa 5 sn dolar.

## 1. Hile yok (iki oyunda da)

- **Blöf botu** yalnız kendi `BlofView`'unu ve kendine süzülmüş (`redact`) olayları görür. Test: ev sahibi üzerinden
  4 modda tüm oyun boyunca botlara giden olaylarda başkasının kapalı kartı yok; rakiplerin kapalı kartları değişse de
  (aynı görünüm + aynı geçmiş) karar birebir aynı.
- **Pişti botu** `match.ts`'te HAM olayları alıyordu (gizli kartlar dahil); bot bunları kullanmıyordu ama korunmuyordu.
  Test: ham olay ile süzülmüş olay verilen botlar 90 oyunda birebir aynı kartları oynar; deste sırası ve rakip eli
  karıştırılınca (görünüm aynı) karar aynı; ev sahibi üzerinden bot beyni yalnız kendi kartını ve açık masa kartını görür.
- Kart sayma "mükemmel" değil: zor bot da arada unutur (Blöf: `memory 0.93`, karar başına %12 "dalgınlık" — kart saymadan
  yalnız kendi eline bakar; Pişti: karakter hafızası ≤ 0,97).

## 2. Blöf — bulunan sorunlar ve düzeltmeler

Karşılaştırma: aynı tohumlar, el başına 300 el, insan koltuğunda **sıradan oyuncu** (botlar her iki sürümde de aynı ölçümle).

| Sorun (önce) | Kanıt (önce) | Düzeltme | Sonra |
|---|---|---|---|
| **Dürüst açışa sürekli "Blöf!"** — yalan tahmini açışta değeri açanın seçtiğini (en kalabalık grubunu açar) hesaba katmıyordu | 3–4 kişide açışların %90–100'ü doğru, botlar %20–60'ına blöf diyordu; bot-bot masada çağrıların ancak %8–22'si yerinde | Bayes: kopya dağılımı × davranış olabilirliği (açanın seçimi ∝ kopya², araya yalan katma, takipçi blöfü), rakip başına açış/takip ayrı öğrenme | dürüst 3–4'lü açışa çağrı: 4 kişide **%4–5**, 1'e 1'de %12–19 (yalnız "sıkışınca") |
| **Zorluk sırası tersti** (1'e 1) | sıradan oyuncu kolayı %76, ortayı **%85**, zoru %63 yeniyordu | yukarıdaki + aşağıdakiler | kolay **%75**, orta **%51**, zor **%41** |
| **Göze batan imkânsız yalan** (masada 4'ü aşan iddia) | 1'e 1 el başına kolay 5,0 · orta 6,9 · zor **9,1** | rakibin göreceği şey (masadaki iddialar, elindeki kopyalar) riske girer; kendi iddiasını denetler | botlardan **0** (kolay da 0) |
| **Son karta blöf dememek** = eli hediye etmek | 1'e 1 son kartların: kolay %21, orta %5 blöfsüz bitti | orta/zor her zaman der; kolay %93 | orta/zor **%0**, kolay %4–6 |
| **Kolay "Çabuk kanar" değildi** | kolay pencerelerin %35–51'ine blöf diyordu | kolay için kart saymayan ama kopya olasılığına bakan risk tahmini, düşük şüphe (1'e 1) | çağrı %30–39 |
| Rakibi tanımıyordu (yalnız genel "blöf deme sıklığı") | hep açışta yalan katan oyuncuya karşı bile açış kuşkusu yükselmiyordu (çarpan tavanı 1,8) | rakip başına açış/takip ayrı: blöf deme sıklığı ve açılan atışlarında yalan payı (kamuya açık); az tanıdığına ucuz yığında ara sıra "bir bakalım" | test: dört yalanı görülen rakibe kuşku +0,1'den fazla |
| Masadaki iddialar 4'ü aşınca kim yalancı? | (yeni kural mantığı) | kuşku turdaki iddialara türüne ve kişinin geçmişine göre paylaştırılır (çoğu zaman yalancı, araya yalan katan açandır) | — |
| **Robotik tepki** | zor "Blöf!" p10 0,52 sn (1'e 1) | insan alt sınırı: blöf ≥ 0,5 sn, geç ≥ 0,45 sn; büyük yığında ve kararsızken daha uzun; kesin yakalama daha çabuk | zor p10/p50/p90 **0,8 / 1,3 / 2,0 sn**, orta 1,0/1,5/2,3, kolay 1,3/2,0/3,0 |
| Düşünme süresi sabit aralık | — | kararsızlığa göre (iki en iyi seçenek yakınsa uzun), %6 "dalgın" uzun düşünme, bitirişte kısa | testli |

**Önemli keşif (1'e 1) — 17 Ekim'de kural değişikliğiyle kapandı (§7):** açışta yakalanan yalancı yalnız **kendi kartlarını geri
alır** (yığında başka kart yok); bedeli yalnız turu kaptırmak. Ölçüm: hep araya yalan katan sıradan oyuncu, sıradan oyuncuyu %86, eski ve yeni bütün botları
**%90+** yeniyordu. Botlar artık 1'e 1'de doğru açışına ara sıra bir yalan kart katar (kolay %12, orta %25, zor %45) —
zoru sıradan oyuncuya karşı %37'den %59'a çıkaran en büyük etken. Bkz. §6, kullanıcı kararı gerekiyor.

**Zorluk merdiveni (sonra)** — sıradan oyuncunun kazanma oranı (adil pay parantezde):

| Mod | kolay | orta | zor |
|---|---|---|---|
| 1'e 1 (%50) | %75 | %51 | %41 |
| 3 kişi (%33) | %42 | %33 | %30 |
| 4 kişi (%25) | %24 | %17 | %13 |
| Eşli, takım (%50; ortak da bot) | %49 | %53 | %44 |

(Önce: 1'e 1 %76/%85/%63 · 3 kişi %64/%44/%28 · 4 kişi %52/%23/%20 · eşli %66/%50/%53.)
Bot-bot (testte): 1'e 1 zor>kolay %73, zor>orta %56, orta>kolay %75; kalabalıkta zor ≈ orta (şans payı büyük), ikisi de kolayı geçer.

**Diğer ölçümler (sonra, sıradan oyuncuyla):**
- El süresi (medyan / p90): 1'e 1 **3,2–3,5 dk** / ≤ 4,2 dk · 3 kişi 3,5–4,3 dk · 4 kişi **3,8–4,4 dk** / ≤ 6 dk ·
  eşli 3,5–4,2 dk. (Hedef 1'e 1: 2–5 dk ✓; 4 kişi 4–8 dk: alt sınırda.)
- Blöf oranı (atışların): 1'e 1 %10–15 · kalabalık orta/zor %7–14, kolay %19–24 ("sık blöf yapar").
  Pencere başına "Blöf!" 1'e 1 %30–33 · kalabalık %22–26 (önce %39–55). Pas oranı kalabalıkta %41–49 (kuralın doğası:
  pas ucuz); en uzun pas serisi kural gereği n−1.
- "Tek kartı kalan rakibe son pasla turu açtırmak", "elinde değer varken pas", imkânsız yalan, takılma: **0**
  (son ölçümde 36 düzen × 300 = 10.800 el).
- Eşli: ortağa blöf diyemez (motor); tek kartı kalan ortak son atansa elinde değer olsa da pas der (turu ortağa döndürür) —
  test; ortağın hamlesi için zamanlama/atışma aynı.

## 3. Blöf — kurallar (motor) denetimi

docs/BLOF.md'ye göre denetlendi, testlerde var/eklendi: 3 kişide fazla kart açanın sonrakine (17-17-18), herkes pas →
yığın kenara + son atan açar, açan pas diyemez, son kart penceresi (blöfsüz/yanlış blöf → bitirir; yakalanırsa yığını alır),
eşlide takım arkadaşına blöf yok, herkes "geç" → pencere erken kapanır, bayat `windowClosed` reddedilir, 52 kart korunur,
ilk bitiren kazanır. **Kural hatası bulunmadı.** Ama iki tasarım sorunu var (§6).

## 4. Pişti

Önce/sonra (1000 oyun, insan vekiline karşı; bot hamlesi başına binde):

| | önce | sonra |
|---|---|---|
| Boş yığına Vale (başka kart varken) | 4,2–5,4 | **0,7–3,4** (çoğu son el) |
| Pişti kaçırma | 0 | 0 |
| Ucuz yığına Vale: Rıza/Defne · Dursun/Cem | 0–0,5 · 4–9 | aynı (kolay karakterlerin insanca hatası) |
| Önlenebilir pişti verme: Defne · Dursun | 0,1–0,2 · 2,3–2,8 | aynı |
| Skor (1'e 1, Defne − insan vekili) | +3,8 | +3,8 |

- Elde ~1,1 pişti/oyun; çoğunluk beraberliği %3–5; son alma kuralı (kalan kartlar son alana) motorda doğru.
- Düzeltme: elde Vale tutmanın değeri (ileride yığın alır) eklendi; düşünme süresi kararın zorluğuna göre (tek kart /
  apaçık pişti 0,7×, başa baş 1,4×) — `PistiBot.thinkScale()`, `match.ts` ve `PistiBotBrain` kullanıyor.
- Eşli: takım arkadaşından risk sayılmaz (önceden vardı), ortak yığını "çalmak" diye bir şey yok (puan ortak).

## 5. Ayar özeti (src/ai/blofBot.ts → BLOF_BOT_PARAMS; 17 Ekim ceza kuralına göre yeniden ayarlı, eski değer parantezde)

| | kolay | orta | zor |
|---|---|---|---|
| Kart sayma / hafıza / dalgınlık | yok / 0,3 / — | var / 0,75 / %20 | var / 0,93 / %12 |
| Son karta "Blöf!" | %93 | %100 | %100 |
| 1'e 1 açışa yalan katma (`padOpen2`) | %6 (%12) | %5 (%25) | %5 (%45) |
| Ceza kartını hesaba katma (`penaltyWeight`, yeni) | 0,3 (acemi küçümser) | 0,8 | 1 |
| Şüphe (1'e 1 / kalabalık) | +0,6 / −0,8 (−0,8 / 0); eşlide 0 | 0 / −0,2 (0 / −0,5) | +0,8 / −0,3 (0 / −1) |
| Blöf sevgisi (1'e 1 / kalabalık çarpanı) | 0,9 / 1,3 (1,6) | 1,05 / 1,5 | 1,2 / 1,375 (1,1 / 1,5) |
| Tepki aralığı (kesin / kuşkulu, ms; 5 sn pencere) | 1100–2400 / 1500–3600 | 800–1700 / 1100–2900 | 650–1400 / 950–2600 |
| 3 sn pencerede | 0,9 sn'nin üstü orantılı sıkışır: 4,7 sn → 2,7 sn (en yavaşı da pencere bitmeden) | aynı | aynı |

## 6. Kullanıcı kararı gereken konular

1. **[KARAR VERİLDİ 17 Ekim → §7: yakalanan yalancı kenardan 2 ceza kartı alır]** **1'e 1'de açış yalanı neredeyse bedava (en önemli konu).** Yakalanan açan yalnız kendi attığını geri alır, bedeli
   yalnız turu kaptırmak. Ölçüm (300 el): her açışına bir yalan kart katan sıradan oyuncu → sıradan oyuncuyu %86, **zoru %93,
   ortayı %94** yeniyor (kolayı %61). Hiçbir savunma işe yaramıyor: açışların hepsine blöf demek %78, kanıtlı yalanı
   yakalamak bile yalancıya turu bedavaya vermek demek. Bir insan bunu keşfederse her eli kazanır.
   **Denenen kural (simülasyon): "yakalanan yalancı yığına ek olarak kenardan 2 kart alır"** → hep-yalancı sıradan oyuncuya
   %3, botlara %0 kazanır; normal oyun değişmez (sıradan × sıradan %51, el +30 sn). Bu kural seçilirse botların
   `padOpen2` değeri ~0,05'e indirilmeli (şu anki %12/%25/%45 bugünkü kurala göre ayarlı). Diğer seçenekler: açışta
   yakalanan bir sonraki turu açamaz; ya da pas yığını kenara göndermez (klasik Blöf, §1 kuralını değiştirir).
2. **Sonsuz döngü mümkün:** iki oyuncu hep açışa yalan katar ve birbirinin dördüncü kartını tutarsa el hiç bitmez
   (yığın hep yalancıya döner): hep-yalancı × hep-yalancı 300 elin 296'sı takıldı (ceza kuralıyla da). Botlar bunu yapmaz
   (%50 yalan katan iki oyuncuda 0/300), ama çevrimiçi iki insan için hamle sınırı gerekir (ör. 600 hamlede en az kartı
   olan kazanır) — motor şu an sınırsız.
3. **[KARAR VERİLDİ 17 Ekim → §7: sıradaki insansa 5 sn, değilse 3 sn]** **4 kişide insan bekliyor:** her bot atışında insan da blöf diyebildiği için pencere 5 sn sürüyor ("Geç"e basmazsa);
   insanın iki kararı arasında p90 ≈ 23–30 sn (eşli 22–45 sn). Öneri: "Geç"i bir kez seçince o turda otomatik geç,
   ya da sıra insanda değilken pencereyi kısaltma (kural/arayüz kararı).
4. **[KARAR VERİLDİ 17 Ekim → §7: yalnız alan görür; `capture.hidden` süzülür, arayüz kapalı uçurur]** **Pişti — alınan kapalı masa kartları:** arayüz alınan yığındaki değerli kapalı kartları herkese gösteriyor
   ("kapalıysa açılır"); çevrimiçi `redact` de `capture` olayını süzmüyor. Kapalı kartlar herkese açık mı olmalı?
5. Kalabalık masada el ~4 dk; hedef 4–8 dk ise botların düşünme süresi biraz uzatılabilir (oynanışı değiştirmez).

## 7. Kural değişikliği (17 Ekim, kullanıcı kararı) — ölçümler

Kurallar: **(1)** Blöf'te yalanı yakalanan yığına ek olarak **KENAR'ın üstünden 2 ceza kartı** alır (kenarda 1 varsa 1, boşsa
yok). **(2)** Blöf penceresi atıştan sonra **sıradaki insansa 5 sn, bot ise 3 sn**. **(3)** Pişti'de alınan **kapalı masa kartlarını
yalnız alan görür**. (BLOF.md, ONLINE.md, KARARLAR.md.)
Ölçüm: tests/blofAudit.ts, her hücre 300 el, aynı tohumlar; rapor betiği `BLOF_REPORT=1` ile vitest'te koşulan geçici bir dosyaydı
(depoda değil: tsconfig node tipleri içermiyor) — aynı sayılar `auditMany(...)` çağrılarıyla yeniden üretilir.

**İstismar kapandı** — 1'e 1, her açışına bir yalan kart katan sıradan oyuncunun kazanma oranı:

| rakip | kolay | orta | zor | sıradan oyuncu |
|---|---|---|---|---|
| önce | %61 | %94 | %93 | %86 |
| **sonra** | **%0** | **%0** | **%0** | **%1** |

**Zorluk merdiveni** — sıradan oyuncunun kazanma oranı (adil pay parantezde). "Sonra" satırı ceza kuralını bilen vekille
(`CASUAL`: daha az blöf); "saf" satırı eski tarzda oynamayı sürdüren vekille (bilerek kaybeden bir strateji: blöflerinin %75'i
yakalanıyor, elde +4 ceza kartı — gerçek oyuncu "+2 ceza"yı gördükçe blöfünü azaltır):

| Mod | önce (eski kural) | **sonra** | sonra, saf vekil |
|---|---|---|---|
| 1'e 1 (%50) | %75 / %51 / %41 | **%74 / %49 / %44** | %58 / %35 / %36 |
| 3 kişi (%33) | %42 / %33 / %30 | **%40 / %33 / %32** | %38 / %35 / %26 |
| 4 kişi (%25) | %24 / %17 / %13 | **%28 / %19 / %18** | %31 / %19 / %18 |
| Eşli (%50) | %49 / %53 / %44 | **%58 / %51 / %49** | %57 / %52 / %50 |

(kolay / orta / zor.) Zor'un 1'e 1'deki eski %41'i büyük ölçüde açışa %45 yalan katmasından geliyordu (artık ceza yüzünden
kârsız, istenen ~%5); 600 ellik ölçümde zor %44–46, kalabalıkta %15–18 (±%2–3 örnekleme payı). Eşlide kolay biraz daha kolay
(acemi ortağına güvenmez: kalabalık temkinini bırakıp daha çok, çoğu boşa "Blöf!" der) — bot-bot eşlide zor/orta takımı kolayı %71/%68 yener.
Bot-bot 1'e 1: zor>kolay %88 (önce %78), orta>kolay %85 (%76), zor>orta %49 (%57; yakın — iki zorluk arasındaki fark artık
çoğunlukla insana karşı çıkıyor).

**El süresi** (medyan, sıradan oyuncuyla; kolay / orta / zor): 1'e 1 3,5 / 2,9 / 2,8 dk (önce 3,5 / 3,2 / 3,3) · 3 kişi 4,0 / 3,4 /
3,3 (4,3 / 3,6 / 3,5) · 4 kişi 4,3 / 3,6 / 3,6 (4,4 / 4,0 / 3,8) · eşli 4,2 / 3,6 / 3,5 (4,2 / 3,6 / 3,5). Kısa pencere elleri
~0,2–0,4 dk kısalttı; ceza kartları biraz uzattı.

**Pencere ve zamanlama:**
- Botların "Blöf!" tepkisi p10/p50/p90 (sn, sunum bittikten sonra): zor 0,8–0,9 / 1,1–1,2 / 1,5–1,6 · orta 0,9–1,0 / 1,2–1,3 / 1,6–1,8 ·
  kolay 1,1 / 1,4–1,5 / 1,9–2,4 (önce 3,0'a dek). Test: 3 sn'lik pencerede bütün kararlar 0,45–2,7 sn arasında, en yavaşlar pencerenin
  sonuna yığılmaz (%10'dan az ≥ 2,69 sn); zor kesin yalanı her zaman, orta ≥ %90 yakalar.
- İnsanın bir kararı için en uzun bekleyişi p90: 4 kişi 21–29 sn (önce 23–31), eşli 23–38 sn (22–45), 3 kişi 17–24 sn (18–25).
  Kazanç sınırlı: bekleyişin çoğu botların düşünme/sunum süresi; "geç"e basılmayan pencereler artık 3 sn.
- Blöf oranı (atışların): 1'e 1 orta/zor %4 (önce %10–15; farkın çoğu kaldırılan açış dolgusu), kolay %7; kalabalık orta/zor %4–8,
  kolay %15–20. Bot-bot ellerde orta/zor %2,5–5,7 — 4 kişilik ellerin ~%20'sinde botlar hiç blöf yapmıyor. `bluffLove` bunu pek
  oynatmıyor (karar riskle belirleniyor); daha "blöflü" masa istenirse ayrı bir lezzet ayarı gerekir (açık konu).

**Bot bilgisi (ceza kartları):** bot, kenara giden yığınlardaki kendi kartlarının sırasını tutar: kenarın üstündekini kendisi attıysa
ceza alanın elinde olduğunu KESİN bilir, bilmediğinde kenardaki her kart için "o koltukta olabilir" der (kenar tümden alındıysa kesin).
Test: ceza dahil 30 tam oyunda her botun maskesi her an gerçeği içeriyor; kart saymayan kolay da güvenli genişletir.

**Pişti:** botlar `match.ts`'te de artık yalnız kendi koltuğuna süzülmüş olayı görür; alan bot kapalı kartları "görülmüş" sayar
(oyundan çıktılar), diğerleri hiç bilmez — test (ev sahibi üzerinden 1'e 1 / 4 kişi / eşli). Ham/süzülmüş olayla 90 oyunda kararlar
yine birebir aynı.

