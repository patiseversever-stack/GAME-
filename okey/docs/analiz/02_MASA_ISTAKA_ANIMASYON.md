# Parça 2 — Masa, ıstaka, açma tablası, orta alan ve animasyonlar

Önce `docs/analiz/00_ORTAK_KURALLAR.md` dosyasını oku. Çıktı: `docs/analiz/RAPOR_02.md`, ekran görüntüleri: `docs/analiz/ss/02/`.
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
