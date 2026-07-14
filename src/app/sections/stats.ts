import gsap from 'gsap';

/** Tabular-numeral counters that wind up when the band scrolls in. */
export function initStats(): void {
  document.querySelectorAll<HTMLElement>('.stat').forEach((stat, i) => {
    const target = parseFloat(stat.dataset.count ?? '0');
    const decimals = parseInt(stat.dataset.decimals ?? '0', 10);
    const num = stat.querySelector('.stat-num')!;
    const state = { value: 0 };

    gsap.to(state, {
      value: target,
      duration: 1.8,
      delay: i * 0.12,
      ease: 'power3.inOut',
      onUpdate: () => {
        num.textContent = state.value.toFixed(decimals);
      },
      onComplete: () => {
        // settle flash: a quick volt blink when the number lands
        gsap.fromTo(
          num,
          { color: '#ff4e00' },
          { color: '', duration: 0.7, ease: 'power2.out' },
        );
        gsap.fromTo(num, { scale: 1.03 }, { scale: 1, duration: 0.45, ease: 'power3.out' });
      },
      scrollTrigger: { trigger: stat, start: 'top 82%', once: true },
    });

    gsap.from(stat, {
      opacity: 0,
      y: 28,
      duration: 0.9,
      delay: i * 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.stats-grid', start: 'top 80%', once: true },
    });
  });
}
