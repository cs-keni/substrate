import gsap from 'gsap';
import { startScroll, stopScroll } from './scroll';

/**
 * Boot-sequence preloader: draws the layer mark, counts to 100 with
 * deliberately uneven pacing (reads as "real work"), then wipes upward.
 * The wipe waits for `ready` (the lazy-loaded WebGL stage) so the page is
 * never revealed with a dead canvas. Resolves after the wipe.
 */
export async function runPreloader(ready: Promise<unknown>): Promise<void> {
  const root = document.getElementById('preloader')!;
  const count = document.getElementById('preloader-count')!;
  const lines = Array.from(
    document.querySelectorAll<HTMLElement>('#preloader-lines span'),
  );

  stopScroll();
  window.scrollTo(0, 0);

  const state = { value: 0 };
  const boot = gsap.timeline();
  boot
    .to('.mark-layer', {
      strokeDashoffset: 0,
      duration: 1.1,
      stagger: 0.14,
      ease: 'power2.inOut',
    })
    .to(
      state,
      {
        value: 100,
        duration: 1.9,
        ease: 'steps(23)',
        onUpdate: () => {
          count.textContent = String(Math.round(state.value)).padStart(3, '0');
        },
      },
      0.2,
    )
    .to(lines, { opacity: 1, duration: 0.01, stagger: 0.5 }, 0.4);

  await Promise.all([
    new Promise((r) => boot.eventCallback('onComplete', () => r(null))),
    ready.catch(() => null), // a GL failure shouldn't trap users on the loader
  ]);

  await gsap.to(root, {
    clipPath: 'inset(0 0 100% 0)',
    duration: 0.9,
    ease: 'power4.inOut',
    delay: 0.1,
    onStart: () => startScroll(),
  });

  root.remove();
}
