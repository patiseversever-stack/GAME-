# Yarım kalan ajan işleri (yedek yamalar)

Bu yamalar derlemeye dahil değildir. Her biri `0f03952` commit'ine göre farktır.
Uygulamak için: `git apply --3way game/fetih/wip/<ad>.patch` (çakışmaları elle çöz, sonra test et).

| Yama | İçerik |
|---|---|
| `ses.patch` | WebAudio motoru, makam müziği, efektler |

`soru-tipleri.patch` kaldırıldı: yeni soru tipleri (order, match, hilo, odd, emoji, proverb, riddle, anagram, cross, img, blitz, `TYPE_WEIGHTS`)
uygulandı, maça bağlandı (`Match.pickTyped`) ve `test/types.test.mjs` ile sınanıyor. Verisi olmayan tipler (anagram, cross, img, blitz)
kayıtlı kalır ama banka o kategoride soru taşımadıkça hiç çekilmez; veri eklenince kendiliğinden devreye girer.

`oynanis.patch` kaldırıldı: komutanlar, jokerler, ilerleme, sefer ve ağ katmanı (`src/game/{campaign,commanders,jokers,progress,net}.js`)
elle güncel koda taşındı (`Match`: soru tipi seçimi `haveTypes/pickTyped` ve içerik tekrarını eleyen `bank.js` korundu), arayüze bağlandı
(`src/ui/{jokerfx,campaign,endscreen,styles-play}.js`) ve `test/sim.mjs` ile sınanıyor. Yalnızca `ses.patch` bekliyor.
