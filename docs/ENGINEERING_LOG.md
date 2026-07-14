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
