# AI_CONTEXT — SUBSTRATE

Shared context for AI agents (Claude Code / Codex) working in this repo.

## What this is
A scroll-driven 3D storytelling site for **SUBSTRATE**, a fictional
energy-to-compute infrastructure company. Inspired by hut8.com's interaction
design (scroll-scrubbed 3D camera journey) but with 100% original assets,
copy, and branding. Built to showcase maximum frontend capability.

## Stack
- **Vite 7 + vanilla TypeScript** (no framework — one animated page)
- **Three.js r180** — full-viewport WebGL canvas in a sticky wrapper
- **GSAP 3.15** — ScrollTrigger (scrub), ScrollSmoother (inertia scroll),
  SplitText (line reveals). All plugins free since GSAP 3.13.
- Fonts self-hosted via Fontsource: **Archivo Variable** (wdth+wght axes),
  **IBM Plex Mono**.

## Architecture
```
src/
  main.ts               entry — boots preloader, scroll, GL, sections
  styles/               tokens.css, base.css, typography.css, + per-section css
  app/
    scroll.ts           ScrollSmoother init + shared ScrollTrigger defaults
    preloader.ts        counter + exit wipe
    nav.ts              sticky pill nav + full-screen menu
    sections/           hero, manifesto, stats, industries, footer (DOM+GSAP)
  gl/
    stage.ts            renderer, scene, camera, raf via gsap.ticker
    path.ts             CatmullRom camera spline scrubbed by ScrollTrigger
    hud.ts              3D anchor → 2D HTML projection (JourneyHud, SiteLabels, RegionLabels)
    world/              generation.ts, transmission.ts, compute.ts, terrain.ts
                        noise.ts (shared GLSL+CPU value noise — keep in sync!)
                        groundworks.ts (roads, fences, scrub clusters, shadow blobs)
    post/               composer.ts, grade shader (grain/CA/vignette)
```

## Key implementation decisions
- Quality tier (src/gl/quality.ts): LOW_POWER = min screen edge <700px OR
  innerWidth <820 at load. Scales point/mesh grid resolution (×0.6/axis:
  hero field, footprint cloud, world ground), meadow scatter (×0.45),
  shadow map (1024 vs 2048), and the DPR cap (1.4 vs 1.75). Decided ONCE
  at module init — scenes are never rebuilt on resize, so the tier is
  sticky for the session. Desktop values are the original constants;
  any new scatter/grid should multiply by DENSITY/GRID from that module.
- Camera scrub: one ScrollTrigger over the tall `.journey` section maps
  scroll progress → spline position; HTML title cards pin at waypoints.
- The isometric world is white-on-white: `MeshLambertMaterial` flat colors +
  big soft directional light; readability comes from the postprocessing pass
  (dot grid ground shader, grain, chromatic aberration at frame edges).
- All geometry procedural (Box/Cylinder primitives, merged + instanced).
  No GLTF, no textures, no external assets. Fictional data only.
- Scroll heights: journey ≈ 6× viewport per layer; total page ≈ 35k px at 1440×900.
- Dark seams are black-over-black dissolves: the `.gl-dim` veil (piecewise
  segments over absolute scroll in stage.ts) is at full opacity whenever a
  dark opaque section's edge is inside the viewport, so the edge never
  shows. Content fades separately (manifesto exit scrub, stats entrance).
  Anything that changes section heights must keep these segments in sync.
- HTML HUD labels render ABOVE the veil (z-hud > z-dim): every label class
  multiplies its opacity by the inverse veil gate; footprint labels also
  fade inside the top 22–34% viewport band (mega title space).
- Turbine rotors: blades are spaced around local Z inside a `spinner` group;
  spin = spinner.rotation.z. Never animate a rotated parent's rotation.x —
  Euler XYZ applies it in the parent frame (that was the "flipping" bug).
- Shadows are REAL (PCFSoft, one static sun in world.ts). Opt a mesh out
  with `userData.noShadow = true`. The ground's dot-matrix ShaderMaterial
  can't receive shadows — a ShadowMaterial catcher mesh shares its geometry.
- World ground has relief: `worldGroundHeight(x,z)` (world.ts) is fbm masked
  flat inside FLAT_ZONES + along the road route consts. Anything placed on
  open land must call it for its y (scrub already does). Never place built
  structures outside the flat mask without flattening there first.
- The GL pipeline renders DARKER than its input colors: the EffectComposer
  chain (RenderPass → grade ShaderPass) has no OutputPass, so linear values
  hit the screen without sRGB re-encoding. Dark colors crush hard — the
  field scene's `#0e0f0c` background displays as ~`#010101`. This is now a
  LOOK, not a bug: all approved scenes were art-directed under it. Do NOT
  add an OutputPass (it would regrade every scene). CSS dark surfaces match
  the crushed GL black via `--ink-deep: #020202` (tokens.css) — used for
  `--bg` (dark), `.gl-dim`, preloader, menu overlay. `--ink` (#0e0f0c)
  remains the foreground/text/edge-line color only.
- Nature (src/gl/world/nature.ts) is deterministic: ponds/trees/meadows are
  placed by scanning the SAME worldGroundHeight/vnoise fields at build time,
  so reloads never reshuffle. Ponds are flat discs at (local min + 1.0) —
  the relief clips them into shorelines; anything new placed on open land
  must respect `isOpen(h)` (|h| > 0.001 ⇒ off all built flats) and the
  keep-out circles. FARM_YARDS/FARM_DRIVEWAYS exported from nature.ts are
  folded into world.ts FLAT_ZONES/FLAT_ROUTES — add new built-on-open-land
  features the same way, never as hardcoded coordinates in two places.
- World-scene traffic realism rules: roads never overlap a structure
  footprint (≥3 units clearance from turbine masts to any driven road) and
  never cross a fence line except at a `fenceRect` gate (gates param cuts
  the rail + posts and frames the gap with taller gate posts —
  groundworks.ts). Trucks dissolve in/out over the first/last 6% of their
  route (per-vehicle materials; castShadow toggled at the 0.55 fade point
  because shadow maps ignore opacity).

## Rules
- Never copy Hut 8 copy/branding/assets. Technique replication only.
- Docs update after every code change (see CLAUDE.md global rules).
- Commit after every implementation slice and push — origin is
  github.com/cs-keni/substrate; Vercel auto-deploys main to
  https://substrate-theta.vercel.app/.
- Any gsap.from()/fromTo() on an element whose opacity or transform is
  ALSO controlled by a CSS class or :hover rule MUST clearProps those
  properties on complete — stranded inline styles override the class
  rules silently (footer wordmark bug, industries spotlight bug).
