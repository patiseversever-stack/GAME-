# Fetih Ligi soru bankası: ortak sözleşme v2 (20 bin adımı)

Oyun: Türkiye haritasında il fethedilen, Türkçe, mobil bilgi yarışması. 6 kategori: tarih, cografya, spor, bilim,
sanat (= "Sanat & Edebiyat"), eglence (= "Genel Kültür"). Banka 10.437 → 20.000. Proje: `/home/user/GAME-/game/fetih`.
Kullanıcının isteği: "Soru kaliteleri, yazım stili, mantığı çok daha iyi olsun; hiçbir soru hatalı ya da yanlış olmasın."
Bu yüzden her dosyayı önce bir yazar ajan yazar, sonra bağımsız bir denetçi ajan soru soru denetler.

## 1. Doğruluk (pazarlık yok)
- Yalnız kesin, kalıcı, kaynaklarla doğrulanabilir bilgi. Kaynaklar çelişiyorsa, bilgi "rivayet", "kabul edilir",
  "sanılır" düzeyindeyse ya da sen %100 emin değilsen: YAZMA.
- Web (WebSearch/WebFetch) kotası bütün ajanlarla ortak ve sınırlı: yalnız gerçekten emin olmadığın bilgi için kullan;
  kota biterse emin olmadığını yazma. Web'den soru KOPYALAMA: bilgiyi doğrula, cümleyi kendin kur.
- Zamanla değişen bilgi yok: nüfus, güncel kadro, güncel rekor, "şu anki", yaşayan kişinin değişebilecek durumu, son
  durum sıralamaları. Rekor sorulacaksa "o yıl kırdığı rekor" gibi tarihe sabitle.
- "İlk", "en", "tek" iddiaları yalnız tartışmasızsa. "En büyük/uzun/yüksek" sorularında ölçüt açık ve kesin olsun.
- Sayılarda kaynakların uzlaştığı değeri kullan; yaklaşık bilgiyi yalnız `num` tipi (aralıklı tahmin) kaldırır.

## 2. Mantık
- TEK doğru cevap. Her yanlış şık KESİN yanlış olmalı: bir uzman "aslında B de doğru sayılır" diyebiliyorsa soru bozuktur.
- Soru kendi içinde tutarlı ve yeterli: oyuncu soruyu okuyunca neyin sorulduğunu tam anlar; bağlam eksik değil.
- Cevap ya da cevabın kökü soru metninde geçmez (ele vermez). Şıklardan biri sorudaki bir kelimeyi tekrar etmez.
- `tf`: ifade ya tamamen doğru ya tamamen yanlış; yarı doğru, yoruma açık ifade yok. Yanlış ifade bariz saçma değil,
  inandırıcı olsun. Doğru/yanlış dengesi yaklaşık %55/%45.
- `order`: öğeler arasında makul aralık (kolayda belirgin, zorda yakın ama tartışmasız); dir ile soru metni uyumlu.
- `hilo`: iki değer net farklı (en az %10); karşılaştırılan özellik tek anlamlı.
- `match`: her sol öğenin tek bir doğru eşi var; çaprazda başka eşleşme de doğru olamaz.
- `odd`: tam olarak bir öğe kümenin dışında; `why` açıklaması doğru ve kısa.
- `num`: min < cevap < max; cevap aralığın uçlarına yapışık değil (aralığın %10–90'ı içinde); birim doğru. Tam sayı cevap.
- `proverb`/`riddle`: TDK sözlüğündeki biçim; bilmecenin cevabı tek ve kesin.
- `blitz`, `cross`, `anagram`, `hang`: mevcut örneklerin kurallarına birebir uy (kelimeler Türkçe büyük harf).

## 3. Yazım ve üslup (stil rehberi)
- Doğal, akıcı, tek cümlelik soru kökü. Okunur okunmaz anlaşılır. Gereksiz söz yok.
  - KÖTÜ: "Aşağıdakilerden hangisi Türkiye'nin en uzun nehri olarak bilinmektedir?"
  - İYİ:  "Tamamı Türkiye'de akan en uzun nehir hangisidir?"
- Merak uyandıran, akılda kalan bilgi; ders kitabı tanımı değil. Ama süs için yanlışa kaçma.
  - KÖTÜ: "Fotosentez nedir?"   İYİ: "Bir ağacın odun kütlesinin büyük kısmı nereden gelir?" (Havadaki karbondioksit)
- Olumsuz kök ("…değildir?") az kullan: bir dosyanın en çok %10'u. Olumsuz kök varsa bunu soru metni açıkça söyler.
- Şıklar aynı türden ve benzer uzunlukta; doğru şık en uzun, en ayrıntılı ya da tek farklı biçimli olmasın.
  "Hepsi", "Hiçbiri", "A ve B" yok. Çeldiricilerden en az biri gerçekten güçlü (en çok karıştırılan).
- TDK yazım kuralları: özel adlar, kesme işareti (İstanbul'un), birleşik kelimeler, "de/da" ve "ki" ayrı/bitişik,
  büyük harf, sayıların yazımı (10.000; 3,5), "MÖ/MS", yüzyıl ("19. yüzyıl"). Yabancı özel adlar Türkçede yaygın
  biçimleriyle (Shakespeare, Leonardo da Vinci, Kolomb, Napolyon). Tırnak ve kesme düzeni hedef dosyanın mevcut düzeni.
- Zorluk (`diff`): 1 = çoğu yetişkin bilir, 2 = kültürlü biri bilir, 3 = meraklısı bilir ama "duyunca tanıdık" gelir.
  Dürüst etiketle; hedef dağılım yaklaşık %30 / %45 / %25. Aşırı bilinmez (yalnız uzmanın bileceği) bilgi yok.
- Uzunluk sınırları (ekran denetiminden geçmiş en uzun sorular; aşma): choice soru ≤ 100 karakter, şık ≤ 28 · tf ≤ 85 ·
  num ≤ 78 · hang ipucu ≤ 72 · order soru ≤ 72, öğe ≤ 30 · match soru ≤ 48 · hilo ≤ 60, öğe ≤ 24 · odd soru ≤ 58, öğe ≤ 22 ·
  anagram ≤ 65 · harfal ≤ 85 · penalti soru ≤ 75, şık ≤ 22 · blitz, cross, riddle, proverb: mevcut en uzunu aşma.

## 4. Biçim
- Tip biçimleri: `DESIGN.md` "Soru veri biçimleri" (satır ~99) ve asıl ölçü olarak aynı tipin bankadaki mevcut örnekleri
  (`src/data/q/ek/<kat>.js`, `src/data/q/ek/<kat>-2.js` vb.). Alanları ve tırnak düzenini birebir izle.
- Kimlik düzeni görev metninde. Kimlikler benzersiz.

## 5. Tekrar yok
- Bankada (10.437 soru) ve aynı anda çalışan öbür ajanların yeni dosyalarında aynı BİLGİYİ soran soru varsa yazma
  (aynı cevaba bambaşka bir açıdan soru olabilir; aynı bilgiyi başka cümleyle sormak olmaz).
- Araç: `node tools/denetim/yakin.mjs '<kimlik düzenli ifaden>'` (AYNI 0 olmalı; KARDEŞ ve BENZER satırlarını tek tek
  oku). Ayrıca kuşkulandığın bilgiyi bankada metin olarak ara: `grep -rn "Anahtar" src/data src/quiz/deneme-*.js`.
- Görev metnindeki konu sınırına uy: öbür ajanların konularına girme.

## 6. Çalışma düzeni (kullanım sınırına dayanıklı)
- 50 soruda bir dosyaya yaz (dosya her an sözdizimi doğru). Kesilirsen yeniden başladığında dosyadakini oku, sürdür.
- Yalnız görev metnindeki dosyalara yaz. `git commit/push/stash/checkout` YAPMA. Derleme gerekirse `--out=/tmp/<adın>`.
- Testler: görev metnindeki test dosyaları + `node --test test/types.test.mjs test/timing.test.mjs`; bitirirken bir kez
  bütün takım `node --test test/*.test.mjs`. Hata başka bir ajanın dosyasından geliyorsa yok say (raporda belirt).
- `node tools/denetim/icerik.mjs --hepsi | grep '<kimlik önekin>'` : senin kimliklerinde bulgu kalmamalı.

## 7. Teslim raporu (kısa)
Tip × zorluk sayıları, konu dağılımı, denetim sonuçları (yakin.mjs özeti, icerik.mjs, testler), elediğin şüpheli bilgi
sayısı ve örnekleri, bilinçli kararlar. Soru listesini rapora koyma.

## 8. DENETÇİ protokolü (yalnız denetçi ajanlar için)
Yazarı görmeden, bağımsız ve şüpheci oku. Her soru için:
1. Bilgi doğru mu? (gerekirse web; kota yoksa bilgin. Emin değilsen → DÜŞÜR ya da kesin bildiğin bir biçime DÜZELT.)
2. Tek doğru cevap mı? Her yanlış şık kesin yanlış mı? Soru yoruma, takvim/tanım farkına, kaynak çelişkisine açık mı?
3. Mantık kuralları (bölüm 2) ve stil (bölüm 3): akıcılık, ele verme, olumsuz kök payı, şık dengesi, TDK yazımı.
4. Zorluk etiketi makul mu?
5. Bankada aynı bilgi var mı? (yakin.mjs + grep)
Eylem: sorunu en küçük düzeltmeyle gider (cümleyi, şıkkı, zorluğu düzelt) ya da soruyu SİL. Kararsızsan SİL.
Bitirince testleri çalıştır. Rapor: incelenen, düzeltilen, silinen sayılar; düzeltme ve silme gerekçelerinden örnekler;
bulduğun hata türlerinin dağılımı.

## 9. Ek (ilk yazarlardan sonra): ZORLUK KAYMASI
İlk biten dosyalar zora kaydı (Tarih B %8/%48/%45, Sanat B %14/%56/%30, Spor A %21/%50/%29). Sebep: herkesin bildiği temel
bilgi bankada zaten var. Çözüm "temel bilginin yanındaki ama yine herkesin duyduğu" katman: tanıdık kişi/eser/olayın
az sorulmuş ama kolay bir yönü (ör. "Çanakkale Savaşı'nın kara muharebelerinin yaşandığı yarımada?" gibi). Hedef: kolay
(1) en az %25, zor (3) en çok %30. "Yalnız uzmanın bileceği" soru yazma; denetçi siler.
- Çengel (cross): `test/timing.test.mjs` bankadaki çengel sürelerinin ortancasının tip süresine (45 sn) ±2 yakın kalmasını
  istiyor; ortanca şu an 46–47. Yeni çengeller kısa olsun (3–4 kelime, kısa ipuçları), ortancayı yukarı itmesin.

## 10. YENİ ARAÇ: bilgi parçası tekrarı (yakin.mjs'in göremediği)
`node tools/denetim/parca.mjs '<kimlik düzenli ifaden>' --hepsi` : her soruyu bilgi parçalarına böler (soru+doğru cevap,
yıldırım maddesi, ikidogru maddesi ve açıklaması, yanlışı bul cümlesi, balon/mayın notu, eşleştirme çifti, çengel ipucu,
tünel kartı …) ve bankanın bütün parçalarıyla kelime kökü örtüşmesine göre karşılaştırır (0,6 sn). Çıktı sezgiseldir,
yaklaşık üçte biri gerçek tekrar: her PARÇA satırını oku, aynı BİLGİYİ soruyorsa değiştir ya da sil. Ayrı ayrı banka
dökümü çıkarmaya, grep turlarına gerek kalmaz (kotayı korur). Yazar da denetçi de teslimden önce çalıştırır.
- Ortak scratchpad'de genel dosya adları (g.sh, ops.py, egl.txt …) kullanma: başka ajanlar üstüne yazıyor. Kendi
  araçlarını kendi alt klasörüne koy: scratchpad/<dosya-adın>/ (ör. scratchpad/cog4/).

## 11. DENETÇİLERİN EN SIK BULDUĞU HATALAR (ikinci tur yazarları: baştan kaçın)
Bankaya 16.170 soru oturdu; denetçiler yazılanların ~%12'sini sildi, ~%10'unu düzeltti. Silinenlerin 3/4'ü TEKRARDI.
1. Aynı bilgi başka tipte: yıldırım maddesi, İki Doğru maddesi/açıklaması, Yanlışı Bul cümlesi/notu, Harf Al tanımı,
   Kimim/İl Avı/Kayıp İl ipucu, Göz Kararı, tünel kartı, balon/mayın notu, çengel ipucu, harita sorusu (yerin ili),
   tahmin sayısı. parca.mjs'i 50 soruda bir çalıştır; soru başına yalnız en güçlü eşi gösterir, kuşkulu maddeyi grep'le ara.
2. Soru kökü başka bir sorunun cevabını açar ("Fransa'nın ilk kupayı kazandığı 1998 finalinde…"), ya da cevabın kökü
   ipucunda geçer (ŞARKICI ← "şarkı söyleyen"; Yeniçeri Ağası ← "Yeniçeri Ocağı'nın").
3. İkinci doğru şık: "İngiliz" (Britanyalı da olur), ada/devlet (İrlanda), iki ile yayılan yer, birden çok kez ev sahipliği,
   çapraz eşleşme (inning: beyzbol ve kriket), yaygın atasözü varyantı, iki mucitli icat, iki yılı olan olay.
4. Zamanla bozulan: "tek/en/ilk" iddiası, 2025'te değişen kurallar, "bugüne dek" (yıla sabitle), değişmiş başkent.
5. Yarı doğru tf ya da yıldırım maddesi (bir uzman "aslında…" der): "genlerin yarısı anneden", "dinozorlar ve mamutlar".
6. Aşırı bilinmez soru (yalnız uzman). Zorluk: kolay en az %25, zor en çok %30.
Dosya içi tekrar da sayılır (iki soru aynı bilgiyi sormasın; bir sorunun metni öbürünün cevabını vermesin).

## 12. Anlatım çeşitliliği (kullanıcı şartı, 16 Kasım 2026)

Kullanıcı: "Türkçe soru yapısı hep aynı, 'şurası hangi ildedir' hep aynı; anlatımı geliştirelim ama karakter limitini
geçmeyelim." Bu yüzden hem elle yazılan hem üretilen (Wikidata) her aile için:

- **Tek kalıp yok.** Bir ailede aynı soru sonu ("hangi ildedir?", "hangisi?", "kimdir?") en çok yaklaşık %25.
  - Üretilen ailede kalıplar sırayla dağıtılır, kalıp kimliğin özetiyle seçilir (yeniden üretimde soru kalıbını korur).
    Örnekler: `tools/veri/pilot/ilce.mjs` (KALIP, KALIP_IP, PIN) ve `kisi.mjs` (KALIP, KALIP_TR).
- **İpucu ve tanım.** Çıplak "X hangi yıl doğdu?" yerine kişiyi/yeri ayırt eden kesin bir öbek kullanılır:
  - '"Suç ve Ceza"nın yazarı Fyodor Dostoyevski hangi yıl dünyaya geldi?'
  - "Cunda Adası'nın bağlı olduğu Ayvalık hangi ilimizdedir?"
  - İpucu kesin bilgi olmalı, cevabı tek başına vermemeli, ilin/cevabın adını içermemeli.
- **İpucu başka sorunun cevabını açmamalı.** Kökteki ipucu bankada bir sorunun cevabını söylüyorsa
  (ör. "Ölüdeniz'in bulunduğu Fethiye" ↔ "Ölüdeniz hangi ilçemizdedir? → Fethiye"):
  - ya ipucu değiştirilir,
  - ya da soru `kardes: 'a:<cevap>'` taşır (`src/quiz/hafiza.js`: aynı maçta birlikte çıkmaz).
  - Tarama: `node tools/soru/ipucu_acik.mjs` (ilçe ipuçları; kalan bulgular elle okunur).
- **Ekli kalıp yalnız ekin kesin olduğu adlarda.** Türkçe adlar `ek.js` ile çekimlenir. Yabancı adlarda okunuşa bağlı ek
  kalıba konmaz ("X'in doğduğu yıl" yalnız Türk adlarında).
  - Tanımdaki her ekli yabancı ad `tools/denetim/ek_tara.mjs` ile taranır (NBA'da, Tiffany'de, Holmes'un).
- **Sınır her zaman `src/quiz/sinirlar.js`'ten.** Uzun kalıp sığmazsa sıradaki kalıp denenir; hiçbiri sığmazsa tanım kısaltılır.
  - Tahmin sorusunun Mancınık ikizi de aynı sınıra uyar (num ve mancinik ikisi de 80).
