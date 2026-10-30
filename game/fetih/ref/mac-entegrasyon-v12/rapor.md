# Maç entegrasyonu v1.2: 14 yeni soru tipi gerçek maçta

Onaylanan 13 tip maçta. Gölge kayıtlı ama bayrakla kapalı (`cfg.yeni = { golge: true }` açar). Koşu ve Bağlantı maça
girmiyor. Eski 16 tip olduğu gibi kaldı; bankaya yeni giren anagram, çengel ve yıldırım da düzene katıldı. Tablolar ve
gerekçeler `DESIGN.md` "v1.2 maç soru düzeni" bölümünde. Kod: `src/quiz/mac.js` (düzen, köprü, filmler, görünüm
sertleştirme), `src/game/sunucu.js` (sunucu adımları), `match.js` (anlar, film, sunucu oturumu), `net.js` (şema, istemci botu).

## 1. Düzen tek bakışta

- **Anlar:** yayılma · düello · kale kuşatması · eşitlik bozma · altın soru (ayrı ağırlık tabloları).
- **Yeni tip payı:** yayılmada %45–50, düelloda %38–44, kuşatmada %43–52. Bütün maçta %39–43. Klasik 4 şıklı test düellonun
  en sık tipi olarak kalıyor (%15–16).
- **Canlı turlar** (Halat, Fitil) yalnız düelloda ve kuşatmada. Kuşatmada yıldız: Halat %8, Fitil %8.
- **Eşitlik bozma ve altın soru:** Tahmin %76, Mancınık %24.
- **Kapsam düzeltmesi:** yalnız Coğrafya'da sorusu olan haritalı tipler, her kategoride sorusu olan Halat kadar sık geliyor.
  Yayılmada Coğrafya ×2,5: harita boşken haritalı tipler en anlamlı anında.
- **Kurallar:** aynı tip art arda hiç gelmiyor (4.000 maçta 0). Her tip için maç başına üst sınır var. Okuma ağır tiplerin
  yayılmada yalnız kısa soruları geliyor. "Erken bilen kazanır" tiplerinde düello eşitlik sorusuna gitmiyor. Zorluk maç
  boyunca artıyor (−0,3 → +0,3). Bir tipin ilk sorusu kolay geliyor.

## 2. Her mod için örnek soru akışı

Kısaltmalar: Y yayılma, D düello, K kuşatma, E eşitlik bozma, A altın soru. Akışlar `node test/sim.mjs --akis` çıktısından
(tohum 4242, hızlı maç). Yıldızlılar yeni tip.

| mod | akış |
|---|---|
| 1'e 1 | Y:order Y:*kayip Y:order Y:*azbilinen D:order D:cross D:hilo E:num D:hilo D:riddle D:*yanlis D:choice D:pin D:tf E:num D:riddle |
| 3 kişi | Y:blitz Y:num Y:hilo Y:*ilavi Y:*kimim K:*tufan E:*mancinik D:anagram E:num D:cross K:choice D:order D:*mancinik D:match D:*kayip D:*halat K:hilo D:*sive D:*kimim |
| 4 kişi | Y:*sive Y:blitz Y:*ilavi Y:*tufan Y:order D:choice D:anagram D:*kimim D:*ikidogru D:emoji E:num D:hilo D:*halat D:cross K:*kusbakisi D:order D:odd D:match |
| eşli | Y:*sive Y:num Y:pin Y:order Y:*ilavi D:*kayip D:riddle E:*mancinik D:*yanlis D:*tufan E:num D:*sive D:match D:riddle D:hang E:num D:*kayip D:*kimim D:*fitil D:*ikidogru E:*mancinik |

Gerçek tarayıcı akışları (`tools/flow.mjs --tam`) aşağıdaki 3. bölümde.

## 3. Gerçek tarayıcı akışı (başsız Chromium, tam maç, sayfa hatası yok)

Komut: `node tools/flow.mjs <çıktı> --mode=… [--length=long] --only=y --tam`. Beş maç da sonuna dek oynandı; sayfada hata
satırı yok. Süreler oyun saatiyle (betikteki insan her soruyu ~2,6 sn'de cevaplıyor, bu yüzden tahminden kısa). "(izle)"
insanın seyrettiği bot düellosu.

| mod | süre | soru | yeni tip | soru akışı (Y yayılma, D düello) |
|---|---|---|---|---|
| 1'e 1 hızlı | 5,9 dk | 16 | 8 | Y num · ilavi · harfal · azbilinen · D riddle · num · mancinik · order · choice · num · proverb · kimim · fitil · yanlis · mancinik · match |
| 3 kişi hızlı | 7,2 dk | 19 | 9 | Y blitz · num · harfal · hilo · kusbakisi · D yanlis · halat · azbilinen · tf · mancinik · hang · fitil · match · emoji · kayip(izle) · ikidogru · emoji · num · match |
| 4 kişi hızlı | 6,4 dk | 19 | 10 | Y sive · order · kusbakisi · harfal · order · D ilavi · ikidogru · riddle(izle) · num(izle) · match(izle) · kusbakisi(izle) · proverb(izle) · num(izle) · choice(izle) · mancinik · yanlis · odd · kimim(izle) · harfal(izle) |
| eşli hızlı | 6,9 dk | 18 | 11 | Y sive · num · mancinik · harfal · num · D kusbakisi · tf(izle) · fitil(izle) · choice · kimim(izle) · halat · kayip · choice · fitil · riddle · num · yanlis(izle) · halat(izle) |
| 1'e 1 uzun | 13,7 dk | 35 | 16 | Y yanlis · kayip · num · azbilinen · blitz · order · pin · sive · azbilinen · pin · harfal · D choice · num · halat · order · choice · mancinik · choice · halat · blitz · hilo · riddle · mancinik · halat · choice · num · mancinik · sive · kusbakisi · sive · choice · num · tf · kayip · riddle |

Görüntüler (her yeni tip maçta: soru kartı + cevap filmi, `<tip>.jpg`): kusbakisi, ilavi, sive, mancinik, yanlis, ikidogru,
harfal (4 kişi); halat, kayip, fitil (eşli); kimim, azbilinen (1'e 1); tufan (3 kişi, birleşmeden önceki derleme; kod aynı).

## 4. Benzetim (`node test/sim.mjs --plan=500`: 4.000 maç, eşit 'er' botlar)

| mod/uzunluk | soru/maç | yeni % | süre dk (ort) [en az–en çok] | film sn/maç | farklı yeni tip/maç | kazanan koltuk % |
|---|---|---|---|---|---|---|
| 1'e 1 hızlı | 16,1 | 43 | 7,7 [4,9–9,8] | 27 | 6,0 | 57 / 43 |
| 1'e 1 uzun | 34,7 | 43 | 18,4 [10,0–20,3] | 58 | 9,5 | 49 / 51 |
| 3 kişi hızlı | 19,3 | 42 | 7,9 [6,4–9,5] | 25 | 6,8 | 34 / 34 / 32 |
| 3 kişi uzun | 44,2 | 41 | 18,5 [15,2–21,9] | 55 | 10,4 | 31 / 35 / 33 |
| 4 kişi hızlı | 19,5 | 41 | 7,5 [6,3–9,2] | 24 | 6,7 | 24 / 28 / 25 / 24 |
| 4 kişi uzun | 45,7 | 39 | 17,8 [14,6–20,4] | 54 | 10,4 | 22 / 27 / 23 / 28 |
| eşli hızlı | 19,4 | 41 | 7,5 [6,1–9,1] | 24 | 6,7 | 51 / 49 |
| eşli uzun | 45,7 | 40 | 17,8 [14,4–20,8] | 55 | 10,4 | 50 / 50 |

- **Süre:** hedef hızlı 6–8, uzun 15–20 dk. Her mod hedefte; tahmini süre filmler dahil. Uzun maçta 1'e 1 20 düello,
  3 kişi 27, 4 kişi ve eşli 28; hızlıda 1'e 1 10, diğerleri 11.
- **Adalet:** `test/kurallar.test.mjs` 1.000–1.500 maçla ölçüyor. 1'e 1 %50,2 / 49,8, eşli %50 / 50, 3 kişi
  %34 / 31 / 35, 4 kişi %28 / 22 / 25 / 25. Hepsi sınır içinde. Sim'in 500 maçlık 1'e 1 hızlı sapması (57/43) aynı tohum
  dizisinin gürültüsü; kural sınaması 1.500 maçta dengeyi gösteriyor.
- **Üst sınırlar:** her tipin maç başına sayısı sınırını hiç aşmadı. Kuşbakışı yapısı başkent ilinde hiç sorulmadı. Canlı
  tur düello dışında hiç çıkmadı. Gölge bayraksız hiç çıkmadı; bayrakla açılıyor.
- **Sefer:** 7 bölgenin bütün sahneleri ve final geçiliyor (ana daldan gelen çengel/yıldırım hatası da kapandı: çengel
  sınırlı, kuşatmada geri).
- Yeni tiplerin maç başına ortalama sayısı tablosu `sim.mjs` çıktısında. Hızlı maçta her tip 0,3–1,3 kez, uzun maçta 0,8–2,6
  kez geliyor.

## 5. Uzun filmler

Tufan'ın filmi 11 sn sürüyor. İl Avı, Kimim ve Kayıp İl'in sinematik sonu, Kuşbakışı'nın inişi ve Gölge perdesi 4,4–5,6 sn.
Hepsi tipe göre bir tam ve bir kısa sürümle oynuyor (`mac.js FILM`):

- **Tam film:** insanın ya da uzak oyuncunun düellosu ve kuşatması, altın soru, 1'e 1 yayılma.
- **Kısa sürüm:** 3–4 kişilik yayılma (ardından sıralama gelir), ikinci şans. İki botun düellosunda kısa × `BOT_FILM`; hiçbir
  zaman arayüzün öntanımlı süresinin altına inmiyor.
- **Seyirci kuralı:** yerel insan yalnız seyrederken Tufan ×0,3, haritalı tipler ×0,4 seçiliyor. Kamera savaştan kopmuyor.
- **Maç süresine etkisi:** hızlı maçta 24–27 sn, uzun maçta 54–59 sn cevap filmi. Bu süre toplam tahmine dahil.
- **Çevrimiçi:** film süresi 'ask' ve 'reveal' ile gidiyor. Sunucu filmi bekleyip sonra ilerliyor (`serverPace`); ağ
  sınamasında her 'reveal'den sonraki olay en erken film kadar sonra geliyor.

## 6. Çevrimiçi akış (sunucu otoriter)

```
SUNUCU (Match + Oturum)                         İSTEMCİ (koltuk)
  ── ev 'ask' {v: publicView, time, film} ───────▶  kartı çiz (gizli yok)
  ── req 'answer' ───────────────────────────────▶
                                ◀── act 'acildi' ─  kart açıldı → saat SUNUCUDA başlar (t0)
  [tipin açılış adımı: Kimim/Kayıp ipuçlarını saatine kur, Halat botlarının basışlarını, Fitil ortak motorunu]
  ── ev 'ipucu' {k, text} (t0 + k·3 sn) ────────▶
                                ◀── act 'il' {il} ─  İl Avı / Kimim dokunuşu
  ── ev 'il' {km, dir, found, hint | ok, lock} ──▶  (gizli il hep sunucuda)
                                ◀── act 'harf' / 'yer' / 'halat' {k,c} / 'fitil' {k,c}
  ── ev 'harf' {i,c} / 'yer' {ok, opts} / 'halat' {ok, r} + herkese 'ip' {nets} / herkese 'top' {ev} ─▶
                                ◀── res 'answer' {value} ─  (süre alanı yok sayılır)
  son değer = SUNUCUNUN KAYDI (taps, al, log, at …) · süre = varış − t0
  [Az Bilinen: gerçek oranlar → yargı · Şive: ısı haritası ← istatistik]
  ── ev 'reveal' {results, answer (tam görünüm), film} ─▶  cevap filmi
  [sunucu `film` ms bekler]  ── sonraki adım ───▶  herkes aynı anda
```

- **Kapanan açıklar:**
  - Cevap süresini artık sunucu ölçüyor (kart açılış onayı + varış).
  - Kuşbakışı ve Gölge'de yapı adı yerine maça tuzlu anlamsız kimlik gidiyor (`q.sid`; istemci tuzla kendi maket listesinde
    eşliyor: `siteOfSid`).
  - İl Avı silueti ve Kayıp İl boşluğu sadeleştirilmiş, tamsayıya yuvarlanmış çokgen olarak gidiyor. Veriyle birebir
    eşleşmiyor.
  - Mancınık'ın bankadaki kardeş soru kimliği gitmiyor.
  - Halat, Fitil, İl Avı, Kimim, Harf Al ve Yanlışı Bul'da istemcinin bildirdiği değer yok sayılıyor; sunucu kendi kaydıyla
    yargılıyor.
- **Sınama:** `node test/net.test.mjs`, sanal saatle 6 tam maç (1'e 1, 3 kişi, 4 kişi, eşli; 4 kişide iki uzak koltuk
  birbiriyle düello yapıyor). 14 tipin hepsi uzak koltukla oynandı. Denetlenenler:
  - her tipte sızıntı yok;
  - istemci cevaptaki tam görünümle yeniden yargılayınca sunucunun sonucunu buluyor;
  - Harf Al ve İl Avı kayıtları olaylarla tutuyor;
  - Kimim ipuçları 3 sn arayla, Kayıp İl ipuçları `hintAt` saatinde geliyor;
  - Halat 'ip' yayını ve sunucu damgalı kayıt doğru; Fitil'de tam bir taraf kurtuluyor;
  - Şive ısı haritası ve Az Bilinen oranları istatistikten geliyor;
  - film bekleniyor; olaylardan kurulan il, değer ve puan sunucuyla aynı.
- **Sınır:** cevabın kendisi görüntü olan tiplerde (yapının 3B maketi, ilin siluetinin biçimi, kuyunun yeri) değiştirilmiş bir
  istemci ekranı okuyabilir. Bu, resimli soruyla aynı sınır. Tam koruma için sunucu maskeyi ya da görüntüyü kendisi çizmeli.
  Çevrimiçi istemci paketi soru bankasını taşımamalı (soru kimliğinden cevap okunur).

## 7. Sıradaki (ekran tasarımı aşaması)

- İstemci arayüzünün çevrimiçi kancaları: kartlar 'ipucu', 'il', 'harf', 'yer', 'ip', 'top' olaylarını kendi çizimine
  bağlamalı. Bugün yerel maç çevrimdışı formüllerle oynuyor; sunucu adımları ve istemci botu hazır.
- Soruların haritayı kapatması ve tam ekran tipler bu işin dışında bırakıldı.

## Görüntüler

`ref/mac-entegrasyon-v12/<tip>.jpg`: her yeni tipin maçtaki ilk kartı (insan cevaplarken) ve cevap filmi yan yana.
