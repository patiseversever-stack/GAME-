# Kahvehane Pişti — Sanat ve arayüz yönergesi

**Tek cümle:** Supercell cilası + Hearthstone'un sıcak meyhane malzemeleri, ama Türk kahvehanesi ve yetişkin zarafetiyle. "Karton" ya da "çocuksu" değil; dokunsal, sıcak, premium.

## Yapma
- Kalın siyah dış çizgiler, düz (flat) şeker renkler, çizgi film balonu fontları (Lilita/Fredoka tarzı)
- Doymuş ana renkler (saf kırmızı/mavi/sarı), neon
- Her şeyi zıplatan abartılı animasyonlar
- Animasyonlu `box-shadow`, `filter`, `backdrop-filter` (düşük cihazı yorar)

## Yap
- **Malzeme hissi:** cilalı ceviz ahşap, fırçalanmış pirinç/altın kenarlar, bordo kadife, yeşil çuha, krem parşömen
- **Işık ve derinlik:** üstten sıcak lamba ışığı; butonlarda üstte ince parlak çizgi, altta koyu pah (bevel); paneller hafif iç gölgeli
- **Tipografi:** Başlıklar *Playfair Display 900* (altın degrade, kazınmış gölge). Arayüz ve butonlar *Inter 800/900*, büyük harf, hafif harf aralığı. Sayılar Inter 900 sabit genişlik. Gövde metni Inter 500/600. Türkçe karakterler (ğ, ş, ı, İ) her yerde test edilmeli.
- **Mizah karakterlerde ve repliklerde olsun, arayüzde değil.**

## Palet
| Ad | Renk | Kullanım |
|---|---|---|
| Ceviz koyu | `#22140c` / `#2e1b10` | arka planlar, panel zemin |
| Ceviz orta | `#4a2c19` / `#6b4126` | panel üst yüzeyleri, ahşap degrade |
| Pirinç | `#c9a24a` · açık `#f3dc9a` · koyu `#8a6420` | kenarlar, birincil buton, ikonlar |
| Bordo | `#6e1a24` · koyu `#430d15` | ikincil buton, kurdeleler, kart arkası |
| Çuha | `#1f5c3d` · koyu `#123a26` | oyun alanı, başarı vurgusu |
| Parşömen | `#f4e7cc` · mürekkep `#2b1a10` | bilgi kartları, konuşma balonu |
| İznik turkuaz | `#1f6f78` | nadir vurgu (seviye, XP) |
| Uyarı | `#d2483c` · başarı `#3fae6a` | durum |

## Bileşenler
- **Birincil buton (pirinç):** degrade `#f6df97 → #d9a843 → #a8741f`; içte üst `inset 0 1px 0 rgba(255,255,255,.65)`; 1px koyu kenar `#5a3a10`; altta 4px pah (`0 4px 0 #6b4510`) + yumuşak dış gölge. Yazı `#3a2108`, kazınmış gölge `0 1px 0 rgba(255,240,200,.6)`. Basınca 3px aşağı iner, pah küçülür. Boştayken 4-5 sn'de bir soldan sağa ince parıltı geçer (yalnız transform).
- **İkincil buton (bordo kadife):** `#7a1f2b → #4f1018`, 1px pirinç kenar, krem yazı.
- **Panel:** ceviz zemin (degrade + ince damar dokusu), 2px pirinç iç çerçeve, köşelerde küçük pirinç süs, `0 18px 40px rgba(0,0,0,.55)` dış gölge.
- **Başlık kurdelesi:** bordo kurdele, uçları kesik, altın Playfair başlık.
- **Rozetler (seviye, jeton):** pirinç çerçeveli koyu kapsül; jeton ikonu altın sikke, ortasında lale.
- **Portre çerçevesi:** yuvarlak, kalın pirinç halka + ince koyu iç halka; sıra o oyuncudaysa halkada dönen yumuşak ışık.

## Hareket
- Yay (spring) hissi ama ölçülü: aşma ≤ %8, süre 180–350 ms, sıralı girişlerde 40–60 ms aralık.
- Ekran geçişleri: alttan 24px kayma + opaklık; modal açılışında %96 → %100 ölçek.
- Sayaçlar yukarı sayar (ease-out), jetonlar uçarak bakiyeye gider, kazanınca altın parçacıklar.
- Pişti anı: yavaş çekim, sarsıntı, kısa beyaz parlama (opaklık), altın patlama, "PİŞTİ!" damgası (ölçek 1.4 → 1, hafif dönme), konfeti.
- Boşta mikro hareketler: portre nefes alır (ölçek 1 ↔ 1.012, 4 sn), göz kırpar, jeton ikonu arada parlar.

## Performans
- Animasyonlarda yalnız `transform` ve `opacity`; hareketli öğelere `will-change: transform`.
- Görseller WebP/JPEG, 2x ekran için yeterli boyutta; ikonlar ≤ 256 px.
- Aynı anda çalışan sonsuz animasyon sayısı az (≤ 4).
