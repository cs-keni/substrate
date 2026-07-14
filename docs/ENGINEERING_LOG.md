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
- Commit: (hash added after commit)
