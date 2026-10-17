# BLÖF — kural ve tasarım şartnamesi (kullanıcıyla anketle kararlaştırıldı, 16 Ekim)

Kahvehane Pişti uygulamasının ikinci oyunu. Aynı jeton, karakterler, desteler, masalar, çerçeveler, market.
İleride Pişti, Blöf (ve sonra Okey) ÇEVRİMİÇİ oynanacak: motorlar saf, deterministik, sunucuda aynen koşabilir olmalı.

## Kurallar (kesin)
- **Modlar:** 1'e 1 · 3 Kişi · 4 Kişi · Eşli (2'ye 2, karşılıklı oturanlar takım). Ana ekranda seçilir.
- **Deste:** tek deste, 52 kart, hepsi dağıtılır. 3 kişide 17-17-18: fazla kartı turu ilk AÇMAYAN oyunculardan biri alır.
- **Tur:** turu açan oyuncu bir DEĞER söyler (As…Papaz) ve elinden 1–4 kartı kapalı atar ("3 tane 7").
  Tur boyunca herkes AYNI değeri söyleyerek 1–4 kart atar ya da **Pas** der.
- **Blöf:** her kart atışından sonra **5 saniyelik pencere** açılır; atan HARİÇ masadaki herkes "Blöf!" diyebilir
  (insan: kırmızı BLÖF düğmesi ya da ortadaki yığına dokunma). İlk diyen açar. Eşlide takım arkadaşının hamlesine blöf denemez.
  - Son atılan kartlar açılır. Hepsi söylenen değerse → doğru: yığının TAMAMINI blöf diyen alır, yeni turu atan (doğru çıkan) açar.
  - Herhangi biri farklıysa → yalan: yığının TAMAMINI atan alır, yeni turu blöf diyen (yakalayan) açar.
- **Pas:** herkes (son atan hariç) art arda pas derse ortadaki kartlar kenara (oyun dışına) gider, son atan yeni turu açar.
  Turu açan pas diyemez (mutlaka değer söyleyip atar).
- **Bitiş:** son kartlarını atan oyuncunun hamlesine de blöf denebilir; pencere blöfsüz kapanırsa (ya da blöf yanlış çıkarsa) o oyuncu
  bitirir. Yalanı yakalanırsa yığını alıp devam eder. **İlk bitiren kazanır** (eşlide takımı kazanır). Tek el.
- **Görünürlük:** herkesin elindeki kart sayısı rozetin yanında görünür; 1–2 kart kalınca rozet yanar. Hafıza yardımı/sayaç YOK.

## Oyun uzunluğu: Tek El · 3 El · 5 El (17 Ekim; kod `src/game/series.ts`, testler `tests/series.test.ts`)
Kullanıcı isteği: "Blöf'te hep tek oyun var." Seçenekler **Tek El** (bugünkü gibi: ilk bitiren kazanır) · **3 El** · **5 El** (seri).
- **Ceza:** her elde bitiren taraf **0** ceza alır; diğer her oyuncu **elinde kalan kart kadar** ceza alır.
  **Eşli:** kazanan takım 0; kaybeden takımın cezası **iki oyuncusunun elinde kalan kartların toplamı** (kazanan takımda bitirmeyen ortağın kartları sayılmaz).
- **Sonraki eli açan:** kaybeden taraflardan **elinde en çok kart kalan** oyuncu (teselli + geriden gelme şansı). Eşitlikte bitirenden sonra sırası
  ilk gelen. İlk eli motor tohumdan seçer (ilk Blöf maçının ilk elinde öğretici: oyuncu açar).
- **Kazanan:** N el bitince **en az toplam ceza**. Eşitlikte: **daha çok el kazanan** → **son elde daha az ceza alan** → berabere (pot bölünür / iade).
  Seri erken bitmez (hep N el).
- **Bahis maç başına bir kez** düşülür; kazananın aldığı pot uzunlukla büyür: 3 El ×1,5 · 5 El ×2 (Pişti 51 ×1,5 · 101 ×2 · 151 ×2,5).
  XP: el başına 20 + sonuç primi (kazanma 40 · berabere 10) × çarpan, kalabalık masa çarpanı, yakalanan blöf +6 (el başına en çok 10).
- **Eller arası "Ara Skor":** bu elin cezaları (sayarak), el el ceza hücreleri, el sayacı (●●○ 2/3), önde olana taç, konuşan karakter, büyük
  "Sonraki El" (6 sn sonra kendiliğinden), "Masadan kalk" (onaylı).
- **Maçı bırakmak** (Mola → Masadan Kalk ya da Ara Skor'dan; onaylı): bahis yanar, maç kaybı sayılır. **Uygulama maç ortasında kapanırsa**
  maç durumu her el sonunda profile yazıldığı için sonraki açılışta "Yarım kalan maça devam et?" sorulur: devam, kaldığı **elin başından** aynı
  tohumla başlar (el ortası saklanmaz); bırakmak maç kaybıdır.
- İstatistik ve görevlerde **maç** sayılır (oynanan/kazanılan/seri); blöf sayıları her elde birikir. Yeni görev: "5 elli Blöf serisi kazan".
- Seçim profilde oyun başına saklanır (`lastLength`, ilk oyunlarda Tek El). Ana ekrandaki seçicinin yeri kullanıcıyla belirlenecek
  (şimdilik ayar + test kancası `?auto=1&game=blof&mode=3&len=3`).

## Oynanış ve sunum (kesin)
- Kart atma: elden dokunarak 1–4 kart seç (kalkar) → alttaki "3 tane 7 at" düğmesi. Turu sen açıyorsan önce değer seçicisi.
- Pas düğmesi; Blöf düğmesi (büyük kırmızı, 5 sn halka dolar) + yığına dokunma.
- **Blöf anı:** ağır çekim tek tek kart açılışı (gerilim sesi) · "YAKALANDI!" / "DOĞRU ÇIKTI!" damgası · yığın uçarak kaybedene gider ·
  karakter tepkileri (yakalanan utanır/kızar, yakalayan sırıtır; laf atma balonları).
- Rakipler: kolay / orta / zor (zorluk seviyesine göre; kişilik farkı şart değil).
- Bahis Pişti gibi (100 / 500 / 1.000 / 5.000, seviye kilitleri); kazanan potu alır.
- Ana ekranda "Pişti | Blöf" oyun seçici. Kozmetiklerin hepsi ortak.
- İlk Blöf elinde Rıza Amca oynayarak öğretir (kart seç → değer söyle → blöf de → pas).

## Kalite çıtası
Kullanıcı: "çok çok kaliteli olsun, oynanış çok güzel olsun, masa yerleşimi çok iyi oranlansın". Pişti'nin bugünkü kalitesi taban.
Düşük cihazda kasmamalı (yalnız transform/opacity, havuzlanmış düğümler, boşta 0 kare — bkz. PHASES.md performans dersleri).
