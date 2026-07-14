import * as THREE from 'three';

/**
 * HERO — dark energy field. A wave point-grid rendered with a custom
 * shader: ink background, bone-grey dots, sparse volt-orange charge dots
 * drifting through. Subtle pointer parallax on the camera.
 */

export interface FieldScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  resize: (w: number, h: number) => void;
  tick: (dt: number, elapsed: number) => void;
  setPointer: (x: number, y: number) => void;
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

export function createField(): FieldScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0e0f0c');
  scene.fog = new THREE.Fog('#0e0f0c', 40, 130);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  camera.position.set(0, 9, 46);
  camera.lookAt(0, 2, 0);

  const COLS = 220;
  const ROWS = 120;
  const positions = new Float32Array(COLS * ROWS * 3);
  const seeds = new Float32Array(COLS * ROWS);
  let i3 = 0;
  let i1 = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      positions[i3++] = (c / (COLS - 1) - 0.5) * 190;
      positions[i3++] = 0;
      positions[i3++] = (r / (ROWS - 1) - 0.5) * 110;
      seeds[i1++] = Math.random();
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vCharge;
      varying float vFade;
      ${NOISE_GLSL}
      void main() {
        vec3 p = position;
        float n = fbm(p.xz * 0.045 + uTime * 0.055);
        float swell = fbm(p.xz * 0.012 - uTime * 0.02);
        p.y = n * 7.5 + swell * 5.0 - 4.0;

        // sparse charge dots pulse along the field
        float charge = step(0.9965, aSeed) *
          (0.5 + 0.5 * sin(uTime * 2.2 + aSeed * 700.0));
        vCharge = charge;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = mix(1.4, 3.4, n) + charge * 5.0;
        gl_PointSize = size * uPixelRatio * (44.0 / -mv.z);
        vFade = smoothstep(-95.0, -20.0, mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vCharge;
      varying float vFade;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float disc = 1.0 - smoothstep(0.38, 0.5, d);
        if (disc < 0.01) discard;
        vec3 bone = vec3(0.62, 0.61, 0.57);
        vec3 volt = vec3(1.0, 0.31, 0.0);
        vec3 col = mix(bone, volt, vCharge);
        float alpha = disc * mix(0.22, 1.0, vCharge) * vFade;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const pointer = { x: 0, y: 0 };

  return {
    scene,
    camera,
    resize: (w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    tick: (_dt, elapsed) => {
      mat.uniforms.uTime.value = elapsed;
      camera.position.x += (pointer.x * 4 - camera.position.x) * 0.03;
      camera.position.y += (9 + pointer.y * 2 - camera.position.y) * 0.03;
      camera.lookAt(0, 2, 0);
    },
    setPointer: (x, y) => {
      pointer.x = x;
      pointer.y = y;
    },
  };
}
