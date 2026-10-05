# Scroll-driven 3D product showcase techniques (state as of Oct 2026) — for the Aksoy Kesici Takımlar hero

> Research notes for the report writer. Research method: web search plus fetches of primary sources. **Environment caveat:** this session's egress proxy blocked gsap.com, css-tricks.com, web.dev, caniuse.com, tympanus.net (Codrops), gltf-transform.dev, docs.astro.build and muffinman.io, and the web-search budget ran out partway through. To compensate, versions, defaults, sizes and browser support were checked **directly from the npm packages** (registry reachable) and from **MDN browser-compat-data 8.1.4 (timestamp 2026-10-01)**. Every "Local measurement / local inspection" line below is something I ran in this session (method stated). Claims taken only from search-result snippets, without fetching the page, are marked "(snippet)".

### Library versions verified on npm today (2026-10-05)
| Package | Latest | Notes |
|---|---|---|
| `three` | **0.186.1** (r186 published 2026-09-08) | Release cadence: r180 2025-09-03, r181 2025-10-31, r182 2025-12-10, r183 2026-02-18, r184 2026-04-16, r185 2026-06-25, r186 2026-09-08 — [npm three](https://www.npmjs.com/package/three) |
| `@react-three/fiber` | 9.8.1 | React 19-based line — [npm](https://www.npmjs.com/package/@react-three/fiber) |
| `@react-three/drei` | 10.7.9 | [npm](https://www.npmjs.com/package/@react-three/drei) |
| `@react-three/postprocessing` / `postprocessing` | 3.1.3 / 6.39.5 | [npm](https://www.npmjs.com/package/postprocessing) |
| `gsap` | **3.15.0** (2026-04-13); 3.13.0 = 2025-04-30 "free" release | [npm gsap](https://www.npmjs.com/package/gsap) |
| `lenis` | 1.3.26 | [GitHub](https://github.com/darkroomengineering/lenis) |
| `@gltf-transform/cli` | 4.5.1 | [npm](https://www.npmjs.com/package/@gltf-transform/cli) |
| `meshoptimizer` | 1.3.0 | [npm](https://www.npmjs.com/package/meshoptimizer) |
| `@google/model-viewer` | 4.3.1 | [npm](https://www.npmjs.com/package/@google/model-viewer) |
| `@splinetool/runtime` | 2.0.66 | [npm](https://www.npmjs.com/package/@splinetool/runtime) |
| `@theatre/core` | 0.7.2 — **last published 2024-05-19** | [npm](https://www.npmjs.com/package/@theatre/core) |
| `astro` / `next` / `vite` | 7.3.5 / 16.3.8 / 8.3.2 | [astro](https://www.npmjs.com/package/astro), [next](https://www.npmjs.com/package/next), [vite](https://www.npmjs.com/package/vite) |

### Measured bundle sizes (Local measurement: esbuild 0.28.2, `--bundle --minify --format=esm`, production define, then `gzip -9`)
| Entry imported | min | **gzip** |
|---|---|---|
| Vanilla three (WebGLRenderer, Scene, Camera, PMREMGenerator, GLTFLoader, DRACOLoader, MeshoptDecoder, RoomEnvironment) | 636 KB | **161 KB** |
| `three/webgpu` WebGPURenderer + GLTFLoader | 993 KB | **258 KB** |
| gsap + ScrollTrigger | 112 KB | **44 KB** |
| lenis | 18 KB | **5 KB** |
| React 19 + react-dom + R3F + drei (ScrollControls, useScroll, Environment, ContactShadows, useGLTF) | 1261 KB | **352 KB** |
| `@google/model-viewer` (it bundles its own three) | 1047 KB | **294 KB** |
| `@splinetool/runtime` (esbuild inlines all of its lazy chunks, so this is an upper bound) | 3945 KB | **~1056 KB** |
| Decoders shipped inside the `three` npm package: `meshopt_decoder.module.js` (WASM embedded in the JS) | 28 KB | **7 KB** |
| Draco: `draco_decoder.wasm` + `draco_wasm_wrapper.js` | 187 + 57 KB | **61 + 11 KB** |
| Basis/KTX2: `basis_transcoder.wasm` + `.js` | 514 + 56 KB | **239 + 14 KB** |
| Spline self-host entry files (from the package's build folder): `runtime.js` / `process.wasm` / `process.js` | 129 / 329 / 80 KB | **37 / 123 / 22 KB** (plus lazy chunks) |

---

## Technique A: image-sequence scrubbing (Apple AirPods/iPhone style)

### Takeaway
You render N frames offline, preload them, and on each scroll update draw `frames[Math.round(progress*(N-1))]` into a `<canvas>`, usually inside a pinned or sticky section. Quality is photoreal and identical on every device, and it does not depend on the GPU. The costs are download weight (often 5–20 MB), **decoded-bitmap memory on iOS Safari**, a camera path fixed at render time, and softness when the canvas is drawn larger than the frames. For Aksoy it works best as the **fallback/low-end path**, rendered from the same GLB, and not as the primary hero.

### Cited Findings
- The canonical write-up is CSS-Tricks, "Let's Make One of Those Fancy Scrolling Animations Used on Apple Product Pages". It uses a sticky full-viewport `<canvas>`, numbered JPG frames from Apple's AirPods Pro page, a scroll fraction of `scrollTop / (scrollHeight - innerHeight)`, `frameIndex = Math.min(frameCount-1, Math.ceil(scrollFraction*frameCount))`, a `requestAnimationFrame` wrapper around `drawImage`, and up-front preloading of every frame with `new Image()` — [CSS-Tricks](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/). *(The page was blocked here. These details come from the widely-copied article and from my prior knowledge of it. The writer should treat exact numbers such as the article's ~148 frames as unverified in this session.)*
- Modern GSAP variant: pin the viewport with ScrollTrigger and use `scrub` to map progress to the frame index. "60–150 exported frames, preloaded as images, drawn to a canvas where scroll progress selects the frame index" — [gsapvault "Scroll Image Sequence"](https://gsapvault.com/effects/scroll-image-sequence) / [vulk.dev](https://vulk.dev/blog/how-to-build-an-apple-style-scroll-website-with-ai) (snippet; aggregator-level guidance).
- Weight guidance: "90 frames × 200KB is 18MB — unacceptable on mobile; export WebP at display resolution, cap sequences near 100 frames, preload progressively, and consider serving half the frames on small screens" — [vulk.dev](https://vulk.dev/blog/how-to-build-an-apple-style-scroll-website-with-ai) (snippet).
- iOS Safari hard limits: a single canvas cannot exceed **16,777,216 pixels** (e.g. 4096×4096) — [Pqina: Canvas area exceeds the maximum limit](https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/). Total canvas memory on iOS Safari was capped at **384 MB on iOS 15**, lower on earlier versions and probably device-specific. Exceeding it produces "Total canvas memory use exceeds the maximum limit" — [Pqina](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/); [Apple Developer Forums thread 687866](https://developer.apple.com/forums/thread/687866).
- Decoding helpers, with support from MDN BCD 8.1.4:
  - `HTMLImageElement.decode()` is in Chrome 64, Firefox 68 and iOS Safari 11.3.
  - `createImageBitmap` is in Chrome 50, Firefox 42 and iOS Safari 15.
  - `ImageDecoder` (WebCodecs) is **not available on iOS Safari** (`false`); macOS Safari has it only in "preview".
  - `OffscreenCanvas`/`transferControlToOffscreen` is in iOS Safari 16.4.
  - `fetchpriority` on `<img>` is in Chrome 101, Firefox 132 and Safari 17.2.

  Sources: [MDN BCD](https://github.com/mdn/browser-compat-data), [MDN createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap), [MDN ImageDecoder](https://developer.mozilla.org/en-US/docs/Web/API/ImageDecoder).

### Inferences
- **Memory arithmetic (computed):** decoded RGBA costs `w × h × 4` bytes per frame.
  - 120 frames at 1440×1440 ≈ 8.3 MB each, ≈ **995 MB** in total. That crashes iOS.
  - 120 frames at 1080×1080 ≈ **560 MB**, which is still too much if all are kept as `ImageBitmap`.
  - 90 frames at 750×750 ≈ **200 MB**, which is borderline.

  The download size is irrelevant to this limit. Practical rule: keep frames as `HTMLImageElement` and let the browser manage decoded caches. Do not hold hundreds of `ImageBitmap`s. Alternatively decode only a sliding window of ±10 frames around the current index. Use a **separate mobile set**, e.g. 60 frames at ~720–828 px wide versus 120 frames at 1440–1920 px on desktop, chosen with `matchMedia`, not just CSS.
- **Recommended frame budget for Aksoy, if used:**
  - Desktop: 90–120 frames, 1600 px wide WebP/AVIF at q≈70, ~40–80 KB each, ≈ 4–8 MB total.
  - Mobile: 48–60 frames, 828 px wide, ~20–35 KB each, ≈ 1–2 MB total.

  Metal parts on a plain background compress very well. AVIF is smaller but slower to decode. WebP is the safer default for scrubbing. AVIF has been in Safari since 16.x (verify; not checked in BCD here).
- **Progressive preload order:** frame 0 first (it is also the poster/LCP image). Then every 8th frame, then every 4th, then every 2nd, then the rest. While a frame is missing, draw the nearest loaded frame. This makes the scroll usable after ~10% of the download.
- **Sprite sheets** (several frames per image) cut the request count. However, iOS's 16.7 MP per-image/canvas limit and the large decode spikes make them risky for big frames. They suit thumbnails only. HTTP/2 or HTTP/3 on Vercel, Netlify or Cloudflare makes 60–120 individual requests acceptable.
- **How frames are produced:**
  - (1) **Blender turntable**, the best option. Import the GLB, keep the camera fixed, keyframe the object's Z rotation over N frames, use an HDRI world, and render with EEVEE or Cycles to PNG. Then batch-encode with `cwebp -q 72` or `avifenc`.
  - (2) **three.js offline render.** Script the same scene used on the site with `renderer.setAnimationLoop` and stepped rotation, then `canvas.toBlob()` per frame (Puppeteer/Playwright can automate this). This guarantees the fallback matches the live hero.
  - (3) **Video → frames:** `ffmpeg -i turntable.mp4 -vf "fps=30,scale=1600:-1" -c:v libwebp -quality 72 f_%04d.webp`.
  - (4) Remotion, a React-based video renderer, is overkill for a single turntable.
  - None of these were benchmarked here.
- **Pros:** photoreal (Cycles reflections on carbide/steel), zero GPU or WebGL dependency, deterministic look.
- **Cons:** heavy; the camera path is frozen (any change means re-render and re-upload); no interactivity; blurry or letterboxed when the aspect ratio changes; frames must be re-rendered per breakpoint for a good fit.

### Gaps
- Could not fetch CSS-Tricks or Apple's current pages to verify Apple's exact current frame counts and resolutions in 2026.
- No authoritative current (iOS 26) figure for Safari's total canvas memory cap. The 384 MB figure is from iOS 15-era reports.

---

## Technique B: real-time WebGL with the GLB (three.js / R3F + GSAP ScrollTrigger + Lenis)

### Takeaway
This is the standard 2026 approach. A fixed or sticky full-screen `<canvas>` sits behind HTML sections. A GSAP ScrollTrigger timeline with `scrub` drives `model.rotation`/`position` and the camera. Feature text panels animate in from the left or right as ordinary DOM. Premium metal comes from **environment lighting (PMREM'd HDRI or RoomEnvironment) plus correct PBR values plus tone mapping**, not from post-processing. All the needed libraries are free: GSAP has been 100% free including every plugin since 3.13 (April 2025), and three/R3F/drei/Lenis are MIT.

### Cited Findings
**Licensing and versions**
- GSAP README (npm 3.15.0): "Thanks to Webflow, GSAP is now **100% FREE** including ALL of the bonus plugins like SplitText, MorphSVG, and all the others that were exclusively available to Club GSAP members… even for commercial use!" The license is GreenSock's "standard 'no charge' license" at gsap.com/standard-license — [npm gsap README](https://www.npmjs.com/package/gsap) (Local inspection of the package README); [Webflow blog](https://webflow.com/blog/gsap-becomes-free); [GSAP 3.13 release](https://gsap.com/blog/3-13/) (3.13.0 published to npm 2025-04-30).
- GSAP is **free-to-use, not open source**. The license forbids using it to build competing tools, and per summaries it restricts decompiling or modifying the source — [CSS-Tricks](https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/) / [noqode](https://www.noqode.fr/en/outils/gsap) (snippets). Webflow acquired GreenSock in **Oct 2024** (snippet; multiple secondary sources). One known exception from my prior knowledge, which **should be verified on gsap.com/standard-license**: the free license excludes use in tools that compete with Webflow's visual animation builders. That does not affect a marketing site.

**three.js status**
- three.js is at r186 / npm 0.186.1 — [npm three](https://www.npmjs.com/package/three). r186 added SunLight with cascaded shadow maps and multi-scattering energy-compensation fixes. r184 added HTMLTexture and "improves [TSL] compilation performance by 3.0x" — [three.js releases](https://github.com/mrdoob/three.js/releases).
- `three/webgpu` exports `WebGPURenderer`. Its source documents `forceWebGL` ("uses a WebGL 2 backend no matter if WebGPU is supported or not"), and it falls back automatically to `WebGLBackend` when WebGPU is unavailable — [WebGPURenderer.js](https://github.com/mrdoob/three.js/blob/dev/src/renderers/webgpu/WebGPURenderer.js) (Local inspection, r186).
- WebGPU support per MDN BCD 8.1.4:
  - **Safari 26 / iOS Safari 26**.
  - Chrome 113+ on ChromeOS/macOS/Windows, and from 144 on Linux with Intel Gen12+.
  - Firefox: Windows from 141, macOS Tahoe on Apple silicon later.

  Source: [MDN WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API).
- `WebGLRenderer` is still fully maintained and not deprecated; releases keep shipping changes to both renderers — [three.js releases](https://github.com/mrdoob/three.js/releases).
- Bundle cost: three/webgpu is 258 KB gzip versus 161 KB for the WebGL path (Local measurement, table above).

**Choreography: GSAP + Lenis**
- Lenis 1.3.26 GSAP integration from its README:
  ```js
  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  ```
  Option defaults: `lerp 0.1`, `duration 1.2`, `smoothWheel true`, **`syncTouch false`** (touch keeps native scrolling by default), `syncTouchLerp 0.075`, `touchMultiplier 1`, `autoRaf false`, `anchors false`. Known limitations: "capped to 60fps on Safari", 30 fps in Low Power Mode, no CSS scroll-snap without `lenis/snap`, and "syncTouch… can be unstable on iOS<16" — [Lenis GitHub](https://github.com/darkroomengineering/lenis).
- ScrollTrigger exposes `ScrollTrigger.normalizeScroll(true | NormalizeVars | Observer)` and `ScrollTrigger.config({ ignoreMobileResize, autoRefreshEvents, limitCallbacks, syncInterval })` — [GSAP type definitions, scroll-trigger.d.ts](https://github.com/greensock/GSAP/blob/master/types/scroll-trigger.d.ts) (Local inspection of gsap 3.15.0).

**R3F / drei alternative**
- drei `ScrollControls` props: `pages` (default 1), `distance`, `damping` (default 0.2 s), `horizontal`, `infinite`, `maxSpeed`, `eps`, `enabled`, `style`, `prepend`. `useScroll()` gives `offset`, `delta`, `range(start,len,margin)`, `curve()`, `visible()`. Important caveat: "Scroll controls create an HTML scroll container in front of the canvas". Page content therefore goes in `<Scroll html>` inside the canvas's own scroller, not in normal document flow — [drei ScrollControls docs](https://github.com/pmndrs/drei/blob/master/docs/controls/scroll-controls.mdx).
- R3F `<Canvas>` defaults to `dpr = [1, 2]` (Local inspection of @react-three/fiber 9.8.1 source).
- R3F performance guide recommends:
  - `frameloop="demand"` + `invalidate()`;
  - `PerformanceMonitor` with upper/lower fps bounds "to avoid ping-ponging";
  - `regress()`, multiplying `performance.current` by the pixel ratio;
  - fewer than 1,000 draw calls;
  - `<Detailed/>` for LOD.

  Source: [R3F scaling-performance docs](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/scaling-performance.mdx). drei also ships `AdaptiveDpr`, `PerformanceMonitor`, `BakeShadows`, `ContactShadows`, `AccumulativeShadows` and `Preload` (Local inspection of drei 10.7.9).
- **Static-hosting gotchas in drei:**
  - `useGLTF` defaults its Draco decoder to `https://www.gstatic.com/draco/versioned/decoders/1.5.5/`.
  - `<Environment preset="…">` downloads 1k HDRIs from `https://raw.githack.com/pmndrs/drei-assets/…/hdri/` (e.g. `studio` → `studio_small_03_1k.hdr`, `warehouse` → `empty_warehouse_01_1k.hdr`).

  Both are third-party CDNs at runtime. Self-host them by passing a decoder path to `useGLTF(url, '/draco/')` and using `<Environment files="/hdri/studio_small_03_1k.hdr">` — [drei Gltf source](https://github.com/pmndrs/drei/blob/master/src/core/Gltf.tsx), [drei environment-assets](https://github.com/pmndrs/drei/blob/master/src/helpers/environment-assets.ts) (Local inspection).

**Metal look in three.js**
- Tone mapping constants in r186: `ACESFilmicToneMapping`=4, `AgXToneMapping`=6, `NeutralToneMapping`=7, plus Linear, Reinhard, Cineon and Custom — [three src/constants.js](https://github.com/mrdoob/three.js/blob/dev/src/constants.js).
- `MeshPhysicalMaterial` supports `anisotropy`/`anisotropyRotation`/`anisotropyMap`, `clearcoat`, `iridescence` and `sheen` — [MeshPhysicalMaterial.js](https://github.com/mrdoob/three.js/blob/dev/src/materials/MeshPhysicalMaterial.js).
- GLTFLoader parses `KHR_materials_anisotropy`, `clearcoat`, `ior`, `specular`, `iridescence`, `transmission`, `volume`, `emissive_strength`, `dispersion` and `variants`, plus `EXT_meshopt_compression`, `KHR_draco_mesh_compression`, `KHR_mesh_quantization`, `KHR_texture_basisu`, `EXT_texture_webp`, `EXT_texture_avif` and `EXT_mesh_gpu_instancing` — [GLTFLoader.js](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/loaders/GLTFLoader.js) (Local inspection, r186).
- `RoomEnvironment` (procedural studio, zero download) ships in `examples/jsm/environments/`, alongside the new `ColorEnvironment` and `DebugEnvironment` — [three.js environments](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/environments).
- WebGL context loss: `WebGLRenderer` registers `webglcontextlost`/`webglcontextrestored` listeners on its canvas — [WebGLRenderer.js](https://github.com/mrdoob/three.js/blob/dev/src/renderers/WebGLRenderer.js).

### Inferences
**Recommended vanilla pattern** (smallest; about 161 + 44 + 5 ≈ 210 KB gzip for three + GSAP/ScrollTrigger + Lenis):
```html
<section id="showcase" style="position:relative;height:500svh">
  <canvas id="gl" style="position:sticky;top:0;width:100%;height:100svh"></canvas>
  <article class="feat" data-side="left">Karbür uç…</article>   <!-- absolutely positioned per step -->
  <article class="feat" data-side="right">16×16 sap…</article>
</section>
```
```js
gsap.registerPlugin(ScrollTrigger);
const tl = gsap.timeline({ defaults:{ ease:'none' },
  scrollTrigger:{ trigger:'#showcase', start:'top top', end:'bottom bottom', scrub:0.6 } });
tl.to(model.rotation,{ y:-0.6 },0)        // step 1: turn left
  .fromTo('.feat[data-side=right]:nth-of-type(1)',{xPercent:40,autoAlpha:0},{xPercent:0,autoAlpha:1},0.05)
  .to(model.position,{ x:-0.8 },0.25)     // move model left, text appears right
  .to(model.rotation,{ y:0.9, x:0.2 },0.25)
  .to(camera.position,{ z:2.2 },0.55);    // close-up on insert/edge
gsap.ticker.add(() => renderer.render(scene, camera)); // or render only on tl update
```
- A **sticky canvas** (CSS `position: sticky` in a tall section) avoids ScrollTrigger `pin` reparenting. It is generally more robust on iOS than pinning a transformed element. A ScrollTrigger `pin:true` on a 100svh wrapper also works.
- Use one master timeline with labels per feature step (`tl.addLabel('insert')`). Optionally use `snap: { snapTo: 'labelsDirectional', duration: {min:.2,max:.6} }` so the model rests at each feature.
- Render only when the timeline updates or Lenis scrolls, i.e. demand rendering. Stop the loop when the section is out of view (IntersectionObserver). This saves battery and heat on phones.
- **Lenis only for wheel and trackpad smoothing.** Keep `syncTouch:false` (the default) so phones use native momentum scroll. `scrub: 0.5–1` already smooths the model on touch. Lenis is optional; the sticky + scrub pattern works without it.
- On mobile, change choreography with `gsap.matchMedia()`: model centred and text below or overlaid with a gradient, instead of model on one side and text on the other.

**Metal recipe** (for a carbide insert and black-oxide/steel holder):
- Lighting and output: `renderer.toneMapping = THREE.NeutralToneMapping` (keeps product colours honest; AgX is more filmic; ACES crushes and saturates), `toneMappingExposure ≈ 1.0–1.2`, `outputColorSpace = SRGBColorSpace` (the default). Set `scene.environment = pmrem.fromScene(new RoomEnvironment()).texture` with zero download, or a 1k studio HDRI (~1–1.6 MB `.hdr`; Poly Haven assets are CC0) for richer reflections.
- Materials:
  - Holder: `metalness 1`, `roughness 0.35–0.5`, dark `color` (#2a2c30).
  - Carbide insert: `metalness 1`, `roughness 0.25–0.35`, or a gold/TiN coating colour (#c9a24a).
  - Optional `anisotropy 0.3–0.6` for brushed or ground surfaces.
  - `clearcoat` mostly reads as lacquer, so use it sparingly on metal.
- Grounding: drei `ContactShadows`, or a baked shadow PNG under the model (cheapest), instead of real-time shadow maps.
- Post-processing: **skip SSAO and bloom on mobile.** Each full-screen pass at DPR 2 on a 1170×2532 phone is about 3 M pixels per pass. If bloom is wanted on desktop for edge glints, gate it behind `PerformanceMonitor` or a desktop media query.
- **AI-generated GLBs** (from the client's AI 3D tool) typically arrive as a dense triangulated mesh with baked colour textures and wrong or absent metal/roughness. Expect to **override materials in code** (traverse meshes, assign `MeshPhysicalMaterial`) or fix them in Blender. This matters more for a premium look than any library choice.

**WebGPU decision:** for one hero model, `WebGLRenderer` is smaller (161 vs 258 KB gzip), mature and universally supported (WebGL2 is in iOS 15+). `WebGPURenderer` gives no visible benefit here. Revisit only if TSL or compute effects are needed.

### Gaps
- gsap.com docs and the license page could not be fetched. The exact current wording of the "no charge" license (including any Webflow-competitor clause) should be verified directly.
- Did not benchmark real frame times of PBR + HDRI on specific mid-range Android or iPhone models. No reliable public 2026 benchmark was found within budget.

---

## Technique C: video scrubbing (`video.currentTime` bound to scroll)

### Takeaway
This works only when the video is encoded **all-intra** (`-g 1`, every frame a keyframe) or nearly so (`-g 2`), at modest resolution, with H.264 Main/Baseline, and fully downloaded before scrubbing. Otherwise every seek decodes from the previous keyframe and stutters, especially in Safari. Image sequences give more predictable results. Video scrubbing suits long cinematic sequences where 100+ separate images would be unwieldy.

### Cited Findings
- Why it janks: with normal GOPs the decoder must decompress from the previous keyframe on each seek. "-g 1 (keyframe in every frame)… seeking is instantaneous", but it "basically doubles the file size". "-g 2 seems like a good balance… values much higher than two will start to produce noticeable lag" — [jeffpamer "Smooth Scrubbing Web Video FFMPEG Mega Command" gist](https://gist.github.com/jeffpamer/f3134c5145238d0fd4752221b2d75eb7):
  `ffmpeg -i input.mp4 -vcodec libx264 -pix_fmt yuv420p -profile:v baseline -level 3 -an -vf "scale=-1:1440, reverse" -preset veryslow -g 2 output.mp4`
- Real-world fix (portfolio PR) found three root causes of jank:
  - (1) a 78 MB file had to download before smooth scrubbing;
  - (2) "2-frame I+P GOP instead of all-intra";
  - (3) "2560×1440 H.264 High profile caused Safari's VideoToolbox to reject random-access seeks (-12909)".

  The re-encode used libx264 Main@4.0, `-g 1 -bf 0`, `-crf 26 -preset veryslow`, 1920×1080 lanczos. Result: **78 MB → 22 MB, ~24 → ~6.8 Mbps, all 642 frames I-frames, seeks "instant"** — [lujin88/LuJin-Portfolio PR #13](https://github.com/lujin88/LuJin-Portfolio/pull/13).
- A no-build reference implementation uses a sticky `<video>` in a tall container, maps `getBoundingClientRect()` progress to `currentTime`, and pauses work off-screen with IntersectionObserver. Encode: `ffmpeg -i in.mp4 -vf "scale=848:-2" -c:v libx264 -preset slow -crf 24 -g 1 -keyint_min 1 -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart …` — [sebasfavaron/sport-frames](https://github.com/sebasfavaron/sport-frames).
- Further write-ups: [Abhishek Ghosh — Playing with video scrubbing animations on the web](https://www.ghosh.dev/posts/playing-with-video-scrubbing-animations-on-the-web/), [Muffin Man — Scrubbing videos using JavaScript](https://muffinman.io/blog/scrubbing-videos-using-javascript/) (not fetched; egress blocked).
- `requestVideoFrameCallback` is available in Chrome 83, Firefox 132 and Safari/iOS 15.4 — [MDN BCD](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback). It is useful for knowing when a seeked frame has actually been presented.

### Inferences
- For a ~4–6 s turntable (120–180 frames at 30 fps), an all-intra 1080p H.264 file is likely 5–12 MB. That is similar to or larger than a WebP sequence of the same frames, with less control (no progressive preload, no per-frame fallback). It would be a 720p mobile encode of 2–5 MB.
- Use it only if the client delivers a finished rendered video rather than a GLB.
- Set `muted playsinline preload="auto"` and fetch it as a Blob first (`URL.createObjectURL`) so seeks never hit the network. Gate seeks with rAF and only seek when the target time changes by at least one frame.

### Gaps
- No 2026 cross-browser benchmark of `currentTime` seek latency (Safari 26 vs Chrome) was found. AV1/VP9 all-intra behaviour for scrubbing is untested here.

---

## Other options: `<model-viewer>`, Spline, Theatre.js, native CSS scroll-driven animations

### Takeaway
- `<model-viewer>` can do a basic scroll-orbit with **no JS of your own** via `env(window-scroll-y)`, but it costs ~294 KB gzip and gives limited choreography.
- Spline is the fastest to design visually, but its runtime is heavy, the free plan watermarks, and code export needs a paid plan.
- Theatre.js looks dormant on npm since May 2024.
- Native CSS scroll-driven animations are now in **Chrome/Edge 115+ and Safari/iOS 26**, but **Firefox stable still lacks them** (Nightly/flag only). They are fine for the text panels as progressive enhancement, but they cannot drive WebGL model rotation directly.

### Cited Findings
- **model-viewer:**
  - "You can use `env(window-scroll-y)` anywhere in the expression to get a number from 0-1 that corresponds to the current top-level scroll position."
  - Example: `camera-orbit="calc(30deg - env(window-scroll-y) * 60deg) 75deg 1.5m"` "causes the camera to orbit horizontally around the model as the user scrolls".
  - `calc()` is supported in camera-orbit and related attributes.

  Sources: [modelviewer.dev docs](https://modelviewer.dev/docs/) (snippet); [model-viewer discussion #4172 "Rotate 3D model using calc()"](https://github.com/google/model-viewer/discussions/4172). The `window-scroll-y` token is present in the 4.3.1 dist (Local inspection). The bundle is 294 KB gzip (Local measurement).
- **Spline:**
  - Export targets are Vanilla JS, React, Next.js, three.js and react-three-fiber.
  - The self-hosted export bundles `scene.splinecode`, `process.js`, `process.wasm`, `runtime.js`, plus optional `physics.js` and `opentype.js`.

  Sources: [Spline docs: Exporting as Code](https://docs.spline.design/exporting-your-scene/web/exporting-as-code) (snippet); [mandrasch/spline-selfhosted](https://github.com/mandrasch/spline-selfhosted); [Richard Rolfs self-host guide](https://www.richardrolfs.com/resources/how-to-self-host-a-spline-scene-and-embed-it-in-webflow).
  - Pricing per secondary aggregators: the free plan watermarks web exports; Starter ~$12/mo (annual) removes it; code export is in Professional ~$20/mo — [Spline pricing](https://spline.design/pricing) (prices via aggregator snippets, **verify**).
  - Runtime: `runtime.js` 37 KB + `process.wasm` 123 KB + `process.js` 22 KB gzip, plus lazy chunks; a fully inlined bundle is ~1 MB gzip (Local measurement, @splinetool/runtime 2.0.66).
- **Theatre.js:** `@theatre/core` latest is 0.7.2, last published 2024-05-19 — [npm](https://www.npmjs.com/package/@theatre/core).
- **CSS scroll-driven animations** (`animation-timeline: scroll()/view()`, `scroll-timeline`, `view-timeline`, `ScrollTimeline` API): Chrome 115, **Safari 26 and iOS Safari 26**, **Firefox "preview" only**, i.e. not in stable — [MDN animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline) (data: @mdn/browser-compat-data 8.1.4, 2026-10-01, Local inspection). Firefox keeps it behind `layout.css.scroll-driven-animations.enabled` — [Mozilla Connect thread](https://connect.mozilla.org/t5/discussions/why-doesn-t-firefox-support-the-css-animation-timeline/td-p/60742); intro article [Smashing Magazine (Dec 2024)](https://www.smashingmagazine.com/2024/12/introduction-css-scroll-driven-animations/). A search snippet claimed it is an Interop 2026 focus area; not verified.
- `scrollend` event: Chrome 114, Firefox 109, iOS Safari 26.2 (MDN BCD 8.1.4).

### Inferences
- `<model-viewer>` is a reasonable **"Plan B in one afternoon"**: Turkish text in normal HTML, a sticky `<model-viewer>` with `camera-orbit` calc on scroll, `environment-image="neutral"`, and `poster` for LCP. It weighs more than vanilla three and gives coarse control: no per-section easing, no position moves, no material overrides without its scene-graph API.
- Spline: avoid for this project. The runtime is ~5× heavier, the plan costs money, and the model is an external GLB anyway.
- Theatre.js: avoid given npm inactivity. GSAP timelines with labels cover keyframing needs. Blender can serve as the "keyframe editor" by exporting a baked camera/object animation in the GLB, with `AnimationMixer.setTime(progress*duration)` driven by scroll, an elegant way to get designer-authored motion.
- CSS scroll-driven animations: use for **text reveals only**, wrapped in `@supports (animation-timeline: view())`, with GSAP or IntersectionObserver as fallback (Firefox). Do not rely on them for the WebGL part, because JS still has to read progress.

### Gaps
- Could not fetch Spline's pricing page directly; the prices and plan names come from aggregators.
- Did not confirm whether Firefox stable ships scroll-driven animations in a release after BCD's 2026-10-01 snapshot.

---

## Hybrid approach & fallbacks (capable vs low-end devices, reduced motion, context loss)

### Takeaway
Ship a **static poster image first** (it is the LCP element and also the no-JS/SEO view). Lazily upgrade to real-time WebGL after first paint when the device qualifies. Otherwise keep the poster plus CSS text animations, optionally with a light image sequence. Respect `prefers-reduced-motion`, pause rendering off-screen, and handle `webglcontextlost`.

### Cited Findings
- `prefers-reduced-motion`: Chrome 74, Firefox 63, iOS Safari 10.3 (universal) — [MDN BCD](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).
- Capability hints are **Chromium-only**: `navigator.deviceMemory` (Chrome 63; Firefox/Safari `false`) and `NetworkInformation.saveData` (Chrome 65; Firefox/Safari `false`) — [MDN BCD](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory).
- WebGL2: Chrome 56, Firefox 51, Safari/iOS 15 — [MDN BCD](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext).
- three's `WebGLRenderer` listens for `webglcontextlost`/`webglcontextrestored` — [WebGLRenderer.js](https://github.com/mrdoob/three.js/blob/dev/src/renderers/WebGLRenderer.js).
- R3F/drei `PerformanceMonitor` and regression (`performance.current × dpr`) for adaptive quality — [R3F docs](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/scaling-performance.mdx).

### Inferences
Suggested gating logic:
```js
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const gl2 = !!document.createElement('canvas').getContext('webgl2');
const lowMem = (navigator.deviceMemory ?? 8) <= 2 || navigator.connection?.saveData;
const tier = (!gl2 || lowMem) ? 'static' : reduce ? 'static-3d' : 'full';
// 'static'    → keep <img> poster + CSS/IO text reveals (optionally 48-frame sequence)
// 'static-3d' → load 3D but no scroll-linked rotation (fixed hero angle, or click-to-rotate)
// 'full'      → dynamic import('./hero3d.js') after load/idle
```
- On iOS, which has no deviceMemory, use a runtime fps probe instead. Measure the average frame time over the first ~60 rendered frames. If it exceeds about 24 ms, drop DPR to 1, then switch off the environment-map resolution bump or extras.
- On `webglcontextlost`: call `e.preventDefault()`, fade the canvas out, and show the poster image. On restore, re-init or simply leave the poster. iOS can drop contexts when the tab is backgrounded or under memory pressure.
- **Do not hide content behind the canvas.** All Turkish feature text must be real DOM, readable without JS (SEO, accessibility).

### Gaps
- No authoritative, current "device tier" list for WebGL on mid/low-end Android (e.g. Mali-G52-class phones common in Turkey) was found. A runtime fps probe is the defensible approach.

---

## GLB optimization pipeline (gltf-transform, compression, decoders on static hosting)

### Takeaway
Run `gltf-transform optimize` with **meshopt + WebP textures at 1024–2048 px**, simplifying if the AI mesh is dense. Self-host the decoders from the `three` package. Meshopt's decoder is only **7 KB gzip with WASM embedded**, against ~72 KB for Draco and ~253 KB for the Basis/KTX2 transcoder. For a single hero model, meshopt + WebP is the best size/complexity trade-off. Aim for ≤1–1.5 MB GLB and ≤100–150k triangles.

### Cited Findings
- `gltf-transform optimize <in> <out>` defaults, from 4.5.1 `--help` (Local inspection; docs at [gltf-transform.dev/cli](https://gltf-transform.dev/cli)):
  - Compression: `--compress meshopt` (choices draco | meshopt | quantize | false), `--meshopt-level high`.
  - Textures: `--texture-compress auto` (ktx2 | webp | avif | auto | false; "KTX2 optimizes VRAM usage and performance; AVIF and WebP optimize transmission size"), `--texture-size 2048`.
  - Simplification: `--simplify true`, `--simplify-error 0.0001`, `--simplify-ratio 0`, `--weld true`.
  - Scene graph: `--flatten true`, `--join true`, `--instance true`, `--palette true`, `--prune true`.
- Individual commands include `inspect`, `validate`, `center`, `draco`, `meshopt`, `quantize`, `weld`, `simplify`, `resize`, `webp`, `avif`, `png`, `jpeg`, `etc1s`, `uastc`, `ktxfix`. **`etc1s`/`uastc` (KTX2) require KTX-Software's `toktx`** installed separately ("Compresses textures… to .ktx2 GPU textures using the KTX-Software") — [npm @gltf-transform/cli 4.5.1](https://www.npmjs.com/package/@gltf-transform/cli) (Local inspection).
- Decoders ship inside the `three` npm package (Local measurement):
  - `examples/jsm/libs/draco/gltf/` (`draco_decoder.wasm` 61 KB gzip + wrapper 11 KB);
  - `examples/jsm/libs/basis/` (`basis_transcoder.wasm` 239 KB + js 14 KB gzip);
  - `examples/jsm/libs/meshopt_decoder.module.js` (7 KB gzip, WASM embedded).

  Configure with `DRACOLoader.setDecoderPath()` and `KTX2Loader.setTranscoderPath()` — [three examples/jsm/libs](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/libs).
- drei's `useGLTF` defaults to a gstatic Draco CDN path (1.5.5) unless a path is passed — [drei Gltf.tsx](https://github.com/pmndrs/drei/blob/master/src/core/Gltf.tsx).

### Inferences
Pipeline for the client's AI GLB:
```bash
npx @gltf-transform/cli inspect tool_raw.glb                # tris, textures, materials
npx @gltf-transform/cli optimize tool_raw.glb tool.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 \
  --simplify-error 0.001                                     # loosen if AI mesh is 500k+ tris
npx @gltf-transform/cli center tool.glb tool.glb --pivot center
# optional mobile variant:
npx @gltf-transform/cli optimize tool_raw.glb tool_m.glb --compress meshopt --texture-compress webp --texture-size 512 --simplify-ratio 0.5
```
```js
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); // no extra files to host
// Draco instead: copy node_modules/three/examples/jsm/libs/draco/gltf/* → public/draco/
// new DRACOLoader().setDecoderPath('/draco/')
```
**Budgets:**
- Hero GLB: ≤1.5 MB desktop, ≤0.8–1 MB mobile.
- Triangles: ~50–150k (a lathe-like holder plus insert needs far fewer; AI meshes often have 200k–1M).
- Textures: 1–3 maps at 1024² (2048² only on desktop), ideally 1 material.
- Draw calls: 1–5.

KTX2 reduces GPU memory, roughly 4× smaller than RGBA. It is worthwhile when there are many or large textures, but for 1–3 textures the 253 KB transcoder outweighs the benefit.
- Use `gltfjsx` (`npx gltfjsx tool.glb --transform`) only with R3F. It generates a JSX component and can run the same transform internally. It is not needed for vanilla three.
- Static hosts serve `.wasm` and `.glb` as static files. Set long `Cache-Control` with hashed filenames, e.g. Astro `public/` plus content-hash naming, or Netlify/Vercel/Cloudflare `_headers`.

### Gaps
- gltf-transform.dev docs page could not be fetched. Defaults above come from the actual 4.5.1 CLI help, which is authoritative.
- No published 2026 guidance on triangle budgets per device class was found. The numbers above are practitioner rules of thumb, not sourced.

---

## Mobile performance, iOS quirks & Core Web Vitals

### Takeaway
The main levers:
- Cap DPR (≤1.5–2).
- Render on demand and pause off-screen.
- Avoid post-processing on phones.
- Size the hero with `svh`/`dvh` instead of `vh`.
- Prevent address-bar resizes from re-triggering layout and ScrollTrigger refreshes.
- Never let the canvas be the LCP element. A poster `<img fetchpriority="high">` is the LCP, and three.js initializes after load or idle.

### Cited Findings
- Small/large/dynamic viewport units (`svh`/`lvh`/`dvh`): Chrome 108, Firefox 101, iOS Safari 15.4 — [MDN BCD length units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#relative_length_units_based_on_viewport).
- R3F default `dpr=[1,2]`. The R3F guide: demand frameloop, PerformanceMonitor, regress, <1000 draw calls — [R3F docs](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/scaling-performance.mdx).
- Lenis: Safari is capped at 60 fps (30 in Low Power Mode); touch smoothing is off by default (`syncTouch:false`) and "can be unstable on iOS<16" — [Lenis](https://github.com/darkroomengineering/lenis).
- ScrollTrigger provides `normalizeScroll()` and `config({ ignoreMobileResize })` — [GSAP types](https://github.com/greensock/GSAP/blob/master/types/scroll-trigger.d.ts).
- `fetchpriority` (Chrome 101 / Firefox 132 / Safari 17.2), `content-visibility` (Chrome 85 / Firefox 125 / Safari 18) — MDN BCD 8.1.4.
- iOS canvas limits (16.7 MP per canvas; total canvas memory cap) — [Pqina](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/).

### Inferences
- **What normalizeScroll and ignoreMobileResize do** (from GSAP docs knowledge; gsap.com was blocked here, so verify):
  - `normalizeScroll(true)` moves scrolling onto the JS thread. That stops the iOS address bar from showing/hiding and removes jitter between native-thread scroll and JS-driven pins. It changes the native feel and is unnecessary if you use **sticky (not pinned) canvases**, so try without it first.
  - `ignoreMobileResize: true` keeps ScrollTrigger from running a full `refresh()` when only the mobile address bar changes the viewport height. I believe it is the default in recent 3.x, but this needs verification.
- **Canvas sizing on iOS:** size the sticky canvas container with `height: 100svh` (stable, not jumping) or `100lvh`. Size the renderer from the container's `clientWidth/Height`, not `innerHeight`. Debounce `resize`, and ignore height-only changes under about 120 px on touch devices to avoid reallocation when the toolbar collapses.
- **DPR:** `renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2))`. On a 3× iPhone this cuts fragment work by 4× versus native DPR. Antialias: `antialias:true` at DPR ≥1.5 is fine; skip MSAA plus post chains on mobile.
- **Frame budget:** 16.7 ms at 60 Hz. ProMotion 120 Hz iPhones/iPads do not need to hit 120 for a scrubbed turntable. Render only on scroll or tween updates, which keeps idle power near zero and avoids heat on long pages.
- **LCP/CLS:** a WebGL `<canvas>` is not an LCP candidate. LCP considers `<img>`, `<image>` in SVG, video posters/frames, CSS `background-image` and block text, per web.dev's LCP article ([web.dev/articles/lcp](https://web.dev/articles/lcp); blocked here, so treat as prior knowledge to verify).
  - The hero should therefore contain a real `<img>` render of the tool (AVIF/WebP, ~60–120 KB, `fetchpriority="high"`, explicit width/height) and/or the H1 text. The canvas fades in over the poster once the first frame renders, with no layout shift.
  - Import three.js with `import()` on `requestIdleCallback`/`load`, or Astro `client:visible`, so the ~210 KB of JS does not block LCP or INP.
  - Expected Lighthouse impact: TBT increases from GLB parse and shader compile. Mitigate with meshopt (fast decode) and `renderer.compile(scene, camera)` before showing.
- Thermal/battery: pause the rAF loop via IntersectionObserver when the showcase is off-screen and on `visibilitychange`. Avoid continuous idle auto-rotation on mobile.

### Gaps
- Could not fetch GSAP's normalizeScroll/ignoreMobileResize docs or web.dev's LCP article to quote exact current wording (egress blocked; search budget exhausted).

---

## Open-source starters, tutorials & demos for "scroll → model rotates left/right with side text"

### Takeaway
The closest ready-made references are **kgayanjith/productviewgsap** (Next.js + three.js + GSAP ScrollTrigger + Lenis; a shaker GLB rotates with scroll while feature text reveals) and **Fizzi2** (Next.js + R3F/drei `View` + GSAP; a can moves and rotates through alternating text sections). Codrops and Three.js Journey's "scroll-based animation" lesson cover the vanilla pattern.

### Cited Findings
- **kgayanjith/productviewgsap.** "Scroll driven 3D product showcase built with React, Three.js, GSAP and Lenis… the 3D shaker model appears, rotates and moves with the content while the product information is revealed". Lenis scroll is wired to ScrollTrigger, GLTFLoader auto-fits the model, and there are responsive adjustments under 1000 px. Demo: https://productviewgsap.vercel.app. "Intended for learning, experimentation and portfolio purposes" (no OSS license) — [GitHub](https://github.com/kgayanjith/productviewgsap).
- **santiagoswie2032/Fizzi2.** Next.js 14, R3F, drei, GSAP + `@gsap/react`, Zustand, Tailwind, Prismic. "GSAP ScrollTrigger pins sections and scrubs the 3D can's position, rotation, and camera FOV". It uses a single fixed canvas with drei `<View/>` per section. Demo: https://fizzi-clone-ten.vercel.app — [GitHub](https://github.com/santiagoswie2032/Fizzi2).
- **Codrops tutorials** (pages not fetched here; titles and dates from search results):
  - [Crafting Scroll Based Animations in Three.js (2022-01-05)](https://tympanus.net/codrops/2022/01/05/crafting-scroll-based-animations-in-three-js/): the classic alternating left/right text sections with meshes following scroll.
  - [On-Scroll Folding 3D Cardboard Box with Three.js and GSAP (2022-12-13)](https://tympanus.net/codrops/2022/12/13/how-to-code-an-on-scroll-folding-3d-cardboard-box-animation-with-three-js-and-gsap/): a ScrollTrigger timeline animating model rotation.
  - [Creating 3D Scroll-Driven Text Animations with CSS and GSAP (2025-11-04)](https://tympanus.net/codrops/2025/11/04/creating-3d-scroll-driven-text-animations-with-css-and-gsap/).
  - [Building a Scroll-Revealed WebGL Gallery with GSAP, Three.js, Astro and Barba.js (2026-02-02)](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/): a **current Astro + three + GSAP reference**.
  - [Scroll-Driven 3D Cube Gallery in Webflow with GSAP (2026-05-26)](https://tympanus.net/codrops/2026/05/26/building-a-scroll-driven-3d-cube-gallery-in-webflow-with-gsap/).
  - Cinematic scroll demos repo: [JosephASG/codrops-cinematic-scroll-animations](https://github.com/JosephASG/codrops-cinematic-scroll-animations).
- **Other references:**
  - [Medium — Scroll Driven presentation in Three.js with GSAP](https://medium.com/@pablobandinopla/scroll-driven-presentation-in-threejs-with-gsap-a2be523e430a)
  - [Medium — Add a 3D model to website using three.js and GSAP ScrollTrigger](https://medium.com/@minqicheah123/add-a-3d-model-to-website-by-using-three-js-and-gsap-scroll-trigger-6aa2d1fe8df4)
  - [GSAP forum — ScrollTrigger and ThreeJS](https://gsap.com/community/forums/topic/25016-scrolltrigger-and-threejs/)
  - GitHub topics [scrolltrigger](https://github.com/topics/scrolltrigger), [gsap-scrolltrigger](https://github.com/topics/gsap-scrolltrigger), [scroll-driven-animations](https://github.com/topics/scroll-driven-animations)
  - Image-sequence snippet: [gsapvault](https://gsapvault.com/effects/scroll-image-sequence)
  - Video scrub: [sport-frames](https://github.com/sebasfavaron/sport-frames)

### Inferences
- Use productviewgsap as the structural reference (one model, Lenis + ScrollTrigger, rotation tied to progress, feature reveals). Port it to vanilla three inside an Astro page rather than Next.js.
- The Codrops Astro + three + GSAP (2026) tutorial is the best current reference for wiring three.js into Astro.

### Gaps
- Could not open Codrops pages to confirm code details, licenses or demo URLs. Repo licenses: productviewgsap has no OSS license (reference only, do not copy verbatim). Fizzi2's license was not checked.

---

## Which framework for the whole site? (Astro vs Next.js vs Vite vanilla)

### Takeaway
**Astro (7.3.x) with static output** fits best:
- zero JS by default, so the catalog pages are pure HTML (best SEO and Core Web Vitals on cheap phones);
- product pages are generated from a data file via `getStaticPaths` or content collections;
- the 3D hero is a single island (a vanilla `<script>` or a `client:visible` component).

Next.js 16 static export works but brings the React runtime to every page. Plain Vite multi-page needs hand-rolled templating for the catalog.

### Cited Findings
- Astro: "By default, Astro will automatically render every UI component to just HTML & CSS, stripping out all client-side JavaScript automatically." Hydration is opt-in via `client:load`, `client:idle`, `client:visible`, `client:media`, `client:only`. "The majority of your website is converted to fast, static HTML and JavaScript is only loaded for the individual components that need it." Islands load in parallel and multiple frameworks are supported — [Astro docs: Islands](https://github.com/withastro/docs/blob/main/src/content/docs/en/concepts/islands.mdx) (GitHub source of docs.astro.build/en/concepts/islands).
- Versions: astro 7.3.5, next 16.3.8, vite 8.3.2 — npm (links in the table at top).
- React 19 + R3F + drei costs ~352 KB gzip; vanilla three + GSAP + Lenis ~210 KB gzip (Local measurement).
- Codrops (2026-02-02) demonstrates GSAP + three.js + **Astro** together — [Codrops](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/).

### Inferences
- **Recommended stack for Aksoy:** Astro (static) + vanilla three r186 `WebGLRenderer` + GSAP 3.15 ScrollTrigger + optional Lenis, with the 3D hero as an Astro component.
  - The hero `<script>` dynamically imports `hero3d.js` after `load`/idle, only when the tier is "full".
  - Products live in `src/data/urunler.json` (or a content collection), and `src/pages/urun/[slug].astro` + `getStaticPaths()` generates the pages.
  - Turkish slugs are ASCII-folded (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u).
  - WhatsApp CTA links are plain `https://wa.me/90…?text=` with no JS.
  - `<html lang="tr">`.
- **If the team strongly prefers React,** Astro + a React island (`client:visible`) with R3F/drei is fine. The extra ~140 KB only loads on the homepage hero.
- Next.js `output: 'export'` is viable on all free hosts but ships React to every catalog page and adds config overhead (no image optimization in static export by default). It is not needed for this scope.
- All candidates build to static files deployable on GitHub Pages, Netlify, Vercel and Cloudflare Pages.

### Gaps
- Did not measure an actual Next.js 16 static-export baseline JS size per page. Astro's vanilla `<script>` processing details were not re-verified in docs this session.

---

## Recommendation for Aksoy (synthesis)

### Takeaway
Build the hero as **real-time three.js (WebGL) driven by GSAP ScrollTrigger in a sticky section, inside a static Astro site**. Use a **pre-rendered poster image as LCP and as the fallback**, and optionally a **light 48–60-frame WebP sequence** for low-end/no-WebGL devices, generated from the same GLB. Spend the effort on **GLB cleanup and materials** (meshopt, 1K WebP, PBR metal override, studio env map), not on post-processing.

### Cited Findings
- Each part of the stack is free:
  - GSAP including all plugins, commercial use allowed — [npm gsap README](https://www.npmjs.com/package/gsap);
  - three.js r186 — [npm](https://www.npmjs.com/package/three);
  - Lenis — [GitHub](https://github.com/darkroomengineering/lenis);
  - gltf-transform — [npm](https://www.npmjs.com/package/@gltf-transform/cli).
- The vanilla stack is ~210 KB gzip JS, versus ~352 KB for the React/R3F stack, 294 KB for model-viewer and ~1 MB for the full Spline runtime (Local measurement).
- Image sequences on iOS hit hard memory limits — [Pqina](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/). Video scrubbing needs all-intra encoding and still hits Safari seek issues at high resolution/High profile — [PR #13](https://github.com/lujin88/LuJin-Portfolio/pull/13).

### Inferences
**Why real-time 3D wins for this client:**
- the client supplies a GLB (not a render);
- the camera choreography will change as copy evolves;
- the "rotate left/right + side text" effect needs only one model and simple transforms;
- total transfer (~210 KB JS + ~1 MB GLB + optional 1 MB HDRI or 0 KB RoomEnvironment) is lighter than a quality frame sequence (4–8 MB);
- it stays crisp at any aspect ratio.

The ~$10k agency video-frame approach is mostly a pipeline choice for photoreal renders, not a technical necessity.

**Build checklist:**
1. Clean the AI GLB in Blender if needed (separate holder and insert meshes so they can get distinct materials). Then run `gltf-transform optimize --compress meshopt --texture-compress webp --texture-size 1024` and target ≤1 MB.
2. Hero HTML: H1 + Turkish subtitle + `<img fetchpriority="high">` poster (a render of the same GLB at the opening angle). Below it, the sticky showcase section (`height: 400–500svh`) with 3–4 feature cards (e.g. "Karbür kesici uç", "16×16 mm sap", "2 mm kanal genişliği", "WhatsApp'tan teklif al").
3. Lazy-load three after `load`, then the tier check. Use `WebGLRenderer({antialias:true, alpha:true})`, DPR cap 1.5 mobile / 2 desktop, `NeutralToneMapping` (or AgX), RoomEnvironment or a self-hosted 1k studio HDRI, a contact-shadow PNG, and no post-processing on mobile.
4. One GSAP timeline with labels per feature, `scrub: 0.6`, and `gsap.matchMedia()` for separate desktop (model left/right of text) and mobile (model top, text bottom card) choreography. Render on demand only.
5. Fallbacks: `prefers-reduced-motion` gives a static angle with no scrub; no WebGL2, low memory or a slow fps probe keeps the poster (optionally a 48-frame sequence); `webglcontextlost` reverts to the poster.
6. Verify with Lighthouse mobile (LCP is the poster `<img>`, so the 3D adds no LCP cost), with Safari iOS 26 on a real device (toolbar collapse, memory), and with a mid-range Android.

### Gaps
- Real-device performance of the specific AI-generated GLB is unknown until the client delivers it. Triangle count and texture count drive most of the budget.
- Budget numbers (GLB ≤1 MB, ≤150k tris, DPR caps) are practitioner heuristics, not measured on target devices.
