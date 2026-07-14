import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * Single grade pass over whichever scene is active: edge chromatic
 * aberration, fine animated grain, and a soft vignette. The technical
 * "printed document / broadcast" texture that unifies all three scenes.
 */

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.011 },
    uGrain: { value: 0.032 },
    uVignette: { value: 0.16 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uGrain;
    uniform float uVignette;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float r2 = dot(centered, centered);

      // chromatic aberration grows toward frame edges (max ~6px at corners)
      vec2 shift = centered * r2 * uAberration;
      float cr = texture2D(tDiffuse, vUv + shift).r;
      vec2 gb = texture2D(tDiffuse, vUv).gb;
      float cb = texture2D(tDiffuse, vUv - shift).b;
      vec3 col = vec3(cr, gb.x, cb);

      // animated fine grain
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 61.7) - 0.5;
      col += g * uGrain;

      // vignette
      col *= 1.0 - r2 * uVignette * 2.2;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export interface Post {
  composer: EffectComposer;
  renderPass: RenderPass;
  gradePass: ShaderPass;
  setScene: (scene: THREE.Scene, camera: THREE.Camera) => void;
  resize: (w: number, h: number, dpr: number) => void;
  tick: (elapsed: number) => void;
}

export function createPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): Post {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const gradePass = new ShaderPass(GradeShader);
  composer.addPass(renderPass);
  composer.addPass(gradePass);

  return {
    composer,
    renderPass,
    gradePass,
    setScene: (s, c) => {
      renderPass.scene = s;
      renderPass.camera = c;
    },
    resize: (w, h, dpr) => {
      composer.setSize(w, h);
      composer.setPixelRatio(dpr);
    },
    tick: (elapsed) => {
      gradePass.uniforms.uTime.value = elapsed;
    },
  };
}
