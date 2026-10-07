# 3 oyun için yapım brifleri

Bu klasörde birbirinden bağımsız 3 prompt dosyası var. Her dosya ayrı bir Claude Code sohbetinde, ana ajan ve alt ajanlarla 4–5 saat boyunca, kimseye soru sormadan bir oyunu baştan sona yapmak için yazıldı.

| Dosya | Oyun | Bağımsız mod |
|---|---|---|
| `01-KANAT-wingsuit-ve-SURU-io.md` | **KANAT**: Kapadokya, Likya, Karadeniz, Erciyes ve Pamukkale'nin gerçek arazisinde wingsuit ile yakınlık uçuşu | **SÜRÜ.io**: sığırcık sürüleriyle oynanan, yeni nesil bir .io modu |
| `02-DINAMIT-kontrollu-yikim-ve-KUSATMA.md` | **DİNAMİT**: kontrollü yıkım mühendisliği bulmacaları ve sinematik, ağır çekim çöküşler | **KUŞATMA**: çizgi film tarzı, sıra tabanlı kale topçu düellosu |
| `03-ISTAKA-bilardo-ve-MINI-GOLF.md` | **ISTAKA**: fotogerçekçi bilardo (8-Top kariyeri, Üç Bant, Hızlı Bilardo, Günün Vuruşu) | **MİNİ GOLF DİORAMA**: tilt-shift minyatür dünyada mini golf |

## Nasıl kullanılır
1. Her dosya için **yeni bir Claude Code sohbeti** aç. Bu depoyu seç.
2. Dosyanın **tamamını** kopyalayıp ilk mesaj olarak yapıştır. Prompt "ultracode" ve çoklu ajan kullanımını zaten açıkça istiyor.
3. Oturumu açık bırak. Ajanlar `games/<oyun>/` klasöründe çalışır ve düzenli olarak commit atıp push eder.
4. Sabah her sohbetin son mesajındaki teslim raporunu oku. Raporda nasıl çalıştırılacağı, testler, ekran görüntüleri ve cihazda kontrol edilecekler yazar.

## Üç oyunda ortak olanlar
- **Teknoloji:** three.js r186 (WebGL2), TypeScript ve Vite. Mi 9T'de WebGPU olmadığı için bilinçli olarak WebGL2 seçildi.
- **Grafik ayarı:** Otomatik (varsayılan), Ultra, Yüksek, Orta, Düşük. Otomatik mod üç adımda karar verir:
  - GPU tahmini yapar.
  - 1,5 saniyelik bir benchmark çalıştırır.
  - Oyun sırasında dinamik çözünürlük ayarlar ve gerekirse kademeyi değiştirir.
- **Uygulama köprüsü:** Mesaj protokolü üç oyunda birebir aynı. Uygulamaya tek bir adaptör yazman yeterli. Her oyun kendi `docs/INTEGRATION.md` dosyasında React Native, Flutter, Swift, Kotlin ve iframe için örnek kod verir.
- **Online:** Henüz yok. Mimari ileride eklemeye hazır: deterministik simülasyon, komut akışı ve `NetAdapter` arayüzü.
