# SUBSTRATE — Scroll-Driven 3D Storytelling Site

A Hut 8-inspired (technique-only, zero copied assets) scroll experience for a
fictional energy-to-compute infrastructure company. Vite + TypeScript +
Three.js + GSAP (ScrollTrigger / ScrollSmoother / SplitText). All 3D assets
procedural, all copy original.

**Narrative:** raw power flows through three layers — Generation →
Transmission → Compute — and becomes intelligence.

**Aesthetic:** technical-document industrial. Paper white `#F4F3EF`, ink black
`#0E0F0C`, safety orange `#FF4E00`. Archivo Variable (expanded display,
condensed labels) + IBM Plex Mono (data). Grain + chromatic aberration
postprocessing over the WebGL scene.

---

## Phase 0 — Scaffold
- [x] git init (main branch)
- [x] PHASES.md, docs/ (AI_CONTEXT, HANDOFF, CURRENT_TASK, ENGINEERING_LOG)
- [x] package.json, vite.config.ts, tsconfig.json, index.html
- [x] Install deps: three, gsap, lenis, fontsource Archivo Variable + IBM Plex Mono
- [x] Initial commit

## Phase 1 — Design System
- [x] tokens.css — color, spacing, type scale custom properties
- [x] base.css — reset, selection color, cursor, grain overlay, focus states
- [x] Typography setup — Archivo Variable axes, Plex Mono data styles
- [x] Sticky nav pill (wordmark + menu toggle), theme-aware
- [x] Full-screen menu overlay with staggered link reveals
- [x] Preloader — percentage counter, logo mark draw-on, exit wipe
- [x] Original logo mark (stacked iso layers, inline SVG)

## Phase 2 — Scroll Infrastructure + Opening Sections
- [x] Lenis smooth scroll (chosen over ScrollSmoother: keeps native sticky/fixed)
- [x] Section skeleton with correct scroll heights (~24.5k px at 1440×900)
- [x] Hero — full-viewport GL backdrop, giant staggered headline, scroll cue, live tickers
- [x] Manifesto — SplitText line-mask reveals, per-line stagger on scroll

## Phase 3 — WebGL Foundation
- [x] Stage: renderer, 3 scenes (field/world/terrain), DPR cap 1.75
- [x] Fixed gl-stage behind content (z-layering with HTML)
- [x] Ortho iso camera, target+zoom scrubbed via paused GSAP timeline
- [x] EffectComposer: render pass + grain/chromatic-aberration/vignette grade pass
- [x] gsap.ticker-driven render loop, fully paused when no GL section on screen

## Phase 4 — Isometric World (the centerpiece)
- [x] Ground plane dot-matrix shader (fades by distance from camera focus)
- [x] LAYER 01 GENERATION — wind turbines (animated), cooling towers, solar field, thermal block
- [x] PCB-trace transmission lines (multi-strand bundles + orange energy pulses)
- [x] LAYER 02 TRANSMISSION — substation: transformers, gantries, insulators, control building
- [x] LAYER 03 COMPUTE — campus: instanced hall grid, rooftop units, rack yard close-up
- [x] HUD callouts — HTML labels projected from 3D anchors, live ticking stats
- [x] Layer title cards + journey progress rail synced to camera waypoints

## Phase 5 — Footprint (terrain + kinetic type)
- [x] Point-cloud terrain (fbm value-noise displaced grid, ~109k points, GPU displaced)
- [x] Fictional site spikes with MW/mono labels (projected HTML)
- [x] Giant "OUR FOOTPRINT" headline panning horizontally with scroll scrub
- [x] Camera glide from overview into terrain flythrough

## Phase 6 — Dark Sections
- [x] Theme flip (body[data-theme] driven by active GL scene)
- [x] "Powering What's Next" — industries list lit line-by-line by scroll spotlight
- [x] Stats band — animated counters (GW, EH/s, campuses, uptime) with mono digits
- [x] Footer — newsletter input, giant SUBSTRATE wordmark, link columns

## Phase 7 — Polish + QA
- [ ] Micro-interactions: magnetic buttons, link underline sweeps, cursor dot
- [ ] prefers-reduced-motion: kill smoothing/scrubs, static fallbacks
- [ ] Resize + mobile: DPR caps, simplified world on small viewports
- [ ] Perf pass: instancing audit, draw-call count, memory
- [ ] Full-journey QA in headless browser, screenshot every waypoint
- [ ] Final docs update + commit
