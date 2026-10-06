# Parça 3 — Çevrim içi altyapı, oda motoru, gecikme, maliyet ve güvenlik

Önce `docs/analiz/00_ORTAK_KURALLAR.md` dosyasını oku. Çıktı: `docs/analiz/RAPOR_03.md`, ekran görüntüleri: `docs/analiz/ss/03/`.
Rapor öneki: `MIMARI`, `MALIYET`, `AG`, `ODA`, `GUVENLIK`, `TEST`, `ACIL`.

---

## Hedefler (kesin)

- **Test aşaması:** Cloudflare **ücretsiz planı** (10 arkadaşla oynama).
- **Canlı:** Cloudflare **Workers Paid (5 $/ay)**. Günde yaklaşık 500 maç (ayda yaklaşık 15.000) ile
  **toplam ayda yaklaşık 5 $**.
- **Ücretsizden ücretliye geçiş kod değişikliği gerektirmemeli.** En fazla bir ayar ya da ortam değişkeni değişmeli.
- **Supabase yalnız giriş için kullanılacak.** Fazladan Supabase maliyeti olmayacak.
- Kontrolsüz büyüyebilecek gizli bir maliyet kalmamalı.
- Gecikme: hamle hissi anlık olmalı. Oyuncular Türkiye'de.

## Önceden kararlaştırılan 9 mimari ilke

Her biri için `UYGULANMIŞ` / `KISMEN` / `UYGULANMAMIŞ` yaz ve kanıt göster.

1. Durable Object'ler **SQLite depolu** (`new_sqlite_classes`). Ücretsiz planda başka türü çalışmaz.
2. **WebSocket Hibernation API** (`state.acceptWebSocket`) kullanılıyor, `ws.accept()` değil.
3. DO içinde zamanlama için `setTimeout` / `setInterval` yerine **DO alarmları** kullanılıyor.
4. **Shard yapısı:** Her masa ayrı bir DO değil. Bir DO içinde 100'e kadar masa yaşıyor
   (çalışma süresi ücreti DO başına yazar).
5. Masalar Türkiye'ye yakın: `locationHint: "eeur"`.
6. Supabase JWT, Worker içinde **önbellekteki JWKS ile yerel** doğrulanıyor; her istekte Supabase'e gidilmiyor.
7. Canlı masa durumu DO deposunda. D1'e yalnız kalıcı veriler yazılıyor: maç sonucu, çip hareketi, XP, sıralama, sosyal.
8. Her oyuncuya yalnız kendi eli gönderiliyor. Hamle, süre, XP ve çip **sunucuda** doğrulanıp hesaplanıyor.
9. Supabase `service_role` anahtarı hiçbir yerde kullanılmıyor.

---

## 3.1 Mevcut durum

- Senin planın: kaç aşama var, hangisi bitti, hangisi yarım, sıradaki ne. Son commit'lerin özeti.
- Yeni eklenen sunucu ve istemci dosyalarının ağacı.
- Testler ve derleme sonucu.
- Oyunun uygulamaya (sanane-main) yerleştirilme durumu:
  - `okey-html.ts` yamaları çift uygulandı mı?
  - Mobil testler güncellendi mi?
  - Reklam köprüsü bağlandı mı?

## 3.2 Mimari

- `wrangler` yapılandırmasının yapısı. Gizli değerleri yazma; şunları göster:
  - Worker'lar ve DO sınıfları
  - migrations
  - D1, KV ve Cron bağlamaları
  - ortamlar (dev / staging / prod)
- D1 şeması:
  - tablolar, sütunlar ve indeksler
  - eksik indeks yüzünden tam tablo tarayan sorgu var mı?
- Supabase kullanımı:
  - Yalnız Auth mı? Veritabanı tablosu, Realtime, Storage ya da Edge Function kullanılıyor mu?
  - RLS durumu.
  - Giriş yöntemleri: misafir, e-posta, Google, Apple.
- Ortam değişkenleri ve secret'lar: yalnız isimleri ve nerede tanımlı oldukları.
- İstemci ↔ sunucu protokolü:
  - mesaj türlerinin listesi
  - örnek mesaj
  - tam durum mu, değişiklik mi gönderiliyor
  - sürüm alanı ve sıra numarası var mı
- **Kural motoru aynı mı?** Sunucu `src/game/` kural motorunu aynen mi kullanıyor? Çevrim dışı ile çevrim içi arasında
  kural farkı var mı? Kural ayarları (Parça 1) odaya nasıl taşınıyor?

## 3.3 Maliyet (en önemli bölüm)

- **Ölçüm.** Yerelde 4 istemciyle (ya da 1 insan + 3 bot) eksiksiz bir klasik ve bir 101 maçı oynat. Şunları ÖLÇ:
  - Worker istek sayısı
  - WebSocket mesajı sayısı (gelen / giden)
  - DO'nun uyanık kaldığı süre
  - D1 okunan ve yazılan satır sayısı
  - ping / heartbeat sıklığı
  - ortalama mesaj boyutu
- **Aylık tahmin tablosu**, üç senaryo için:
  - 10 arkadaş test (ücretsiz plan)
  - günde 500 maç (5 $ plan)
  - günde 5.000 maç

  Her kalemde planın dahil kotası, tahmini kullanım ve ek ücret yazılsın. Kullandığın fiyat ve kotaları ve
  kaynaklarını belirt; güncelliğinden emin değilsen işaretle.
- **Ücretsiz plan riskleri:**
  - İlk hangi kota dolar?
  - Kota dolunca oyuncu ne görür: anlaşılır bir ekran mı, donma mı?
  - İstek başına yaklaşık 10 ms işlemci sınırına takılma riski var mı (sunucuda bot hesabı, çözücü, büyük JSON)?
    Ölç.
- **Ücretliye geçiş:** Tam olarak ne değişmeli? Bugünkü durum ve gerekiyorsa değişiklik önerisi.
- **Maliyet koruması:**
  - azami oda sayısı
  - azami eş zamanlı oyuncu
  - kişi başı istek sınırı
  - acil kapatma anahtarı
  - kota uyarısı
- **Gizli maliyet avı:**
  - log hacmi
  - sık ping
  - her hamlede D1 yazımı
  - her istekte sıralama hesabı
  - açık oda listesinin canlı güncellenmesi
  - push bildirim servisi
  - görsel ya da dosya depolama
  - Supabase MAU ve egress
  - üçüncü parti servisler

## 3.4 Gecikme ve ağ dayanıklılığı

- Bir hamlenin gidip gelme süresi (yerelde ölç, canlı için tahmin et).
- Hamle istemcide hemen oynatılıp sunucu onayı arkadan mı geliyor? Reddedilen hamle nasıl geri alınıyor?
- **Bağlantı kopması:**
  - Otomatik yeniden bağlanma ve deneme aralığı.
  - Yeniden bağlanınca durum eşitleme.
  - Kaçırılan mesajlar.
- **Mobil durumlar:**
  - arka plana atma / öne gelme
  - Wi-Fi'den 4G'ye geçiş
  - telefon çağrısı
  - ekran kilidi
  - çok yavaş ağ (ağ yavaşlatmayla dene)
- **Süre:** Sayacın otoritesi sunucuda mı? İstemci saatine güveniliyor mu?

## 3.5 Oda motoru ve lobi: senaryo tablosu

Her senaryo için şunları yaz: **beklenen**, **şu anki davranış**, **kanıt**, **risk**, **öneri**.
Mümkün olanları yerelde gerçekten dene.

1. **Oda kurma:**
   - açık / özel / şifreli oda
   - kural seçimi (mod, el sayısı, başlangıç puanı, katlamalı, eşli, masa çipi, süre)
   - Kurallar odaya girenlere görünüyor mu?
2. **Oda paylaşma:**
   - kod ve link
   - WhatsApp paylaşımı
   - linke tıklayınca uygulama yüklüyse odaya doğrudan geçiş (derin bağlantı)
   - uygulama yüklü değilse ne oluyor
3. **Açık odalar listesi:**
   - filtreler (mod, çip, boş koltuk)
   - güncelleme yöntemi ve maliyeti
   - boş liste durumu
   - dolu odaya girme denemesi
4. **Hızlı oyun / otomatik eşleştirme:** Seviye ve çip denkliği var mı? Bekleme süresi uzarsa ne oluyor
   (bot doldurma?)
5. **Odaya giriş engelleri:**
   - dolu oda
   - kapanmış oda
   - yetersiz çip
   - yasaklı oyuncu
   - eski uygulama sürümü
6. **Bekleme odası:**
   - koltuklar ve hazır olma
   - kaç kişiyle başlar
   - boş koltuğa bot
   - oda sahibi ayrılırsa sahiplik devri
   - oda sahibinin oyuncu atması
7. **Oyuncu bilerek çıkarsa:**
   - Yerine bot oturuyor mu?
   - Terk cezası (çip, XP, terk oranı) var mı?
   - Diğerlerine ne gösteriliyor?
8. **Bağlantı koparsa:**
   - Kısa kopmada (10 sn) ve uzun kopmada (2 dk) ne oluyor?
   - Bot devralıyor mu?
   - Geri dönen koltuğunu alıyor mu?
9. **Sıra süresi dolarsa:**
   - Otomatik hamle ne?
   - Üst üste süre aşımı → bot.
10. **Herkes ayrılırsa:** Oda kapanışı. Hayalet oda ya da masa kalıyor mu?
11. **Sunucu hatası:**
    - DO yeniden başlarsa ya da deploy sırasında süren maç kurtarılıyor mu?
    - Çip kaybı ya da çift ödeme oluyor mu?
12. **Mesaj sorunları:**
    - Aynı hamle iki kez gelirse tekrar işleniyor mu (idempotency)?
    - Sıra dışı hamle.
    - Bozuk mesaj.
    - Eski sürüm istemci.
13. **Aynı hesap iki cihazda:** Ne oluyor?
14. **Hile denemeleri:**
    - başkasının elini görme (ağ trafiğini incele)
    - geçersiz taş
    - sahte bitiş
    - mesaj yağdırma (flood)
    - çoklu hesapla çip kasma
    - anlaşmalı oynama
15. **El ve maç sonu senkronu:**
    - Tüm istemciler aynı sonucu görüyor mu?
    - XP ve çip sunucuda mı?
16. **101'e özgü çevrim içi durumlar:**
    - açma
    - işleme
    - okey geri alma
    - cezaların herkese bildirilmesi
17. **Bakım modu başlarken süren maçlar ne oluyor?**

## 3.6 Güvenlik ve gizlilik

- Depoda gizli bilgi taraması: yalnız dosya yolunu yaz. `.env` ve `.dev.vars` dosyaları `.gitignore` içinde mi?
- `service_role` kullanımı.
- Her uç noktada girdi doğrulaması, yetki kontrolü ve hız sınırı.
- Admin uç noktaları oyuncu uç noktalarından ayrı mı?
- Kişisel veri:
  - Hangi veriler toplanıyor, nerede saklanıyor, ne kadar süre?
  - Loglarda kişisel veri var mı?
  - KVKK aydınlatma metni.

## 3.7 Test, operasyon ve acil durumlar

- **Çevrim içi otomatik testler:** 4 istemci benzetimi, kopma, süre aşımı, yeniden bağlanma. Kapsam ne kadar?
- Yerelde güvenli bir yük testi planı.
- **İzleme ve uyarı:** ücretsiz seçenekler (Cloudflare analitik, loglar).
- **Ortamlar:** geliştirme / test / canlı ayrımı. Ücretsiz planda iki ortam mümkün mü?
- Deploy, geri alma ve veritabanı migration süreci.
- **Acil durum planı:**
  - sunucu çökerse
  - maliyet beklenmedik yükselirse
  - hileli çip dağılırsa
  - kötü bir deploy olursa
- **P0 listesi:** Canlıya çıkmadan mutlaka düzeltilmesi gerekenler.
