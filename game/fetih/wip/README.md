# Yarım kalan ajan işleri (yedek yamalar)

Bu yamalar derlemeye dahil değildir. Her biri `0f03952` commit'ine göre farktır.
Uygulamak için: `git apply --3way game/fetih/wip/<ad>.patch` (çakışmaları elle çöz, sonra test et).

| Yama | İçerik |
|---|---|
| `soru-tipleri.patch` | order, match, hilo, odd, emoji, proverb, riddle, anagram, cross, img, blitz, `TYPE_WEIGHTS` |
| `oynanis.patch` | komutanlar, jokerler, ilerleme, soru bankası, sefer, ağ katmanı (WIP) |
| `ses.patch` | WebAudio motoru, makam müziği, efektler |
