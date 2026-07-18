import gsap from 'gsap';

/** Giant wordmark rises letter by letter; form gets a satisfying submit. */
export function initFooter(): void {
  const mega = document.querySelector<HTMLElement>('.footer-mega');
  if (mega) {
    const letters = mega.textContent!.trim().split('');
    mega.innerHTML = letters.map((l) => `<span>${l}</span>`).join('');
    const spans = Array.from(mega.children) as HTMLElement[];
    // The spans' CSS hover transition animates transform — the same property
    // the intro tween drives. Left on, a ScrollTrigger refresh (viewport
    // resize, phone rotation) can freeze a mid-flight matrix and strand the
    // glyphs over the legal line. Transitions stay off until the intro
    // finishes and clears every inline style it touched.
    for (const s of spans) s.style.transition = 'none';
    gsap.from(spans, {
      yPercent: 60,
      opacity: 0,
      duration: 1,
      stagger: 0.045,
      ease: 'power4.out',
      scrollTrigger: { trigger: mega, start: 'top 92%', once: true },
      onComplete: () => gsap.set(spans, { clearProps: 'all' }),
    });
  }

  const form = document.getElementById('footer-form') as HTMLFormElement | null;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('.footer-submit')!;
    btn.textContent = 'ROUTED ✓';
    gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    gsap.delayedCall(2.4, () => {
      btn.innerHTML = 'SUBSCRIBE&nbsp;→';
      form.reset();
    });
  });
}
