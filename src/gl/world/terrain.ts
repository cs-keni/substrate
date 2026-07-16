import * as THREE from 'three';
import { NOISE_GLSL, fbm, hash21 } from './noise';
import { outlined, whiteMat } from '../palette';

/**
 * FOOTPRINT — light point-cloud terrain. A displaced dot grid in paper
 * tones, with fictional site spikes whose labels are projected to HTML.
 * Spike height encodes site capacity; dashed loops group the sites into
 * their three grid interconnections. Camera glides forward across the
 * range as the section scrubs.
 */

export interface SiteMarker {
  id: string;
  position: THREE.Vector3; // spike top, world space
  name: string;
  mw: string;
  status?: string;
}

export interface RegionMarker {
  id: string;
  position: THREE.Vector3;
  name: string;
}

export interface TerrainScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  progress: { value: number };
  sites: SiteMarker[];
  regions: RegionMarker[];
  resize: (w: number, h: number) => void;
  tick: (dt: number, elapsed: number) => void;
}

const TERRAIN_SCALE = 0.021;
const TERRAIN_AMP = 21.0;

function terrainHeight(x: number, z: number): number {
  return fbm(x * TERRAIN_SCALE, z * TERRAIN_SCALE) * TERRAIN_AMP - 6;
}

export function createTerrain(): TerrainScene {
  const scene = new THREE.Scene();
  const paper = new THREE.Color('#f4f3ef');
  scene.background = paper;
  scene.fog = new THREE.Fog(paper, 60, 210);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);

  // lights for the lambert site buildings (the point cloud is unlit)
  scene.add(new THREE.AmbientLight('#ffffff', 1.7));
  const sun = new THREE.DirectionalLight('#fffdf5', 1.6);
  sun.position.set(-50, 90, 40);
  scene.add(sun);

  const COLS = 420;
  const ROWS = 260;
  const W = 420;
  const D = 300;
  const positions = new Float32Array(COLS * ROWS * 3);
  let i3 = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      positions[i3++] = (c / (COLS - 1) - 0.5) * W;
      positions[i3++] = 0;
      positions[i3++] = (r / (ROWS - 1) - 0.5) * D;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uScale: { value: TERRAIN_SCALE },
      uAmp: { value: TERRAIN_AMP },
    },
    vertexShader: /* glsl */ `
      uniform float uPixelRatio;
      uniform float uScale;
      uniform float uAmp;
      varying float vShade;
      varying float vFade;
      ${NOISE_GLSL}
      void main() {
        vec3 p = position;
        float h = fbm(p.xz * uScale);
        p.y = h * uAmp - 6.0;

        // slope-ish shading from height differential
        float h2 = fbm((p.xz + vec2(3.0, 3.0)) * uScale);
        vShade = clamp(0.35 + (h - h2) * 3.5 + h * 0.55, 0.0, 1.0);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.1 + h * 2.2) * uPixelRatio * (52.0 / -mv.z);
        vFade = smoothstep(-190.0, -30.0, mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vShade;
      varying float vFade;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        if (length(uv) > 0.5) discard;
        vec3 low = vec3(0.84, 0.83, 0.79);
        vec3 high = vec3(0.25, 0.24, 0.21);
        vec3 col = mix(low, high, vShade);
        gl_FragColor = vec4(col, 0.85 * vFade);
      }
    `,
  });
  scene.add(new THREE.Points(geo, mat));

  // fictional sites — [x, z] on the terrain; twelve, matching the "12
  // campuses" stat one band later
  const siteDefs: Array<[string, string, number, number, string?]> = [
    ['Iron Creek', '280 MW', -96, -38],
    ['Cinder Basin', '205 MW', -52, 6],
    ['Halvorsen Flats', '330 MW', 8, -52, 'UNDER CONSTRUCTION'],
    ['North Fork', '63 MW', -18, 34],
    ['Redgate', '50 MW', 44, 18],
    ['Wolf Lake', '42 MW', 88, -18],
    ['Meridian', '67 MW', 118, 22],
    ['Kettle Rapids', '110 MW', 62, -66, 'UNDER DEVELOPMENT'],
    ['Two Pines', '96 MW', 152, -44],
    ['Saltern', '75 MW', -140, 16],
    ['Braxton Ridge', '150 MW', -74, -62],
    ['Copper Sound', '88 MW', 20, 46],
  ];

  const spikeMat = new THREE.LineBasicMaterial({
    color: '#0e0f0c',
    transparent: true,
    opacity: 0.65,
  });
  const padLineMat = new THREE.LineBasicMaterial({
    color: '#0e0f0c',
    transparent: true,
    opacity: 0.4,
  });

  /* A site is a tiny built campus, not a pin: a main hall + two auxiliary
     blocks + a tank, scaled by capacity, on a drawn ground pad. Deterministic
     per-site layout via hash21 so reloads don't reshuffle the map. */
  const siteWorks = (x: number, z: number, frac: number, seed: number): THREE.Group => {
    const g = new THREE.Group();
    const base = terrainHeight(x, z);
    const s = 0.9 + frac * 1.6;
    const yaw = hash21(seed * 3.7, 1.9) * Math.PI * 2;

    // keep clear of the site spike at (x, z)
    const hall = outlined(new THREE.BoxGeometry(3.6 * s, 1.1 * s, 2.1 * s), whiteMat(), 0.4);
    hall.position.set(x + 2.3 * s, base + 0.55 * s - 0.2, z + 0.9 * s);
    hall.rotation.y = yaw;
    g.add(hall);

    const aux1 = outlined(new THREE.BoxGeometry(1.5 * s, 0.8 * s, 1.3 * s), whiteMat(), 0.4);
    aux1.position.set(x - 1.9 * s, base + 0.4 * s - 0.2, z + 1.3 * s);
    aux1.rotation.y = yaw + 0.35;
    g.add(aux1);

    const aux2 = outlined(new THREE.BoxGeometry(1.2 * s, 0.55 * s, 1.0 * s), whiteMat(), 0.4);
    aux2.position.set(x + 0.4 * s, base + 0.28 * s - 0.2, z - 1.9 * s);
    aux2.rotation.y = yaw - 0.2;
    g.add(aux2);

    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 0.9 * s, 12),
      whiteMat(),
    );
    tank.position.set(x - 1.2 * s, base + 0.45 * s - 0.2, z - 1.2 * s);
    g.add(tank);

    // drawn pad boundary, draped just above the points
    const half = 3.4 * s;
    const corners = [
      [x - half, z - half], [x + half, z - half],
      [x + half, z + half], [x - half, z + half], [x - half, z - half],
    ].map(([px, pz]) => new THREE.Vector3(px, terrainHeight(px, pz) + 0.5, pz));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(corners), padLineMat));

    return g;
  };

  const maxMw = Math.max(...siteDefs.map(([, mw]) => parseInt(mw, 10)));
  const sites: SiteMarker[] = siteDefs.map(([name, mw, x, z, status], i) => {
    // spike height encodes capacity — the map gains a data axis
    const frac = parseInt(mw, 10) / maxMw;
    const yTop = terrainHeight(x, z) + 4 + frac * 13;
    scene.add(siteWorks(x, z, frac, i + 1));
    const spikeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, -8, z),
      new THREE.Vector3(x, yTop, z),
    ]);
    scene.add(new THREE.Line(spikeGeo, spikeMat));

    const capGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const cap = new THREE.Mesh(
      capGeo,
      new THREE.MeshBasicMaterial({ color: status ? '#ff4e00' : '#0e0f0c' }),
    );
    cap.position.set(x, yTop, z);
    scene.add(cap);

    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      position: new THREE.Vector3(x, yTop, z),
      name,
      mw,
      status,
    };
  });

  // dashed boundary loops draped on the terrain: the three grid
  // interconnections the caption promises — the map explains itself
  const regionDefs: Array<[string, number, number, number, number]> = [
    ['WESTERN INTERCONNECT', -95, -18, 62, 58],
    ['CENTRAL INTERCONNECT', 12, -4, 48, 60],
    ['EASTERN INTERCONNECT', 108, -22, 55, 54],
  ];
  const loopMat = new THREE.LineDashedMaterial({
    color: '#0e0f0c',
    transparent: true,
    opacity: 0.3,
    dashSize: 2.2,
    gapSize: 1.8,
  });
  const regions: RegionMarker[] = regionDefs.map(([name, cx, cz, rx, rz]) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const x = cx + Math.cos(a) * rx;
      const z = cz + Math.sin(a) * rz;
      pts.push(new THREE.Vector3(x, terrainHeight(x, z) + 1.2, z));
    }
    const loopGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const loop = new THREE.Line(loopGeo, loopMat);
    loop.computeLineDistances();
    scene.add(loop);

    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      position: new THREE.Vector3(cx, terrainHeight(cx, cz - rz) + 3, cz - rz),
      name,
    };
  });

  const progress = { value: 0 };

  const applyCamera = () => {
    const t = progress.value;
    // glide: high overview → low sweep across the range
    const z = THREE.MathUtils.lerp(120, -90, t);
    const y = THREE.MathUtils.lerp(58, 16, THREE.MathUtils.smoothstep(t, 0, 1));
    const x = Math.sin(t * Math.PI * 0.9) * 30;
    camera.position.set(x, y, z);
    camera.lookAt(x * 0.4, 2, z - 70);
  };

  applyCamera();

  return {
    scene,
    camera,
    progress,
    sites,
    regions,
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    tick: () => {
      applyCamera();
    },
  };
}
