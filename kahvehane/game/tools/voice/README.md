# Seslendirme (ElevenLabs)

Replikler tek yerde durur: `src/ai/dialogue.ts` (Pişti, Blöf, galeri/market, botlar arası atışma, hızlı sohbet). Bu araç o dosyayı okur, her replik için ElevenLabs'te ses üretir ve oyunun okuyacağı dosyaları yazar. Ses dosyası yoksa oyun yine çalışır, replikler yalnızca konuşma balonunda görünür.

## 1. Anahtar (sohbete yazmayın)

1. ElevenLabs → Profil → **API Keys** → yeni anahtar. İzinler: Text to Speech, Voice Generation, Voices (yazma), History (okuma).
2. Claude Code oturumunun başlığındaki ortam menüsü → **Edit** → **Network secrets** (yoksa *Environment variables*) → ad: `ELEVENLABS_API_KEY`.
3. Yeni bir oturum açın; anahtar oradan okunur. Betik anahtarı hiçbir yere yazdırmaz ve dosyaya kaydetmez.

## 2. Komutlar (`game/` klasöründe)

| Ne | Komut |
|---|---|
| Ne üretilecek, kaç kredi? (anahtar gerekmez) | `node tools/voice/generate.mjs --dry` |
| Ucuz deneme seçkisi (24 replik, ≈ 920 kredi) | `node tools/voice/generate.mjs --samples` |
| Grup grup üret (pisti, blof, meta, banter, quick) | `node tools/voice/generate.mjs --group pisti,meta` |
| Karakter seslerini tasarla (önizleme) | `node tools/voice/generate.mjs --design` |
| Önizlemeyi seç → kalıcı ses | `node tools/voice/generate.mjs --pick riza=2` |
| Tasarla + ilk önizlemeyi otomatik seç | `node tools/voice/generate.mjs --design --auto` |
| Eksik replikleri üret | `node tools/voice/generate.mjs` |
| Sadece Rıza | `node tools/voice/generate.mjs --char riza` |
| Tek repliği yeniden üret | `node tools/voice/generate.mjs --only riza_botPisti_3 --force` |
| Metni değişen replikleri yenile | `node tools/voice/generate.mjs --stale` |
| Yedek model (v3 sorun çıkarırsa) | `node tools/voice/generate.mjs --v2` |
| Ağsız: yeniden normalize et / manifest yaz | `--renorm` / `--manifest` |

- **Sesler:** `tools/voice/voices.json`. `voice_id` boşsa önce `--design` çalıştırın. Önizlemeler `tools/voice/previews/<karakter>/1.mp3, 2.mp3, …` dosyalarına iner; dinleyip `--pick` ile seçin. İsterseniz ElevenLabs Voice Library'den bir sesin kimliğini doğrudan `voice_id` alanına da yazabilirsiniz.
- **Model:** `eleven_v3` (Türkçe, `[laughs]`, `[sighs]` gibi ses etiketleriyle). `--v2` ile `eleven_multilingual_v2` kullanılır ve etiketler metinden silinir.
- **Kredi:** 1 karakter yaklaşık 1 kredidir; etiketler de sayılır. Bütün replikler ≈ 33.200 kredi (1012 replik, 925 ses dosyası; `--dry` kesin sayıyı ve grup dökümünü verir). Önce `--samples` ile dinleyin.
- **Takma ad:** Aynı karakterde birebir aynı tts'li replikler (paylaşılan gülme, homurtu) bir kez üretilir; manifestte diğer kimlikler aynı dosyayı gösterir. Oyunda da tek replik sayılır (tekrar önleme).
- **Duygu / kararlılık:** Her isteğin v3 kararlılığı satırdan gelir (`dialogue.ts → stabilityFor`: gülme/bağırma/heyecan → 0 Creative, `[deadpan]` → 1 Robust, satır `stab` değeri her zaman kazanır); yoksa `voices.json` ayarı. `--dry` listesinde `s=` sütunu ve tahmini süre görünür.
- **Güvenli tekrar:** Var olan dosyalar atlanır. Hız sınırında (429) betik bekleyip yeniden dener. Ağ hatası ya da 5xx gibi belirsiz durumlarda istek tekrarlanmadan önce çıktı dosyasına, sonra ElevenLabs geçmişine bakılır; ses orada varsa yeniden üretilmez (iki kez ücret ödenmez).

## 3. Çıktı ve oyun

- Ham indirme: `tools/voice/.raw/` (git'e girmez, yeniden normalize için saklanır).
- Oyun dosyası: `assets/voice/<karakter>/<id>.mp3`. Mono, 64 kbps, yaklaşık −16 LUFS, tepe −1.5 dBTP, baştaki ve sondaki sessizlik kırpılmış (ffmpeg).
- `assets/voice/manifest.json`: `{id: {url, dur, h, p}}`. `url` manifeste göredir, `h` sesin hangi metinle üretildiğini, `p` önceliği (3 pişti/el sonu, 2 olay, 1 boş laf) gösterir.
- Oyun açılışta (boşta, `whenIdle`) yalnızca küçük manifesti yükler: `VoicePlayer.load(voiceManifestUrl())` (`src/main.ts`). Sesler önden indirilmez: bir replik ilk söylendiğinde indirilir + çözülür, küçük LRU önbellekte tutulur (12 çözülmüş, 32 sıkıştırılmış; paylaşılan sesler dosya adresiyle tek kayıt). İstisna: oyuncunun KENDİ karakterinin hızlı sohbet söyleyişleri (≈ 28 küçük dosya) ilk maçta boşta indirilip sabitlenir, gönderince anında çalar. Manifest ya da bir ses yoksa o replik yalnızca balonla görünür.

## 4. Oyunda konuşma: tek yönetici

Bütün konuşmalar (Pişti/Blöf replikleri, botlar arası atışma, hızlı sohbet + bot cevabı, galeri tanıtımı, market) tek bir `SpeechDirector`'dan (`src/audio/speech.ts`) geçer ve tek ses kanalına iner. Kurallar:

- Aynı anda asla iki ses yok. Öncelik: 3 büyük an (pişti, el başı/sonu, Blöf anı, galeri/market) > 2 olay / hızlı sohbet / atışma > 1 boş laf. Yüksek öncelik düşüğü 50 ms sönümle keser ve balonu kapatır; düşük öncelik düşer (replik seçilmez, tekrar hafızası boşa yanmaz).
- Atışma (A→B→C) bölünmez: satırlar sırayla, 450 ms arayla; öncelik 3 gelirse ya da el biterse tamamı iptal. Atışma insanın kararı, Blöf'ün 5 sn penceresi ve öğretici sırasında söylenmez (Pişti'de oyuncunun sırası, Blöf'te `ack` atışma bitene dek bekletilir, en çok ~7 sn).
- Hızlı sohbet büyük anı kesmez: kanal boşalınca söylenir (en çok 8 sn bekler, sonra bayatlar). Söyleyiş OYUNCUNUN karakter sesiyle, kendi koltuğunda; ardından kurala göre bir bot cevabı (0,8–1,6 sn sonra). Bekleme 4 sn, dakikada en çok 6 (istemci + ev sahibi).
- Balon sesle eşli: ses süresi + 450 ms görünür, ses kesilince hemen kapanır. Konuşurken efekt/ortam sesi kısılır (`sfx.duck`).
- "Konuşmalar" ayarı kapalı → hiç ses yok, balonlar eskisi gibi. Duraklat menüsü açıkken konuşma susar; masadan kalkış, VS girişi, sonuç ekranı ve uygulamanın arka plana geçmesi konuşmayı anında keser ve sırayı temizler. Sonuç ekranı son söz bitene dek (en çok ~3,8 sn) bekler.
- Test bayrağı: `?banter=1` atışmayı her uygun anda tetikler (olasılık 1).

## 5. Barındırma: `voice/` klasörü (sesler pakete GİRMEZ)

Oyun manifesti ve mp3'leri **index.html'in yanındaki göreli `voice/` klasöründen** okur (`src/ui/assets.ts → voiceManifestUrl`, `document.baseURI`'ye göre çözülür). Böylece tek dosya derlemesi ~20 MB mp3 ile şişmez ve iki derleme aynı yapıyı kullanır:

| Derleme | Komut | Çıktı |
|---|---|---|
| Normal | `npx vite build` | `dist/index.html` + `dist/assets/…` + **`dist/voice/`** (manifest.json + `<karakter>/<id>.mp3`) |
| Tek dosya | `npm run build:tek` → `node scripts/artifact.mjs` | `dist-tek/index.html`, `dist-tek/kahvehane-pisti.html` + **`dist-tek/voice/`** |
| Geliştirme | `npm run dev` (ve `dev/vite-game.config.ts`) | `/voice/…` (her sayfa yolunun altında) `assets/voice`'tan sunulur |

Kopyalamayı `vite.voice.mjs` (Vite eklentisi `khVoice`) yapar: yalnız `manifest.json` ve `<karakter>/<id>.mp3` (yarım `.part` dosyaları atlanır), her derlemede klasör sıfırdan yazılır.

**Expo / React Native WebView:** `dist-tek/kahvehane-pisti.html` (ya da `dist/`) ile `voice/` klasörünü uygulama paketine **aynı dizinde** koyun ve sayfayı dosya adresinden açın; göreli yol kendiliğinden `voice/manifest.json`'a gider. Örnek: Expo'da `assets/web/index.html` + `assets/web/voice/…` → `expo-asset`/`expo-file-system` ile belge dizinine kopyalayın (ya da Android'de `file:///android_asset/web/`, iOS'ta paket içi `web/` klasörü) ve `<WebView source={{uri: dir + 'index.html'}} originWhitelist={['*']} allowFileAccess allowFileAccessFromFileURLs allowingReadAccessToURL={dir} />` kullanın (`fetch` ile yerel dosya okunabilmesi için Android'de `allowFileAccessFromFileURLs`, iOS'ta `allowingReadAccessToURL` gerekir). `html` string ile (baseUrl'siz) açılırsa göreli yol çözülemez → oyun sessiz (yalnız balon) çalışır; o durumda `source={{html, baseUrl: dir}}` verin. Ses klasörü ayrıca CDN'de de durabilir: sayfa nereden açılıyorsa `voice/` onun yanında olmalı.

**Önizleme / korumalı iframe (opak köken):** yol yine sayfanın taban adresine göre çözülür (blob/data hilesi yok). Opak kökenli iframe'den aynı sunucuya `fetch` çapraz köken sayılır: sunucu `voice/` için `Access-Control-Allow-Origin: *` göndermiyorsa oyun hata vermeden yalnız balonla çalışır. Tek dosya HTML'i `voice/` olmadan da sorunsuz açılır.

## Ağ notu (bu sandbox)

Dış HTTPS bir vekilden geçer (`HTTPS_PROXY`). Node'un `fetch`'i vekili `NODE_USE_ENV_PROXY=1` ile kullanır, vekil sertifikasına da `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` ile güvenir. `HTTPS_PROXY` tanımlıysa betik kendini bu ayarlarla otomatik yeniden başlatır. Elle çalıştırmak için:

```sh
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node tools/voice/generate.mjs
```

Gereksinimler: Node 22.18+ (`dialogue.ts` doğrudan okunur) ve ffmpeg/ffprobe. Farklı yoldaysalar `FFMPEG` ve `FFPROBE` ortam değişkenleriyle verin.
