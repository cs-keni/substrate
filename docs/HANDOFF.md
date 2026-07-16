# HANDOFF

## Current state (2026-07-16)
Phases 0–10 complete. Full scroll experience works end-to-end at
localhost:5183 (`npm run dev`). Three GL scenes (hero energy field,
isometric world, footprint terrain) with a shared grade pass; scroll infra
is Lenis + ScrollTrigger (NOT ScrollSmoother — sticky sections depend on
native scroll).

Phase 10 shipped Kenny's browser-review fixes: correct turbine rotor spin
(inner spinner group, blades around Z), black-over-black dissolves at BOTH
dark seams (veil fully opaque while any dark slab edge is on screen — see
dim segments in src/gl/stage.ts), a densified world (src/gl/world/
groundworks.ts: roads/fences/scrub/blobs; pylons in transmission.ts; ground
fbm mottling + survey contours in world.ts), and a self-explaining footprint
map (spike height ∝ MW, 12 sites, dashed interconnect loops, RegionLabels,
caption legend). HTML HUD labels multiply by an inverse-veil gate AND a
top-band fade (they live above the veil and under the mega title).

Key gotcha for anyone on WSL2: Vite watch requires `usePolling` on /mnt/c
(already configured). If edits seem ignored, check the served module with
curl before debugging the code.

## Component ownership
- Everything so far: Claude Code (Fable 5), session 1.

## Visual/animation system
See docs/AI_CONTEXT.md → Architecture + Key implementation decisions.
Design tokens land in `src/styles/tokens.css` (Phase 1).

## Next agent should
Continue from PHASES.md — first unchecked item.
