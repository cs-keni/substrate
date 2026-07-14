import gsap from 'gsap';
import { scrollTo, startScroll, stopScroll } from './scroll';

/** Sticky pill nav + full-screen menu with staggered link reveals. */
export function initNav(): void {
  const nav = document.getElementById('site-nav')!;
  const toggle = document.getElementById('menu-toggle')!;
  const overlay = document.getElementById('menu-overlay')!;
  const links = gsap.utils.toArray<HTMLElement>('.menu-list span');
  const meta = overlay.querySelectorAll('.menu-meta p');

  let open = false;

  const menuTl = gsap
    .timeline({ paused: true })
    .set(overlay, { visibility: 'visible', attr: { 'aria-hidden': 'false' } })
    .to(overlay, {
      clipPath: 'inset(0 0 0% 0)',
      duration: 0.7,
      ease: 'power4.inOut',
    })
    .to(
      links,
      { y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' },
      '-=0.25',
    )
    .fromTo(
      meta,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 },
      '-=0.5',
    );

  const setOpen = (next: boolean) => {
    open = next;
    toggle.setAttribute('aria-expanded', String(next));
    if (next) {
      stopScroll();
      menuTl.timeScale(1).play();
    } else {
      startScroll();
      menuTl.timeScale(1.6).reverse();
      overlay.setAttribute('aria-hidden', 'true');
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setOpen(false);
  });

  overlay.querySelectorAll<HTMLAnchorElement>('[data-menu-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setOpen(false);
      gsap.delayedCall(0.55, () => scrollTo(a.getAttribute('href')!));
    });
  });

  document.querySelector('.nav-pill--brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (open) setOpen(false);
    scrollTo(0);
  });

  // slide-in once the preloader is gone
  gsap.to(nav, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 });
}
