import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/** Line-masked rise of the thesis paragraph as it enters. */
export function initManifesto(): void {
  const text = document.querySelector<HTMLElement>('[data-split]');
  if (!text) return;

  const split = SplitText.create(text, {
    type: 'lines',
    linesClass: 'split-line',
    mask: 'lines',
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.lines, {
        yPercent: 112,
        duration: 1.1,
        stagger: 0.08,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: text,
          start: 'top 78%',
          once: true,
        },
      }),
  });
  void split;

  gsap.from('.manifesto .section-tag, .manifesto .text-link', {
    opacity: 0,
    y: 16,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.manifesto', start: 'top 70%', once: true },
  });

  // Exit dissolve: the thesis text melts away while the section's black
  // background is still indistinguishable from the dim veil behind it —
  // paired with the stage's veil ramp, the section disappears instead of
  // visibly scrolling up as a black box.
  gsap.to('.manifesto-frame', {
    opacity: 0,
    yPercent: -8,
    ease: 'none',
    scrollTrigger: {
      trigger: '.manifesto',
      start: 'bottom 82%',
      end: 'bottom 45%',
      scrub: true,
    },
  });
}
