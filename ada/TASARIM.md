# ADA: Oyun Tasarım Belgesi

Taslak v0.1 · 5 Kasım 2026 · Sohbetteki kararlardan derlendi.

> **Ada hatırlar.**

## Özet
ADA sinematik bir hayatta kalma yarışma şovu. Kendi markamız; başka bir şovun adı, logosu ya da birebir öğeleri kullanılmaz.
Oyuncu kendi yarışmacısını oynar. Takım parkurları, kamp hayatı, ittifaklar, kaptanlık seçimleri ve eleme geceleri var.
Şiddet yok, her yaş oynar ama çocuksu değil. İlk sürüm botlara karşı. Online mod sonra gelecek, yapı baştan buna göre kurulacak.

## Temel kararlar
| Konu | Karar |
|---|---|
| Oyuncu | Kendi karakteri. Takım oyunlarına katılır, kaptanlığa aday olur, birini destekler. |
| Kadro | 12 yarışmacı, 6+6 iki takım |
| Sezon | 6 kişi kalınca takımlar birleşir, herkes bireysel. Son 3 finale kalır, jüri kazananı seçer. |
| Uzunluk | Çok uzun. Bir sezon yaklaşık 60 oyun günü: günü 15-20 dakikadan 15-20 saat oyun eder. 3-4 saatte bitirilemez. Hikaye güçlü olacak. |
| Yeni gelenler | Sürpriz dalgalar: belirli günlerde tekne gelir, yeni yarışmacılar katılır, elenenlerden biri geri dönebilir. |
| Zaman | Karışık: istediğin kadar gün oynarsın. Bazı büyük olaylar (tekne gelişi, özel görevler, final) gerçek günlere bağlı açılır. |
| Bir gün | Ödül parkuru → kamp → kurtulma parkuru → eleme gecesi |
| Eleme | Kaybeden takım oy verir, en çok oy alan 2 kişi düello parkurunda yarışır, kaybeden gider. |
| Elenince | Jüri olursun. Yeni yarışmacı dalgasıyla geri dönme şansın var. |
| Yetenekler | Parkuru asıl oyuncunun becerisi kazanır, yetenekler küçük avantaj verir. Sosyal yetenekler kampta önemli. |
| Botlar | Her botun kişiliği ve hafızası var (hırslı, sadık, entrikacı, sessiz...). İhaneti unutmazlar. |
| Görsel | Gerçekçi ve sinematik: film gibi ışık ve derinlik, gerçekten kurulmuş yarışma parkurları. Stilize ya da büyülü görünüm yok. Referanslar: `konsept/tur2/` C, D, A. |
| Dil | Sadece Türkçe |
| Ada | Tropik: turkuaz deniz, kumsal, sık orman, şelaleler. Ormanda eski taş kalıntılar var, adanın sırrına bağlanır. |

## Kaptanlık
- Seçim her 3-4 günde bir yapılır.
- Aday olmak için başarı, kazanma oranı ve yetenek önemli.
- Seçim kampanyası var: ittifak kurarsın, destek toplarsın, takım oylar. Gerekirse botlarla kaptanlık için yarışırsın.
- Kaptanın yetkileri:
  - Parkurda kimin yarışacağını seçer.
  - Kamp görevlerini dağıtır (ateş, yemek, barınak).
  - Kazanılan ödülü paylaştırır. Güçlü bir yetki ama kıskançlık yaratır.
- Elemede kaptanın ekstra oyu yok.

## Kamp
- İttifak ve sohbet: güven kazanmak, gizli anlaşma, oy pazarlığı.
- Birini desteklemek: kaptanlık seçiminde veya elemede birinin yanında durmak. İlişkileri güçlendirir ya da bozar.
- Hayatta kalma işleri: yemek, ateş, barınak. Enerjini ve takımın sana bakışını etkiler.
- Gizli avantaj arama: bulabilirsin, ama yakalanırsan güven kaybedersin.
- Hareket: kamp alanında serbest yürürsün, önemli konuşmalar sinematik sahneye döner.
- Sohbet seçmeli diyalogla yapılır. Bota yaklaşırsın, 3-4 cevap seçeneği çıkar: dostça, kurnaz, dürüst, baskıcı. Bot kişiliğine ve hafızasına göre tepki verir.
- İlişkiler kısmen görünür. Kimin sana yakın olduğunu kabaca görürsün (ısınma/soğuma), ama kimin kime oy vereceğini kesin bilemezsin.
- İhanet duyum ve tanıkla ortaya çıkar. Biri seni görürse ya da başkası anlatırsa öğrenirler. Kampta kimin yakında olduğu önemli.
- Oylar gizlidir. Eleme gecesinde oylar okunur ama kimin yazdığı gösterilmez.
- Hayatta kalma işleri 20-30 saniyelik kısa mini oyunlardır: ateş yakmak, balık tutmak, barınak onarmak. İyi yaparsan takım seni sever.

## Gizli avantaj eşyaları
Her sezon farklı eşyalar çıkar. Örnekler:
- bir oyu iptal etmek
- düelloda başta öne geçmek
- kaptanlık seçiminde ekstra oy

## Karakter
- Yüzünü, saçını, tenini ve bedenini seçip kendi yarışmacını yaratırsın.
- Ayrıca kişilikli, hikayeli özel hazır karakterler satın alınabilir.

## Parkurlar
- **İlk sürüm:** hız parkuru, denge, bulmaca kulesi.
  - **Hız parkuru (karma):** karakter kendisi koşar, sen kaydırarak zıplar, eğilir ve şerit değiştirirsin. Bazı bölümlerde tırmanma ve ip üzerinden kayma gibi özel hareketler var.
  - **Denge (dar kütük + eğme):** su üstündeki dar kütükte yürürsün, telefonu eğerek dengede kalırsın. Rüzgar ve dalga seni sallar.
  - **Bulmaca kulesi (parça bul ve diz):** parçaları kumdan çıkarıp taşırsın, ipucuna göre doğru sırayla dizip kuleyi tamamlarsın. Kule yıkılabilir.
- **Takım yarışı (bire bir düellolar):** kaptanlar kimin kimle yarışacağını seçer, 3 düelloyu ilk alan takım kazanır.
- **Hemen ardından:** su altında sandık.
- **Sonra:** halat çekme ve diğerleri.

## Kontroller ve ekran yönü
- Tek parmakla oynanır: dokun, kaydır, basılı tut. Bazı parkurlarda eğme kontrolü de var (örneğin denge).
- Eğme için izin verilmezse dokunmatik kontrole geçer.
- Ekran kuralı: **adada yaşam yatay, yarış dikey.**
  - Yatay: kamp, sinematik sahneler, kaptanlık seçimi, eleme gecesi, su altı (ileride).
  - Dikey: hız parkuru, denge, bulmaca kulesi.
- Telefonu çevirmek zorunlu değil. Oyun her iki yönde de çalışır, sadece önerilen yönde en iyi görünür. Geçişlerde küçük bir "telefonu çevir" işareti çıkar.
- Paylaşım klipleri her zaman dikey (9:16) çıkar.

## Ses
- İkili sunucu: Lal Ayaz (kadın, eleme gecesinin sesi) ve Bora Kayın (erkek, parkurların sesi).
- Yardımcı anlatıcı perde arkasındaki yapımcı Kule'dir. Kontrol kulesinden hoparlörle konuşur, adı bilinmez. Bazen kuralları değiştirir ve hikayedeki gizli plana bağlıdır.
- Dünya, takımlar, mekanlar ve karakterler için bkz. `KARAKTERLER.md`.
- Karakterler konuşur: yarışırken, birbirini desteklerken, kampta.
- Adada arka plan konuşmaları, ortam sesleri ve efektler var.
- Not: çok sayıda ses satırı ElevenLabs kredisi demek. Üretimden önce maliyet planı çıkarılacak.

## Hikaye
- Karakterin kişisel yolculuğu ve rakiplerle dramalar: ittifaklar, ihanetler, dostluklar.
- Adanın ve şovun arkasındaki sır sezonlar boyunca yavaş yavaş açılır.
- **Sır (kayıp uygarlık + yapımcıların gizli planı):** Ormandaki kalıntılar kayıp bir uygarlıktan kalma. Kalıntılardaki semboller her parkurla biraz daha açılır, sezonlar boyunca bir harita tamamlanır. Yapımcılar bunu baştan biliyor. Şov aslında adanın kalbindeki sırrı çözebilecek birini seçmek için kurulmuş. Kazananı büyük bir görev bekliyor.
- **Karakter geçmişi:** Oyuncu başta neden burada olduğunu seçer (ailesi için, kendini kanıtlamak için, ünlü olmak için, gizli bir sebep). Hikaye ve bazı diyaloglar buna göre şekillenir.
- **Rakipler:** 40'tan fazla yazılmış karakterden oluşan bir havuz var. Her sezon farklı bir kadro gelir, bazı tanıdık yüzler geri döner.
- **Yaş aralığı:** yarışmacılar 20-50 yaş arası.
- **Yakınlaşma:** ağırlık dostluk ve rekabette. Nadiren hafif yakınlaşma imaları olabilir, açık sahne asla yok.
- **Anlatım:**
  - Sinematik ara sahneler: tekne gelişi, ihanet, eleme, keşif.
  - Kameraya itiraf: yarışmacılar gün sonunda kameraya gerçek düşüncelerini anlatır. Botların sırlarını da buradan sezersin.
  - Sunucu anlatır: günün başında ve sonunda olanları özetler, ipuçları verir.

## Viral
- Her parkurun sonunda otomatik ağır çekim tekrar klibi çıkar, tek dokunuşla paylaşılır.
- Meydan okuma linki: arkadaşın senin rekorunu görür ve geçmeye çalışır.

## Ekonomi
- İki para birimi var:
  - Oynayarak kazanılan para: temel eşyalar.
  - Gerçek parayla alınan elmas: özel kostümler.
- Satılanlar: kostümler, aksesuarlar, özel karakterler.
- Küçük avantajlar satılabilir, ama:
  - hepsi oynayarak da kazanılabilir, para sadece hızlandırır;
  - bir üst sınırları var, kimse çok öne geçemez.
- Sezon kartının ücretsiz ve ücretli iki yolu var.
- Ödüllü reklam ("bir şans daha"): sadece parkuru tekrar deneme hakkı verir. Elemeyi etkilemez.
- Kumar benzeri sistem yok: şans kutusu, rastgele sandık yok.

## Teknik ilkeler
- Three.js ile yapılır, WebGPU kullanır; desteklemeyen cihazlarda WebGL2'ye geçer. Mobil tarayıcıda linkle açılır, ileride Capacitor ile mağazalara çıkar.
- Düşük, orta ve yüksek kalite ayarları olur.
- Online'a hazır yapı:
  - Oyun kuralları ve oyun durumu görüntüden ayrı tutulur.
  - Botlar gerçek oyuncuyla aynı kurallarla, aynı "hamle" diliyle oynar; ileride yerlerine gerçek oyuncu geçebilir.
- Online sunucu büyük ihtimalle Cloudflare olacak, kesin karar sonra. Supabase kullanılmayacak.

## İlk sürüm (MVP)
- 1 ada, 12 yarışmacı (1 oyuncu + 11 bot).
- 3 parkur: hız parkuru, denge, bulmaca kulesi.
- Bir tam oyun günü: ödül parkuru → kamp → kurtulma parkuru → eleme gecesi (oylama + düello).
- Uzun sezon yapısı baştan kurulur; içerik sonraki sürümlerde büyür.

## Açık sorular
- Küçük avantajlar online modda nasıl dengelenecek?
- Ses ve görsel üretimi için kredi planı.
