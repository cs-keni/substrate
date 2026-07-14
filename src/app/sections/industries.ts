import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The list lights up line by line as it crosses the viewport center —
 * a scroll-scrubbed spotlight rather than a one-shot reveal.
 */
export function initIndustries(): void {
  const items = gsap.utils.toArray<HTMLElement>('.industries-list li');

  items.forEach((li) => {
    ScrollTrigger.create({
      trigger: li,
      start: 'top 62%',
      end: 'bottom 30%',
      onToggle: (self) => li.classList.toggle('is-lit', self.isActive),
    });

    gsap.from(li, {
      opacity: 0,
      x: 40,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: { trigger: li, start: 'top 92%', once: true },
    });
  });

  gsap.from('.industries-head > *', {
    opacity: 0,
    y: 20,
    stagger: 0.12,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.industries', start: 'top 72%', once: true },
  });
}
