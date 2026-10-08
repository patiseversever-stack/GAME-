# KANAT — Oyun Tasarım Belgesi (GDD)

> Sürüm 1.1 · Oyun Tasarımcısı ajanı · Kaynak: `docs/BRIEF.md` (§1, §2, §2.10, §4.G.7, §9.G).
> **1.1 = F1 incelemesi uygulandı** (Kırmızı Takım + Oyuncu Paneli, 64 bulgu): kararların tamamı `docs/decisions/f1-review.md`, persona yanıtları `docs/PANEL.md`. Yeni kararlar K-17…K-28, S-14 (§10).
> Bu belge brifin uygulanabilir özetidir. Sayıların **tek kaynağı veri dosyalarıdır**; belge onları açıklar:
>
> | Veri | Dosya | Sahibi |
> |---|---|---|
> | Rota meta + dünya rampaları + 60 Usta Görevi | `src/content/meta/routes.meta.ts` | tasarım |
> | Kozmetikler (desen/palet/iz, SÜRÜ, rütbe ekleri) | `src/content/meta/cosmetics.ts` | tasarım |
> | 30 rozet + makine koşulları | `src/content/meta/badges.ts` | tasarım |
> | 25 kartpostal + çekim kuralları | `src/content/meta/postcards.ts` | tasarım |
> | XP, seviye eğrisi, ödüller, kilitler, lig, haftalık, günlük | `src/content/meta/progression.ts` | tasarım |
> | Uçuş istatistiği toplayıcı (görev/rozet girdisi) | `src/content/meta/flightStats.ts` | tasarım |
> | Çelişki kararları (makine okunur) | `src/content/meta/rulings.ts` | tasarım |
> | Özellik bayrakları + temiz kesim (gizle, asla "yakında") | `src/content/meta/features.ts` | tasarım |
> | Uçuş içi yardım, 🛟, bölüm çalışma, yumuşak sınır, iniş yol bulma, kontrol konforu | `src/content/meta/flightRules.ts` | tasarım |
> | FTUE zaman çizelgesi (veri; oynatıcı entegratörde) | `src/content/meta/ftue.ts` | tasarım |
> | Uçuş/puan sabitleri | `src/sim/data/tuning.ts` (`TUNING`) | flight |
> | SÜRÜ.io sim sabitleri, LP tablosu | `src/modes/suru/sim/config.ts` (`SURU`) | suru |
> | Rota geometrisi, uzman bot puanı | `src/content/routes/**` | flight |
>
> Kimlikler (desen, palet, iz, rozet, kartpostal `w{n}p{m}`) `src/ui/content.ts` ile birebir aynıdır; i18n anahtarları bu kimliklerden türer.
> Şema testi: `tests/unit/meta.test.ts` (sayılar, benzersizlik, kaynaklar, eğri, kilitler, lig, haftalık döngü, veri kayması koruması) + `tests/unit/meta.f1.test.ts` (Usta metni ↔ UI anahtarları, yardımsız görevler, ödül hatları, her bayrak kombinasyonunda ödül erişilebilirliği, Günün Rotası kuralları, yıldız kalibrasyonu, enerji bütçesi, FTUE zaman çizelgesi).

---

## 1. Vizyon (özet)

**Kanca:** "Anadolu'nun en güzel manzaralarında, kayalara 3 metre mesafeden 180 km/s ile süzül."
**Fantezi:** güç değil **ustalık ve cesaret** — kayanın 3 m yanından geçip paraşütü açmak ve hedef halkasının ortasına sessizce inmek.
**Tasarım sütunları:**
1. **Yakınlık = puan.** Her şey (puan, kombo, ses, kamera, haptik) yüzeye uzaklığa bağlıdır.
2. **Affedici risk.** Ölüm yok; sekme, yumuşak çarpma, < 1 sn'de yeniden deneme. "Bir daha" maliyeti < 1 sn.
3. **Gerçek yer.** Gerçek Anadolu arazisi; beş dünya oynanışta da farklı (kanyon slalomu / su üstü / bulut içi / sırt-korniş / ayna havuzlar).
4. **Paylaşılır an.** Her uçuş ≤ 8 sn vurgu klibi, Günün Rotası emoji kartı, sunucusuz Hayalet Düello kodu, SÜRÜ.io KUŞATMA anı.
5. **Suçluluksuz meta.** Enerji/bekleme, ganimet kutusu, şans, öde-kazan, reklamla hızlandırma, "serin bozuldu" yok.

---

## 2. Çekirdek döngüler

| Döngü | Süre | Akış |
|---|---|---|
| **Uçuş** | 60–120 sn | Rota seç → tanıtım (6 sn; 1. sn'den sonra dokunarak atla, tekrarlarda otomatik atlanır) → **Atla** → kanatlar 0,8. sn'de açılır → yakınlık zinciri kur → Kapı / Termal / Balon İlmeği → iniş bölgesinde **Paraşüt** → hedef halkasına iniş → sonuç + yıldız + vurgu klibi |
| **Çarpma** | < 4 sn | yumuşak çarpma (80 ms hit-stop) → son 3 sn sinematik tekrar (≤ 100 ms içinde başlar, dokunuşla atlanır) → < 1 sn'de rota başında kontrol. Aynı **bölümde** (iki kapı arası) 3 çarpma → tek dokunuş kart: Tam Yardım · Rehber Hat · **Bu bölümü çalış** (son kapıdan, ANTRENMAN, kayıt yok — K-26) |
| **Meta** | gün/hafta | yıldız → yeni dünya; Usta Görevleri → giysi kozmetikleri; Günün Rotası → paylaşım kartı → arkadaş Hayalet Düellosu → Rövanş Kodu; SÜRÜ.io turu → LP → lig; her şey → XP → Pilot Rütbesi |
| **Oturum** | 6–12 dk | 4–6 rota ya da 2–4 SÜRÜ.io turu; ilk oturum hedefi 15 dk |

**Kazanma/kaybetme:** kaybetme yoktur. Kariyer rotası **iniş** ile tamamlanır (⭐). İrtifa biterse "Yarım Uçuş" (puan gösterilir, yıldız/rekor yok).

---

## 3. Kontroller

### 3.1 Uçuş (portre, tek başparmak, "her yeri sürükle")
| Öğe | Değer | Kaynak |
|---|---|---|
| Çapa | dokunuşun başladığı yer; `v = (parmak − çapa)/R`, `R = 0,11 × kısa kenar` (~45 pt); |v| > 1 → çapa parmağı izler (yüzen çapa) | §2.2 |
| Ölü bölge | radyal 0,08, sonrası 0'dan yeniden ölçeklenir | §2.2 |
| Expo | `çıkış = işaret(x)·(e·|x|³ + (1−e)·|x|)`; yalpa e = 0,35, yunuslama e = 0,50; ayar 0–0,7 | §2.2 |
| Eşleme | yatay → yalpa, dikey → yunuslama; varsayılan **Doğal** (yukarı = burun yukarı), ayarda **Pilot** | §2.2 |
| Ters algılama | ilk kapıda 3 belirgin ters bastırma → tek dokunuş kartı "Ters mi? [Evet] [Hayır]" | §2.2 |
| Kuantizasyon | `sx, sy ∈ [−31, 31]` (6 bit, 30 Hz), ölü bölge+expo **önce** → canlı oyun = tekrar | §4.G.5 |
| Yatış / yalpa hızı | 65° / ≤ 150°/s, τ 0,12 s | K-02 |
| Yunuslama | C_L hedefi τ 0,15 s; burun hızı ≤ 55°/s | §2.2, §4.G.5 |
| **Bırak** | yatış → 0 ve C_L → C_trim, τ 0,4 s (yumuşak, her zaman güvenli) | K-01 |
| Hassasiyet | 0,6–1,5 (varsayılan 1,0) | §2.2 |
| Jiroskop | Kapalı / Yalpa / Tam; ölü bölge 3°, tam sapma 28°, 8 Hz alçak geçiren; nötr açı "Atla" anında | §2.2 |
| Sol el | Paraşüt/Duraklat ve HUD aynalanır | §2.2 |
| Yatay ekran | aynı şema + isteğe bağlı "İki Başparmak" (sol yarı yalpa, sağ yarı yunuslama) | §2.2 |

### 3.2 Paraşüt ve iniş
- **Bölge:** hedef çevresinde 250 m yarıçaplı silindir (`landing.zoneRadius`). Girince alt-sağda (sol elde alt-solda) 88×88 pt nabız atan **PARAŞÜT** butonu. Bölge dışında buton yok (Serbest Uçuş hariç).
- **Açılış** 1,2 sn. Kanopi altında yatay sürükleme = dönüş (≤ 35°/s), aşağı sürükleme = fren/flare.
- **Acil Paraşüt:** bölge dışında yer yüksekliği < 20 m → otomatik açılır → **Yarım Uçuş**. Bölge içinde < 20 m → otomatik açılır, **iniş geçerli** ama iniş bonusları yarıya iner, Cesur Açılış yok (K-11).
- **Otomatik Paraşüt** (erişilebilirlik): bölgede 75 m'de açar, iniş bonusları ×0,5, Cesur Açılış sayılmaz (K-12).
- **İnişe yol bulma** (F1, `LANDING_WAYFINDING`): son kapıdan sonra (ya da hedef < 1,5 km) kenar oku iniş hedefini paraşüt simgesiyle gösterir, altında "İNİŞ 820 m". Hedefte 2 km'den okunan yumuşak ışık sütunu + ince duman. Bölgeye girişte tek bip + 18 ms haptik + PARAŞÜT nabzı. Yarım Uçuş sonucunda mini harita (inilen nokta ↔ bölge) ve bağlamsal tek satır ("Termaller seni yükseltir").
- **Flare ipucu** (`FLARE_HINT`): Kariyer'de varsayılan açık, ayardan kapanır. 6 m'de yükseklik çubuğu ve kenar parlar, 3 m'de aşağı ok + 12 ms haptik. Yavaş Mod ve Otomatik Paraşüt pencereyi doğal olarak uzatır (ayar açıklamasında yazar).

### 3.3 Temas kuralı
- Yüzeye dik hız < 6 m/s → **sekme**: %25 hız kaybı, kombo kırılır, uçuş sürer.
- Dik hız ≥ 6 m/s → **çarpma** (şiddetsiz; pilot yuvarlanıp oturur).
- Su (y < 0) = yumuşak sıçrama çarpması.

### 3.4 Erişilebilirlik (tek bölümde toplanır — F1)
Ayarlarda **Erişilebilirlik** bölümü hepsini bir arada gösterir (diğer bölümlerde de görünebilirler): **Büyük yazı** (tüm arayüz: kök ölçek 1,0 / 1,2 / 1,4; en küçük metin 13 px, büyükte 15 px; < 16 px metin Inter; panel üstü soluk metin opaklığı ≥ 0,8; en parlak arka planda — Erciyes karı, Pamukkale travertenı — ≥ 4,5:1 kontrast) · Konfor Kamerası (yatış ×0,25, sarsıntı 0, FOV tavanı 75°) · Renk körlüğüne uygun renkler (Okabe-Ito) · Otomatik Paraşüt · **Yavaş Mod** ("Oyun %20 daha yavaş akar"; yalnız Kariyer ve Serbest; kartta 🐢 — K-08) · **Sakin kontrol** ön ayarı (çubuk yarıçapı 0,16 × kısa kenar, ölü bölge 0,12, hassasiyet 0,8, expo 0,5 — `CALM_CONTROLS`) · Flare ipucu · haptik Açık/Az/Kapalı · Uçuş Yardımı (Tam/Az/Kapalı) · Halka konumu (Alt/Orta).
- İşletim sisteminde *prefers-reduced-motion* açıksa Konfor Kamerası ve Hareketi azalt varsayılan açık gelir. İlk 3 uçuşta 2 erken çıkış (25 sn'den önce Duraklat → Çık) → bir kerelik "Daha sakin kamera?" kartı.
- İlk 3 uçuşta titreme benzeri hızlı küçük çubuk dönüşleri (≥ 6/sn, |eksen| ≤ 6/31, toplam 3 sn) → bir kerelik "Kontrol daha sakin olsun mu?" kartı (Sakin kontrol).
- Kaydırıcılar sayı değil sözle: "Daha sakin ↔ Daha çevik". Terimler sade dilde (§9).
- Yakınlık halkası başparmağın altında kalmasın: çubuk çapası halka dikdörtgenine düşerse halka 0,25 sn'de ~90 px yukarı kayar (`RING_PLACEMENT`).
- Tek el: Duraklat için iki parmakla dokunmak da yeter (tek çubuk şemalarında); sistem "geri" hareketi ve köprü `onBack` her ekranda çalışır; Büyük yazıda Geri alt çubuktadır.

### 3.5 Yumuşak sınır (görünmez duvar yok — K-26)
8 km çekirdeğin son 400 m'sinde karşı rüzgâr 0 → 8 m/s ve sis (görüş ≥ 300 m) artar, kenar oku rotayı gösterir. Kenarın ötesi: Kariyer'de otomatik kanopi → Yarım Uçuş; Serbest Uçuş'ta 3 sn geri sarma (`SOFT_BOUNDARY`).

---

## 4. Puanlama

### 4.1 Formül (sim zamanıyla, cihazdan bağımsız)
```
puan/sn = 100 × Ç(d) × (v / 150 km/s) × K
Ç(d):  d ≥ 30 → 0   |  < 30 → ×1  |  < 15 → ×2  |  < 7 → ×3  |  < 3 → ×5
       düz yüzeyde (su, eğim < 8°) en fazla ×3   (flatSurfaceMaxMult = 3)
K   = 1 + 0,15 × ⌊t_z / 2 sn⌋   (tavan 3,0);  t_z = kesintisiz d < 15 m süresi
      d ≥ 15 m'de > 1,5 sn kalmak veya sekme → K = 1,0
```
`d` = gövde kapsülünün en yakın yüzeye (arazi, prop, **su dahil**) mesafesi.

| Olay | Puan | Not |
|---|---|---|
| **Sıyırma** | +250 × Ç(d) | temassız d < 1,5 m, yerel minimum, V > 140 km/s; geçiş başına 1, aynı nesne 1 sn bekleme (K-03) |
| **Kapı** | +500 + min(100 × (n − 1), 1.000) | n = zincirdeki sıra; kaçırılan kapı zinciri sıfırlar |
| **Termal** | girişte +100 (termal başına 1 kez) | **termal sokağı**: rota çizgisi boyunca uzanan kapsül; w = 7·e^(−(r/R)²) m/s, r = eksen parçasına uzaklık; çekirdek uzunluğu W1 260 → W5 160 m (merkez geçişte ≈ 59 → 37 m yükseklik) (K-06, K-19) |
| **Balon İlmeği** | +750 × 1,5^(k−1), tavan ×3 | merkezleri ≤ 35 m iki balonun arasından, her birine ≤ 12 m; 4 sn içinde ardışık: 750 → 1.125 → 1.687 → 2.250 |
| **İniş** | hedef 2 / 5 / 10 m → +1.000 / +500 / +200 | Otomatik/Acil açılışta ×0,5 |
| **Yumuşak İniş** | +300 | yere 3 m kala flare |
| **Cesur Açılış** | +300 | elle, 60–90 m yer yüksekliğinde |

### 4.2 Çalışılmış örnek — W1·R2 Peri Bacaları Slalomu, 7 saniyelik kesit
| Zaman | Durum | Hesap | Puan |
|---|---|---|---|
| 0–2 sn | d = 12 m (×2), 165 km/s, t_z 0–2 → K 1,00 | 100 × 2 × 1,10 × 1,00 = 220/sn × 2 | 440 |
| 2–4 sn | aynı; t_z 2–4 → K 1,15 | 100 × 2 × 1,10 × 1,15 = 253/sn × 2 | 506 |
| 4–6 sn | d = 5 m (×3), 180 km/s, K 1,30 | 100 × 3 × 1,20 × 1,30 = 468/sn × 2 | 936 |
| 6,0 sn | **Sıyırma** — peri bacasına d = 1,2 m (eğimli kaya/prop → ×5) | 250 × 5 | 1.250 |
| 6–7 sn | d = 2,4 m (×5), 189 km/s, K 1,45 | 100 × 5 × 1,26 × 1,45 = 913,5/sn × 1 | 913,5 |
| 7,0 sn | **Kapı**, zincirde 3. | 500 + 100 × 2 | 700 |
| | | **Toplam** | **4.745** (ekranda tam sayıya yuvarlanmış) |

Ardından pilot 1,6 sn boyunca d = 20 m'de kalırsa K = 1,00'a döner (halka doygunluğunu kaybeder, inen iki ton).
**İniş örneği:** hedefe 3,2 m (5 m halkası +500) + flare (+300) + 72 m'de elle açılış (+300) = **+1.100**.
**Yıldız örneği:** Kılavuz (uzman bot) 52.000 → ⭐⭐ ≥ 26.000, ⭐⭐⭐ ≥ 44.200.
**XP örneği:** 31.400 puan, ilk kez 2 yıldız, 1 Usta Görevi → 31 + 400 + 300 = **731 XP**.

### 4.3 Yıldızlar
| Mod | ⭐ | ⭐⭐ | ⭐⭐⭐ |
|---|---|---|---|
| Kariyer / Haftalık / Düello (kariyer rotası) | iniş bölgesine paraşütle in | puan ≥ 0,50 × Kılavuz | puan ≥ 0,85 × Kılavuz |
| Günün Rotası | bitir | süre ≤ 1,12 × Kılavuz | süre ≤ 1,03 × Kılavuz **ve** ≥ 15 sn ×3+ |

Günün Rotası süresi = atlayış → ayak teması + kaçırılan kapı başına 2,0 sn. Eşikler yükleme anında `expertScore`'dan türetilir (`careerStarThresholds`), ikinci kez saklanmaz. Haftalık eşikler Kılavuz'un **değiştirici altında** uçtuğu puandandır (K-24).

**Kalibrasyon (K-25, `STAR_CALIBRATION`).** Oranlar (0,50 / 0,85) ve kilitler (6/15/26/38) brifte sabit; kalibre edilen Kılavuz ölçütüdür. Ortalama bot kabulü: W1–W3'ün her rotasında ≤ 3 denemede ⭐⭐; W4–W5 rotalarının ≥ %50'sinde ⭐⭐; rota başına en iyi 5 denemeyle her dünya kilidine yalnız önceki dünyalardan ulaşır (Σ W1 ≥ 6 · W1–2 ≥ 15 · W1–3 ≥ 26 · W1–4 ≥ 38). Not: her rotada 2⭐ ile W1–3 = 24 < 26 ve W1–4 = 32 < 38 — ortalama oyuncunun birkaç ⭐⭐⭐ alabilmesi şarttır. Tutmazsa Kılavuz açıklığı +4 → +6 m ve/veya 5 Kılavuz koşusunun medyanı. Sonuç ekranı ve menü "Likya'ya 3 ⭐" ilerlemesini gösterir (`nextWorldLock`).

### 4.4 Bot politikaları (§9.G; yıldız eşiklerinin kalibrasyonu)
Oyuncuya görünen ad: uzman bot = **Kılavuz Pilot** (kısaca Kılavuz; K-27). Sahip: F1 incelemesiyle flight ya da ayrı bot+rota ajanı (`src/sim/bot/**`, saf). Arayüz: `BotController.next(state, route, sampler, tick) → Command[]`. Denetleyici **enerji farkında**dır: yalnız y'yi PD ile izlemez, çizginin xz yolunda AGL'yi enerji zarfı içinde tutar (termal sokaklarını kaynak olarak planlar). Rota başına `expertScore`, `expertTimeSec` ve `expertGhost` (rota aracının ürettiği K1 kodu) yazılır; bu tek kod Kılavuz hayaletini, Rehber Hat'ı, uzman e2e oynatımını ve puan doğrulamasını besler. Her `expertGhost` güncel `SIM_VERSION`'a karşı yeniden doğrulanır (her ayar değişikliği geçersiz kılar → araç yeniden koşar).

| Bot | Çizgi | Termal | İlmek | Paraşüt | Kabul |
|---|---|---|---|---|---|
| **Dikkatli** | ideal çizgi, yüzeyden +18 m | kullanmaz | aramaz | bölgeye girince 110 m | 20 rotanın hepsini bitirir, ≥ 1⭐ (1⭐ eşiği ≤ dikkatli puanı) |
| **Ortalama oyuncu** | +10 m, ±3 m yanal gürültü, 250 ms gecikme | %50 | yoldaysa | 80–110 m | K-25 kalibrasyon kabulü (W1–W3 ⭐⭐ ≤ 3 deneme; kilitlere ulaşım); 365 Günün Rotası'nın hepsini ≥ ⭐ bitirir (K-18) |
| **Kılavuz (uzman)** | +4 m (kalibrasyonda ≤ +6 m) | sokakları planlar | arar | 70–80 m elle + flare | her rotada 3⭐; `expertScore` = 5 koşunun medyanı; `expertTimeSec`; süre `targetDurationSec` içinde |
| **Gürültü** | rastgele girdi | — | — | — | 1.000 koşu: istisna/NaN 0, her çarpma < 1 sn'de yeniden denenebilir |

---

## 5. Modlar

### 5.1 Mod 1 — Kariyer: 5 dünya × 4 rota = 20 rota, 60 yıldız
Her rota 60–120 sn, 3 yıldız, 3 Usta Görevi, en az iki çizgi seçeneği (güvenli üst hat / riskli kanyon hattı). Rota içi açılış: dünya açıkken R1 açık; R(n+1), R(n)'e inilince açılır. W1·R1–R3'te Rehber Rüzgâr varsayılan açık.

| Rota | Ad (TR / EN) | Zorluk | Başlangıç | Kapı R (m) | Min kapı | Termal (adet / R / w0) | Rüzgâr | Hedef süre (s) | Özellikler | Rehber |
|---|---|---|---|---|---|---|---|---|---|---|
| w1r1 | İlk Atlayış / First Jump | 1 | balon | 14 | 7 | 3 / 55 / 7 | 0 | **45–55** (K-19 istisnası) | balloons, chimneys, vineyardLanding | açık |
| w1r2 | Peri Bacaları Slalomu / Fairy Chimney Slalom | 2 | balon | 14 | 8 | 3 / 55 / 7 | 0 | 65–85 | chimneys, canyon | açık |
| w1r3 | Balon Yolu / Balloon Road | 3 | balon | 14 | 9 | 3 / 55 / 7 | 0 | 70–90 | balloons, chimneys | açık |
| w1r4 | Güvercinlik Kanyonu / Pigeon Valley Canyon | 4 | balon | 14 | 10 | 3 / 55 / 7 | 0 | 75–95 | canyon, chimneys | — |
| w2r1 | Yalıyar Süzülüşü / Cliffside Glide | 3 | ucurum | 12,75 | 9 | 2 / 50 / 7 | 1,5 | 70–90 | seaCliff, water | — |
| w2r2 | Gulet Koyu / Gulet Cove | 4 | ucurum | 12,75 | 10 | 2 / 50 / 7 | 1,5 | 75–95 | water, gulets, seaCliff | — |
| w2r3 | Kaya Kemeri / Rock Arch | 5 | ucurum | 12,75 | 11 | 2 / 50 / 7 | 1,5 | 80–100 | rockArch, water, seaCliff | — |
| w2r4 | Mezar Cepheleri Hattı / Tomb Façade Line | 6 | ucurum | 12,75 | 12 | 2 / 50 / 7 | 1,5 | 85–105 | tombs, seaCliff, lighthouse | — |
| w3r1 | Bulut Denizi / Sea of Clouds | 4 | sirt | 11,5 | 10 | 2 / 45 / 7 | 3 | 75–95 | cloudSea, spruce, waterfall | — |
| w3r2 | Ladin Koridoru / Spruce Corridor | 5 | sirt | 11,5 | 11 | 2 / 45 / 7 | 3 | 80–100 | spruce | — |
| w3r3 | Şelale Perdesi / Waterfall Curtain | 6 | sirt | 11,5 | 12 | 2 / 45 / 7 | 3 | 85–105 | waterfall, spruce | — |
| w3r4 | Yayla Alçak Geçişi / Highland Low Pass | 7 | sirt | 11,5 | 13 | 2 / 45 / 7 | 3 | 90–110 | highlandHouses, spruce | — |
| w4r1 | Kar Sırtı / Snow Ridge | 5 | sirt | 10,25 | 11 | 1 / 40 / 7 | 4 | 80–100 | snowRidge | — |
| w4r2 | Korniş Kenarı / Cornice Edge | 6 | sirt | 10,25 | 12 | 1 / 40 / 7 | 4 | 85–105 | cornice, snowRidge | — |
| w4r3 | Buzul Oluğu / Glacier Gully | 7 | sirt | 10,25 | 13 | 1 / 40 / 7 | 4 | 90–110 | gully, snowRidge | — |
| w4r4 | Zirve İnişi / Summit Descent | 8 | sirt | 10,25 | 14 | 1 / 40 / 7 | 4 | 95–115 | summit, snowRidge, cornice | — |
| w5r1 | Traverten Basamakları / Travertine Terraces | 6 | balon | 9 | 12 | 1 / 35 / 7 | 4 | 85–105 | balloons, travertine | — |
| w5r2 | Antik Tiyatro Üstü / Over the Ancient Theatre | 7 | balon | 9 | 13 | 1 / 35 / 7 | 4 | 90–110 | theatre, columns, travertine | — |
| w5r3 | Ayna Havuzlar / Mirror Pools | 8 | balon | 9 | 14 | 1 / 35 / 7 | 4 | 95–115 | pools, travertine, balloons | — |
| w5r4 | Gün Batımı Finali / Sunset Finale | 9 | balon | 9 | 15 | 1 / 35 / 7 | 4 | 100–120 | balloons, travertine, pools, columns | — |

Termal sütunu: adet / R / w0; termaller **sokak** biçimindedir (çekirdek uzunluğu W1 260 · W2 230 · W3 200 · W4 180 · W5 160 m, rota çizgisine hizalı).

**w1r1 elle yazım şartnamesi (F1, K-28 — dikey dilimi hemen açar):** balon sepeti bağ platosundaki iniş hedefinin ~280–400 m üstünde (`energy.startAboveLandingM`); atlayıştan ~1,5 sn sonra hafif solda ilk kapı (vadi ağzı); 6 sn'de vadi daralır, peri bacaları (×2/×3); 12–16 sn'de iki bacanın arasından ~1,2 m'lik betikli Sıyırma aralığı; ~16 sn'de merkezleri ≤ 35 m iki balonlu çift (Usta w1r1-u1); ~20 sn'de vadi açılır, hedef halkası + ufuk + balonlar tek karede; ~24 sn'de iniş bölgesine giriş (250 m); flare ve iniş ≈ 46 sn (atlayıştan). En az 7 kapı; 3 termal sokağından biri ana çizginin üstünde.

**Rota üretim kuralları (flight rota aracı için):** kapı sayısı ≥ `minGates`; zincir görevi varsa ≥ değer + 2 kapı. **Enerji bütçesi** (`energy`): başlangıç − iniş yüksekliği `startAboveLandingM` aralığında; kaldırma kaynakları `liftSources` (başlangıç, termal sokağı, rüzgârlı dünyalarda yamaç); Kılavuz botu bütçeyi uçarak kanıtlar. Balon İlmeği görevi olan rotada çizgi boyunca ≥ `minBalloonPairs` uygun çift (merkezler ≤ 35 m). Uzman bot süresi `targetDurationSec` içinde. `features` listesindeki her öğe çizginin yakınlık fırsatı olmalı. Kartpostalların `nearRoute` rotası, kartpostalın 150 m yakınından geçmeli (keşif ipucu).

### 5.2 Mod 2 — Günün Rotası
- Herkese aynı, her gün yeni. `seed = fnv1a32("KANAT-GR-" + yyyymmdd)` (Europe/Istanbul, UTC+3); numara `#N` = yayın gününden bu yana gün + 1.
- Üretim: dünya seed ile döner; vadileri izleyen spline; 12–20 kapı, kapılar arası 6–12 sn; 1–3 termal (sokak); rüzgâr 0–3 m/s (brif zarfı 0–6'nın alt kümesi, K-18); bot süresi 90–150 sn; ≥ 3 yakınlık fırsatı; hiçbir kapı yüzeye 4 m'den yakın değil. Sunmadan önce Kılavuz uçar; başarısızsa `seed+1`.
- **Zorluk haftanın gününe göre:** Pzt 3 · Sal 4 · Çar 4 · Per 5 · Cum 6 · Cmt 6 · Paz 7.
- Kurallar: zamana karşı; kapılar zorunlu, kaçırılan her kapı +2,0 sn; sınırsız deneme, en iyisi paylaşılır. Yavaş Mod kapalı (K-08).
- **Yeni oyuncu ve kilitler (K-18):** Günün Rotası dünya kilidini yok sayar (sonraki dünyanın tadı). Her dünyada sabit erişilebilir kural seti: kapı yarıçapı 14 m, rüzgâr ≤ 3 m/s, ilk denemelerde Tam Yardım teklif edilir (🛟 yalnız devreye girerse). Günün zorluğu yalnız çizgiyle: alçak hat payı %25 → %55, kapılar arası dönüş 25° → 60°, yakınlık fırsatı açıklığı 12 → 6 m (Pzt 3 → Paz 7).
- **Üretim yeri:** yükleme sırasında ya da Worker'da (menü iş parçacığında asla); rota + Kılavuz süresi `daily:<yyyymmdd>:<SIM_VERSION>` anahtarıyla kayda önbelleklenir. Test: 365 tarihin en kötüsü 4× kısıtlamada yükleme bütçesi içinde.
- **Yakınlık şeridi:** spline 5 eşit parçaya bölünür; her parçada en çok zaman geçirilen kademe: ⬜ (> 30 m) 🟩 ×1 🟨 ×2 🟧 ×3 🟥 ×5.
- **Kart (birebir):** `KANAT · Günün Rotası #214 🪂 2:07.4 · Yakınlık 🟨🟨🟧🟥🟥 · ⭐⭐⭐` · isteğe bağlı 2. satır `Düello: KNT1-G214-…` · yardım kullanıldıysa sonda `🛟`.
- XP: günün ilk bitirişi +500 (+ puan/1.000); sonraki denemeler yalnız puan/1.000.

### 5.3 Mod 3 — Hayalet Düello
- Sonuç ekranında **Düello Kodu** → köprüyle paylaş / kopyala. Alıcı yapıştırır veya derin bağlantıyla açar → "Ayşe'nin hayaleti · Günün Rotası #214 · 2:07.4" kartı → yarış.
- **Paylaşılan metin insan cümlesidir + tek dokunuşluk bağlantı** (F1): "Ayşe seni KANAT'ta düelloya çağırdı · Günün Rotası #214 · 2:07.4 → <derin bağlantı ?c=KNT1-…>". Host bağlantıyı açar (uygulama yoksa mağaza); kod bağlantının içindedir, elle yapıştırma yedek yoldur; uygulama bağlantıyla açılırsa düello ekranı kod dolu açılır. Günün Rotası kartının birebir 1. satırı değişmez; bağlantı isteğe bağlı 2. satırda.
- **Kodun taşıdığı sim seçenekleri** (F1 P0): yardım kademesi (Kapalı/Az/Tam/Rehber, 2 bit), Otomatik Paraşüt, Yavaş Mod, Haftalık için mod 3 + değiştirici + hafta; 🛟 gösterim bayrağı `assistUsed`'dan ayrı. Her kombinasyon kaydet → kodla → çöz → yeniden simüle → aynı hash (özellik testi).
- **Kod:** kanonik `K1.` + base64url (§4.G.8 ikili biçim, crc32, SIM_VERSION, finalStateHash); paylaşılan biçim `KNT1-<etiket>-<gövde>` (`G214` Günün Rotası, `W1R3` Kariyer). Çözücü ikisini de kabul eder; hileli/bozuk kod yeniden simülasyonla reddedilir ("Kod geçersiz" / "farklı sürüm"). Kabul sınırı ≤ 3.000 karakter, tasarım hedefi ≤ 600 (K-07).
- Metrik modun metriğidir (Günün Rotası → süre, Kariyer → puan). Hayalet yarı saydam, parlak konturlu, adı ve **Hayalet Rengi** ile (kozmetik); çarpışma yok; her kapıda fark ("−0,42"); en fazla 3 hayalet: kişisel en iyi, rakip, **Kılavuz**. Hayaletler yüklemede başsız önceden simüle edilir (`GhostTrack`: konum/yönelim dizileri + kapı tickleri); render ve HUD yalnız izi okur. Rota kartında hayalet seçimi: Yok / En iyim / Kılavuz.
- Sonuç: "Kazandın · 0,8 sn" + **Rövanş Kodu**. Kod alındığında mod ve dünya kilidi yok sayılır (tek seferlik).

### 5.4 Mod 4 — Serbest Uçuş + Foto Modu
- Açılmış her dünyada; başarısızlık yok: çarpma → 3 sn geri sarma; paraşüt her yerde; kapı/puan yok; müzik "Sakin" katmanı. XP vermez (zen).
- **Kartpostal:** dünya başına 5, toplam 25. 150 m'de havada ince çerçeve parıltısı. Koleksiyon için Foto Modu'nda: kamera ≤ 120 m, konu karenin merkez %60'ında, 5 ışından ≥ 4'ü görünür. Bir dünyanın 5 kartı = o dünyanın **imza deseni**.
- **Foto Modu** (Serbest Uçuş ve Kariyer duraklatma; Günün Rotası/Düello'da yalnız uçuş sonrası tekrarda): sim donar; serbest kamera 30 m; FOV 20–90°; yatış ±15°; pozlama ±2 EV; alan derinliği; 6 filtre (Doğal başlangıçta; diğerleri **toplanan kartpostalla**: Altın Saat 1 · Belgesel 2 · Kartpostal 4 · Soğuk Sabah 7 · Siyah-Beyaz 10 — K-23); film greni; çerçeve/logo; HUD gizli; galeriye kaydet.
- **Kartpostal konumları:** terrain ajanı / rota aracı `public/worlds/<id>/postcards.json` üretir (`{id, pos, subjectRadiusM, idealCam}`); sözleşme `validatePostcardAnchors` (5 kimlik, kamera ≤ 120 m, arazi altında değil).

| Kimlik | Kartpostal (TR / EN) | Çerçeve türü | Yerleşim ipucu | Yön | Yakın rota |
|---|---|---|---|---|---|
| w1p1 | Güvercinlik Şafağı / Pigeon Valley Dawn | `valley-dawn` | Güvercinlik Vadisi ağzı, güneş vadinin ekseninde | sun | w1r4 |
| w1p2 | Üçgüzeller / The Three Beauties | `rock-trio` | Yan yana duran üç şapkalı peri bacası | away | w1r2 |
| w1p3 | Kızılçukur / Red Valley | `red-valley` | Gül tüf yamaçlı derin vadi, sırt üstünden | away | w1r4 |
| w1p4 | Balon Tarlası / Balloon Field | `balloon-field` | En yoğun balon kümesi, ufuk çizgisi kadrajda | sun | w1r3 |
| w1p5 | Uçhisar Silueti / Uçhisar Silhouette | `castle-rock` | En yüksek kaya kütlesi, güneşe karşı siluet | sun | w1r1 |
| w2p1 | Gizli Koy / Hidden Cove | `hidden-cove` | Yalıyarlarla çevrili küçük kumsal | away | w2r1 |
| w2p2 | Kaya Mezarları / Rock Tombs | `rock-tombs` | Cephe mezarlarının en sık olduğu kaya duvarı | away | w2r4 |
| w2p3 | Gulet Limanı / Gulet Harbour | `gulet-harbour` | Demir atmış gulet grubu, koy içinden | away | w2r2 |
| w2p4 | Kaya Kemeri / Rock Arch | `rock-arch` | Kemerin içinden denize bakış | sun | w2r3 |
| w2p5 | Yalıyar Feneri / Cliffside Lighthouse | `lighthouse` | Burun ucundaki fener, açık deniz arkada | sun | w2r4 |
| w3p1 | Bulut Denizi / Sea of Clouds | `cloud-sea` | Bulut tavanının hemen üstü, sırtlar adacık gibi | sun | w3r1 |
| w3p2 | Şelale Perdesi / Waterfall Curtain | `waterfall` | Ana şelale, sis bulutu dahil | away | w3r3 |
| w3p3 | Yayla Sabahı / Highland Morning | `highland-village` | Ahşap yayla evleri kümesi, sisli çayır | away | w3r4 |
| w3p4 | Ladin Katedrali / Spruce Cathedral | `spruce-forest` | En uzun ladinlerin oluşturduğu koridor | sun | w3r2 |
| w3p5 | Göl Aynası / Lake Mirror | `lake-mirror` | En geniş durgun su yüzeyi (göl yoksa dere göleti) | away | w3r4 |
| w4p1 | Zirve Sırtı / Summit Ridge | `summit-ridge` | Zirveye çıkan ana sırt, alçak güneşle | away | w4r4 |
| w4p2 | Buz Kornişi / Ice Cornice | `ice-cornice` | En belirgin korniş çıkıntısı, rüzgâraltından | sun | w4r2 |
| w4p3 | Kar Dalgası / Snow Wave | `snow-wave` | Rüzgârın oyduğu kar dalgaları olan geniş yamaç | away | w4r1 |
| w4p4 | Gölge Vadisi / Shadow Valley | `shadow-valley` | Uzun mavi gölgeli derin oluk | sun | w4r3 |
| w4p5 | Yıldız Tozu / Stardust | `sparkle-slope` | Güneşe karşı parıldayan kar yamacı | sun | w4r1 |
| w5p1 | Traverten Basamakları / Travertine Terraces | `travertine-terraces` | Basamakların en geniş yelpazesi | sun | w5r1 |
| w5p2 | Ayna Havuzlar / Mirror Pools | `mirror-pools` | Gün batımını yansıtan havuz dizisi | sun | w5r3 |
| w5p3 | Antik Tiyatro / Ancient Theatre | `ancient-theatre` | Tiyatro basamak yayı, sahne merkezde | away | w5r2 |
| w5p4 | Kızıl Ufuk / Crimson Horizon | `sunset-horizon` | Batıya açık sırt, güneş ufka değerken | sun | w5r4 |
| w5p5 | Son Işık / Last Light | `last-light` | Sütun kalıntıları, son ışık arkadan | sun | w5r4 |

### 5.5 Mod 5 — SÜRÜ.io (mini-GDD)
**Kanca:** "Gün batarken binlerce sığırcığı tek parmakla yönet; rakip sürüleri yeme — ikna et, kuşat, kendi rengine çevir." Kimse ölmez, kimse yenmez; büyüme yoğunluk, formasyon ve kuşatmayla gelir; tur gün batımıyla biter; kontrol bir **nefes ritmidir**.

**Tur (3:00 sim zamanı):**
| Zaman | Olay |
|---|---|
| 0:00–0:15 | Doğuş: her sürü lider + 15 takipçi, arenaya dengeli; yabani gruplar bol |
| 0:15–2:15 | Orta oyun. Doğan 0:40'ta, sonra her 30 ± 5 sn. Fırtına bulutu 1:00'de. Rüzgâr hamlesi her 25–40 sn |
| 2:15 | Deniz feneri yanar; Gün Batımı Halkası daralmaya başlar |
| 2:15–3:00 | Halka yarıçapı 300 → 110 m doğrusal (S-05). Dışarıdaki takipçiler %3/sn yabanileşir, kuşlar ve lider içe itilir (S-06) |
| 3:00 | Güneş batar → en büyük sürü kazanır (ya da daha önce son ayakta kalan) |

**Arena:** ~600 m çaplı gün batımı körfezi (sınır 640 × 640 m); 4 sazlık adacığı (yabani doğuşu), 1 deniz feneri (akış engeli), kayalıklar (rüzgâr gölgesi). Düzenler: Sazlık Körfezi, Fener Burnu, Taşlı Koy + seeded Sürü Günü.

**Kontroller:** sürükle = yön (göreli çubuk, ölü bölge 0,10). **BASILI TUT = Sıkı Dizi:** lider hızı ×1,25, yerel yoğunluk ağırlığı ×1,6, Doğan dağıtması yarıya, Nefes −14/sn. **BIRAK = Geniş Kanat:** yarıçap ~2,2×, hız ×0,90, yakalama yarıçapı büyür, Nefes +22/sn (gecikmesiz). Nefes 0 → 25'e dolana kadar Sıkı bonusu yok (S-01). Yatay/erişilebilirlik: "İki Başparmak".

**Kurallar ve sayılar (kararlar uygulanmış):**
| Kural | Değer |
|---|---|
| Kuş havuzu | 1.500, tüm kademelerde sabit, korunumlu (kuş ölmez, sahip değiştirir) |
| Sürü sayısı | 12–16 (oyuncu + 11–15 YZ); başlangıç 16 kuş/sürü, kalanı 5–30'luk yabani gruplar |
| Lider hızı | 12 m/s; Sıkı ×1,25; Geniş ×0,90; Yalnız ×1,30 (5 sn) (S-02) |
| Dönüş hızı | ω = 140°/s × clamp(√(20/N), 0,35, 1) (S-03) |
| Sürü yarıçapı | r = k√N; Sıkı k 0,6, Geniş k 1,3 (400 kuş: 12 / 26 m) |
| Yabani yakalama | grup merkezi lidere r + 4 m → grup bütün katılır (S-07) |
| Temas savaşı | 6 m çekirdek, frontier kuşlar; ağırlık Sıkı ×1,6, kendi liderine ≤ 12 m ×1,3, yabani 0; D ≥ 0,62 ise λ = 2,2·(D − 0,5)/sn; değişiklikler tick sonunda; lider dönüşmez (S-08) |
| KUŞATMA | rakip lider çevresinde [max(4, 0,6·R_B), 35] m halka, 36 dilim, ≥ 30 dolu (≥ 300°), B'nin ≥ %70'i halka içinde, **0,5 sn** → B'nin tümü 1,5 sn'de dalga halinde döner; ilerleme yayı canlı (S-04) |
| Eleme | takipçisi 0 → "Yalnız" 5 sn (+%30 hız); düşman çekirdeği (4 m'de ≥ 8 kuş) ya da düşman lider ≤ 3 m değerse elenir; lider uçup gider (S-10) |
| Doğan | en büyük sürüyü hedefler; 2,0 sn önce gölge + ıslık; kenar kuşlarının %6–12'sini 40 m öteye ürkütür → yabani (kimse zarar görmez); Sıkı Dizi dağılmayı yarıya indirir (S-09) |
| Rüzgâr hamlesi | her 25–40 sn, 120 m bant, 3 sn, 6 m/s; 2 sn önce su dalgacıklarıyla belli |
| Fırtına bulutu | 45 m, seeded yol 3 m/s; içeride takipçiler %4/sn dağılır, Nefes dolmaz (S-11) |
| Sıralama | bitişte sürü büyüklüğü; elenenler eleme sırasına göre |
| Tur sonu | sonuç → < 2 sn'de yeni tur; isteğe bağlı "İzle" |

**YZ sürüleri** ("Yapay zekâ sürüleri" etiketi, her adın yanında "YZ"; adlar doğa sözcükleri). YZ oyuncuyla aynı komutları üretir; fayda puanlaması, argmax + 0,15 histerezis, ≥ 1 sn bağlılık.
| Kişilik | Davranış | greed | aggr | courage | ring | opp | tepki tabanı |
|---|---|---|---|---|---|---|---|
| Toplayıcı | yabani kovalar, 1,5× küçük değilse kavgadan kaçar | 1,4 | 0,4 | 0,5 | 0,3 | 0,2 | 250 ms |
| Avcı | 0,6–0,9× büyüklüktekilere Sıkı Dizi ile dalar | 0,7 | 1,5 | 0,9 | 0,6 | 0,4 | 180 ms |
| Ürkek | büyüklerden kaçar, sazlığa saklanır | 1,1 | 0,2 | 0,2 | 0,1 | 0,3 | 300 ms |
| Kuşatıcı | küçük sürünün liderine görünür yay formasyonu | 0,8 | 0,9 | 0,7 | 1,6 | 0,3 | 200 ms |
| Fırsatçı | kavgada zayıflayana üçüncü taraf, Doğan sonrası toplar | 0,9 | 0,6 | 0,6 | 0,6 | 1,6 | 220 ms |

**Lig zorluğu (S-13):**
| Lig | Tepki ofseti (ort. tepki) | Karar aralığı | Yön gürültüsü | ring × |
|---|---|---|---|---|
| Bronz | +220 ms (450 ms) | 7 tick (4,3 Hz) | ±15° | 0,5 |
| Gümüş | +150 ms (380 ms) | 6 tick (5 Hz) | ±12° | 0,7 |
| Altın | +85 ms (315 ms) | 5 tick (6 Hz) | ±9° | 0,85 |
| Platin | +15 ms (245 ms) | 4 tick (7,5 Hz) | ±6,5° | 1,0 |
| Elmas | −50 ms (180 ms) | 3 tick (10 Hz) | ±4° | 1,2 |

**Lig puanı (yalnız Lig Maçı):** 1. +30, 2. +22, 3. +16, 4. +12, 5–8. +6/+4/+3/+2, 9–12. 0/−1/−2/−4, 13–16. −6/−7/−8/−10; her Kuşatma +3 (tavan +9). 16'dan az sürüde sıra 16'lık tabloya ölçeklenir. Ligler Bronz → Gümüş → Altın → Platin → Elmas, her biri 300 LP; terfide artan LP devreder; **düşme yok**, lig içinde LP 0'ın altına inmez; Elmas'ta LP sınırsız birikir.
**XP:** Lig Maçı ve Sürü Günü 1. → 400 … son → 100 (doğrusal); Antrenman sabit 100.
**Alt modlar:** Lig Maçı · Sürü Günü (herkese aynı seeded arena, sınırsız deneme, en iyisi paylaşılır) · Antrenman (yalnız Ürkek/Toplayıcı).
**FTUE (45 sn, metinsiz):** (1) hayalet başparmak → yakın yabani gruba git, katılmalarını izle; (2) bırak → sürü açılır, iki grup birden katılır; basılı tut → sıkışır, hızlanır, Nefes yayı görünür; (3) uyuyan küçük Ürkek sürünün çevresinde ışıklı yay → halkayı tamamla → ilk KUŞATMA. Sonra gerçek tur (Bronz).
**Kart:** `KANAT · SÜRÜ.io · Sürü Günü #214 🐦 1./15 · Zirve 486 kuş · 🌀 Kuşatma ×2 · 🌅 Gün batımına kadar ayakta`. **Vurgu klibi:** turun en büyük KUŞATMA'sı ya da en büyük tek dönüşüm dalgası (≤ 8 sn).
**Kozmetik (yalnız görsel, SÜRÜ oynayarak açılır — K-23):** lider tüy parıltısı 8 · aura **iç motifi** 8 (kenar stili ve sahip rengi sistemindir — S-12) · lider izi 8 · tur sonu Sürü Gösterisi şekli 6. Her hattın ilki başlangıçta açık; kalan 26 öğe biten tur sayısıyla (1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 50, 60, 70, 85, 100) ve lig terfileriyle (Gümüş → Sarmal, Altın → Güneş aurası, Platin → Yıldız Tozu parıltısı, Elmas → Sonsuzluk) açılır (`suruTrackUnlocked`). Oyuncu rengi daima Altın #FFC23D.
**Kendi sürünü tanıma (F1):** oyuncu liderinde çift halka; tur başında 3 sn "SEN" etiketi; lider ekran dışındaysa kenar oku. #E69F00 turuncusu rakiplere en son atanır, doğuşta oyuncunun yanına konmaz; atanırsa noktalı aura kenarıyla.
**Nefes göstergesi (F1):** yay parmağın altında değil, ekrandaki liderin çevresinde (ya da çapanın ~60 pt yukarısında); Nefes bitince yay kırmızıya döner + tek haptik. FTUE 2. adımda metin yerine iki ikon: açık el = Geniş, yumruk = Sıkı.
**Kartopu frenleri (S-14):** Doğan ürküttüğü kuşları sürünün kenarından 40 m öteye atar (lider merkezinden r + 40 m, sahibin yönünden uzağa) ve bu kuşlar 7 sn eski sahibine katılamaz; başarılı KUŞATMA saldıranın Nefes'ini 0'a indirir + 6 sn yeni kuşatma beklemesi; dönüş tabanı 0,35 (500 turluk YZ dengesi %65 hedefini tutmazsa 0,15).
**Lig anlamı (F1):** lig rozeti inmez (suçluluksuz); Elmas'ta ayrıca "son 20 tur ortalama sıra" beceri göstergesi (inebilir, `skillIndex`). Lobide "bugünün en iyisi" geçmişi; sonuçta "YZ ortalamasına göre" yüzde.
**Denge hedefleri (9.G-26):** her kişilik %10–30 kazanma; 1. dakikanın en büyüğü sonda ≤ %65 kazanır; "ortalama oyuncu" botu Bronz'da %35–50, Elmas'ta %8–15; yeni oyuncu Bronz'da ilk 5 turda ≥ 1 kez ilk 3.

---

## 6. Meta ve ilerleme

### 6.1 XP kaynakları
| Kaynak | XP | Kural |
|---|---|---|
| Puan | ⌊puan / 1.000⌋ | her bitmiş uçuş (Kariyer, Haftalık, Düello, Günün Rotası) |
| Yıldız | 200 / **yeni** yıldız | tekrarlar yıldız XP'si vermez (K-16) |
| Usta Görevi | 300 / görev | 60 görev = 18.000 |
| Günün Rotası | 500 | günün ilk bitirişi |
| SÜRÜ.io turu | 100–400 | sıraya göre doğrusal; Antrenman 100 |
| Serbest Uçuş | 0 | zen modu |
| Bölüm çalışma (ANTRENMAN) | 0 | yıldız/rekor/görev/rozet yazılmaz (K-26) |

### 6.2 Seviye eğrisi (Pilot Rütbesi 1–50)
`XP(L) = round10(380·n + 17,5·n²)`, `n = L − 1`. Artışlar her seviyede 35 XP büyür (kesin artan).
Tempo kanıtı: **L2 = 400** (FTUE uçuşu ⭐⭐ + ~20 puan XP) · **L5 = 1.800** (ilk ~15 dk: 4 W1 rotası ~2⭐, 8 uçuş, 1 Usta, ilk Günün Rotası) · **L35 = 33.150** (14 gün × ~15–20 dk: 14 Günün Rotası 7.000 + ~45 yıldız 9.000 + ~25 Usta 7.500 + ~110 uçuş 4.500 + ~21 SÜRÜ turu 5.000) · **L44 Efsane = 48.700** (~4 hafta) · **L50 = 60.640** (~5–6 hafta).

| Sv | Toplam XP | Sv | Toplam XP | Sv | Toplam XP | Sv | Toplam XP | Sv | Toplam XP |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 11 | 5.550 | 21 | 14.600 | 31 | 27.150 | 41 | 43.200 |
| 2 | 400 | 12 | 6.300 | 22 | 15.700 | 32 | 28.600 | 42 | 45.000 |
| 3 | 830 | 13 | 7.080 | 23 | 16.830 | 33 | 30.080 | 43 | 46.830 |
| 4 | 1.300 | 14 | 7.900 | 24 | 18.000 | 34 | 31.600 | 44 | 48.700 |
| 5 | 1.800 | 15 | 8.750 | 25 | 19.200 | 35 | 33.150 | 45 | 50.600 |
| 6 | 2.340 | 16 | 9.640 | 26 | 20.440 | 36 | 34.740 | 46 | 52.540 |
| 7 | 2.910 | 17 | 10.560 | 27 | 21.710 | 37 | 36.360 | 47 | 54.510 |
| 8 | 3.520 | 18 | 11.520 | 28 | 23.020 | 38 | 38.020 | 48 | 56.520 |
| 9 | 4.160 | 19 | 12.510 | 29 | 24.360 | 39 | 39.710 | 49 | 58.560 |
| 10 | 4.840 | 20 | 13.540 | 30 | 25.740 | 40 | 41.440 | 50 | 60.640 |

### 6.3 Unvan bantları ve seviye ödülleri
Çaylak 1–8 · Süzülen 9–16 · Sıyırıcı 17–25 · Kartal 26–34 · Usta 35–43 · Efsane 44–50 (EN: Rookie, Glider, Skimmer, Eagle, Master, Legend). **Her seviye tam olarak bir UÇUŞ tarafı ödül verir** (2–50 → 49; K-23): 5 unvan, 2 palet + 1 iz, 12 hayalet rengi, 13 **kanopi rengi** (ram-air kanopinin iki tonlu hücreleri), 12 **paylaşım kartı çerçevesi** (paylaşılan görsel ve düello kartı), 4 menü sahnesi saati. Hiçbiri isteğe bağlı bir moda bağlı değildir → kesimde boş seviye kalmaz. SÜRÜ kozmetikleri kendi hattında (§5.5), Foto filtreleri kartpostallarla (§5.4).

- 2: Kömür (palet) · 3: Klasik Kırmızı (kanopi) · 4: Gül (hayalet) · 5: Kilim Bordür (çerçeve) · 6: Altın Saat (menü saati) · 7: Gökyüzü (kanopi) · 8: Nane (hayalet)
- 9: **Süzülen unvanı** · 10: Film Şeridi (çerçeve) · 11: Güvenlik Turuncusu (kanopi) · 12: Mercan (hayalet) · 13: Posta Pulu (çerçeve) · 14: Lale (kanopi) · 15: Gök (hayalet) · 16: Çini (çerçeve)
- 17: **Sıyırıcı unvanı** · 18: Gece (palet) · 19: Zeytin (kanopi) · 20: Altın (hayalet) · 21: Anlık Fotoğraf (çerçeve) · 22: Lacivert (kanopi) · 23: Sedef (hayalet) · 24: Mavi Saat (menü saati) · 25: Kum (kanopi)
- 26: **Kartal unvanı** · 27: Eşyükselti (çerçeve) · 28: Lavanta (hayalet) · 29: Turkuaz (kanopi) · 30: Mavi Saat (iz) · 31: Pusula (çerçeve) · 32: Zümrüt (hayalet) · 33: Bordo (kanopi) · 34: Ebru (çerçeve)
- 35: **Usta unvanı** · 36: Buz (hayalet) · 37: Kar (kanopi) · 38: Sisli Sabah (menü saati) · 39: Altın Çizgi (çerçeve) · 40: Safran (hayalet) · 41: Kehribar (kanopi) · 42: Gün Batımı (çerçeve) · 43: Kehribar (hayalet)
- 44: **Efsane unvanı** · 45: Eflatun (kanopi) · 46: Yıldızlı Gece (çerçeve) · 47: Yıldızlı Gece (menü saati) · 48: Kum (hayalet) · 49: Gece (kanopi) · 50: Efsane (çerçeve)

"Menü sahnesi saati": canlı ana menü sahnesinin gök/LUT varyantı (İmza Saati başlangıç; Altın Saat, Mavi Saat, Sisli Sabah, Yıldızlı Gece). Sahne dünyası son oynanan dünyayı izler (§2.11); saat yalnız menüde değişir, oyun içi ışık sabit kalır. Başlangıç: Şafak kanopisi, Sade çerçeve, Aurora hayalet rengi.

### 6.4 Kilitler ve açılma akışı
| Ne | Koşul |
|---|---|
| W1 Kapadokya | açık |
| W2 Likya / W3 Karadeniz / W4 Erciyes / W5 Pamukkale | 6⭐ / 15⭐ / 26⭐ / 38⭐ (toplam 60) |
| Rota R(n+1) | R(n)'e iniş (≥ 1⭐) |
| Günün Rotası + SÜRÜ.io | 1. rotaya inişten sonra |
| Hayalet Düello | 2. rotadan sonra (kod gelirse hemen) |
| Serbest Uçuş (+ Foto Modu) | 3. rotadan sonra |
| Haftanın Rotası | 4. rotadan sonra (W1 tamam) |
| Kod / Haftanın Rotası | dünya kilidini tek seferlik yok sayar |

Her yeni mod **tek cümlelik** satırla tanıtılır; aynı anda açılan modlar (ör. w1r1 sonrası Günün Rotası + SÜRÜ.io) **tek kartta, satır satır, tek "Tamam"** ile gösterilir; kesilmiş mod asla anılmaz (`unlockCardModes`). Ana menüdeki ilgili kartta ayrıca "YENİ" rozeti. Öneri metinleri: Günün Rotası — "Herkes için aynı rota, her gün yeni; süreni arkadaşlarınla kıyasla." · SÜRÜ.io — "Gün batarken sürünü yönet: kimseyi yeme, kuşat ve kendi rengine çevir." · Hayalet Düello — "Uçuşunu bir koda dönüştür; arkadaşın hayaletinle yarışsın." · Serbest Uçuş — "Puan yok, acele yok: manzarayı keşfet, kartpostalları topla." · Haftanın Rotası — "Bilindik bir rota, bu hafta değişik bir havayla seni bekliyor."

### 6.5 Giysi kozmetikleri (20 desen · 12 palet · 10 iz) ve kaynaklar
| Kaynak | Desen | Palet | İz |
|---|---|---|---|
| Başlangıç | — (düz giysi) | Şafak | Duman Beyazı |
| Usta — R1 rotaları (görev başına 1 ödül) | — | Tüf, Kum, Zeytin, Turkuaz, Yayla, Lavanta, Buzul, Bakır, Gün Batımı (9) | Brülör Işığı, Turkuaz Köpük, Sis Tülü, Ebru Akışı, Buz Kristali, Lale Yaprağı (6) |
| Usta — R2–R4 rotaları (3 görev = rotanın deseni) | Kilim, Balon Şeridi, Güvercin, Yakamoz, Dalga, Çini, Pusula, Ebru, Eşyükselti, Sırt Çizgisi, Gece Yarısı, Şafak, Lale, Mehtap, Kızıl Ufuk (15) | — | — |
| Kartpostal seti (dünyanın 5 kartı) | Peri Bacası, Turkuaz, Ladin, Kar Kristali, Traverten (5) | — | — |
| Rütbe | — | Kömür (2), Gece (18) | Mavi Saat (30) |
| Haftanın Rotası (ilk ⭐⭐) | — | — | Kırlangıç (+ her hafta o haftanın iz tonu, 8'li döngü) |
| Uçuş Günlüğü 7 damga | — | — | Altın Toz |

Desenler maske + palet ile çizilir (doku kopyası yok). Paletler toprak tonlu, neon değil (test: kroma < 0,85). Giysi dışı uçuş kozmetikleri (rütbe hattı): kanopi rengi 14 (Şafak başlangıç), paylaşım kartı çerçevesi 13 (Sade başlangıç), hayalet rengi 13 (Aurora başlangıç).

### 6.6 Usta Görevleri (60)
Her görev yalnız o rotanın **değiştirilmemiş** hâlinde (Kariyer veya o rotada Düello) ve **inişle** biten uçuşta sayılır. `scoreOver`/`timeUnder` değerleri Kılavuz'a orandır; kartta mutlak sayı gösterilir (`resolveUstaTarget`; süre spor biçiminde 1:18.4, kontrol de gösterilen değerle yapılır). Kılavuz ölçütü henüz yoksa göreli metin ("Kılavuz puanının %5 üstüne çık"), asla "1 puanı geç". **Yardımsız** görevler (K-20): "Temassız 3⭐", "Kılavuz puanı", "Kılavuz süresi" yalnız fiziği değiştiren yardım devreye girmediyse sayılır; metinde "(yardımsız)". Görev türü kimlikleri UI anahtarlarıyla birebir aynıdır (`usta.<tür>`: balloonThread, mult5Hold, grazeCount, noContact3Stars, landWithin, noThermal, gateChain, timeUnder, scoreOver, boldOpen, softLanding, prox3Time). Görev 1 kolay → 3 zor.

| Rota | Zorluk | Görev 1 | Görev 2 | Görev 3 | Ödül |
|---|---|---|---|---|---|
| w1r1 İlk Atlayış | 1 | 1 Balon İlmeği → Brülör Işığı (iz) | Yumuşak iniş → Tüf (palet) | Hedefin 5 m içine in → Kum (palet) | 3 ayrı ödül |
| w1r2 Peri Bacaları Slalomu | 2 | 2 Sıyırma | 6 kapılık zincir | ×5'te kesintisiz 2 sn | Kilim (desen) (3/3) |
| w1r3 Balon Yolu | 3 | Cesur Açılış | 5 Balon İlmeği | Temassız 3⭐ | Balon Şeridi (desen) (3/3) |
| w1r4 Güvercinlik Kanyonu | 4 | ×3+ toplam 15 sn | 3 Sıyırma | ×5'te kesintisiz 4 sn | Güvercin (desen) (3/3) |
| w2r1 Yalıyar Süzülüşü | 3 | Yumuşak iniş → Zeytin (palet) | ×3+ toplam 15 sn → Turkuaz Köpük (iz) | Hedefin 5 m içine in → Turkuaz (palet) | 3 ayrı ödül |
| w2r2 Gulet Koyu | 4 | 6 kapılık zincir | ×3+ toplam 25 sn | Termalsiz bitir | Yakamoz (desen) (3/3) |
| w2r3 Kaya Kemeri | 5 | Cesur Açılış | 2 Sıyırma | ×5'te kesintisiz 3 sn | Dalga (desen) (3/3) |
| w2r4 Mezar Cepheleri Hattı | 6 | 3 Sıyırma | Puan ≥ 0,95 × Kılavuz (yardımsız) | Temassız 3⭐ | Çini (desen) (3/3) |
| w3r1 Bulut Denizi | 4 | Yumuşak iniş → Yayla (palet) | 6 kapılık zincir → Sis Tülü (iz) | Hedefin 5 m içine in → Ebru Akışı (iz) | 3 ayrı ödül |
| w3r2 Ladin Koridoru | 5 | ×3+ toplam 20 sn | 3 Sıyırma | Süre ≤ 1,00 × Kılavuz (yardımsız) | Pusula (desen) (3/3) |
| w3r3 Şelale Perdesi | 6 | Cesur Açılış | ×5'te kesintisiz 3 sn | Puan ≥ 1,00 × Kılavuz (yardımsız) | Ebru (desen) (3/3) |
| w3r4 Yayla Alçak Geçişi | 7 | 8 kapılık zincir | Termalsiz bitir | Hedefin 2 m içine in | Eşyükselti (desen) (3/3) |
| w4r1 Kar Sırtı | 5 | Yumuşak iniş → Lavanta (palet) | 2 Sıyırma → Buz Kristali (iz) | ×5'te kesintisiz 3 sn → Buzul (palet) | 3 ayrı ödül |
| w4r2 Korniş Kenarı | 6 | ×3+ toplam 25 sn | 4 Sıyırma | Temassız 3⭐ | Sırt Çizgisi (desen) (3/3) |
| w4r3 Buzul Oluğu | 7 | 8 kapılık zincir | ×5'te kesintisiz 5 sn | Süre ≤ 0,98 × Kılavuz (yardımsız) | Gece Yarısı (desen) (3/3) |
| w4r4 Zirve İnişi | 8 | Cesur Açılış | Hedefin 2 m içine in | Puan ≥ 1,00 × Kılavuz (yardımsız) | Şafak (desen) (3/3) |
| w5r1 Traverten Basamakları | 6 | Yumuşak iniş → Bakır (palet) | 2 Balon İlmeği → Lale Yaprağı (iz) | Hedefin 2 m içine in → Gün Batımı (palet) | 3 ayrı ödül |
| w5r2 Antik Tiyatro Üstü | 7 | 3 Sıyırma | 10 kapılık zincir | ×5'te kesintisiz 5 sn | Lale (desen) (3/3) |
| w5r3 Ayna Havuzlar | 8 | ×3+ toplam 40 sn | 4 Balon İlmeği | Temassız 3⭐ | Mehtap (desen) (3/3) |
| w5r4 Gün Batımı Finali | 9 | 6 Balon İlmeği | ×5'te kesintisiz 6 sn | Puan ≥ 1,05 × Kılavuz (yardımsız) | Kızıl Ufuk (desen) (3/3) |

Görev türü dağılımı: Sıyırma 8 · ×5 kesintisiz 8 · Hedefe iniş 6 · Kapı zinciri 6 · ×3+ toplam 6 · Balon İlmeği 5 (yalnız balonlu rotalar) · Yumuşak iniş 5 · Cesur Açılış 4 · Temassız 3⭐ 4 · Kılavuz puanı 4 · Termalsiz 2 · Kılavuz süresi 2. "Temassız 3⭐" (Hiç temas etmeden 3 yıldız) yardımsız sayılır. ×N içeren metinler mesafeyi de söyler: ×5 = "yüzeye 3 m'den yakın", ×3 = "7 m'den yakın".

### 6.7 Rozetler (30)
| # | Rozet (TR / EN) | Açıklama | Makine koşulu | Kategori |
|---|---|---|---|---|
| 1 | İlk Atlayış / First Jump | İlk rotanı bitir. | `profil.routesLanded ≥ 1` | kariyer |
| 2 | 3 Metre Kulübü / 3 Metre Club | Tek uçuşta toplam 10 sn yüzeye 3 m'den yakın uç (×5). | `uçuş: x5TotalSec ≥ 10` | ucus |
| 3 | Bulut Delen / Cloud Piercer | Bulut Denizi’ni üç yıldızla bitir. | `w3r1 yıldız ≥ 3` | kariyer |
| 4 | Sıfır Temas / Zero Contact | Hiç temas etmeden, yardımsız üç yıldız al. | `uçuş: stars ≥ 3, landed ≥ 1, contacts ≤ 0, assistUsed = 0` | ucus |
| 5 | Gün Batımı Pilotu / Sunset Pilot | Pamukkale’nin dört rotasını bitir. | `pamukkale inilen rota ≥ 4` | kariyer |
| 6 | Kartpostal Avcısı / Postcard Hunter | 25 kartpostalın hepsini topla. | `profil.postcards ≥ 25` | koleksiyon |
| 7 | Sürü Lideri / Flock Leader | SÜRÜ.io’da bir turu birinci bitir. | `tur: placement ≤ 1` | suru |
| 8 | Kuşatma Ustası / Encircle Master | Tek turda üç Kuşatma yap. | `tur: sieges ≥ 3` | suru |
| 9 | Elmas Kanat / Diamond Wing | Elmas lige yüksel. | `profil.leagueIndex ≥ 4` | suru |
| 10 | Balon Dostu / Balloon Friend | Tek uçuşta beş Balon İlmeği. | `uçuş: balloonThreads ≥ 5` | ucus |
| 11 | Kesintisiz Zincir / Unbroken Chain | Bir rotanın tüm kapılarını tek zincirde geç. | `uçuş: tüm kapılar tek zincir` | ucus |
| 12 | Termal Kurdu / Thermal Wolf | Tek uçuşta üç termale gir. | `uçuş: thermalsEntered ≥ 3` | ucus |
| 13 | Şafak Yolcusu / Dawn Rider | Kapadokya’nın 12 yıldızını topla. | `kapadokya yıldız ≥ 12` | kariyer |
| 14 | Turkuaz Gölge / Turquoise Shadow | Likya’da suyun 4 m üstünde 5 sn uç. | `uçuş: dünya=likya, waterSkimSec ≥ 5, Serbest Uçuş dahil` | ucus |
| 15 | Yayla Rüzgârı / Highland Wind | Karadeniz’in 12 yıldızını topla. | `karadeniz yıldız ≥ 12` | kariyer |
| 16 | Kar Kuşu / Snow Bird | Erciyes’in 12 yıldızını topla. | `erciyes yıldız ≥ 12` | kariyer |
| 17 | Ayna Uçuşu / Mirror Flight | Ayna Havuzlar’da 4 sn kesintisiz yüzeye 7 m'den yakın uç (×3). | `uçuş: rota=w5r3, maxX3StreakSec ≥ 4` (K-21) | ucus |
| 18 | Tam Ortası / Bullseye | Hedefin 2 m içine in. | `uçuş: landed ≥ 1, landingDist ≤ 2` | ucus |
| 19 | Kuş Tüyü / Featherlight | On yumuşak iniş yap. | `profil.softLandings ≥ 10` | ucus |
| 20 | Cesur Kanopi / Bold Canopy | On kez Cesur Açılış yap. | `profil.braveOpenings ≥ 10` | ucus |
| 21 | Uçuş Günlüğü / Flight Log | Yedi damga topla. | `profil.stamps ≥ 7` | koleksiyon |
| 22 | Günün Pilotu / Pilot of the Day | Günün Rotası’nda üç yıldız al. | `profil.dailyThreeStars ≥ 1` | sosyal |
| 23 | Düellocu / Duelist | Bir Hayalet Düello kazan. | `profil.duelWins ≥ 1` | sosyal |
| 24 | Rövanş / Rematch | Rövanş koduyla bir düello kazan. | `profil.rematchWins ≥ 1` | sosyal |
| 25 | Altmış Yıldız / Sixty Stars | 60 yıldızın hepsini topla. | `profil.totalStars ≥ 60` | kariyer |
| 26 | Usta Eller / Master Hands | 60 Usta Görevi’nin hepsini bitir. | `profil.ustaDone ≥ 60` | kariyer |
| 27 | Efsane / Legend | Pilot Rütbesi 44’e ulaş. | `profil.rankLevel ≥ 44` | koleksiyon |
| 28 | Sakin Süzülüş / Quiet Glide | Serbest Uçuş’ta on dakika geçir. | `profil.freeFlightSec ≥ 600` | koleksiyon |
| 29 | Objektif / Shutterbug | Foto Modu’nda ilk kareni kaydet. | `profil.photosSaved ≥ 1` | koleksiyon |
| 30 | Gün Batımına Kadar / Until Sunset | SÜRÜ.io’da gün batımına kadar ayakta kal. | `tur: survivedToSunset ≥ 1` | suru |

Rozetler `requires` (özellik) ve `needsWorld` (dünya) taşır; kesilmiş özellik ya da dünyaya bağlı rozet gizlenir (`visibleBadges`). ANTRENMAN uçuşları rozet yazmaz.

### 6.8 Haftanın Rotası
Bir kariyer rotası + yeni sanat gerektirmeyen bir değiştirici; hafta Pazartesi 00:00 TRT'de başlar. Değiştirici döngüsü sabit sıradadır; her değiştirici uygun rotalarını 7'lik adımla gezer (tekrar etmeden hepsini dolaşır).
| Değiştirici | Etki | Uygun rotalar |
|---|---|---|
| Rüzgârlı Gün | rotanın ortalama yönüne dik 6 m/s yan rüzgâr (tek/çift haftada yön değişir) | 20 |
| Sis Perdesi | görüş 250 m | 20 |
| Termal Avı | +2 termal, termal girişi ×3 (+300), w0 +1 m/s | 20 |
**Ters Yön v1'de kesildi** (K-24: yeni kapılar, yeni Kılavuz koşusu, yokuş yukarı başlangıç → 8 rotalık ek yazım). Yıldız eşikleri Kılavuz'un değiştirici altındaki puanından; Sis Perdesi için `WorldRenderer.setFogOverride(250)`. Haftalık düello kodu: mod 3 + değiştirici + hafta (`FEATURES.weeklyDuel`; kapalıysa buton gizli).
Ödül: değiştiriciyle ilk ⭐⭐ → Kırlangıç izi (bir kez) + o haftanın iz tonu (Nar, Safran, Deniz, Yosun, Eflatun, Kiraz, Kumsal, Gök). Kariyer XP'si normal; Usta Görevleri sayılmaz.

### 6.9 Uçuş Günlüğü (suçluluksuz seri)
Bitmiş en az bir uçuş ya da SÜRÜ turu olan her TRT takvim günü = 1 damga. Damgaların ardışık olması gerekmez. 7 damga → Altın Toz izi + Uçuş Günlüğü rozeti; her 7 damga günlükte yeni bir sayfa. "Serin bozuldu" ya da kaybedilen seri mesajı **yoktur**.

### 6.10 Yasaklar
Ganimet kutusu, şans mekaniği, enerji/bekleme sayacı, öde-kazan, reklamla hızlandırma, sahte aciliyet, suçluluk mesajı.

---

## 7. FTUE — ilk 60 saniye (W1·R1, menü yok, metin duvarı yok)

Veri: `src/content/meta/ftue.ts` (`FTUE_BEATS`, `FTUE_RULES`); oynatıcı: entegratörün FTUE yönetmeni (`src/modes/career/ftue.ts`). Vuruşlar film zamanına (atlayıştan önce), sim zamanına ya da olaylara bağlıdır; aşağıdaki saniyeler §1 zaman çizelgesidir.

| Saniye | Görüntü / ses | Etkileşim | Öğretilen | Açılan HUD (yalnız ilk uçuş) |
|---|---|---|---|---|
| 0,0–1,5 | Siyah ekran; **0,3 sn'de** eldivendeki hafif şafak ışığı titremesi ("dondu" hissi yok); sepet kenarında eldivenli el. Ses: AudioContext çalışıyorsa rüzgâr + uzak brülör, değilse sessiz (K-22) | — | atmosfer | — |
| 1,5–4,0 | Kamera geri-yukarı: ~40 balon (balon zamanı = simZamanı − kalanTanıtım, negatif t geçerli), Göreme vadileri, altın sis; küçük "KANAT" logosu; pad müziği (ses açıksa) | **1,5 sn'den sonraki her dokunuş doğrudan atlar** | yer duygusu | — |
| 4,0–6,0 | Nabız atan başparmak + aşağı küçük atlama oku + tek kelime "Atla" (4 sn'de bir tekrar nabız) | dokun | tek dokunuş başlatır | — |
| 6,0–7,5 | Atlayış = **ses kilidi açılır**; serbest düşüş rüzgâr crescendo (sessiz açılışta ilk ses); 0,8. sn'de kanat kumaş patlaması (25 ms haptik) | — | kanat açılışı | Duraklat |
| 7,5–12 | Hafif solda parlayan ilk Kapı; hayalet başparmak sola sürükler; geçişte çan + 18 ms | sola sürükle | **yön** | kapı oku |
| 12–18 | Vadi daralır, peri bacaları; Yakınlık Halkası dolar ×2, ×3, yükselen pentatonik tonlar; halka dilimlerinde 30/15/7/3 m etiketleri (ilk 3 uçuş) | alçal | **yakınlık = puan** | halka, ×N, kombo çubuğu |
| 18–22 | İlk **Sıyırma**: betikli ~1,2 m geçiş (Rehber Rüzgâr teğet geçişte itmez — K-17), 0,85× zaman 150 ms, toz, "SIYIRMA +1.250" | çizgiyi tut | sıyırma | puan |
| 22–26 | Önde iki balon, aralarında kesikli ışık yayı; geçişte brülör alevi "BALON İLMEĞİ" | ortadan geç | ilmek | — |
| 26–30 | Vadi açılır; bağ platosunda hedef halkası + ışık sütunu; ufuk + balonlar tek karede | — | hedef | — |
| 30–36 | İniş bölgesi → tek bip + haptik; PARAŞÜT butonu nabız atar, üstünde başparmak | dokun | paraşüt | yükseklik çubuğu, iniş işareti, PARAŞÜT |
| 36–48 | Hayalet başparmak hedefe doğru yatay sürüklemeyi gösterir; hedef halkası yerde parlar | yatay sürükle | kanopi dönüşü | — |
| 48–52 | 6 m'de yükseklik çubuğu parlar; 3 m'de aşağı ok **"Aşağı çek"** | aşağı sürükle | flare → yumuşak iniş | — |
| 52–56 | Yıldızlar tek tek damgalanır (40 ms haptik her biri); kamera yükselir → canlı ana menü | — | — | — |
| 56–60 | **Kompakt FTUE sonuç kartı** (3–4 sn) canlı menünün üstünde: arkada vurgu klibi döner, "Usta 2/3 ✓", "Brülör Işığı izi kazandın" + [Giy], altında tek büyük **Devam** | Devam | — | XP → Rütbe 2 |

- Hız göstergesi ilk uçuşta gizlidir; sonraki her uçuşta HUD tamdır.
- "Ters mi?" algısı ilk kapıda çalışır; kart **yalnız** ilk kapı kesitinde (sim 0–6 sn, vay anlarından önce) ya da inişten sonra çıkar, açıkken sim durur (bulanık arka plan): başlık "Yukarı çekince burun insin mi?", [Evet, çevir] / [Hayır, böyle kalsın], küçük başparmak + burun animasyonu (`INVERT_CARD`).
- Bütçeler (boşta makinede, 4× CPU kısıtlaması): süreç başı → ilk FTUE karesi ≤ 4 sn; orta cihazda uygulama simgesi → "Atla" ipucu ≤ 8 sn. İlk açılışta yalnız w1r1 koridoru, otomatik kademenin bir altında yüklenir; siyah açılış karesi yükleyicinin kendisidir (ayrı yükleme ekranı yok). Diğer dünyaların müziği tembel sentezlenir.

**FTUE sonrası akış (ilk ~15 dk):** w1r1 sonrası **tek kart**: "Günün Rotası açıldı" + "SÜRÜ.io açıldı" (iki satır, tek "Tamam") → Devam = w1r2 (sonuçta: ≥ 2⭐ ve yardım müdahalesi yoksa "Yardımı azaltmak ister misin?" → Az) → bitince "Hayalet Düello açıldı" → w1r3 → bitince "Serbest Uçuş açıldı" + (henüz sorulmadıysa) tek dokunuş "Yardımı azaltmak ister misin?" (Az'a geçirir, Kapalı'ya değil; Rehber Rüzgâr da kapanır) → w1r4 (Rehber kapalı) → "Haftanın Rotası" kartı. w1r2'deki ilk termalde bir kerelik metinsiz ipucu: ısı titreşimli sütun parlar, hayalet ok "içinden geç", yükseklik çubuğunda yeşil + tikleri (`FIRST_TIME_HINTS`).

## 8. Zorluk ve denge

### 8.1 Dünya rampaları (§2.10)
| Dünya | Zorluk | Başlangıç | Kapı yarıçapı | Termal (adet, R, w0) | Rüzgâr | Açılış |
|---|---|---|---|---|---|---|
| 1 Kapadokya Şafağı | 1–4 | balon sepeti | 14 m | 3, 55 m, 7 m/s | 0 | açık |
| 2 Likya Kıyısı | 3–6 | yalıyar tepesi | 12,75 m | 2, 50 m, 7 m/s | 1,5 m/s | 6⭐ |
| 3 Karadeniz Yaylası | 4–7 | sırt çıkıntısı | 11,5 m | 2, 45 m, 7 m/s | 3 m/s | 15⭐ |
| 4 Erciyes Karı | 5–8 | zirve sırtı | 10,25 m | 1, 40 m, 7 m/s | 4 m/s | 26⭐ |
| 5 Pamukkale Gün Batımı | 6–9 | balon sepeti | 9 m | 1, 35 m, 7 m/s | 4 m/s | 38⭐ |
Kilit eşikleri önceki dünyaların yıldız havuzunun %50 / %62 / %72 / %79'u → son dünya gerçekten "ustalık" ister.

### 8.2 Uçuş Yardımı
| Seviye | Davranış | 🛟 (K-20) |
|---|---|---|
| Rehber Rüzgâr (W1 R1–R3 varsayılan) | Tam + çarpma yerine sekme; itme yalnız kapanma > 3 m/s (teğet Sıyırma serbest — K-17) | devreye girdiyse |
| Tam | §4.G τc < 0,6 s sürekli düzeltme; d < 2 m ve kapanma > 8 m/s → yumuşak itme; 5 sn'de bir burun kaldırma; kapı mıknatısı %15 | devreye girdiyse |
| Az | yalnız 1,0 sn önceden engel tarafında kırmızı kenar nabzı + bip (fizik nötr) | asla |
| Kapalı | — | — |
Kariyer'de puan cezası yok; yardımla kurulan rekor rota kartında 🛟 taşır. 🛟 Günün Rotası/Düello/paylaşım kartında yalnız fiziği değiştiren yardım gerçekten devreye girdiyse görünür (`showsAssistMark`). Yardım azaltma teklifi her zaman **Az**'a geçirir; iyi oynayana (≥ 2⭐, müdahale yok) W1 R2'den itibaren, herkese bir kez R3 sonunda (`shouldOfferAssistDown`).
**Dinamik yardım:** **bölüm** = iki kapı arası (ilk bölüm başlangıç → 1. kapı, son bölüm son kapı → iniş). Aynı bölümde 3 çarpma → tek dokunuş "Bu bölümde yardım?": **Tam Yardım** · **Rehber Hat** (Kılavuzun ışıklı çizgisi) · **Bu bölümü çalış** (son kapının anlık görüntüsünden; ANTRENMAN etiketi; yıldız/rekor/XP/görev/rozet yok). Ayarlardan kalıcı kapatılırsa (`kanat.dynamicHelpOff`) kart bir daha gelmez.

### 8.3 Uçuş modeli hedefleri (flight ile ortak, `TUNING`)
trim ≈ 42 m/s (150 km/s), çökme ≈ 9 m/s, (L/D)max ≈ 4,6; tam dalış tavanı ≈ 64 m/s (230 km/s); stall ≈ 31 m/s, V asla < 25 m/s; ani ölüm yok. Kararlı uçuşta 110–230 km/s.

---

## 9. UI ekranları

| Ekran | İçerik | Giriş / çıkış |
|---|---|---|
| Yükleme | dünya panoraması, ipucu (10), ilerleme | Boot → Ana menü |
| **Ana menü** (canlı 3D) | pilot sepet kenarında, balonlar yükselir; sahne son oynanan dünya + seçili menü saati; alt kartlar: Devam, Günün Rotası, Modlar, SÜRÜ.io, Koleksiyon; sağ üst rütbe rozeti (seviye + unvan + XP yayı). Kahraman kartının altında ikincil **"Dünyalar ve rotalar"** bağlantısı (kahraman kartında dünya adına dokunmak da Rotalar'ı açar); "Modlar" alt yazısı "Düello · Serbest Uçuş · Haftalık"; yeni açılan modun kartında "YENİ" rozeti | tüm modlar |
| Dünya seçimi | yatay kaydırmalı büyük dünya kartları (RTT ya da önceden render edilmiş gerçek arazi küçük resmi zorunlu; SVG yalnız yüklenirken yer tutucu), yıldız sayacı, kilit "{n} yıldızda açılır" | Ana menü ↔ Rota seçimi |
| Rota seçimi | gerçek yükseklikten 3D rölyef mini-harita (gerçek `line` yoksa harita gizli — uydurma çizgi yok), 4 rota çizgisi, yıldızlar, en iyi puan (yardımla kurulduysa 🛟), 3 Usta Görevi + ödül çipi (desen örneği, ad, "Kilim 2/3"), hayalet seçimi (Yok / En iyim / Kılavuz) | → Rota tanıtımı |
| Rota tanıtımı | 6 sn sinematik (geniş plan → 3× önizleme, kapılar parlar → atlama noktası) | dokunuşla atla |
| **HUD** (≤ 6 öğe, merkez %40 boş, opaklık %85) | üst orta puan/süre (+ hayalet farkı); alt orta Yakınlık Halkası (180° yay, ×1/×2/×3/×5, büyük "×3", altında kombo çubuğu; başparmak çapası halkaya düşerse ~90 px yukarı kayar); sol kenar hız; sağ kenar yer yüksekliği + iniş bölgesi işareti; kenarda sonraki kapı oku → son kapıdan sonra iniş oku + "İNİŞ 820 m"; bağlamsal Paraşüt; sol üst Duraklat 44 pt (+ iki parmak dokunuşu). İlk uçuşta kademeli açılır (§7). ANTRENMAN'da üstte etiket | — |
| Tek dokunuş kartları | "Yukarı çekince burun insin mi?" (sim durur), "Bu bölümde yardım?" (3 seçenek), "Yardımı azaltmak ister misin?", "Kontrol daha sakin olsun mu?", "Daha sakin kamera?", mod tanıtımı (aynı anda açılanlar tek kartta) | oyun içinde/sonuçta |
| Duraklat | bulanık arka plan: Devam, Yeniden, Foto Modu (izinli modlarda), Ayarlar, Çık | — |
| Çarpma tekrarı | 3 sn telefoto + sabit zemin, 0,3×; dokunuşla atla | < 1 sn'de yeniden |
| **Sonuç** | arkada vurgu tekrarı (kayıtlı halka tampondan ReplayDirector); puan dökümü sayarak dolar; yıldız damgaları; Usta ilerlemesi (tamamlananlar + n/3); XP çubuğu sayarak dolar; "Likya'ya 3 ⭐"; butonlar **Tekrar** (en büyük), Paylaş (**Klip** / **Kart** / **Metin** seçimi), Düello Kodu, Sonraki. Sonuç açıkken sıradaki rota ve aynı dünyanın diğer rotaları arka planda yüklenir (aynı dünyada rota değişiminde yükleme ekranı yok) | — |
| Paylaşım çıktıları | **Kart:** canlı uçuşta en yüksek puan yoğunluklu tick'te yakalanan kare → 1080×1350, HUD'suz, Belgesel tonu + seçili çerçeve. **Klip:** ≤ 8 sn, deterministik yeniden simülasyondan 1080×1920 portre, olayda 0,5× ağır çekim, son 1 sn logo + süre/puan kartı; captureStream + MediaRecorder olan cihazda (iOS: MP4), yoksa Kart'a düşer (`FEATURES.highlightVideo`). **Metin:** emoji kartı + düello bağlantısı | — |
| Seviye atlama | yeni seviye + tek ödül kartı (unvan, kozmetik), "Giy" kısayolu | sonuç sonrası |
| Günün Rotası | gün numarası, zorluk, bugünkü en iyi, emoji kartı önizleme, Paylaş | — |
| Hayalet Düello | kod yapıştır / derin bağlantı → "X'in hayaleti" kartı → yarış → "Kazandın · 0,8 sn" + Rövanş Kodu; hata mesajları TR/EN | — |
| Serbest Uçuş + Foto Modu | dünya seç; Foto: FOV, yatış, EV, DOF, 6 filtre (kilitliler "Rütbe {n}'de açılır"), gren, çerçeve, kaydet | — |
| **Koleksiyon** | Kartpostal albümü (boş yuvada siluet + dünya, set ilerlemesi → imza deseni), Giysi Dolabı (menü sahnesinde dönen pilot; desen × palet × iz; kaynak etiketi), Rozetler (30), Uçuş Günlüğü, Hayalet rengi, Menü saati | — |
| Haftanın Rotası | rota + değiştirici kartı, ödül önizlemesi (Kırlangıç + haftanın tonu) | — |
| Ayarlar | Grafik (Otomatik + 4 kademe), FPS 60 / "Pil tasarrufu (30)", ses/müzik, titreşim, dil TR/EN, hareketi azalt, sol el; oyuna özel: kontrol yönü (Doğal / "Ters (pilot)"), hassasiyet ve "Ortada daha yumuşak" (expo) kaydırıcıları "Daha sakin ↔ Daha çevik" etiketli, jiroskop ("sağa-sola yatma" / "tam"), kamera mesafesi, Uçuş Yardımı, flare ipucu, halka konumu; **Erişilebilirlik** bölümü (§3.4); Hakkında (atıflar, "Wingsuit gerçek hayatta yıllar süren eğitim ister."). Sade dil: Yalpa → "sağa-sola yatma", Yunuslama → "burun yukarı-aşağı", Sim hızı 0,8× → "Oyun %20 daha yavaş akar", Okabe-Ito → "Renk körlüğüne uygun renkler", Büyük HUD → "Büyük yazı ve göstergeler", LP → "lig puanı" | — |
| SÜRÜ.io lobi | Lig Maçı / Sürü Günü / Antrenman, lig rozeti + LP çubuğu, "Yapay zekâ sürüleri" etiketi | — |
| SÜRÜ.io HUD | üstte güneş yayı (zamanlayıcı), sürü büyüklüğü, sağ üst ilk 3 (renk + desen + "YZ"), sol alt dairesel mini-harita (halka dahil), **liderin çevresinde** Nefes yayı (bitince kırmızı + haptik), oyuncu liderinde çift halka + tur başı "SEN", ekran dışı lider oku, rakip lider çevresinde Kuşatma yayı, kısa duyurular | — |
| SÜRÜ.io sonuç | sıra, zirve, dönüştürülen, toplanan, Kuşatma, ayakta kalma; lig puanı değişimi; "YZ ortalamasına göre %"; Elmas'ta son 20 tur ortalama sıra; Paylaş; < 2 sn'de yeni tur; "İzle" | — |
| Okunurluk (tüm ekranlar) | en küçük metin 13 px (Büyük yazıda 15 px), < 16 px metin Inter, panel üstü soluk metin opaklığı ≥ 0,8, ≥ 4,5:1 kontrast en parlak arka planda ölçülür; teslimden önce tüm ekranlar contact sheet'te | — |

---

## 10. Çelişkiler ve kararlar

Öncelik: oyun kuralı ve denge → §2; algoritma ve teknik → §4.G; ek kural: bir §9.G testi ya da §11.G bitti kriteri somut bir sayı ölçüyorsa o sayı geçerlidir (testler gevşetilemez). Makine okunur kopya: `src/content/meta/rulings.ts`; `tests/unit/meta.test.ts` ilgili canlı veri değerlerini (TUNING, SURU) bu kararlara karşı denetler.

| # | Konu | Kaynaklar | Karar | Gerekçe |
|---|---|---|---|---|
| K-01 | Bırakınca otomatik düzelme zaman sabiti | §2.2: yatış τ 0,6 s, burun 0,8 s<br>§4.G.5: φ→0 ve C_L→C_trim, τ = 0,4 s | τ = 0,4 s (her iki eksen), birinci derece yaklaşım + faz sönümü | §2.2 tepki sayılarını "kesin model 4.G'de" diyerek 4.G'ye devrediyor; bırakma düzelmesi tepki modelinin parçası. Üstel yaklaşım sarsıntısız (yumuşak), 65° yatış 1,2 s'de 3°'ye iner; dokunmatikte "bırakmak her zaman güvenli" niyeti daha güçlü sağlanır. Flight ajanı bu değerle ayarladı. |
| K-02 | Yatış sınırı ve yalpa hızı | §2.2: ±80°, 140°/s (tasarım hissi)<br>§4.G.5: φ_hedef = sx/31·65°, ≤150°/s | Yatış 65°, yalpa ≤150°/s; yunuslama ≤55°/s (§2.2, 4.G'de karşılığı yok → sınır olarak) | §2.2 bu satırı açıkça 4.G'ye devrediyor. 65° ile 42 m/s'de dönüş yarıçapı ≈ 84 m; Rota Kâşifi 104 m (60°) kısıtıyla güvenli payda. |
| K-03 | Sıyırma (graze) mesafesi | Brif başı + §2.3/§2.5: temassız d < 1,5 m, +250×Ç, nesne başına 1 s<br>§4.G.6: d < 3 m yerel minimum, V > 140 km/s, güç (3−d)/3<br>§1 FTUE: "2,5 m geçiş, SIYIRMA +250" | d < 1,5 m; algılama §4.G (yerel minimum, V > 140 km/s, geçiş başına 1 olay, nesne başına 1 s); güç (1,5−d)/1,5; puan 250×Ç(d) | Brif başındaki "Bilinen kararlar" bağlayıcı. FTUE'deki ilk sıyırma betikli ~1,2 m geçişle yapılır (Rehber Rüzgâr d < 2 m'de yalnız yumuşak iter, engellemez); açılır yazı gerçek değeri gösterir (peri bacasında 250×5 = +1.250). |
| K-04 | Kapı halkası boyutu | §2.10: "Kapı halka çapı: W1 14 m → W5 9 m"<br>§4.G.7: gates[].radius (örnek 12 m) | Değerler YARIÇAP: W1 14 · W2 12,75 · W3 11,5 · W4 10,25 · W5 9 m | Tek başparmakla 150–230 km/s'de 4,5 m yarıçaplı kapı (çap yorumu) dokunmatikte cezalandırıcı; Günün Rotası'nda kapılar zorunlu (+2 s ceza). Kapının işi çizgiyi göstermek, zorluk yakınlıktan gelmeli. 4.G örneği (12 m) yarıçap yorumuyla tutarlı. Tam Yardım kapı mıknatısı yarıçapı %15 büyütür. |
| K-05 | Kapadokya (W1) rüzgârı | §2.10: rüzgâr W1 0 → W4–W5 4 m/s<br>§4.G.7 world.json örneği: kapadokya wind 4 m/s; §4.G.5 yamaç kaldırması rüzgâra bağlı | Oynanış rüzgârı = RouteDef.wind (W1 0 · W2 1,5 · W3 3 · W4 4 · W5 4 m/s). world.json rüzgârı yalnız görsel (bulut, bayrak, çimen); RouteDef.wind = 0 iken yamaç kaldırması da 0. | Yeni oyuncunun dünyasında sürüklenme olmamalı (§2.10 denge). Kapadokya'nın enerjisi 3 termal + balon yüksekliğinden gelir. |
| K-06 | Termal gücü ve boyutu | §2.5: girişte +100, içeride +7 m/s<br>§4.G.5: w = w0·e^(−(r/R)²), R 30–60 m, w0 4–8 m/s | w0 = 7 m/s her dünyada (Gauss profili); zorluk yarıçapla: W1 55 · W2 50 · W3 45 · W4 40 · W5 35 m; sayı W1 3 · W2 2 · W3 2 · W4 1 · W5 1 | §2 değeri çekirdek kaldırma; §4.G profili algoritma. Dar termal = merkezlemesi zor = ileri dünyada beceri. |
| K-07 | Hayalet/Düello kodu öneki ve uzunluğu | §2.5/§2.8: KNT1- öneki, tasarım hedefi ≤ 600 karakter<br>§4.G.8: "K1." + base64url(header + payload + crc32), 120 s uçuş ≤ 3.000<br>§11.G: ≤ 3.000 | Kanonik biçim K1.<base64url> (§4.G); paylaşılan/görünen biçim KNT1-<etiket>-<gövde> (G214 / W1R3 / S1). Çözücü ikisini de kabul eder. Kabul sınırı ≤ 3.000, ≤ 600 tasarım hedefi ölçülüp raporlanır. | Paylaşım kartı biçimi §2.8'de "birebir"; ikili biçim algoritma alanı (§4.G). Bitti kriteri 3.000. |
| K-08 | Yavaş Mod ve 🐢 işareti | §2.2: Yavaş Mod yalnız Kariyer ve Serbest Uçuş<br>§2.8: Günün Rotası kartında "Yavaş Mod ise 🐢" | Günün Rotası ve Düello'da Yavaş Mod kapalı; 🐢 yalnız Kariyer kartında görünür. 🛟 (yardım) her kartta. | Aynı rota-aynı koşul adaleti kural (§2.2). Kariyer'de puan sim zamanıyla ölçüldüğü için yavaş mod yalnız işaretlenir. |
| K-09 | Rehber Rüzgâr / Uçuş Yardımı / yakınlık asistanı | §2.9: Rehber Rüzgâr d < 2 m yumuşak itme, çarpma imkânsız<br>§2.10: Tam = d < 2 m & kapanma > 8 m/s itme + 5 s'de bir burun kaldırma + kapı mıknatısı %15<br>§4.G.5: τc < 0,6 s → (1 − τc/0,6) düzeltme | Rehber Rüzgâr = Tam Yardım + çarpma yerine sekme (W1 R1–R3 varsayılan açık). Tam = §4.G sürekli düzeltme + §2.10 itme/burun kaldırma/mıknatıs. Az = yalnız 1,0 s önceden uyarı. | Üç tanım aynı sistemin kademeleri; birleştirilince çelişki kalmaz. Bayrak hayalet koduna ve karta (🛟) yazılır. |
| K-10 | İniş bölgesi ve hedef | §2.2: hedef çevresinde ~250 m yarıçaplı silindir (paraşüt butonu, ⭐)<br>§4.G.7: landing.radius 25 | landing.zoneRadius = 250 m (buton + ⭐); landing.radius = 25 m hedef diski görseli; bonus halkaları 2/5/10 m. | İki alan farklı şeyleri tanımlıyor; RouteDef ikisini de taşıyor. |
| K-11 | Bölge İÇİNDE paraşüt açılmazsa (brifte boşluk) | §2.2: yalnız bölge dışında 20 m altı → Acil Paraşüt → Yarım Uçuş | Bölge içinde de 20 m'de acil kanopi açılır; iniş geçerli (⭐ alınabilir), iniş bonusları yarıya iner, Cesur Açılış verilmez. | Ölüm/ani ceza yok ilkesi (§2.2); ödül yine de elle açılışı teşvik eder. |
| K-12 | Otomatik Paraşüt ve Cesur Açılış | §2.2: Otomatik Paraşüt ideal yükseklikte açar, iniş bonusu yarıya<br>§2.5: Cesur Açılış 60–90 m +300 | Otomatik açılış 75 m'de olsa da Cesur Açılış bonusu ve görevi yalnız ELLE açılışta. | Cesaret ödülü oyuncu kararına bağlı olmalı. |
| K-13 | 3 yıldız eşiği | §2.5: ⭐⭐⭐ ≥ 0,85 × uzman bot<br>§9.G: "3 yıldız eşiği ≤ uzman skoru × 0,95" | 0,85 × uzman (⭐⭐ 0,50 ×). 9.G cümlesi doğrulama sınırıdır (0,85 ≤ 0,95 sağlanır), çelişki değil. | §2 denge değeri. |
| K-14 | Takip kamerası FOV | §2.4: dikey FOV portre 74°→86°, yatay 48°→58°<br>§4.G.9: FOV 70° → 230 km/s'de +12° | §2.4 değerleri (portre 74→86, yatay 48→58); +12° aralığı iki kaynakta da aynı. | Kamera dili oyun hissi (§2). |
| K-15 | Usta Görevi ödülleri | §2.5: 60 görev, "her biri bir kozmetik açar"<br>§2.7: toplam 20 desen + 12 palet + 10 iz = 42; kaynaklar rütbe ve kartpostal setleriyle paylaşılıyor<br>§1: 2. gün kancası "Usta Görevleri'nden yarım kalan desen" | Her dünyanın R1'inde her görev ayrı bir palet/iz açar (5×3 = 15: 9 palet + 6 iz). R2–R4'te rotanın üç görevi birlikte o rotanın desenini örer (15 desen; ilerleme 1/3 → 3/3). | Her görev bir kozmetiğe bağlı kalır, 42 kozmetiğe sığar, §1'deki "yarım kalan desen" kancası birebir oluşur; yeni dünyaya girişte (R1) anında ödül. |
| K-16 | XP'de yıldızların sayılması | §2.7: XP = puan/1.000 + yıldız×200 + … | Yalnız YENİ kazanılan yıldız 200 XP verir; Günün Rotası 500 XP günün ilk bitirişinde; tekrarlar yalnız puan/1.000. | Tekrar oynamayla 600 XP/90 s sömürüsü olmaz; brif formülü korunur. |
| K-17 | Rehber Rüzgâr ↔ Sıyırma | K-03 FTUE betikli 1,2 m geçiş<br>guidePushD 2 > grazeD 1,5 | Rehber yalnız kapanma > 3 m/s iken iter (teğet geçiş muaf); sim testi: 1,2 m betikli geçiş = tam 1 Sıyırma | FTUE'nin 2. vay anı ve w1r2 görevi rehber açıkken de gerçekleşmeli |
| K-18 | Günün Rotası ve yeni oyuncu | §2.5 Mod 2 dünya seed ile döner, rüzgâr 0–6, Pzt 3 → Paz 7 | Kilit yok sayılır; her dünyada kapı 14 m, rüzgâr ≤ 3 m/s, Tam Yardım teklifi; zorluk yalnız çizgiyle | 1. gün oyuncusu Pazar Erciyes zorluk 7'ye düşmesin; aile grubu döngüsü |
| K-19 | Enerji: termal sokağı, bütçe, w1r1 süresi | K-02 dönüş yarıçapı 84 m > termal R; K-05 W1 rüzgâr 0; §2.5 60–120 s; §1 FTUE ≈ 46 s | Termal = rota boyunca kapsül sokak (L 260 → 160 m); rota enerji bütçesi; w1r1 45–55 s | Termal rotalaması gerçek karar olsun; FTUE filmi rotayla tutarlı |
| K-20 | 🛟 ve yardımsız başarılar | §2.10 🛟 Günün Rotası/Düello kartında; varsayılan Tam | 🛟 yalnız fizik değiştiren yardım devreye girdiyse; Az asla; Temassız 3⭐ / Kılavuz puanı / süresi / Sıfır Temas yardımsız; teklif Az'a | Dürüst işaret, rekabetçi değer, erişilebilirliğe ceza yok |
| K-21 | ×3 düz yüzey tavanı ↔ Ayna Uçuşu | Brif başı tavan; rozet 17 ×5 | Rozet 17 = w5r3'te 4 sn kesintisiz ×3+ | Havuz üstü imza anı ödüllensin |
| K-22 | FTUE sesi | §1 0–4 s rüzgâr; §7.3 ses asla otomatik başlamaz | Ses zorlanmaz; host izin verdiyse §1 aynen, değilse sessiz film + Atla dokunuşunda kilit açılır | Platform kuralı bağlayıcı; ek kapı yok |
| K-23 | Ödül hatları | §2.7 her seviye bir şey; §2.6 SÜRÜ kozmetik kaynağı yok | Rütbe = yalnız uçuş tarafı; SÜRÜ = tur + lig; Foto filtresi = kartpostal sayısı | 26/49 SÜRÜ ödülü kanat oyuncusu için boştu |
| K-24 | Haftalık değiştiriciler | GDD 4 değiştirici | Ters Yön kesildi; eşikler değiştirici altındaki Kılavuz'dan | 8 rotalık ek iş; adil eşik |
| K-25 | Yıldız kalibrasyonu | §2.5 oranlar; §2.7 kilitler; §2.10 W1 kabulü | Oran/kilit sabit; Kılavuz ölçütü kalibre edilir; kilitlere ulaşım kabulü | 2⭐ ile W4/W5 kilidi aşılmıyor |
| K-26 | Çarpma sonrası + sınır | §2.1 baştan; §1 görünmez duvar yok | Bölüm çalışma (ANTRENMAN) + yumuşak sınır | Geç çarpma oturumu yakmasın |
| K-27 | "Usta" aşırı yüklemesi | 6 anlam | Uzman bot = Kılavuz Pilot | Okunurluk |
| K-28 | Rota zaman kutusu | 0/20 rota (T+50 dk) | w1r1 elle; T+90 dk'da araç yoksa W1+W2 (8 rota), `FEATURES.worlds = 2` | 8 güçlü rota > 20 zayıf rota |
| S-01 | Nefes | §2.6: Sıkı −14/s, Geniş +22/s, 0'da 25'e kadar kilit<br>§4.G.10: Sıkı −20/s, Geniş 0,5 s sonra +12/s, kilit 30 | −14/s, +22/s (gecikmesiz), kilit 25 | Denge §2. Kontrol "nefes ritmi": kısa bas-bırak ritmi ödüllendirilmeli, dolum gecikmesi ritmi cezalandırır. |
| S-02 | Lider hızı | §2.6: Sıkı +%25, Geniş −%10, Yalnız +%30<br>§4.G.10: temel 12 m/s, Sıkı ×1,3 | Temel 12 m/s; Sıkı ×1,25 (15 m/s), Geniş ×0,90 (10,8 m/s), Yalnız ×1,30 (5 s) | Çarpanlar denge (§2); temel hız yalnız 4.G'de var. |
| S-03 | Lider dönüş hızı | §2.6: ω = 140°/s × clamp(√(20/N), 0,35, 1)<br>§4.G.10: ω = 3,0/√max(1, n/40) rad/s, alt 0,6 | §2.6 formülü (N = takipçi + lider) | Kartopu freni bir denge değeri. 400 kuşta 49°/s. |
| S-04 | KUŞATMA geometrisi ve süresi | §2.6: halka [6, 30] m, dilim ≥2 kuş ve pay ≥%70, ≥30 dilim 0,6 s<br>§4.G.10: [max(4, 0,6·R_B), 35] m, ≥300°, B'nin %70'i içeride, 0,5 s<br>§9.G-23/§11.G: 0,5 s tutma, 270° tetiklemez | Halka [max(4, 0,6·R_B), 35] m, 36 dilim, ≥30 dolu dilim (≥300°), B kuşlarının ≥%70'i A halkasının ortalama yarıçapı içinde, 0,5 s; kaskad 1,5 s. Dilim "dolu" eşiği sim ajanında: ≥1 kuş + halkada ≥30 kuş. | Sabit [6,30] büyük B sürüsünü kuşatılamaz yapar (N=600 Geniş R ≈ 32 m). 0,5 s bitti kriterinde ölçülüyor. 9.G-23 geometrisinde (60 kuş, 15 m halka) eşit aralıkta dilim başına ≥2 kuş en fazla 240° verir; bu yüzden ≥1 kuş + halka toplamı eşiği. |
| S-05 | Gün Batımı Halkası | §2.6: 2:15–3:00 çap 600 → 200 m<br>§4.G.10, §9.G-25, §11.G: son 45 s'de yarıçap 300 → 110 m | Yarıçap 300 → 110 m, 2:15 → 3:00 doğrusal | Bitti kriteri ve test bu sayıyı ölçüyor; fark 10 m yarıçap, dengeye etkisi ihmal edilebilir. |
| S-06 | Halka dışı ("gece") kaybı | §2.6: halka dışındaki takipçiler %3/s yabanileşir, lider içeri itilir<br>§4.G.10: dışarıdaki lider saniyede 2 takipçi kaybeder | Halka dışındaki takipçiler %3/s (deterministik birikimle) yabanileşir; kuşlar ve lider içe itilir. | Denge §2. |
| S-07 | Yabani yakalama | §2.6: grup merkezi r + 4 m içinde → grup katılır; r = k√N, Sıkı 0,6, Geniş 1,3<br>§4.G.10: kuş başına R_f = k√n, Geniş 1,35, Sıkı 0,8 | §2.6: grup bütün olarak katılır, eşik r + 4 m, k 0,6 / 1,3 | "Yakındaki gruba git, katılmalarını izle" FTUE anı grup katılımıyla okunur; değerler denge. |
| S-08 | Temas savaşı (dönüşüm) | §2.6: ağırlık Sıkı ×1,6, lider ≤12 m ×1,3; D_B ≥ 0,62; λ = 2,2·(D_B − 0,5)/s<br>§4.G.10: K(d) çekirdeği, s_j 1,25, eşik w_m > 1,15·w_own, p = 4·(…)·Δt | Algoritma §4.G (poly6 çekirdek, yalnız frontier kuşlar, değişiklikler tick sonunda); ağırlık/eşik/hız §2.6 (1,6 / 1,3 / 0,62 / 2,2) | Algoritma 4.G, denge §2. |
| S-09 | Doğan | §2.6: ilk 0:40, sonra her 30 ± 5 s, 2 s uyarı, kenar kuşlarının %6–12'si 40 m öteye<br>§4.G.10: 60. sn'den itibaren 1–3 doğan, 1,5 m'de kuş ürker, 0,8 s bekleme | §2.6 zamanlama/oranlar; geçiş başına 1 doğan; §4.G hedefleme (en büyük sürünün kenar kuşu) ve ürkütme mekaniği. Kimse zarar görmez. | Zamanlama denge §2, takip algoritması §4.G. |
| S-10 | Eleme çekirdeği | §2.6: 4 m içinde ≥ 8 kuş<br>§4.G.10: 3 m içinde ≥ 6 kuş veya düşman lider ≤ 3 m | ≥ 8 kuş / 4 m (§2.6) VEYA düşman lider ≤ 3 m (4.G eki, çelişmiyor) | Denge §2. |
| S-11 | Fırtına bulutu | §2.6: 45 m, 3 m/s, içeride takipçiler %4/s dağılır, Nefes dolmaz<br>§4.G.10: ayrılma ×3 + dürtüler; liderden 2·R_f uzakta 3 s kalan kuş yabanileşir | %4/s dağılma (denge) + ayrılma ×3 ve dürtüler (hareket); Nefes içeride dolmaz | İkisi farklı katmanlar; oran §2. |
| S-12 | Aura deseni kozmetiği ↔ okunurluk | §2.6: aura deseni (8) kozmetik<br>§3.8: tekrar eden sahip renkleri aura desenleriyle (düz/kesikli/noktalı) ayrılır; sahip renkleri kozmetik değildir | Kozmetik aura = aura dairesinin İÇ motifi; kenar stili (düz/kesikli/noktalı) ve renk sistem tarafından atanır. | Okunurluk oynanıştır; kozmetik onu bozamaz. |
| S-14 | Kartopu frenleri | S-03 taban 0,35 N = 163'te doyar; S-09 40 m ≈ yakalama yarıçapı; S-04 tam kaskad | Doğan: kenardan 40 m öteye + 7 s sahip bağışıklığı; KUŞATMA: saldıranın Nefes'i 0 + 6 s bekleme; dönüş tabanı ölçüm tutmazsa 0,15 | Brif sayıları korunur; fren beceriye bağlı |
| S-13 | YZ lig zorluğu | §2.6: tepki 450 ms (Bronz) → 180 ms (Elmas), karar 4 → 10 Hz<br>§4.G.10: kişilik tepkisi 180–300 ms + lig ofseti (Bronz +150, Elmas −50), 5 Hz | Kişilik tabanı + lig ofseti; ofsetler §2.6 ortalamalarını tutturur: Bronz +220, Gümüş +150, Altın +85, Platin +15, Elmas −50 ms (kişilik ortalaması 230 ms). Karar aralığı 7/6/5/4/3 tick (≈4,3 → 10 Hz). | Hedef değerler §2; yapı §4.G. |

---

## 11. Diğer ajanlara arayüz notları

- **flight (rota aracı + botlar):** `routeMeta(id)` → `gateRadius`, `thermalCount/Radius/W0`, **`thermalLengthM`** (termal sokağı), `windSpeed`, `startType`, `minGates`, `minBalloonPairs`, `targetDurationSec` (w1r1 istisnası), **`energy`**, `features`. `RouteDef.ustaGorevleri` için `toRouteDefUsta(task)`. Kılavuz sonucu `RouteBenchmarks {expertScore, expertTimeSec, expertGhost, simVersion}`; yıldız eşikleri `careerStarThresholds(expertScore)` ile türetilir. Rehber Rüzgâr kapanma eşiği `FTUE_RULES.guidePushMinClosingMs` (K-17). Ghost kodu sim seçeneklerinin hepsini taşır (§5.3). Yumuşak sınır `SOFT_BOUNDARY`, bölüm çalışma `PRACTICE_RULES`.
- **integrator:** uçuş sonunda `createFlightStatsTracker` (yardım kademesi `AssistLevel`, `assistUsed`) → `FlightStats`; `checkUsta`, `newBadges`, `flightXp`, `careerStars`/`dailyStars`; SÜRÜ turunda `suruRoundXp`, `applySuruRound`, `suruTrackUnlocked`, `skillIndex`; açılmalar `unlockCardModes` (tek kart), `routeUnlocked`, `worldUnlocked`, `nextWorldLock`; haftalık `weeklyFor(k, FEATURES.worlds)`; yardım teklifi `shouldOfferAssistDown`; 🛟 `showsAssistMark`; FTUE yönetmeni `FTUE_BEATS`/`FTUE_RULES`/`FIRST_TIME_HINTS`; özellik bayrakları `FEATURES` + `modeOn`/`visibleCosmetics`/`visibleBadges`.
- **ui:** ödül kaynakları `effectiveSource(def)` (kesimde yeniden eşlenmiş kaynak); Usta metni `ustaI18n(task, bench)` (anahtar = `usta.<tür>`; `ready` false iken `usta.scoreOverRel`/`usta.timeUnderRel`; `unassisted` → "(yardımsız)"); seviye ödülü `rewardsForLevel(L)` (kanopi/çerçeve/hayalet/menü saati/palet/iz/unvan); Foto filtresi kilidi "{n} kartpostalda açılır"; SÜRÜ kozmetik kilidi "{n} turda" / "{lig} liginde açılır".
- **render-props / pilot:** desen `motif`, palet `colors`, iz `style + colors`, **kanopi `CANOPIES[].colors`** (iki tonlu hücre); hayalet rengi `GHOST_TINTS[].color`; menü saati `MENU_TIMES[].hint`; işaretler (kapı, termal sokağı titreşimi, hedef halkası + 2 km ışık sütunu, Rehber Hat, balon ilmeği yayı, kartpostal parıltısı).
- **suru:** lig YZ ölçekleri `LEAGUES[]` (S-13); LP tablosu `SURU` config'inden; kartopu frenleri S-14.
- **platform:** ayar alanları istekleri: `common.textScale` (1,0/1,2/1,4), `kanat.flareHint`, `kanat.ringPosition`, `kanat.dynamicHelpOff`, `kanat.invertAsked`, Sakin kontrol ön ayarı; *prefers-reduced-motion* varsayılanları; iki parmak duraklatma; `onBack`.

---

## 12. Özellik bayrakları ve kesim planı (`features.ts`)

| Bayrak | Kapalıyken |
|---|---|
| `freeFlight` | Serbest Uçuş kartı/açılma satırı yok; Sakin Süzülüş rozeti gizli |
| `photo` | Foto Modu ve filtreleri yok; kartpostallar yok; imza desenleri "dünyanın 4 rotasına iniş" ile açılır; Kartpostal Avcısı / Objektif gizli |
| `daily` | Günün Rotası kartı ve rozeti gizli |
| `duel` | Düello Kodu butonu ve Düellocu/Rövanş rozetleri gizli |
| `weekly` | Haftanın Rotası yok; Kırlangıç izi 14 damgayla açılır |
| `weeklyDuel` | Haftalık sonuçta Düello Kodu butonu gizli |
| `suru` | SÜRÜ.io kartı, kozmetikleri ve rozetleri gizli |
| `highlightVideo` | Paylaş'ta yalnız Kart / Metin |
| `worlds` (1–5) | sonraki dünyalar, rotaları, kartpostalları, Usta ödülleri ve dünya rozetleri gizli; haftalık yalnız gönderilen dünyalardan seçer |

Kural: kesilen şey **gizlenir**, asla "yakında" yazmaz; rütbe hattı hiçbir isteğe bağlı moda dayanmaz. `tests/unit/meta.f1.test.ts` her bayrak kombinasyonunda (× 1/2/5 dünya) görünen her ödülün ve rozetin erişilebilir olduğunu doğrular.
