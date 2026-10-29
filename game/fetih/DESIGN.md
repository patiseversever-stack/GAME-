# FETİH LİGİ: Ortak Sözleşme (v0.2 ekibi)

Önce `PLAN.md` dosyasını oku: kullanıcının kararları ve geri bildirimi orada. Bu belge kimin hangi
dosyaya dokunacağını ve dosyalar arası imzaları belirler. İmzalar korunur, yalnızca eklenir.

**Hedef:** Kullanıcı v0.1'e "finalin %5'i, rezalet" dedi. v0.2'de "Supercell milyonlar harcamış"
hissi gelmeli. Bakınca her şey net görünmeli, sınırdaki iller açıkça seçilebilmeli, fethedilen il
oyuncunun rengine boyanmalı. Realme'de (Mali-G52) akıcı kalmalı.

## Sahiplik

| Ajan | Dosyalar |
|---|---|
| Harita sanatı | `src/map/*`, `src/gfx/*` (env, shaderlib, shadow, yeni post/terrain), `tools/geo.mjs`, `src/data/turkiye.json` (+ yeni göl/nehir verisi) |
| Arayüz | `src/ui/*` |
| Sinema ve efekt | `src/game/cinema.js`, `src/game/camera.js`, yeni `src/gfx/fx.js` (parçacık, ordu, mancınık…) |
| Soru tipleri | `src/quiz/*` (types.js + yeni tip dosyaları) |
| Oynanış | `src/game/match.js`, yeni `src/game/{campaign,jokers,progress,commanders,net}.js` |
| İçerik | `src/data/questions*.js` (yeni dosyalar: `src/data/q/*.js`) |
| Ses ve görsel listesi | `src/audio/*`, `ASSETS.md` |
| Koordinatör | `src/app.js`, `src/core/*`, `src/index.js`, `src/standalone.js`, `build.mjs`, `DESIGN.md`, `PLAN.md` |

**Başka alana dokunma kuralı:**
- `app.js`'e yalnızca kurulum veya bağlama satırı eklenebilir; bunu en küçük haliyle yap ve raporda yaz.
- Başka bir ajanın dosyasına dokunmak zorunluysa, dosyanın sonuna ayrı bir bölüm olarak ekle ve raporda yaz.

## Mevcut imzalar

### Board (`src/map/board.js`)
- `provinces[]`: `{index, id(plaka), name, region, x, z, rings, nb(plaka listesi), owner}`
- `byId`, `count`, `top`, `group`, `shadowMesh`
- `setOwner(index, owner, color|null)`
- `fx(index, lift, glow)`, `clearFx()`, `update(dt)`
- `topAt(index, out)`, `pick(x, z)`, `sample(index, R, margin)`, `region(key)`

**Yeni (harita ajanı yapar, diğerleri `?.` ile çağırır):**
- `select(list)`: seçilebilir illeri belirgin dış hat ve yükselmeyle gösterir, diğerlerini hafif karartır. `select(null)` kapatır.
- `paint(index, color, ox, oz)`: dokunulan noktadan dışa yayılan boya dalgasıyla ili renge boyar.
- `labels`: il adlarının dünya noktaları. Harita ajanı 3D yazı da yapabilir.

### Castle (`src/map/castle.js`)
- `place(pos)`, `hit()` (kalan can döner), `repair()`, `hp`, `update(dt)`, `group`, `casters`

### Cinema (`src/game/cinema.js`)
Hepsi Promise döner; `fast` true iken anında biter.
- `overview(map)`, `castleDrop(p, i)`, `claim(p, i)`, `attack(p, d, target, isCap)`
- `conquer(p, i)`, `towerDown(p, d, i, left)`, `defend(d, i)`, `nobody(i)`, `eliminated(d, by)`

### UI (`src/ui/ui.js`)
Hepsi Promise döner; `fast` true iken anında biter.
- `hud(m)`, `banner(title, sub, {tone, short})`, `prompt(html)`
- `pickProvince(m, options, text)`: sınırdaki illerden birini seçtirir.
- `botPick(m, p, i)`
- `question(m, ctx)`: `ctx = {q, v, T, who, bots, human, attacker, defender, target, cat}`; dönen `{human: {value, time}}`.
- `reveal(m, ctx)`, `ranking(m, order, picks)`, `wheel(m, p)` (kategori anahtarı döner)
- `chooseCategory(m)`, `end(m, ranking)`, `title(on)`, `showMenu()`, `update()`

### Oynanış (`src/game/`)
- `Match`: `useJoker(id, p?) → {ok, reason?, effect?}`, `jokerList(p?)` (`na`: tipe uymaz, düğme gizlenir), `ask(q, who, ctx)`, `finish(ranking)` (ödül + sefer kaydı), `report()`.
  `cfg.commander` = menüdeki komutan `{name, avatar, banner, skin, color, colorHex}`; insan o renge boyanır, botlar kalan renkleri alır.
- Arayüzün Match'ten duyduğu (hepsi `?.`): `ui.jokers(list, cb)`, `ui.jokerUsed(p, id, effect, cur)`, `ui.sabotage(effect)`, `ui.end(m, ranking, rewards)`; `ctx.clock.extra` (ekstra süre/sabotaj) ve `ctx.botJokers`.
- `app.progress` (`Progress`: XP, altın, joker stoğu, `watchAd(placement)`, `purchase(id)`, `interstitialDue()`; gerçek SDK `hooks.rewardedAd/purchase/interstitial` ile bağlanır) ve `app.campaign` (`Campaign`: `regions()`, `cfgFor(id)`, `report(id, res)`).
- Soru tipi `ctl.joker(effect)` tanımlarsa joker etkisini kendisi uygular (şimdilik yalnız `num`: kaydırıcı daralır).

### Soru tipi sözleşmesi (`src/quiz/types.js`)
`TYPES[tip] = {time, label, kind:'exact'|'closest', needsMap?, prepare(q,R), mount(el,v,api), judge(v,value), bot(v,skill,R)}`
- `mount` dönüşü: `{lock(), reveal(results), destroy(), value?()}`
- `api`: `{answer(value), onMapTap(fn), showPin(p)}`
- **Süre (v0.8):** `time` yalnız tipik süredir (belge ve yedek). Her sorunun süresi kendi verisinden ve tipin ekrandaki
  mekaniğinden hesaplanır: `src/quiz/timing.js` (`timing(q)`, `budget(q)`, `botTime(v, R, skill, lo, hi)`, `HOT`, `SLACK`).
  Bekleme (kart açılışı) + bakış + okuma (harf ve kelime: göz her kelimeye durur; bilmece kökü iki kez) + düşünme (tip,
  zorluk) + giriş (dokunma, sürükleme: sıralamada en kötü başlangıç, bağlama, tuş, kaydırıcı, ONAYLA) üç oyuncu için
  (hızlı, ortanca, yavaş-rahat) hesaplanır; süre = en büyüğü(yavaş + `SLACK` (1,5), ortanca + `HOT`), tipin
  sınırlarına kırpılmış tam saniye (`HOT` = 5: arayüzün son 5 sn kırmızı uyarısı). v0.8 (kullanıcı kararı): bu bütçe
  `GENEROUS` (×1,2) ile uzatılır ve hiçbir soru `FLOOR` (20 sn: Trivia Crack ve Kahoot standardı) altına inmez; tipin
  geçerli sınırları `limits(type)` (yıldırım turu sabit, kurala girmez). Adalet raporu ve rakip kıyası:
  `ref/soru-v06/sure-raporu.md`; `test/timing.test.mjs` bağımsız bir "denetim oyuncusu"yla (110 kelime/dk, 0,85 sn
  dokunuş) bankadaki her sorunun sığdığını denetler. `prepare` görünüme `v.sec` (saat)
  ve `v.fast` / `v.med` / `v.slow` (botların cevap aralığı) koyar; maç, arayüz (`questionTime(v.sec, extra, floor)`),
  botlar ve uzak koltuklar (`answer` isteğinde `time`) aynı değeri kullanır. Ekstra süre jokeri süreyi yarısı kadar
  uzatır (`extraFor`, 5–15 sn), sabotaj üçte birini keser (`cutFor`, 3–10 sn). Saf ve belirlenimci: sunucu aynı
  modülle aynı süreyi bulur. Sınama: `node test/timing.test.mjs [--all]`.

### Ses (`src/audio/sfx.js`)
- `unlock()`, `play(name, opts)`, `music(theme)`, `mute(on)`
- Kullanılan adlar:
  - Harita ve savaş: `castle claim siege attack conquer tower defend eliminate`
  - Arayüz ve soru: `banner tap question timeout answer right reveal wheel`
  - Sonuç: `win lose`
- Yeni adları ses ajanı ekler.

## Soru veri biçimleri (içerik ve soru tipi ajanları için ortak)

Ortak alanlar: `{ id, cat, diff: 1|2|3, type, q }`.
- **cat:** `tarih | cografya | spor | bilim | sanat | eglence` (Genel Kültür).
- **Alt etiket:** isteğe bağlı `tag`, örneğin `yemek`, `il`, `mitoloji`, `internet`, `doga`, `zeka`.

| type | Alanlar |
|---|---|
| `choice` | `a: [doğru, y1, y2, y3]` |
| `tf` | `ans: true/false` |
| `num` | `ans, unit, min, max` (en yakın kazanır) |
| `pin` | `lat, lon` (haritada işaretle; Türkiye içinde) |
| `hang` | `w` (BÜYÜK HARF kelime; `q` ipucu) |
| `order` | `items: [{t, v, s?}, ×3]`, `dir?: 'desc'`, `unit?`. Varsayılan küçükten büyüğe; `dir: 'desc'` büyükten küçüğe. `q` ne sıralanacağını ve yönü açıkça söyler ("eskiden yeniye" / "yeniden eskiye", "büyükten küçüğe"…; `t_order.js` `DIRS`), metin ile `dir` uyuşmalı. Azalan payı %35–50. |
| `match` | `pairs: [[sol, sağ], ×3]` (iki çift bağlanınca son çift kendiliğinden bağlanır) |
| `hilo` | `left: {t, v}, right: {t, v}, prop` ("Hangisinin X'i daha fazla?") |
| `odd` | `opts: [4 öğe], odd: index` |
| `emoji` | `e: '🐟🍞…', a: [doğru, y1, y2, y3]` |
| `anagram` | `w` (BÜYÜK HARF), `q` ipucu |
| `cross` | `words: [{w, clue}, ×3..5]`; yerleşimi tip üretir |
| `proverb` | `text: 'Damlaya damlaya ___ olur.', a: [doğru, y1, y2, y3]` |
| `riddle` | `q` bilmece metni, `a: [doğru, y1, y2, y3]` |
| `img` | `img: 'varlık_kimliği', a: [...]` ya da `w`, ve `mode: 'blur'\|'zoom'\|'silhouette'\|'rebus'` |

**İçerik kuralları:**
- Kesin, kalıcı bilgi; tartışmalı ya da çabuk eskiyecek bilgi yok (güncel kadro, güncel siyaset yok).
- Din ve siyaset yalnızca tarihi olgu olarak.
- 12+ kitle.

## Performans (pazarlık yok)

- Realme/Mali-G52, q=0 kademesinde akıcı.
- Oyun sırasında shader derlenmez; bütün malzemeler açılışta sahnede olur.
- Render hedefleri açılışta kurulur.
- Kare başına nesne üretimi yok.
- Çizim çağrısı ≤ 45, üçgen ≤ 250k (q=0'da ≤ 150k).
- Tam ekran efekt geçişi yalnızca q≥1'de ve en çok bir tane.
- Arayüz animasyonları yalnızca transform ve opacity; `backdrop-filter` yok.

## Çalışma

- `ln -s /home/user/GAME-/game/fetih/node_modules game/fetih/node_modules` (`node_modules` ve `dist/` commitlenmez).
- **Derleme:** `node build.mjs --dev`.
- **Ekran görüntüsü:** `node tools/shot.mjs views.json çıktı --q=2 [--w=412 --h=892 --dpr=1]`.
  - Görünümler: `{call:'debugView', args:[{region, owners, castles, glow, focus}]}`
  - `{call:'debugScene', args:[{show:'question'|'wheel', type, cat}]}`
  - Çıktıda `HATA` satırı = hata.
- **Benzetim:** `{call:'debugSim', args:[{mode, region, length}]}` botlarla maçı baştan sona oynatır.
- Sık sık commit (küçük ara commitler serbest, Türkçe mesaj). Oturum sınırı gelirse iş kaybolmasın.
- **Son rapor:** ne değişti, dosyalar, yeni API'ler, başka alana dokunulan satırlar, `app.stats()` (q=0 ve q=2), ekran görüntüsü yolları.

## v0.4 okunurluk sözleşmesi (kim, nereden, kime)

Kullanıcı: "saldıracak mı, hangisi saldıracak, hangisi benim? Çok fosforlu, tüm haritada netlik sorunu var."
Kural: gece odağında (seçim, bot seçimi, saldırı, düello, fetih) bir yeni oyuncu bir saniyede **kendi toprağını,
saldırabileceği illeri ve her ilin sahibini** okuyabilmeli. Altın ışıma, hale ve bloom yok.

- **Toprak (board.js shader):** `uMe` (insan) ve `uAct` (sırası gelen oyuncu) kendi renginde aydınlık ve 3,3 px
  dış çizgili; başkalarının toprağı sönük ama renkli (kahverengi leke yok). Tüm il sınırlarında soluk kıl çizgi,
  kıyıda ince çizgi (kara-deniz ayrışır). `board.select(list, {attack, me, act})` hepsini ayarlar.
- **Hedef il:** hafif kalkar (`SEL_LIFT` 0,26), gündüz ışığında (yumuşatılmış güneş) kalır; sahipliyse sahibinin
  rengi, tarafsızsa nötr krem; temiz beyaz dış hat + ince koyu iç/dış kıl çizgi + yumuşak nabız. Duvar gölgede,
  üst kenarda beyaz çizgi.
- **Oklar (`src/map/cues.js`):** `board.cues.show(hedefler, oyuncu, {attack})`: oyuncunun renginde, beyaz kenarlı,
  koyu dış çizgili, kalın; kendi toprağından (çıkış noktası yuvarlağıyla) hedefe. `cues.tails/tips/main` etiket
  ve kadraj için okların uçlarını verir. `board.ownerHex[oyuncu]` sahip rengini tutar.
- **Etiketler ve rozet (`src/ui/tags.js`, HTML, ekran uzayı):** `ui.tagsOn(specs, {badges, tap})`, `ui.tagsOff()`,
  `ui.tagSpecs(m, liste, tür, roller)`, `ui.homeBadges(m, oyuncu, hedefler)`. İl adı plakası + sahip şeridi
  (portre + ad, oyuncunun renginde; insan "SEN"), saldırı hedefinde çapraz kılıç, tarafsız ilde sahip yok.
  Rozet: oyuncunun portresi + "SEN" (botta adı), okların çıktığı yerde. 3B il adları bu sırada susar
  (`board.labelLayer.suspend(true)`). Çakışma ekranda giderilir, ok uçları açık kalır, ekran ve arayüze taşmaz.
- **Düello:** saldıranın ilinden hedefe saldıranın renginde ok; iki ilde etiket (SALDIRAN / SAVUNAN ya da KALE).
- **Bulanıklık:** `post.focus(y, 1 - gece)` her karede: gündüz kenarda en çok ~2,4 css px; gece odağında 0 →
  tilt-shift geçişi hiç çalışmaz (q≥1'de de gecede tam ekran geçiş yok), bloom kaldırıldı.
- **Perf:** çizim çağrısı ve üçgen sayısı değişmedi (q0 ≈ 113k, q2 ≈ 172–182k üçgen; 11–17 çağrı); etiketler HTML,
  kare başına yalnızca transform yazılır; shader'lar açılışta derlenir.
- **Test:** `node tools/flow.mjs ÇIKTI --seed=3 [--dpr=2 --q=2 --only=…]` (yeni kare: `d3_soru`, soru kartı açıkken).
