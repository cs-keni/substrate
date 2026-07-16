# ENGINEERING_LOG

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
- Commit: (this commit)
