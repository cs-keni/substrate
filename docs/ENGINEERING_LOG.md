# ENGINEERING_LOG

## 2026-07-18 (Ship: live URL, README, OG/Twitter social card)
- Live at https://substrate-theta.vercel.app/ (Vercel, auto-deploys main).
- README.md created with live URL, stack, dev commands.
- index.html: og:url, og:image (+dimensions), twitter:card/title/description/
  image. Card is a real 1200x630 hero capture from the live site (browse
  daemon, nav pill/hamburger/scroll-cue hidden for the shot), ffmpeg'd
  PNG→JPEG 792 kB→98 kB at public/og.jpg.
- PHASES.md: deploy checkbox done with URL.

## 2026-07-18 (Repo publish prep: untrack .gstack tool state)
- Added `.gstack/` to .gitignore and untracked the directory (browse logs,
  QA reports, terminal/daemon state are local tool artifacts, not source).
- First push to the new GitHub remote git@github.com:cs-keni/substrate.git;
  Vercel will deploy from it (plain Vite defaults: `npm run build` → dist/).

## 2026-07-17 (Phase 15: mobile polish — /qa-only findings + 375px sweep)
- QA report (94/100) at .gstack/qa-reports/qa-report-localhost-5183-2026-07-17.md;
  all findings were mobile. Fixed five:
- Footer wordmark stranded over the legal line: the intro `gsap.from` and the
  spans' CSS `transition: transform` (hover lift) drove the same property; a
  ScrollTrigger refresh (viewport change/rotation) could freeze a mid-flight
  matrix — measured a stale translateY(102px) = 60% of the DESKTOP span
  height stuck on mobile. Fix in footer.ts: inline `transition: none` during
  the intro, `clearProps: 'all'` on complete. Desktop also benefited (glyphs
  no longer dip into the rule).
- Hero eyebrow vs nav pill at 375px: fixed 11rem cap still collided (eyebrow
  right edge 196px vs pill x 179). Now `max-width: calc(100vw - 15.5rem)`.
- Journey HUD callouts clipped at viewport edges on mobile (turbine +
  substation cards): hud.ts caches each card's size and multiplies fade by
  an edge-proximity factor (36px ramp, 8px pad) — cards dissolve before
  clipping, anchors never detach from their world points.
- 375px sweep found two more clips, both fixed with the hero-title vw-guard
  idiom: menu items (`min(--step-4, 10.5vw)`, "Transmission" now fits) and
  industries list (`min(--step-3, 9.2vw)`, "SEMICONDUCTOR" now fits).
- QA ISSUE-004 corrected: #gl-stage/#hud-layer already have aria-hidden;
  the report flagged the inner canvas by mistake. No change needed.
- tsc + build green; re-verified 375/768/1440 incl. the rotation scenario
  (span transform reads `none` after desktop→mobile switch); no console
  errors. Scroll-progress + SR-alternative logged as backlog items.

## 2026-07-17 (Phase 14: living world — all four passes, Kenny's pick)
- New src/gl/world/nature.ts: ponds (grid-scanned fbm lowland minima; flat
  water discs at min+1.0 that the surrounding relief clips into organic
  shorelines, plus merged drafted rim rings), dry creeks (numeric gradient
  descent from high ground into the top-3 ponds, meander term, stops at
  flats), grass meadows (~instanced cones, own vnoise cluster field, kept
  out of flats/ponds/keep-outs), plan-symbol tree stands (instanced trunks
  + disc canopies + one merged LineSegments of ink outline rings), four
  birds orbiting three thermal centers (ticked from world.tick), and two
  farmsteads (barn + ExtrudeGeometry gable roof, silo or 4-leg water tower,
  yard pad, parked truck) with road() driveways.
- world.ts integration: FARM_YARDS/FARM_DRIVEWAYS exported from nature.ts
  feed FLAT_ZONES/FLAT_ROUTES (single source for ground flattening), rim
  hills (worldGroundHeight amplifies 1+1.15·rim² beyond elliptical radius
  155 — nothing built sits past it), parcel-grid lines in the dotGround
  fragment shader (rotated grid, vnoise band mask, fwidth AA), nature keep
  -outs appended to the scrub list. The `isOpen(h)` trick: the flat mask
  returns exactly 0 on roads/zones/yards, so |h|>0.001 keeps ALL nature off
  built ground for free.
- terrain.ts density: campus 3 halls + cooling skids, wind 5 turbines,
  solar 7 rows + 2 inverters + hut, thermal pipe rack + second tank,
  construction site-office trailers + 5 piles; every site gains a parking
  apron with 2-3 parked cars and a drawn double-line access road; new
  12-link inter-site road network (draped, vnoiseLike sway eased to zero at
  endpoints) with hamlets (2-4 tiny boxes) on every third link.
- tsc + build green (stage chunk 575 kB / 152 kB gzip, +25 kB for all four
  passes). Headless screenshots: transmission beat shows farm F1 + tree
  stands + truck traffic; F2 water tower + driveway reads; Halvorsen Flats
  shows crane + trailers + apron + hamlet + road network. No console errors.

## 2026-07-17 (round-4 review: real-life logic pass)
- Root-caused the "thesis looks gray next to the intro" report: the
  EffectComposer chain has no OutputPass, so GL renders linear-unencoded —
  `#0e0f0c` displays as ~`#010101` (true black) while CSS slabs showed the
  literal `#0e0f0c`. Kept the crushed look (all scenes art-directed under
  it) and matched CSS instead: new `--ink-deep: #020202` surface token for
  --bg dark, .gl-dim, preloader, menu overlay. Verified by pixel-sampling
  headless screenshots: thesis rgb(3,3,3) uniform vs hero rgb(0–5).
- Trucks no longer pop at the route-loop wrap: per-vehicle transparent
  materials fade over the first/last 6% of curve-t (smoothstepped), with
  castShadow gated at 0.55 since shadow maps ignore opacity (world.ts).
- Roads no longer phase through structures ("cars run into windmills"):
  turbine at zone-local (-16,-10) sat 0.09 units off the WIND_SPUR
  centerline → moved to (-19,-7.5) (3.8 clearance) with its spur track
  re-aimed (generation.ts). Service road rerouted around the switchyard
  fence (was collinear with the north rail through two posts, then cut
  through the yard) — now skirts at z=14. Solar leg moved outside the
  solar-block fence (was 0.3 inside the east rail, grazing posts).
  fenceRect gained a `gates` param (split rail via LineSegments, posts
  skipped in the gap, taller gate-post pair); campus west fence gets a
  4-unit gate where the road crosses at z≈-17.5 (groundworks.ts, world.ts).
- Scrub keepOut updated for the moved solar lane. tsc + vite build green
  (stage chunk 550 kB / 143 kB gzip). Phase 14 (living-world scenery)
  scoped as options for Kenny.

## 2026-07-14
- Researched hut8.com in headless browser: Nuxt 3 + GSAP
  (ScrollTrigger/ScrollSmoother/CustomEase) + Three.js r170 canvas in sticky
  wrapper; ~36k px scroll journey. Recorded technique inventory in
  docs/AI_CONTEXT.md.
- Phase 0: git init (main), Vite+TS scaffold by hand (empty-dir template
  prompt avoided), deps installed via bun: three@0.180, gsap@3.15,
  fontsource Archivo Variable + IBM Plex Mono. PHASES.md + docs/ written.
- Phases 1–6 built in one pass: design system (tokens/base/chrome/sections
  CSS), Lenis + ScrollTrigger scroll infra, preloader/nav/cursor, hero energy
  field (custom point shader), isometric world (generation/transmission/
  compute, procedural primitives + edge outlines), scroll-scrubbed ortho
  camera timeline, HUD projection system, footprint terrain (GPU fbm point
  grid + site spikes), stats counters, industries spotlight list, footer.
- Bugfix: initial GL scene never activated (hero ScrollTrigger onToggle
  doesn't fire at boot) → explicit `setActive('field')` on init.
- Bugfix: grade-pass chromatic aberration ~200× too strong (`uAberration *
  900.0` leftover scale factor) → rainbow ghosting everywhere. Removed the
  factor, retuned uniforms (0.011 aberration / 0.032 grain / 0.16 vignette).
- Gotcha (WSL2): Vite on /mnt/c never sees file changes — inotify doesn't
  cross drvfs. Added `server.watch.usePolling: true` to vite.config.ts.
  Symptom was "edits don't apply after reload".
- Bugfix: footer SUBSTRATE wordmark wrapped (letter E on own line) →
  white-space: nowrap + viewport-fitted clamp size.
- Commit: 65b2d66 (phases 0–6 milestone)
- Phase 7 QA in headless browser: preloader, menu overlay, stats counters,
  mobile 390×844 all verified via screenshots. Fixes: hero title clipped on
  narrow screens (min() font-size guard), hero eyebrow ran under nav pill
  (max-width at ≤760px), footer wordmark wrap (nowrap + clamp). Production
  build passes: 680 kB JS / 193 kB gzip, CSS 21 kB.
- Commit: ee97698 (QA pass)

## 2026-07-14 (seam pass, user feedback: black→white flash at thesis)
- Root cause: global `body[data-theme]` flip on scene activation repainted
  every var()-driven section background mid-read. Removed theme toggling
  entirely; sections own their palettes statically (.journey/.footprint
  scope ink-on-paper text vars locally).
- Added `.gl-dim` veil (fixed ink layer between canvas z1 and content z5),
  opacity driven per-tick from a piecewise ramp over absolute scroll
  offsets: hero darkens under manifesto → world emerges from black over
  journey's first 85vh → terrain sinks to black before stats covers.
  Implemented as ticker computation, NOT scrubbed tweens — chained fromTo
  scrubs on one property fight each other on refresh.
- Robustness: scene activation was onToggle-based; jump-scrolls (deep
  links, restored positions) can skip a trigger's window entirely, leaving
  a stale scene (repro: world scene rendering inside footprint after a
  teleport). Active scene is now derived from scroll position every tick
  (`sceneAt()`), idempotent.
- Terrain handoff moved from footprint 'top bottom' to top-45vh so the
  world's exit beat isn't cut off a full viewport early; journey progress
  rail now fades out at p>0.955 (and in at p<0.06).
- Motion polish: layer cards get symmetric drift (rise in, float out), HUD
  callouts rise 10px as they fade in, stat counters flash volt + settle
  pop on completion.
- Verified: seam screenshots at 950/1250/1550/1800 (emerge), 19950–20800
  (sink), 13700–14700 (terrain handoff), dim probe at 10 positions, cold
  jump into late footprint. No console errors.
- Environment note: `npm run build` intermittently dies with a V8
  TurboFan trap (node 20.19.5 / WSL2, likely memory pressure alongside
  headless Chromium + the polling watcher). tsc and vite each pass alone;
  retry succeeds. Not a code issue — if it recurs, retry before debugging.
- Commit: c2cbf39 (seam pass)

## 2026-07-14 (final polish)
- Camera timeline rhythm: corridor rides sine.inOut instead of linear;
  exit pull-up lengthened to 2.2 with power2.inOut.
- Code split: gl/stage now a dynamic import — initial JS 680→149 kB
  (57 kB gzip); the 533 kB stage chunk loads while the preloader plays,
  and the preloader wipe awaits it (with a catch so GL failure can't trap
  users on the loader).
- Anchor router (src/app/anchors.ts): #layer-* targets map to fractions
  of the journey runway (0.12/0.44/0.76) because the cards live inside
  the pinned viewport; other anchors smooth-scroll normally. Menu links
  route through the same resolver. Verified: SEE THE STACK lands at
  exactly journeyTop−vh+0.12·runway; menu → compute lands on its beat.
- Hero field base dot alpha 0.22→0.3; footer wordmark letters get hover
  lift + volt tint; OG title/description/type meta added.
- Commit: (hash below)

## 2026-07-16
- Session restored via /context-restore from checkpoint
  20260714-132251-substrate-review-pending. Dev server started for Kenny's
  in-browser review (Vite, port 5183).
- Added gstack skill routing rules to project CLAUDE.md (one-time gstack
  setup, no product code touched).
- Commit: this commit ("chore: add gstack skill routing rules to CLAUDE.md" —
  log entry rides along, so no stable hash to cite).
- Kenny's first in-browser review: intro/cursor/stats/industries/footer all
  approved. Five fixes requested → Phase 10 in PHASES.md:
  1. Turbine rotors "flipped over" instead of spinning. Root cause in
     src/gl/world/generation.ts: blades were spaced around X while the rotor
     group carried rotation.y = π/2, so animating rotation.x tumbled the
     disc through its own plane (Euler XYZ: Rx applies in the PARENT frame
     after the yaw). Fix: blades respaced around Z inside a new inner
     `spinner` group whose rotation.z IS the hub axis; outer rotor group
     keeps the yaw. Per-turbine speed (0.75–1.2 rad/s) + random phase.
  2. Thesis scrolled up as a black box over the emerging white world. Fix in
     src/gl/stage.ts: the emerge segment now runs top(#journey)−0.05vh →
     +0.75vh, so the veil is ≥0.94 black while any part of the manifesto
     slab is on screen (black-over-black edge is invisible); manifesto.ts
     scrub-fades .manifesto-frame on exit (bottom 82%→45%). Journey card 01
     range 0.04→0.14, rail fade, and turbine/solar HUD windows shifted past
     the emergence (~p 0.13).
  3. Same seam in reverse before stats: terrain-sink segment moved to
     bottom(#footprint)−1.7vh → −1.05vh (fully black BEFORE the stats edge
     enters at −1.0vh); stats.ts fades tag+footnote up; .footprint-caption
     opacity is driven inversely by the veil in applyDim (its volt legend
     dots sit above the veil and were glowing over the black gap).
  4. World read as "objects on a sandbox". New src/gl/world/groundworks.ts
     (road ribbons w/ ink edges, fenceRect, noise-clustered scrub+rocks,
     grounding blobs) + src/gl/world/noise.ts (shared GLSL+CPU value noise,
     de-duped from terrain.ts). world.ts: ground shader gained fbm tone
     mottling + faint survey contours (fwidth AA'd); service road shadowing
     the corridor, wind-farm spur + per-turbine tracks, solar access road,
     campus entry, 3 perimeter fences, 620-instance scrub scatter with
     keep-outs. transmission.ts: H-frame pylons paced every ~15 units along
     all corridors (keep-outs at yards). generation.ts: turbine gravel pads
     + pad-mount transformers + blobs, thermal apron, solar inverter skids.
     compute.ts: water tanks, gatehouse, on-pad street grid (road() gained a
     y param for the raised pad).
  5. Footprint answered "what am I looking at": spike height now ∝ MW
     (4–17 units), 12 sites (copy said fourteen, scene had ten — now matches
     the 12-campus stat), dashed interconnection boundary loops draped on
     the terrain + RegionLabels (hud.ts), caption legend (OPERATING / IN
     BUILD / HEIGHT=MW), note copy rewritten. Site+region labels multiply by
     an inverse-veil gate and a top-band fade so they duck under the mega
     title instead of colliding with it.
- QA: tsc + vite build green (2.9s, stage chunk 544 kB). Headless screenshot
  pass at 11 scroll positions verified all five fixes; two follow-ups found
  and fixed in the same pass (label/mega-title collision, caption dots over
  the black gap).
- Commit: 5c15b04 (review fixes round 1).
- Kenny's second review → Phase 11 depth pass:
  1. Real shadows replace the "perfect circle" blobs: renderer PCFSoft
     shadow map (stage.ts), sun at (-80,160,60) casting through a 2048px
     ortho box covering the whole world; scene.traverse sets castShadow on
     every solid mesh (userData.noShadow opts out: ground, catcher, road
     ribbons, tower water discs) and receiveShadow on all lambert surfaces.
     A ShadowMaterial catcher (opacity 0.13) SHARES the displaced ground
     geometry — the dot-matrix ShaderMaterial stays untouched. Spinning
     blade shadows animate on the ground.
  2. "Terrain doesn't feel 3D": the world plane now has real relief.
     worldGroundHeight(x,z) in world.ts = fbm hills masked to zero within
     FLAT_ZONES circles and 14u along every road polyline (routes moved to
     module consts SERVICE_ROAD/WIND_SPUR/SOLAR_ROAD/CAMPUS_ENTRY so the
     mask and the road meshes share coordinates). PlaneGeometry 150×112
     segments, CPU-displaced; scrub() takes a heightAt fn so tufts sit on
     the slopes. The fragment shader mottling/contours sample the SAME fbm
     field, so drawn contours trace the actual hills.
  3. See-through cooling towers: the lathe shell is open geometry and was
     single-sided — from the iso camera you looked straight through the
     unrendered inner wall to the ground grid. Fix: DoubleSide shell + a
     dark water disc inside (r 1.42 at y 5.2 — first attempt at r 1.65
     poked through the shell, inner radius there is ≈1.53).
  4. Light contrast: ambient 1.9→1.5, sun 2.2→2.6 — faces model more.
  5. Footprint depth: TERRAIN_AMP 16→21, point high-shade darkened, and
     every site gains a building cluster (siteWorks(): hall + 2 aux + tank,
     scaled by MW fraction, deterministic hash21 yaw, drawn pad-boundary
     line draped on terrainHeight) with ambient+directional lights added to
     the scene for the lambert boxes. Spike stays clear of the hall
     (offset 2.3s after first attempt pierced the roof).
- QA round 2: tsc + build green (stage chunk 546.6 kB); screenshots verified
  turbine blade shadows, capped towers, relief, and site clusters.
- Commit: d605593 (depth pass).
- Kenny's third review → Phase 12 motion + variety:
  1. "More cars / moving red lines": world.ts gains road traffic — truck()
     (white body, bone cab, volt tail light, castShadow) driven along
     roadCurve(route) CurvePaths; 5 vehicles on SERVICE_ROAD (×3, one
     reversed), WIND_SPUR, SOLAR_ROAD with staggered t0 and per-route
     speeds in curve-t/s; ticked alongside rotors/pulses. transmission.ts
     pulses 5→10 (corridor ×4, east ×3, spurA ×1, spurB ×2).
  2. "Every site looks the same": terrain.ts siteWorks now dispatches to 5
     archetype builders (campus: 2 parallel halls + sub + tank; wind: 3
     mini turbines w/ hash-phased blade stars + hut; solar: 4 tilted panel
     rows + inverter; thermal: block + 2 stacks + tank, offset clear of the
     spike; construction: translucent ghost frame, tower crane with volt
     tip and hash-yawed jib, laydown piles). Kinds live in siteDefs
     ([name, mw, x, z, kind, status?]); cluster built in a local group with
     hash yaw, pad boundary still draped in world space.
  - QA gotcha: the browse daemon restarted mid-pass and reset the viewport
    to 1280×720, shifting every absolute scroll offset — dark "bug"
    screenshots were just the veil at the wrong scroll for that vh. Set
    viewport BEFORE computing offsets (offsets derive from offsetTop).
- QA round 3: tsc + build green (stage chunk 549.3 kB); screenshots show
  trucks + pulse traffic on the corridor and distinct site silhouettes
  (crane site verified up close).
- Commit: (this commit)
