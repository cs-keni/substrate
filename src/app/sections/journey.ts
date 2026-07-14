import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * HTML layer over the world flythrough: three layer cards fade in/out at
 * camera beats, and the progress rail tracks the whole journey.
 */

interface CardWindow {
  el: HTMLElement;
  range: [number, number];
  label: string;
}

export function initJourney(): void {
  const cards: CardWindow[] = [
    {
      el: document.getElementById('layer-generation')!,
      range: [0.04, 0.24],
      label: 'LAYER 01 — GENERATION',
    },
    {
      el: document.getElementById('layer-transmission')!,
      range: [0.34, 0.56],
      label: 'LAYER 02 — TRANSMISSION',
    },
    {
      el: document.getElementById('layer-compute')!,
      range: [0.66, 0.9],
      label: 'LAYER 03 — COMPUTE',
    },
  ];

  const label = document.getElementById('journey-progress-label')!;
  const fill = document.getElementById('journey-progress-fill')!;

  const setCard = (card: CardWindow, progress: number) => {
    const [a, b] = card.range;
    if (progress < a || progress > b) {
      gsap.set(card.el, { opacity: 0, visibility: 'hidden' });
      return;
    }
    const local = (progress - a) / (b - a);
    const fade = Math.min(1, Math.min(local, 1 - local) * 5);
    const rise = (1 - Math.min(1, local * 5)) * 28;
    gsap.set(card.el, {
      opacity: fade,
      visibility: 'visible',
      y: rise,
    });
  };

  ScrollTrigger.create({
    trigger: '#journey',
    start: 'top bottom',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const p = self.progress;
      for (const c of cards) setCard(c, p);
      fill.style.transform = `scaleX(${p.toFixed(4)})`;
      const current =
        p < 0.3 ? cards[0] : p < 0.62 ? cards[1] : cards[2];
      if (label.textContent !== current.label) label.textContent = current.label;
    },
  });
}
