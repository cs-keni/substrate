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

## Rules
- Never copy Hut 8 copy/branding/assets. Technique replication only.
- Docs update after every code change (see CLAUDE.md global rules).
- Commit after every implementation slice; no remote configured yet → local
  commits only (push when a remote is added).
