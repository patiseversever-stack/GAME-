# Example Sites & Design Patterns for "Aksoy Kesici Takımlar" (scroll-driven 3D showcase + premium industrial/tooling web design), as of Oct 2026

> Research method note (read first): WebFetch was blocked by the network egress proxy for every external domain tried (awwwards.com, tympanus.net, iscar.com, utsubo.com, hontran.dev, fonts.google.com, gwfh.mranftl.com, karburkesicitakim.com.tr). The session's WebSearch quota (200 calls) ran out partway through. So **every finding below comes from search-engine result summaries/snippets, not first-hand page visits.** Visual details such as colours, mobile behaviour and exact text layout of most reference sites could **not** be checked. These are flagged in each Gaps block. A human should open the shortlisted URLs on desktop and phone before the design is locked.

---

## Awwwards winners (2023–2026): scroll-driven 3D / WebGL / Three.js / product / industrial

### Takeaway
The Awwwards winners closest to our hero idea are **Oryzo AI (Lusion, 2026)**, **Cartier Watches & Wonders 2026 (Immersive Garden)** and **Igloo Inc (abeto, Site of the Year 2024)**:
- Oryzo AI: one physical object rendered live in Three.js, with scroll driving the camera through real depth.
- Cartier: one scroll "room" per product.
- Igloo Inc: fully WebGL, only three sections.

The most relevant **industrial/B2B** winners are **Q Industrial (Le:mma Studio, SOTD + Developer Award, June 2024)**, which sells industrial coatings, and **Hubtown (Unseen Studio, SOTD June 2026)**, which used a 3D hero to "dignify" a B2B brand. Mobile behaviour of these entries could not be checked (see Gaps).

### Cited Findings

**A. Site-level award winners and nominees**

1. **Oryzo AI** ([oryzo.ai](https://oryzo.ai/)), studio **Lusion**
   - Award: Awwwards announced it as Site of the Day, calling it "a cinematic product story that turns an ordinary cork coaster into an immersive digital experience" and tagging it #storytelling #transitions #GSAP — [Awwwards on X](https://x.com/awwwards/status/2043600792184099160).
   - A 2026 roundup says it also took **Site of the Month (April 2026) plus a Developer Award** — [Utsubo, Best Three.js Websites 2026](https://www.utsubo.com/blog/best-threejs-websites-2026). I could not confirm this on awwwards.com.
   - Technique: "One hero object rendered live in Three.js with real weight and inertia — easing that mimics physics, and a scroll that moves the camera through true Z-axis depth rather than sliding 2D layers. The restraint is the point: every frame is about the one object." — [Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026) (via search summary).
   - Concept: a fictional cork coaster presented with the gravity of a flagship-device launch, built as "a fully realised campaign world" — [Codrops on Lusion, Apr 2026](https://tympanus.net/codrops/2026/04/13/lusion-where-digital-craft-meets-ambitious-experimentation/).
   - Lusion published a 7-part behind-the-scenes series; part 3 covers the UX/UI and illustrations — [Lusion blog](https://blog.lusion.co/oryzo-bts-part-3-7-website-ux-ui-and-illustrations).
2. **Cartier – Watches & Wonders 2026** (digital twin of the pavilion), studio **Immersive Garden**
   - Award: Awwwards Site of the Day, with CSS Design Awards recognition.
   - Structure: "six self-contained 3D alcoves, one per timepiece, that you scroll through like rooms in a museum" — [Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026).
3. **Hubtown** (corporate site for an Indian property developer), studio **Unseen Studio**
   - Award: Awwwards **Site of the Day, June 2026**.
   - Visuals: "a glowing 3D monolith floating over a dark, reflective landscape" with mouse-reveal. The roundup calls it a "3D hero monolith … used to dignify a B2B brand" — [Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026).
4. **Sleep Well Creative**
   - Award: Awwwards **Site of the Day, January 2026**.
   - Concept: a scroll-driven guide to better sleep set in an illustrated 3D world you move through by scrolling — [Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026).
5. **Shopify Editions**: listed as a top 2026 Three.js site for its "scroll-sequenced product reveal with scroll as the narrative device" — [Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026). The specific Awwwards award level was not stated in what I saw.
6. **Igloo Inc** (landing page for the parent company of Pudgy Penguins), studios **abeto** with **Bureaux**
   - Award: **Site of the Year and Developer Site of the Year** — [abeto on X](https://x.com/abeto_co/status/1900152588768579701?lang=en). The post date (Mar 2025) implies the 2024 annual awards.
   - Pages: [Awwwards SOTD page](https://www.awwwards.com/sites/igloo-inc), [Awwwards case study](https://www.awwwards.com/igloo-inc-case-study.html).
   - The case study says the main challenge was keeping users engaged "with plenty of interactive elements across just three sections."
   - Stack: built entirely in WebGL, from procedurally grown ice crystals to shader-driven UI text, using Three.js, Svelte, GSAP, Houdini and Blender — [WebGPU.com showcase](https://www.webgpu.com/showcase/igloo-inc-procedural-crystals/); [three.js forum thread](https://discourse.threejs.org/t/landing-site-igloo-inc/67249).
7. **Lando Norris** (by **OFF+BRAND**): named Awwwards **Site of the Year 2025** in a search summary of [Awwwards Annual Awards – Winners](https://www.awwwards.com/annual-awards/winners). The summary did **not** say whether 3D scroll is its main device.
8. **Lusion (studio site)**: "Winner of Site of the Month May" — [Awwwards case study](https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html). The year was not shown in the result title.
9. **Q Industrial** (industrial coatings for metal and plastic), studio **Le:mma Studio**
   - Award: **Site of the Day, 2 June 2024, plus Development Award**. Jury score 7.26/10, weighted Design 40%, Usability 30%, Creativity 20%, Content 10% — [Awwwards: Q Industrial](https://www.awwwards.com/sites/q-industrial).
   - Tags: 3D, content architecture, UI design. Built on Webflow — [Webflow showcase](https://webflow.com/made-in-webflow/website/q-coatings-site); [Behance case](https://www.behance.net/gallery/199584463/Q-Industrial).
   - Awwwards also picked two of its UI elements as inspiration: an "About – Motion & Timeline" element ([link](https://www.awwwards.com/inspiration/about-motion-timeline-q-industrial)) and an "Industries & Surfaces" template page ([link](https://www.awwwards.com/inspiration/template-page-industries-surfaces-q-industrial)).
10. **"Industrials"**: Awwwards Nominee — [Awwwards](https://www.awwwards.com/sites/industrials). No details were in the snippet.
11. **Mousham Singh 3D Web**: Awwwards Honorable Mention, tagged 3D — [Awwwards](https://www.awwwards.com/sites/mousham-singh-3d-web). Low relevance.
12. **Three.js Game Gallery — 電脳遊技場**: Awwwards Nominee — [Awwwards](https://www.awwwards.com/sites/three-js-game-gallery-dian-noy-you-ji-chang). Not relevant beyond Three.js craft.

**B. Awwwards "Inspiration" element picks (curated UI patterns, not whole-site awards)**

13. **Symboticware – Industries pages**: industrial IoT for mining, forestry, logging, agriculture and construction. "3D that follows scroll" and "interactive 3D with highlighted units" — [Awwwards inspiration](https://www.awwwards.com/inspiration/industries-pages-symboticware).
14. **"3D Home Hero: Custom Three.js 3D header with camera tilt on-scroll" – We Enable Digital Engineers** — [Awwwards inspiration](https://www.awwwards.com/inspiration/3d-home-hero-custom-three-js-3d-header-with-camera-tilt-on-scroll-we-enable-digital-engineers).
15. **"3D Product Website" – Surge (3D product page / 3D e-commerce)** — [Awwwards inspiration](https://www.awwwards.com/inspiration/3d-ecommerce-website-surge-i-3d-product-page).
16. **"Interactive 3D Scroll" – Mastercard Business Outcomes**: 3D, WebGL and scroll tags — [Awwwards inspiration](https://www.awwwards.com/inspiration/interactive-3d-scroll-mastercard-business-outcomes).
17. **"Scroll 3D Animation" – Propel** — [Awwwards inspiration](https://www.awwwards.com/inspiration/scroll-3d-animation).
18. **"3D camera scroll" – Pixelynx Musicverse**: 3D camera, WebGL, Three.js, scroll — [Awwwards inspiration](https://www.awwwards.com/inspiration/3d-camera-scroll-submission-6364dde2a2f86187118961).
19. **"Web3 3D Website" – Tenbin Labs** — [Awwwards inspiration](https://www.awwwards.com/inspiration/web3-3d-website-tenbin-labs).

**C. Awwwards collections to browse manually**
- [Three.js collection](https://www.awwwards.com/awwwards/collections/three-js/)
- [Best Three.js websites](https://www.awwwards.com/websites/three-js/)
- [Best 3D websites](https://www.awwwards.com/websites/3d/)
- [Best Scroll websites](https://www.awwwards.com/websites/scrolling/?page=2)
- [Sites of the Year](https://www.awwwards.com/websites/sites_of_the_year/)
- [Sites of the Month](https://www.awwwards.com/inspiration_search/sites_of_the_month/)

**D. Trend context**
- A 2026 roundup argues "scroll became the storytelling engine in 2026, with brands like Cartier, Shopify, Sleep Well, and Primland driving the whole experience from scroll by sequencing 3D scenes rather than moving a 2D page" — [Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026).
- An open-source "Awwwards-style scroll-driven 3D website" starter for Claude Code uses **Three.js r170 + GSAP + Lenis**, which matches the de-facto stack — [GitHub: tsogjavklann/awwwards-3d](https://github.com/tsogjavklann/awwwards-3d).

### Inferences
- **Oryzo is the single best conceptual model** for our hero: one ordinary physical object, a tool or insert, treated "with the gravity of a flagship device". It has real-time inertia and camera depth, and nothing else competes for attention. That is exactly what "make a carbide insert look premium" needs.
- **Cartier's "one room per product" structure** maps well onto chapters. Each chapter can show one tool feature (substrate, coating, chipbreaker, clamping), or on brand pages one product family.
- **Igloo Inc shows that three sections are enough.** Award juries reward depth per section, not section count. For a dealer site, plan **4–6 hero chapters**, not 10+.
- **Q Industrial and Hubtown prove the "premium 3D" look works for B2B/industrial clients**, not just consumer brands. Q Industrial is also built on Webflow, which suggests the 3D layer can be modest and still win.
- Developer-award winners (Igloo, Oryzo) are full-WebGL builds by specialist studios. For a static dealer site, copy their **restraint, lighting and pacing**, not their full-WebGL UI. Keep text, navigation and catalog in normal HTML for SEO and accessibility.

### Gaps
- **Not verified for any Awwwards entry:**
  - mobile behaviour
  - exact chapter count (except Cartier = 6 alcoves and Igloo = 3 sections)
  - whether text panels alternate left/right
  - whether each site is still live in October 2026

  Event microsites (Cartier W&W 2026) and campaign sites (Oryzo) are at higher risk of being taken down.
- I could **not reach 15+ fully documented Awwwards entries.** Search quota ran out and awwwards.com is egress-blocked. Entries 1–9 and 13–19 are known only from titles and snippets.
- Award status conflict: Oryzo is "SOTD" per Awwwards' X post but "Site of the Month April 2026 + Developer Award" per Utsubo. Both may be true (a SOTD can later become SOTM), but this is unconfirmed.
- Candidates **from memory, not verified this session**, worth checking manually on awwwards.com: Bruno Simon's portfolio (Three.js), abeto's "Messenger", Lusion's other client work, and Apple-style hardware launch sites in Awwwards' "Product"/"Technology" categories.
- No Awwwards winner from the **cutting-tool or machine-tool** industry surfaced in the searches I could run.

---

## Which live sites best exemplify "scroll → 3D product rotates, text panels alternate left/right"? (technique, chapters, text layout, mobile)

### Takeaway
There are two proven techniques:
1. **Canvas image sequence (Apple AirPods Pro, 2019):** pre-rendered frames drawn to a sticky canvas by scroll position.
2. **Real-time WebGL/Three.js (Oryzo, Igloo, Cartier):** a GLB model whose rotation and camera are scrubbed by GSAP ScrollTrigger.

Video scrubbing is considered less reliable. For our single tool model, Three.js with a GLB, plus a static or image-sequence fallback, is the best fit.

### Cited Findings

**Curated master reference list (all categories).** Status column: ✔ = facts confirmed in search results; ◐ = partial; ✖ = could not verify the effect or availability as of Oct 2026.

| # | Site | URL | Category | Technique (as reported) | What to copy | Status |
|---|---|---|---|---|---|---|
| 1 | Oryzo AI (Lusion) | https://oryzo.ai/ | Awwwards SOTD/SOTM 2026 | Live Three.js, inertia, Z-depth scroll camera | Single-object hero, restraint, physics easing | ◐ |
| 2 | Cartier W&W 2026 (Immersive Garden) | (via Utsubo roundup; URL not captured) | Awwwards SOTD 2026 | 6 scroll "alcoves" (3D) | One chapter per product | ◐ / may be offline |
| 3 | Igloo Inc (abeto) | https://www.awwwards.com/sites/igloo-inc | Awwwards SOTY 2024 + Dev SOTY | Full WebGL, Three.js + Svelte + GSAP | 3 deep sections, shader text | ◐ |
| 4 | Hubtown (Unseen Studio) | (via Utsubo roundup) | Awwwards SOTD Jun 2026 | 3D monolith, dark reflective scene | Dark premium B2B hero | ◐ |
| 5 | Shopify Editions | (via Utsubo roundup) | Three.js roundup 2026 | Scroll-sequenced product reveal | Scroll as narrative device | ◐ |
| 6 | Q Industrial (Le:mma) | https://www.awwwards.com/sites/q-industrial | Awwwards SOTD + Dev, Jun 2024 | 3D + Webflow | Industrial B2B premium look | ◐ |
| 7 | Symboticware industries pages | https://www.awwwards.com/inspiration/industries-pages-symboticware | Awwwards inspiration | 3D follows scroll, highlighted units | Callouts on 3D parts | ◐ |
| 8 | We Enable Digital Engineers | https://www.awwwards.com/inspiration/3d-home-hero-custom-three-js-3d-header-with-camera-tilt-on-scroll-we-enable-digital-engineers | Awwwards inspiration | Three.js header, camera tilt on scroll | Subtle engineering hero | ◐ |
| 9 | Apple AirPods Pro page (2019 version) | https://www.apple.com/airpods-pro/ | Apple | Canvas image sequence (65 PNG, 15.2 MB) | Sticky canvas + sticky copy | ✖ current page not verified |
| 10 | Webflow "GSAP Image Sequence Scrub (Apple AirPods)" | https://webflow.com/made-in-webflow/website/gsap-video-animation-on-scroll | Reference build | GSAP + image sequence | Clone-able implementation | ✔ |
| 11 | Codrops – Cinematic 3D scroll with GSAP (Nov 2025) | https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/ | Tutorial | ScrollTrigger + ScrollSmoother + SplitText camera beats | Camera/text beat choreography | ✔ |
| 12 | Codrops – Crafting scroll-based animations in Three.js | https://tympanus.net/codrops/2022/01/05/crafting-scroll-based-animations-in-three-js/ | Tutorial | Three.js scroll | Base pattern | ✔ |
| 13 | Codrops – On-scroll folding 3D box (Three.js + GSAP) | https://tympanus.net/codrops/2022/12/13/how-to-code-an-on-scroll-folding-3d-cardboard-box-animation-with-three-js-and-gsap/ | Tutorial | Three.js + ScrollTrigger | Product transforms on scroll | ✔ |
| 14 | Sandvik Coromant | https://www.sandvik.coromant.com | Manufacturer | CoroPlus Tool Library 3D assemblies | Knowledge content, ISO material pages | ◐ |
| 15 | ISCAR (NEOITA) | https://www.iscar.com/en-hq/technical-articles/year-2026/how-iscars-neoita-integrates | Manufacturer | Tool advisor with 2D+3D views | Guided tool selection | ◐ |
| 16 | Tungaloy (TR) | https://tungaloy.com/tr/ | Manufacturer | e-Catalog, machining calculator, AI assistant "Gabby" | Calculator + catalog checks | ◐ |
| 17 | Gühring CAD/cutting data | https://guehring.com/en/service/digital-services/cad-and-cutting-data/ | Manufacturer | CAD portal (DXF/STP) | "Download 3D/CAD" on product pages | ◐ |
| 18 | Walter online catalogue | https://www.walter-tools.com/en-us/tools/search-and-shop/walter-online-catalogue | Manufacturer | Filters: parameters, material group, machining method | Filter model | ◐ |
| 19 | Kennametal product selector + conversion guide | https://kennametal.com/en/resources/product-selector.html | Manufacturer | 3-step insert selection, 6 material groups; cross-reference | Cross-brand conversion idea | ◐ |
| 20 | Machining Doctor ISO insert calculator | https://www.machiningdoctor.com/isoturn/ | Tool | ISO insert decoder | Our ISO decoder tool | ✔ |
| 21 | NOX Metals insert decoder | https://noxmetals.co/resources/insert-geometry-decoder | Tool | Type "CNMG 432" / "WNMG 080408" → per-character meaning + shape visual | Decoder UX | ✔ |
| 22 | TKT Industrial (Trakya Kesici Takımlar) | https://www.tkt.com.tr/tr | Turkish dealer | AI catalog assistant, 6 brands, 4,700+ products | Benchmark competitor | ✔ |

**Technique evidence**
- **Image sequence on canvas (Apple):**
  - Apple's AirPods pages "pin a section, then draw a single frame from an image sequence onto a canvas based on scroll position, so the scrollbar works as a playhead." Scrolling back runs it in reverse. Drawing one frame is one line of code: `context.drawImage(images[airpods.frame], 0, 0)` — [CSS-Tricks](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/).
  - "The AirPods animation is comprised of 65 PNGs weighing in at a total of 15.2MB." GSAP ScrollTrigger pins the section and reports 0→1 progress, which is mapped to a frame index — [GSAP forum](https://gsap.com/community/forums/topic/25188-airpods-image-sequence-animation-using-scrolltrigger/); [CSS-Tricks](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/).
  - Typical structure: the scroll container is ~500vh tall, the canvas is fixed and centred, and a scroll listener updates both the frame and the **opacity of sticky copy** — [Medium: Apple-style AirPods animation](https://ankittrehan2000.medium.com/creating-scroll-animations-similar-to-apples-airpods-pro-page-bc5c1c0814df).
- **Video vs. image sequence:** "Video can be compact, but scrubbing smoothly in both directions is difficult and inconsistent across devices… image sequences remain the most reliable choice for scroll-controlled playback" — [Scrollsequence guide 2026](https://scrollsequence.com/how-to-make-scroll-image-animation/). The same search summary says Apple's newer pages use "synchronized video scrolling". I could not confirm this from a primary source.
- **Criticism to avoid:** Apple's 2019 AirPods Pro page was called "scrolljacking hell" by John Gruber — [Daring Fireball](https://daringfireball.net/linked/2019/10/28/airpods-pro-scrolljacking-hell).
- **Real-time Three.js + ScrollTrigger:** "GSAP's ScrollTrigger plugin lets you tie 3D animations directly to how far the user has scrolled, making it the standard approach … alongside Three.js" — [search summary citing Medium tutorial](https://medium.com/@minqicheah123/add-a-3d-model-to-website-by-using-three-js-and-gsap-scroll-trigger-6aa2d1fe8df4).
- Codrops' Nov 2025 tutorial uses ScrollTrigger, ScrollSmoother and SplitText to "orchestrate camera moves and text beats", with a scroll timeline tied to camera movement and object rotation — [Codrops](https://tympanus.net/codrops/2025/11/19/how-to-build-cinematic-3d-scroll-experiences-with-gsap/). Related Codrops tutorials: [3D scroll-driven text animations (Nov 2025)](https://tympanus.net/codrops/2025/11/04/creating-3d-scroll-driven-text-animations-with-css-and-gsap/), [scroll-revealed WebGL gallery with Astro (Feb 2026)](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/), [scroll-driven 3D cube gallery in Webflow (May 2026)](https://tympanus.net/codrops/2026/05/26/building-a-scroll-driven-3d-cube-gallery-in-webflow-with-gsap/).
- **Mobile and performance (search summaries of [Frontend Masters: Virtual Scroll-Driven 3D Scenes](https://frontendmasters.com/blog/virtual-scroll-driven-3d-scenes/), [Three.js Scroll World Builder playbook](https://www.claudecodehq.com/playbooks/threejs-scroll-worlds), [a portfolio PR running scroll-3D on phones](https://github.com/akhan19760/abdur-portfolio/pull/9)):**
  - Modern builds "run the full scroll-driven experience on every device, with only users who prefer reduced motion getting the flat version".
  - Use **one persistent renderer/scene** with native scroll converted into a single progress value, instead of a canvas per section.
  - Mobile budget of **150k–300k visible triangles, 50–90 draw calls, 1–2 shadowed lights**, frame time ≤16.7 ms (≤25 ms fallback).
  - Throttle to **30 fps** on weak devices; disable bloom or use half-resolution post-processing on mobile.
  - Under reduced motion, snap to the nearest chapter and keep the full DOM story. **Preserve native reversible scroll** and never trap the wheel.

  The summary did not attribute each number to a specific one of these sources.
- Reduced-motion support via `prefers-reduced-motion` is presented as needed for WCAG 2.1 compliance — [Pope Tech, Dec 2025](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/).

### Inferences
- **Recommended technique for Aksoy:** use **Three.js + GLB (Draco/Meshopt-compressed) + GSAP ScrollTrigger**, rendering one model in one sticky canvas.
  - Reason: a cutting tool (holder + insert, or a drill/end mill) is geometrically simple, so a well-made GLB should stay far below the 150k–300k triangle mobile budget.
  - Real-time rendering also allows coating-colour changes (TiN gold ↔ AlTiN black), zooming to the cutting edge and 3D-anchored dimension callouts, none of which a fixed image sequence can do.
  - Provide a **poster image (AVIF/WebP)** as the first paint and as the reduced-motion / no-WebGL fallback.
- **Fallback alternative:** if the 3D asset is not good enough, pre-render **~90–150 frames** in Blender as an AVIF/WebP image sequence (the Apple approach).
  - Apple's 15.2 MB PNG example shows why modern formats and fewer frames matter.
  - Skip video scrubbing.
- **Chapter plan for the homepage hero** (5 chapters plus outro, alternating text on desktop). Sample Turkish copy:
  0. *Intro*: model rotates into frame, centred; H1 "Talaşın ilk temas ettiği yer." plus brand logos strip.
  1. *Karbür gövde / substrate* (text left, model turns right): "Mikro taneli karbür — yüksek tokluk."
  2. *Kaplama / coating* (text right): the model's material swaps TiN gold → AlTiN black; "PVD / CVD kaplama: ısıya ve aşınmaya karşı."
  3. *Talaş kırıcı geometrisi* (text left): camera zooms to the cutting edge; dimension callouts animate in (R0.8, 80°, 12.7 mm).
  4. *Hassas sıkma / tutucu* (text right): the insert seats into the holder (small exploded-to-assembled move).
  5. *Doğru takım, doğru teklif* (centred): CTA buttons "Kataloğu incele" and "WhatsApp'tan teklif al".
- **Keep native scroll.** Smooth-scroll libraries such as Lenis are optional, and the Daring Fireball critique is the warning. Each chapter's text must also exist as real HTML (h2/p) for SEO and screen readers.

### Gaps
- **Not verified in this session:** current (2026) Apple pages (AirPods Pro 3, iPhone 17 Pro, MacBook Pro, Vision Pro), Sony/Canon/Fujifilm/Leica camera pages, DJI, Nothing, Bang & Olufsen, Porsche and sneaker sites. Searches returned only generic results, and those domains could not be fetched. Whether each still uses scroll-scrubbed 3D or image sequences, and how they lay text out on mobile, needs a manual check.
- Whether Apple now uses video scrubbing instead of image sequences is unconfirmed (secondary claim only).
- No source confirmed an explicit **left/right alternating text** layout for any named site. The pattern is plausible but unverified for these examples.

---

## What do the big cutting-tool manufacturers' sites look like? Any 3D/scroll storytelling? What do they do well for product finding?

### Takeaway
None of the manufacturer results showed scroll-driven 3D storytelling on homepages; this could not be checked visually. Their strength is **digital selection tools**:
- Sandvik CoroPlus Tool Library (3D assemblies)
- ISCAR NEOITA (guided advisor with 2D+3D)
- Tungaloy (e-catalog, machining calculator, AI assistant)
- Gühring (50k+ downloadable CAD models)
- Walter (filters by material group and machining method)
- Kennametal (3-step insert selection, cross-brand conversion guide)

All of them organise around the **ISO 513 material groups P/M/K/N/S/H**, which have a standard colour code.

### Cited Findings
- **Sandvik Coromant**
  - The CoroPlus Tool Library is "a web application… to create, store and manage 3D tool assemblies" with recommendations "based on material, operation, and tool type" — [Sandvik Coromant support](https://www.sandvik.coromant.com/en-us/support/coroplus-tool-library-support).
  - It covers 900,000+ tools from 40+ suppliers and exports 2D drawings, 3D models and GTC packages — [CTE Magazine](https://ctemag.com/products/sandvik-coromant-coroplus-tool-library-add/).
  - It integrates with Fusion 360, NX, Mastercam, Cimatron and others, and requires a subscription — [Digital Engineering 24/7](https://www.digitalengineering247.com/article/mastercam-2024-integrates-sandvik-coroplus-tool-library-add-in).
  - Sandvik runs a large knowledge section explaining each ISO material group, e.g. "ISO P – Steel is the largest material group…", "ISO H – steels with a hardness between 45–65 HRC…" — [Sandvik Coromant: Workpiece materials](https://www.sandvik.coromant.com/en-us/knowledge/materials/pages/workpiece-materials.aspx); catalogues and handbooks on [Downloads](https://www.sandvik.coromant.com/en-us/downloads).
- **ISCAR**
  - The NEOITA tool advisor "enables searching for an optimal tool for a specific machining operation". It generates solutions with cutting data, calculates MRR and power, links to the e-Catalog, and "displays product 2D drawings and 3D modules" — [ISCAR technical article 2026](https://www.iscar.com/en-hq/technical-articles/year-2026/how-iscars-neoita-integrates); [ISCAR: Looking for the optimum tool](https://www.iscar.com/en-hq/technical-articles/year-2022/looking-for-the-optimum-tool).
  - It is cloud-based, available 24/7, multilingual, and backed by the NEOLOGIQ product campaign — [ISCAR NEO ITA guide](https://www.iscar.com/lms/lessons/neo-ita-guide/).
  - ISCAR Turkey is located at GOSB, Gebze (Kocaeli) — [ISCAR Turkey](https://www.iscar.com/about/iscar-turkey).
- **Tungaloy**
  - Offers an Online Machining Calculator, a tool management system, an e-Catalog with CAD/3D downloads, and an AI assistant "Gabby" for turning, grooving, milling and holemaking, including catalog checks for item numbers, dimensions, compatibility, grades and series — [Tungaloy](https://tungaloy.com/).
  - Has a Turkish site and an Istanbul (Ümraniye) office — [Tungaloy TR](https://tungaloy.com/tr/).
- **Gühring**
  - Provides CAD drawings and 3D models (DXF, STP, XML, PNG). The CAD portal has 50,000+ models, and 2D/3D data covers ~100,000 tools — [Gühring: CAD and cutting data](https://guehring.com/en/service/digital-services/cad-and-cutting-data/); portal at [guehring.partcommunity.com](https://guehring.partcommunity.com/3d-cad-models/).
- **Walter**
  - The online catalogue "provides a wide range of filter options… by relevant tool parameters, the material group to be machined, or the machining method" — [Walter online catalogue](https://www.walter-tools.com/en-us/tools/search-and-shop/walter-online-catalogue).
- **Kennametal**
  - Uses a "three-step insert selection system… based on six workpiece material groups" — [Kennametal product selector](https://kennametal.com/en/resources/product-selector.html).
  - Publishes an insert and solid-carbide **conversion guide** (cross-reference between brands) — [Kennametal conversion guide](https://www.kennametal.com/us/en/resources/conversion-guide.html).
  - Product pages exist per insert family, e.g. DNMG — [Kennametal DNMG](https://www.kennametal.com/us/en/products/p.dnmg-r.4165679.html).
- **ISO 513 colour code:** P = blue, M = yellow, K = red, N = green, S = orange, H = grey, "printed on insert boxes by every major manufacturer" — [Destiny Tool](https://www.destinytool.com/iso-513-color-code-cnc-cutting-tools.html); [CuttingToolsAI](https://cuttingtoolsai.eu/material/). An open-source ISCAR-related tool also colours ISO groups with these standard colours — [GitHub PR](https://github.com/ssnir2004/ISCARIQ/pull/2).

### Inferences
- Manufacturers win on **depth of data** (CAD, cutting data, advisors). A dealer cannot match that. Aksoy should **link out** to the official e-catalogs/advisors from each brand page ("Resmi katalogda gör"). Its own value should be **curation in Turkish + fast human quote via WhatsApp + local field support**.
- **Use the ISO 513 colour code as the primary visual filter language.** Machinists already know it from insert boxes, so coloured P/M/K/N/S/H chips make filters scannable instantly.
- A light **cross-reference feature** in the Kennametal style ("Elinizdeki kodu yazın, muadilini bulalım") fits the WhatsApp quote model well. Even a manual "send us your current insert code" form is valuable.

### Gaps
- Visual design (palette, layout, any 3D viewer or scroll animation) of sandvik.coromant.com, iscar.com, tungaloy.com, guehring.com, korloy.com, kyocera, mitsubishicarbide, secotools.com and ceratizit.com could **not** be inspected (fetch blocked, search quota exhausted).
- No information was retrieved on Korloy, Kyocera, Mitsubishi, Seco or Ceratizit specifically. Chipbreaker and grade filter specifics per manufacturer are also unverified.

---

## Any industrial/B2B or tool-related sites (CNC machine builders, tooling startups) with premium 3D/scroll design worth copying?

### Takeaway
The confirmed premium industrial/B2B examples are all from Awwwards:
- **Q Industrial** (industrial coatings, SOTD + Dev 2024)
- **Symboticware** (3D follows scroll, highlighted units)
- **Hubtown** (B2B corporate, dark 3D hero, SOTD 2026)
- **We Enable Digital Engineers** (Three.js hero with camera tilt on scroll)

Nothing came back about DMG MORI, Hermle, Haas or Mazak website design.

### Cited Findings
- Q Industrial: industrial coatings for metal and plastic; SOTD 2 June 2024 + Development Award; Le:mma Studio; 3D + content architecture — [Awwwards](https://www.awwwards.com/sites/q-industrial); [Behance](https://www.behance.net/gallery/199584463/Q-Industrial).
- Symboticware Industries pages: "3D that follows scroll and interactive 3D with highlighted units" for mining, forestry, agriculture and construction — [Awwwards](https://www.awwwards.com/inspiration/industries-pages-symboticware).
- Hubtown: "3D hero monolith with mouse-reveal used to dignify a B2B brand" — [Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026).
- "3D Home Hero: Custom Three.js 3D header with camera tilt on-scroll" — [Awwwards](https://www.awwwards.com/inspiration/3d-home-hero-custom-three-js-3d-header-with-camera-tilt-on-scroll-we-enable-digital-engineers).
- A search for DMG MORI/Hermle/Haas/Mazak website redesigns or 3D viewers returned only company and comparison pages, no design info — e.g. [DMG Mori (Wikipedia)](https://en.wikipedia.org/wiki/DMG_Mori_Aktiengesellschaft), [Hermle AG (Wikipedia)](https://en.wikipedia.org/wiki/Hermle_AG).

### Inferences
- The **Symboticware "highlighted units" pattern** (hover or scroll on a 3D part to highlight it with a label) is the right micro-pattern for showing *insert, screw, shim and holder body* on our tool model.
- **Q Industrial's "Industries & Surfaces" template page** suggests a reusable "Sektörler" page type (otomotiv, kalıp, savunma, medikal) as a secondary content type.

### Gaps
- Websites of DMG MORI, Haas, Mazak, Hermle and tooling startups were not assessed. This needs manual review.

---

## Turkish CNC tool dealer websites: how do they look today, what's weak, what could make our site stand out?

### Takeaway
The Turkish dealer landscape is crowded. Some players are already modern: **TKT Industrial has an AI catalog assistant over 6 brands and 4,700+ products**. Most others appear to be category-based e-shops or brand-PDF catalogue hubs.

Aksoy can stand out with:
- a cinematic 3D hero (none found in the Turkish results)
- ISO-colour-coded filtering
- Turkish technical calculators and an ISO decoder
- a frictionless quote basket → WhatsApp

### Cited Findings
- **TKT Industrial (Trakya Kesici Takımlar)**
  - Offers an "AI Catalog Assistant" that searches catalogs of **6 brands, 4,700+ products and 1,600+ machine records**, gives live tool-interface pre-matching to the customer's machine, and routes to the right engineer — [TKT](https://www.tkt.com.tr/tr).
  - Hosts brand catalogue pages, e.g. [Taegutec Katalog](https://www.tkt.com.tr/taegutec-katalog/) and Mimatic/Grip; exhibitor at MAKTEK Eurasia 2026 — [MAKTEK](https://www.maktekfuari.com/en/brand/trakya-kesici-tak-san-ve-tic-ltd-sti).
- **Tungaloy distributors in Turkey:**
  - PROART Mühendislik: Marmara European side and Thrace — [Proart](https://proarttech.com/referans/tungaloy)
  - Ege Teknik Kesici Takım: European-side regional distributor since 2013 — [Ege Teknik](https://egeteknikkesici.com/Hakkimizda.aspx)
  - Alpper Kesici Takımlar: Thrace distributor — [Alpper](https://www.alpperteknik.com/kurumsal/tungaloy-kesici-takimlar-tungaloy-cutting-tools-about.html)
- **Deskar dealer:** YK Kesici Takımlar (Bursa, est. 2000) — [YK Kesici](https://www.ykkesicitakimlar.com.tr/deskar/). An e-shop brand page exists at [Teknik Dükkan](https://www.teknikdukkanshop.com/marka/deskar).
- **Other dealer/e-shop sites in results:**
  - [Aktif Kesici Takım](https://aktifkesicitakim.com.tr/)
  - [CNK Kesici](https://www.cnkkesicitakim.com.tr/cnk-kesici-takimlar)
  - [DGS Kesici (Jongen TR distributor)](https://www.dgskesici.com/)
  - [Santek Mühendislik (Palbit TR distributor)](https://santekmuhendislik.com/)
  - [ACS Kesici](https://www.acskesicitakimlar.com/)
  - [Megatek Kesici](https://www.megatekkesici.com/)
  - [Pi Kesici (Temak)](https://www.pikesicitakim.com/temak)
  - [Teknik Kesici](https://www.teknikkesici.com.tr/urun-kategori/)
  - [kesicitakimlar.com.tr](https://www.kesicitakimlar.com.tr/)
  - [Stark Metal – karburkesicitakim.com.tr](https://www.karburkesicitakim.com.tr/)
  - [KarburKesici.com](https://www.karburkesici.com/)
  - [CNCTAKIM](https://www.cnctakim.com/kategori/karbur-kesici-takimlar/16)
  - [CNR Takım](https://www.cnrtakim.com/kategori/karbur-kesici-takimlar)
  - [MEÖ Otomasyon](https://www.meonotomasyon.com/kategori/kesici-takimlar): lists prices around 237₺–635₺ for carbide end mills
- **WhatsApp reach in Turkey:** in 2025, 88.6% of people used WhatsApp for messaging (TurkStat), "by far the most popular platform", and internet use reached 90.9% of 16–74-year-olds — [Turkish Minute](https://turkishminute.com/2025/08/27/turkeys-internet-use-hits-90-9-percent-whatsapp-most-popular-app-turkstat/). A search summary also cited "90.6% of internet users (2024, DataReportal)" without a clear primary link.

### Inferences
- **Probable weaknesses**, inferred only from URL patterns and snippets because pages could not be viewed:
  - legacy technology (`.aspx`, static `.html` pages)
  - catalogue = list of brand PDFs
  - e-commerce templates designed for retail, not B2B selection
  - category trees without ISO material or geometry filters
- **Differentiators for Aksoy:**
  1. A 3D cinematic hero (no Turkish dealer in the results showed one).
  2. ISO P/M/K/N/S/H colour filters and insert-shape filters.
  3. **Turkish** Vc/n calculator and ISO insert decoder (manufacturer tools are often English-first).
  4. A quote basket that composes one structured WhatsApp message.
  5. Technical blog in Turkish ("CNMG mi WNMG mi?", "Paslanmaz çelikte talaş kırıcı seçimi").
  6. Field-sales trust signals: region served, response time, "sahada ücretsiz deneme" if true.
- TKT shows that the bar is rising (AI assistant). Aksoy should not compete on AI catalog depth but on **clarity, speed to a human, and visual quality**.

### Gaps
- No first-hand visual audit of any Turkish dealer site. Claims about clutter or age are unverified inferences.
- Which Turkish sites already use a WhatsApp quote basket or 3D is not established.

---

## Design synthesis: palette (hex), typography with Turkish support, industrial motifs, motion language, mobile layout for the 3D section

### Takeaway
Recommended direction: **"Graphite & TiN"**. The 3D hero and brand moments sit in a **dark graphite theme**, with polished steel greys and one warm **TiN-gold accent**. The catalog, spec tables and tools switch to a **light "technical paper" theme** for readability.
- Typography: **Space Grotesk** (display) + **IBM Plex Sans** (UI/body) + a monospace font for codes. Turkish support is verified for Space Grotesk and IBM Plex Sans.
- Motifs come from **technical drawings**: hairlines, dimension callouts, title blocks.
- Motion should feel **machined**: damped, precise, no bounce.

### Cited Findings
- **Coating colours (real-world cues for the palette):**
  - TiN is "bright yellow-gold"
  - TiCN is "violet-grey" / "blue-grey"
  - TiAlN is "dark grey to black"
  - AlTiN is darker black, rated to ~900 °C vs ~600 °C for TiN

  "These colours aren't cosmetic, they tell you the coating" — search summary of [Midland Tools](https://midlandtools.in/blogs/news/carbide-insert-coatings-tin-ticn-tialn-explained), [CNC Optimization coating guide](https://www.cncoptimization.com/resources/guides/tool-coating-guide/), [AC Coating](https://www.accoatingpvd.com/about.html). The figures were merged across these sources.
- **ISO 513 colours:** P blue, M yellow, K red, N green, S orange, H grey — [Destiny Tool](https://www.destinytool.com/iso-513-color-code-cnc-cutting-tools.html).
- **Turkish glyph support:**
  - **Space Grotesk:** Latin Extended-A; Turkish listed among 63 supported languages; subsets latin, latin-ext, vietnamese — [Fontsource: Space Grotesk](https://fontsource.org/fonts/space-grotesk/about).
  - **Manrope** and **Barlow** support Turkish (latin-ext subset available) — [Fontsource Manrope (npm)](https://www.npmjs.com/package/@fontsource/manrope); [Fontsource Barlow (npm)](https://www.npmjs.com/package/@fontsource/barlow/v/4.1.0).
  - **IBM Plex Sans** supports Turkish — [Typographer: IBM Plex Sans](https://typographer.com/fonts/gf-ibm-plex-sans/).
  - Fontsource uses CSS `unicode-range` so language subsets load as needed — [Fontsource Manrope](https://www.npmjs.com/package/@fontsource-variable/manrope).
- **Mobile/3D performance and reduced motion:** see the cited budget and pattern list in the "scroll → 3D" section ([Frontend Masters](https://frontendmasters.com/blog/virtual-scroll-driven-3d-scenes/); [Pope Tech](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)).
- **Contrast ratios** (WCAG 2.x formula, computed in this session for the palette below):

  | Pair | Ratio |
  |---|---|
  | #E9EDF1 on #0B0D10 | 16.5:1 |
  | #A7B1BC on #0B0D10 | 9.0:1 |
  | #7D8894 on #0B0D10 | 5.4:1 |
  | #D9A441 on #0B0D10 | 8.7:1 |
  | #0B0D10 on #D9A441 | 8.7:1 |
  | #14171C on #F4F5F6 | 16.5:1 |
  | #5B6672 on #F4F5F6 | 5.4:1 |
  | #8A5F0A on #F4F5F6 | 5.2:1 |
  | #8A5F0A on #FFFFFF | 5.6:1 |
  | #14171C on #25D366 | 9.1:1 |
  | **#FFFFFF on #25D366** | **2.0:1 (fails)** |
  | #FFFFFF on #128C7E | 4.1:1 |
  | #FFFFFF on #1F5FBF | 6.1:1 |
  | #14171C on #F2C230 | 10.7:1 |
  | #FFFFFF on #C62828 | 5.6:1 |
  | #FFFFFF on #2E7D32 | 5.1:1 |
  | #14171C on #EF8A2B | 7.1:1 |
  | #14171C on #9AA3AD | 7.0:1 |

### Inferences

**Visual direction options considered**
1. **Dark industrial (recommended for the hero and brand pages):** metal and carbide read best against near-black with studio rim lighting, as with Hubtown's dark reflective scene and Oryzo's single-object focus.
2. **Light clean:** best for spec-dense catalog and tables (Baymard's B2B product-table research, below).
3. **Corporate navy:** generic among industrial firms, and it collides with ISO-P blue in filters. Rejected.

→ **Hybrid:** dark hero/brand/landing sections, light catalog/product/tools pages, the same accent everywhere.

**Palette (CSS tokens)**

| Token | Hex | Use |
|---|---|---|
| `--graphite-950` | #0B0D10 | Dark background (hero, footer) |
| `--graphite-900` | #12151A | Dark surface |
| `--graphite-850` | #161A20 | Raised card on dark |
| `--steel-700` | #2A3139 | Hairlines/borders on dark |
| `--steel-500` | #7D8894 | Muted text on dark (AA 5.4:1) |
| `--steel-300` | #A7B1BC | Secondary text on dark (9.0:1) |
| `--steel-050` | #E9EDF1 | Primary text on dark (16.5:1) |
| `--tin-gold` | #D9A441 | **Brand accent / primary CTA**; use dark text on it (8.7:1) |
| `--tin-gold-ink` | #8A5F0A | Gold for links/text on light backgrounds (5.2–5.6:1) |
| `--altin-violet` | #2B2733 | Decorative only: AlTiN/TiCN coating chapter gradient |
| `--paper` | #F4F5F6 | Light page background (catalog) |
| `--white` | #FFFFFF | Cards on light |
| `--ink` | #14171C | Primary text on light (16.5:1) |
| `--ink-muted` | #5B6672 | Secondary text on light (5.4:1) |
| `--line` | #D9DEE3 | Table rules / hairlines on light |
| ISO P | #1F5FBF | White text |
| ISO M | #F2C230 | Ink text |
| ISO K | #C62828 | White text |
| ISO N | #2E7D32 | White text |
| ISO S | #EF8A2B | Ink text |
| ISO H | #9AA3AD | Ink text |
| WhatsApp | #25D366 | **Use dark text (#14171C)**, not white (white fails at 2.0:1) |

- ISO hexes are my approximations of the standard colours.
- The WhatsApp green #25D366 / #128C7E values are commonly used brand greens and were not verified this session.
- **Gold is reserved for CTAs and the active state.** ISO chips stay small (square swatch + letter), so M-yellow and S-orange aren't confused with the brand accent.

**Typography**
- Recommended stack:
  - **Display:** Space Grotesk 500/700 for H1–H3, big numbers and chapter indices "01/05". It has a technical feel and verified Turkish support.
  - **UI/body:** IBM Plex Sans 400/500/600. Engineering heritage, excellent at small sizes in tables, verified Turkish.
  - **Codes/specs:** IBM Plex Mono or JetBrains Mono for insert codes (CNMG 120408-MP), dimensions and calculator output. Turkish support for these monospace fonts was not verified, but codes are ASCII; check Turkish labels if a mono font is used for them.
- Alternative "harder industrial" pairing: **Barlow Condensed** headlines + **Barlow** UI. Barlow's Turkish support is verified; the Condensed cut should be checked.
- Softer alternative: **Manrope** (Turkish verified).
- Turkish implementation details:
  - Set `<html lang="tr">` so `text-transform: uppercase` maps i→İ and ı→I correctly (e.g. "KESİCİ", not "KESICI"). Test on every font.
  - Test string: `ĞÜŞİÖÇ ğüşıöç — İzmir, Işık, Çağrı, Şube, Öğütücü`.
  - Load latin + **latin-ext** subsets. The Google Fonts CSS2 API handles this by `unicode-range`; when self-hosting, include latin-ext.
  - Use `font-variant-numeric: tabular-nums` in spec tables and calculators.
  - Use the Turkish decimal comma in displayed numbers (e.g. "0,8 mm") and keep a consistent unit style ("m/dk", "dev/dk", "mm/dev").

**Layout grid**
- Desktop: 12 columns, 1200–1320 px max width, 24 px gutters, 8 px spacing scale. Hero chapters alternate text in columns 1–5 and 8–12, with the model centred.
- Tablet: 8 columns. Mobile: 4 columns with 16 px side gutters.
- Catalog: 3-column filter sidebar + 9-column results on desktop; a filter drawer on mobile.

**Industrial motifs** (use sparingly; they act as "proof of precision")
- 0.5–1 px hairlines and a faint drafting grid (8/40 px) on dark sections.
- **Dimension callouts** with leader lines anchored to 3D points on the model (Ø, R, °, mm), drawn in with SVG stroke animation.
- An engineering **title-block footer** ("Çizim No · Ölçek 1:1 · Malzeme: K10-K20 · Rev. 2026").
- Mono micro-labels ("Vc 180 m/dk · fz 0,12 mm"); ISO 513 swatches; a coating colour strip (TiN gold / TiCN violet-grey / AlTiN black) as a decorative divider.
- Avoid stock "gears and sparks" imagery.

**Motion language: "machined, not bouncy"**
- Scroll-scrubbed rotation with damping (lerp ≈0.08–0.12) and ease-out curves only; no overshoot or springs.
- Order of each reveal: hairline draws in → label types or fades (12–24 px rise, 200–300 ms) → spec numbers count up.
- A chapter progress indicator "01 / 05" in mono.
- Hover on product cards: a 1 px gold border plus a subtle model or image tilt, at most 3°.
- `prefers-reduced-motion`: show a static poster, chapters as a normal stacked list, no scrubbing.

**Mobile layout for the 3D section**
- Use a **sticky canvas in the top ~55–60svh** (svh/dvh avoid jumps when the address bar shows or hides). The chapter text card sits below, in the bottom ~40svh, and swaps per chapter. Do not alternate left/right on mobile; use a single column with "01/05" indices.
- Alternative: a full-bleed canvas with text over a bottom gradient scrim (graphite → transparent).
- Cap devicePixelRatio at ~1.5 on phones, render at 30 fps if frames drop, no post-processing bloom on mobile, and keep the GLB small (target ≲2–3 MB with Draco/Meshopt + KTX2 textures).
- Show the poster image as LCP; lazy-init WebGL after first paint; never capture touch gestures.

### Gaps
- Turkish glyph support for **Inter, Archivo, IBM Plex Mono, JetBrains Mono and Barlow Condensed** was not verified this session (search quota). Check on fonts.google.com → "Language support" before final selection.
- The GLB size, DPR and lerp numbers above are practitioner heuristics (inference), not sourced benchmarks, except the triangle and draw-call budget cited earlier.

---

## Product catalog UX best practices for B2B tooling: cards, spec tables, comparison, "add to quote" basket, WhatsApp CTA, sticky mobile CTA bar

### Takeaway
Follow Baymard's product-list rules: result counts per filter value, multi-select, removable applied-filter chips, category-specific spec filters, and filters for every attribute shown in the list.

Offer a **product-table view** for spec-heavy B2B items. Make the quote flow a **basket → one structured WhatsApp message** via `wa.me/<number>?text=<urlencoded>`, which still requires the user to tap Send, with a sticky CTA on mobile.

### Cited Findings
- **Baymard filtering practices:** show result counts next to each filter option, support multi-select within filter categories, show applied filters as removable chips, and include category-specific filters for key product attributes — [Baymard: Ecommerce filter UI](https://baymard.com/blog/ecommerce-filter-ui); [Baymard: Product list UX 2025](https://baymard.com/blog/current-state-product-list-and-filtering).
- "Have filters for all displayed list item info (38% don't)" — [Baymard](https://baymard.com/blog/have-filters-for-list-item-info).
- For B2B, "Product Tables are highly effective because they allow users to quickly scan, evaluate, and compare a wide array of complex product information". Baymard runs a dedicated **B2B Components & Machinery** audit for "extremely spec-heavy items" — [Baymard: Product table examples](https://baymard.com/ecommerce-design-examples/product-table); [Baymard B2B Components & Machinery audit](https://baymard.com/audits/b2b-electronic-components-machinery).
- **Request-a-quote UX:**
  - Use progressive disclosure, one- or two-step forms, sticky CTAs and FAQ support.
  - Capture essentials first (name, email, company, quantity, timeline).
  - Use a two-step form with a progress bar when the request needs files or specs.

  [EcomDesignPro: Request a Quote UX 2026](https://ecomdesignpro.com/request-a-quote-ux/)
- **WhatsApp click-to-chat:**
  - Format is `https://wa.me/<countrycode+number>` with no +, spaces or dashes; add `?text=` with URL-encoded text.
  - Newlines are `%0A`. Messages truncate at roughly 1,000 characters (third-party guide figure).
  - The user must still tap Send, because wa.me cannot send on the user's behalf.

  [BusinessChat help](https://help.businesschat.io/en/articles/6517838-how-to-build-a-whatsapp-click-to-chat-url-wa-me); [wha.tools link format](https://wha.tools/whatsapp-link-format); [u2l.ai wa.me guide 2026](https://u2l.ai/blog/whatsapp-click-to-chat-link)
- **Technical tools references:**
  - RPM: n = 1000·Vc / (π·D) — [MechSimulator calculator](https://mechsimulator.com/tools/machining-calculator/); [Industrial Monitor Direct reference](https://industrialmonitordirect.com/blogs/knowledgebase/cnc-manual-machining-fundamentals-reference-guide).
  - ISO insert code, e.g. CNMG 120408: C = shape, N = clearance angle, M = tolerance class, G = type/fixing/chipbreaker, 04 = thickness, 08 = nose radius — [Protool](https://www.protool-ltd.co.uk/blogs/blog/iso-turning-insert-nomenclature); [CTE Magazine](https://ctemag.com/articles/understanding-identification-system-indexable-inserts/).
  - Example decoders: [Machining Doctor](https://www.machiningdoctor.com/isoturn/) and [NOX Metals](https://noxmetals.co/resources/insert-geometry-decoder), which show per-character meaning plus a shape visual.

### Inferences
- **Filters for the Aksoy catalog**, all multi-select with counts:
  - Marka
  - İşlem (Tornalama, Frezeleme, Delme, Kanal/Kesme, Diş Açma, Tutucular)
  - **ISO malzeme grubu** (P/M/K/N/S/H colour chips)
  - Uç şekli (C, D, S, T, V, W, R… with mini shape icons)
  - Talaş kırıcı
  - Kalite/Grade
  - Kaplama (CVD/PVD; TiN/TiAlN/AlTiN)
  - Köşe radüsü (0,2 / 0,4 / 0,8 / 1,2)
  - Çap aralığı (matkap/parmak freze)
  - Stok/tedarik süresi, if known
- **Product card:** neutral-background product image (consistent angle and lighting), small brand wordmark, **mono product code**, ISO material chips, 3–4 key specs (e.g. IC, radius, grade, coating), a "Teklife ekle" button with quantity stepper, and a secondary "Detay" link. Offer a **grid ⇄ table** toggle; table view for inserts and grid for holders and drills.
- **Product detail page:** gallery (+ optional 3D/GLB viewer), spec table (two-column definition list on mobile), "Uygun malzemeler" ISO chips with recommended Vc ranges, a compatible holders/inserts cross-sell, PDF datasheet / official-catalog link, and a sticky "Teklife ekle · WhatsApp'tan sor" bar.
- **Compare:** up to 4 items side-by-side with differences highlighted (attribute rows only).
- **Quote basket (sepet → "Teklif Listesi"):**
  - A drawer showing code, brand, qty and note per line, plus optional company name, city, machine/material.
  - It builds a WhatsApp message like:
    `Merhaba, Aksoy Kesici Takımlar web sitesinden teklif istiyorum:%0A1) ISCAR CNMG 120408-TF IC8250 × 20 adet%0A2) …%0AFirma: …%0AŞehir: …`
  - When over ~1,000 characters, fall back to "Listeyi kopyala" + e-mail, or a short reference ID.
  - Store the basket in `localStorage`, with try/catch since it's a static site.
- **Sticky mobile CTA bar** (bottom, safe-area aware): `[🔍 Ara] [💬 WhatsApp] [📋 Teklif Listesi (3)]`. Gold for the primary action; WhatsApp in green with dark text.
- **Technical tools:**
  - Vc↔n calculator with material-group presets (P/M/K/N/S/H colour tabs). Feed vf = fz·z·n is the standard formula but was not sourced this session.
  - ISO insert decoder with a live shape SVG and per-position explanations in Turkish.
  - Both tools deep-link into filtered catalog results ("Bu koda uygun ürünleri göster").

### Gaps
- **Source conflict on the ISO code digits:** the search summary called "12" in CNMG 120408 the "nominal inscribed-circle size". In metric ISO 1832 designations it is generally the **cutting-edge length**, while IC size is an ANSI-code concept. Verify against ISO 1832 / Sandvik's code key before building the decoder.
- No official Meta documentation for wa.me was fetched; the ~1,000-character limit comes from third-party guides.
- No B2B-tooling-specific comparison-table study was found beyond Baymard's general B2B guidance.
