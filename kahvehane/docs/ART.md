# Kahvehane Pişti — Sanat ve arayüz yönergesi

**Tek cümle (kilitli yön, dikey):** Supercell / Monopoly GO cilası, sinematik sıcak ışık; koyu ceviz + kalın parlak altın çerçeveler, zengin yeşil çuha, tok yazılar. Oyunbaz ama premium; "karton", düz ya da bebeksi değil.

**Tek doğru kaynak:** Tüm renk, yazı, köşe, gölge ve degradeler `game/src/ui/theme.css` içinde değişken olarak durur. Yerleşim ve hareket `game/src/ui/ui.css`'te. Kaplama değişecekse yalnız `theme.css` düzenlenir.

## Ekran
- **Dikey** (telefon dik). Tasarım: 390×844 CSS px @3x; 360×780 ve 430×932'de de test edilir. Tablet dikeyde içerik ~30u genişlikte ortalanır.
- Ölçek birimi `--u` = clamp(12px, min(4vw, 2vh), 22px) → 390 genişlikte ≈ 15.6 px. Dokunma hedefi en az 44 px (`--tap`).
- Yatay tutulursa (kısa yükseklik) "Telefonu dik tut" uyarısı çıkar.

## Yapma
- Düz (flat) renk bloklar, gölgesiz/çerçevesiz "karton" kutular, ince ve soluk yazılar
- Neon, saf ana renkler (konfeti hariç)
- Her şeyi zıplatan abartılı animasyonlar; aşma ≤ %8
- Animasyonlu `box-shadow`, `filter`, `backdrop-filter` (düşük cihazı yorar)

## Yap
- **Malzeme:** koyu ceviz paneller, kalın parlak altın kenar (üstte ışık, altta pah), yeşil çuha, krem konuşma balonu
- **Işık ve derinlik:** sıcak, dramatik üst ışık; derin vinyet; altında parlama (glow); butonlarda üstte parlak şerit + altta koyu pah (3B basılabilir his)
- **Tipografi:** İsim, başlık, sayı ve butonlarda *Lilita One* (koyu konturlu; büyük başlıklar 3B altın degrade). Küçük metin *Nunito 700–900*. Türkçe harfler (İ ı Ş ş Ğ ğ Ç Ö Ü) her ekranda kontrol edilir.
- **Mizah karakterlerde ve repliklerde;** arayüz düzenli ve okunaklı.

## Palet (özet — kesin değerler theme.css'te)
| Ad | Renk | Kullanım |
|---|---|---|
| Ceviz | `#5a3519 → #2a170a` | panel, kapsül, şerit zemini |
| Altın kenar | `#fff6c4 · #ffd65a · #c98a1c · #9a6210` | tüm çerçeveler (degrade) |
| Altın dolgu | `#fff3a6 → #ffd23c → #f5a514 → #d97f06` | birincil buton, seçili segment |
| Yeşil (ikincil) | `#a8f070 → #4cc23c → #157320` | ikincil buton, seçili çip, "+" |
| Kırmızı | `#ffa08a → #f04a3a → #9a1418` | tehlike (Masadan Kalk), "Yakında" etiketi |
| İsim şeridi | `#2f8a3e → #124d1d` + altın kenar | rozet altındaki isim plakası |
| Seviye taşı | mavi `#2f7ae8` (ben) · mor `#8a4ae0` (rakip) | altıgen taş |
| Çuha | `#33a052 → #0e4720` | oyun masası, kural çizimleri |
| Krem balon | `#fff6e0`, kenar `#e3c98e`, yazı `#3a2210` | konuşma balonu |
| Metin | `#fff6e2` · ikincil `#ead6b0` · vurgu `#ffd66b` | |
| Konfeti | mavi `#3fa9f5`, yeşil `#5ad94c`, kırmızı `#ff4d6d`, sarı `#ffd34d`, mor `#b36bff` + altın sikke | pişti, ödül |

## Bileşenler
- **Birincil buton (altın):** parlak altın degrade, beyaz Lilita yazı + koyu kahve kontur, üstte cam parlaklığı, altta 5 px pah, sıcak dış ışıma. Basınca 3 px iner. Boştayken 4–5 sn'de bir parıltı geçer (yalnız transform). "OYNA", "Bir El Daha", "Topla", "Devam".
- **İkincil buton (yeşil)**, **tehlike (kırmızı)**, **sade (ceviz + altın kenar)** aynı biçimde.
- **Panel:** ceviz degrade + 3 px altın kenar + iç ince koyu çizgi + iç üst ışık + derin dış gölge. Başlık 3B altın yazı, altında altın çizgi ve küçük lale.
- **3B altın yazı (`.kh-g3`):** Lilita One; arkada kalın koyu kahve kontur + basamak gölge, önde çok duraklı altın degrade. PİŞTİ!, Kazandın!, pencere başlıkları. Sanat gelince `pisti_text.png` vb. kendiliğinden kullanılır.
- **Jeton kapsülü:** koyu kapsül + altın kenar, solda taşan altın sikke, Lilita sayı, sağda yeşil "+".
- **Oyuncu rozeti:** yuvarlak kalın altın halka içinde portre (rakip ~103 px, ben ~81 px), sol altta altıgen seviye taşı, altında yeşil isim şeridi, onun altında küçük sayaç (alınan kart, pişti). Sıra kimdeyse halkada dönen yeşil-altın ışık + parlama; rakip düşünürken yanında "düşünüyor •••" balonu. Tepki: rozetteki yüz kısa süre duygu görseline geçer + krem balon (kızgınsa buhar). 1'e 1: rakip üst orta, ben sol alt. 4 kişi: üst, sol, sağ, ben alt orta.
- **Çipler (oyun türü, masa bahsi):** ceviz + altın kenar; seçili olan yeşil parlak. Kilitliler soluk + kilit + kırmızı "Yakında"/"Sv. 4" etiketi.
- **Lobi rakip kartı:** sıcak ışıklı çerçeve, büst çerçevenin üstünden taşar; kilitli rakipler soluk + kilit.

## Hareket
- Yay (spring) hissi ama ölçülü: aşma ≤ %8, süre 180–450 ms, sıralı girişlerde 50–80 ms aralık.
- Ekran geçişleri: alttan kayma + opaklık; pencere açılışı %96 → %100 ölçek.
- Sayaçlar yukarı sayar (ease-out), jetonlar uçarak bakiyeye gider, satırlar tek tek açılır.
- Pişti anı: beyaz parlama (opaklık), altın ışınlar + parlama, "PİŞTİ!" damgası (ölçek 1.45 → 1, hafif dönme), "+10" zıplar, renkli konfeti + altın sikke patlaması. (3B sarsıntı/yavaş çekim masa tarafında.)
- Boşta mikro hareketler: portre nefes alır, 3–6 sn'de bir göz kırpar, OYNA'da parıltı, günlük ödül noktası nabız atar.

## Performans
- Animasyonlarda yalnız `transform` ve `opacity`; hareketli öğelere `will-change`.
- Çok kareli WAAPI animasyonlarında yumuşatma her aralığa ayrı uygulanır (`dom.ts → play`).
- Parçacıklar havuzdan (en çok 18 sikke + 40 konfeti + 6 puan baloncuğu); iş bitince gizlenir.
- `setDeck` her karede çağrılabilir: yalnız değişince tek bir `transform` yazar.
- Görseller WebP/PNG/JPEG, 2x ekran için yeterli; ikonlar ≤ 256 px. Aynı anda çalışan sonsuz animasyon ≤ 4.
