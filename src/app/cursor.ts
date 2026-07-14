import gsap from 'gsap';

/** Orange cursor dot with lag; rings up over interactive targets. */
export function initCursor(): void {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const el = document.getElementById('cursor')!;
  const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });

  el.classList.add('is-hidden');

  window.addEventListener('pointermove', (e) => {
    el.classList.remove('is-hidden');
    xTo(e.clientX);
    yTo(e.clientY);
    const target = e.target as Element | null;
    const interactive = !!target?.closest('a, button, input, [data-cursor]');
    el.classList.toggle('is-hover', interactive);
  });

  document.documentElement.addEventListener('pointerleave', () =>
    el.classList.add('is-hidden'),
  );
}
