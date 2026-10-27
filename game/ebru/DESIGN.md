# EBRU — Tasarım ve Ortak Sözleşme

Bu belge oyunun tek doğru kaynağıdır. Her ajan işe başlamadan okur, kendi alanının dışındaki
dosyalara dokunmaz, sözleşmedeki imzaları bozmaz.

## 1. Fikir

Ekran bir ebru teknesi. Su gerçek bir akışkan, boyalar gerçek ebru gibi suyun üstünde yüzer ve
karışmaz. Oyuncu bir **kandil kayığını** (ceviz kabuğunda küçük toprak kandil) limana, altın bir
**nilüfere** ulaştırır.

- **Sürükle:** su parmağın hızıyla akar. Kayık, boyalar, mürekkep, her şey akıntıya kapılır.
- **Dokun:** seçili boyadan bir damla açılır. Damla, çevresindeki her şeyi alanı koruyarak halka
  halka iter (Jaffer–Lu dönüşümü). Kayığı itmek, mürekkebi uzaklaştırmak, yol açmak için.
- **Tehlike:** kara mürekkep alevi söndürür. Mürekkep de akıntıyla taşınır. Oyuncu akıntıyı
  mürekkebin etrafından çevirir, damlalarla iter, girdapla inceltip dağıtır.
- **Oha anı:** bölüm bitince kâğıt suya serilir ve kaldırılır. Oyuncunun oynayışıyla oluşan ebru
  tablosu kâğıtta belirir. Her oyun eşsiz bir tablo bırakır; galeride saklanır, paylaşılır.

### Sütunlar

1. Dokunduğun an büyülü: ilk sürüklemede renkler kıvrılır.
2. Zekice: aynı akıntı hem kurtarır hem tehlikeyi taşır. Damla, itme ve yol açma aracıdır.
3. Her bölüm bir sanat eseri bırakır.
4. Realme'de (Mali-G52) bile 60 kare, ısınmadan.

## 2. Dosyalar ve sahiplik

| Alan | Dosyalar | Sahibi |
|---|---|---|
| Çekirdek, döngü | `src/app.js`, `src/core/*`, `src/index.js`, `src/standalone.js`, `build.mjs` | Koordinatör (ajanlar yalnızca gerekli tek satırlık bağlamaları ekler ve raporlar) |
| Su ve boya görünümü, akışkan | `src/sim/fluid.js`, `src/gfx/water.js`, yeni `src/gfx/water-*.js` | Su ajanı |
| Atölye, nesneler, sinematik | `src/gfx/backdrop.js`, `src/game/objects.js` (görsel), yeni `src/gfx/paper.js`, yeni `src/game/cinema.js` | Dünya ajanı |
| Arayüz | `src/ui/*` | Arayüz ajanı |
| Oynanış ve bölümler | `src/game/play.js`, `src/game/levels.js`, `src/game/input.js`, yeni `src/game/*` mekanik dosyaları, `tools/sim.mjs` | Oynanış ajanı |
| Ses ve müzik | `src/audio/*` | Ses ajanı |

Bir ajan başka bir alana bir şey eklemek zorundaysa, en küçük değişikliği yapar, dosyanın sonuna
ayrı bir bölüm olarak ekler ve raporunda açıkça yazar.

## 3. Koordinatlar

- Tekne: genişlik 1, yükseklik `A = 1.6`. Tekne koordinatı `x ∈ [0,1]` soldan sağa, `y ∈ [0,A]`
  aşağıdan yukarıya (ekranda yukarısı uzak kenar).
- Dünya: su yüzeyi `y = 0` düzlemi. `X = x − 0.5`, `Z = A/2 − y`. Kamera yukarıdan, 13° eğik.
- Boya dokusu uv'si: `(x, y / A)`.

## 4. Sözleşmeler (imzalar korunur, yalnızca eklenir)

### Fluid (`src/sim/fluid.js`)
- `reset()`, `step(dt)`, `stroke(ax, ay, bx, by, vx, vy, radius, k)`
- `drop(x, y, R, pigment, dur)` → pigment 0–5 boya, 6 kara mürekkep, 7 altın.
- `comb(ox, oy, dx, dy, z, lambda, space)`
- `displace(x, y, out)`: bu karenin damla ve tarak itişlerini bir noktaya uygular.
- `probe(points)` + `sample.{vx, vy, ink, inkMax, gold, paint}[i]`: eşzamansız, 1–2 kare gecikmeli.
- `dye.read.textures[0..1]`, `vel.read.texture`, `dyeW/dyeH/simW/simH`, `busy`, `awake`, `energy`.
- `frameDrops` / `frameCombs`: bu karede uygulanan itişler. Görsel efektler bunları okuyabilir.

### Su malzemesi (`src/gfx/water.js`)
- `waterMaterial(fluid, G)`, `applyPalette(mat, palette)`.
- Üniformalar: `uGlow` (kandil ışığı: xy tekne uv, z şiddet, w yarıçap) oyun tarafından her karede yazılır.

### Nesneler (`src/game/objects.js`)
- `Boat {x, y, vx, vy, r, life, group, place(x, y), sync(t)}`
- `Harbor {x, y, r, mesh, mat, place(x, y, r)}`
- `Leaves {list[{x, y, vx, vy, got, t}], mesh, set(points), sync(t)}`

### Oyun ↔ Arayüz
Oyun şunları çağırır, arayüz uygular:
- `ui.level(L, game)`, `ui.tick(game)`, `ui.leaf(n, total)`, `ui.hint(html | null, sec)`,
  `ui.toast(text)`, `ui.end(result, L)`.

Arayüz `h.action(a)` ile şunları gönderir:
- `'play'`, `'retry'`, `'next'`, `'menu'`, `'level:<i>'`, `'color:<pigment>'`, `'tool:<id>'`,
  `'pause'`, `'resume'`.

Yeni yöntemler (`ui.tools(list)`, `ui.pop(text, sx, sy, tone)` gibi) isteğe bağlı çağrılır:
`ui.tools?.(...)`.

### Ses
- `sfx.play(name, opts)`, `sfx.flow(energy)`, `sfx.music(theme)`, `sfx.unlock()`, `sfx.mute(on)`.
- Oyun her zaman `app.sfx?.play?.(...)` biçiminde çağırır.
- Adlar: `drop`, `ink`, `leaf`, `win`, `fail`, `stroke`, `harbor`, `flicker`, `paper`, `tap`.

## 5. Performans kuralları (pazarlık yok)

- **Hedef cihaz:** Realme C/Narzo (Mali-G52, Adreno 610), en düşük kademe `q=0`. 60 kare, ısınmadan.
- **Derleme:** oyun sırasında shader derlenmez. Bütün malzemeler açılışta `compileAsync` ile hazırlanır.
- **Render hedefleri:** yalnızca açılışta (ya da başlık ekranında) kurulur.
- **Bellek:** kare başına nesne üretimi (`new`, dizi, kapanış) yoktur.
- **Bütçe:**
  - Çizim çağrısı ≤ 40, üçgen ≤ 80k.
  - Tam ekran efekt geçişi yok (bloom yok).
  - Su shader'ı en çok yaklaşık 14 doku okuması.
- **Akışkan:**
  - Su durulunca uyur.
  - Atölye ve masa dokuya bir kez çizilir.
  - Kademe farkları yalnızca `TIERS` değerleri ve `#define` ile yapılır, çalışma anında değişmez.
- **Kalite:** pikselli görüntü yok, merdiven kenar yok, titreyen desen yok.
  - Düşük kademede de kenarlar yumuşak olmalı.
- **Denetim:** her teslimde `node build.mjs` ile `node tools/shot.mjs` hatasız çalışmalı.
  - `q=0` ve `q=2` ekran görüntüleri alınmalı.
  - `app.stats()` değerleri rapora yazılmalı.

## 6. Görsel yön

- **Gerçek ebru:**
  - Doğal pigmentler: lâciverdin, kökboya kırmızısı, safran, çam yeşili, gül kurusu, firuze.
  - İnce beyaz damarlar ve keskin kenarlar.
  - Boya filminde ince pigment dokusu.
  - Kitreli suyun üstünde hafif parlaklık.
- **Atölye:** gece, gaz lambası ışığı, ceviz masa, bakır/pirinç tekne köşeleri, gül dalından at kılı
  fırçalar, boya kâseleri, öd (sığır ödü) şişesi, tarak, biz. Pencereden İstanbul gecesi yansır.
- **Kandil:** sıcak, canlı alev; suda yansıması, boyalara turuncu ışık.
- **Kara mürekkep:** canlı, tehditkâr. Tüylü kenarlar, yağ hâresi, yavaş nefes alan bir leke.
- **Yazı:** Cormorant Garamond italik (başlıklar), Manrope (metin). Her yazı koyu panel üstünde.

## 7. Çalışma düzeni

- Her anlamlı adımda commit (küçük ara commitler serbest). Oturum sınırı gelirse iş kaybolmaz.
- Commit mesajları Türkçe, kısa. Kod yorumları Türkçe, mevcut yoğunlukta.
- **Ekran görüntüsü:** `node build.mjs --dev && node tools/shot.mjs views.json çıktı --dpr=2 --q=2`.
  - views: `[{name, call:'debugPlay', args:[{level, script, seconds}]}]`.
- **Son rapor:** ne değişti, dosyalar, performans sayıları, sözleşme notları, ekran görüntüsü yolları.
