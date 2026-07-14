import gsap from 'gsap';

/** Giant headline pans horizontally, scrubbed across the whole section. */
export function initFootprint(): void {
  const mega = document.getElementById('footprint-mega')!;

  gsap.fromTo(
    mega,
    { xPercent: 6 },
    {
      xPercent: -58,
      ease: 'none',
      scrollTrigger: {
        trigger: '#footprint',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.6,
      },
    },
  );

  gsap.from('.footprint-caption > *', {
    opacity: 0,
    y: 20,
    stagger: 0.12,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: { trigger: '#footprint', start: 'top 55%', once: true },
  });
}
