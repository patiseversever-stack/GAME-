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
