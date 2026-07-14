import gsap from 'gsap';

/** Staggered headline rise after preloader, plus live ticker numbers. */
export function initHero(): void {
  gsap
    .timeline({ defaults: { ease: 'power4.out' } })
    .to('.hero-line-inner', { y: 0, duration: 1.3, stagger: 0.12 }, 0.05)
    .fromTo(
      '[data-hero-fade]',
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' },
      0.6,
    );

  // Fictional live telemetry — drifting numbers sell the "control room" feel.
  const load = document.querySelector('[data-ticker="load"]');
  const freq = document.querySelector('[data-ticker="freq"]');
  const hash = document.querySelector('[data-ticker="hash"]');
  let mw = 1402;
  let hz = 60.002;
  let eh = 96.4;

  setInterval(() => {
    mw = Math.round(gsap.utils.clamp(1360, 1445, mw + gsap.utils.random(-6, 6)));
    hz = gsap.utils.clamp(59.96, 60.04, hz + gsap.utils.random(-0.004, 0.004));
    eh = gsap.utils.clamp(94, 98.5, eh + gsap.utils.random(-0.15, 0.15));
    if (load) load.textContent = `BUS LOAD ${mw.toLocaleString('en-US').replace(',', ' ')} MW`;
    if (freq) freq.textContent = `GRID ${hz.toFixed(3)} Hz`;
    if (hash) hash.textContent = `COMPUTE ${eh.toFixed(1)} EH/s`;
  }, 1400);

  // Hero content drifts up / fades as the journey begins.
  gsap.to('.hero-frame', {
    opacity: 0,
    y: -60,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom 25%',
      scrub: true,
    },
  });
}
