import gsap from 'gsap';

/**
 * Magnetic nav pills: within a proximity field around each pill the pill
 * leans toward the pointer (plus the old hover lift), then springs back
 * with an elastic release on exit. GSAP owns the pill transform entirely —
 * the CSS hover transform was removed so the two never share the property.
 */
export function initMagnetic(): void {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const pills = gsap.utils.toArray<HTMLElement>('.nav-pill');
  if (!pills.length) return;

  const FIELD = 48; // px beyond the pill edge where attraction begins
  const active = new WeakSet<HTMLElement>();

  window.addEventListener('pointermove', (e) => {
    for (const el of pills) {
      const r = el.getBoundingClientRect();
      // rect moves with the pill — subtract the current translation to get
      // the resting center, or the magnet feeds back on its own motion
      const tx = Number(gsap.getProperty(el, 'x')) || 0;
      const ty = Number(gsap.getProperty(el, 'y')) || 0;
      const cx = r.left + r.width / 2 - tx;
      const cy = r.top + r.height / 2 - ty;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const ex = Math.max(Math.abs(dx) - r.width / 2, 0);
      const ey = Math.max(Math.abs(dy) - r.height / 2, 0);
      const dist = Math.hypot(ex, ey);
      if (dist < FIELD) {
        const pull = 1 - dist / FIELD; // 1 on the pill → 0 at the field edge
        active.add(el);
        gsap.to(el, {
          x: dx * 0.18 * pull,
          y: dy * 0.26 * pull - 2 * pull,
          duration: 0.45,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      } else if (active.has(el)) {
        active.delete(el);
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.85,
          ease: 'elastic.out(1, 0.45)',
          overwrite: 'auto',
        });
      }
    }
  });
}
