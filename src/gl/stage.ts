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

export function initStage(): void {
  const stageEl = document.getElementById('gl-stage')!;
  const canvas = document.getElementById('gl-canvas') as HTMLCanvasElement;
  const hudHost = document.getElementById('hud-layer')!;

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

  const resize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(dpr());
    post.resize(w, h, dpr());
    field.resize(w, h);
    world.resize(w, h);
    terrain.resize(w, h);
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
    // theme: paper scenes flip the chrome to light
    document.body.dataset.theme =
      key === 'world' || key === 'terrain' ? 'light' : 'dark';
  };

  // ---- scene activation triggers ----
  // page always boots at the hero; triggers handle every later handoff
  setActive('field');

  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    onToggle: (self) => self.isActive && setActive('field'),
  });

  const cameraTl = buildCameraTimeline(world);
  ScrollTrigger.create({
    trigger: '#journey',
    start: 'top bottom',
    end: 'bottom bottom',
    scrub: 0.8,
    onToggle: (self) => self.isActive && setActive('world'),
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
    onToggle: (self) => self.isActive && setActive('terrain'),
    onUpdate: (self) => {
      terrain.progress.value = self.progress;
    },
  });

  // no GL section on screen (manifesto/stats/industries/footer cover it)
  ScrollTrigger.create({
    trigger: '#stats',
    start: 'top 20%',
    end: 'max',
    onToggle: (self) => self.isActive && setActive(null),
  });

  // hero pointer parallax
  window.addEventListener('pointermove', (e) => {
    field.setPointer((e.clientX / w) * 2 - 1, (e.clientY / h) * 2 - 1);
  });

  // ---- render loop on gsap's ticker ----
  const clock = new THREE.Clock();
  gsap.ticker.add(() => {
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
