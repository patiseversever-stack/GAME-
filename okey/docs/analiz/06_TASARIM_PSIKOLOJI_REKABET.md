# Parça 6 — Ekran envanteri, oyuncu psikolojisi, rakipler, etik / hukuk ve son tarama

Önce `docs/analiz/00_ORTAK_KURALLAR.md` dosyasını oku. Çıktı: `docs/analiz/RAPOR_06.md`, ekran görüntüleri: `docs/analiz/ss/06/`.
Rapor öneki: `EKRAN`, `PSIKO`, `RAKIP`, `FIKIR`, `ETIK`, `HATA`.

Bu son parçadır. Önceki parçalar düzeltildikten sonra yapılır. Hem yeni konuları inceler hem de **genel son kontrol** yapar.

---

## 6.1 Ekran envanteri

Her ekran ya da durum için yaz:
- durum (`VAR` / `KISMEN` / `YOK`)
- ekran görüntüsü (568×320 ve 932×430)
- kalite puanı (1–10)
- eksikler

1. **Giriş ve başlangıç:**
   - açılış
   - ad ve avatar
   - giriş / kayıt, misafir girişi
   - nasıl oynanır / öğretici (klasik ve 101 ayrı)
2. **Ana menü:** menü, profil merkezi, Ödüller, Çarşı, ayarlar.
3. **Mod ve kural seçimi:** çevrim dışı ve çevrim içi.
4. **Çevrim içi lobi:**
   - açık odalar
   - oda kurma
   - bekleme odası
   - davet kabul
   - oda paylaşma
   - hızlı oyun bekleme
5. **Masa durumları:**
   - oyun masası (klasik, 101)
   - oyun içi skor tablosu
   - duraklatma
   - sohbet
   - hediye
   - profil kartı
6. **El ve maç sonu:** el sonu (2 sayfa), maç sonu, seviye atlama.
7. **Bağlantı ve sistem durumları:**
   - bağlanıyor / yeniden bağlanıyor
   - bağlantı koptu
   - oyuncu ayrıldı, yerine bot geçti
   - bakımda
   - sürüm eski
   - servis geçici olarak kullanılamıyor
8. **Sosyal:** arkadaşlar, istekler, bildirimler kutusu.
9. **Rekabet:** sıralamalar, turnuva listesi, ağaç ve sonuç.
10. **Ekonomi:** çip cüzdanı, hareket geçmişi, günlük ödül, iflas yardımı.
11. **Hesap:** hesap ayarları, hesap silme, yasaklandın / susturuldun bildirimi.
12. **Her liste ve akış için:** boş, yükleniyor ve hata durumları.

Tutarlılık kontrolü:
- Tasarım dili her yerde aynı mı?
- Yazı tipleri ve boşluklar tutarlı mı?
- Geri / kapat butonları hep aynı yerde mi?
- Animasyon dili tutarlı mı?

## 6.2 Oyuncu psikolojisi ve bağlılık

- **İlk deneyim:**
  - İlk 5 dakika, ilk çevrim içi maç ve ilk kayıp nasıl hissettiriyor?
  - Yeni oyuncu nerede bırakıp gidebilir? Tahmini terk noktalarını listele.
- **Bekleme boşlukları:** Eşleşme beklerken, sıra beklerken ve el sonunda ne oluyor? Sıkılma anlarını listele.
- **Sağlıklı bağlılık mekanikleri:** Var olanlar ve önerilenler.
  - günlük seri
  - görevler
  - sezonlar
  - koleksiyon
  - sosyal bağ (arkadaşla oynama, aynı masaya dönme)
  - adil eşleşme
  - kayıp sonrası teselli
  - ustalık hissi (istatistik, rozet, "en iyi elin")
- **Zayıflıklar:** Oyuncuyu bıktıracak ya da adaletsiz hissettirecek şeyler:
  - botlara karşı kayıp serisi
  - uzun bekleme
  - anlaşılmaz cezalar

## 6.3 Rakip analizi

Türkiye'deki popüler okey oyunlarını (çevrim içi ve çevrim dışı) incele. Her biri için şu tabloyu doldur:

| Oyun | Güçlü yanlar | Zayıf yanlar | Oyuncu şikâyetleri (mağaza yorumlarından temalar) | Bizim farkımız |
| --- | --- | --- | --- | --- |

Karşılaştırma alanları: tasarım, oynanış hissi, kurallar, ekonomi, sosyal özellikler, reklam yoğunluğu, hile algısı.

## 6.4 Okeye yeni bir deneyim: fikirler

En az 15 özgün fikir. Her biri için şunları yaz:
- ne olduğu
- neden fark yaratır
- efor (S/M/L)
- Cloudflare maliyet etkisi
- öncelik önerisi

Düşünülebilecek alanlar:
- kahvehane atmosferi ve sezon temaları
- el tekrarı ve "günün eli"
- arkadaş grupları ve masa geleneği
- koleksiyon setleri
- öğrenme modu ve akıllı ipucu
- izleyici modu
- takım okeyi
- günlük bulmaca eli
- usta oyuncu rozetleri
- kişisel istatistik hikâyeleri

## 6.5 Etik sınırlar ve hukuki riskler (zorunlu)

Hukuki tavsiye değil, risk listesi olarak yaz:

- **Karanlık örüntüler (dark patterns):**
  - kayıp kovalatma
  - zorla bekletip para isteme
  - yanıltıcı sayaçlar
  - "son şans" baskısı

  Mevcut ve planlanan özelliklerde bu riskler var mı? Varsa nasıl yumuşatılır?
- **Kumar sayılma riski:** Çip gerçek parayla satılırsa ve kazanılan çip herhangi bir yolla paraya ya da değerli bir
  şeye dönüşebilirse ne olur?
  - Türkiye mevzuatı (7258 sayılı Kanun)
  - App Store ve Google Play "simüle kumar" kuralları
  - yaş sınırı ve derecelendirme
- **Çocuk kullanıcılar ve KVKK:** aydınlatma metni, açık rıza, veri saklama süreleri, sohbet kayıtları.
- **Mağaza zorunlulukları:**
  - hesap silme
  - gizlilik politikası
  - reklam açıklaması
  - satın alma politikaları
- **Oyun süresi sağlığı:** Mola hatırlatma gibi öneriler.

## 6.6 Son tarama

- Önceki raporlardaki (`RAPOR_01` – `RAPOR_05`) P0 ve P1 bulgularını yeniden test et. Düzeldi mi? Tabloya yaz.
- Tüm oyunu baştan sona bir kullanıcı gibi oyna:
  - ilk açılış
  - çevrim dışı klasik ve 101
  - çevrim içi oda
  - el ve maç sonu
  - Çarşı
  - profil
- Gördüğün her yeni hatayı yaz:
  - konsol hataları
  - uzun oturumda bellek artışı (30 dakika oynat, ölç)
  - düşük donanımlı telefon benzetiminde takılmalar
- **Canlıya çıkış kontrol listesi:** Mağazaya göndermeden önce yapılacakların tam listesi.
