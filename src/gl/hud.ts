import * as THREE from 'three';
import type { HudAnchor } from './world/world';
import type { SiteMarker, RegionMarker } from './world/terrain';

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

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export class JourneyHud {
  private els = new Map<string, HTMLElement>();
  private sizes = new Map<string, { w: number; h: number }>();

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
      let fade = Math.min(1, Math.min(local, 1 - local) * 6);
      // dissolve before the card clips the viewport (small screens): the
      // anchor stays honest — the label never detaches from its world point
      let size = this.sizes.get(a.id);
      if (!size || size.w === 0) {
        size = { w: el.offsetWidth, h: el.offsetHeight };
        this.sizes.set(a.id, size);
      }
      fade *= Math.min(
        clamp01((w - 8 - (p.x + size.w)) / 36),
        clamp01((h - 8 - (p.y + size.h)) / 36),
        clamp01((p.x - 8) / 36),
        clamp01((p.y - 8) / 36),
      );
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

  /** `gate` multiplies all label opacity (0..1) — the stage passes the
   *  inverse of the dim veil so labels sink into black with the scene
   *  instead of floating above it (the HUD layer sits over the veil). */
  update(camera: THREE.Camera, gate: number, w: number, h: number): void {
    this.sites.forEach((s, i) => {
      const el = this.els[i];
      if (gate <= 0.01) {
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
      // duck under the OUR FOOTPRINT mega title band along the top
      const topFade = THREE.MathUtils.smoothstep(p.y, h * 0.22, h * 0.34);
      el.style.opacity = (fade * topFade * gate).toFixed(3);
      el.style.transform = `translate(${(p.x + 10).toFixed(1)}px, ${(p.y - 14).toFixed(1)}px)`;
    });
  }

  hide(): void {
    for (const el of this.els) el.style.opacity = '0';
  }
}

/** Small mono tags naming each grid interconnection on the footprint map. */
export class RegionLabels {
  private els: HTMLElement[] = [];

  constructor(
    private host: HTMLElement,
    private regions: RegionMarker[],
  ) {
    for (const r of regions) {
      const el = document.createElement('div');
      el.className = 'region-label';
      el.textContent = r.name;
      this.host.appendChild(el);
      this.els.push(el);
    }
  }

  update(camera: THREE.Camera, gate: number, w: number, h: number): void {
    this.regions.forEach((r, i) => {
      const el = this.els[i];
      if (gate <= 0.01) {
        el.style.opacity = '0';
        return;
      }
      const p = project(r.position, camera, w, h);
      const dist = camera.position.distanceTo(r.position);
      if (p.behind || dist > 260 || p.x < -80 || p.x > w + 80) {
        el.style.opacity = '0';
        return;
      }
      const fade = 1 - THREE.MathUtils.smoothstep(dist, 170, 250);
      const topFade = THREE.MathUtils.smoothstep(p.y, h * 0.22, h * 0.34);
      el.style.opacity = (fade * topFade * 0.85 * gate).toFixed(3);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translateX(-50%)`;
    });
  }

  hide(): void {
    for (const el of this.els) el.style.opacity = '0';
  }
}
