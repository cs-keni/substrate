# HANDOFF

## Current state (2026-07-17)
Phase 15 (mobile polish) closed the /qa-only findings: footer wordmark
intro no longer fights the spans' CSS transform transition (clearProps on
complete — the stranded-matrix rotation bug), hero eyebrow clears the nav
pill at any width, journey HUD cards edge-fade instead of clipping, and the
menu + industries type got vw guards (hero-title idiom) so nothing clips at
375px. QA health 94/100; report in .gstack/qa-reports/.

Phase 13 (round-4 review fixes) shipped: intro and thesis backgrounds now
share one true black (`--ink-deep` #020202 matches the composer's crushed GL
black — see AI_CONTEXT "renders DARKER" decision before touching any dark
color), trucks dissolve in/out at route ends instead of popping, and roads
no longer phase through structures: the wind spur threads between turbine
masts (one turbine moved), the service road skirts the switchyard fence
north at z=14, the solar leg runs outside the solar fence, and the campus
west fence has a real gate (`fenceRect` gates param) where the road enters.
Verified headless: thesis samples rgb(3,3,3) vs hero rgb(0–5) (grain), wind
farm + campus screenshots clean, build green.

Phase 14 (living world) shipped on top of it — Kenny picked all four passes:
ponds/creeks/meadows/rim-hills, plan-symbol tree stands + birds, parcel
grid + farmsteads, and a footprint density pass (fuller archetypes, parking
aprons, access roads, inter-site road network, hamlets). New module:
src/gl/world/nature.ts; its FARM_YARDS/FARM_DRIVEWAYS consts feed world.ts
FLAT_ZONES/FLAT_ROUTES so ground flattening and nature keep-outs share one
source of truth. Nature placement uses `isOpen(h)`: the flat mask is exactly
0 on built ground, so |h|>0.001 keeps scatter off roads/zones/yards.

## Previous state (2026-07-16)
Phases 0–10 complete. Full scroll experience works end-to-end at
localhost:5183 (`npm run dev`). Three GL scenes (hero energy field,
isometric world, footprint terrain) with a shared grade pass; scroll infra
is Lenis + ScrollTrigger (NOT ScrollSmoother — sticky sections depend on
native scroll).

Phase 12 added motion (5 curve-driven service trucks on the roads, 10 volt
pulses on the traces) and per-site archetypes on the footprint map (campus /
wind / solar / thermal / construction-with-crane — kinds assigned in
terrain.ts siteDefs). Phase 11 added real PCFSoft shadows, masked-fbm ground
relief, and capped cooling towers.

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
