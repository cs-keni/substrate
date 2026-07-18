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

  // fictional sites — [name, mw, x, z, kind, status?]; twelve, matching the
  // "12 campuses" stat one band later. `kind` picks the building archetype
  // so every site reads as its own kind of infrastructure.
  type SiteKind = 'campus' | 'wind' | 'solar' | 'thermal' | 'construction';
  const siteDefs: Array<[string, string, number, number, SiteKind, string?]> = [
    ['Iron Creek', '280 MW', -96, -38, 'campus'],
    ['Cinder Basin', '205 MW', -52, 6, 'thermal'],
    ['Halvorsen Flats', '330 MW', 8, -52, 'construction', 'UNDER CONSTRUCTION'],
    ['North Fork', '63 MW', -18, 34, 'wind'],
    ['Redgate', '50 MW', 44, 18, 'solar'],
    ['Wolf Lake', '42 MW', 88, -18, 'wind'],
    ['Meridian', '67 MW', 118, 22, 'solar'],
    ['Kettle Rapids', '110 MW', 62, -66, 'construction', 'UNDER DEVELOPMENT'],
    ['Two Pines', '96 MW', 152, -44, 'campus'],
    ['Saltern', '75 MW', -140, 16, 'thermal'],
    ['Braxton Ridge', '150 MW', -74, -62, 'wind'],
    ['Copper Sound', '88 MW', 20, 46, 'campus'],
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

  /* A site is a tiny built place, not a pin — and each KIND of site builds
     differently: compute campuses are parallel halls, wind sites are mini
     turbines, solar sites are panel rows, thermal sites carry stacks, and
     in-build sites are cranes over foundations. Deterministic hash21 layout
     so reloads don't reshuffle the map. All local coords inside a yawed
     group; the drawn pad boundary is draped on the terrain in world space. */
  const tankMesh = (s: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 0.9 * s, 12), whiteMat());

  const archetypes: Record<string, (g: THREE.Group, s: number, seed: number) => void> = {
    campus: (g, s, seed) => {
      for (let i = 0; i < 3; i++) {
        const hall = outlined(new THREE.BoxGeometry(3.8 * s, 0.9 * s, 1.4 * s), whiteMat(), 0.4);
        hall.position.set(0.6 * s, 0.45 * s, (i - 1) * 2.1 * s);
        g.add(hall);
      }
      const sub = outlined(new THREE.BoxGeometry(1.1 * s, 0.6 * s, 1.0 * s), whiteMat(), 0.4);
      sub.position.set(-2.4 * s, 0.3 * s, 1.6 * s);
      g.add(sub);
      const tank = tankMesh(s);
      tank.position.set(-2.2 * s, 0.45 * s, -1.5 * s);
      g.add(tank);
      // aux row: cooling skids along the halls' west face
      for (let i = 0; i < 3; i++) {
        const skid = new THREE.Mesh(
          new THREE.BoxGeometry(0.5 * s, 0.35 * s, 0.5 * s),
          new THREE.MeshLambertMaterial({ color: '#cfcdc4' }),
        );
        skid.position.set(-1.3 * s, 0.18 * s, (i - 1) * 1.1 * s + hash21(seed, i) * 0.3 * s);
        g.add(skid);
      }
    },
    wind: (g, s, seed) => {
      const spots: Array<[number, number]> =
        [[-1.9, -1.4], [0.3, 1.7], [2.0, -0.7], [-0.6, -2.7], [2.8, 1.6]];
      spots.forEach(([tx, tz], i) => {
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05 * s, 0.09 * s, 2.4 * s, 6),
          whiteMat(),
        );
        tower.position.set(tx * s, 1.2 * s, tz * s);
        g.add(tower);
        const star = new THREE.Group();
        for (let b = 0; b < 3; b++) {
          const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.05 * s, 1.0 * s, 0.09 * s),
            whiteMat(),
          );
          blade.geometry.translate(0, 0.5 * s, 0);
          blade.rotation.z = (b * Math.PI * 2) / 3 + hash21(seed, i) * 2;
          star.add(blade);
        }
        star.position.set(tx * s, 2.4 * s, tz * s);
        star.rotation.y = Math.PI / 2;
        g.add(star);
      });
      const hut = outlined(new THREE.BoxGeometry(1.3 * s, 0.5 * s, 0.9 * s), whiteMat(), 0.4);
      hut.position.set(0.2 * s, 0.25 * s, -1.9 * s);
      g.add(hut);
    },
    solar: (g, s) => {
      const rowGeo = new THREE.BoxGeometry(3.0 * s, 0.09 * s, 0.5 * s);
      rowGeo.rotateX(-0.32);
      const rowMat = new THREE.MeshLambertMaterial({ color: '#c9c7be' });
      for (let i = 0; i < 7; i++) {
        const row = new THREE.Mesh(rowGeo, rowMat);
        row.position.set(0.4 * s, 0.3 * s, (i - 3) * 1.05 * s);
        g.add(row);
      }
      for (let i = 0; i < 2; i++) {
        const inverter = outlined(new THREE.BoxGeometry(0.9 * s, 0.55 * s, 0.8 * s), whiteMat(), 0.4);
        inverter.position.set(-2.3 * s, 0.28 * s, (i - 0.5) * 2.4 * s);
        g.add(inverter);
      }
      const hut = outlined(new THREE.BoxGeometry(1.0 * s, 0.45 * s, 0.7 * s), whiteMat(), 0.4);
      hut.position.set(-2.5 * s, 0.22 * s, -3.2 * s);
      g.add(hut);
    },
    thermal: (g, s) => {
      // offset so the site spike at local (0,0) doesn't pierce the roof
      const block = outlined(new THREE.BoxGeometry(2.6 * s, 1.1 * s, 1.8 * s), whiteMat(), 0.4);
      block.position.set(1.5 * s, 0.55 * s, 1.1 * s);
      g.add(block);
      for (let i = 0; i < 2; i++) {
        const stack = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14 * s, 0.18 * s, 2.2 * s, 8),
          whiteMat(),
        );
        stack.position.set((-0.9 - i * 0.75) * s, 1.1 * s, -0.8 * s);
        g.add(stack);
      }
      const tank = tankMesh(s);
      tank.position.set(-1.8 * s, 0.45 * s, 1.3 * s);
      g.add(tank);
      const tank2 = tankMesh(s * 0.7);
      tank2.position.set(-2.6 * s, 0.32 * s, 0.4 * s);
      g.add(tank2);
      // pipe rack tying the stacks to the block
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(1.8 * s, 0.08 * s, 0.3 * s),
        new THREE.MeshLambertMaterial({ color: '#cfcdc4' }),
      );
      rack.position.set(0.1 * s, 0.75 * s, -0.1 * s);
      rack.rotation.y = 0.5;
      g.add(rack);
    },
    construction: (g, s, seed) => {
      // ghost frame: the future hall, translucent, edges only firm
      const frameMat = whiteMat();
      frameMat.transparent = true;
      frameMat.opacity = 0.42;
      const frame = outlined(new THREE.BoxGeometry(2.8 * s, 0.8 * s, 1.7 * s), frameMat, 0.5);
      frame.position.set(0.9 * s, 0.4 * s, 0.5 * s);
      g.add(frame);

      // tower crane with a volt tip — the universal "we're building" flag
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 2.8 * s, 6),
        whiteMat(),
      );
      mast.position.set(-1.2 * s, 1.4 * s, -0.6 * s);
      g.add(mast);
      const jib = new THREE.Mesh(
        new THREE.BoxGeometry(3.2 * s, 0.09 * s, 0.09 * s),
        whiteMat(),
      );
      jib.position.set(-1.2 * s + 0.9 * s, 2.75 * s, -0.6 * s);
      jib.rotation.y = hash21(seed * 7.7, 2.3) * Math.PI * 2;
      g.add(jib);
      const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.16 * s, 0.16 * s, 0.16 * s),
        new THREE.MeshBasicMaterial({ color: '#ff4e00' }),
      );
      tip.position.set(-1.2 * s, 2.9 * s, -0.6 * s);
      g.add(tip);

      // site offices: trailer pair by the laydown
      for (let i = 0; i < 2; i++) {
        const trailer = outlined(
          new THREE.BoxGeometry(1.1 * s, 0.4 * s, 0.55 * s),
          whiteMat(),
          0.35,
        );
        trailer.position.set((2.1 + i * 0.2) * s, 0.2 * s, (-1.2 + i * 0.75) * s);
        g.add(trailer);
      }

      // laydown: material piles
      for (let i = 0; i < 5; i++) {
        const pile = new THREE.Mesh(
          new THREE.BoxGeometry(0.7 * s, 0.22 * s, 0.5 * s),
          new THREE.MeshLambertMaterial({ color: '#cfcdc4' }),
        );
        pile.position.set(
          (-2.2 + hash21(seed, i * 3.1) * 1.2) * s,
          0.11 * s,
          (1.4 + hash21(i * 1.7, seed) * 0.9) * s,
        );
        pile.rotation.y = hash21(seed * 2.9, i) * 0.8;
        g.add(pile);
      }
    },
  };

  const siteWorks = (
    x: number,
    z: number,
    frac: number,
    seed: number,
    kind: SiteKind,
  ): THREE.Group => {
    const g = new THREE.Group();
    const base = terrainHeight(x, z);
    const s = 0.9 + frac * 1.6;

    const cluster = new THREE.Group();
    archetypes[kind](cluster, s, seed);

    // parking / laydown apron with a couple of parked vehicles — the small
    // human-scale evidence that someone runs this place
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(1.9 * s, 0.06 * s, 1.3 * s),
      new THREE.MeshLambertMaterial({ color: '#e6e4db' }),
    );
    apron.position.set(2.6 * s, 0.03 * s, 2.2 * s);
    cluster.add(apron);
    const nCars = 2 + Math.floor(hash21(seed * 1.7, 8.1) * 2);
    for (let i = 0; i < nCars; i++) {
      const car = new THREE.Mesh(
        new THREE.BoxGeometry(0.42 * s, 0.16 * s, 0.2 * s),
        new THREE.MeshLambertMaterial({ color: '#cfcdc4' }),
      );
      car.position.set(
        (2.2 + hash21(seed, i * 4.3) * 0.9) * s,
        0.11 * s,
        (1.8 + i * 0.35) * s,
      );
      car.rotation.y = hash21(i * 2.9, seed) * 0.4;
      cluster.add(car);
    }

    cluster.position.set(x, base - 0.2, z);
    cluster.rotation.y = hash21(seed * 3.7, 1.9) * Math.PI * 2;
    g.add(cluster);

    // drawn pad boundary, draped just above the points
    const half = 3.4 * s;
    const corners = [
      [x - half, z - half], [x + half, z - half],
      [x + half, z + half], [x - half, z + half], [x - half, z - half],
    ].map(([px, pz]) => new THREE.Vector3(px, terrainHeight(px, pz) + 0.5, pz));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(corners), padLineMat));

    // drawn access road: double line leaving the pad toward the site's
    // network link, draped on the terrain
    const roadA = hash21(seed * 5.1, 2.7) * Math.PI * 2;
    const dirX = Math.cos(roadA);
    const dirZ = Math.sin(roadA);
    const perpX = -dirZ * 0.45 * s;
    const perpZ = dirX * 0.45 * s;
    for (const side of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let d = half * 0.9; d <= half * 0.9 + 9 * s; d += 2.2) {
        const bend = Math.sin(d * 0.14 + seed) * 1.1;
        const px = x + dirX * d - dirZ * bend + perpX * side;
        const pz = z + dirZ * d + dirX * bend + perpZ * side;
        pts.push(new THREE.Vector3(px, terrainHeight(px, pz) + 0.42, pz));
      }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), padLineMat));
    }

    return g;
  };

  const maxMw = Math.max(...siteDefs.map(([, mw]) => parseInt(mw, 10)));
  const sites: SiteMarker[] = siteDefs.map(([name, mw, x, z, kind, status], i) => {
    // spike height encodes capacity — the map gains a data axis
    const frac = parseInt(mw, 10) / maxMw;
    const yTop = terrainHeight(x, z) + 4 + frac * 13;
    scene.add(siteWorks(x, z, frac, i + 1, kind));
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

  /* Inter-site road network + hamlets: thin draped lines linking neighbour
     sites, with a few tiny settlements along them — the interior reads as
     inhabited country the sites were built INTO, not markers on a void.
     Links are indices into siteDefs; midpoints get noise jitter so nothing
     runs surveyor-straight. */
  const links: Array<[number, number]> = [
    [0, 1], [1, 3], [0, 10], [9, 0], [3, 11], [11, 4],
    [4, 5], [5, 6], [5, 8], [2, 7], [2, 4], [7, 5],
  ];
  const netMat = new THREE.LineBasicMaterial({
    color: '#0e0f0c',
    transparent: true,
    opacity: 0.16,
  });
  // smooth 1D value noise off hash21 — enough wander for a country road
  const vnoiseLike = (t: number): number => {
    const i = Math.floor(t);
    const f = t - i;
    const u = f * f * (3 - 2 * f);
    return hash21(i, 17.3) + (hash21(i + 1, 17.3) - hash21(i, 17.3)) * u;
  };
  const hamletSpots: Array<[number, number, number]> = [];
  links.forEach(([ai, bi], li) => {
    const [, , ax, az] = siteDefs[ai];
    const [, , bx, bz] = siteDefs[bi];
    const len = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(8, Math.round(len / 5));
    const nx = -(bz - az) / len;
    const nz = (bx - ax) / len;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // ease the jitter to zero at both ends so roads meet their sites
      const sway = Math.sin(t * Math.PI) * (vnoiseLike(li * 13.7 + t * 4.1) - 0.5) * 14;
      const px = ax + (bx - ax) * t + nx * sway;
      const pz = az + (bz - az) * t + nz * sway;
      pts.push(new THREE.Vector3(px, terrainHeight(px, pz) + 0.35, pz));
      if (i === Math.floor(steps / 2) && li % 3 === 0) {
        hamletSpots.push([px + nx * 5, pz + nz * 5, li]);
      }
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), netMat));
  });

  // hamlets: two-to-four tiny buildings pulled just off the road
  const hamletMat = new THREE.MeshLambertMaterial({ color: '#eceae2' });
  for (const [hx, hz, seed] of hamletSpots) {
    const n = 2 + Math.floor(hash21(seed * 7.9, 3.3) * 3);
    for (let i = 0; i < n; i++) {
      const bx = hx + (hash21(seed, i * 5.7) - 0.5) * 5;
      const bz = hz + (hash21(i * 3.1, seed) - 0.5) * 5;
      const bs = 0.5 + hash21(bx, bz) * 0.5;
      const b = new THREE.Mesh(new THREE.BoxGeometry(bs, bs * 0.55, bs * 0.7), hamletMat);
      b.position.set(bx, terrainHeight(bx, bz) + bs * 0.22, bz);
      b.rotation.y = hash21(seed * 1.3, i) * Math.PI;
      scene.add(b);
    }
  }

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
