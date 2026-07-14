# HANDOFF

## Current state (2026-07-14)
Phases 0–6 complete. Full scroll experience works end-to-end at
localhost:5183 (`npm run dev`). Three GL scenes (hero energy field,
isometric world, footprint terrain) with a shared grade pass; scroll infra
is Lenis + ScrollTrigger (NOT ScrollSmoother — sticky sections depend on
native scroll). Phase 7 (polish/QA) in progress.

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
