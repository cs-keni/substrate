import { scrollTo } from './scroll';

/**
 * Smooth in-page navigation. Plain element anchors are fine for most
 * targets, but the three layer cards live inside the pinned journey
 * viewport — their DOM position says nothing about *when* they appear.
 * Those map to fractions of the journey's scroll runway instead.
 */

const JOURNEY_WAYPOINTS: Record<string, number> = {
  '#layer-generation': 0.12,
  '#layer-transmission': 0.44,
  '#layer-compute': 0.76,
};

export function resolveAnchor(href: string): string | number {
  const fraction = JOURNEY_WAYPOINTS[href];
  if (fraction === undefined) return href;
  const journey = document.getElementById('journey')!;
  const rect = journey.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const runway = rect.height; // trigger spans top-bottom → bottom-bottom
  return top - window.innerHeight + fraction * runway;
}

/** Bind every plain in-page anchor (menu links are handled by nav.ts). */
export function initAnchors(): void {
  document
    .querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not([data-menu-link])')
    .forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href')!;
        if (href === '#') return;
        e.preventDefault();
        scrollTo(resolveAnchor(href));
      });
    });
}
