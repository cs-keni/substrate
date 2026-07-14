import * as THREE from 'three';
import type { HudAnchor } from './world/world';
import type { SiteMarker } from './world/terrain';

/**
 * Projects 3D anchor points to fixed-position HTML callouts. Two flavors:
 * journey callouts (dot + data card, gated by progress window) and terrain
 * site labels (name + MW, gated by depth/frustum).
 */

const v = new THREE.Vector3();

function project(
  pos: THREE.Vector3,
  camera: THREE.Camera,
  w: number,
  h: number,
): { x: number; y: number; behind: boolean } {
  v.copy(pos).project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * w,
    y: (-v.y * 0.5 + 0.5) * h,
    behind: v.z > 1,
  };
}

export class JourneyHud {
  private els = new Map<string, HTMLElement>();

  constructor(
    private host: HTMLElement,
    private anchors: HudAnchor[],
  ) {
    for (const a of anchors) {
      const el = document.createElement('div');
      el.className = 'hud-callout';
      el.innerHTML = `
        <span class="hud-dot">●</span>
        <span class="hud-body">
          <b data-hud-value>${a.title}</b>
          <span>${a.value}</span>
          <small>${a.sub}</small>
        </span>`;
      this.host.appendChild(el);
      this.els.set(a.id, el);
    }
  }

  update(camera: THREE.Camera, progress: number, w: number, h: number): void {
    for (const a of this.anchors) {
      const el = this.els.get(a.id)!;
      const [start, end] = a.range;
      const inWindow = progress >= start && progress <= end;
      if (!inWindow) {
        el.style.opacity = '0';
        continue;
      }
      const p = project(a.position, camera, w, h);
      if (p.behind) {
        el.style.opacity = '0';
        continue;
      }
      // ease in/out at the window edges
      const span = end - start;
      const local = (progress - start) / span;
      const fade = Math.min(1, Math.min(local, 1 - local) * 6);
      el.style.opacity = fade.toFixed(3);
      // small rise as the callout fades in — reads as "pinned on" rather
      // than popped
      const rise = (1 - fade) * 10;
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y + rise).toFixed(1)}px)`;
      if (a.live && fade > 0) {
        el.querySelector('[data-hud-value]')!.textContent = a.live();
      }
    }
  }

  hide(): void {
    for (const el of this.els.values()) el.style.opacity = '0';
  }
}

export class SiteLabels {
  private els: HTMLElement[] = [];

  constructor(
    private host: HTMLElement,
    private sites: SiteMarker[],
  ) {
    for (const s of sites) {
      const el = document.createElement('div');
      el.className = 'site-label';
      el.innerHTML = `
        <b>${s.mw}</b>
        <small>${s.name}</small>
        ${s.status ? `<small class="site-status">${s.status}</small>` : ''}`;
      this.host.appendChild(el);
      this.els.push(el);
    }
  }

  update(camera: THREE.Camera, active: boolean, w: number, h: number): void {
    this.sites.forEach((s, i) => {
      const el = this.els[i];
      if (!active) {
        el.style.opacity = '0';
        return;
      }
      const p = project(s.position, camera, w, h);
      const dist = camera.position.distanceTo(s.position);
      if (p.behind || dist > 190 || p.x < -40 || p.x > w + 40) {
        el.style.opacity = '0';
        return;
      }
      const fade = 1 - THREE.MathUtils.smoothstep(dist, 120, 185);
      el.style.opacity = fade.toFixed(3);
      el.style.transform = `translate(${(p.x + 10).toFixed(1)}px, ${(p.y - 14).toFixed(1)}px)`;
    });
  }

  hide(): void {
    for (const el of this.els) el.style.opacity = '0';
  }
}
