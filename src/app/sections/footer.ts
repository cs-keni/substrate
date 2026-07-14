import gsap from 'gsap';

/** Giant wordmark rises letter by letter; form gets a satisfying submit. */
export function initFooter(): void {
  const mega = document.querySelector<HTMLElement>('.footer-mega');
  if (mega) {
    const letters = mega.textContent!.trim().split('');
    mega.innerHTML = letters.map((l) => `<span>${l}</span>`).join('');
    gsap.from(mega.children, {
      yPercent: 60,
      opacity: 0,
      duration: 1,
      stagger: 0.045,
      ease: 'power4.out',
      scrollTrigger: { trigger: mega, start: 'top 92%', once: true },
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
