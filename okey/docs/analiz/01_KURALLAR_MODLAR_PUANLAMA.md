# Parça 1 — Oyun kuralları, modlar, puanlama ve skor ekranları

Önce `docs/analiz/00_ORTAK_KURALLAR.md` dosyasını oku. Çıktı: `docs/analiz/RAPOR_01.md`, ekran görüntüleri: `docs/analiz/ss/01/`.
Rapor öneki: `KURAL`, `MOD`, `PUAN`, `SKOR`, `BILDIRIM`, `BOT`, `AKIS`.

Bu parça oyunun **kendisini** inceler: kurallar doğru mu, modlar ve ayarlar eksiksiz mi, puanlar doğru hesaplanıyor ve
doğru gösteriliyor mu. Hem çevrim dışı hem çevrim içi modda bak; çevrim içi kısım yarımsa nerede kaldığını yaz.

---

## Kullanıcının soruları (her birine tabloda açık cevap ver)

- **U1.** Bir elin sonunda oyuncuların kalan taşlarının ceza puanları görünüyor mu? Benim elimde kalan sayılar ve
  diğer oyuncularınki ayrı ayrı yazıyor mu?
- **U2.** Oyun sırasında genel durum (skor) ekranı var mı? Bir yere dokununca benim ve diğer oyuncuların toplam puanı
  görünüyor mu?
- **U3.** Çevrim içi modda "101"e dokununca doğrudan 101 mi açılıyor? Ayar seçimi nerede?
- **U4.** Çevrim dışında (ve çevrim içinde) kaç el oynanacağı, kaçtan geriye sayılacağı / kaçtan düşüleceği seçilebiliyor
  mu? Bu ayar ekranları var mı, yeterli mi?
- **U5.** El bitince o elin sonucu gösteriliyor mu? Animasyonla ikinci sayfaya geçip **şu ana kadarki el geçmişi**
  (her elin puanı ve toplam) görünüyor mu?
- **U6.** Ekranda oyunun türü açıkça yazıyor mu: katlamalı mı katlamasız mı, eşli mi eşsiz mi, kaçtan geriye sayılıyor?
  Klasik okeyde de eşli seçenek var mı?
- **U7.** Oyun içindeki ceza ve diğer bildirimler yeterli mi? Hangileri eksik?
- **U8.** Mod seçim ekranları var mı, yeterli mi, neler eksik?

---

## 1.1 Mod seçimi ve ayar ekranları

Her ekranın görüntüsünü al. Her ayar için şu tabloyu doldur:

| Ayar | Kodda var mı (`DEFAULT_RULES`) | Ekranda seçilebiliyor mu | Çevrim içi odada seçilebiliyor mu | Oyun içinde görünüyor mu | Kalıcı mı (hatırlanıyor mu) |
| --- | --- | --- | --- | --- | --- |

Kontrol edilecek ayarlar:
- **Mod:** Klasik / 101
- **Klasik:**
  - maç türü (puan bitene kadar / tek el)
  - başlangıç puanı (kaçtan geriye)
  - tek renk bitiş
  - gösterge puanı
  - çifte gitme kuralları
- **101:**
  - el sayısı (1/3/5/7/11)
  - açılış türü (sabit 101 / katlamalı)
  - 12-13-1 serisi
  - yandan alma cezası
  - okeyi geri alma ve cezası
  - okey atma cezası
  - işlek taş atma cezası
  - deste bitince hesaplaşma
  - kafa okey ödülü (404/808)
  - açtıktan sonra başka per indirme
- **Eşli / eşsiz:** Hem klasikte hem 101'de var mı? Yoksa `YOK` yaz ve nasıl olması gerektiğini öner.
  Eşler karşılıklı oturur, puanlar takımca toplanır.
- **Diğer:** sıra süresi, bot zorluğu, oyun hızı.

Kontrol edilecek akış ve davranışlar:
- Ayar ekranı sade mi? Gelişmiş kurallar katlanabilir bir bölümde mi?
- Her ayarın kısa bir açıklaması ("bu ne demek") var mı?
- Hazır kural setleri ("Kahvehane kuralları", "Turnuva kuralları") var mı?
- Çevrim içi odada kurallar oda kurulurken mi seçiliyor? Odaya girenler kuralları görüyor mu?
- Kuralı değiştirince devam eden oyun etkileniyor mu?

## 1.2 Kural doğrulama — Klasik Okey

Her kural için bir senaryo testi yaz (`tools/analiz/`) ya da elle dene. Sonucu `DOĞRU` / `YANLIŞ` / `YOK` olarak yaz.

1. **Taşlar ve dağıtım:**
   - 106 taş (4 renk × 1–13 × 2 + 2 sahte okey).
   - Dağıtan 15, diğerleri 14 taş alır. Dağıtan ilk taşı atar.
2. **Gösterge ve okey:** Okey, göstergenin bir fazlası (13 → 1). Sahte okey, okeyin yerine geçer.
3. **Per kuralları:**
   - Seri: aynı renk, ardışık, en az 3 taş.
   - Grup: aynı sayı, farklı renk, 3–4 taş. Aynı renkten iki taş grupta olamaz.
   - Klasikte 12-13-1 serisi geçerli mi?
4. **Sıra:** Ortadan ya da soldaki oyuncunun attığı taştan çekme, sonra taş atma.
5. **Bitirme:** 14 taş perlerde, 15. taş ortaya atılır.
6. **Okey davranışı:**
   - Okeyle bitirme (puan ×2).
   - Çifte bitirme (7 çift) ve okeyle çifte.
   - Okeyin her taşın yerine geçmesi; iki okeyin aynı anda kullanımı.
7. **Gösterge gösterme:** Hangi anda gösterilebilir, puanı ne?
8. **Deste bitince:** El berabere mi, puan ne olur?
9. **Okey atma:** Oyuncu okeyi atarsa bir sonraki oyuncu onu alabilir mi? Uyarı var mı?
10. **Puan düşme:** Başlangıç puanından düşme ve maçın bitiş koşulu (biri 0'a inince mi?). Kazanan nasıl belirleniyor?
    Eşitlik durumu.

## 1.3 Kural doğrulama — 101 Okey

1. **Dağıtım:** Herkese 21, dağıtana 22 taş.
2. **Açma:**
   - En az 101 sayı (seri ve gruplar) ya da 5 çift.
   - Okey, yerine geçtiği taşın değeriyle sayılıyor mu?
   - **Katlamalı** açılışta sonraki açanın ne kadar fazla açması gerekiyor? Kodda ne var?
3. **Açtıktan sonra:**
   - İşleme: başkalarının ya da kendi perine taş ekleme.
   - Çift açanın işleme kuralları.
   - Elindeki başka perleri indirme.
4. **Yandan alma:** Soldan alınan taşla açma zorunluluğu ve kullanılmazsa ceza.
5. **Okey:**
   - Masadaki okeyi, yerine geçtiği gerçek taşla geri alma ve cezası.
   - Gerçek okey atma cezası.
6. **İşlek taş atma cezası:** Masaya işlenebilecek bir taşı atma. Atmadan önce uyarı var mı?
7. **Bitiş türleri:**
   - normal bitiş
   - okeyle bitiş (×2)
   - elden bitme (hiç açmadan tek seferde)
   - çiftle bitiş
   - kafa okey
8. **Cezalar:**
   - Açmayan oyuncu (202?).
   - Açan oyuncu: elinde kalan taşların toplamı.
   - Okeyle bitişte katlama.
   - Deste bitince hesaplaşma.
   - **Tüm ceza değerlerini tek tabloda topla:** kodda ne yazıyor, yaygın kural ne (kaynağıyla), fark varsa hangisi
     doğru olmalı (öneri).
9. **El ve maç sonu:**
   - Seçilen el sayısı bitince en düşük toplam mı kazanıyor?
   - Eşitlik.
   - Eşli modda takım toplamı.

## 1.4 Varyantların tanımı

Türkiye'de yaygın 101 ve klasik okey varyantlarını araştır ve kaynak göster:
- katlamalı / katlamasız
- eşli / eşsiz
- el sayısı
- başlangıç puanı
- yaygın ceza değerleri

Tablo:

| Varyant | Yaygın tanım (kaynak) | Bizde var mı | Doğru uygulanmış mı | Öneri |
| --- | --- | --- | --- | --- |

## 1.5 Puan hesaplama

- Her el sonunda her oyuncunun puanı doğru hesaplanıyor mu? En az 30 farklı senaryoyu otomatik test et. Bu testlerin
  her bitiş türünü ve cezayı kapsaması gerekiyor.
- Kalan taşların toplamı okeyi nasıl sayıyor?
- Katlama ve çarpanlar doğru uygulanıyor mu?
- Klasik: başlangıç puanından düşme, gösterge, okeyle ve çifte bitiş.
- Toplamlar el geçmişiyle tutarlı mı? Birikmiş puan = ellerin toplamı mı?

## 1.6 Skor ekranları

- **El sonu ekranı** (`src/app/result.js`, iki sayfa):
  - **Sayfa 1:** Kazanan, bitiş türü, çarpan, kazandığın XP ve elin taşları. Sayfanın içeriği ve kalitesi.
  - **Sayfa 2:** Puan tablosu. **El el geçmiş** görünüyor mu (1. el, 2. el … sütunları ve toplam)? Sadece toplam ve
    değişim mi var?
  - **Ceza ayrıntısı:** 101'de her oyuncunun elinde kalan taşlar ve sayıları (ceza dökümü) görünüyor mu?
    "Açmadı: 202", "İşlek attı: +101" gibi gerekçeler yazıyor mu?
  - Sayfa geçiş animasyonu: süresi, elle geçiş, geri dönme.
- **Oyun içi skor tablosu:** Oyun sırasında açılabilen bir skor ekranı var mı? Nasıl açılıyor? İçinde ne var:
  - el geçmişi ve toplamlar
  - kaçıncı el / toplam el
  - kurallar özeti (katlamalı, eşli, başlangıç puanı)
- **Maç sonu ekranı:** Kazanan, sıralama, tam el geçmişi, istatistik.
- **Eşli modda:** Takım puanları nasıl gösteriliyor?
- Her ekranı üç telefon boyutunda görüntüle. Çakışma ve taşma var mı?

## 1.7 Bildirimler

Oyun içinde çıkan her bildirimi listele ve eksikleri belirt. Tablo:

| Olay | Bildirim var mı | Metin | Görsel / ses | Yeterli mi | Öneri |
| --- | --- | --- | --- | --- | --- |

Olaylar:
- sıra sende / sıra X'te
- süre azalıyor
- X açtı (kaç puanla, çiftle mi)
- X işledi
- X okeyi geri aldı
- ceza aldın / X ceza aldı (gerekçe ve miktar)
- işlek taş atma uyarısı (atmadan önce)
- okey atma uyarısı
- yandan aldığın taşı kullanmalısın
- açmaya X puan kaldı
- açamazsın (neden)
- geçersiz per
- gösterge gösterildi
- deste azalıyor / bitti
- el bitti (neden)
- maç bitti
- bağlantı ve bot olayları (çevrim içi)

Ayrıca bildirimlerin kalitesine bak:
- Üst üste biniyorlar mı?
- Çok hızlı mı kayboluyorlar?
- Oyun alanını kapatıyorlar mı?

## 1.8 Botlar

- Botlar her zaman geçerli hamle mi yapıyor? 200 maçlık otomatik koşuda reddedilen hamle sayısını ölç.
- 101'de botlar açabiliyor ve işleyebiliyor mu? Gereksiz yere açmadan mı bekliyorlar? Okey geri alma ve cezalardan
  kaçınmayı biliyorlar mı?
- Zorluk seviyeleri gerçekten farklı mı? Galibiyet oranlarını ölç.
- Botların hamle hızı doğal mı? Takılan ya da sonsuz döngüye giren bir durum var mı?

## 1.9 El ve maç akışı

- Dağıtma, dağıtanın her el dönmesi, ilk oyuncu.
- Deste bitince el sonu.
- **Sonraki ele geçişte her şey sıfırlanıyor mu?**
  - masadaki açılmış perler
  - atılan taşlar
  - cezalar
  - göstergeler
  - zamanlayıcılar
- Uygulama kapanıp açılınca oyun kaldığı yerden devam ediyor mu (kayıt / geri yükleme)?
- Maçtan çıkma, yeniden başlatma, duraklatma.
- **Uzun koşu testi:** Her mod için 100 maçı tamamen botlarla, ekransız ya da hızlandırılmış oynatan bir betik yaz.
  Her adımda şunları denetle:
  - taş sayısı her an 106
  - hiçbir taş çift değil ya da kaybolmamış
  - her el bitiyor
  - puanlar tutarlı
  - hata (exception) yok

  Sonuçları rapora yaz.

## 1.10 Ek: senin bulacakların

Okey bilgine dayanarak bizim sormadığımız kural, puan ve akış eksiklerini ara. Örnekler:
- Uzun sıra beklemede sıkılma.
- "Elini göster" seçeneği.
- Bitirme anında son taşın ortaya atılması zorunluluğu.
- 101'de açtıktan sonra yandan alma kuralları.
- Bir turda birden fazla işleme.
