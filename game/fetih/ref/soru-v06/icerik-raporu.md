# Fetih Ligi soru bankası: içerik incelemesi (v0.6)

**Tarih:** 29 Ekim 2026
**Kapsam:** `src/data/q/*.js` içindeki sıralama (order) ve eşleştirme (match) dışındaki bütün sorular: test, tahmin, harita, adam asmaca, doğru/yanlış, karşılaştırma, farklı olan, emoji, bilmece ve atasözü.
**Ek:** Bankaya giren başlangıç seti (`src/data/questions.js`) yinelenme taramasına dahil edildi. Orada yalnızca 10 satıra dokunuldu (tahmin aralıkları, yinelenen bir asmaca, bir yazım).

Kapsamdaki 1.267 sorunun hepsi tek tek okundu. Ardından bütün banka otomatik taramalardan geçti:
- 30 km'den yakın iğneler
- aynı cevabı veren benzer sorular
- başka sorunun cevabını içeren kökler
- kaydırıcının açılış değeri
- şık uzunluğu dengesizliği
- yazım ve noktalama

Şüpheli bilgiler web aramasıyla doğrulandı. Sıralama ve eşleştirme satırlarına hiç dokunulmadı.

## Sayılar

| Kategori | İncelenen | Yeniden yazılan | Bilgisi düzeltilen | Yenilenen (yeni kimlik) | Silinen | Dokunulmayan |
|---|---:|---:|---:|---:|---:|---:|
| Tarih | 216 | 47 | 3 | 22 | 0 | 144 |
| Coğrafya | 230 | 25 | 7 | 26 | 0 | 172 |
| Spor | 172 | 24 | 6 | 17 | 0 | 125 |
| Bilim | 196 | 15 | 2 | 10 | 0 | 169 |
| Sanat | 186 | 27 | 0 | 11 | 0 | 148 |
| Genel kültür | 267 | 34 | 1 | 17 | 0 | 215 |
| **Toplam** | **1.267** | **172** | **19** | **103** | **0** | **973** |

Tablonun okunuşu:
- **Yeniden yazılan** sütunu üç tür değişikliği kapsar:
  - yalnızca tahmin kaydırıcısının aralığı değişen 55 soru,
  - yalnızca zorluk etiketi değişen yaklaşık 30 soru,
  - kökü, şıkları ya da ipucu değişen sorular.

  Bu soruların kimlikleri korundu.
- **Yenilenen** sorular aynı satırda yeni bir soruyla değiştirildi. Bunlar yeni kimlik aldı ve kimlikler dosyanın düzenini izliyor (ör. `tar-ch-108`). Böylece oyuncuların "görüldü" listeleri bozulmaz.
- Silme olmadı. Kategori ve tip başına soru sayıları aynı kaldı.
- Zorluk dağılımı (kolay/orta/zor) önce 468/539/260 idi, şimdi 449/548/270. Yenilenen sorular "aha" bilgiler olduğu için zor tarafa kaydı, sonra yeniden dengelendi.

## Bulunan sorun türleri

1. **Tahmin sorularında açılış değeri cevabın dibindeydi.** Kaydırıcı aralığın ortasında açılıyor. 11 soruda bu orta nokta tam cevaba denk geliyordu: Galatasaray 1905, YouTube 2005, Google 1998, gezegen sayısı 8, diş sayısı 32 ve donma noktası 0 bunlardan birkaçı. 40'tan fazla soruda da cevaba birkaç birim yakındı. Hiçbir şeye dokunmadan "Gönder"e basan oyuncu kazanıyordu. Başlangıç seti dahil 60'tan fazla sorunun aralığı değiştirildi. Artık açılış değeri cevaptan en az yaklaşık %15 uzakta.
   - Doğal ölçekli iki soru bilerek bırakıldı: plaka kodları (1–81) ve yüzdeler (0–100).
2. **Bir sorunun kökü başka bir sorunun cevabını veriyordu.** Yaklaşık 40 durum düzeltildi. Örnekler:
   - "Lozan Antlaşması hangi ülkede imzalandı?" sorusu, "Kurtuluş Savaşı'nı bitiren antlaşma?" sorusunun cevabını veriyordu.
   - "Aziz Sancar Nobel'i…" ile 2015 Nobel sorusu, "Liverpool ilk yarıda kaç gol geriydi?" ile 2005 finali sorusu aynı durumdaydı.
   - Adam asmaca ipuçları da etkilenmişti: "Gaziantep'in tatlısı: BAKLAVA" ve "Edirne'deki festival: KIRKPINAR".
3. **Aynı bilgi birden çok soruda soruluyordu.** Bazı konular 3–6 kez geçiyordu: Kanuni'nin 46 yılı, Titanik, Kolomb, Everest, Grönland, Monako–Vatikan, Mario, örümceğin bacakları, Türk alfabesinin 29 harfi ve memeliler bunlardan bazıları. Fazlaları yeni bilgilerle değiştirildi.
4. **Aynı noktaya düşen harita soruları vardı.** Ayasofya, Dolmabahçe ve İstanbul iğneleri aynı yeri gösteriyordu. Anıtkabir ile Ankara arasında 2 km, Selimiye ile Edirne arasında ve Gordion ile Polatlı arasında da yalnızca birkaç kilometre vardı. 16 iğne Türkiye'nin başka yerlerine taşındı: Kızkalesi, Afrodisias, Sagalassos, Aizanoi, Alanya, Gökçeada, Kuş Gölü, Tortum Şelalesi, Kaz Dağları, Alaçatı, Kaş, Mersin ve dört il merkezi (Afyonkarahisar, Malatya, Muş, Kahramanmaraş). Artık 30 km'den yakın tek çift kaldı (aşağıya bakın).
5. **Bilgi hataları ve eskiyen bilgiler vardı:**
   - Fenerbahçe 2025'te ikinci kez EuroLeague şampiyonu oldu. "Hangi yıl şampiyon oldu? 2017" sorusu iki cevaplı hâle gelmişti.
   - 2026 Dünya Kupası'nı İspanya kazandı. "En çok kazanan ülke" sorusu zamansız hâle getirildi.
   - Lev Yaşin sorusundaki "tek kaleci" ifadesi kaldırıldı.
   - Ay'a ayak basanlar sorusu Apollo görevleriyle sınırlandı.
   - Olympus Mons sorusu "en yüksek dağ" yerine "en büyük yanardağ" diye soruluyor (Vesta'daki Rheasilvia tartışması).
   - Ofsayt tanımı yanlıştı.
   - Çıldır Gölü Ardahan–Kars sınırında. Kars çeldiricisi ikinci doğru cevaptı.
   - Ardahan da Gürcistan'a komşu.
   - Halil Mutlu'nun lakabı "Küçük Dinamo".
   - Cilo zirvesinin koordinatı düzeltildi.
6. **Cevap kökte ya da şıkta ele veriliyordu:**
   - "İpekböceğinin kozasından ne elde edilir? İpek"
   - "Antep fıstığıyla ünlü il?"
   - "Fazıl Say (piyanist) hangi çalgıyı çalar?"
   - Bilmecede cevabın kendisi geçiyordu: "Bazen buz, bazen su…" → Su.
   - Olimpiya kelimesi "Olimpiyat"ın içinde geçiyordu.
   - Tek uzun ya da parantezli şık cevabı belli ediyordu.
   - "Gölü" eki olmayan tek şık doğru cevaptı.
7. **Belirsiz ya da gerçek olmayan atasözleri vardı.** "Kalem kılıçtan keskindir" TDK atasözü değil, bir çeviri söz. "Evdeki hesap ___ uymaz" sorusunda "pazara" da halk ağzında kullanıldığı için ikinci doğru cevap sayılabiliyordu.
8. **Yazım ve dil sorunları vardı.** Düzeltilenler: Orta Çağ, Kâtip Çelebi, Âşık Veysel, peri bacası, Teniste, Super Bowl, Ay'ın evreleri, Sidney, "Boğaz"ın küçük harfle yazılması. Kökteki parantezli dolambaçlar ve bozuk tümceler de düzeltildi.
9. **Emoji sorunları vardı:**
   - Çin sorusunda 🏯 Japon şatosu kullanılmıştı. Bu, Japonya çeldiricisiyle karışıyordu.
   - Kapadokya sorusunda 🏜️ çöl emojisi yanıltıcıydı.
   - 🍷 şarap emojisi 12+ kitleye uygun bulunmadı.
   - Bazı sorularda ilk emoji cevabın kendisiydi (⚾, 🏐, ⛳, 🪐).

## En büyük 20 kalite sıçraması (önce → sonra)

1. **Tarih, tahmin.** Önce: "İstanbul kuşatması kaç gün sürdü (6 Nisan - 29 Mayıs 1453)?" Sonra: "Fatih'in İstanbul kuşatması kaç gün sürdü?" *Cevap parantezden hesaplanabiliyordu.*
2. **Tarih, doğru/yanlış.** Önce: "Kleopatra Roma İmparatorluğu'nun imparatoriçesiydi. (Y)" Sonra: "Kleopatra'nın yaşadığı dönem, Ay'a inişe Keops Piramidi'nin yapımından daha yakındır. (D)"
3. **Tarih, test.** Önce: "Orhun Yazıtları hangi dille yazılmıştır? Türkçe / Arapça…" Sonra: "Orhun Yazıtları bugün hangi ülkededir? Moğolistan / Kazakistan / Çin / Kırgızistan"
4. **Tarih, test.** Önce: "Titanik hangi okyanusta battı?" (Titanik 5. kez soruluyordu) Sonra: "Kanuni şiirlerinde hangi mahlası kullandı? Muhibbî / Avnî / Selîmî / Adlî" *Çeldiriciler de gerçek padişah mahlasları.*
5. **Tarih, harita.** Önce: "Ayasofya nerede?" (İstanbul iğnesiyle aynı nokta) Sonra: "Denizin ortasındaki Kızkalesi nerede?"
6. **Tarih, karşılaştırma.** Önce: "Kanuni (46) mi Yavuz (8) mu daha uzun hüküm sürdü?" Sonra: "Hangisi daha geç icat edildi? Konserve kutusu (1810) / Konserve açacağı (1858)"
7. **Coğrafya, test.** Önce: "Çıldır Gölü hangi ilimizdedir? Ardahan / **Kars** / Iğdır / Erzurum" *Göl iki ilin sınırında, iki doğru cevap vardı.* Sonra: "Çıldır Gölü'nün büyük kısmı hangi ilimizdedir? Ardahan / Iğdır / Erzurum / Artvin"
8. **Coğrafya, test.** Önce: "Antep fıstığıyla ünlü ilimiz hangisidir?" Sonra: "\"Güller şehri\" olarak bilinen, gül yağıyla ünlü ilimiz hangisidir? Isparta / Burdur / Uşak / Afyonkarahisar"
9. **Coğrafya, karşılaştırma.** Önce: "Monako mu Vatikan mı büyük?" (3. kez soruluyordu) Sonra: "Van Gölü (3.713 km²) mü, Lüksemburg (2.586 km²) mü daha büyük?"
10. **Coğrafya, doğru/yanlış.** Önce: "Türkiye'nin en yüksek dağı Erciyes'tir. (Y)" Sonra: "Türkiye'nin en yüksek dağı Ağrı, aslında bir yanardağdır. (D)"
11. **Spor, test.** Önce: "Fenerbahçe Beko hangi yıl EuroLeague şampiyonu oldu? 2017" *2025'ten beri iki doğru cevap var.* Sonra: "Fenerbahçe Beko ilk EuroLeague şampiyonluğunu hangi yıl kazandı?"
12. **Spor, adam asmaca.** Önce: "Futbolda hücumcunun savunmanın gerisinde kalması → OFSAYT" *Tanım yanlıştı.* Sonra: "Pas anında hücumcunun rakip kaleye savunmacılardan daha yakın olması"
13. **Spor, test.** Önce: "Modern Olimpiyat meşalesi her seferinde hangi antik kentte yakılır? **Olimpiya**" *Cevap kökte geçiyordu.* Sonra: "Olimpiyat meşalesi Antik Olimpiya'da nasıl yakılır? Güneş ışınlarını aynayla odaklayarak / Çakmak taşından… / Önceki oyunların ateşinden… / Tapınaktaki kandilden…"
14. **Spor, tahmin.** Önce: "Galatasaray hangi yıl kuruldu? (1850–1960)" *Kaydırıcı 1905'te, yani tam cevapta açılıyordu.* Sonra: aynı soru, aralık 1880–1980.
15. **Bilim, test.** Önce: "Güneş Sistemi'nin bilinen en yüksek dağı Olympus Mons…" *Tartışmalı bir bilgiydi.* Sonra: "Güneş Sistemi'nin en büyük yanardağı Olympus Mons hangi gezegendedir?"
16. **Bilim, bilmece.** Önce: "Bazen buz, bazen **su**, bazen buhardır… Nedir bu? Su" Sonra: "Kışın taş kesilir, yazın çağlayıp akar; ısıtınca uçup gider. Nedir bu? Su / Mum / Tereyağı / Bal"
17. **Bilim, test.** Önce: "Güneş'e en yakın gezegen?" (MERKÜR asmacasıyla aynı) Sonra: "Halk arasında \"Çoban Yıldızı\" denen parlak gök cismi aslında hangi gezegendir? Venüs"
18. **Sanat, atasözü.** Önce: "Kalem ___ keskindir." *TDK'da yok, çeviri söz.* Sonra: "Yalancının mumu ___ kadar yanar. yatsıya / sabaha / akşama / öğleye"
19. **Sanat, test.** Önce: "Türk piyanist Fazıl Say hangi çalgıyla öne çıkar? Piyano" Sonra: "Âşık Veysel'in \"Kara Toprak\" türküsünü ünlü bir piyano eserine dönüştüren sanatçı kimdir? Fazıl Say / İdil Biret / Gülsin Onay / Hüseyin Sermet"
20. **Genel kültür, karşılaştırma.** Önce: "İskambil destesi (52) mi okey takımı (106) mı?" *Bu sayılar iki tahmin sorusunda daha soruluyordu.* Sonra: "Hangisi daha hızlı koşabilir? Usain Bolt (44,7 km/sa) / Evcil kedi (48 km/sa)"

Diğer yeni "aha" sorulardan bazıları:
- Oxford'da eğitim Aztek başkenti kurulmadan önce başlamıştı.
- İstanbul'daki Tünel, dünyanın en eski ikinci yeraltı hattıdır (1875).
- Fatih "Kayser-i Rum" unvanını kullandı.
- Şerife Bacı.
- Nutuk 6 günde okundu.
- İstanbul, Yunanistan'dan kalabalıktır.
- Türkiye'nin en uzun kıyısı Ege'de, en uzun kara sınırı Suriye iledir.
- Türkiye'nin en doğu ucu Iğdır, en batı ucu Gökçeada'dır.
- Lodos ve poyraz asmacaları.
- Ay'da golf oynandı.
- Uzun atlama rekoru, futbol kalesinin genişliğinden uzundur.
- Beşiktaş, Real Madrid'den bir yıl gençtir.
- Antik Olimpiyat Oyunları Zeus onuruna yapılırdı.
- Dünya'ya en yakın yıldız Güneş'tir.
- Neptün'de bir yıl yaklaşık 165 Dünya yılıdır.
- Bal binlerce yıl bozulmaz.
- Michelangelo'nun Davut heykeli Floransa'dadır.
- Rondo alla Turca Mozart'ındır.
- Shakespeare ile Cervantes aynı yıl öldü.
- Drina Köprüsü Sinan'ın eseridir.
- Osman Hamdi, Renoir'dan bir yaş küçüktür.
- Deniz samurları uyurken el ele tutuşur.
- Filler zıplayamaz.
- Çin Seddi, Dünya'nın çapından uzundur.
- Netflix, Google'dan eskidir.
- Vizontele emojisi ve kulüp emojileri (🦅⚫⚪, 🦁💛❤️, 🐤💛💙).

## Doğrulanamayanlar ve bilinçli kararlar

- **Hafızadan girilen koordinatlar.** Tortum Şelalesi (40,67 K / 41,66 D), Kaz Dağları (39,70 / 26,85) ve Aizanoi (39,20 / 29,61) web aramasıyla teyit edilemedi. Bunlar hafızadan girildi ve birkaç km sapabilir. En yakın tahmin kazandığı ve "doğru" eşiği 40 km olduğu için oyunu etkilemez.
- **Cilo'nun "Türkiye'nin ikinci en yüksek dağı" olması.** Kaynakların çoğu böyle diyor, ama zirve yükseklikleri 4.135 ile 4.168 m arasında değişiyor. Soruda yükseklik verilmiyor.
- **"Bin düşün bir söyle" atasözü.** Çok yaygın, fakat TDK sözlük kaydı arama ile görülemedi, yine de bırakıldı. "Kalem kılıçtan keskindir" hiçbir TDK kaynağında bulunamadığı için çıkarıldı.
- **Halil Mutlu'nun lakabı.** Kaynaklar "Dinamo" ve "Küçük Dinamo" diyor. Şıklarda yalnız "Küçük Dinamo" var.
- **Yaklaşık değerler.** "Yaklaşık" etiketi taşıyan değerler yaygın kabul gören rakamlardır: evcil kedinin en yüksek hızı (48 km/sa), Bizans'ın ömrü (yaklaşık 1.100 yıl, 330/395–1453), Türkiye'nin ortalama yükseltisi (1.132 m) ve İstanbul nüfusu (TÜİK 2024: 15,7 milyon).
- **2026'ya göre kontrol edilen güncel bilgiler.** 2026 Dünya Kupası'nı İspanya kazandı ve Türkiye de turnuvada oynadı. Hakan Şükür'ün 11 saniyelik rekoru hâlâ duruyor. Fenerbahçe 2025'te ikinci kez EuroLeague şampiyonu oldu. Bunlara bağlı sorular zamansız hâle getirildi.
- **Bilerek bırakılan yakın iğne.** `spo-pi-001` (Atatürk Olimpiyat Stadı) İstanbul iğnesine 19 km uzakta. Şehir büyük ve soru ünlü bir finale bağlı olduğu için tutuldu.
- **Doğal ölçekli tahmin soruları.** Plaka kodları (1–81) ve yüzdeler (0–100) doğal ölçeklerinde bırakıldı. Bu sorularda açılış değeri cevaptan %8–10 uzakta.

## Tip kodu sahibi için notlar

Bu notlar `src/quiz/*` dosyalarıyla ilgili. O dosyalara dokunulmadı.

1. **`num`:** Kaydırıcı her zaman ortada açılıyor. İçerik tarafında aralıklar asimetrik yapılarak sorun çözüldü, ama kalıcı çözüm tip kodunda olmalı. Seçenekler: kaydırıcıyı rastgele ya da nötr bir noktada açmak, ya da değeri ilk dokunuşa kadar "?" olarak göstermek. Ayrıca doğru cevap açıklandıktan sonra gösterilecek isteğe bağlı bir `why` alanı tahmin sorularını daha "aha" yapardı.
2. **`tf`:** Açıklama alanı yok. Kleopatra–Ay, Oxford–Aztek ve "Van Gölü'nde balık yaşamaz (Y)" gibi önermeler, cevaptan sonra `odd` tipindeki gibi bir `why` satırıyla çok daha etkili olur.
3. **`hilo`:** Her zaman büyük değer kazanıyor. Bu yüzden "Hangisi daha eski?" gibi sorular "Hangisi daha geç…?" diye ters kurulmak zorunda kalıyor. Bir `dir: 'lo'` bayrağı daha doğal kökler sağlar.
4. **`pin`:** "Doğru" eşiği her soru için sabit 40 km. Göller, yarımadalar ve dağlar için soru başına bir yarıçap daha adil olur.

## Birleştirme notu

- Sıralama ve eşleştirme satırlarına dokunulmadı. Dosyalarda satır eklenmedi ya da silinmedi, bütün değişiklikler satır içinde yapıldı.
- Şu 5 satır, bir sıralama/eşleştirme bloğunun hemen bitişiğinde: `tar-ha-017`, `tar-hl-012`, `cog-hl-001`, `spo-ha-016`, `egl-hl-014`. Diğer ajan o blokların ilk ya da son satırını değiştirirse git bu noktalarda çakışma gösterebilir. Çakışma çözümü basit: iki tarafı da tutmak yeterli.
- Dosya başlıklarındaki "(245 soru)" gibi sayılar değişmedi, çünkü soru sayıları aynı kaldı.

## Sınamalar

Her kategori commit'inden önce aşağıdakiler çalıştırıldı ve hepsi geçti. `dist/` commit'lenmedi.

| Sınama | Sonuç |
|---|---|
| `node test/types.test.mjs` | 83.331 denetim, 0 hata |
| `node test/timing.test.mjs` | 59.675 denetim, 0 hata |
| `node test/sim.mjs --quiet` | hepsi temiz |
| `node build.mjs` | başarılı |
