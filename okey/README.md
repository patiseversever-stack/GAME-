# Patisever Okey — kaynak

Klasik Okey ve 101 Okey. Tek kaynak ağacı, tek komutla tek dosya HTML üretir. Çıktı uygulamada (React Native WebView) ve tarayıcıda aynı şekilde çalışır.

```bash
npm ci
npm run build      # dist/okey-oyunu.html (uygulama + tarayıcı), dist/live.html (Artifact önizlemesi)
npm test           # kural motoru, bot, çözücü, yerleşim, eski motorla parite
npm run dev        # http://localhost:5173 — modüller derlenmeden, canlı
```

`npm run build:hd`, ıstakayı 2048 px dokularla gömer (~13 MB). Varsayılan derleme mobil 1024 px sürümü kullanır (~4 MB).

## Klasörler

| Yol | İçerik |
| --- | --- |
| `src/game/` | Kural motoru (saf mantık), skor, çözücü, botlar (`bot/`) |
| `src/ui/` | Masa sahnesi (`scene.js`), koreografi (`choreo.js`), dokunma (`input.js`), yerleşim (`layout.js`), 101 masası (`table101.js`, `workbench101.js`) |
| `src/render3d/` | three.js masa ve menü sahneleri, taş yüzleri (`tile-face.js`), taş takımları (`tile-themes/`: Çini, Ebru, Yağlı boya) |
| `src/app/` | Ana menü (`home.js`), profil merkezi (`hub.js`), duraklatma ekranı (`pause.js`), sayfalar ve ayarlar (`overlays.js`) |
| `src/audio/`, `src/meta/` | Ses ve müzik; ayarlar, profil, kayıt |
| `styles/` | Katmanlı CSS. Sıra `tools/build.mjs` içindeki `STYLES` listesindedir. |
| `assets/` | Yazı tipleri, ıstaka modeli (`rack.glb`, mobil: `rack.mobile.glb`, yeniden üretmek için `npm run glb:mobile`) |

## Uygulama köprüsü

Uygulama kabuğu sayfaya şu yüzeylerden bağlanır; bunlar korunmalıdır:

- `window.__okey`: `settings`, `profile`, `audio`, `ui`, `ctl`
- `window.__menu`: menü sahnesi
- `window.__okeyReplayIntro()`: menü görünür olunca girişi yeniden oynatır
- `header.h4-top` ve `.h4-ic`: çıkış düğmesi bu başlığa eklenir

Uygulama `window.PatiOkeyHost` tanımlar. Bu tanım varken tarayıcıya özgü ipuçları gösterilmez.
