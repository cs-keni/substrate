import * as THREE from 'three';

/**
 * FOOTPRINT — light point-cloud terrain. A displaced dot grid in paper
 * tones, with fictional site spikes whose labels are projected to HTML.
 * Camera glides forward across the range as the section scrubs.
 */

export interface SiteMarker {
  id: string;
  position: THREE.Vector3; // spike top, world space
  name: string;
  mw: string;
  status?: string;
}

export interface TerrainScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  progress: { value: number };
  sites: SiteMarker[];
  resize: (w: number, h: number) => void;
  tick: (dt: number, elapsed: number) => void;
}

/* CPU value-noise mirror of the shader fbm — close enough for spike bases
   since spikes pierce the surface with margin. */
function hash21(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash21(ix, iy);
  const b = hash21(ix + 1, iy);
  const c = hash21(ix, iy + 1);
  const d = hash21(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x: number, y: number): number {
  let v = 0;
  let amp = 0.5;
  let fx = x;
  let fy = y;
  for (let i = 0; i < 4; i++) {
    v += amp * vnoise(fx, fy);
    fx *= 2.03;
    fy *= 2.03;
    amp *= 0.5;
  }
  return v;
}

const NOISE_GLSL = /* glsl */ `
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`;

const TERRAIN_SCALE = 0.021;
const TERRAIN_AMP = 16.0;

function terrainHeight(x: number, z: number): number {
  return fbm(x * TERRAIN_SCALE, z * TERRAIN_SCALE) * TERRAIN_AMP - 6;
}

export function createTerrain(): TerrainScene {
  const scene = new THREE.Scene();
  const paper = new THREE.Color('#f4f3ef');
  scene.background = paper;
  scene.fog = new THREE.Fog(paper, 60, 210);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);

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
        vec3 low = vec3(0.83, 0.82, 0.78);
        vec3 high = vec3(0.32, 0.31, 0.28);
        vec3 col = mix(low, high, vShade);
        gl_FragColor = vec4(col, 0.85 * vFade);
      }
    `,
  });
  scene.add(new THREE.Points(geo, mat));

  // fictional sites — [x, z] on the terrain
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
  ];

  const spikeMat = new THREE.LineBasicMaterial({
    color: '#0e0f0c',
    transparent: true,
    opacity: 0.65,
  });
  const sites: SiteMarker[] = siteDefs.map(([name, mw, x, z, status]) => {
    const yTop = terrainHeight(x, z) + 9;
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
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    tick: () => {
      applyCamera();
    },
  };
}
