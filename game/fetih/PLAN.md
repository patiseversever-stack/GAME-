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

## Şu anki durum (v0.2 ara sürüm, 28 Ekim)

**Yayında:** https://claude.ai/artifact/4t77RHjRmbZC3SGbxdhLWz (sürüm 3). Dal: `ccr-ac8b068d-5guafj`.

| Alan | Durum |
|---|---|
| Harita (bitti) | SDF il sınırları, `select()`, `paint()` boya dalgası, 3D il adları (`showLabels`), kabartma arazi, 42 göl, 19 nehir, 23 ünlü yapı, Osmanlı kalesi (3 kule yıkılır), bulut, tilt-shift (q≥1). q0: 21 çağrı / 145k üçgen, q2: 22 / 236k. |
| Arayüz (bitti) | Düello sahnesi, yeni soru kartı, çark, HUD, faz afişleri, menüler, komutan seçimi, bitiş kürsüsü, dikey + yatay. Türkçe harf düzeltmesi (`src/ui/trglyphs.js`). |
| Bağlama (bitti) | Fetihte boya dalgası ortak sınırdan; maç dışı iller kararır; kale araziye oturur. 1'e 1 maç baştan sona hatasız (133 sn). |
| İçerik (bitti) | `src/data/q/`: 1.000 doğrulanmış soru (tarih 180, coğrafya 200, spor 140, bilim 160, sanat 140, genel kültür 180). `src/data/bank.js` ile oyuna bağlı; şimdilik yalnız tanımlı tipler (choice, tf, num, pin, hang ≈ 750 soru) çıkar, diğer tipler soru tipleri birleşince açılır. |
| Sinema/efekt | Başlanmadı (ordu yürüyüşü, mancınık, kule enkazı, havai fişek, açılış uçuşu). |
| Soru tipleri (yarım, birleştirilmedi) | Dal `worktree-agent-af31e996c3a1eb880`: order, match, hilo, odd, emoji, proverb, riddle, anagram, cross, img, blitz, `TYPE_WEIGHTS`. Örnek soru ve test yok. |
| Oynanış (yarım, birleştirilmedi) | Dal `worktree-agent-a35eedab62b33d177`: komutanlar, jokerler, ilerleme, soru bankası, sefer, ağ katmanı. `sim.mjs` ve denge yok. |
| Ses (yarım, birleştirilmedi) | Dal `worktree-agent-ad6d837d89d36b9d7`: WebAudio motoru, makam müziği, efektler. `ASSETS.md` yazılmadı. |

**Bilinen eksikler:** maçtan çık / duraklat ekranı yok; menüde seçilen renk maça yansımıyor; Nemrut ve Kız Kulesi basit;
komşu ülkeler düz; il etiketlerinde sahip rengi zemini yok.

**Maliyet kuralı (kullanıcı isteği):** aynı anda en çok 1–2 ajan. Uzun aradan sonra eski ajanı devam ettirme, kısa görevle
yenisini başlat. Görsel işler Opus high, diğerleri Sonnet high.

**Test:** `node build.mjs --dev`, sonra tam maç akışı için
`/tmp/.../scratchpad/int/flow.mjs` örneği (otomatik insan oyuncu), ekran görüntüsü için `tools/shot.mjs`.

## Kullanıcının son istekleri (28 Ekim, en öncelikli)

1. **Gece odağı (Gündönümü'ndeki gece geçişi gibi):** il seçme sırası gelince bütün sahne ~0,6 sn'de koyu, premium
   geceye geçer (gri karartma değil: koyu mavi-mor, ay ışığı, hafif kenar parlaması). Yalnızca seçilebilir iller
   gündüz renginde, canlı, yükselmiş, parlak altın çerçeveli ve adlı kalır. Seçim bitince gündüze dönülür.
2. **Kamera:** insanın sırasında seçilebilir illerin hepsini kadraja alır. Bot seçerken de kamera ona gider, seçenekleri
   gecede parlar, sonra seçimi ve boya dalgası. Saldırı ve soru sırasında yalnız saldıran il ile hedef aydınlık.
   Fetihte boya dalgası gecede oynar, sonra gündüz. Geçişler kısa (maç 5–7 dk).
3. **Renkler:** sahip renkleri güçlü Supercell renkleri olmalı (kırmızı pembe görünmemeli). Seçilebilir vurgu parlak altın,
   soluk sarı değil.
4. **İl adları:** 81 ad birden yazılıp üst üste biniyordu (rezalet). Uzaktan yalnız büyük şehirler (ya da hiç),
   yaklaştıkça önem ve ekran boyuna göre artar, asla çakışmaz, yumuşak geçiş. Seçimde yalnız seçilebilirler,
   saldırıda yalnız saldıran ve hedef.

Bu dört iş sinema ajanına verildi (dal `worktree-agent-a984ef4b5f136efd8`). Yeni oturumda bu dal birleştirilmemişse
bu işleri yeniden yap. Gündönümü referansı: `game/Gundonumu.html` (varsa).

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
