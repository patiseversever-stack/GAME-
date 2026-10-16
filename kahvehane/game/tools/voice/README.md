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
- Oyun açılışta `VoicePlayer.load(manifestUrl)` çağırır (`src/audio/voice.ts`). Bir replik söylenince `play(id)` çalar. Ses dosyası ilk çalışta indirilip çözülür ve küçük bir önbellekte tutulur. Manifest yoksa yalnızca balon gösterilir. Vite dosya adlarını hash'liyorsa (`import.meta.glob`) yolları çözmek için ikinci parametreyi kullanın: `load(manifestUrl, rel => urls[rel])`.

## Ağ notu (bu sandbox)

Dış HTTPS bir vekilden geçer (`HTTPS_PROXY`). Node'un `fetch`'i vekili `NODE_USE_ENV_PROXY=1` ile kullanır, vekil sertifikasına da `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` ile güvenir. `HTTPS_PROXY` tanımlıysa betik kendini bu ayarlarla otomatik yeniden başlatır. Elle çalıştırmak için:

```sh
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node tools/voice/generate.mjs
```

Gereksinimler: Node 22.18+ (`dialogue.ts` doğrudan okunur) ve ffmpeg/ffprobe. Farklı yoldaysalar `FFMPEG` ve `FFPROBE` ortam değişkenleriyle verin.
