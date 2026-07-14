import * as THREE from 'three';
import gsap from 'gsap';
import { PAPER } from '../palette';
import { buildGeneration, tickGeneration } from './generation';
import { buildTransmission, tickTransmission } from './transmission';
import { buildCompute, tickCompute } from './compute';

/**
 * The isometric world scene: paper-white ground with a dot-matrix shader,
 * three zones (generation → substation → compute campus), and an
 * orthographic camera locked to a classic iso angle whose target + zoom are
 * scrubbed by the journey ScrollTrigger through `camState`.
 */

export interface WorldScene {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  camState: { x: number; z: number; zoom: number };
  applyCamera: () => void;
  resize: (w: number, h: number) => void;
  tick: (dt: number, elapsed: number) => void;
  hudAnchors: HudAnchor[];
}

export interface HudAnchor {
  id: string;
  position: THREE.Vector3;
  /** journey progress window in which this callout is visible */
  range: [number, number];
  title: string;
  value: string;
  sub: string;
  /** live-updating value generator (optional) */
  live?: () => string;
}

const ISO_DIR = new THREE.Vector3(1, 1.05, 1).normalize();
const VIEW_SIZE = 46; // half-height of ortho frustum at zoom 1

function dotGround(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(560, 420);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uPaper: { value: PAPER },
      uInk: { value: new THREE.Color('#5a584f') },
      uFocus: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vWorld;
      uniform vec3 uPaper;
      uniform vec3 uInk;
      uniform vec2 uFocus;

      void main() {
        // dot matrix in world units
        vec2 cell = fract(vWorld / 2.2) - 0.5;
        float d = length(cell);
        float dot = 1.0 - smoothstep(0.045, 0.085, d);

        // dots fade with distance from the camera focus point
        float focus = 1.0 - smoothstep(18.0, 90.0, distance(vWorld, uFocus));
        float strength = dot * mix(0.05, 0.32, focus);

        vec3 col = mix(uPaper, uInk, strength);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02;
  return mesh;
}

export function createWorld(): WorldScene {
  const scene = new THREE.Scene();
  scene.background = PAPER.clone();
  scene.fog = new THREE.Fog(PAPER.clone(), 160, 340);

  scene.add(new THREE.AmbientLight('#ffffff', 1.9));
  const sun = new THREE.DirectionalLight('#fffdf5', 2.2);
  sun.position.set(-40, 80, 30);
  scene.add(sun);
  const bounce = new THREE.DirectionalLight('#e8e6df', 0.7);
  bounce.position.set(50, 30, -40);
  scene.add(bounce);

  const ground = dotGround();
  scene.add(ground);

  const generation = buildGeneration();
  generation.position.set(-118, 0, 18);
  scene.add(generation);

  const transmission = buildTransmission();
  scene.add(transmission.group);

  const compute = buildCompute();
  scene.add(compute);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -400, 800);
  const camState = { x: -132, z: 4, zoom: 0.55 };

  const applyCamera = () => {
    const target = new THREE.Vector3(camState.x, 0, camState.z);
    camera.position.copy(target).addScaledVector(ISO_DIR, 220);
    camera.lookAt(target);
    camera.zoom = camState.zoom;
    camera.updateProjectionMatrix();
    (ground.material as THREE.ShaderMaterial).uniforms.uFocus.value.set(
      camState.x,
      camState.z,
    );
  };

  const resize = (w: number, h: number) => {
    const aspect = w / h;
    camera.left = -VIEW_SIZE * aspect;
    camera.right = VIEW_SIZE * aspect;
    camera.top = VIEW_SIZE;
    camera.bottom = -VIEW_SIZE;
    applyCamera();
  };

  const tick = (dt: number, elapsed: number) => {
    tickGeneration(dt);
    tickTransmission(dt);
    tickCompute(elapsed);
  };

  const hudAnchors: HudAnchor[] = [
    {
      id: 'turbine',
      position: new THREE.Vector3(-126, 12, 8),
      range: [0.05, 0.2],
      title: '5.6 MW',
      value: 'TURBINE W-04',
      sub: 'CUT-IN 3.2 m/s',
      live: () => `${(5.2 + Math.sin(Date.now() / 900) * 0.5).toFixed(1)} MW`,
    },
    {
      id: 'solar',
      position: new THREE.Vector3(-138, 3, 36),
      range: [0.16, 0.3],
      title: '68 MW DC',
      value: 'ARRAY S-11',
      sub: 'TRACKING +38°',
    },
    {
      id: 'collector',
      position: new THREE.Vector3(-84, 4, 40),
      range: [0.3, 0.42],
      title: '345 kV',
      value: 'COLLECTOR YARD',
      sub: 'STEP-UP TO CORRIDOR',
    },
    {
      id: 'substation',
      position: new THREE.Vector3(0, 5, -2),
      range: [0.46, 0.62],
      title: '500 kV',
      value: 'SWITCHYARD SBR-0',
      sub: '99.98% AVAILABILITY',
    },
    {
      id: 'hall',
      position: new THREE.Vector3(96, 5, -34),
      range: [0.68, 0.84],
      title: '154 MW',
      value: 'HALL 07 — IT LOAD',
      sub: 'PUE 1.18',
      live: () => `${(152 + Math.sin(Date.now() / 1200) * 3).toFixed(0)} MW`,
    },
    {
      id: 'racks',
      position: new THREE.Vector3(122, 3.4, -10),
      range: [0.82, 0.97],
      title: '96.4 EH/s',
      value: 'RACK ROW E-2',
      sub: '14.2 J/TH FLEET',
      live: () => `${(95.5 + Math.sin(Date.now() / 800) * 1.4).toFixed(1)} EH/s`,
    },
  ];

  applyCamera();
  return { scene, camera, camState, applyCamera, resize, tick, hudAnchors };
}

/**
 * Camera choreography over journey progress 0→1, as a paused timeline the
 * ScrollTrigger scrubs. Eases between beats read as intentional camera work.
 */
export function buildCameraTimeline(world: WorldScene): gsap.core.Timeline {
  const s = world.camState;
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });

  tl
    // opening: high wide over the wind farm
    .fromTo(s, { x: -132, z: 4, zoom: 0.55 }, { x: -128, z: 10, zoom: 0.9, duration: 1.4 })
    // beat 1 — generation close pass (turbines)
    .to(s, { x: -124, z: 14, zoom: 1.7, duration: 1.6 })
    // drift across solar field
    .to(s, { x: -140, z: 30, zoom: 1.9, duration: 1.6 })
    // beat 2 — pick up the corridor at the collector yard
    .to(s, { x: -84, z: 40, zoom: 1.5, duration: 1.8 })
    // ride the traces east
    .to(s, { x: -30, z: 8, zoom: 1.35, duration: 2.0, ease: 'none' })
    // beat 3 — substation hold
    .to(s, { x: 0, z: 0, zoom: 2.3, duration: 1.8 })
    // continue east along second corridor
    .to(s, { x: 56, z: -14, zoom: 1.4, duration: 1.9, ease: 'none' })
    // beat 4 — campus arrival wide
    .to(s, { x: 100, z: -26, zoom: 1.1, duration: 1.7 })
    // beat 5 — rack yard close-up
    .to(s, { x: 120, z: -8, zoom: 2.6, duration: 1.8 })
    // exit: pull up and away
    .to(s, { x: 106, z: -18, zoom: 0.7, duration: 1.6 });

  tl.eventCallback('onUpdate', world.applyCamera);
  return tl;
}
