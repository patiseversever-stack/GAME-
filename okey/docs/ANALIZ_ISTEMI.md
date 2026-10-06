# Patisever Okey — Kapsamlı Analiz Görevi

Bu dosya bir yapay zekâ kodlama aracına verilecek talimattır. Amaç projenin bugünkü hâlini en ince ayrıntısına kadar
incelemek ve tek bir rapor dosyası üretmektir. Rapor, projeyi daha önce yürüten başka bir yapay zekâya verilecek;
o da duruma göre işi fazlara bölecek. Bu yüzden rapor **eksiksiz, kanıtlı ve düzenli** olmalı.

---

## 0. Önce bunları oku ve uy

1. **Elindeki işi bitir.** Şu an üzerinde çalıştığın işi (çevrim içi ekranlar: oda kur, oda paylaş vb.) tamamla.
   Testleri çalıştır, commit et. Analize ondan sonra başla.
2. **Bu bir ANALİZ görevidir.**
   - Ürün kodunu değiştirme.
   - Deploy etme. Bulutta kaynak oluşturma ya da silme (Worker, D1, KV, Supabase tablosu vb.).
   - Ücretli bir plan ya da özellik açma.
   - Serbest olanlar: okumak; testleri, derlemeyi ve yerel sunucuyu (`wrangler dev --local` gibi) çalıştırmak; ölçmek;
     ekran görüntüsü almak. Ölçüm için gereken geçici betikleri yalnız `tools/analiz/` klasörüne koy.
3. **Gizli bilgi.** Anahtar, token ya da parola **değerlerini** rapora asla yazma. Sadece hangi dosyada ya da hangi ortam
   değişkeninde olduğunu yaz. Değeri ekrana basan komut çalıştırma.
4. **Uydurma.** Doğrulayamadığın her şeyi `BİLİNMİYOR` diye işaretle ve nasıl doğrulanacağını yaz.
   Tahminleri `TAHMİN` diye, ölçümleri `ÖLÇÜLDÜ` diye işaretle.
5. **Önce oku:** `docs/HANDOFF.md`, `README.md`, kendi plan dosyaların ve son 50 commit mesajı.
6. **Çıktı:** Proje kökünde `docs/ANALIZ_RAPORU.md`. Ekran görüntüleri `docs/analiz-ss/` klasörüne.
   Biçim, bölüm 3'te tarif edildiği gibi olmalı.
7. **Kapsam eksiksiz olmalı.** Bölüm 2'deki her başlığı ele al. Bir başlık bizde yoksa "YOK" yaz ve ne gerektiğini açıkla.
   "Bu kapsam dışı" deyip geçme.

---

## 1. Bağlam ve hedefler

- **Oyun:** Klasik Okey + 101 Okey. Tek dosya HTML (three.js). React Native uygulamasının (sanane-main) içinde WebView'da
  çalışır, tarayıcıda da açılır. Yalnız yatay ekran, Türkçe.
- **Aşama 1, 2 ve 3 bitti.** Çevrim dışı oyun, botlar, müzik, XP ve seviye, çerçeveler, efektler, Çarşı (ödüllü reklam),
  el sonu ekranı ve ad filtresi tamam. Ayrıntılar `docs/HANDOFF.md` dosyasında.
- **Şu anki aşama:** çevrim içi oyun (4. aşama). Bu araç kendi planını yürütüyor; mevcut ilerlemesi raporlanmalı.
- **Kalite çıtası:** Apple seviyesinde, rakip okey oyunlarından açıkça daha iyi. Yeni ekranlar mevcut tasarım diliyle
  aynı olmalı: koyu zemin, cam yüzeyler, altın vurgu, serif başlıklar, akıcı animasyon. Hiçbir şey üst üste binmemeli.
- **Maliyet hedefi (kesin):**
  - Test aşaması Cloudflare **ücretsiz planında** çalışmalı (10 arkadaşla oynama).
  - Canlıda Cloudflare **Workers Paid (5 $/ay)** planı. Hedef: günde yaklaşık 500 maç (ayda yaklaşık 15.000) ile
    **toplam ayda yaklaşık 5 $**.
  - Ücretsiz plandan ücretliye geçiş **kod değişikliği gerektirmemeli.** En fazla bir ayar ya da ortam değişkeni değişmeli.
  - **Supabase yalnız giriş için kullanılacak.** Fazladan Supabase maliyeti olmayacak.
  - Hiçbir yerde gizli, öngörülmemiş ya da kontrolsüz büyüyebilecek bir maliyet kalmamalı.
- **Gecikme hedefi:** Hamle hissi anlık olmalı. Oyuncular Türkiye'de.
- **Önceden kararlaştırılan mimari ilkeler** (uygulanıp uygulanmadığını denetle):
  1. Durable Object'ler **SQLite depolu** olmalı (`new_sqlite_classes`); ücretsiz planda başka türü çalışmaz.
  2. **WebSocket Hibernation API** kullanılmalı (`state.acceptWebSocket`), `ws.accept()` değil.
  3. DO içinde süre ve bot zamanlaması için `setTimeout` / `setInterval` yerine **DO alarmları** kullanılmalı.
  4. **Shard yaklaşımı:** Her masa ayrı bir DO olmamalı. Bir DO içinde 100'e kadar masa yaşamalı
     (çalışma süresi ücreti DO başına yazar).
  5. Masalar Türkiye'ye yakın kurulmalı: `locationHint: "eeur"`.
  6. Supabase JWT, Worker içinde **önbellekteki JWKS ile yerel** doğrulanmalı; her istekte Supabase'e gidilmemeli.
  7. Canlı masa durumu DO deposunda tutulmalı. D1'e yalnız kalıcı veriler yazılmalı: maç sonucu, çip hareketi, XP,
     sıralama, sosyal veriler.
  8. Her oyuncuya yalnız kendi eli gönderilmeli. Hamleler, süre, XP ve çip **sunucuda** doğrulanıp hesaplanmalı.
  9. Supabase `service_role` anahtarı hiçbir yerde kullanılmamalı.

---

## 2. Araştırılacak konular

Her maddede şunları yaz: **durum** (`VAR` / `KISMEN` / `YOK` / `BİLİNMİYOR`), **kanıt** (dosya:satır, komut çıktısı,
ekran görüntüsü) ve **öneri**.

### A. Mevcut durum ve ilerleme
- Senin planın: kaç aşama var, her biri ne içeriyor, hangisi bitti, hangisi yarım, sıradaki ne.
- Son commit'lerin özeti. Yeni eklenen klasör ve dosyalar (dosya ağacı, yalnız yeni ve değişen kısım).
- `npm test` sonucu (kaç test, kaç geçti, kaçı kaldı ve neden). `npm run build` sonucu ve dosya boyutu.
- Oyunun uygulamaya (sanane-main) yerleştirilme durumu:
  - `okey-html.ts` nasıl üretildi; yamalar çift uygulandı mı?
  - Mobil testler (`test-okey-mobile.cjs`, `test-okey-101-table.cjs`) çalışıyor mu; el sonu denetimleri güncellendi mi?
  - Reklam köprüsü bağlandı mı?
- Çevrim dışı oyunda (aşama 1–3) bozulan bir şey var mı? Bir tur oyna, menü, Ödüller, Çarşı, el sonu ve
  seviye atlama ekranlarının görüntüsünü al.

### B. Mimari ve altyapı
- `wrangler.toml` / `wrangler.jsonc` içeriği. Gizli değerleri çıkarıp sadece yapıyı göster:
  Worker'lar, DO sınıfları, migrations, D1 bağlamaları, KV, Cron, ortamlar (dev/staging/prod).
- Bölüm 1'deki 9 mimari ilkenin her biri için `UYGULANMIŞ` / `KISMEN` / `UYGULANMAMIŞ` ve kanıt.
- D1 şeması: tablolar, sütunlar, indeksler, ilişkiler. Eksik indeks yüzünden tam tablo taraması yapan sorgular var mı?
- Supabase kullanımı:
  - Yalnız Auth mı? Veritabanı tablosu, Realtime, Storage ya da Edge Function kullanılıyor mu?
  - RLS durumu. Hangi giriş yöntemleri var (misafir, e-posta, Google, Apple)?
- Ortam değişkenlerinin ve secret'ların listesi (yalnız isimleri). Hangisi nerede tanımlı?
- CORS, rate limit, istek boyutu sınırları.
- İstemci ↔ sunucu protokolü: mesaj türleri listesi, örnek bir mesaj, tam durum mu yoksa değişiklik mi gönderiliyor,
  sürüm alanı var mı.

### C. Maliyet (en önemli bölümlerden biri)
- **Ölçüm:** Yerelde 4 istemciyle (ya da 1 insan + 3 bot) eksiksiz bir maç oynat. Şunları ÖLÇ:
  - Worker istek sayısı
  - DO'ya gelen WebSocket mesajı sayısı
  - DO'nun uyanık kaldığı süre
  - D1 okunan ve yazılan satır sayısı
  - Ping/heartbeat sıklığı
  - Maç başına ortalama mesaj boyutu
- Bu ölçümlerle üç senaryo için aylık tahmin tablosu çıkar:
  - 10 arkadaş test (ücretsiz plan)
  - Günde 500 maç (5 $ plan)
  - Günde 5.000 maç
  Her kalemde planın dahil kotası, tahmini kullanım ve ek ücret yazılsın. Kullandığın fiyat ve kota değerlerini ve
  kaynaklarını belirt; güncel olduğundan emin değilsen işaretle.
- İlk hangi kota dolar? Ücretsiz planda kota dolunca oyuncu ne görür (hata ekranı mı, sessiz donma mı)?
- Ücretsiz planın işlemci süresi sınırına (istek başına yaklaşık 10 ms) takılma riski olan kod: sunucuda bot hesabı,
  çözücü, büyük JSON işleme. Ölç.
- **Ücretliye geçiş:** Tam olarak ne değişmeli? Hedef: hiçbir şey ya da tek bir ayar. Bugünkü durumu ve
  gerekiyorsa yapılacak değişikliği yaz.
- **Maliyet koruması:**
  - Azami oda sayısı, azami eş zamanlı oyuncu, kişi başı istek sınırı.
  - Acil kapatma anahtarı (kill switch).
  - Kota uyarısı. Hangileri var, hangileri eksik?
- **Gizli maliyet avı:** Kontrolsüz büyüyebilecek her şeyi listele:
  - log hacmi
  - sık ping
  - her hamlede D1 yazımı
  - sıralamanın her istekte yeniden hesaplanması
  - push bildirim servisi
  - görsel ya da dosya depolama
  - Supabase egress
  - üçüncü parti servisler
- Supabase: aylık aktif kullanıcı (MAU) ve egress açısından ücretsiz planda kalır mı?

### D. Gecikme ve ağ dayanıklılığı
- Bir hamlenin gidip gelme süresi (yerelde ölç; canlı için tahmin et).
- Hamle istemcide hemen oynatılıp sunucu onayı arkadan mı geliyor? Reddedilen hamle nasıl geri alınıyor?
- Bağlantı kopması ve yeniden bağlanma:
  - Otomatik mi; deneme aralığı ne?
  - Yeniden bağlanınca durum nasıl eşitleniyor?
  - Mesaj sıra numarası var mı?
- Mobil durumlar:
  - uygulama arka plana atıldı / öne geldi
  - Wi-Fi'den 4G'ye geçiş
  - telefon çağrısı
  - ekran kilidi
  - çok yavaş (2G/3G) ağ
- Süre sayacının otoritesi sunucuda mı? İstemci saatine güveniliyor mu?

### E. Oda motoru ve oyun akışı: senaryo tablosu
Aşağıdaki her senaryo için tabloya şunları yaz: **beklenen davranış**, **şu anki davranış**, **kanıt**, **risk**, **öneri**.
Mümkün olanları yerelde gerçekten dene.

1. Oda kurma: açık / özel oda, şifreli oda, kurallar (Klasik/101, el sayısı, masa çipi, süre).
2. Oda paylaşma:
   - kod ve link
   - WhatsApp paylaşımı
   - linke tıklayınca uygulama yüklüyse odaya derin bağlantı, yüklü değilse ne olur
3. Açık odalar listesi:
   - filtreler (mod, çip seviyesi, boş koltuk)
   - canlı güncelleme yöntemi ve maliyeti
   - boş liste durumu
4. Hızlı oyun / otomatik eşleştirme. Seviye ya da çip denkliği var mı?
5. Odaya girme: dolu oda, kapanmış oda, yetersiz çip, banlı oyuncu, eski uygulama sürümü.
6. Koltuk, hazır olma ve başlatma: kaç kişiyle başlar? Boş koltuklara bot oturur mu? Oda sahibi ayrılırsa sahiplik devri.
7. **Oyun sırasında oyuncu bilerek çıkarsa:**
   - Yerine bot oturuyor mu?
   - Terk cezası var mı (çip, XP, terk oranı)?
   - Diğer oyunculara ne gösteriliyor?
8. **Bağlantı koparsa:**
   - Kısa kopmada (10 sn) ve uzun kopmada (2 dk) ne oluyor?
   - Bot devralıyor mu? Geri dönünce koltuğunu alıyor mu?
9. **Sıra süresi dolarsa:** Otomatik hamle ne (en iyi, rastgele, son çekilen taş)? Üst üste süre aşımında ne olur?
10. Herkes ayrılırsa: oda kapanışı, boş masaların temizliği, açık kalan "hayalet" oda var mı?
11. **Sunucu hatası:**
    - DO yeniden başlarsa ya da deploy sırasında süren maç kurtarılıyor mu?
    - Çip kaybı ya da çift ödeme oluyor mu?
12. Aynı hamle iki kez gelirse (çift dokunma, yeniden gönderim) tekrar işleniyor mu (idempotency)? Sırası olmayan hamle?
    Bozuk mesaj?
13. Aynı hesap iki cihazdan aynı anda bağlanırsa ne olur?
14. Hile denemeleri:
    - başkasının elini görme
    - geçersiz taş gönderme
    - sahte okey ya da sahte el bitirme
    - mesaj yağdırma (flood)
    - çoklu hesapla çip kasma
    - aynı masada anlaşmalı oynama
15. El sonu ve maç sonu:
    - Tüm istemciler aynı sonucu mu görüyor?
    - XP ve çip sunucuda mı hesaplanıyor?
    - Sonraki ele geçiş
16. 101 Okey'e özgü çevrim içi durumlar: açma barajı, işlek taş, ceza puanları.
17. Bakım modu başlarken süren maçlar ne oluyor?

### F. Çip ekonomisi
- Çip kazanma yolları (var/yok):
  - ilk kayıt hediyesi
  - günlük giriş ödülü ve serisi
  - maç kazanma
  - görevler
  - seviye ödülleri
  - ödüllü reklam
  - turnuva
  - davet ödülü
  - iflas yardımı (çip sıfırlanınca)
- Çip harcama yolları:
  - masa girişi / bahis
  - hediyeler (çay, gül, kahve vb.)
  - Çarşı kozmetikleri
  - turnuva girişi
- Sunucu otoritesi:
  - İstemci çip miktarını hiçbir koşulda belirleyemiyor mu?
  - Her çip hareketi değişmez bir **hareket defterine** (ledger) yazılıyor mu? Bakiye ve defter atomik mi?
  - Negatif bakiye mümkün mü?
- Denge: kazanç/harcama oranı, enflasyon riski. Önerilen başlangıç değerleri tablosu.
- **Gerçek parayla çip satışı** var mı ya da planlanıyor mu? Bu, hukuk ve mağaza politikası riskini değiştirir (bkz. M).

### G. İlerleme ve oyuncu verisi
- Çevrim dışı profilin (telefondaki `patisever.profile.v1`) hesaba taşınması: ilk girişte birleştirme kuralı, çakışma.
  Kötüye kullanım riski: istemci verisi sunucuya güvenilir kabul ediliyor mu?
- XP, seviye, kozmetikler, reklam sayaçları, istatistikler nerede saklanıyor (tablo adlarıyla)?
- Misafir hesap → kalıcı hesap geçişi. Cihaz değişimi. Hesap kurtarma.
- **Hesap silme:** App Store / Google Play zorunluluğu ve KVKK. Var mı, verinin tamamı siliniyor mu?
- Yedekleme ve geri yükleme (D1 Time Travel vb.).

### H. Sıralamalar
- Türler: günlük, haftalık, aylık, tüm zamanlar, arkadaşlar arası, sezon.
- Hangi ölçüye göre: çip, galibiyet, puan, ELO benzeri derece? Öneri ve gerekçe.
- Dönem kapanışı: **Türkiye saatine (UTC+3)** göre mi? Cron zamanlaması.
- Dönem sonu ödülleri. Eski dönemlerin silinmesi ya da arşivlenmesi.
- Önbellek: ilk 100 listesi nasıl ve ne sıklıkla hesaplanıyor? Oyuncunun kendi sırası nasıl bulunuyor (maliyet)?
- Hileye karşı koruma: anlaşmalı oyunla puan kasma, çoklu hesap.

### I. Sosyal özellikler
- **Masa içi sohbet:**
  - hazır mesajlar / emoji / serbest metin
  - sunucuda küfür filtresi (`src/meta/name-filter.js` yeniden kullanılabilir)
  - spam sınırı, susturma
  - şikayet ve engelleme
  - mesaj saklama süresi (KVKK)
- **Hediye gönderme (çay, gül vb.):**
  - çip fiyatları
  - masadaki animasyon kalitesi
  - kötüye kullanım (spam hediye)
  - alıcıya bildirim
- **Profil kartı** (masada oyuncuya dokununca): seviye, unvan, çerçeve, istatistikler, arkadaş ekle, şikayet, engelle.
- **Arkadaş sistemi:**
  - istek, kabul, ret, silme
  - liste, çevrim içi durumu
  - masaya davet
  - aranıp bulunma (ad / kod)
- Özel mesaj var mı? Gerekli mi? Moderasyon yükü ve maliyeti.
- **Bildirimler:** davet, sıra sende, turnuva başlıyor. Push servisi hangisi, maliyeti, izin akışı.

### J. Turnuva
- Var mı? Format önerisi: eleme ağacı ya da puan tablosu, kaç masa, kaç tur.
- Kayıt, giriş ücreti, ödül havuzu, zamanlama, yetersiz katılımda ne olur?
- Kopan oyuncu, bot doldurma, beraberlik kuralı.
- Admin panelinden oluşturma, başlatma, iptal ve iade.
- DO ve D1 maliyetine etkisi.

### K. Admin paneli (okey yönetim alanı)
- Mevcut bir admin paneli var mı (sanane-main içinde ya da ayrı)? Teknolojisi, giriş ve yetkilendirme
  (roller, iki adımlı doğrulama), işlem kaydı (audit log). Okey bölümü var mı?
- İstenen yetenekler. Her biri için `VAR` / `KISMEN` / `YOK` ve nasıl yapılacağı:
  1. **Canlı panel:**
     - aktif oyuncu, açık oda ve masa sayısı
     - günlük maç sayısı
     - hata oranı
     - Cloudflare kota kullanımı ve tahmini aylık maliyet
  2. **Bakım modu:** zamanlanmış başlangıç, oyunculara geri sayımlı duyuru, süren maçların bitmesine izin verme.
  3. **Sınırlar:** azami oda sayısı, azami eş zamanlı oyuncu, kişi başı oda sınırı, acil kapatma anahtarı.
  4. **Duyurular:** menü afişi, masa içi duyuru, zamanlanmış duyuru, hedef kitle (hepsi / belli seviye).
  5. **Turnuva yönetimi:** oluştur, başlat, durdur, iptal / iade, sonuçlar.
  6. **Oyuncu yönetimi:**
     - arama
     - profil görüntüleme
     - çip düzeltme (gerekçe zorunlu, deftere yazılır)
     - ad değiştirme
     - susturma / yasaklama (süreli)
     - şikayet kuyruğu
     - maç geçmişi
  7. **Ekonomi ayarları:**
     - ödül miktarları
     - masa girişleri
     - hediye fiyatları
     - günlük bonus
     - reklam kuralları (gerekli reklam sayısı, bekleme süresi, günlük sınır)
  8. **İçerik:**
     - Çarşı ürünleri, fiyatları, öne çıkanlar
     - etkinlik / sezon temaları
     - yeni çerçeve ve efekt açma
     - kampanyalar
  9. **Oyun ayarları:** sıra süresi, bot zorluğu, kural varyasyonları, hazır sohbet mesajları.
  10. **Özellik bayrakları (feature flags):** özellikleri koda dokunmadan aç/kapat. Basit A/B testi.
  11. **Sürüm yönetimi:** asgari uygulama sürümü, zorunlu güncelleme ekranı.
  12. **Loglar ve hatalar:** son hatalar, şüpheli hareketler (hile sinyalleri).
- Ayarlar nerede saklanmalı ve istemciye nasıl ulaşmalı? Ek maliyet olmadan: D1'de ayar tablosu, önbellekli tek bir
  "config" uç noktası, sürüm numarasıyla önbellek geçersizleştirme. Bugünkü durumu yaz.
- Admin paneli tasarımı da premium olmalı: aynı tasarım dili, hızlı, net. Eksik ekranları listele.
- **Güvenlik:** Admin uç noktaları oyuncu uç noktalarından ayrı mı, rol kontrolü sunucuda mı?

### L. Ekran envanteri (tasarım ve kullanıcı deneyimi)
Aşağıdaki her ekran ya da durum için yaz: `VAR` / `KISMEN` / `YOK`, ekran görüntüsü (varsa), kalite notu (1–10) ve
eksikler. Yatay küçük telefon (568×320) ve büyük telefonda (932×430) dene.

1. **Lobi ve oda akışı:**
   - çevrim içi lobi / ana giriş
   - açık odalar listesi
   - oda kurma
   - oda içi bekleme (koltuklar, hazır, davet)
   - davet kabul
   - oda paylaşma sayfası
2. **Bağlantı ve sistem durumları:**
   - bağlanıyor / yeniden bağlanıyor
   - bağlantı koptu
   - oyuncu ayrıldı, yerine bot geçti
   - sunucu bakımda
   - sürüm eski, güncelleme gerekli
   - kota doldu / servis geçici olarak kullanılamıyor
3. **Sosyal ekranlar:**
   - oyuncu profil kartı
   - arkadaşlar listesi ve istekler
   - sohbet paneli
   - hediye seçimi ve hediye animasyonu
   - bildirimler kutusu
4. **Rekabet ekranları:** sıralamalar (günlük/haftalık/aylık), turnuva listesi, turnuva ağacı, turnuva sonucu.
5. **Ekonomi ekranları:** çip cüzdanı, hareket geçmişi, günlük ödül, iflas yardımı.
6. **Hesap ekranları:**
   - giriş / kayıt, misafir girişi
   - hesap ayarları, hesap silme
   - yasaklandın / susturuldun bildirimi
7. **Her liste ve akış için:** boş, yükleniyor ve hata durumları.
8. **Tutarlılık:** Mevcut tasarım diliyle uyum, güvenli alanlar (çentik), büyük yazı tipi ayarı, düşük donanımlı
   telefonda akıcılık.

### M. Oyuncu psikolojisi, bağlılık ve rakiplerden ayrışma
- **İlk deneyim:** İlk 5 dakika, ilk çevrim içi maç ve ilk kayıp nasıl hissettiriyor? Yeni oyuncu nerede bırakıp gidiyor
  (tahmini terk noktaları)?
- **Bekleme boşlukları:** Eşleşme beklerken, sıra beklerken, el sonunda ne oluyor? Sıkıntı anlarını listele.
- **Sağlıklı bağlılık mekanikleri:** Var olanlar ve önerilenler.
  - günlük seri, görevler, sezonlar, koleksiyon
  - sosyal bağ (arkadaşla oynama, aynı masaya dönme)
  - adil eşleşme
  - kayıptan sonra moral (teselli ödülü)
  - ustalık hissi (istatistik, rozet)
- **Rakip analizi:** Türkiye'deki popüler çevrim içi okey oyunları. Tasarım, oynanış, ekonomi ve sosyal özellikler
  açısından güçlü ve zayıf yanları. Oyuncuların en çok şikâyet ettiği konular (mağaza yorumlarından örnek temalar).
- **"Okeye yeni bir deneyim":** En az 12 özgün fikir. Her biri için: ne olduğu, neden fark yaratır, efor (S/M/L),
  Cloudflare maliyet etkisi. Düşünülebilecek alanlar:
  - kahvehane atmosferi ve sezonlar
  - el tekrarları ve "günün eli"
  - arkadaş grupları ve masa geleneği
  - koleksiyon setleri
  - akıllı ipucu (öğrenme modu)
  - izleyici modu
  - takım okeyi
  - günlük bulmaca eli
- **Etik sınırlar ve riskler (zorunlu bölüm).** Hukuki tavsiye değil, risk listesi olarak yaz:
  - Bağımlılık yaratan karanlık örüntüler (dark patterns) kullanılmamalı: kayıp kovalatma, zorla bekletip para isteme,
    yanıltıcı sayaçlar. Mevcut ve planlanan özelliklerde bu riskler var mı?
  - Çip gerçek parayla satılırsa ve kazanılan çip paraya dönüşebilirse kumar sayılma riski. Türkiye mevzuatı
    (7258 sayılı Kanun) ve App Store / Google Play "simüle kumar" kuralları, yaş sınırı.
  - Çocuk kullanıcılar ve KVKK (aydınlatma metni, açık rıza, veri saklama süreleri).
  - Oyun süresi sağlığı (mola hatırlatma vb.) öneri olarak.

### N. Güvenlik ve gizlilik
- Depoda gizli bilgi taraması. Yalnız dosya yolunu yaz, değeri yazma.
  `.env` ve `.dev.vars` dosyaları `.gitignore` içinde mi?
- `service_role` anahtarı herhangi bir yerde kullanılıyor mu?
- Her uç noktada girdi doğrulaması, yetki kontrolü, hız sınırı.
- Sohbet ve ad moderasyonu sunucuda mı?
- Kişisel veri: hangi veriler toplanıyor, nerede saklanıyor, ne kadar süre? Loglarda kişisel veri var mı?

### O. Hatalar ve acil durumlar
- Bulduğun her hata: adım adım yeniden üretme, beklenen ve gerçekleşen davranış, önem derecesi.
- Konsol hataları, çökme, bellek sızıntısı (uzun oturumda), düşük donanımlı telefonda takılma.
- **P0 listesi:** Canlıya çıkmadan mutlaka düzeltilmesi gerekenler.
- **Acil durum planı:**
  - sunucu çökerse
  - maliyet beklenmedik yükselirse
  - hileli çip dağılırsa
  - kötü bir deploy olursa (geri alma)

### P. Test ve operasyon
- Çevrim içi kod için otomatik test var mı (4 istemci simülasyonu, kopma, süre aşımı)? Kapsam.
- Yük testi planı. Yerelde güvenle nasıl yapılır?
- İzleme ve uyarı: Cloudflare analitik / loglar (ücretsiz seçenekler), hata bildirimi.
- Ortamlar: geliştirme / test / canlı ayrımı. Ücretsiz planda iki ortam mümkün mü?
- Deploy süreci ve geri alma. Veritabanı migration süreci.

---

## 3. Rapor biçimi (`docs/ANALIZ_RAPORU.md`)

Raporu başka bir yapay zekâ okuyacak. Düzenli, kısa cümleli ve kanıtlı yaz. Teknik terimleri orijinal hâliyle kullan.
Dil Türkçe.

1. **Yönetici özeti:** En önemli 10 bulgu, tek cümle hâlinde.
2. **Genel durum tablosu:** Bölüm 2'deki her başlık (A–P) için durum, P0/P1/P2/P3 bulgu sayısı ve tek cümlelik özet.
3. **Maliyet tablosu:** Üç senaryo × her kalem (ölçülen değerler, varsayımlar, kaynaklar).
   Ücretsiz plandan ücretliye geçişte yapılacaklar.
4. **Mimari ilkeler denetimi:** 9 ilke × uygulanmış mı × kanıt.
5. **Senaryo tablosu (E):** 17 senaryo × beklenen / şu anki / risk / öneri.
6. **Ekran envanteri (L):** Ekran × durum × kalite puanı × eksikler × ekran görüntüsü yolu.
7. **Admin paneli boşluk tablosu (K):** Yetenek × durum × öneri × efor.
8. **Bulgular:** Her biri aşağıdaki biçimde, önem sırasına göre:

   ```
   ### ODA-03 — Oyuncu ayrılınca yerine bot oturmuyor
   - Önem: P0 (canlı öncesi şart) | P1 (önemli) | P2 (iyileştirme) | P3 (fikir)
   - Alan: E. Oda motoru
   - Durum: YOK
   - Kanıt: server/table.ts:212 — leave() koltuğu boşaltıyor, bot atamıyor. Yerel denemede maç kilitlendi (ss: analiz-ss/oda-03.png)
   - Etki: Kalan 3 oyuncu sonsuza kadar bekliyor.
   - Öneri: leave() ve kopma zaman aşımında koltuğu BotSeat'e devret; geri dönen oyuncuya koltuğu geri ver.
   - Efor: S | M | L
   - Maliyet etkisi: Yok | Düşük | Orta | Yüksek (açıkla)
   ```

   Alan önekleri: `DURUM`, `MIMARI`, `MALIYET`, `AG`, `ODA`, `EKONOMI`, `VERI`, `SIRA`, `SOSYAL`, `TURNUVA`, `ADMIN`,
   `EKRAN`, `PSIKO`, `GUVENLIK`, `HATA`, `TEST`.
9. **Fikirler (M):** En az 12 öneri. Tablo hâlinde: fikir, fark, efor, maliyet.
10. **Sahibine sorulacak kararlar:** Numaralı liste. Her soruda seçenekler, senin önerin ve gerekçesi. Örnekler:
    - Gerçek parayla çip satılacak mı?
    - Serbest metin sohbet mi, yalnız hazır mesaj mı?
    - Sıralama hangi ölçüye göre olacak?
    - Turnuva giriş ücreti çipli mi?
11. **Önerilen faz planı:** Bulguları bağımlılık sırasına göre fazlara böl. Her faz için hedef, kapsam (bulgu ID'leri),
    tahmini efor, kabul ölçütü. P0'lar ilk fazda olmalı.
12. **Ekler:** Çalıştırılan komutlar ve özet çıktıları, dosya ağacı, ölçüm betiklerinin yolu.

Raporu yazdıktan sonra baştan sona bir kez daha oku. Bölüm 2'deki her maddenin raporda karşılığı var mı, kontrol et.
Eksik madde bırakma.
