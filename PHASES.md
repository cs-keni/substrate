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
- [x] Micro-interactions: link underline sweeps, cursor dot, tag blink, cue bob
- [x] prefers-reduced-motion: Lenis disabled, cursor/grain hidden
- [x] Resize + mobile: DPR cap 1.75, hero title min() guard, eyebrow clearance
- [x] Full-journey QA in headless browser, screenshots at every waypoint
- [x] Production build verified (tsc + vite build, 193 kB gzip)
- [x] Final docs update + commit

## Phase 8 — Seam Pass (user feedback: transition flash)
- [x] Remove global theme flip — static per-section palettes
- [x] Dim veil: emerge-from-black into the world, sink-to-black before stats
- [x] Position-derived scene switching (jump/deep-link safe)
- [x] Terrain handoff at footprint mid-window + journey rail fade
- [x] Layer card symmetric drift, HUD callout rise, stat settle flash
- [x] Seam-by-seam screenshot verification, dim probe, cold-jump repro

## Phase 9 — Final Polish
- [x] Camera timeline rhythm pass (sine corridor rides, long exit pull-up)
- [x] Code-split three.js: 149 kB initial JS, stage chunk behind preloader
- [x] Anchor router: journey waypoints for layer links, smooth scroll everywhere
- [x] Hero field legibility, footer letter hover, OG meta

## Phase 10 — Kenny's Browser Review Fixes (2026-07-16)
- [x] Turbine rotors spin in the disc plane (were tumbling: blades respaced
      around Z inside a spinner group; per-machine speed + phase variance)
- [x] Thesis exit dissolve — veil stays black until the manifesto edge leaves
      the viewport; content scrub-fades; card/HUD/rail timings shifted past
      the emergence (~p 0.13)
- [x] Footprint→stats dissolve — terrain sinks fully to black before the
      stats edge enters; stats tag/footnote fade up; caption sinks with veil
- [x] World densification: ground fbm mottling + survey contours, service
      roads + turbine spurs, perimeter fences, pylons pacing the corridors,
      scrub/rock clusters, grounding shadow blobs, turbine pads + pad-mount
      transformers, solar inverter skids, campus tanks/gatehouse/street grid
- [x] Footprint legibility: spike height ∝ MW, 12 sites (copy said fourteen,
      scene had ten), dashed interconnection loops + region labels, caption
      legend, labels duck under the mega title band
- [x] tsc + build green; headless screenshot pass over all five fixes

## Phase 11 — Depth Pass (Kenny's second review, 2026-07-16)
- [x] Real shadow mapping replaces the circle blobs (PCFSoft, one 2048px
      static sun; everything solid casts, lambert surfaces receive)
- [x] Ground relief: masked fbm hills displace the world plane (dead flat
      under zones/roads via distance mask; scrub follows the height field;
      shader contours trace the real hills; shadow catcher shares the geo)
- [x] Cooling towers no longer see-through: double-sided shell + interior
      water disc (sized inside the throat)
- [x] Light contrast retuned (ambient 1.9→1.5, sun 2.2→2.6)
- [x] Footprint: amplitude 16→21, deeper point shading, per-site building
      clusters (hall/aux/tank scaled by MW, drawn pad boundary, deterministic
      hash layout), site lights added
- [x] tsc + build green; screenshot verification round 2

## Phase 12 — Motion + Variety (Kenny's third review, 2026-07-16)
- [x] Service trucks patrol the roads (5 vehicles, curve-driven, oriented,
      shadow-casting, staggered offsets + one opposing direction)
- [x] Volt pulse traffic doubled: 10 pulses across all four trace routes
- [x] Footprint site archetypes: campus / wind / solar / thermal /
      construction (crane + volt tip + ghost frame + laydown piles for the
      two in-build sites); deterministic hash layouts, spike-clearance kept
- [x] tsc + build green; screenshot verification round 3

## Phase 13 — Real-Life Logic (Kenny's fourth review, 2026-07-17)
- [x] True-black match: `--ink-deep` #020202 token for all dark surfaces
      (--bg, veil, preloader, menu) — matches the composer's crushed GL
      black; thesis no longer reads gray next to the hero
- [x] Trucks dissolve in/out over first/last 6% of route (per-vehicle
      materials + castShadow gate) — no more mid-frame spawns
- [x] No road passes through a structure: turbine moved off the wind spur
      (≥3.8 clearance), service road reroutes around the switchyard fence,
      solar leg runs outside the solar fence, campus west fence gains a
      real gate (fenceRect gates param: split rail, skipped posts, taller
      gate posts)
- [x] tsc + build green; pixel-sampled + screenshot verification round 4

## Phase 14 — Living World (scope pending Kenny's option pick)
- [ ] Land pass: ponds, creeks, grass meadows, taller peripheral hills
- [ ] Life pass: drafting-style tree stands, circling birds
- [ ] Context pass: field parcels, farmsteads near the corridor
- [ ] Footprint site density: build out the 12 interior sites

## Later (nice-to-haves)
- [ ] Magnetic hover on nav pills
- [ ] Simplified world geometry on small viewports
- [ ] Deploy target (static host) + share link
