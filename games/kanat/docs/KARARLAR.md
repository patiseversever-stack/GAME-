# KANAT — Karar Günlüğü

Kullanıcı uyurken verilen her kararın kaydı. Biçim: **Karar** — gerekçe. En yeni kararlar bölüm sonlarına eklenir.

## F0 — Kurulum (2026-10-08)

### Ortam doğrulaması (§6.1)
- `nproc` = 4, RAM 15 GB, Node 22.22.0, npm 10.9.4. Chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (Playwright 1.56 ailesi).
- Ağ: npm registry ✅, AWS Terrain Tiles (`s3.amazonaws.com/elevation-tiles-prod/terrarium/13/4890/3175.png` → 200) ✅, Google Fonts ✅, Poly Haven API ✅, raw.githubusercontent (tilezen/joerd atıf belgesi) ✅.
- ffmpeg, ImageMagick (`convert`, `montage`), Python3 + Pillow 12.3 hazır.

### Bağımlılıklar (tam sürüm, `^` yok)
- three 0.186.1, @types/three 0.186.0, postprocessing 6.39.5, fflate 0.8.3, vite 8.3.3, typescript 7.0.2, vite-plugin-singlefile 2.3.3, vitest 5.0.3, playwright-core 1.56.1, pixelmatch 8.0.0, pngjs 7.0.0, sharp 0.35.5, ktx2-encoder 0.6.0, bun 1.4.2, @types/node 22.15.30.
- **playwright-core 1.56.1** (son sürüm 1.64 değil) — kurulu Chromium revizyonu 1194 bu aileyle eşleşiyor; `executablePath` ile CDP uyumsuzluk riski yok.
- **vitest 5.0.3** birim test koşucusu — vite 8 ile resmî uyumlu (peer `^8.0.0`), TS'yi derlemeden koşar.
- `npm audit` 3 yüksek bulgu raporluyor: tümü dev araçlarında (build/test zinciri), çalışma zamanı paketine girmiyor. Brif "tam sürüm pinle, npm update yok" dediği için yükseltilmedi.

### JSC (iOS JavaScriptCore) determinizm testi
- **Karar:** Playwright WebKit bu container'da kurulu değil ve "playwright install" yasak. JSC çapraz testi için **Bun 1.4.2** (JavaScriptCore motoru) npm'den kuruldu. Aynı saf sim kodu Node (V8) ve Bun (JSC) altında koşturulup tick hash'leri karşılaştırılır (`npm run test:jsc`). Gerekçe: Bun'un motoru iOS WebKit'in kullandığı JavaScriptCore'dur; sim saf TS olduğu için tarayıcı gerekmiyor. WebKit tarayıcı motoru farkları (render) bu testin kapsamı değil, cihaz listesinde.

### Yapı
- **Karar:** Sim kodu `src/sim/**` altında (§4.2 proje yapısı), §4.G'deki `src/kanat/sim/**` değil. Gerekçe: ortak çekirdek yapısı (§4.2) üç oyunda aynı olmalı; çelişkide ortak sözleşme esastır.
- **Karar:** TS göreli import'ları `.ts` uzantılı, `erasableSyntaxOnly: true`. Gerekçe: aynı sim dosyaları Node (`--experimental-strip-types` artık varsayılan), Bun ve Vite'ta derlemesiz koşar; araç zinciri sadeleşir.
- **Karar:** Paralel ajanlar aynı çalışma ağacında **ayrık klasör sahipliği** ile çalışır (worktree yerine); commit'leri yalnız ana ajan atar. Gerekçe: 4 çekirdekte worktree başına `node_modules` kopyası ve birleştirme maliyeti yüksek; sahiplik tablosu (`docs/TECH_CONTRACTS.md`) çakışmayı önler.
- **Karar:** Ajan sayısı ve iş paketi: `nproc`=4 olduğu için Workflow aracı aynı anda ~2 ajan koşturur. Kod üretimi büyük iş paketleri hâlinde **arka plan Agent** çağrılarıyla (8 eşzamanlı uzman), belge/inceleme/QA turları **Workflow** ile yürütülür (§0).

### Süre
- Kullanıcı 2–3 saat kesintisiz çalışma istedi; brif 4–5 saat planlıyor. **Karar:** Öncelik sırası: (1) Kapadokya dikey dilimi hedef kalitede uçtan uca, (2) 5 gerçek arazi + 20 rota, (3) SÜRÜ.io, (4) Günün Rotası + Hayalet Düello, (5) Serbest Uçuş/Foto, (6) test ve belgeler. Yetişmeyen içerik çirkin hâliyle değil, kapsam dışı olarak raporlanır (§6.G kuralı).
