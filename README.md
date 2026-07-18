# Substrate

Scroll-driven WebGL site for Substrate — a fictional company that develops,
owns, and operates the energy and compute infrastructure beneath the
technologies rewriting the world.

**Live:** https://substrate-theta.vercel.app/

## Stack

- [Vite](https://vitejs.dev/) + TypeScript
- [Three.js](https://threejs.org/) — the world: terrain, sites, roads, trucks,
  turbines, farmsteads, ponds, birds
- [GSAP](https://gsap.com/) + ScrollTrigger — scroll choreography and HUD

## Develop

```bash
npm install
npm run dev    # Vite dev server on port 5183
npm run build  # production build → dist/
```

Deployed on Vercel with stock Vite settings (`npm run build` → `dist/`);
pushes to `main` auto-deploy.

See `docs/` for the engineering log, handoff notes, and AI context, and
`PHASES.md` for the roadmap.
