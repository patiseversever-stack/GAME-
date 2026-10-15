# Görsel listesi (Adım 1 / MVP): Sinematik B tarzı

**Nasıl üretilir:** Meshy → **Text to Image** (yazı içerenlerde model olarak **GPT Image**, diğerlerinde **Nano Banana Pro**).
- "Saydam arka plan" yazanlarda **Remove background** seçeneğini aç.
- Aynı karakterin farklı hâlleri için **Image to Image** kullan ve referans olarak 1 numaralı görseli ver.
- Bitince görselleri bu sohbete yükle; isim vermene gerek yok, sırayla yüklemen yeterli. Kırpma, boyutlandırma ve sıkıştırmayı ben yaparım.

**Her prompta eklenecek ortak stil cümlesi** (aşağıda STİL yazan yere):
```
cinematic Pixar-quality 3D animated film style, warm dramatic golden lighting, rich textures, soft rim light, expressive, premium mobile game art
```

---

## A. Rıza Amca (öncelik 1)

| # | Ne | Oran | Arka plan | Prompt |
|---|---|---|---|---|
| 1 | Nötr / kendinden emin portre | 1:1 | saydam | `Bust portrait of Rıza Amca, a 72-year-old Turkish grandpa with a grey flat cap, a huge white handlebar mustache, bushy eyebrows, brown wool vest over a white shirt, amber prayer beads on his wrist, confident proud half-smile with one eyebrow raised, looking at the viewer, head and shoulders centered, STİL` |
| 2 | Göz kırpma (aynı resim, gözler kapalı) | 1:1 | saydam | Image to Image, referans #1: `Exactly the same image, identical pose, framing and lighting. Only change: his eyes are gently closed (blinking). Change nothing else.` |
| 3 | Kızgın, kulaklardan buhar | 1:1 | saydam | Referans #1: `Same character, same framing. Furious: deeply furrowed brows, red face, gritted teeth under the mustache, small cartoon steam puffs from his ears. STİL` |
| 4 | Kahkaha | 1:1 | saydam | Referans #1: `Same character, same framing. Laughing out loud, eyes squeezed shut, mouth wide open under the mustache, tears of joy, head slightly tilted back. STİL` |
| 5 | Şaşkın | 1:1 | saydam | Referans #1: `Same character, same framing. Totally shocked: eyes wide, eyebrows raised high, jaw dropped, cap slightly lifted. STİL` |
| 6 | Üzgün / yenilmiş | 1:1 | saydam | Referans #1: `Same character, same framing. Sad and defeated: eyebrows raised in the middle, mustache drooping, sighing, looking down. STİL` |
| 7 | Kibirli sırıtma | 1:1 | saydam | Referans #1: `Same character, same framing. Smug teasing grin, one eye squinting, twirling the tip of his mustache with his fingers. STİL` |
| 8 | Düşünceli | 1:1 | saydam | Referans #1: `Same character, same framing. Thinking hard: hand on chin, eyes looking up to the side, lips pressed. STİL` |

## B. Kartlar (öncelik 1)

Klasik resimli kartlar olacak. Sadece **figür resmi** istiyorum; harf, sembol ve çerçeveyi kodla ben eklerim.

| # | Ne | Oran | Arka plan | Prompt |
|---|---|---|---|---|
| 9 | 4 Vale (2×2 ızgara) | 1:1 | düz krem | `Four separate playing-card court character illustrations arranged in a 2x2 grid with clear gaps, each a half-body portrait facing forward: the four Jacks (spades, hearts, diamonds, clubs), young noble pages in classic court card costumes with feathered caps, each in a different color scheme (black-gold, red-gold, red-blue, green-gold), ornate fabrics, no letters, no suit symbols, no card borders, plain cream background, STİL` |
| 10 | 4 Kız (2×2) | 1:1 | düz krem | Aynısı, `the four Queens ... elegant queens with small crowns and flowers, each in a different color scheme` |
| 11 | 4 Papaz (2×2) | 1:1 | düz krem | Aynısı, `the four Kings ... bearded kings with crowns and scepters, each in a different color scheme` |
| 12 | Kart arkası | 2:3 | — | `Playing card back design, deep emerald green velvet with an ornate gold Ottoman-inspired symmetrical ornament, a central gold medallion with a tulip, thin gold border inset, luxurious, flat front view, fills the whole image, no text` |
| 13 | Maça ası süsü | 1:1 | saydam | `A single ornate black spade symbol with elegant gold filigree and a small gold tulip in its center, luxurious playing-card ace emblem, front view, STİL` |

## C. Rozetler ve oyuncu (öncelik 2)

| # | Ne | Oran | Arka plan | Prompt |
|---|---|---|---|---|
| 14 | Oyuncu rozet çerçevesi | 1:1 | saydam | `Ornate round gold portrait frame for a mobile game player badge, polished gold ring with small gems and filigree, an empty transparent circular center, a small dark gold-edged name plate ribbon below the ring, front view, STİL` |
| 15 | Oyuncu avatarları (2×2) | 1:1 | düz | `Four separate bust portraits in a 2x2 grid with gaps, friendly Turkish people for player avatars: a young man with short beard, a young woman with long dark hair, a middle-aged man with a mustache, a middle-aged woman with a colorful headscarf, each smiling and looking at the viewer, plain warm background, STİL` |

## D. Yazılar ve damgalar (öncelik 2; model: GPT Image, Türkçe harflere dikkat)

| # | Metin | Oran | Arka plan | Prompt |
|---|---|---|---|---|
| 16 | PİŞTİ! | 3:2 | saydam | `The word "PİŞTİ!" (Turkish, dotted capital İ: P-İ-Ş-T-İ-!) in huge chunky glossy 3D gold letters with dark brown bevel and warm glow, slight perspective, celebratory, STİL` |
| 17 | VALE PİŞTİ! | 3:2 | saydam | Aynı stil, metin `"VALE PİŞTİ!"` |
| 18 | KAZANDIN! | 3:2 | saydam | Aynı stil, metin `"KAZANDIN!"` |
| 19 | KAYBETTİN | 3:2 | saydam | Aynı stil ama soğuk gümüş-gri, metin `"KAYBETTİN"` |

## E. Ortam (öncelik 3)

| # | Ne | Oran | Prompt |
|---|---|---|---|
| 20 | Lobi arka planı | 16:9 | `Cozy traditional Istanbul coffeehouse interior at evening, warm hanging lamps, wooden tables with green felt, brass samovar, tea glasses, soft bokeh, no people, cinematic depth of field, STİL` |
| 21 | Buhar bulutu efekti | 1:1, saydam | `A small fluffy white cartoon steam puff cloud, soft volumetric, STİL` |

**Toplam:** 21 görsel. En önemlileri **1-13**; onlar gelirse masa ekranı hedef görsel seviyesine çıkar. Geri kalanlar menü ve sonuç ekranları için.
