import * as THREE from 'three';
import gsap from 'gsap';
import { PAPER, PAPER_DIM } from '../palette';
import { buildGeneration, tickGeneration } from './generation';
import { buildTransmission, tickTransmission } from './transmission';
import { buildCompute, tickCompute } from './compute';
import { NOISE_GLSL, fbm } from './noise';
import { road, fenceRect, scrub } from './groundworks';

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

/* ---- ground relief ----
   The land rolls, but every built thing sits on flats: a mask holds the
   surface at y=0 near the zones and along every road, and fbm hills rise
   only beyond a margin. The fragment shader's mottling + contours sample
   the SAME fbm field, so the drawn contours trace the real hills. */

const v2 = (x: number, z: number) => new THREE.Vector2(x, z);

// service road shadowing the transmission corridor (offset south)
// Roads never cross a fence line except at a gate, and never overlap a
// structure footprint — trucks drive these, so any overlap reads as
// phasing through solid objects. Switchyard: skirt north of the fence
// (z=14 vs rail z=11). Campus: enter through the west-fence gate.
const SERVICE_ROAD = [
  v2(-104.5, 49), v2(-86.5, 49), v2(-72.5, 35), v2(-44.5, 35),
  v2(-28.5, 19), v2(-28.5, 14), v2(16.5, 14), v2(19.5, 6),
  v2(35.5, -7), v2(59.5, -7), v2(71.5, -19), v2(93.5, -19),
];
const WIND_SPUR = [
  v2(-104.5, 49), v2(-114, 38), v2(-124, 24), v2(-132, 11), v2(-139, 1), v2(-144, -8),
];
// solar leg stays OUTSIDE the solar-block fence (east rail at x=-126.2) —
// a perimeter service lane, not a path through the fence line
const SOLAR_ROAD = [
  v2(-104.5, 49), v2(-115, 47.5), v2(-123, 43.5), v2(-125.4, 36), v2(-125.4, 26),
];
const CAMPUS_ENTRY = [v2(93.5, -19), v2(87, -12), v2(80, -6)];

// [cx, cz, radius] — development areas that must stay dead flat
const FLAT_ZONES: Array<[number, number, number]> = [
  [-114, 20, 54], // generation cluster (turbines/solar/thermal)
  [0, 0, 34], // switchyard
  [104, -26, 52], // compute campus
  [-84, 40, 24], // collector yard / corridor head
];
const FLAT_ROUTES = [SERVICE_ROAD, WIND_SPUR, SOLAR_ROAD, CAMPUS_ENTRY];

function distToSegment(px: number, pz: number, a: THREE.Vector2, b: THREE.Vector2): number {
  const abx = b.x - a.x;
  const abz = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((px - a.x) * abx + (pz - a.y) * abz) / (abx * abx + abz * abz)));
  return Math.hypot(px - (a.x + abx * t), pz - (a.y + abz * t));
}

/** Terrain height for the world ground — 0 on the built flats, fbm hills beyond. */
export function worldGroundHeight(x: number, z: number): number {
  let d = Infinity;
  for (const [cx, cz, r] of FLAT_ZONES) {
    d = Math.min(d, Math.hypot(x - cx, z - cz) - r);
    if (d <= 0) return 0;
  }
  for (const route of FLAT_ROUTES) {
    for (let i = 0; i < route.length - 1; i++) {
      d = Math.min(d, distToSegment(x, z, route[i], route[i + 1]) - 14);
      if (d <= 0) return 0;
    }
  }
  const t = Math.min(1, d / 36);
  const mask = t * t * (3 - 2 * t); // smoothstep
  return mask * (fbm(x * 0.014, z * 0.014) - 0.45) * 16;
}

/* ---- road traffic ---- */

interface Vehicle {
  group: THREE.Group;
  curve: THREE.CurvePath<THREE.Vector3>;
  t: number;
  speed: number; // in curve-t per second
  mats: THREE.Material[];
  bodies: THREE.Mesh[];
}

function roadCurve(route: THREE.Vector2[]): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < route.length - 1; i++) {
    path.add(new THREE.LineCurve3(
      new THREE.Vector3(route[i].x, 0, route[i].y),
      new THREE.Vector3(route[i + 1].x, 0, route[i + 1].y),
    ));
  }
  return path;
}

/** Little service truck — white box body, bone cab, volt tail light. */
function truck(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.5, 0.55),
    new THREE.MeshLambertMaterial({ color: '#f4f3ef' }),
  );
  body.position.set(-0.1, 0.42, 0);
  body.castShadow = true;
  g.add(body);
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.5),
    new THREE.MeshLambertMaterial({ color: '#cfcdc4' }),
  );
  cab.position.set(0.62, 0.36, 0);
  cab.castShadow = true;
  g.add(cab);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.1, 0.3),
    new THREE.MeshBasicMaterial({ color: '#ff4e00' }),
  );
  tail.position.set(-0.7, 0.4, 0);
  g.add(tail);
  return g;
}

function dotGround(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(560, 420, 150, 112);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uPaper: { value: PAPER },
      uPaperDim: { value: PAPER_DIM },
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
      uniform vec3 uPaperDim;
      uniform vec3 uInk;
      uniform vec2 uFocus;
      ${NOISE_GLSL}

      void main() {
        // large-scale mottling: the plane reads as land, not blank paper
        float land = fbm(vWorld * 0.014);
        vec3 col = mix(uPaper, uPaperDim, smoothstep(0.3, 0.8, land) * 0.7);

        // faint survey contours off the same noise field — the
        // "engineering drawing" read at zero geometry cost
        float lv = land * 9.0;
        float band = min(fract(lv), 1.0 - fract(lv));
        float aa = fwidth(lv) * 1.4;
        float contour = 1.0 - smoothstep(aa, aa * 2.2, band);
        col = mix(col, uInk, contour * 0.05);

        // dot matrix in world units
        vec2 cell = fract(vWorld / 2.2) - 0.5;
        float d = length(cell);
        float dot = 1.0 - smoothstep(0.045, 0.085, d);

        // dots fade with distance from the camera focus point
        float focus = 1.0 - smoothstep(18.0, 90.0, distance(vWorld, uFocus));
        float strength = dot * mix(0.05, 0.32, focus);

        col = mix(col, uInk, strength);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, worldGroundHeight(pos.getX(i), pos.getZ(i)));
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.02;
  mesh.userData.noShadow = true;
  return mesh;
}

export function createWorld(): WorldScene {
  const scene = new THREE.Scene();
  scene.background = PAPER.clone();
  scene.fog = new THREE.Fog(PAPER.clone(), 160, 340);

  // lower ambient + stronger sun = more facet contrast (reads more 3D),
  // and the sun now casts real shadows — the ground truth of depth
  scene.add(new THREE.AmbientLight('#ffffff', 1.5));
  const sun = new THREE.DirectionalLight('#fffdf5', 2.6);
  sun.position.set(-80, 160, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -230;
  sun.shadow.camera.right = 230;
  sun.shadow.camera.top = 180;
  sun.shadow.camera.bottom = -180;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 520;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  const bounce = new THREE.DirectionalLight('#e8e6df', 0.7);
  bounce.position.set(50, 30, -40);
  scene.add(bounce);

  const ground = dotGround();
  scene.add(ground);

  // shadow catcher: same displaced geometry, draws ONLY received shadows —
  // the dot-matrix shader below stays untouched
  const catcher = new THREE.Mesh(
    ground.geometry,
    new THREE.ShadowMaterial({ opacity: 0.13 }),
  );
  catcher.position.y = 0;
  catcher.receiveShadow = true;
  catcher.userData.noShadow = true;
  scene.add(catcher);

  const generation = buildGeneration();
  generation.position.set(-118, 0, 18);
  scene.add(generation);

  const transmission = buildTransmission();
  scene.add(transmission.group);

  const compute = buildCompute();
  scene.add(compute);

  /* Groundworks — the connective tissue that makes the three zones read as
     one built-out site instead of objects dropped on a plane. Routes are
     module consts because the ground-relief mask flattens the land along
     them (see worldGroundHeight). */
  scene.add(road(SERVICE_ROAD, 1.7));
  scene.add(road(WIND_SPUR, 1.3));
  scene.add(road(SOLAR_ROAD, 1.2));
  scene.add(road(CAMPUS_ENTRY, 1.5));

  // service trucks patrol the roads — the human-scale motion that sells a
  // working site (speeds are curve-t/s: scaled so long routes drive slower)
  const vehicles: Vehicle[] = [];
  const spawnTruck = (route: THREE.Vector2[], speed: number, t0: number, reverse = false) => {
    const g = truck();
    scene.add(g);
    // trucks dissolve in/out at the route ends (each truck() has its own
    // materials, so per-vehicle opacity is safe to mutate every tick)
    const mats: THREE.Material[] = [];
    const bodies: THREE.Mesh[] = [];
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        (obj.material as THREE.Material).transparent = true;
        mats.push(obj.material as THREE.Material);
        bodies.push(obj);
      }
    });
    vehicles.push({
      group: g,
      curve: roadCurve(reverse ? [...route].reverse() : route),
      t: t0,
      speed,
      mats,
      bodies,
    });
  };
  spawnTruck(SERVICE_ROAD, 0.016, 0.1);
  spawnTruck(SERVICE_ROAD, 0.014, 0.55);
  spawnTruck(SERVICE_ROAD, 0.015, 0.32, true);
  spawnTruck(WIND_SPUR, 0.05, 0.7);
  spawnTruck(SOLAR_ROAD, 0.055, 0.2, true);

  // perimeter fences: solar block, switchyard, campus. The campus west
  // fence gets a gate where the service road crosses x=70 at z≈-17.5
  // (edge 3 runs from the NW corner at z=-1 southward, so 16.5 along it)
  scene.add(fenceRect(-138.7, 36.4, 25, 23));
  scene.add(fenceRect(0, 0, 30, 22));
  scene.add(fenceRect(104, -26, 68, 50, [[3, 16.5, 4]]));

  // patchy scrub + rock clusters across the open land (kept off the roads,
  // pads, and structure aprons)
  const keepOut: Array<[number, number, number]> = [
    [-138.7, 36.4, 15], [0, 0, 18], [104, -26, 40],
    [-100, 26, 12], [-100, 36, 10],
    ...SERVICE_ROAD.map((p): [number, number, number] => [p.x, p.y, 6]),
    [-114, 38, 5], [-124, 24, 5], [-132, 11, 5], [-139, 1, 5],
    [-125.4, 31, 5], [-123, 43.5, 5], [87, -12, 6],
  ];
  scene.add(scrub(-160, -50, 150, 68, 620, keepOut, worldGroundHeight));

  // real shadows everywhere: everything solid casts; lambert surfaces
  // (pads, roads, walls, roofs) also receive so shadows don't vanish
  // when they cross built ground
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || obj.userData.noShadow) return;
    obj.castShadow = true;
    if ((obj.material as THREE.Material).type === 'MeshLambertMaterial') {
      obj.receiveShadow = true;
    }
  });

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
    for (const v of vehicles) {
      v.t = (v.t + dt * v.speed) % 1;
      const pos = v.curve.getPointAt(v.t);
      const tan = v.curve.getTangentAt(v.t);
      v.group.position.set(pos.x, 0.02, pos.z);
      v.group.rotation.y = Math.atan2(-tan.z, tan.x);
      // dissolve over the first/last 6% of the route so the loop wrap reads
      // as departing/arriving, never popping into existence mid-frame
      const edge = Math.min(v.t, 1 - v.t) / 0.06;
      const f = Math.min(1, edge);
      const fade = f * f * (3 - 2 * f);
      for (const m of v.mats) m.opacity = fade;
      // shadow maps ignore opacity — drop the shadow while mostly dissolved
      for (const b of v.bodies) b.castShadow = fade > 0.55;
    }
  };

  const hudAnchors: HudAnchor[] = [
    {
      id: 'turbine',
      position: new THREE.Vector3(-126, 12, 8),
      range: [0.15, 0.24],
      title: '5.6 MW',
      value: 'TURBINE W-04',
      sub: 'CUT-IN 3.2 m/s',
      live: () => `${(5.2 + Math.sin(Date.now() / 900) * 0.5).toFixed(1)} MW`,
    },
    {
      id: 'solar',
      position: new THREE.Vector3(-138, 3, 36),
      range: [0.21, 0.33],
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
    .to(s, { x: -140, z: 30, zoom: 1.9, duration: 1.6, ease: 'sine.inOut' })
    // beat 2 — pick up the corridor at the collector yard
    .to(s, { x: -84, z: 40, zoom: 1.5, duration: 1.8 })
    // ride the traces east — sine keeps momentum without a dead-linear feel
    .to(s, { x: -30, z: 8, zoom: 1.35, duration: 2.0, ease: 'sine.inOut' })
    // beat 3 — substation hold
    .to(s, { x: 0, z: 0, zoom: 2.3, duration: 1.8 })
    // continue east along second corridor
    .to(s, { x: 56, z: -14, zoom: 1.4, duration: 1.9, ease: 'sine.inOut' })
    // beat 4 — campus arrival wide
    .to(s, { x: 100, z: -26, zoom: 1.1, duration: 1.7 })
    // beat 5 — rack yard close-up
    .to(s, { x: 120, z: -8, zoom: 2.6, duration: 1.8 })
    // exit: long slow pull up and away
    .to(s, { x: 106, z: -18, zoom: 0.7, duration: 2.2, ease: 'power2.inOut' });

  tl.eventCallback('onUpdate', world.applyCamera);
  return tl;
}
