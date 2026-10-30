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
  `ui.jokers` geri çağrısı soru başında kurulur; `ui.question` onu silmez (silerse joker düğmeleri ölür; v0.8 hatası).
- **Kurallar (v0.8, `match.js` başındaki sabitler):** `TURN_ORDER` (ilk tur tohumdan karışık, son tur puana göre: geride olan son
  saldırır), `TIE_BREAK` (eşit birincilikte altın soru: `goldenQuestion()`, `m.tieWin`; sonra il, kule, doğru sayısı; elenende geç
  elenen önde), `SHIELD_IN_DEFENSE` (kalkan savunulan düelloda kurulamaz: `m.duel`, `m.defending(p)`), `BOT_SIEGE` (botun
  başkente saldırma isteği beceriyle sürekli). Soru saati koltuk başına: `cur.clocks` (koltuk → `{extra}`), `ctx.clock` insanın
  kendi saati. Ağ olayları ve gizlilik: `net.js` başındaki şema (`turn`, `attack`, `result`, `score`, `state`; joker etkisinin
  tamamı yalnız kullanana). Sınama: `node test/kurallar.test.mjs`, `node test/net.test.mjs`. Rapor: `ref/gece-v08/rapor.md`.
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

## v0.7 bölge havası (`src/gfx/weather.js`, yalnızca görsel)

Kullanıcı: "Bölgelere göre hava: Karadeniz'de sis, Doğu'da kar tozu, Akdeniz'de sıcak ışık." ve "Haritayı çok kaplamasın;
görünsün ama yoğun olmasın." Kıyas: `ref/hava-v07/`.

- **Ağırlık dokusu:** `bakeRegionField(provinces, coast)` açılışta CPU'da 192 × 96 RGBA8 pişirir (il çokgenleri satır satır,
  deniz ve komşu ülke en yakın bölgeyi alır, kıyıdan uzaklaştıkça söner, yumuşatılır). r sis (Karadeniz kıyı kuşağı 1, iç kesim
  0,22; Marmara 0,22), g kar (Doğu), b sıcak ışık (Akdeniz 1, Güneydoğu 0,55, Ege 0,4), a kuru toz (İç Anadolu 0,75, Güneydoğu 0,5).
- **`app.weather`:** `calm(on)` harita sorusunda havayı %30'a indirir (`cinema.clues` çağırır); `update(dt, cam)` her kare
  `G.uWx` = (güç = calm × (1 − gece), kamera yakınlığı, kademe, savaş açıklığı yarıçapı) ve `G.uWxStage` (savaş kapsülü) yazar.
  Gece odağında (seçim, düello, savaş, fetih) hava tamamen çekilir, şafakla döner.
- **Shader:** COMMON'da `uRegion, uWxBox, uWx, uWxStage` ve **`uNoise`** (artık yalnız COMMON bildirir; başka parçada yeniden
  bildirme), `wxAt(xz)`, `wxStage(xz)`. LIGHT'ta `regionWx()` `applyFog`'un başında: yerel ışık tonu ve sis / pus katmanları
  (sis en yoğun yerde ~%28, sahip renginde %45 daha ince); bütün malzemeler (arazi, deniz, ağaç, yapı, kale, ordu) aynı havada.
  Malzeme çarpanı `gWxK` (deniz: kıyı çizgisinde 0,4, kıyı okunur), `gWxW` (ağırlığı zaten okuyan malzeme verir: ikinci okuma yok).
- **Harita:** Doğu'da kırağılı sırtlar (yükseklik + kuzey yamaç; sahip boyası üstüne biner), q≥1 karda pırıltı; deniz: Akdeniz
  turkuaz sığlık ve q≥1 güneş pırıltısı, Karadeniz koyu, yeşile çalan deniz.
- **Perf:** 1 örneklemeli çağrı (kar tanesi q0 160 / q1 600 / q2 1000; Karadeniz sis tutamı q1 10 / q2 16), gecede gizli.
  Gündüz q0 9 → 10 çağrı, 134.204 → 134.524 üçgen; q2 10 → 11, 221.007 → 223.029; gece odağında değişmez. Kare başına nesne yok.

## v1.2 maç soru düzeni: 14 yeni tip maçta (`src/quiz/mac.js`, `src/game/sunucu.js`)

Kullanıcı: "Her tipin hangi turda ve ne sıklıkla geleceği ayarlanmalı. Çevrimiçi sunucu adımları yazılmalı. Tufan gibi uzun
filmlerin maçtaki yeri belirlenmeli." Rapor ve görüntüler: `ref/mac-entegrasyon-v12/`. Ölçüm: `node test/sim.mjs --plan=500`
(4.000 maç), `node test/net.test.mjs` (uzak koltuklu tam maçlar, sanal saat), `node tools/flow.mjs … --mode=… --only=y --tam`.

**Tipler.** Maçta: kusbakisi, ilavi, kimim, sive, halat, mancinik, yanlis, ikidogru, harfal, azbilinen, tufan, kayip, fitil.
**golge** kayıtlı ama `BAYRAK.golge = false` (onay bekliyor; `cfg.yeni = { golge: true }` maç başına açar). kosu ve baglanti
maça hiç girmez. Eski 16 tip olduğu gibi (bankaya yeni giren anagram, çengel ve yıldırım dahil: kategori ağırlıklarıyla).
**Köprü:** `yeniBank()` yeni tiplerin sorularını galeri örneklerinden (`DENEME_SAMPLES`) okur; örnek dizilerine eklenen her
soru maça kendiliğinden girer. Süre: `timing(q)`/`budget(q)` yeni tiplerde tipin kendi `prepare` damgasını verir
(`DIS_ZAMAN`; aynı formül, sabitler ve `PROFILE`).

**Anlar.** `expand` yayılma (herkes cevaplar, sıralama il hakkı verir) · `attack` sahra düellosu · `siege` kale kuşatması ·
`tie` düelloda eşitlik bozma · `golden` maç sonu altın soru. İkinci şans aynı tipten taze soru (canlı turda ya da tip
tükenince 4 şıklı test).

### Yeni tip payı (an × mod, `PAY`) ve gerçekleşen (4.000 maç)

| an | 1'e 1 | 3 kişi | 4 kişi | eşli | gerçekleşen | gerekçe |
|---|---|---|---|---|---|---|
| yayılma | 0,45 | 0,50 | 0,50 | 0,50 | %45–50 | harita boşken: sıralama üreten yeni tipler (harita, "en yakın") |
| düello | 0,55 | 0,50 | 0,45 | 0,45 | %38–44 | 4 şıklı klasik omurga kalsın (Trivia Crack, Bil ve Fethet); 4 kişide düelloların çoğu iki bot |
| kuşatma | 0,65 | 0,65 | 0,65 | 0,65 | %43–52 | maçın en büyük anı: yıldız tipler (Halat, Fitil, Tufan) |
| eşitlik bozma | 0,30 | 0,30 | 0,30 | 0,30 | %19–29 | yalnız "en yakın kazanır": Tahmin ya da Mancınık (Triviador kuralı) |
| altın soru | 0,50 | 0,50 | 0,50 | 0,50 | (seyrek) | Tahmin ya da Mancınık |

Bütün maçta yeni tip payı %39–43; maç başına 6–7 (hızlı) / 9,5–10,5 (uzun) farklı yeni tip. Pay kategori başına ölçeklenir:
kategorinin yeni tip zenginliği (`Σ ağırlık / kapsam`) ortalamanın üstündeyse payı da o oranda büyük (en çok `PAY_UST` 0,85).
Böylece yalnız Coğrafya'da sorusu olan haritalı tipler, her kategoride sorusu olan Halat kadar sık gelir (`kapsam()`):
Coğrafya dilimi çoğunlukla haritalı yeni tiplerle, Spor dilimi çoğunlukla klasiklerle oynanır. Maç içi denge: o ana dek
hedeften az yeni tip geldiyse pay ×(1 + 1,4·açık), [0,6, 1,5] aralığında.

### Tip × an ağırlıkları (`YENI_W`), sınıf, üst sınır, film

| tip | yayılma | düello | kuşatma | eşitlik / altın | sınıf | kategori uyumu | maçta en çok (hızlı/uzun) | film tam / kısa (ms) | gerekçe |
|---|---|---|---|---|---|---|---|---|---|
| kusbakisi | 1,8 | 2,5 | 2 | – | harita, erken bilen | Coğrafya ×1,3, Tarih ×1,2 | 2 / 4 | 4.400 / 2.800 | "ilk bilen" gerilimi; başkent ilindeki yapı sorulmaz |
| ilavi | 2,5 | 1,2 | 1 | – | harita, en yakın | Coğrafya ×1,3 | 1 / 2 | 4.600 / 3.200 | 4 deneme × uzaklık: ince sıralama; uzun (32–35 sn) |
| kimim | 2,5 | 2 | 1,5 | – | harita, erken bilen | Coğrafya ×1,3 | 2 / 3 | 4.600 / 3.000 | ipucu sırası doğal sıralama |
| sive | 2,5 | 1,2 | 1 | – | harita, en yakın | Genel Kültür ×1,4, Sanat ×1,2 | 2 / 3 | 4.800 / 3.400 | ısı haritası çok kişide anlamlı |
| halat | – | 2,5 | 3 | – | canlı (2 kişi) | her kategori | 2 / 3 | 3.600 / 2.400 | yalnız düello; kuşatmanın yıldızı |
| fitil | – | 2,5 | 3 | – | canlı (2 kişi) | her kategori | 2 / 3 | 3.800 / 2.400 | yalnız düello; tek tur, tek kaybeden |
| mancinik | 2,2 | 1,5 | 1,5 | 1 | en yakın | – | 2 / 3 | 4.600 / 3.200 | "aşmadan en yakın": eşitlikte Tahmin'in eşi |
| yanlis | 1,5 | 1,5 | 1 | – | okuma ağır | Tarih, Bilim ×1,1 | 1 / 2 | 3.800 / 2.600 | yayılmada yalnız ≤30 sn'lik soru, kısa soru öne |
| ikidogru | 1 | 2 | 1 | – | okuma ağır | Bilim, Genel Kültür ×1,2 | 1 / 2 | 4.600 / 2.600 | açıklamalar okunur: tam film insanın düellosunda |
| harfal | 2 | 1,5 | 1 | – | en yakın | – | 2 / 3 | 3.400 / 2.400 | alınan harf sayısı: sıralama |
| azbilinen | 2,5 | 1 | 0,5 | – | okuma ağır, en yakın | Coğrafya, Genel Kültür ×1,1 | 1 / 2 | 4.200 / 3.000 | Pointless: kalabalıkta anlamlı |
| tufan | 1,5 | 2,5 | 2,5 | – | harita, sinematik | Coğrafya ×1,2 | 1 / 2 | 11.000 / 5.200 | 11 sn'lik film: hızlı maçta bir kez, insanın düellosunda tam |
| kayip | 1,5 | 2 | 2 | – | harita, erken bilen | Coğrafya ×1,3 | 2 / 3 | 4.600 / 3.000 | ipuçları saatinde: erken bilen kazanır |
| golge | 1 | 2 | 2 | – | erken bilen | Tarih | 1 / 2 | 5.600 / 3.200 | bayrakla |

Eski tipler: kategori ağırlıkları (`TYPE_WEIGHTS`) olduğu gibi; düello ve kuşatmada `choice` ×1,6 (4 şıklı test düellonun en sık
tipi: %15–16). Bankaya yeni giren çengel (25–100 sn) yayılmada ×0,6, kuşatmada ×0,5 ve maçta en çok 1 / 2; yıldırım ve
anagram en çok 2 / 3.

**Mod çarpanları (`modK`).** 3–4 kişi ve eşli yayılma: en yakın tipler ×1,25, bildi/bilemedi ×0,8, okuma ağır ×0,7 (herkes en
yavaşı bekler; sıralama ince olmalı). 1'e 1 düello ve kuşatmada canlı tur ×1,2 (her düello insanla). 4 kişi ve eşli düelloda
haritalı tipler ×0,85. **İzlenen bot düellosu** (yerel insan yalnız seyrediyor): haritalı tipler ×0,4, Tufan ×0,3 (kamera
savaştan kopmasın, uzun film yok).

**Kurallar.** Aynı tip art arda hiç (4.000 maçta 0); yeni tip son 3 soruda geldiyse ×0,15; iki canlı tur art arda yok; iki
haritalı soru art arda ×0,3; yasaklar her şeyi elerse yalnız "bir önceki tip değil" kalır. Canlı tur (Halat, Fitil) yalnız
düelloda ve kuşatmada; süre, sabotaj ve ikinci şans jokeri canlı turda yok (`jokers.support`, `T.duo`). "Erken bilen
kazanır" tipleri (`HIZLI`: Kuşbakışı, Kayıp İl, Kimim, Gölge) düelloda ikisi de bilirse eşitlik sorusu yerine erken bilen
(Kimim'de erken ipucu) kazanır. Fitil iki oyuncunun ortak turu: iki değer birbirinin oyununu taşır (`eslestir`), iki yargı
çelişmez. Mancınık ile bankadaki kardeş tahmin sorusu aynı maçta çıkmaz (`q.src`). Yayılma kategorisi: Coğrafya ×2,5 (harita
boşken haritalı tipler en anlamlı anında; yayılma turlarının ~üçte biri).

**Zorluk eğrisi (`egri`).** Hedef zorluk maç ilerledikçe −0,3'ten +0,3'e; kuşatma +0,2, altın soru +0,3; yeni bir tipin
maçtaki ilk sorusu −0,5 (oyuncu kuralı tanırken soru kolay).

### Uzun filmler (`filmMs` → `ctx.film` → `ui.reveal`)

| an | film | gerekçe |
|---|---|---|
| insanın ya da uzak oyuncunun düellosu / kuşatması | tam | cevap filmi tipin ödülü (Tufan'ın batışı, Kayıp İl'in inişi) |
| altın soru | tam | maçın son anı |
| 1'e 1 yayılma | tam | iki kişi, ardından kısa sıralama |
| 3–4 kişi yayılma | kısa | ardından sıralama ekranı gelir; herkes bekler |
| iki botun düellosu | kısa × `BOT_FILM` (en az arayüz süresi) | savaş filminin tempo kuralıyla aynı |
| ikinci şans | kısa | tek kişilik ara soru |

Yerelde dokununca erken geçer. Çevrimiçinde süre 'ask' ve 'reveal' olaylarında gider; sunucu `serverPace` ile filmin
bitişini bekler (herkes aynı anda ilerler; erken geçen istemci yalnız bekler). Maç süresine etkisi (4.000 maç): hızlı maçta
24–27 sn, uzun maçta 54–59 sn cevap filmi.

**Maç süresi (hedef hızlı 6–8, uzun 15–20 dk).** `PACE.byMode`: hızlı 1'e 1 10 düello, diğerleri 11; uzun 1'e 1 20, 3 kişi 27,
4 kişi ve eşli 28. Tahmini ortalama (4.000 maç): hızlı 7,5–7,9, uzun 17,8–18,5 dk. Koltuk adaleti: `test/kurallar.test.mjs`
(1'e 1 %50,2 / 49,8, eşli %50 / 50; 1.000–1.500 maç).

### Çevrimiçi (sunucu otoriter, `src/game/sunucu.js`, şema `net.js` başı)

| tip | istemci → sunucu (act) | sunucu → istemci (ev) | son değer (sunucunun kaydı) |
|---|---|---|---|
| hepsi | `acildi` (kart açıldı) | — | süre = cevabın varışı − onayın varışı (sunucu saati) |
| harfal | `harf` {} | `harf` {i, c} | {g, al: sunucunun açtıkları}; 50/50'nin bedava harfleri sayılmaz |
| ilavi | `il` {il} | `il` {il, km, dir, found, left, hint} | {taps} |
| kimim | `il` {il} | `il` {il, ok, lock} · `ipucu` {k, text} her 3 sn | {taps, at: doğru dokunuşun sunucu zamanından} |
| kayip | — | `ipucu` {k, text, bolge / il} `hintAt` saatinde | şık |
| sive | — | reveal: `heat` (gerçek dokunuşlar, istatistik) | {il} |
| yanlis | `yer` {w} (bir kez) | `yer` {w, ok, opts?} | {w: ilk işaret, f} |
| halat | `halat` {k, c} | `halat` {k, ok, r} · herkese `ip` {nets} | {log: sunucu damgalı} (tally) |
| fitil | `fitil` {k, c} | herkese `top` {ev} (open, ans, close, boom) | iki tarafın kaydı (ortak motor) |
| azbilinen | — | reveal: gerçek oranlar (`pct`, 20 cevaplık önsel) | sıra |
| tufan, kusbakisi, golge, ikidogru / mancinik | — | — | şık doğrulaması / sayı [min, max] |

Görünüm sertleştirme: Kuşbakışı ve Gölge'de yapı adı yerine maça tuzlu anlamsız kimlik (`q.sid`, tuz `hello` cfg.salt),
İl Avı silueti ve Kayıp İl boşluğu sadeleştirilmiş, tamsayıya yuvarlanmış çokgen, Mancınık'ta bankadaki kardeş soru kimliği
yok. Sınama: `test/net.test.mjs` (6 uzak koltuklu tam maç, her yeni tipte sızıntı, yeniden yargı, adım olayları, ipucu
saatleri, film beklemesi, olaylardan kurulan durum).
