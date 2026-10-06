# Parça 4 — Çip ekonomisi, ilerleme, sıralamalar, sosyal özellikler ve turnuva

Önce `docs/analiz/00_ORTAK_KURALLAR.md` dosyasını oku. Çıktı: `docs/analiz/RAPOR_04.md`, ekran görüntüleri: `docs/analiz/ss/04/`.
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
