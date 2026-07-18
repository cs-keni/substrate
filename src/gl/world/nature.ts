import * as THREE from 'three';
import { DENSITY } from '../quality';
import { INK, boneMat, whiteMat, outlined } from '../palette';
import { vnoise, hash21 } from './noise';
import { road } from './groundworks';

/**
 * The living land: ponds in the fbm lowlands, dry creeks descending into
 * them, grass meadows, drafting-symbol tree stands, birds on thermals, and
 * two farmsteads along the corridor. Everything deterministic (hash/vnoise
 * driven) so reloads never reshuffle the world, and everything samples the
 * ground height function so it sits ON the relief, never in it.
 */

type HeightFn = (x: number, z: number) => number;
type Circle = [number, number, number];

/* Farm yards are built flats and keep-outs — world.ts folds these into
   FLAT_ZONES / FLAT_ROUTES / scrub keep-outs so the ground, scrub, and
   nature scatter all agree on where the farms are. */
export const FARM_YARDS: Circle[] = [
  [-58, 61, 10],
  [58, 13, 9],
];
export const FARM_DRIVEWAYS: THREE.Vector2[][] = [
  [new THREE.Vector2(-58, 60), new THREE.Vector2(-58, 35)],
  [new THREE.Vector2(58, 12), new THREE.Vector2(58, -7)],
];

interface Pond {
  x: number;
  z: number;
  r: number;
  level: number;
}

const inCircles = (x: number, z: number, circles: Circle[]): boolean =>
  circles.some(([cx, cz, cr]) => (x - cx) ** 2 + (z - cz) ** 2 < cr * cr);

/** Open land test: the flat mask returns exactly 0 on roads/zones/yards. */
const isOpen = (h: number): boolean => Math.abs(h) > 0.001;

function findPonds(heightAt: HeightFn): Pond[] {
  const candidates: Array<{ x: number; z: number; h: number }> = [];
  for (let x = -150; x <= 140; x += 6) {
    for (let z = -60; z <= 75; z += 6) {
      const h = heightAt(x, z);
      if (h > -3.5) continue;
      if (
        h <= heightAt(x - 6, z) && h <= heightAt(x + 6, z) &&
        h <= heightAt(x, z - 6) && h <= heightAt(x, z + 6)
      ) {
        candidates.push({ x, z, h });
      }
    }
  }
  candidates.sort((a, b) => a.h - b.h);
  const ponds: Pond[] = [];
  for (const c of candidates) {
    if (ponds.length >= 6) break;
    if (ponds.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < 45)) continue;
    ponds.push({
      x: c.x,
      z: c.z,
      r: 4.6 + hash21(c.x * 1.3, c.z * 2.1) * 2.6,
      level: c.h + 1.0,
    });
  }
  return ponds;
}

function buildPonds(ponds: Pond[]): THREE.Group {
  const g = new THREE.Group();
  const marginMat = new THREE.MeshLambertMaterial({ color: '#c6cabb' });
  const waterMat = new THREE.MeshLambertMaterial({ color: '#a8ada0' });
  const shorePts: THREE.Vector3[] = [];
  for (const p of ponds) {
    // flat water plane cutting the terrain bowl — the surrounding relief
    // clips the disc into an organic shoreline for free
    const margin = new THREE.Mesh(new THREE.CircleGeometry(p.r, 28), marginMat);
    margin.rotation.x = -Math.PI / 2;
    margin.position.set(p.x, p.level, p.z);
    margin.receiveShadow = true;
    margin.userData.noShadow = true;
    g.add(margin);
    const water = new THREE.Mesh(new THREE.CircleGeometry(p.r * 0.78, 24), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(p.x, p.level + 0.04, p.z);
    water.receiveShadow = true;
    water.userData.noShadow = true;
    g.add(water);
    // drafted shoreline ring — occluded wherever the bowl wall rises past it
    for (let i = 0; i < 28; i++) {
      const a0 = (i / 28) * Math.PI * 2;
      const a1 = ((i + 1) / 28) * Math.PI * 2;
      shorePts.push(
        new THREE.Vector3(p.x + Math.cos(a0) * p.r, p.level + 0.06, p.z + Math.sin(a0) * p.r),
        new THREE.Vector3(p.x + Math.cos(a1) * p.r, p.level + 0.06, p.z + Math.sin(a1) * p.r),
      );
    }
  }
  if (shorePts.length) {
    g.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(shorePts),
      new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.2 }),
    ));
  }
  return g;
}

/** Dry creeks: gradient-descent polylines wandering down into the ponds. */
function buildCreeks(ponds: Pond[], heightAt: HeightFn): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.22 });
  ponds.slice(0, 3).forEach((p, pi) => {
    for (let c = 0; c < 2; c++) {
      const seed = pi * 7.3 + c * 3.1;
      const a = hash21(seed, 4.9) * Math.PI * 2;
      let x = p.x + Math.cos(a) * (p.r + 26);
      let z = p.z + Math.sin(a) * (p.r + 26);
      if (!isOpen(heightAt(x, z))) continue;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s < 70; s++) {
        const h = heightAt(x, z);
        if (!isOpen(h) || h <= p.level + 0.2) break;
        pts.push(new THREE.Vector3(x, h + 0.12, z));
        // steepest descent + a little meander so it reads as water-carved
        const e = 1.5;
        const gx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
        const gz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
        const len = Math.hypot(gx, gz) || 1;
        const mx = -gz / len;
        const mz = gx / len;
        const m = Math.sin(s * 0.7 + seed * 7) * 0.9;
        x += (-gx / len) * 2.2 + mx * m;
        z += (-gz / len) * 2.2 + mz * m;
      }
      if (pts.length >= 8) {
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
      }
    }
  });
  return g;
}

/** Grass meadows: denser, finer tufts than scrub, clustered by their own
 *  noise field so they read as bottomland grass, not more pebbles. */
function buildMeadows(
  heightAt: HeightFn,
  keepOut: Circle[],
  ponds: Pond[],
): THREE.InstancedMesh {
  const geo = new THREE.ConeGeometry(0.15, 0.36, 4);
  const mat = new THREE.MeshLambertMaterial({ color: '#c5c9b6' });
  const mats: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < Math.round(2600 * DENSITY); i++) {
    const px = -160 + hash21(i * 1.9, 6.7) * 310;
    const pz = -70 + hash21(i * 3.7, 2.3) * 150;
    if (vnoise(px * 0.031 + 41.7, pz * 0.031 + 13.3) < 0.56) continue;
    const h = heightAt(px, pz);
    if (!isOpen(h)) continue;
    if (inCircles(px, pz, keepOut)) continue;
    if (ponds.some((p) => Math.hypot(px - p.x, pz - p.z) < p.r + 1.5)) continue;
    const s = 0.5 + hash21(i * 5.3, 9.1) * 0.7;
    q.setFromAxisAngle(up, hash21(i, 3.3) * Math.PI * 2);
    m.compose(new THREE.Vector3(px, h + 0.16 * s, pz), q, new THREE.Vector3(s, s, s));
    mats.push(m.clone());
  }
  const inst = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((mm, i) => inst.setMatrixAt(i, mm));
  return inst;
}

/** Tree stands drawn as site-plan symbols: thin trunk, flat disc canopy,
 *  ink outline ring — vegetation in the drawing's own language. */
function buildTrees(
  heightAt: HeightFn,
  keepOut: Circle[],
  ponds: Pond[],
): THREE.Group {
  const g = new THREE.Group();
  const centers: Array<{ x: number; z: number }> = [];
  const scored: Array<{ x: number; z: number; s: number }> = [];
  for (let x = -150; x <= 140; x += 8) {
    for (let z = -62; z <= 76; z += 8) {
      const s = vnoise(x * 0.02 + 91.3, z * 0.02 + 7.7);
      if (s < 0.6) continue;
      const h = heightAt(x, z);
      if (!isOpen(h) || h < -3) continue;
      if (inCircles(x, z, keepOut)) continue;
      scored.push({ x, z, s });
    }
  }
  scored.sort((a, b) => b.s - a.s);
  for (const c of scored) {
    if (centers.length >= 9) break;
    if (centers.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < 32)) continue;
    centers.push(c);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.95, 5);
  const canopyGeo = new THREE.CylinderGeometry(1, 1, 0.16, 10);
  const trunks: THREE.Matrix4[] = [];
  const canopies: THREE.Matrix4[] = [];
  const ringPts: THREE.Vector3[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();

  centers.forEach((c, ci) => {
    const n = 4 + Math.floor(hash21(ci * 3.9, 5.1) * 4);
    for (let t = 0; t < n; t++) {
      const a = hash21(ci * 9.1, t * 2.7) * Math.PI * 2;
      const d = hash21(t * 6.3, ci * 1.7) * 6.5;
      const tx = c.x + Math.cos(a) * d;
      const tz = c.z + Math.sin(a) * d;
      const h = heightAt(tx, tz);
      if (!isOpen(h) || inCircles(tx, tz, keepOut)) continue;
      if (ponds.some((p) => Math.hypot(tx - p.x, tz - p.z) < p.r + 1)) continue;
      const rc = 0.8 + hash21(tx * 1.1, tz * 1.3) * 0.8;
      const yc = h + 1.05 + hash21(tz, tx) * 0.35;
      m.compose(new THREE.Vector3(tx, h + 0.48, tz), q.identity(), new THREE.Vector3(1, 1, 1));
      trunks.push(m.clone());
      m.compose(new THREE.Vector3(tx, yc, tz), q, new THREE.Vector3(rc, 1, rc));
      canopies.push(m.clone());
      for (let i = 0; i < 20; i++) {
        const a0 = (i / 20) * Math.PI * 2;
        const a1 = ((i + 1) / 20) * Math.PI * 2;
        ringPts.push(
          new THREE.Vector3(tx + Math.cos(a0) * rc, yc + 0.12, tz + Math.sin(a0) * rc),
          new THREE.Vector3(tx + Math.cos(a1) * rc, yc + 0.12, tz + Math.sin(a1) * rc),
        );
      }
    }
  });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, boneMat(), trunks.length);
  trunks.forEach((mm, i) => trunkInst.setMatrixAt(i, mm));
  const canopyInst = new THREE.InstancedMesh(
    canopyGeo,
    new THREE.MeshLambertMaterial({ color: '#ced2c2' }),
    canopies.length,
  );
  canopies.forEach((mm, i) => canopyInst.setMatrixAt(i, mm));
  g.add(trunkInst, canopyInst);
  if (ringPts.length) {
    g.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.28 }),
    ));
  }
  return g;
}

/* ---- birds on thermals ---- */

interface Bird {
  group: THREE.Group;
  cx: number;
  cy: number;
  cz: number;
  r: number;
  speed: number;
  phase: number;
}

function birdMesh(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#3a3b36' });
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.1), mat);
    wing.position.x = side * 0.24;
    wing.rotation.y = side * 0.6;
    g.add(wing);
  }
  return g;
}

function buildBirds(): { group: THREE.Group; birds: Bird[] } {
  const group = new THREE.Group();
  const defs: Array<[number, number, number, number, number, number]> = [
    // cx, cy, cz, radius, speed, phase — two ride the wind-farm thermal
    [-124, 14, 6, 11, 0.24, 0],
    [-124, 15.5, 6, 9, 0.24, 2.4],
    [-30, 12.5, 46, 12, -0.2, 1.1],
    [74, 11, 2, 10, 0.22, 4.2],
  ];
  const birds: Bird[] = defs.map(([cx, cy, cz, r, speed, phase]) => {
    const g = birdMesh();
    group.add(g);
    return { group: g, cx, cy, cz, r, speed, phase };
  });
  return { group, birds };
}

/* ---- farmsteads ---- */

function gableRoof(w: number, d: number, h: number): THREE.Mesh {
  const tri = new THREE.Shape([
    new THREE.Vector2(-w / 2, 0),
    new THREE.Vector2(w / 2, 0),
    new THREE.Vector2(0, h),
  ]);
  const geo = new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return new THREE.Mesh(geo, boneMat());
}

function parkedTruck(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.5), whiteMat());
  body.position.y = 0.35;
  g.add(body);
  return g;
}

function farmstead(withTower: boolean, seed: number): THREE.Group {
  const g = new THREE.Group();

  const yard = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.08, 9),
    new THREE.MeshLambertMaterial({ color: '#eae8df' }),
  );
  yard.position.y = 0.04;
  yard.userData.noShadow = true;
  yard.receiveShadow = true;
  g.add(yard);

  const barn = outlined(new THREE.BoxGeometry(3.6, 1.5, 2.2), whiteMat(), 0.25);
  barn.position.set(-1.6, 0.75, -1.4);
  g.add(barn);
  const roof = gableRoof(3.8, 2.4, 1.1);
  roof.position.set(-1.6, 1.5, -1.4);
  g.add(roof);

  const shed = outlined(new THREE.BoxGeometry(1.4, 0.7, 1.0), whiteMat(), 0.25);
  shed.position.set(1.8, 0.35, -2.2);
  g.add(shed);

  if (withTower) {
    const tower = new THREE.Group();
    for (const [lx, lz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.6, 5), boneMat());
      leg.position.set(lx, 1.3, lz);
      tower.add(leg);
    }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 10), whiteMat());
    tank.position.y = 3.0;
    tower.add(tank);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.74, 0.4, 10), boneMat());
    cap.position.y = 3.65;
    tower.add(cap);
    tower.position.set(2.6, 0, 1.6);
    g.add(tower);
  } else {
    const silo = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.0, 10), whiteMat());
    body.position.y = 1.0;
    silo.add(body);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.57, 0.5, 10), boneMat());
    cap.position.y = 2.25;
    silo.add(cap);
    silo.position.set(0.6, 0, -1.9);
    g.add(silo);
  }

  const truck = parkedTruck();
  truck.position.set(1.2 + hash21(seed, 1.7), 0, 1.8);
  truck.rotation.y = hash21(seed, 8.3) * Math.PI;
  g.add(truck);

  return g;
}

export function buildFarmsteads(): THREE.Group {
  const g = new THREE.Group();
  FARM_YARDS.forEach(([x, , z], i) => {
    const f = farmstead(i === 1, i * 4.7 + 1.3);
    f.position.set(x, 0, z);
    f.rotation.y = hash21(i * 2.9, 6.1) * 0.5 - 0.25;
    g.add(f);
  });
  for (const route of FARM_DRIVEWAYS) {
    g.add(road(route, 0.8));
  }
  return g;
}

/* ---- assembly ---- */

export interface NatureBuild {
  group: THREE.Group;
  tick: (elapsed: number) => void;
}

export function buildNature(heightAt: HeightFn, keepOut: Circle[]): NatureBuild {
  const group = new THREE.Group();
  const ponds = findPonds(heightAt);
  group.add(buildPonds(ponds));
  group.add(buildCreeks(ponds, heightAt));
  group.add(buildMeadows(heightAt, keepOut, ponds));
  group.add(buildTrees(heightAt, keepOut, ponds));
  group.add(buildFarmsteads());

  const { group: birdGroup, birds } = buildBirds();
  group.add(birdGroup);

  const tick = (elapsed: number) => {
    for (const b of birds) {
      const a = b.phase + elapsed * b.speed;
      const dir = Math.sign(b.speed) || 1;
      b.group.position.set(
        b.cx + Math.cos(a) * b.r,
        b.cy + Math.sin(elapsed * 1.3 + b.phase) * 0.4,
        b.cz + Math.sin(a) * b.r,
      );
      // face along the orbit tangent
      b.group.rotation.y = Math.atan2(-Math.cos(a) * dir, -Math.sin(a) * dir);
    }
  };

  return { group, tick };
}
