# Fetih Ligi gece denetimi (v0.8): rakiplerle kıyas, oynama, mantık hataları ve düzeltmeler

**Tarih:** 29–30 Ekim 2026 (gece)
**Dal:** `claude/eloquent-feynman-h3ctvm` (247d588) üstüne dört commit (aşağıda). `dist/` commitlenmedi.
**İstek:** "Oyun Trivia Crack, Bil ve Fethet ve bütün rakiplerimizin birleşimi olacak. Bir ajan mantık hatalarını çözsün,
oynasın, kıyaslasın, her şeye baksın, ne görürse düzeltsin."

## Kısa özet

1. **En büyük hata: joker düğmeleri gerçek oyunda hiç çalışmıyordu.** İnsan bir jokere dokunuyordu, hiçbir şey olmuyordu
   (hak düşmüyor, uyarı da çıkmıyordu). Neden: soru kartı açılırken arayüz, Match'in az önce kurduğu joker geri çağrısını
   siliyordu (`src/ui/ui.js`). Benzetim testi jokerleri doğrudan `m.useJoker` ile çağırdığı için hiç yakalamamıştı.
   Playwright'la gerçek düğmelere basınca bulundu: eski derlemede 14 dokunuşun 14'ü boşa; yenide altı jokerin altısı da
   tarayıcıda doğrulandı (ikinci şans: bilerek yanlış cevaptan sonra ikinci soru geldi).
2. **Koltuk avantajı giderildi.** Eşit güçte botlarla binlerce maçta son turu en son oynayan koltuk açıkça kazanıyordu
   (4 kişide bir koltuk %16,5, öbürü %31; 1'e 1'de 0. koltuk, yani yerelde hep insan, %53,8, uzun maçta %55,8).
   Şimdi son turun sırası puana göre (önde olan önce, **geride olan en son** saldırır: Bil ve Fethet / Triviador kuralı) ve
   ilk tur sırası koltuktan bağımsız. Sonuç: 1'e 1 %49,8, 4 kişi %24–27, 3 kişi %32–35, eşli %49,5.
3. **Puan eşitliği kuralı yoktu**: eşit puanda koltuk sırası belirliyordu, yani insan hep kazanıyordu. Şimdi birincilik
   eşitse **altın soru** (tek tahmin sorusu, en yakın kazanır) soruluyor; diğer eşitlikler il, kule, doğru sayısıyla ayrılıyor.
4. **Kalkan hilesi kapandı.** Bot kalkan kararını soruyu görmeden veriyordu, insan ise soruyu görüp bilmediğini anlayınca
   kurabiliyordu. Kalkan artık savunulan düellonun içinde kurulamıyor.
5. **Kaleler neredeyse hiç kuşatılmıyordu.** Varsayılan rakip ('er') botlar maç başına 0,08 kuşatma yapıyordu (kule yıkımı
   0,03); 'usta' botlar 4,4. Beceriyle sürekli artan bir kural koydum: 'er' artık maç başına ~1,3 kuşatma yapıyor.
6. **Çevrimiçi protokolde dört açık kapandı:** rakibin yarı yarıyası elenen şıkları soru sürerken öbür oyuncuya gidiyordu;
   bir oyuncunun "Ekstra Süre"si herkesin süresini uzatıyordu; kule yıkımı, savunma değeri ve puan istemciye hiç
   gönderilmiyordu; cevabını vermiş uzak oyuncu sabotaj yapabiliyordu.
7. Küçükler: 1'e 1'de kaybedene "İKİNCİ!" yazıyordu (artık "YENİLGİ"); 3–4 kişide başkent seçim sırası eşit dağılmıyordu
   (0. koltuk %36, 1. koltuk %14 ilk seçiyordu); bitiş ekranındaki ödül dökümü toplamla tutmuyordu (uzun maçta satırlar
   166 XP, verilen 418); kule istatistiği botların birbirine yıktıklarını da sayıyordu.
8. Testler: yeni `test/kurallar.test.mjs` (980 denetim), `test/net.test.mjs` uzak koltuklu tam maçla genişledi; hepsi yeşil.
   Gerçek tarayıcıda `tools/flow.mjs` ile 8 tam maç (dört mod, hızlı ve uzun) ve kendi betiğimle 20'den fazla maç
   (süre dolması, jokerler, kötü oyun, duraklat, çık, sefer patronu, zorla eşitlik) sayfa hatasız bitti.

---

## 1. Rakipler

Kaynaklar sonda numaralı. Bulgu: **Bil ve Fethet, THX Games'in Triviador'unun Türkçe sürümü** (App Store kimliği aynı:
1520397866) [1][2]. Conquiztador da aynı ailenin İngilizce/Facebook adı olarak biliniyor; kurallar Triviador'unkiyle aynı.
Çevrimiçi kaynaklara bu oturumda yalnız arama özetleriyle ulaşabildim (help.triviador.com ağ ayarlarında kapalı); kurallar
bu yüzden birden çok kaynaktan çapraz doğrulandı, çelişenler belirtildi.

### Kısa profiller

- **Bil ve Fethet / Triviador / Conquiztador (THX Games):** 3 kişi (ya da düello). Üsler (kale, 3 kule) **rastgele** ve
  birbirine komşu olmayacak şekilde dağıtılır, değeri 1.000 [3][4]. Yayılma: herkese aynı **tahmin sorusu**, en yakın
  kazanır, eşitse hızlı olan; birinci 2, ikinci 1 bölge seçer, önce kendi sınırından [3][4]. Savaş: turlar, her turda
  herkes bir kez saldırır, sıra her tur farklı; **son turda en çok puanlı önce saldırır** (geride olan son sözü söyler) [5].
  Saldırı şıklı sorudur; ikisi de bilirse tahmin sorusu bitirir; saldıran kazanırsa bölgeyi ve 400 puanı alır, savunan ilk
  soruyla kazanırsa +100 savunma puanı [4][6]. Kale saldırısında kazandıkça **savaş kalan kuleler için sürer**; kuleler kendi
  üssünde doğru cevapla onarılır (en az bir kule ayaktaysa) [4][7]. Son kuleyi yıkan, rakibin bütün puanını ve topraklarını
  alır. Düelloda beraberlik olmaz: eşit puanı tahmin sorusu bozar [8]. Şikâyetler: eski Facebook sürümünü özleyenler, dil
  desteği; App Store'da 3,8★ [9].
- **Trivia Crack (Preguntados) ve Trivia Crack 2 (Etermax):** altı kategorili çark + taç dilimi; üç doğru üst üste ya da taç
  dilimi = karakter kazanma sorusu; altı karakteri ilk toplayan kazanır; rakibin karakterini almak için meydan okuma
  (düello); en çok 25 tur, eşitlikte meydan okuma, onda da eşitlikte savunana ek soru [10][11]. Jokerler: bomba (iki yanlışı
  eler), ikinci şans, ekstra süre, pas; altınla alınır [12][13]. TC2: gerçek zamanlı Kule Düellosu (~6 dk, kategori kapma),
  günlük meydan okuma, takımlar, şans çarkı, günlük/haftalık görevler, sandıklar, **10×50 kişilik ligler**, VIP "Trivia
  Pass" [14][15][16]. Şikâyetler: **reklam** (her yanlış cevaptan ve maçtan sonra), **yanlış sorular**, öde-kazan, can
  sistemi [17][18][19].
- **QuizUp (Plain Vanilla, 2013–2021):** konu seçilir, 1'e 1, 7 tur, soru başına 10 sn, puan hızla 20'den 10'a iner, son
  tur çift puan (en çok 160). Binlerce konu sevildi; para kazanamadığı için 2021'de kapandı [20][21][22].
- **Kahoot!:** doğru cevap en çok 1.000 puan, süreye göre azalır (≈ 1000 × (1 − (t/T)/2)); seri bonusu doğru başına +100,
  en çok +500 (çarpan değil, ekleme) [23][24].
- **Trivia Royale (Teatime, QuizUp kurucuları, 2020):** 1.000 kişilik eleme turnuvası, 1'e 1 turlar (5 soru), giriş bileti
  birkaç saatte bir yenilenir; 3 haftada 2,5 milyon indirme [25][26][27].
- **Quiz Planet (LOTUM):** Messenger'da 15 soru (5 tur × 3), roket bahsi [28].
- **Trivia Crack Kingdoms:** çark yerine kanallar, 5 taç topla, gizli kralı bul meydan okuması [29][30].
- **Türkiye:** TRT Bil Bakalım (rastgele 1'e 1 ya da 5 kişiye kadar grup) [31], Düello (Türkçe çevrimiçi bilgi yarışması,
  Facebook arkadaşları) [32], Bil-Al, Trivia Türk [33]. Ekşi Sözlük'te Bil ve Fethet için kayıt bulunamadı.

### Kıyas tablosu

| Boyut | **Fetih Ligi (bu gece)** | Trivia Crack 2 | Bil ve Fethet / Triviador | QuizUp | Kahoot! |
|---|---|---|---|---|---|
| Döngü | Başkent seç → yayılma (herkes aynı soru, derece = il hakkı) → fetih turları (çark + düello) → kale kuşatması | Çark → soru → karakter topla; meydan okuma | Üs → yayılma (tahmin) → savaş turları → kale | Konu seç → 7 soruluk düello | Sunucunun sorduğu soru dizisi |
| Fetih kuralı | Sınır ili; şıklıda ikisi de bilirse tahmin sorusu; tam eşitlikte savunan; kale 3 kule, saldırı başına 1 kule | Yok (karakter çalma) | Aynı ama kale saldırısı kazandıkça sürer, kule onarılır | Yok | Yok |
| Kim seçer | Başkenti oyuncu seçer (rastgele sırayla); yayılmada derece sırası; saldıranı tur sırası | — | Üs rastgele; yayılmada derece | — | — |
| Tur sırası | **Yeni:** ilk tur tohumdan, son tur puana göre (geride olan son) | Sıra tabanlı (eşzamansız) | Her tur farklı, son tur puana göre | Eşzamanlı | Eşzamanlı |
| Eşitlik | **Yeni:** altın soru (tahmin); sonra il, kule, doğru | Meydan okuma, sonra savunana ek soru | Tahmin sorusu | Puan | Puan |
| Soru tipleri | **12 tip bankada** (test, D/Y, tahmin, harita iğnesi, adam asmaca, sırala, eşleştir, karşılaştır, farklı olan, emoji, atasözü, bilmece) + 4 hazır (anagram, çengel, resimli, yıldırım) | Şıklı (+ resimli) | Şıklı + tahmin | Şıklı | Şıklı, D/Y, yazılı, bulmaca, kaydırıcı |
| Süre | Soruya göre hesaplanan, en az 20 sn (v0.8) | 20 sn (eskiden 30) | Kısa, sabit | 10 sn | 5 sn–4 dk, vars. 20 |
| Jokerler | 6: yarı yarıya, ekstra süre, kalkan, ikinci şans, sabotaj, seyirci (soru başına en çok 2) | Bomba, ikinci şans, ekstra süre, pas | Yok | Yok | Yok |
| Puan | İl 200, fetih +200, savunma +100, kale 1000 (kule başına 333) | Karakter sayısı | İl 200, fetih 400, savunma 100, üs 1000 | Hız (20→10), son tur ×2 | Hız + seri bonusu |
| Ödül / tutma | XP, seviye, altın, kozmetik, günlük ödül (7 gün), sefer yıldızları, ELO kancası | Görevler, sandık, lig, şans çarkı, VIP pass | Seviye, sıralama | Seviye, unvan | Yok (sınıf aracı) |
| Maç süresi | Hızlı 6,1–6,6 dk (tarayıcıda otomatik oyuncu; benzetim tahmini 7–8); uzun 18–23 dk (benzetim) | Eşzamansız günlerce; Kule Düellosu ~6 dk | ~10–15 dk | ~1,5 dk | Ders süresi |
| Çok oyunculu | Yok (botlar), ağ katmanı hazır | Var | Var (canlı 3 kişi) | Var | Var |

**Öndeyiz:** soru tipi çeşidi (12 + 4), her soruya göre adil süre, 3D Türkiye haritası ve il adları, sefer (7 bölge, komutan
patronlar), 6 joker, botlarla çevrimdışı oyun, sinematik kuşatma. Bil ve Fethet'in bütün çekirdeği bizde var.
**Gerideyiz:** canlı ya da eşzamansız çok oyunculu yok; lig/sezon/görev/sandık yok; takım-arkadaş-sohbet yok; soru bildirme
yok (Trivia Crack'in bir numaralı şikâyeti yanlış sorular); kale kuşatması Triviador'daki gibi gerilimli değil (aşağıda öneri 2).

---

## 2. Nasıl oynadım

- **Benzetim (node, sahte harita):** gerçek `Match` sınıfıyla on binlerce maç: eşit güçte botlarla koltuk avantajı
  (mod başına 1.500–4.000 maç), bot seviyesine göre kuşatma, yayılma sorularının neye göre kazanıldığı, eşitlik sıklığı.
  Betikler: `/tmp/…/scratchpad/an/{seat,bias,siege,expand,remote}.mjs` (kalıcı olanlar `test/` altında).
- **Uzak koltuk:** `LocalTransport` + `BotClient` ile bir koltuğu "internetten" oynatıp istemcinin aldığı olaylardan
  maçı yeniden kurmaya çalıştım (sahip, il değeri, puan, kule).
- **Gerçek tarayıcı (Playwright, sahte saat):** `tools/flow.mjs` ve kendi betiğim (`scratchpad/gece08/oyna.mjs`): insan
  politikaları **normal**, **kötü cevap**, **hiçbir şeye dokunma** (bütün süreler dolar), **her jokere bas**, **yalnız
  savunurken kalkana bas**, **yalnız 50/50**, **ikinci şans + bilerek yanlış**, ayrıca **duraklat/devam**, **maçtan çık +
  yeni maç**, **sefer patron sahnesi (ege-4)** ve **zorla puan eşitliği**. Eski derleme (`247d588`) ile yeni derleme aynı
  tohumlarla. (Betiğimin ilk sürümü düello sorularında kartın açılmasını beklemiyordu; o koşularda insan düellolarda süre
  doldurdu. Bu "süre dolması" sınaması olarak sayıldı; joker bulguları yayılma sorularından geldiği için geçerli.)
- **Duraklatma:** 60. saniyede duraklatınca 8 sn boyunca soru sayacı ve tahmini süre değişmedi; devam edince maç bitti.
  **Çıkış:** yayılmada çıkıp yeni maç başlatınca ikinci maç hatasız bitti, birincisinin bitiş ekranı/ödülü gelmedi.

---

## 3. Bulunan ve düzeltilen hatalar

| # | Hata | Nasıl bulundu / üretildi | Düzeltme | Sınama |
|---|---|---|---|---|
| 1 | **İnsanın joker düğmeleri hiçbir şey yapmıyor** (6 jokerin hepsi; kalkan dahil). `Match.ask` soru başında `ui.jokers(list, cb)` ile geri çağrıyı kuruyor, hemen ardından `ui.question` `this._jkCb = null` yapıyordu; düğme `ui.h.joker`'e düşüyor, o da yok. | Playwright'ta her soruda bütün joker düğmelerine basan oyuncu: eski derlemede hiçbir hakkı düşmedi (14/14 boşa). | `src/ui/ui.js`: soru başında silme kaldırıldı, maçtan çıkışta `reset()` temizliyor. | Tarayıcıda yeni derlemede altısı da çalışıyor (kalkan, yarı yarıya, seyirci, ekstra süre, sabotaj, ikinci şans); red nedenleri doğru ("Bir soruda en çok 2 joker", "Hakkın kalmadı"). Görsel 1. |
| 2 | **Eşit puanda koltuk sırası kazanıyor** (`standings` kararlı sıralama). Yerelde 0. koltuk insan: eşitlikte hep insan birinci. 1'e 1'de maçların %1,8'i, 4 kişide %4,4'ü. | Benzetim: eşit botlarla 2.000 maçta 36 eşitliğin 36'sı 0. koltuğa. | Altın soru + il/kule/doğru sayısı (bkz. Kural 2). | `kurallar.test` 4. bölüm; `sim.mjs` her eşit birinciliğin altın soruyla ayrıldığını denetler. Görsel 3. |
| 3 | **Elenenlerin sırası koltuk sırası**: elenenin puanı 0 olduğu için 3–4 kişide önce elenen sonra elenenin önüne geçebiliyordu. | Kod okuma + sınama. | Elenme sırası tutuluyor (`p.out`); geç elenen önde. | `kurallar.test` 4. bölüm. |
| 4 | **Başkent seçim sırası eşit dağılmıyor**: `sort(() => R() − 0.5)` 4 kişide 0. koltuğa %36, 1. koltuğa %14 ilk seçim veriyordu (ilk seçen en iyi yeri alır; 1'e 1'de ilk seçen %52). | 200.000 karıştırma ölçümü. | Fisher–Yates (`Match.shuffle`). Bot adları da. | `kurallar.test` 3. bölüm: dört koltuk %22–28. |
| 5 | **Kalkan savunmada sorudan sonra kurulabiliyor** (bkz. Kural 3). | Kod okuma; joker çubuğu yalnız cevaptan sonra kilitleniyor. | `SHIELD_IN_DEFENSE` + `m.duel`. | `kurallar.test` 5. bölüm: savunmada 156/156 deneme reddedildi, saldırı/yayılmada kuruldu. Görsel 2. |
| 6 | **Ortak soru saati**: bir oyuncunun "Ekstra Süre"si o soruyu çözen herkesin sayacını uzatıyordu (uzak rakibin jokeri yerel insanın süresini de uzatır); uzak koltuğun süre sınırı da ortak saatten hesaplanıyordu. | Kod okuma; sınama rakibe süre jokeri kullandırıp insanın sayacına bakar. | Koltuk başına saat `cur.clocks`; arayüze insanın kendi saati gider; sabotaj yalnız kurbanın saatini keser. | `kurallar.test` 6. bölüm. |
| 7 | **Joker etkisi rakibe sızıyor**: 'joker' olayı etkinin tamamını bütün uzak koltuklara gönderiyordu. Rakibin yarı yarıyası **hangi iki şıkkın yanlış olduğunu**, tahmin jokeri **cevabın aralığını**, adam asmaca **harfleri**, harita **bölgeyi** soru sürerken öbür oyuncuya söylüyordu. | Uzak koltuklu maç: eski kodda `yari.hide`, `yari.min/max`, `yari.letters` istemciye geldi. | `emitJoker`: tam etki yalnız kullanana, diğerlerine `{id, kind}` (+ süre/sabotaj gibi herkese açık alanlar). | `net.test`: 5 uzak koltuklu maçta sızıntı yok. |
| 8 | **İstemci maçı kuramıyor**: kule yıkımı, savunmada artan il değeri, puan ve kale canı hiç olay olarak gitmiyordu; saldırı ilanı ve sonucu yoktu; düelloyu izleyen uzak koltuk 'reveal' alıyor ama 'ask' almıyordu. Belgede yazan 'turn', 'score', 'state' hiç yayınlanmıyordu. | Uzak koltuklu maç: eski kodda istemcinin il değerleri 2–5 ilde yanlış, puan ve kule bilgisi yok. | Yeni olaylar: `turn`, `attack`, `result`, `score` (değişince), `state` (maç başında); savunmada `owner` değer güncellemesi; `ask` bütün uzak koltuklara. `net.js` şeması güncellendi. | `net.test`: istemcinin kurduğu sahip/değer/puan/kule sunucuyla birebir aynı. |
| 9 | **Cevabını vermiş uzak koltuk joker kullanabiliyor** (ör. cevapla aynı anda sabotaj). Yerelde arayüz kilitliyor, sunucu kilitlemiyordu. | Cevaptan hemen sonra sabotaj gönderen istemci: eski kodda 16/16 geçti. | `cur.done` + `RemoteController.onRes` (zaman uyumlu işaret: aynı anda gelen joker de reddedilir). | `net.test` "açgözlü istemci": cevaptan önce ekstra süre kabul, sonra sabotaj 0. |
| 10 | **1'e 1 ve eşlide kaybedene "İKİNCİ!"** yazıyordu. | Tarayıcıda kaybeden maç. | İki taraflı maçta "YENİLGİ"; elenen oyuncuya "kalen düştü"; altın soruyla biten birincilikte "altın soruyla". | Görsel 4. |
| 11 | **Kule istatistiği** (`result().towers`, ilerleme kaydı) 3–4 kişide botların birbirine yıktığı kuleleri de oyuncuya yazıyordu. | Kod okuma. | `towersBy` (yıkanın kendisi). | `kurallar.test` 7. bölüm: 120 maçta olaylarla birebir. |
| 12 | Sefer 3. yıldız metni "%60'ı geçsin" diyordu, kural ≥ %60. | Kod okuma. | Metin "en az %60 olsun". | — |
| 13 | **Bitiş ekranındaki ödül dökümü toplamla tutmuyordu**: uzun maç (×1,8) ve rakip seviyesi (çaylak ×0,8 … efsane ×1,4) çarpanı yalnız toplama uygulanıyordu; katılım altını (12) hiçbir satırda yoktu. Ör. uzun maçta efsaneye karşı zafer: satırlar 166 XP, verilen 418 XP. | Ödül hesabını tek tek durumlarla çalıştırma. | Çarpan her satıra uygulanır, toplam = satırların toplamı; katılım satırı altını gösterir (toplamlar en çok ±1 değişir). | `kurallar.test` 8. bölüm: 32 durumda satır toplamı = verilen XP/altın = kayıt. |
| 14 | Altın sorunun kartında ne olduğu yazmıyordu; HUD'da son saldırının "SIRA" rozeti kalıyordu; kalkan (artık saldırı yokken) öneriliyordu. | Tarayıcıda zorla eşitlik. | Kartta "Altın soru" etiketi, `turn = −1`, kalkan "Saldırı kalmadı". | Görsel 3. |

---

## 4. Kural değişiklikleri (önce → sonra)

Hepsi `src/game/match.js` başında açık sabitlerle; eski davranışa tek değerle dönülebilir.

1. **Saldırı sırası (`TURN_ORDER`)**
   - Önce: 1. tur hep 0. koltukla başlar (yerelde insan), her tur bir kayar.
   - Sonra: ilk turun sırası maç tohumundan karışık (sunucu aynı sırayı bulur); son turda **puana göre: önde olan önce, geride
     olan en son** saldırır (Bil ve Fethet / Triviador kuralı [5]). Eşlide takımlar dönüşümlü kalır, önde olan takım başlar.
     Son tur afişi "son saldırı gerideki oyuncunun" der; `phase` olayı turun sırasını taşır.
   - Neden ve ölçüm (eşit botlar, kazanan koltuk payı):

     | Mod | Önce | Sonra |
     |---|---|---|
     | 1'e 1 hızlı | 0. koltuk %53,8 (n=2.000) | %49,8 (n=4.000) |
     | 1'e 1 uzun | %55,8 (n=400) | %47,5 (n=600) |
     | 3 kişi | %29,3 / 34,4 / 36,3 | %32,5 / 34,7 / 32,9 |
     | 4 kişi | %30,9 / 30,8 / **16,5** / 21,8 | %25,6 / 24,8 / 25,5 / 24,2 |
     | Eşli | %47,3 / 52,7 | %49,5 / 50,5 |

     Yan etkisi: son turda liderin değişme oranı 1'e 1'de %22,1'den %26,7'ye, 4 kişide %47,9'dan %52,3'e çıktı (geri dönüş
     şansı; bitişler daha heyecanlı). PLAN'daki "1'e 1'de ilk oyuncu avantajı (%55–65)" maddesi bununla kapandı.
2. **Puan eşitliği (`TIE_BREAK`)**
   - Önce: koltuk sırası.
   - Sonra: birinciliği paylaşan taraflar maç sonunda **altın soru** çözer (tek tahmin sorusu, en yakın kazanır, eşitse hızlı;
     Triviador düello kuralı [8]). Puan değişmez, yalnız sıra. Diğer eşitlikler: daha çok il → kalede daha çok kule → daha
     çok doğru. Elenenlerde geç elenen önde. Altın soru maçların %2–5'inde çıkar (eşit botlarla: 1'e 1 %2,3, eşli %2,3, 3 kişi %4,0, 4 kişi %5,4; ~25 sn ekler). Maç sonu
     harita genel kadrajı artık altın sorudan önce gelir.
3. **Kalkan (`SHIELD_IN_DEFENSE = false`)**
   - Önce: insan kalkanı savunduğu düellonun sorusunu görünce kurabiliyordu; bot ise saldırı başında, soruyu görmeden karar
     veriyordu.
   - Sonra: kalkan saldırı başladıktan sonra o düelloda kurulamaz (düğme sönük: "Kalkan: Saldırıdan önce kurulur").
     Kendi saldırı sorunda ya da yayılmada kurulur. Joker açıklaması güncellendi.
4. **Botların kuşatma isteği (`BOT_SIEGE`)**
   - Önce: 0,65 beceride uçurum (+0,6 / −0,6). Varsayılan menü rakibi 'er' (≈0,55) kaleye neredeyse hiç saldırmıyordu.
   - Sonra: istek = 3 × (beceri − 0,55), iki kulesi kalmış kaleye +0,4, tek kulesi kalmışa 2,5 (değişmedi).

     | Rakip | Kuşatma/maç önce → sonra | Kule yıkımı/maç | Elenme (1'e 1) |
     |---|---|---|---|
     | çaylak | 0,07 → 0,00 | 0,03 → 0,03 | %0 |
     | er | **0,08 → 1,30** | 0,03 → 0,46 | %0,2 → %5,2 |
     | usta | 4,40 → 4,26 | 1,72 → 1,71 | %26,6 → %29,0 |
     | efsane | 4,44 → 4,82 | 1,62 → 1,78 | %25,6 → %30,8 |

     Maç süresi değişmedi (hızlı 7,0–8,3 dk tahmini).

---

## 5. Bulunan ama düzeltilmeyen

- **Cevap süresini istemci bildiriyor.** Sunucu yalnız [0, süre + kendi ekstra süresi] aralığına kırpıyor; değiştirilmiş
  bir istemci sabotajı yok sayıp hızlı süre yazabilir. Doğrusu: istemci kart açılınca onay gönderir, sunucu süreyi kendi
  saatinden ölçer. Protokol adımı gerektirdiği için (gerçek sunucu tasarımı) yapmadım; `net.js` başında not var.
- **Uzak koltuk bot joker envanteri alıyor** (`botLoadout`); çevrimiçi oyuncunun kendi stoğu sunucuda tutulmalı.
- **Botlar insana karşı iki yönlü önyargılı:** insana saldırırken −0,15 (daha az saldırır) ama insana sabotajı daha sık
  kullanır (0,5 / 0,32). Keyif için konmuş; dereceli (ranked) maçta kapatılmalı. Dokunmadım.
- **Yayılmada derece çoğunlukla hızla belirleniyor:** 1.930 yayılma sorusunda birinciliğin %55,6'sı yalnız hızla belirlendi
  (3 öğeli sırala %71, eşleştir %78, karşılaştır %65; tahminde botlar sık tam isabet ettiği için %43; harita %0). İkili
  "karşılaştır" sorusunda herkes yanlışsa hızlı yanlış birinci olur (rastgele hızlı basmak kârlı). Tasarım kararı; öneri 4.
- **Benzetimin süre tahmini karamsar:** `sim.mjs` hızlı 1'e 1 için 7,6–8,1 dk diyor (hedef 5–7), ama gerçek tarayıcı
  akışında (`tools/flow.mjs`, otomatik oyuncu) hızlı maçlar 6,1–6,6 dk sürdü (1'e 1 6,2–6,5; 3 kişi 6,4–6,6; 4 kişi
  6,1–6,5; eşli 6,4); uzun 1'e 1 17,5 dk (benzetim 22–23 dk). Düelloların ~%35'i eşitlik bozma sorusuna gidiyor (iki taraf da biliyor); asıl ölçü telefonda
  gerçek oyuncuyla alınmalı. `EST` tablosunu (match.js) flow ölçümüyle ayarlamak ayrı bir iş; öneri 8.
- **Başka ajanların alanı:** `src/map/*`, `src/gfx/*`, `src/quiz/deneme*`, `src/galeri*` dosyalarına bakmadım/dokunmadım;
  bu dosyalardan kaynaklı hata görmedim.
- Test aracı notu: `app.resume()` çizim döngüsünü yeniden başlatır; sahte saatli betik kendi karelerini sürüyorsa devamdan
  sonra `app.stop()` demeli (oyunda hata değil; ilk denememde betik bu yüzden takıldı).

---

## 6. Öneriler (yapılmadı), etki/emek sırasıyla

| # | Öneri | Etki | Emek | Neden |
|---|---|---|---|---|
| 1 | **Soru bildir düğmesi** (cevap ekranında "bu soru yanlış"), bildirilen soruyu yerelde bir daha sorma, sonra sunucuda topla | Yüksek | Düşük | Trivia Crack'in en sık iki şikâyetinden biri yanlış sorular [17][18]; kullanıcı v0.3'te "saçma soru" dedi. |
| 2 | **Kuşatma serisi ve kule onarımı** (Triviador): kale saldırısında kazandıkça bir sonraki kuleye geçilir; kendi başkentinde doğru cevapla kule onarılır. Ayrıca kule yıkan saldırana puan (ör. 333) | Yüksek | Orta | Şu an kule yıkmak saldırana puan kazandırmıyor, il fethi daha kârlı; 'er' botlarla elenme %5. Kale oyunun en sinematik anı ama oyunu nadiren belirliyor. |
| 3 | **Çevrimiçi 1'e 1 (önce eşzamansız, sonra canlı) + ELO eşleştirme** | Çok yüksek | Yüksek | Bütün rakiplerin çekirdeği; ağ katmanı ve olay şeması hazır (bu gece tutarlı hale geldi). Süre sunucuda ölçülmeli (Bölüm 5). |
| 4 | **Yayılmayı bilgiye bağla:** yayılmada yalnız tahmin/harita/4–5 öğeli sırala, ya da Kahoot gibi doğruluk + hız puanı (yanlışa 0) | Orta | Düşük | Birinciliğin %56'sı yalnız hızla belirleniyor (Bölüm 5). Triviador yayılmada yalnız tahmin sorusu kullanır. |
| 5 | **Günlük/haftalık görevler + sandık + lig (10×50 kişi, haftalık)** | Yüksek | Orta | TC2'nin tutma sistemi [14][16]; bizde yalnız günlük ödül ve seviye var. Reklamı ölçülü tut: TC'nin en büyük şikâyeti reklam [17][19]. |
| 6 | **Elendikten sonra "Sonucu gör / hızlı ileri"** | Orta | Düşük | 3–4 kişide elenen insan botların bitirmesini izlemek zorunda. |
| 7 | **Seri bonusu** (Kahoot gibi doğru seriye küçük ek puan ya da joker) | Orta | Düşük | Geri dönüşü kolaylaştırır, "bir soru daha" hissi [24]. |
| 8 | **Eşitlik bozma sıklığını azalt:** şıklı düelloda ikisi de bilirse önce hız (3 sn'den büyük farkla), değilse tahmin | Orta | Düşük | Uzun maçı kısaltır; ama hız ağırlığı artar (4'le birlikte düşünülmeli). Önce telefonda süre ölçülmeli. |
| 9 | **Dereceli maçta bot önyargılarını kapat** (insana daha az saldırma, insana daha çok sabotaj) | Düşük | Düşük | Adalet; dereceli ELO anlamlı olsun. |
| 10 | **Takım sohbeti/emoji tepkileri, arkadaşla oyna (davet bağlantısı)** | Yüksek (viral) | Orta | Quiz Planet ve Trivia Crack büyümesini arkadaş davetine borçlu [28]. |

---

## 7. Görseller (solda eski 247d588, sağda yeni; aynı tohum, 412×892, q0)

Maçlar kurallar değiştiği için birebir aynı akmaz; her görsel aynı türden anı gösterir.

- `1_joker_eski_yeni.jpg`: insanın ilk şıklı düello sorusunda 50/50'ye basıldıktan 0,7 sn sonra. Eski: hiçbir şey olmadı,
  hak hâlâ 2, dört şık duruyor. Yeni: "Yarı Yarıya: 2 yanlış şık elendi", A ve D söndü, hak 1'e indi.
- `2_kalkan_savunma_eski_yeni.jpg`: insan savunurken (soruyu görmüşken) kalkana basıyor. Eski: düğme parlak; basınca yine
  hiçbir şey olmadı (jokerler bozuktu; çalışsaydı kalkan kurulurdu). Yeni: düğme sönük, uyarı "Kalkan: Saldırıdan önce kurulur".
- `3_esitlik_eski_yeni.jpg`: puanları zorla eşitlenmiş maç sonu. Eski: eşit puanda (4.900–4.900) koltuk sırasıyla insan
  "ZAFER!", yalnız 1 ili varken. Yeni: "Altın soru" kartı (tahmin, en yakın kazanır); insan kaybetti, bitişte
  "YENİLGİ · altın soruyla".
- `4_bitis_eski_yeni.jpg`: 1'e 1 yenilgi. Eski "İKİNCİ!", yeni "YENİLGİ"; kalesi düşen oyuncuya "kalen düştü".
- Ayrıca denetlendi (görsel kaydedilmedi): son tur afişi "Tur 6 / 6 · son saldırı gerideki oyuncunun" telefonda tek satıra sığıyor.

---

## 8. Doğrulama

| Komut | Sonuç |
|---|---|
| `node build.mjs` | FetihLigi.html 2.453 KB |
| `node test/types.test.mjs` | 83.701 denetim, 0 hata |
| `node test/timing.test.mjs` | 90.580 denetim, 0 hata |
| `node test/net.test.mjs` | 7.818 denetim, 0 hata (uzak koltuklu 5 maç + açgözlü istemci) |
| `node test/sim.mjs --quiet` | hepsi temiz (72 maç + sefer) |
| `node test/kurallar.test.mjs` | 980 denetim, 0 hata (~15 sn) |
| Tarayıcıda tam maç | bkz. aşağıdaki liste; hepsi "sayfa hatası yok" |

Tarayıcı maçları (yeni derleme, `node tools/flow.mjs ÇIKTI --q=0 --mode=… --length=… --region=… --seed=…`), hepsi
"maç bitti", sayfa hatası yok:

| Mod | Uzunluk | Bölge | Tohum | Oyun süresi |
|---|---|---|---|---|
| 1'e 1 | hızlı | ege | 3 | 372 sn (6,2 dk) |
| 3 kişi | hızlı | marmara | 5 | 398 sn (6,6 dk) |
| 4 kişi | hızlı | karadeniz | 8 | 364 sn (6,1 dk) |
| eşli | hızlı | akdeniz | 11 | 384 sn (6,4 dk) |
| 1'e 1 | hızlı | dogu | 17 | 392 sn (6,5 dk) |
| 3 kişi | hızlı | guneydogu | 13 | 381 sn (6,4 dk) |
| 4 kişi | hızlı | icanadolu | 21 | 391 sn (6,5 dk) |
| 1'e 1 | uzun | tüm Türkiye | 2 | 1.048 sn (17,5 dk) |

Kendi betiğimle (`oyna.mjs`, yeni derleme), hepsi sayfa hatasız: süreler dolar (1'e 1), her jokere bas (1'e 1), kötü oyun +
duraklat (eşli; insan elendi, "kalen düştü"), çık + yeni maç (4 kişi), sefer ege-4 patron sahnesi + jokerler, yalnız 50/50
(3 kişi), savunmada kalkan (1'e 1), ikinci şans (1'e 1), zorla eşitlik (1'e 1, iki kez). Maç boyu değişmezler (geçersiz
il sahibi, elenmiş oyuncunun ili, NaN puan) her saniye denetlendi: ihlal yok.

Eski koda karşı: `kurallar.test` eski kodda 1'e 1'de %54,6 / %45,4 ve 4 kişide %18,2–%31,6 ile kalıyor; `net.test`'in
yeni bölümü eski kodda sızıntı (`yari.hide`, `yari.min/max`, `yari.letters`) ve eksik değer/puan buluyor; açgözlü istemci
eski kodda 16 sabotaj geçiriyor.

## Commitler

- `07ea189` Fetih Ligi: gece denetimi 1 — joker düğmeleri çalışıyor, adil saldırı sırası, altın soru, ağ olayları
- `acadcb8` Fetih Ligi: gece denetimi 2 — cevaptan sonra joker yok (uzak koltuk), bitiş ekranı notları
- `69593d1` Fetih Ligi: gece denetimi 3 — ödül dökümü toplamla tutuyor, altın soru cilası
- son commit: rapor, görseller, altın sorudan önce harita kadrajı, kısa kalkan uyarısı

## Kaynaklar

1. App Store, "Bil ve Fethet" (THX Games, kimlik 1520397866): https://apps.apple.com/cy/app/bil-ve-fethet/id1520397866?l=tr
2. App Store, "Triviador" (aynı kimlik): https://apps.apple.com/us/app/triviador/id1520397866 ; tamindir, Bil ve Fethet: https://www.tamindir.com/indir/bil-ve-fethet/amp/
3. THX Games yardım merkezi, "Game Rules": https://thxgames.zendesk.com/hc/de/articles/207970149-Game-Rules?mobile_site=true
4. Triviador yardım, "Short Campaign" ve "Long Campaign": https://help.triviador.com/en/support/solutions/articles/66000215532 , https://help.triviador.com/en/support/solutions/articles/66000231246
5. THX Games "Game Rules" (savaş: her tur sıra farklı, son turda en çok puanlı önce saldırır), kaynak 3.
6. Explosion, Triviador incelemesi (il 200, fethedilen 400, savunma 100): https://www.explosion.com/259/triviador/
7. luk27official/triviador (GitHub, kural özeti): https://github.com/luk27official/triviador
8. Triviador yardım, "DUEL – GAME RULES" (beraberlikte tahmin sorusu): https://help.triviador.com/en/support/solutions/articles/66000496612
9. App Pricing Lab, Triviador (3,8★, 258 yorum): https://apppricinglab.com/app/apple/1520397866 ; App Store yorumları: https://apps.apple.com/uy/app/triviador/id1520397866
10. Trivia Crack (Vikipedi kopyası): https://ipfs.aleph.im/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/Trivia_Crack.html
11. Boise State, "Honors College Trivia Game Rules and Gameplay": https://boisestate.edu/archives/wp-content/uploads/sites/744/2021/03/Honors-College-Trivia-Game-Rules-and-Gameplay.pdf
12. AppleVis, Trivia Crack Power Ups: https://applevis.com/comment/40410
13. APKMirror, Trivia Crack: https://www.apkmirror.com/apk/etermax/trivia-crack/trivia-crack-3-212-1-release/
14. Etermax Teknoloji, "Tower Duel: Developing a real-time game mode in Trivia Crack 2": https://medium.com/etermax-technology/tower-duel-developing-a-real-time-game-mode-in-trivia-crack-2-b139d930f278 ; Etermax yardım "Tower Duel": https://triviacrackretro.help.etermax.com/hc/en-001/articles/360025887593-Tower-Duel
15. Trivia Crack 2 basın bülteni: https://pressreleases.triplepointpr.com/2018/10/25/trivia-crack-2-sequel-to-the-global-hit-game-now-available-worldwide-for-ios-and-android/
16. Etermax yardım, "Ranking" (10 lig × 50 kişi) ve "Topics": https://triviacrack.help.etermax.com/hc/en-us/articles/360039554973-Ranking , https://triviacrack.help.etermax.com/hc/en-us/articles/360033522154-Topics
17. WhistleOut, Trivia Crack incelemesi: https://www.whistleout.com/CellPhones/Apps/trivia-crack-app-review
18. ComplaintsBoard, Trivia Crack: https://www.complaintsboard.com/trivia-crack-no-ads-b150091 ; Kimola kullanıcı geri bildirimi raporu: https://kimola.com/reports/essential-trivia-crack-user-feedback-analysis-report-app-store-tr-144560
19. TidBITS, "FunBITS: Trivia Crack Simultaneously Attracts and Repels": https://tidbits.com/2015/01/09/funbits-trivia-crack-simultaneously-attracts-and-repels/
20. QuizUp (Vikipedi): https://en.wikipedia.org/wiki/QuizUp
21. PCWorld, "You should play QuizUp": https://www.pcworld.com/article/2104701/you-should-play-quizup.html
22. ProductMint, "What Happened To QuizUp?": https://productmint.com/what-happened-to-quizup/
23. Kahoot! destek, "How points work": https://support.kahoot.com/hc/articles/115002303908
24. Inside Kahoot!, "Experimenting with Answer Streaks": https://medium.com/inside-kahoot/experimenting-with-answer-streaks-to-help-make-learning-awesome-3b3357e42595
25. Engadget, "The QuizUp team is back with a battle royale trivia game": https://www.engadget.com/battle-royale-quiz-game-trivia-royale-quizup-130038696.html
26. TechCrunch, "QuizUp founder gets back to trivia roots with the launch of Trivia Royale": https://techcrunch.com/2020/06/17/quizup-founder-gets-back-to-trivia-roots-with-the-launch-of-trivia-royale
27. Tapsmart, Trivia Royale: https://www.tapsmart.com/apps/trivia-royale-battle-1000-quizzers-supremacy/ ; Inventiva (2,5 mn indirme): https://www.inventiva.co.in/trends/anukriti/how-thor-fridrikssons-trivia-royale-earned-2-5m-downloads-in-3-weeks/
28. iD Mobile topluluk, "RIP HQ Trivia, long live Quiz Planet": https://community.idmobile.co.uk/blog-45/rip-hq-trivia-long-live-quiz-planet-30235
29. GameRevolution, Trivia Crack Kingdoms: https://www.gamerevolution.com/guides/69536-trivia-crack-kingdoms-game-challenges
30. Pocket Gamer, Trivia Crack Kingdoms: https://www.pocketgamer.com/articles/068019/trivia-crack-kingdoms-isnt-just-a-game-its-a-mobile-communication-tool-sponsored/
31. Webrazzi, "TRT'den mobil bilgi yarışması: TRT Bil Bakalım": https://webrazzi.com/2021/05/03/trt-den-mobil-bilgi-yarismasi-trt-bil-bakalim/
32. tamindir, Düello: https://www.tamindir.com/indir/duello/amp/
33. tamindir, Bil-Al ve Trivia Türk: https://www.tamindir.com/indir/bil-al/ , https://www.tamindir.com/indir/trivia-turk/
