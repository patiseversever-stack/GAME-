# Parça 4 — Çip ekonomisi, ilerleme, sıralamalar, sosyal özellikler ve turnuva

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

Çıktı: `docs/analiz/RAPOR_04.md`, ekran görüntüleri: `docs/analiz/ss/04/`.
Rapor öneki: `EKONOMI`, `VERI`, `SIRA`, `SOSYAL`, `TURNUVA`.

Her konuda üç soruyu cevapla:
- **Var mı?** (`VAR` / `KISMEN` / `YOK`)
- **Veri nerede saklanıyor?** Tablo adlarıyla: D1, DO deposu, telefon hafızası ya da Supabase.
- **Sunucu mu karar veriyor?** İstemcinin gönderdiği değere güveniliyorsa bu bir hata sayılır.

Hedef mimari:
- Kalıcı veriler Cloudflare D1'de.
- Canlı masa durumu DO deposunda.
- Supabase yalnız giriş için.
- Ek maliyet yok.

---

## 4.1 Çip ekonomisi

- **Kazanma yolları:**
  - ilk kayıt hediyesi
  - günlük giriş ödülü ve serisi
  - maç ve el kazanma
  - görevler
  - seviye ödülleri
  - ödüllü reklam
  - turnuva
  - davet ödülü
  - iflas yardımı (çip bitince)
- **Harcama yolları:**
  - masa girişi / bahis
  - hediyeler (çay, gül, kahve vb.)
  - Çarşı kozmetikleri (şu an "yakında")
  - turnuva girişi
- **Güvenlik:**
  - Her çip hareketi değişmez bir **hareket defterine** (ledger) yazılıyor mu?
  - Bakiye ve defter tek işlemde (atomik) mi güncelleniyor?
  - Negatif bakiye mümkün mü?
  - Çift ödeme (aynı maç iki kez ödenirse) engelleniyor mu?
  - İade mekanizması var mı?
- **Denge:**
  - Kazanç / harcama oranı ve enflasyon riski.
  - Masa seviyeleri (düşük / orta / yüksek çip).
  - Önerilen başlangıç değerleri tablosu.
- **Gerçek parayla çip:** Satılıyor mu, planlanıyor mu? Not et; hukuki risk Parça 6'da ele alınacak.

## 4.2 İlerleme ve oyuncu verisi

- **Telefondaki profilin hesaba taşınması:** Telefondaki `patisever.profile.v1` profili (XP, seviye, kozmetikler,
  reklam sayaçları, istatistikler) hesaba nasıl taşınıyor?
  - İlk girişte birleştirme kuralı ne?
  - İki cihazda farklı ilerleme varsa ne oluyor?
  - **Hile riski:** Telefondan gelen XP ya da çip değerine körü körüne güveniliyor mu? Önerilen kural: yalnız kozmetik
    ve istatistik taşınır, çip ve XP sınırlandırılır.
- Çevrim içi maçlarda XP ve görev ilerlemesi sunucuda mı hesaplanıyor?
- Misafir hesaptan kalıcı hesaba geçiş. Cihaz değişimi. Hesap kurtarma.
- **Hesap silme:** App Store ve Google Play zorunluluğu, KVKK. Var mı? Tüm veri siliniyor mu (D1, Supabase, loglar)?
- Yedekleme (D1 Time Travel vb.) ve geri yükleme.

## 4.3 Sıralamalar

- **Türler:** günlük, haftalık, aylık, tüm zamanlar, arkadaşlar arası, sezon.
- **Ölçü:** Çip mi, galibiyet mi, puan mı, derece (ELO benzeri) mi? Öneri ve gerekçe.
  Okeyde şansın payı yüksek; adil bir ölçü öner.
- **Dönem kapanışı:**
  - Türkiye saatine (UTC+3) göre mi?
  - Cron zamanlaması.
  - Dönem sonu ödülleri.
  - Eski dönemlerin silinmesi.
- **Maliyet:**
  - İlk 100 listesi nasıl ve ne sıklıkla hesaplanıyor?
  - Oyuncunun kendi sırası nasıl bulunuyor?
  - Her istekte yeniden hesaplama var mı?
- **Hileye karşı:** anlaşmalı oyun, çoklu hesap, olağan dışı kazanç tespiti.
- **Ekranlar:** sekmeler, oyuncunun kendi sırası, ödül gösterimi, boş durum.

## 4.4 Sosyal özellikler

- **Masa içi sohbet:**
  - hazır mesajlar / emoji / serbest metin (hangisi var?)
  - sunucuda küfür filtresi (`src/meta/name-filter.js` içindeki `findBlocked` yeniden kullanılabilir)
  - spam sınırı
  - susturma
  - şikayet ve engelleme
  - mesaj saklama süresi (KVKK)
  - Sohbet balonlarının masadaki yeri: taşları kapatıyor mu?
- **Hediye gönderme (çay, gül, kahve vb.):**
  - çip fiyatları
  - masadaki animasyon kalitesi (premium mu?)
  - spam hediye sınırı
  - alıcıya bildirim
  - hediye geçmişi
- **Profil kartı** (masada bir oyuncuya dokununca):
  - seviye, unvan, çerçeve
  - istatistikler
  - arkadaş ekle, şikayet et, engelle
  - Tasarımı ve hızı.
- **Arkadaş sistemi:**
  - istek, kabul, ret, silme
  - liste ve çevrim içi durumu
  - masaya davet
  - ad ya da kodla arama
- **Özel mesaj:** Var mı, gerekli mi? Moderasyon yükü ve maliyeti.
- **Bildirimler** (davet, sıra sende, turnuva başlıyor):
  - push servisi hangisi
  - maliyeti
  - izin akışı
  - uygulama kapalıyken davet
- **Şikayet ve engelleme akışı:** Şikayetler nereye gidiyor (admin kuyruğu — Parça 5)?

## 4.5 Turnuva

- Var mı? Yoksa bir format öner:
  - eleme ağacı ya da puan tablosu
  - masa ve tur sayısı
  - süre
- **Akış:**
  - kayıt
  - giriş ücreti (çip)
  - ödül havuzu
  - zamanlama
  - yetersiz katılım
  - kopan oyuncu
  - bot doldurma
  - eşitlik kuralı
- **Admin tarafı:** oluşturma, başlatma, iptal ve iade (Parça 5 ile bağlantı).
- **Ekranlar:** turnuva listesi, kayıt, ağaç / tablo, canlı durum, sonuç, ödül.
- DO ve D1 maliyetine etkisi.

## 4.6 Ek: senin bulacakların

Ekonomi ve sosyal tarafta bizim sormadığımız her şeyi ara. Örnekler:
- kulüp / kahvehane grupları
- "aynı masada tekrar oyna" davranışı
- son oynadıklarım listesi
- sezon geçişi
- hediye istatistikleri
