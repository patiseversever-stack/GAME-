# BOTLAR — denetim ve ayar notları (17 Ekim)

Kullanıcı isteği: "Botlarda sıkıntı var mı? Hile gibi çok akıllı olmasın, salak da olmasın; teke tek, 4'lü, eşli…
Blöf her açıdan mükemmel olmalı." Bu belge bulunanları, düzeltmeleri ve önce/sonra ölçümleri özetler.

**Ölçüm araçları** (repoda, tekrar koşulabilir):
- `tests/blofAudit.ts` — Blöf zaman çizelgeli simülatör (ev sahibi akışı: sunum süreleri, bot bekleme, 5 sn pencere) +
  "sıradan oyuncu" insan vekili (`CasualHuman`: kart saymaz, doğru açar, %12 araya yalan katar, arada blöf yapar,
  son karta hep "Blöf!" der, kendi elinden kesin yalanı ve masada 4'ü aşan iddiayı yakalar).
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

**Önemli keşif (1'e 1):** açışta yakalanan yalancı yalnız **kendi kartlarını geri alır** (yığında başka kart yok); bedeli
yalnız turu kaptırmak. Ölçüm: hep araya yalan katan sıradan oyuncu, sıradan oyuncuyu %86, eski ve yeni bütün botları
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

## 5. Ayar özeti (src/ai/blofBot.ts → BLOF_BOT_PARAMS)

| | kolay | orta | zor |
|---|---|---|---|
| Kart sayma / hafıza / dalgınlık | yok / 0,3 / — | var / 0,75 / %20 | var / 0,93 / %12 |
| Son karta "Blöf!" | %93 | %100 | %100 |
| 1'e 1 açışa yalan katma | %12 | %25 | %45 |
| Şüphe (1'e 1 / kalabalık) | −0,8 / 0 | 0 / −0,5 | 0 / −1 |
| Tepki aralığı (kesin / kuşkulu, ms) | 1100–2400 / 1500–3600 | 800–1700 / 1100–2900 | 650–1400 / 950–2600 |

## 6. Kullanıcı kararı gereken konular

1. **1'e 1'de açış yalanı neredeyse bedava (en önemli konu).** Yakalanan açan yalnız kendi attığını geri alır, bedeli
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
3. **4 kişide insan bekliyor:** her bot atışında insan da blöf diyebildiği için pencere 5 sn sürüyor ("Geç"e basmazsa);
   insanın iki kararı arasında p90 ≈ 23–30 sn (eşli 22–45 sn). Öneri: "Geç"i bir kez seçince o turda otomatik geç,
   ya da sıra insanda değilken pencereyi kısaltma (kural/arayüz kararı).
4. **Pişti — alınan kapalı masa kartları:** arayüz alınan yığındaki değerli kapalı kartları herkese gösteriyor
   ("kapalıysa açılır"); çevrimiçi `redact` de `capture` olayını süzmüyor. Kapalı kartlar herkese açık mı olmalı?
5. Kalabalık masada el ~4 dk; hedef 4–8 dk ise botların düşünme süresi biraz uzatılabilir (oynanışı değiştirmez).
