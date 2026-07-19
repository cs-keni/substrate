import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Volt rail: fixed hairline on the left viewport edge whose volt fill scrubs
 * with TOTAL page scroll — the "how far through the story am I" affordance.
 * Left edge is the safe lane: HUD callouts edge-fade to zero within 8px of
 * every viewport edge (hud.ts) and the native scrollbar owns the right.
 */
export function initRail(): void {
  const rail = document.getElementById('scroll-rail')!;
  const fill = document.getElementById('scroll-rail-fill')!;

  const setFill = (p: number) => {
    fill.style.transform = `scaleY(${p.toFixed(4)})`;
  };

  const st = ScrollTrigger.create({
    start: 0,
    end: () => ScrollTrigger.maxScroll(window),
    onUpdate: (self) => setFill(self.progress),
  });
  // browsers restore scroll position on reload — seed the fill immediately
  // instead of waiting for the first scroll event
  setFill(st.progress);

  // track draws down from the top once the preloader wipe clears — same beat
  // as the nav slide-in. Rail transform is GSAP-only (no CSS transition).
  gsap.to(rail, { scaleY: 1, duration: 1.1, ease: 'power3.inOut', delay: 0.15 });
}
