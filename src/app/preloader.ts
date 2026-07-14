import gsap from 'gsap';
import { startScroll, stopScroll } from './scroll';

/**
 * Boot-sequence preloader: draws the layer mark, counts to 100 with
 * deliberately uneven pacing (reads as "real work"), then wipes upward.
 * Resolves when the wipe reveals the page so the hero intro can chain.
 */
export function runPreloader(): Promise<void> {
  const root = document.getElementById('preloader')!;
  const count = document.getElementById('preloader-count')!;
  const lines = Array.from(
    document.querySelectorAll<HTMLElement>('#preloader-lines span'),
  );

  stopScroll();
  window.scrollTo(0, 0);

  return new Promise((resolve) => {
    const state = { value: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        root.remove();
        resolve();
      },
    });

    tl.to('.mark-layer', {
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
      .to(
        lines,
        { opacity: 1, duration: 0.01, stagger: 0.5 },
        0.4,
      )
      .to(root, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.9,
        ease: 'power4.inOut',
        delay: 0.15,
        onStart: () => startScroll(),
      });
  });
}
