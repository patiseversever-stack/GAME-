# DOMİNO ŞEHRİ: Tasarım ve Ortak Sözleşme

Bu belge oyunun tek doğru kaynağıdır. Her ajan işe başlamadan okur. Kendi alanının dışındaki
dosyalara dokunmaz, sözleşmedeki imzaları bozmaz (yalnızca ekler).

## 1. Oyun

Binlerce dominodan yapılmış minyatür bir sahil kasabası. Tek dokunuşla zincir başlar. Zincir
sokaklardan akar, çeşmenin etrafında sarmal çizer, meydanda devrilen 500 taşın arkasından dev bir
resim çıkar. Sonunda büyüyen taşlar dev bir taşı devirir.

- **Etkileşim (gerçek zamanlı):** zincirin yolunda boşluklar var (parlayan hayalet taş + zamanlama
  halkası). Zincir gelmeden dokunup taşı koyarsın.
  - Son anda koymak "MÜKEMMEL" sayılır, kombo, kısa ağır çekim ve sarsıntı getirir.
  - Geç kalırsan zincir o kolda durur.
  - Gelecek mekanikler: makas (çatalda yön seçimi), köprü, top/roket düzenekleri, altın taşlar.
- **Skor:** devrilen taş yüzdesi. Yıldız eşikleri: %70, %90, %100.
- **Viral an:**
  - Her bölümün sonu izlemesi büyüleyici bir devrilme.
  - Domino sanatı: taşların arkası devrilince resim çıkar.
  - Ağır çekim dev taşlar.
- **Hedef:** "Supercell / Zynga büyük bütçe oyun" hissi, Gündönümü gibi sinematik kamera, mükemmel renkler.

## 2. Dosyalar ve sahiplik

| Alan | Dosyalar | Sahibi |
|---|---|---|
| Çekirdek | `src/app.js`, `src/core/*`, `src/index.js`, `src/standalone.js`, `build.mjs`, `DESIGN.md` | Koordinatör (ajanlar en küçük bağlama satırlarını ekler ve raporlar) |
| Şehir sanatı | `src/world/*` | Şehir ajanı |
| Işık, domino görünümü, efekt, kamera | `src/gfx/*`, `src/domino/look.js`, `src/game/fx.js`, `src/game/camera.js` | Işık/efekt ajanı |
| Arayüz | `src/ui/*` | Arayüz ajanı |
| Oynanış, fizik, bölümler | `src/domino/dominoes.js`, `src/domino/chain.js`, `src/game/play.js`, `src/game/levels.js`, yeni `src/game/*` mekanik dosyaları, `tools/sim.mjs` | Oynanış ajanı |
| Ses ve müzik | `src/audio/*` | Ses ajanı |

Başka alana bir şey eklemek zorunluysa: en küçük değişiklik, dosyanın sonunda ayrı bölüm, raporda
açıkça yazılı.

## 3. Ölçek ve koordinat

- Standart taşın boyutları:
  - boy 1, en 0.5, kalınlık 0.16;
  - zincir aralığı 0.6;
  - yerçekimi tempo için 7 (`dominoes.gravity`), dalga hızı yaklaşık 4–5 birim/sn.
- **Ada:** yarı boy 34 (yaklaşık 68 × 68), yuvarlak köşe 11. `islandSD(x, z)` içeride negatif. Deniz y = −1.
- **Evler:** domino boyunun yaklaşık 2–3 katı. Taşlar şehrin yıldızıdır.
- **Yol:** zincirin altından geçer, genişlik yaklaşık 2.6. Zincir kurucu yol izlerini `roads` olarak verir.

## 4. Sözleşmeler (imzalar korunur, yalnızca eklenir)

### Dominoes (`src/domino/dominoes.js`, fizik)
- `add(x, z, yaw, size, colA, colB, y = 0, mat = 0)` → indeks.
  - mat: 0 boya, 1 altın, 2 cam, 3 neon.
- `link(a, b, {reach, soft})`, `setMissing(i, on)`, `place(i)`, `finalize()`, `push(i, ω)`,
  `update(dt)`, `tip(i, out)`, `clear()`.
- **Diziler:** `x y z yaw w h t st ang vel hitT seq nextA nextB`, `active`/`nActive`, `toppled`, `n`.
- **Olaylar:** `onHit(i, j, ω)`, `onLand(i, v)`.
- **GPU öznitelikleri** (`look.js` okur):
  - `iPos`, `iYaw`, `iDim`, `iColA`, `iColB`, `iMat`;
  - `iAnim` = (açı, yukarı kayma, parlama, görünürlük).

### Görünüm (`src/domino/look.js`)
- `createDominoLook(G, tier, geo)` → `{mesh, shadowMesh}`.

### Efektler (`src/game/fx.js`)
- `Ghosts`: `set(slots)`, `state(i, vis, glow, near, danger)`, `flush()`.
- `Puffs`: `emit(x, y, z, size, r, g, b, count, spread, life)`, `update(dt)`.
- Işık ajanı yeni efektleri `app.fx` altında toplar: `confetti(x, y, z)`, `spark(x, y, z, k)`,
  `shock(x, z, r)`, vb. Oyun bunları her zaman `app.fx?.adı?.(...)` diye çağırır.

### Kamera (`src/game/camera.js`)
- `Director`:
  - `mode` ('orbit' | 'follow' | 'end' | 'free'), `follow(front, yaw)`, `shot` ({dist, height, side, mode}),
    `shake`, `update(dt, front, frontYaw)`, `look`.
  - Yeni çekim türleri ve ağır çekim tekrarları buraya eklenir.

### Şehir (`src/world/city.js`)
- `buildCity(G, tier, level, roads)` → `{group, casters, ...}`.
- **Bölüm alanları:** `seed`, `fountain`, `plazas [[x, z, r]]`, `streets [[[x, z]...]]`, `keepOut [[x, z, r]]`.
  - Şehir ajanı yeni alanlar ekler (`theme`, `props: [{type, x, z, yaw}]` gibi) ve bunları raporunda belgeler.

### Oyun ↔ Arayüz
- **Oyun çağırır:** `ui.level(L, game)`, `ui.tick(game)`, `ui.pop(text, x, y, tone)`, `ui.hint(html | null)`,
  `ui.title(on)`, `ui.end(result, L)`.
  - `tone`: `gold`, `good`, `ok`, `bad`.
  - `result`: `{pct, stars, score, perfects, toppled, total}`.
- **Arayüz gönderir** (`h.action(a)`): `play`, `retry`, `next`, `menu`, `level:<i>`, `pause`, `resume`,
  `set:<k>:<v>`.
- **Yeni yöntemler** isteğe bağlı çağrılır: `ui.menu?.(progress)`, `ui.combo?.(n)`.

### Ses (`src/audio/sfx.js`)
- `unlock()`, `play(name, opts)`, `music(theme)`, `mute(on)`.
- **Adlar:**
  - `click {size, speed}`, `place {perfect}`, `thud {size}`;
  - `start`, `miss`, `win`, `fail`;
  - `combo {n}`, `star {n}`, `ui`, `whoosh`.
- `hooks.sound(name, opts)` true dönerse ses ana oyuna bırakılır.

## 5. Performans kuralları (pazarlık yok)

- **Hedef cihaz:** Realme C/Narzo (Mali-G52, Adreno 610), en düşük kademe `q=0`. 60 kare, ısınmadan, takılmadan.
- Oyun sırasında shader derlenmez: bütün malzemeler açılışta sahnede olur, `compileAsync` derler.
- Render hedefleri yalnızca açılışta kurulur.
- Kare başına nesne üretimi (`new`, dizi, kapanış) yoktur.
- **Bütçe:**
  - Çizim çağrısı ≤ 40 (şu an 8), üçgen ≤ 180k (q=0'da ≤ 120k).
  - Gölge haritası tek, kameranın baktığı yere ortalanır.
  - Tam ekran efekt geçişi yalnızca q≥1'de ve en çok bir tane (ör. ucuz minyatür alan derinliği). q=0'da hiç yok.
- **Kalite:** pikselli görüntü yok, titreyen gölge yok, kenarlar MSAA ile yumuşak.
- **Denetim:** her teslimde `node build.mjs` ve `node tools/shot.mjs` hatasız çalışmalı.
  - `q=0` ve `q=2` ekran görüntüleri alınmalı, `app.stats()` rapora yazılmalı.

## 6. Görsel yön

- Güneşli öğleden sonra, oyuncak minyatür şehir (Clash/Hay Day/Boom Beach tadı ama Türk sahil kasabası).
- Doygun ama temiz renkler; gölgeler siyah değil serin mavi-mor; cilalı taşlarda ıslak parıltı.
- Derinlik: hafif minyatür alan derinliği (q≥1), atmosfer sisi, deniz ufku.
- **Yazı:** Lilita One (başlık, sayı), Fredoka (metin). Kalın koyu kontur ve gölge; her zeminde okunur.

## 7. Çalışma düzeni

- Her anlamlı adımda commit (küçük ara commitler serbest). Oturum sınırı gelirse iş kaybolmaz.
- `dist/` ve `node_modules` commitlenmez.
- Commit mesajları Türkçe, kısa. Kod yorumları Türkçe, mevcut yoğunlukta.
- **Ekran görüntüsü:** `node build.mjs --dev && node tools/shot.mjs views.json çıktı --dpr=2 --q=2`.
  - views: `[{name, call:'debugRun', args:[{level, seconds}]}]` ya da `{call:'debugCam', args:[[x,y,z],[lx,ly,lz]]}`.
- **Son rapor:** ne değişti, dosyalar, performans sayıları, sözleşme notları, ekran görüntüsü yolları.
