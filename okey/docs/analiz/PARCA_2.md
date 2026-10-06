# Parça 2 — Masa, ıstaka, açma tablası, orta alan ve animasyonlar

> Bu dosyayı yapay zekâ kodlama aracına ver ve "Bu dosyadaki görevi yap" yaz. Dosya kendi başına eksiksizdir.

# A. Ortak kurallar (önce bunu oku)

Bu dosya Patisever Okey'in parça parça, derinlemesine analizinin bir parçasıdır (toplam 6 parça).
Sana yalnız bu parça verildi; **yalnız bunu** yap. Bu dosya kendi başına eksiksizdir, başka dosyaya ihtiyacın yok.

## Çalışma akışı

1. Bu dosyanın tamamını oku: önce ortak kurallar, sonra parçanın kendi görevi.
2. Analizi yap. Raporu proje içinde `docs/analiz/RAPOR_0N.md` olarak yaz (N = bu parçanın numarası; klasör yoksa
   oluştur), ekran görüntülerini `docs/analiz/ss/0N/` klasörüne koy. Bitince raporun **tam yolunu** söyle.
3. **Rapordan sonra dur.** Düzeltmeye başlama. Rapor başka bir yapay zekâya gider; o, düzeltme talimatını hazırlar.
4. Düzeltme talimatı gelince onu uygula. Test et. Sonunda "Parça N düzeltildi, testler: …, Parça N+1'e hazırız" diye raporla.

Elinde yarım bir iş varsa (ör. çevrim içi ekranlar), analize başlamadan önce onu bitir, testleri çalıştır ve commit et.

## Süre sınırı (önemli)

Bu analiz **hızlı ve derin** olmalı.
- **Üst sınır 60 dakika.** Bu bir hedef değil, tavandır. İş 15 dakikada bitiyorsa 15 dakikada bitir; süreyi doldurmak
  için oyalanma, gereksiz ek test ya da tekrar yapma.
- Her soruyu cevaplayacak kadar kanıt topla, fazlasını değil. Cevap netleştiyse sonraki maddeye geç.
- 60 dakikaya yaklaşırsan kalan maddeleri hızlıca bitir; doğrulayamadıklarını `BİLİNMİYOR` diye işaretle ve raporu yaz.
- **Toplu testleri ekransız çalıştır.** Kural motorunu doğrudan kullan, ekran çizme. Örnek: `src/game/sim.js`
  içindeki `playMatch`. Ölçüm: 100 maç klasikte yaklaşık 40 sn, 101'de yaklaşık 13 sn sürüyor.
  Saf fonksiyon testleri (dizme, toplam hesabı) 10.000 elde bile saniyeler sürer.
- **Ekranlı (tarayıcı) denemeleri az ve hedefli yap.** Her soru için 1–3 örnek ve ekran görüntüsü yeterli.
  Tarayıcıda uzun maç oynatma; gereken ana gelmek için oyunun test kancalarını (`window.__okey`) kullan.
- Uzun süren işleri arka planda başlat, beklerken kodu incele.
- Bir test 5 dakikayı geçerse durdur, nedenini rapora yaz ve devam et.

## Kurallar

1. **Bu bir analizdir.**
   - Ürün kodunu değiştirme.
   - Deploy etme. Bulutta kaynak oluşturma ya da silme.
   - Ücretli bir şey açma.
   - Serbest olanlar: okumak; test, derleme ve yerel sunucu çalıştırmak (`npm run dev`, `wrangler dev --local`);
     ölçmek; ekran görüntüsü almak. Ölçüm, otomatik oynatma ve senaryo betiklerini yalnız `tools/analiz/` klasörüne koy.
     Bu betikler daha sonra kalıcı teste dönüşebilir, o yüzden düzgün yaz.
2. **Gerçekten dene.** Kodu okumak yetmez. Oyunu aç, oyna, otomatik oynat, ekran görüntüsü al.
   Bir şeyin "çalıştığını" ancak gördüysen ya da ölçtüysen yaz.
   - Telefon boyutları:
     - en az 568×320 (küçük yatay)
     - 844×390 (orta)
     - 932×430 (büyük)
   - Kalite modları: Oyunda 3B (`?quality=` ile) ve DOM modu varsa ikisini de dene.
3. **Kanıt göster.** Her bulguda dosya:satır, komut çıktısı ya da ekran görüntüsü yolu olsun.
4. **Uydurma.** Her iddianın yanına durumunu yaz:
   - `ÖLÇÜLDÜ`: gördün ya da ölçtün
   - `TAHMİN`: çıkarım yaptın
   - `BİLİNMİYOR`: doğrulayamadın; nasıl doğrulanacağını da yaz
5. **Gizli bilgi.** Anahtar, token ya da parola değerlerini asla yazma, ekrana basan komut çalıştırma.
   Sadece hangi dosyada ya da hangi değişkende olduğunu söyle.
6. **Eksiksiz ol.** Parçadaki her soruya cevap ver. "Kapsam dışı" deyip geçme. Bir şey bizde yoksa `YOK` yaz ve
   nasıl olması gerektiğini öner.
7. **Soruları çoğalt.** Parçadaki listeler başlangıçtır. Okey bilgine ve kodda gördüklerine dayanarak, bizim
   sormadığımız eksik ve hataları da bul. Rapordaki "Ek bulgular" bölümü bunlar içindir.
8. **Başka parçaya ait bir şey görürsen** raporun sonundaki "Diğer parçalara notlar" bölümüne yaz, kaybolmasın.

## Bağlam (kısa)

- **Oyun:** Klasik Okey ve 101 Okey. Kaynak `src/` altında vanilla ES modülleri ve three.js. Tek dosya HTML'e derlenir,
  React Native uygulamasının (sanane-main) içinde WebView'da çalışır. Yalnız yatay ekran, Türkçe.
- **Ayrıntılar:** `docs/HANDOFF.md` ve `README.md`.
- **Kurallar:** Kural motoru `src/game/` altında. Kural ayarları `src/game/game.js` içindeki `DEFAULT_RULES` nesnesinde.
- **Kalite çıtası:** Apple seviyesi ve rakip okey oyunlarından açıkça daha iyi. Hiçbir şey üst üste binmemeli.
  Her ekran koyu zemin, cam yüzeyler, altın vurgu ve serif başlıklardan oluşan tasarım diliyle uyumlu olmalı.

## Rapor biçimi (`RAPOR_0N.md`)

1. **Özet:** En önemli 10 bulgu, tek cümle hâlinde.
2. **Kullanıcının soruları:** Parçada "Kullanıcının soruları" bölümü varsa her soruya bir satır. Biçim:

   | No | Soru | Cevap (Evet/Hayır/Kısmen) | Kanıt / ekran görüntüsü | Not |
   | --- | --- | --- | --- | --- |

3. **Durum tablosu:** Parçadaki her başlık için durum (`VAR` / `KISMEN` / `YOK`), bulgu sayısı ve tek cümle.
4. **Bulgular:** Önem sırasına göre, şu biçimde:

   ```
   ### ISTAKA-04 — "Diz" son 13'ü alt satıra atıyor, grup tanınmıyor
   - Önem: P0 (canlı öncesi şart) | P1 (önemli) | P2 (iyileştirme) | P3 (fikir)
   - Durum: ÖLÇÜLDÜ
   - Yeniden üretme: 1) … 2) … 3) …
   - Beklenen: … / Gerçekleşen: …
   - Kanıt: src/ui/rack.js:312, ss/02/istaka-04.png
   - Kök neden (biliniyorsa): …
   - Öneri: …
   - Efor: S | M | L
   ```

5. **Ek bulgular:** Bizim sormadığımız ama bulduğun her şey, aynı biçimde.
6. **Sahibine sorulacak kararlar:** Numaralı liste. Her soruda seçenekler, senin önerin ve gerekçesi.
7. **Önerilen düzeltme sırası:** Bulgu ID'leriyle, bağımlılık sırasına göre.
8. **Diğer parçalara notlar.**
9. **Ekler:** Çalıştırılan komutlar ve özet çıktıları, yazdığın betiklerin yolları, test sonuçları.

Raporu bitirince baştan sona bir kez daha oku. Parçadaki her soru ve her maddenin raporda bir karşılığı var mı,
kontrol et.

---

# B. Bu parçanın görevi

Çıktı: `docs/analiz/RAPOR_02.md`, ekran görüntüleri: `docs/analiz/ss/02/`.
Rapor öneki: `ISTAKA`, `GRUP`, `TABLA`, `ORTA`, `ANIM`, `YERLESIM`, `SES`.

Bu parça oyuncunun elinin altındaki her şeyi inceler: ıstaka, taşların dizilmesi, grup tanıma, toplamlar,
101 açma tablası, orta alan, desteler ve tüm animasyonlar. Hem klasik hem 101'de, hem 3B hem DOM kalite modunda,
üç telefon boyutunda (568×320, 844×390, 932×430) bak.

İlgili dosyalar (başlangıç noktası):
- `src/ui/rack.js`, `src/ui/layout.js`, `src/ui/meld-layout.js`
- `src/ui/table101.js`, `src/ui/workbench101.js`
- `src/ui/scene.js`, `src/ui/choreo.js`, `src/ui/input.js`
- `src/render3d/`

---

## Kullanıcının soruları (her birine tabloda açık cevap ver)

- **U1.** Biri 101'de açtıktan sonra **sonraki ele geçince** açma tablasındaki taşlar ve animasyonu temizleniyor mu?
  Önceki elden kalan taş, iz ya da animasyon kalıyor mu?
- **U2.** 101'de orta alan boş kaldığı için çekme destesi ıstakamın solundan ortaya güzelce geliyor mu? Destenin yeri
  ve hareketi iki modda nasıl? Animasyonu akıcı ve doğru mu?
- **U3.** Ortadaki kalan taş sayısı her an doğru mu? 106 − dağıtılan − çekilen hesabıyla karşılaştır, her çekişte doğrula.
- **U4.** "Diz" bazen bir grubun son taşını alt satıra atıyor. Örnek: 13-13-13, son 13 alta düşüyor ve grup per olarak
  tanınmıyor. **Bir grup hiçbir zaman iki satıra bölünmemeli.** Yer yoksa grubun tamamı alt satıra ya da uygun bir boşluğa
  gitmeli. Bu nasıl çalışıyor? Kaç durumda bozuluyor?
- **U5.** Grupların toplamı yazıyor (13-13-13 → 39). Elimin **genel toplamı** (ör. "Elim: 98") bir yerde yazıyor mu?
  101'de "açmaya X kaldı" bilgisi var mı?

---

## 2.1 Istaka ve dizme

- Istakanın düzeni:
  - kaç satır, kaç yuva
  - 101'deki 21–22 taş rahat sığıyor mu
  - küçük telefonda taşlar okunuyor mu
- Dizme düğmeleri ve davranışları: seri diz, çift diz, renge göre, sayıya göre.
- Her dizme türü için kontrol et:
  - grupları doğru buluyor mu
  - okeyi akıllıca yerleştiriyor mu
  - gruplar arasında boşluk bırakıyor mu
  - grupları satır sonunda bölüyor mu (U4)
- **Otomatik test:** Her dizme türünü 10.000 rastgele elde çalıştıran bir betik yaz. Şunları ölç:
  - Satır sınırında bölünen grup sayısı (hedef: 0).
  - Kaybolan ya da çiftlenen taş sayısı (hedef: 0).
  - Dizmeden önce ve sonra bulunan per sayısı. Dizme, mevcut bir peri bozuyor mu?
  - Rapora örnek bozuk eller koy (taş listesi ve ekran görüntüsü).
- Sürükle-bırak:
  - hassasiyet
  - dolu yuvaya bırakma (yer değiştirme mi, kaydırma mı?)
  - satırlar arası taşıma
  - ıstaka dışına bırakma
  - hızlı ardışık sürükleme
  - yanlışlıkla atma riski
- Yeni çekilen taş nereye geliyor? Kullanıcının dizdiği düzeni bozuyor mu? Yeni taş belirgin mi (vurgu)?
- Taş atma hareketi:
  - nasıl atılıyor (sürükle, çift dokun?)
  - yanlışlıkla atmaya karşı koruma
  - geri alma
- Istakada okey ve sahte okey görsel olarak ayırt ediliyor mu?

## 2.2 Grup tanıma ve toplamlar

- Geçerli perler görsel olarak işaretleniyor mu? Geçersiz dizilimler (2 taşlı, aynı renk grup) ayırt ediliyor mu?
- Grup toplam etiketleri:
  - Okeyin değeri doğru sayılıyor mu?
  - 12-13-1 serisinde 1'in değeri ne?
  - Etiketler taşlarla çakışıyor mu?
- Genel toplam (U5). 101'de "açmaya X kaldı", çift açmada "çift sayısı 4/5" var mı?
- **Otomatik test:** 1.000 rastgele elde ekranda gösterilen toplamları kural motorunun hesabıyla karşılaştır.

## 2.3 101 açma ve tabla

- Açma akışı:
  - perleri seçme
  - açma önizlemesi (toplam)
  - onay
  - açamıyorsan nedeni
  - Kaç dokunuş gerekiyor? Hızlı mı, anlaşılır mı?
- Tabla düzeni:
  - her oyuncunun perleri nerede
  - kim neyi açtı belli mi
  - çok per olunca taşıyor mu, küçülüyor mu, kaydırılıyor mu
  - küçük telefonda okunuyor mu
- İşleme:
  - masadaki bir pere taş sürükleme hedefleri
  - geçerli hedef vurgusu
  - yanlış hedefe bırakma
  - okeyi geri alma etkileşimi
- Animasyonlar: taşların ıstakadan tablaya gidişi, başka oyuncunun açışının gösterilmesi.
- **El sonu ve yeni el (U1):** Tablanın, atılan taşların ve vurguların temizlenmesi. Eski elden "hayalet" taş ya da
  sprite kalıyor mu? Üst üste 5 el oynayıp her yeni elin başında ekran görüntüsü al.

## 2.4 Orta alan ve desteler

- Klasik ve 101'de çekme destesinin, göstergenin ve atılan taş yığınlarının yeri. 101'de orta alan nasıl kullanılıyor
  (U2)?
- Kalan taş sayısının doğruluğu (U3). Deste azalınca uyarı var mı?
- **Atılan taşlar:**
  - Her oyuncunun yığını görünüyor mu?
  - Son atılan taş belirgin mi?
  - Önceki atılanlara bakılabiliyor mu (okeyde önemli bilgi)?
- **Yandan alma:**
  - Hangi taşın alınabileceği belli mi?
  - Animasyonu nasıl?
  - 101'de alınan taşı kullanma zorunluluğu görsel olarak hatırlatılıyor mu?

## 2.5 Animasyonlar ve geçişler

Her animasyonu tek tek izle ve 1–10 arası kalite puanı ver:
- dağıtma
- çekme (desteden ve yandan)
- atma
- bot hamleleri
- açma ve işleme
- okey geri alma
- bitirme
- el sonu ekranına geçiş
- yeni elin başlaması
- maç sonu

Her biri için kontrol et:
- Süre uygun mu (yavaş ya da hızlı)?
- Kesilme, zıplama ya da yanlış yere gitme var mı?
- Üst üste binme ve katman (z-index) hatası var mı?
- Animasyon sürerken dokunulursa ne oluyor?

Performans:
- Düşük donanımlı telefon benzetimiyle (CPU yavaşlatma 4×) kare hızını ölç.
- 3B ve DOM modunu karşılaştır.

## 2.6 Ekran yerleşimi

- Üç telefon boyutunda masa ekranının görüntüsü. Çentik ve güvenli alanlar.
- Taşların okunurluğu ve dokunma hedeflerinin boyutu.
- Oyuncu adları, avatarlar, süre göstergesi ve puanlar çakışıyor mu?
- Renk körü dostu mu? Kırmızı, mavi, siyah ve sarı taşlar renk görmeden ayırt edilebiliyor mu?
- Yatay ekran kilidi ve dikey çevirme uyarısı.

## 2.7 Ses ve titreşim

- Her eylemin sesi var mı: çekme, atma, açma, ceza, sıra, bitiş?
- Ses düzeyleri dengeli mi? Titreşim var mı, kapatılabiliyor mu?

## 2.8 Ek: senin bulacakların

Masada bizim sormadığımız her eksiği ara. Örnekler:
- "Elini göster" animasyonu
- son 3 hamle geçmişi
- ipucu
- "otomatik çek" seçeneği
- çift dokunuşla atma
- ıstakada iki satır arası boşluk ayarı
