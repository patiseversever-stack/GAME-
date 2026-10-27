# Fetih Ligi: Durum ve Yol Haritası

Kaldığımız yer burası. Yeni oturumda önce bu dosyayı oku.

## Kullanıcının istediği (kararlar)

- **Oyun:** Bil ve Fethet + Trivia Crack birleşimi bir bilgi yarışması. Video oyunu kalitesinde,
  "Supercell milyonlar harcamış" hissi, sinematik kamera. Viral olmalı.
- **Harita:** önce Türkiye (81 il), sonra dünya. Hızlı maçta tek bölge, uzun maçta tüm Türkiye.
- **Maç türleri:** 1'e 1, 3 kişi, 4 kişi, eşli (2'ye 2). Hızlı (5–7 dk) ve uzun.
- **Fetih:** karma yapı. Yayılma (tahmin/harita: en yakın seçer), sonra fetih (çark + düello),
  sonra kale kuşatması (3 kule).
- **Görsel:** canlı minyatür harita (masadaki 3D maket), parlak renkler.
- **Soru tipleri:** hepsi. Mevcutlar: test, doğru/yanlış, tahmin, harita iğnesi, adam asmaca.
  Eklenecekler:
  - Kelime: çengel bulmaca, harf çemberi, anagram.
  - Görsel: resimli bulmaca (rebus), bulanık foto, yakından uzaklaşan foto, siluet, gölgeden tanı,
    3D maket döndür, emoji.
  - Etkileşimli: kronoloji sıralama, eşleştirme, yüksek mi alçak mı, farklı olanı bul,
    doğru/yanlış yıldırım turu.
  - Diğer: 5 sn hafıza, bilmece, atasözü tamamla, kim söyledi, zekâ, buzzer düellosu,
    ses/melodi, forma renkleri.
- **Kategoriler:** genel kültür, tarih, spor, coğrafya, bilim, sanat-edebiyat, eğlence; ayrıca yemek,
  iller, mitoloji, internet kültürü, doğa, zekâ.
- **Fetih kuralı:** saldırıda kategori çarkı döner ("Fetih!" dilimi: kategoriyi saldıran seçer).
  Soru tipi her seferinde değişir.
- **Karakter:** komutan avatarı + kozmetikler. Kostümler tarih karması + eğlenceli (Göktürk, Selçuklu,
  Osmanlı, Kurtuluş esintili; futbolcu, astronot, aşçı…).
- **Çevrimdışı MVP:** sefer (kampanya) + botlara karşı maç. Sunucu, çevrimiçi ve ELO dereceli
  sonra gelecek; mimari buna hazır olmalı.
- **Görseller:** ben telifsiz bir üretim listesi (dosya adı + yapay zekâ istemi) vereceğim, kullanıcı
  yapay zekâyla üretecek. Logo yok, gerçek kişi yok, telifli karakter yok.
- **Soru sayısı:** MVP'de 1.000. Ben yazıp doğrularım.
- **Ad ve platform:** Fetih Ligi. Önce web, sonra Play Store.
- **Jokerler:** yarı yarıya + ekstra süre, kalkan + ikinci şans, sabotaj, seyirci/kahin.
- **Gelir tasarımı:** ödüllü reklam, kozmetik mağaza, reklamsız paket. Kodda kanca olarak hazır olacak.
- **Hassas konular:** yalnızca tarihi bilgi olarak; güncel siyaset ve din tartışması yok.
- **Müzik:** epik + Türk enstrümanları (davul, zurna, bağlama, ney).
- **Kitle:** 12+, uyarlanan zorluk (her soru kolay/orta/zor).
- **Ajan modelleri:** görsel ve grafik işleri Opus en yüksek efor (xhigh); önemsiz işler Sonnet high.

## Kullanıcının son geri bildirimi (v0.1 için)

> Oyun bozuk, görsel kalite rezalet, her şey çok zayıf; yüzde 1 kalitesinde bile değil. Şehir
> seçemiyorum. Soru arayüzü rezalet. Supercell milyonlar harcamış gibi değil, aşırı basit. Milyon
> dolarlık oyun gibi geliştir. Sınırım olan şehirleri seçebilmeliyim; bakınca her şey net
> gözüksün; rengime boyayayım.

- **Kullanıcının değerlendirmesi:** v0.1 finalin yaklaşık %5'i. Görsel, arayüz ve his sıfırdan
  büyük bütçe seviyesine çıkarılmalı; küçük iyileştirmeler yetmez.
- [x] **Düzeltildi:** şehir seçilemiyordu. Kaybolan soru kartı görünmez halde ekranın altında kalıp
  dokunuşları yutuyordu (`.fl-q` için `visibility`/`pointer-events`). Yanlış ile dokununca uyarı da
  eklendi.

## Şu anki durum (v0.1, commit f35cb59 ve sonrası)

| Alan | Dosya | Durum |
|---|---|---|
| Harita | `src/map/board.js` | 81 il; tek geometri; il durumu veri dokusunda (sahip rengi, yükselme, parlama) |
| Süsler | `src/map/props.js` | Dağ, ağaç, çam (örneklemeli) |
| Kale | `src/map/castle.js` | 3 kule, sancak |
| Veri | `tools/geo.mjs`, `src/data/turkiye.json` | Natural Earth (kamu malı) → il çokgenleri, komşuluk, merkez |
| Maç | `src/game/match.js` | Başkent → yayılma → fetih → kuşatma; 4 mod; botlar |
| Sinema | `src/game/cinema.js` | Basit kamera hareketleri |
| Soru tipleri | `src/quiz/types.js` | choice, tf, num, pin, hang |
| Sorular | `src/data/questions.js` | 68 doğrulanmış soru |
| Arayüz | `src/ui/ui.js`, `src/ui/styles.js` | Menü, HUD, soru kartı, çark, sıralama, bitiş |
| Ses | `src/audio/sfx.js` | Boş iskelet |

- **Test:** `app.debugSim({mode, region, length})` botlarla maçı baştan sona oynatır.
- **Ekran görüntüsü:** `app.debugScene({show:'question'|'wheel', type, cat})` sahneyi gösterir.
- **Komutlar:** `node build.mjs --dev`, sonra `node tools/shot.mjs views.json çıkış --q=2`.
- **Yayın:** `node build.mjs --artifact=<scratchpad>/fetih-ligi.html`, ardından Artifact ile yayınla.
  Mevcut adres: https://claude.ai/artifact/4t77RHjRmbZC3SGbxdhLWz

## Sıradaki büyük iş (v0.2: "milyon dolarlık" geçiş)

### 1. Harita sanatı (Opus xhigh)
- **İl okunurluğu:**
  - Kalın, temiz il sınırları.
  - Seçilebilen iller parlak dış hat + yükselme ile işaretlenir, diğerleri hafif kararır.
  - İl adları her zaman okunur etiketlerde.
- **Rengine boyama anı:** fethedilen il, dokunulan noktadan dışa doğru sahibin rengine boyanır.
  Boya dalgası, sancak dikilir, parçacık ve ışık patlaması.
- **Gerçek arazi hissi:**
  - Yükselti: Doğu yüksek, kıyılar alçak.
  - Göller (Van, Tuz), nehirler, ormanlar.
  - Her ilde ünlü yapının minyatürü: Galata, Ayasofya, Anıtkabir, peri bacaları, Nemrut,
    Pamukkale, Sümela, Efes, Mevlana…
- **Işık:** su, gökyüzü ve bulutlar; tilt-shift derinlik.

### 2. Arayüz (Opus xhigh)
- Supercell kalitesinde soru kartı: büyük, okunur, animasyonlu, düello sahnesi (iki komutan karşı karşıya).
- Sayaç, kombo ve ödül animasyonları; çark 3D ya da çok parlak.
- Komutan seçimi, sefer haritası, sonuç ekranı.
- Dikey ve yatay ekran.

### 3. Sinematik kamera ve efektler (Opus xhigh)
- Saldırıda iki il arasında ok veya ordu yürüyüşü.
- Kuşatmada kale yakın çekimi, kule yıkılma parçacıkları, sarsıntı.
- Zaferde havai fişek.

### 4. Yeni soru tipleri (Opus)
Yukarıdaki listeden önce şunlar: çengel, harf çemberi, kronoloji, eşleştirme, resimli, bulanık foto,
3D maket, 5 sn hafıza, emoji, yüksek/alçak.

### 5. 1.000 soru (Sonnet high, birkaç ajan)
- Kategori × tip × zorluk dengesi.
- Her soru kesin bilgi; şüpheliler elenir; ikinci bir ajan doğrular.

### 6. Sefer, jokerler, komutan, ilerleme (Opus high)
- Jokerler ve sefer modu (bölge bölge, bölge komutanı).
- Ödüller ve kozmetik kancaları.
- Çevrimiçi ve ELO için ağ katmanı arayüzü (şimdilik yerel).

### 7. Ses ve müzik (Sonnet high)
Epik ve Türk enstrümanları, sentezle.

### 8. Görsel üretim listesi
`ASSETS.md`: dosya adı, boyut, stil ve istem. Telifsiz olmalı: logo, gerçek kişi ve telifli karakter yok.

## Performans kuralları (değişmez)

- Realme ve Mali-G52 sınıfı cihazlarda akıcı olmalı.
- Shader'lar açılışta derlenir.
- Kare başına nesne üretimi yok.
- Çizim çağrısı 40'tan az.
- q=0 kademesinde tam ekran efekt geçişi yok.
