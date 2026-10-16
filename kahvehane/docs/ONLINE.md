# ÇEVRİMİÇİ MİMARİ — Pişti · Blöf · (sonra) Okey

> Kullanıcı kararı (16 Ekim): üç oyun da çevrimiçi oynanacak; "şimdiden öyle kur ki sonra kolay olsun".
> Bu belge altyapının bugünkü hâlini, oyunların ona nasıl oturduğunu ve sıradaki adımları anlatır.
> Ağ kodu henüz YOK; ama ağa geçişte değişecek tek şey taşıma katmanı ve sunucunun barındırılmasıdır.

## 1. İlke: yetkili sunucu, aptal istemci

```
 Arayüz (blofMatch / match)                   ← yalnız olay sunar, düğme basar
   │  client.next() / client.act() / client.ack()
 GameClient            (src/net/client.ts)
   │  Transport arayüzü
 LocalTransport (bugün, aynı süreç)  ─ ─ ─  WebSocketTransport (yarın, src/net/remote.ts iskelet)
   │
 LocalHost             (src/net/host.ts)      ← bugün tarayıcıda, yarın AYNEN sunucuda
   │  GameEngine sözleşmesi (src/core/game.ts)
 Kural motoru          (src/core/blof.ts, pisti.ts; sonra okey.ts)   ← saf, deterministik
```

- **Motor saf ve deterministiktir:** `create(cfg)` + aynı hamle dizisi → aynı durum ve olaylar. Saat yok, `Math.random` yok;
  rastgelelik yalnız tohumdan (`src/core/rng.ts`). Bu sayede sunucu, istemci ve testler aynı kodu koşar; maç kaydı = tohum + hamle listesi.
- **Durum yalnız ev sahibindedir.** İstemci hiçbir zaman tam durumu (`BlofState`, `PistiState`) görmez; yalnız kendi koltuğunun
  görünümünü (`viewFor(state, seat)`) ve kendisine **süzülmüş** olayları (`redact(event, seat)`) alır.
- **Her hamle ev sahibinde doğrulanır** (`apply` → `{error}`); istemcideki `isLegalFor`/`legal` yalnız düğmeleri açıp kapamak içindir.
- **Zaman ev sahibindedir:** Blöf'ün 5 sn'lik penceresini, hamle süre aşımlarını ev sahibi sayar ve süre dolunca yetkili hamleyi
  (`{t:'windowClosed'}`, varsayılan hamle) kendisi uygular. Motor saatsizdir.

## 2. Sözleşme: `GameEngine` (src/core/game.ts)

| Üye | Anlamı |
|---|---|
| `create(cfg)` | Yeni oyun: durum + ilk olaylar (dağıtım, ilk sıra) |
| `apply(state, action)` | Yeni durum + olaylar ya da `{error, code}` (girdi asla değişmez) |
| `viewFor(state, seat)` | Koltuğun görebildiği her şey (seat −1: seyirci) |
| `redact(event, seat)` | Olayın o koltuğa giden hâli; `null` → hiç gitmez |
| `legal(view)` | İstemci için yapılabilecekler (Pişti: hamle listesi, Blöf: özet) |
| `actors(state)` | Şu an hamlesi beklenenler (botlar buna göre uyanır) |
| `epoch(state)` | Karar bağlamı sayacı; değişince bekleyen bot kararları/süre aşımları iptal |
| `actionSeat(action)` | Hamleyi kimin yaptığı; −1 = yalnız yetkili taraf (istemci gönderemez) |
| `timer(state)` | Kurulacak zamanlayıcı (Blöf: `w<id>`, 5000 ms, `windowClosed`) |
| `timeoutAction(state, seat)` | AFK oyuncu için varsayılan hamle |
| `defer(state, action)` | Henüz geçersiz ama birazdan geçerli olacak hamle (Blöf: pencere açıkken sıradakinin "at"ı) |

Botlar `BotBrain` arayüzünü uygular: `observe(süzülmüş olay)` + `decide(görünüm) → {action, delayMs, tell?}`.
**Bot asla gizli durumu görmez** → aynı bot sunucuda boş koltuğu doldurabilir, hatta oyun ortasında kopan oyuncunun yerine geçebilir
(`BlofBot` geçmişi görmediyse en temkinli varsayımla başlar; test: "oyun ortasında devralan bot").

## 3. Oyunlar bu sözleşmeye nasıl oturuyor

### Pişti — `pistiEngine` (src/core/pistiEngine.ts)
- Hamle: `{t:'play', seat, card}`. Zamanlayıcı yok; süre aşımında elindeki ilk kart atılır.
- Gizli bilgi: başkalarının eline dağıtılan kartlar ve masadaki 3 kapalı kart → süzülmüş olayda `-1` (`HIDDEN_CARD`).
- `game/match.ts` bugün motoru doğrudan kullanıyor ve **değişmedi**. Çevrimiçi Pişti için match, Blöf'teki gibi `GameClient`
  üzerinden olay sunacak şekilde çevrilecek (sunum kodu aynen kalır; yalnız "hamleyi kim üretiyor" değişir).
- Bot bağdaştırıcısı: `PistiBotBrain` (src/net/pistiLocal.ts). Test: ev sahibi üzerinden oynanan oyun, doğrudan motorla oynananla birebir aynı.

### Blöf — `blofEngine` (src/core/blofEngine.ts), kurallar docs/BLOF.md
- Hamleler: `open` (değer + 1–4 kart), `play`, `pass`, `challenge`, `decline` ("geç"), `windowClosed` (yalnız yetkili).
- Gizli bilgi: eller, kapalı atılan kartlar (`opened/played.cards` yalnız atana), alınan yığının içeriği (yalnız alana),
  kimin "geç" dediği (yalnız kendine). Açılan son atış (`reveal`) herkese açıktır.
- Zamanlayıcı: her atıştan sonra pencere (`timer` → `w<id>`); herkes geçerse motor pencereyi kendisi erken kapatır.
- Erteleme: pencere açıkken sıradaki oyuncu "at/pas" derse ev sahibi bunu "geç" sayar ve hamleyi sıraya alır; pencere blöfsüz
  kapanınca uygular, araya blöf girerse reddeder (`queued` / `rejected` mesajları).

### Okey (plan)
- Durum: 106 taş, gösterge, ıstakalar (gizli), ortadaki deste (gizli), atılan taşlar (açık), sıra.
- Hamleler: `draw` (desteden / soldakinin attığından), `discard`, `finish` (el açma; motor perleri/çiftleri doğrular).
- Gizli bilgi: ıstaka yalnız sahibine; desteden çekilen taş yalnız çekene; atılan taşlar herkese.
- Zamanlayıcı: hamle süresi (`turnTimeoutMs`) → süre aşımında desteden çek + en son çekileni at.
- Aynı `GameEngine`'i uygulayınca ev sahibi, istemci, botlar ve protokol hiç değişmeden çalışır.

## 4. Protokol (src/net/protocol.ts)

İstemci → ev sahibi: `join` · `action {cseq, action}` · `ack {seq}` · `resync` · `ping` · `leave`
Ev sahibi → istemci: `welcome {seat, seats}` · `seats` · `events {seq, events, view, actor, tell?}` · `sync {view, timer, reason}` ·
`timer {key, kind, ms, deadline}` · `timerCleared` · `rejected {cseq, error, code}` · `queued {cseq}` · `timeout {seat}` · `pong` · `closed`

- `seq` masada ortak ve artandır; her `events` mesajı o hamleden sonraki **tam görünümü** de taşır → istemci durum tutmaz,
  kayıp mesajda `resync` yeter.
- **Tempo (`ack`):** yerelde ev sahibi, insan arayüzü olayları sunup `ack` gönderene dek pencere sayacını başlatmaz ve botları
  uyandırmaz (en çok `paceMaxMs`, varsayılan 6 sn). Böylece 5 sn'lik halka, atış animasyonu bittiğinde dolmaya başlar.
  Çevrimiçinde aynı mekanizma kısa bir üst sınırla (ör. 1,5 sn) kullanılmalı; yavaş istemci masayı bekletmesin.
- **Saat:** `timer.deadline` ev sahibi saatindedir; istemci kalan süreyi `client.timeLeft()` ile hesaplar
  (alındığı andan bu yana geçen yerel süreyi düşer). Çevrimiçinde `ping/pong` ile saat farkı ölçülür.

## 5. Yeniden bağlanma, süre aşımı, yedek bot

- **Yeniden bağlanma:** sunucu oturum anahtarı (`join.token`) ile koltuğu tanır, `attach(seat, link)` yapar; istemci
  `welcome` + `sync {reason:'reconnect'}` alır ve masayı görünümden yeniden kurar. Olay geçmişi gerekmez.
- **Süre aşımı:** `turnTimeoutMs` (yerelde kapalı). Dolunca `timeoutAction` uygulanır, herkese `timeout {seat}` gider.
  Blöf'te: açması gerekiyorsa en kalabalık değeriyle doğru açar, turdaysa pas, penceredeyse geçer.
- **Yedek bot:** bağlantısı N saniyeden uzun kopan oyuncunun koltuğu bota devredilebilir (sunucu tarafında `BlofBot`, zorluk "orta").
  Oyuncu dönünce koltuğu geri alır. (Henüz uygulanmadı: ev sahibinde koltuk türünü çalışırken değiştirme eklenecek.)

## 6. Hile önleme

1. **Yetki sunucuda:** istemci yalnız niyet gönderir; her hamle motorda doğrulanır. Bağlantının koltuğu ≠ hamlenin koltuğu → ret
   (`bad-seat`). `windowClosed` gibi yetkili hamleler istemciden asla kabul edilmez.
2. **Tohum gizli:** tohumdan bütün eller hesaplanabildiği için tohum yalnız sunucuda üretilir/saklanır; görünüme konmaz
   (`BlofView`/`PlayerView` tohum içermez). Bot rastgelelik tohumları da sunucudadır.
3. **Gizli bilgi süzülür:** istemciye giden her şey `viewFor` + `redact`'tan geçer; testler hiçbir koltuğa başkasının kapalı kartının
   gitmediğini tüm oyun boyunca denetler.
4. **Kayıt ve itiraz:** maç kaydı = ayar + tohum + hamle listesi (`host.actions`); aynen yeniden oynatılabilir (test var).
5. **Ekonomi sunucuya taşınmalı:** çevrimiçi bahiste jeton düşümü/ödülü ve görev/başarım ilerlemesi sunucuda, sonuçtan (`BlofResult`,
   `GameResult`) hesaplanmalı. Bugünkü `game/profile.ts` yereldir; çevrimiçi maçlarda istemcinin "kazandım" demesine güvenilmez.
6. Hız sınırı (saniyede en çok N mesaj), mesaj boyutu sınırı ve protokol sürümü (`PROTOCOL_VERSION`) denetimi sunucuda yapılır.

## 7. Barındırma seçenekleri (karar verilmedi)

| Seçenek | Artı | Eksi |
|---|---|---|
| **Kendi WebSocket sunucusu** (Node + `ws`; ev sahibi kodu aynen) | Tam yetki, en basit eşleme: oda = `LocalHost` örneği | Sunucu işletmek, ölçekleme, yapışkan oturumlar |
| **Cloudflare Durable Objects** | Oda başına bir nesne = bir `LocalHost`; durum ve zamanlayıcı nesnede; WebSocket yerleşik | Cloudflare'e bağımlılık |
| **Supabase Realtime + Edge Function** | Kimlik/DB/eşleştirme hazır; Realtime kanalları yayın için | Realtime tek başına yetkili değil (istemciler arası yayın): hamle doğrulaması ve zamanlayıcı için yine sunucu tarafı (Edge Function ya da ayrı işçi) gerekir |

Öneri: oyun mantığı için **yetkili oda sunucusu** (WebSocket ya da Durable Object) + kimlik, profil, jeton ve eşleştirme için
Supabase (veritabanı). Hangisi seçilirse seçilsin `LocalHost` + motorlar aynen taşınır; yalnız `Transport` uygulaması yazılır.

## 8. Yerelde bugün nasıl kullanılıyor (Blöf)

```ts
import {createBlofLocal} from '../net/blofLocal';

const {host, client} = createBlofLocal({
  cfg: {seats: 4, teams: [0, 1, 0, 1], seed, firstSeat: 0},
  seats: ['human', 'zor', 'orta', 'kolay'],      // koltuk 0 bu cihaz
});
host.start();
for (;;) {
  const m = await client!.next();
  if (m.t === 'events') {
    for (const e of m.events) await sun(e, m.view);   // animasyon
    client!.ack(m.seq);                               // sayaç ve botlar ancak şimdi başlar
  } else if (m.t === 'timer') halka(client!.timeLeft());
  else if (m.t === 'rejected') uyar(m.error);
}
// düğmeler: client!.act({t:'open', seat: 0, rank: 7, cards}) · {t:'play',…} · {t:'pass',…} · {t:'challenge',…} · {t:'decline',…}
```

Çevrimiçine geçişte yalnız ilk satırlar değişir: `new GameClient(new WebSocketTransport(url))`; döngü ve sunum aynı kalır.

## 9. Durum

**Hazır (16 Ekim):**
- [x] `GameEngine` sözleşmesi; Blöf motoru; Pişti bağdaştırıcısı (Pişti davranışı değişmedi)
- [x] `LocalHost`: doğrulama, süzme, pencere zamanlayıcı, tempo (`ack`), erteleme, süre aşımı, yeniden bağlanma/`resync`, hamle kaydı
- [x] `GameClient`, `LocalTransport` (isteğe bağlı yapay gecikme), sanal saat (`VirtualClock`) ile testler
- [x] Botlar yalnız görünüm + süzülmüş olayla oynar (sunucuda koşabilir)

**Sıradaki:**
- [ ] Sunucu barındırma kararı (§7) ve `WebSocketTransport`'un gerçek sürümü (yeniden bağlanma, geri çekilme, kimlik)
- [ ] Oda/eşleştirme, arkadaşla oda kodu, seyirci (seat −1 görünümü hazır)
- [ ] Koltuğu çalışırken bota devretme (yedek bot) ve geri alma
- [ ] Pişti `match.ts`'in `GameClient` üzerinden sürülmesi
- [ ] Ekonominin (bahis, ödül, görev) sunucuya taşınması; sonuçların sunucuda hesaplanması
- [ ] Okey motoru (`GameEngine` uygulaması)
