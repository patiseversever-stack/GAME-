# KANAT — Ekip sözleşmesi (paralel çalışma kuralları)

Bu belge paralel çalışan ajanların **ortak kurallarıdır**. Brif: `docs/BRIEF.md` (tek gerçek kaynak). Kararlar: `docs/KARARLAR.md`.

## 1. Genel kurallar (herkes)
- Çalışma kökü: `games/kanat/`. Bu klasör dışına dokunma.
- **`package.json` / `package-lock.json` değiştirme, `npm install` çalıştırma.** Kurulu paketler: three 0.186.1, postprocessing 6.39.5, fflate 0.8.3, vite 8.3.3, typescript 7.0.2, vitest 5.0.3, playwright-core 1.56.1, pixelmatch 8.0.0, pngjs 7.0.0, sharp 0.35.5, ktx2-encoder 0.6.0, bun 1.4.2, vite-plugin-singlefile 2.3.3, @types/three, @types/node. Ek paket gerekirse raporuna yaz; ana ajan kurar.
- **git commit / push yapma.** Ana ajan kilometre taşlarında commit'ler. (Eşzamanlı commit'ler index.lock çakışması yaratır.)
- Yalnız **sahibi olduğun klasörlere** yaz (aşağıdaki tablo). Başkasının dosyasında değişiklik gerekiyorsa raporuna "ARAYÜZ İSTEĞİ" olarak yaz.
- TypeScript: göreli import'lar **`.ts` uzantısıyla** (`import { x } from './foo.ts'`). `enum`, `namespace`, parametre property yasak (`erasableSyntaxOnly`; Node ve Bun TS'yi doğrudan çalıştırır). `import type` kullan (verbatimModuleSyntax).
- `TODO`/`FIXME` yazma. Placeholder/gri kutu yok.
- `src/sim/**` ve `src/modes/suru/sim/**`: **saf** — DOM yok, three.js yok, `Math.random`, `Date`, `performance.now` yok, `Math.sin/cos/tan/atan2/exp/pow/log` yok (yalnız `detMath`). Yalnız `+ − × ÷` ve `Math.sqrt/abs/floor/ceil/min/max/round/sign/fround/imul`.
- Sıcak döngüde allocation yok (typed array, ön-ayrılmış vektörler).
- Testler: `tests/unit/<alan>*.test.ts` (vitest). Kendi testlerini çalıştır: `npx vitest run tests/unit/<dosya>`. Tip kontrolü: `npx tsc --noEmit -p tsconfig.json` (başkalarının yarım dosyalarından hata gelirse yalnız kendi dosyalarını düzelt).
- Görsel doğrulama: `dev/<ajan>.html` + `dev/<ajan>.ts` dev sayfası yaz, `npx vite --port <port>` ile sun, `node tools/shot.mjs <url> <out.png> 390 844 1 20000` ile ekran görüntüsü al ve **Read ile gerçekten bak**. Ekran görüntüleri `tests/out/` (gitignore) veya kalıcı olanlar `docs/shots/<ajan>/`.
- Port tahsisi: terrain 5181 · render-world 5182 · render-props 5183 · ui 5184 · platform 5185 · audio 5186 · suru 5187 · flight 5188 · integrator 5173.
- Belgeler Türkçe, kod/yorum İngilizce. Karar verdiğinde `docs/decisions/<ajan>.md` dosyana yaz (ana ajan KARARLAR.md'ye birleştirir).

## 2. Klasör sahipliği
| Ajan | Sahip olduğu yollar |
|---|---|
| terrain | `tools/bake-terrain.ts`, `tools/terrain/**`, `src/sim/terrain/**`, `public/worlds/**`, `src/content/worlds.ts`, `src/content/worldConfig.ts`, `tests/unit/terrain*.test.ts`, `dev/terrain.*` |
| flight | `src/sim/**` (terrain/ hariç), `src/content/routes/**`, `tools/route-*.ts`, `tests/unit/sim*.test.ts`, `tests/jsc/**`, `dev/flight.*` |
| suru | `src/modes/suru/sim/**`, `tests/unit/suru*.test.ts` |
| platform | `src/core/**`, `src/perf/**`, `src/bridge/**`, `src/net/**`, `src/input/**`, `src/debug/**`, `index.html`, `kanat.html`, `host-demo.html`, `vite*.config.ts`, `tests/e2e/**`, `tests/unit/{perf,core,bridge,input}*.test.ts`, `docs/INTEGRATION.md`, `docs/CIHAZ_TEST_LISTESI.md`, `dev/platform.*` |
| render-world | `src/render/**` (props/, vfx/, pilot/, suru/ hariç), `tests/visual/**`, `dev/render-world.*` |
| render-props | `src/render/props/**`, `src/render/vfx/**`, `src/render/pilot/**`, `dev/render-props.*` |
| audio | `src/audio/**`, `dev/audio.*`, `tests/unit/audio*.test.ts` |
| ui | `src/ui/**`, `public/fonts/**`, `tools/fonts*.ts`, `dev/ui.*` |
| integrator (sonra) | `src/main.ts`, `src/modes/**` (suru/sim hariç), `src/render/suru/**`, `src/camera` (render/camera hariç) |

## 3. Paylaşılan arayüzler (değiştirmeden genişlet)
- `src/sim/types.ts` — `Command`, `FlightState`, `SimEvent`, `ProximityInfo`, `PropInstance`/`PropPrimitive`, `BalloonDef`, `RouteDef`, `WorldId`.
- `src/sim/terrain/types.ts` — `HeightGrid`, `WorldTerrain`, `TerrainSampler`.
- `src/core/settings.ts` — `Settings`, `DEFAULT_SETTINGS`, `QualityTier`.
- Dünya verisi: `public/worlds/<id>/world.json` + ikili dosyalar; yükleyici `src/content/worlds.ts` → `loadWorld(id): Promise<{config: WorldConfig, terrain: WorldTerrain, textures: {...}}>`; saf çözümleme `src/sim/terrain/decode.ts` (Node'da da çalışır, testler `fs` ile okur).
- Sim API (flight sahibi): `src/sim/FlightSim.ts` → `new FlightSim(world, route, opts)`, `.step(cmds: Command[])`, `.state: FlightState`, `.drainEvents(): SimEvent[]`, `.hash(): number`, `.snapshot()/.restore()`.
- Prop yerleşimi (flight sahibi): `src/sim/world/props.ts` → `buildProps(worldId, sampler, config): PropInstance[]` + `balloonsFor(...)`, `balloonPos(def, tSec, out)`. Render aynı fonksiyonu çağırarak görseli çarpışmayla birebir hizalar.
- Render API (render-world sahibi): `src/render/WorldRenderer.ts` → `create(canvas, tier)`, `loadWorld(data)`, `setTier(t)`, `render(dt, camera)`, `perf()`; props render: `src/render/props/PropsRenderer.ts` → `build(scene, props, balloons, tier)`, `update(simTimeSec, camPos)`.
- Kamera: `src/render/camera/*` (render-world): `FollowCamera.update(state, dt, prox)` (§2.4), `ReplayDirector`, `IntroCamera`.
- Ses API (audio sahibi): `src/audio/AudioEngine.ts` → `unlock()`, `setFlight({speed, bankRate, prox, mult, inCloud})`, `event(e: SimEvent | {type:string})`, `music.setWorld(id)`, `music.setIntensity(...)`, `setVolumes(...)`, `suspend()/resume()`.
- UI API (ui sahibi): `src/ui/UI.ts` → `UI.mount(root)`, ekran yöneticisi `show(screen, props)`, `hud.update(state)`; tüm metinler `src/ui/i18n.ts` (`t(key, params)`), TR/EN tablo.
- Köprü (platform): `src/bridge/GameBridge.ts` (§7.2, birebir).
- Performans (platform): `src/perf/PerformanceDirector.ts` (§5.3).

## 4. Koordinat ve zaman
- 1u = 1 m, +y yukarı, +x doğu, −z kuzey. Dünya merkezi (0,0) = `world.json` geo merkezi.
- Yön ψ: 0 = kuzey (−z), saat yönünde +x'e doğru artar.
- Sim 60 Hz (flight), çarpışma 2 alt adım; SÜRÜ.io 30 Hz. Render interpolasyon `alpha`.
- Sim zamanı tick ile sayılır. Puan/süre sim zamanıyla.
