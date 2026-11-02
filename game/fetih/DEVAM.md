# Devam notu (Fetih Ligi, v1.5 soru/sonuç turu)

Son durum: dal `claude/eloquent-feynman-h3ctvm`, her şey commit'li ve gönderilmiş. Oyun ve defter aynı sürüm damgasıyla
yayınlı (sürüm: `dist/` derlemesinin üst şeridinde ve oyunun `__BUILD__` değerinde).

- Oyun: https://claude.ai/artifact/Je7JxXFSZWwquWPYCBqZx7
- Defter (soru galerisi, telefon çerçeveli): https://claude.ai/artifact/M3YsYK34kRQds5QoRV6kQZ
- Yayın: `node build.mjs`; defter = `<!DOCTYPE html>` + `dist/SoruGalerisi.html`, oyun = `dist/FetihLigi.html`.

## Bitenler (bu tur)
- Sonuç akışı: cevap kartta görünür → kart kapanır → sonuç ekranı → şehir filmi (üst üste binme yok). DESIGN.md "Sonuç akışı".
- Sırala ve eşleştir krem/premium, ONAYLA alçak (55 → 40 px), harita daha çok görünür.
- Kiplerde sonuç ekranı: eşli A/B rozeti, izlenen düelloda doğru renk, yayılmada sonuç + SEÇİM SIRASI tek ekran.
- SEÇİM SIRASI v1.5e: ince tasarım, pay +1…+8, 21 harfli adlar, uzun yakınlık değerleri; 320–430 px dikey ölçüldü.

## v2 kural tasarımı (KARARLAR.md: 36 karar, kullanıcıyla soru-cevap)
- Aşama 1 bitti: Tufan filmi tam (8,7 → 11 sn), sonuç ekranı ardından; sunucu film + RESULT_MS bekler.
- Aşama 2 bitti: zincir saldırı (CHAIN, chainCapFor), çark turda 1, sorusuz kalkan (botShieldTurn), kule zinciri,
  kule onarımı (kendi kalene dokun → tek kişilik soru → castle.heal + cinema.towerUp), seçim yazısı { head, ey, hint }.
  Görsel: ref/v2-kural/kalkan_zincir_onarim.jpg; benzetim: 72 maçta 7 elenme (önce 0).
- Aşama 3–7 bitti (modlar, harita/tarafsız, bot özeti/Atla/elenme, joker ödülü, izleyici tahmini, geri dönüş).
- Eski sıradaki notu: Aşama 3 (modlar: Klasik 6 savaş turu, Süreli 15 dk, Hakimiyet %70 + 25 dk eşik düşüşü, Ölüm maçı 30 dk ani
  ölüm; menüde mod seçimi, HUD süre/hakimiyet çubuğu; test/sim.mjs süre hedefleri yeni modlara göre).
- Test ortamı notu: `?debug` sayfasında çizim döngüsü kapalı → `app.start()`; SwiftShader'da kare ~0,5 sn, oyun dt'yi 0,05'e
  kıstığı için kamera/film yavaş görünür → çekimde `app.frame`'e gerçek dt verilir (an.cjs). Duraklatma soru kartını gizler.

## Sıradaki
- Kullanıcı soru tiplerini tek tek atıyor; her tipte: arena/premium tasarım, sonuç akışı, uç durumlar (en uzun metin,
  en çok öğe, en dar telefon 320×568), önce/sonra görseli sohbette, oyun + defter aynı sürümle yayın.
- Bekleyen düşük öncelik: genel ucuz-yöntem denetimi (gölgelendirici, gölge, kamera, oyun yükü).

## Denetim betikleri (`tools/denetim/`, Playwright + SwiftShader)
Yollar mutlak yazılı (`/home/user/GAME-/game/fetih/dist`), çalıştırmadan önce `node build.mjs`.
- `uc.cjs <dist> <etiket>`: SEÇİM SIRASI uç durumları (S=320x568,412x892 ortam değişkeniyle boylar).
- `sig.cjs <dist> <etiket>`: 7 telefon boyunda dikey sığma ölçümü.
- `sira.cjs <dist> <etiket> <sahne tık sayısı>`: defterde yayılma sahneleri (1: 2 kişi, 2: 4 kişi, 3: eşli).
- `kip_t.cjs <dist> <etiket> <1v1|team|ffa3|ffa4>`: gerçek maç akışı, reveal/ranking süreleri.
- `akis2.cjs`, `esles.cjs`: soru → cevap → sonuç ekranı zaman çizelgesi; `olc_kart.cjs`: kart/tahta/düğme ölçüleri.
- `hatasiz2.cjs`: tiplerde sayfa hatası taraması.
- Testler: `for f in test/*.test.mjs; do node $f; done` (12 dosya).
