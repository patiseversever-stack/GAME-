# Kahvehane — devir notu (yerel çalışmaya geçiş)

Bu dosya, projeyi buluttaki Claude oturumundan kendi bilgisayarında (Claude Code ya da elle) sürdürmek içindir. Önce bunu, sonra `KARARLAR.md` (ürün/kural kararları) ve `PHASES.md` (aşamalar, performans kuralları) oku. Bugüne kadarki tüm konuşma `SOHBET_GECMISI.md` dosyasında (repoda değil, ayrıca verildi).

## Nedir
Dikey (portre) premium Türk kart oyunu: **Pişti** + **Blöf**. Vite + TypeScript, 2D/DOM tabanlı masa (`src/table2d`). Expo uygulamasına `react-native-webview` ile gömülecek (`postMessage`). Yalnızca Türkçe, sanal jeton. Botlar + çevrimiçiye hazır mimari (saf kural motoru; `src/core`, `src/net`).

## Klasörler (`kahvehane/game`)
- `src/core` kural motorları (Pişti, Blöf), ev sahibi/istemci (`src/net`), `src/ai` botlar ve **tüm replikler (`dialogue.ts`)**.
- `src/table2d`, `src/ui` masa, HUD, ekranlar, efektler. `src/audio` konuşma yönetmeni (`speech.ts`: tek kanal, üst üste ses YOK) ve ses oynatıcı.
- `src/game` maç akışı, seri (51/101/151), profil (`localStorage` `kh.profile3`), uygulama kabuğu.
- `assets/voice` ~1400 seslendirilmiş replik + `manifest.json`. `tools/voice` ElevenLabs üretim aracı (`README.md`).
- `dev/*.html` laboratuvar sayfaları (masa, ekranlar, efektler…). `scripts/` ölçüm ve derleme araçları (`scripts/perf/README.md`).
- `../docs` bu belgeler. `../teslim` (git'te yok) teslim edilen sürümler: `v21` en yenisi; `Kahvehane_v21.zip` = oyun + ses klasörü.

## Kurulum ve komutlar (`kahvehane/game` içinde; Node 20+)
```
npm ci
npm run dev          # http://localhost:5173/  (telefondan aynı ağda: vite --host)
npx vitest run       # 368 test
npm run typecheck
npm run build:tek && node scripts/artifact.mjs   # → dist-tek/kahvehane-pisti.html + dist-tek/voice/ (YAN YANA yayınlanmalı)
```
Test sorguları: `?auto=1&game=pisti|blof&mode=1v1|4|esli&len=tek|51|101|151 (Blöf: 3|5)&q=low|high&seed=N&skipintro=1&chat=sakin|normal|geveze&chatpick=1&think=ms`.
Tam maç testi: `teslim/vNN` klasöründe `python -m http.server 4198`, sonra `node scripts/automatch.mjs 1v1 360 640 pisti` (sonuç ekranı gelir, konsol temiz olmalı).

## Çalışma düzeni (bulutta böyleydi, yerelde de iyi çalışır)
1. Değişiklik → `tsc --noEmit` + `vitest` + `vite build` **temiz bir kopyadan** (git worktree) geçmeden commit/push yok.
2. Sürüm: temiz HEAD'den `build:tek` → `artifact.mjs` → `teslim/vNN` → 4–6 otomatik maç (1v1/4/eşli, 360×640 … 412×915) → teslim.
3. **GPU bellek kuralı** (`PHASES.md`): büyük yumuşak ışık/degrade katmanları küçük `<canvas>` dokularına çevrilir, yalnız transform/opacity animasyonu, büyük blur/mask/clip-path yok. Aksi hâlde düşük telefonlarda ekran kararır/portre kaybolur.
4. Ses: replik metinleri yalnız `dialogue.ts`'te; `node tools/voice/generate.mjs --dry` ne üretileceğini ve kredi maliyetini gösterir. Üretim `ELEVENLABS_API_KEY` ortam değişkeniyle (yerelde dosyaya/depoya yazma); `ffmpeg` kurulu olmalı. Sonra `--manifest`.
5. İnsan oyuncuya **asla avatar adıyla** seslenilmez (çevrimiçi "Mustafa"ya "Cem" denmez): `lineAllowed` bunu zorlar; testler denetler.

## Durum (18 Ekim 2026)
- Yapıldı: Pişti (1v1/4/eşli, 51/101/151), Blöf (1v1/3/4/eşli, Tek El ve 3–5 el seri; yakalanan +2 ceza), el düzeni seçici, dört karakter sesi (Rıza, Dursun, Cem, Defne), atışmalar, hızlı sohbet (hedefe göre), **sohbet seviyeleri** (Sakin/Normal/Geveze; Geveze ≈ Normal'in 2,5 katı), maç sonu/ara skor konuşmaları, pişti vitrini (yığına dokun), GPU bellek düzeltmeleri (3 aşama), çakışmasız pişti yığını.
- ElevenLabs kredisi (Starter, ay başı 16 Kasım'da yenilenir): ≈ 17.000 karakter kaldı. Replik başına ≈ 30–40 karakter.
- Yayın bağlantısı (claude.ai artifact) v20'de kaldı; v21 aracın yanlış alarmı yüzünden yüklenemedi. Yerelde önemsiz.

## Açık işler / fikirler
- Gerçek cihazda doğrulama (WebView GPU bellek, ses kilidi, kare hızı) — hiç denenmedi.
- Atışma havuzunu 85 → ~130'a çıkar (Geveze'de uzun oturumda tükeniyor; ≈ 3.000 karakter).
- Okey için ses efektleri (ElevenLabs SFX; ≈ 11 kredi/sn, set ≈ 500–700 kredi).
- Claude API ile canlı karakter sohbeti (botlar/çevrimiçi): Console API kredisi ayrı; anahtarı yalnız gizli değişken olarak ver.
- Küçük: Blöf'te Sakin ölçümü gürültülü; `playerFastThrow` hiç yayınlanmıyor; `chatFixed` (app.ts) kullanılmıyor; 4 kişi 360×640'ta oyuncu yığını halkaya 1–2 px değiyor; kart atlası okuması çalışanı (worker) sürümde, yedek `toBlob` yolu var.
- Expo WebView entegrasyonu ve çevrimiçi sunucu (`ONLINE.md`) başlanmadı.

## Güvenlik
- Anahtarları (ElevenLabs, Meshy, Anthropic) **depoya, sohbete, dosyaya yazma**. Konuşma sırasında bir ElevenLabs ve bir Meshy anahtarı sohbete yapıştırıldı → bunları servis panelinden **iptal et**; `SOHBET_GECMISI.md` içinde değerleri silindi.
- Maç başında yalnız genel bilgiler yayınlanır; kapalı kartlar çevrimiçide sunucuda kalır (`pistiEngine` `hidden` sansürü).
