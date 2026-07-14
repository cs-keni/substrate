import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createField, type FieldScene } from './world/field';
import { createWorld, buildCameraTimeline, type WorldScene } from './world/world';
import { createTerrain, type TerrainScene } from './world/terrain';
import { createPost, type Post } from './post/composer';
import { JourneyHud, SiteLabels } from './hud';

gsap.registerPlugin(ScrollTrigger);

/**
 * One renderer, three scenes. ScrollTriggers on each `.section--gl` decide
 * which scene is live; the journey and footprint triggers also scrub their
 * scene's camera. Rendering pauses entirely when no GL section is on screen.
 */

type SceneKey = 'field' | 'world' | 'terrain' | null;

/** Piecewise dim-veil ramp over absolute scroll positions. */
interface DimSegment {
  from: number;
  to: number;
  /** veil opacity at `from` → at `to` */
  a: number;
  b: number;
}

export function initStage(): void {
  const stageEl = document.getElementById('gl-stage')!;
  const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement;
  const hudHost = document.getElementById('hud-layer')!;
  const dimEl = document.getElementById('gl-dim')!;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const field: FieldScene = createField();
  const world: WorldScene = createWorld();
  const terrain: TerrainScene = createTerrain();
  const post: Post = createPost(renderer, field.scene, field.camera);

  const journeyHud = new JourneyHud(hudHost, world.hudAnchors);
  const siteLabels = new SiteLabels(hudHost, terrain.sites);

  let active: SceneKey = null;
  let w = window.innerWidth;
  let h = window.innerHeight;
  let journeyProgress = 0;

  const dpr = () => Math.min(window.devicePixelRatio, 1.75);

  /* Dim-veil + scene choreography (absolute scroll space, rebuilt on
     resize): hero field darkens while the manifesto covers it, the white
     world emerges from black over the journey's first ~85vh, and the
     terrain sinks back to black just before the dark stats band arrives.
     The active scene is derived from scroll position every tick — never
     from trigger toggle events, which jump-scrolls can skip entirely. */
  let dimSegments: DimSegment[] = [];
  let lastDim = -1;
  let sceneBounds = { world: 0, terrain: 0, off: 0 };

  const buildDimSegments = () => {
    const top = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel)!;
      return el.getBoundingClientRect().top + window.scrollY;
    };
    const bottom = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel)!;
      return el.getBoundingClientRect().bottom + window.scrollY;
    };
    const vh = window.innerHeight;
    dimSegments = [
      // manifesto slides over the hero: field fades to black
      { from: top('#manifesto') - vh, to: bottom('#manifesto') - vh, a: 0, b: 1 },
      // world emerges from black as the journey pins
      { from: top('#journey') - vh, to: top('#journey') - vh * 0.15, a: 1, b: 0 },
      // terrain sinks to black before the stats band covers it
      { from: bottom('#footprint') - vh * 0.85, to: bottom('#footprint') - vh * 0.35, a: 0, b: 1 },
    ];
    sceneBounds = {
      world: top('#journey') - vh, // journey enters viewport
      terrain: top('#footprint') - vh * 0.45, // footprint viewport takes over
      off: top('#stats') - vh * 0.2, // stats band covers the canvas
    };
  };

  const sceneAt = (scroll: number): SceneKey => {
    if (scroll < sceneBounds.world) return 'field';
    if (scroll < sceneBounds.terrain) return 'world';
    if (scroll < sceneBounds.off) return 'terrain';
    return null;
  };

  const dimAt = (scroll: number): number => {
    let value = 0;
    for (const s of dimSegments) {
      if (scroll >= s.to) {
        value = s.b;
      } else if (scroll > s.from) {
        const t = (scroll - s.from) / (s.to - s.from);
        value = s.a + (s.b - s.a) * t;
      }
    }
    return value;
  };

  const applyDim = () => {
    const v = Math.round(dimAt(window.scrollY) * 1000) / 1000;
    if (v !== lastDim) {
      lastDim = v;
      dimEl.style.opacity = String(v);
    }
  };

  const resize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(dpr());
    post.resize(w, h, dpr());
    field.resize(w, h);
    world.resize(w, h);
    terrain.resize(w, h);
    buildDimSegments();
    applyDim();
  };
  resize();
  window.addEventListener('resize', resize);

  const setActive = (key: SceneKey) => {
    if (active === key) return;
    active = key;
    stageEl.classList.toggle('is-live', key !== null);
    if (key !== 'world') journeyHud.hide();
    if (key !== 'terrain') siteLabels.hide();
    if (key === 'field') post.setScene(field.scene, field.camera);
    if (key === 'world') post.setScene(world.scene, world.camera);
    if (key === 'terrain') post.setScene(terrain.scene, terrain.camera);
  };

  // ---- camera scrub triggers (scene switching is position-derived) ----
  setActive(sceneAt(window.scrollY));

  const cameraTl = buildCameraTimeline(world);
  ScrollTrigger.create({
    trigger: '#journey',
    start: 'top bottom',
    end: 'bottom bottom',
    scrub: 0.8,
    onUpdate: (self) => {
      journeyProgress = self.progress;
      cameraTl.progress(self.progress);
    },
  });

  ScrollTrigger.create({
    trigger: '#footprint',
    start: 'top bottom',
    end: 'bottom bottom',
    scrub: 0.8,
    onUpdate: (self) => {
      terrain.progress.value = self.progress;
    },
  });

  // hero pointer parallax
  window.addEventListener('pointermove', (e) => {
    field.setPointer((e.clientX / w) * 2 - 1, (e.clientY / h) * 2 - 1);
  });

  // ---- render loop on gsap's ticker ----
  const clock = new THREE.Clock();
  gsap.ticker.add(() => {
    applyDim();
    setActive(sceneAt(window.scrollY));
    if (!active) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    post.tick(elapsed);

    if (active === 'field') {
      field.tick(dt, elapsed);
    } else if (active === 'world') {
      world.tick(dt, elapsed);
      journeyHud.update(world.camera, journeyProgress, w, h);
    } else if (active === 'terrain') {
      terrain.tick(dt, elapsed);
      siteLabels.update(terrain.camera, true, w, h);
    }
    post.composer.render();
  });
}
