import * as THREE from 'three';
import { INK } from '../palette';
import { vnoise, hash21 } from './noise';

/**
 * Connective tissue for the isometric world: service roads, perimeter
 * fences, scrub clusters, and grounding shadows. These are what turn
 * "objects placed on a plane" into a place — every structure gets a way to
 * have been built and a reason to sit where it sits.
 */

const ROAD_COLOR = '#e6e4db';
const ROAD_EDGE_OPACITY = 0.22;
const SCRUB_COLOR = '#c9c7ba';

/** Averaged perpendicular at each waypoint of an XZ polyline. */
function normals(route: THREE.Vector2[]): THREE.Vector2[] {
  return route.map((_, i) => {
    const prev = route[Math.max(0, i - 1)];
    const next = route[Math.min(route.length - 1, i + 1)];
    const dir = new THREE.Vector2().subVectors(next, prev).normalize();
    return new THREE.Vector2(-dir.y, dir.x);
  });
}

/** Flat road ribbon along an XZ polyline with faint ink edge lines. */
export function road(route: THREE.Vector2[], width = 1.6, y = 0.03): THREE.Group {
  const g = new THREE.Group();
  const half = width / 2;
  const ns = normals(route);

  const positions = new Float32Array(route.length * 2 * 3);
  const indices: number[] = [];
  for (let i = 0; i < route.length; i++) {
    const p = route[i];
    const n = ns[i];
    positions.set([p.x - n.x * half, y, p.y - n.y * half], i * 6);
    positions.set([p.x + n.x * half, y, p.y + n.y * half], i * 6 + 3);
    if (i < route.length - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const ribbon = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: ROAD_COLOR }));
  // paper-thin: casting only produces shadow acne, never a visible shadow
  ribbon.userData.noShadow = true;
  ribbon.receiveShadow = true;
  g.add(ribbon);

  // ink edges — the "drafted" look
  const edgeMat = new THREE.LineBasicMaterial({
    color: INK,
    transparent: true,
    opacity: ROAD_EDGE_OPACITY,
  });
  for (const side of [-1, 1]) {
    const pts = route.map((p, i) =>
      new THREE.Vector3(p.x + ns[i].x * half * side, y + 0.005, p.y + ns[i].y * half * side),
    );
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edgeMat));
  }
  return g;
}

/** [edge 0-3 (S,E,N,W order from the SW corner), distance along edge, width] */
export type FenceGate = [number, number, number];

/**
 * Rectangular perimeter fence (posts + top line) around (cx, cz).
 * `gates` cut real openings — rail and posts stop at the gap and a pair of
 * taller gate posts frame it, so a road can cross the perimeter without
 * anything phasing through the fence line.
 */
export function fenceRect(
  cx: number,
  cz: number,
  w: number,
  d: number,
  gates: FenceGate[] = [],
): THREE.Group {
  const g = new THREE.Group();
  const hw = w / 2;
  const hd = d / 2;
  const corners = [
    new THREE.Vector2(cx - hw, cz - hd),
    new THREE.Vector2(cx + hw, cz - hd),
    new THREE.Vector2(cx + hw, cz + hd),
    new THREE.Vector2(cx - hw, cz + hd),
    new THREE.Vector2(cx - hw, cz - hd),
  ];

  const lineMat = new THREE.LineBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.28,
  });
  const railPts: THREE.Vector3[] = [];
  const rail = (a: THREE.Vector2, b: THREE.Vector2) => {
    railPts.push(new THREE.Vector3(a.x, 0.85, a.y), new THREE.Vector3(b.x, 0.85, b.y));
  };

  const postGeo = new THREE.BoxGeometry(0.07, 0.85, 0.07);
  const gatePostGeo = new THREE.BoxGeometry(0.14, 1.15, 0.14);
  const posts: THREE.Matrix4[] = [];
  const gatePosts: THREE.Matrix4[] = [];
  const lerp = (a: THREE.Vector2, b: THREE.Vector2, t: number) =>
    new THREE.Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

  for (let s = 0; s < 4; s++) {
    const a = corners[s];
    const b = corners[s + 1];
    const len = a.distanceTo(b);
    const gate = gates.find(([edge]) => edge === s);
    // gap window in edge-t, empty when no gate
    const g0 = gate ? Math.max(0, (gate[1] - gate[2] / 2) / len) : 1;
    const g1 = gate ? Math.min(1, (gate[1] + gate[2] / 2) / len) : 1;

    if (gate) {
      rail(a, lerp(a, b, g0));
      rail(lerp(a, b, g1), b);
      for (const t of [g0, g1]) {
        const p = lerp(a, b, t);
        gatePosts.push(new THREE.Matrix4().setPosition(p.x, 0.57, p.y));
      }
    } else {
      rail(a, b);
    }

    // posts every ~5 units, skipping the gate opening
    const count = Math.max(2, Math.round(len / 5));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      if (gate && t > g0 && t < g1) continue;
      const p = lerp(a, b, t);
      posts.push(new THREE.Matrix4().setPosition(p.x, 0.42, p.y));
    }
  }

  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(railPts), lineMat));

  const inst = new THREE.InstancedMesh(
    postGeo,
    new THREE.MeshLambertMaterial({ color: '#b5b3a8' }),
    posts.length,
  );
  posts.forEach((m, i) => inst.setMatrixAt(i, m));
  g.add(inst);

  if (gatePosts.length) {
    const gateInst = new THREE.InstancedMesh(
      gatePostGeo,
      new THREE.MeshLambertMaterial({ color: '#b5b3a8' }),
      gatePosts.length,
    );
    gatePosts.forEach((m, i) => gateInst.setMatrixAt(i, m));
    g.add(gateInst);
  }
  return g;
}

/**
 * Low scrub + rocks scattered in noise-driven clusters over a rect region.
 * Patchy on purpose — uniform scatter reads as random; clusters read as
 * land. `keepOut` circles (x, z, r) protect pads and roads.
 */
export function scrub(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  count: number,
  keepOut: Array<[number, number, number]> = [],
  heightAt: (x: number, z: number) => number = () => 0,
): THREE.Group {
  const g = new THREE.Group();
  const tuftGeo = new THREE.ConeGeometry(0.32, 0.5, 5);
  const rockGeo = new THREE.DodecahedronGeometry(0.26, 0);
  const tuftMat = new THREE.MeshLambertMaterial({ color: SCRUB_COLOR });
  const rockMat = new THREE.MeshLambertMaterial({ color: '#d5d3c9' });

  const tufts: THREE.Matrix4[] = [];
  const rocks: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  let attempts = 0;
  while (tufts.length + rocks.length < count && attempts < count * 14) {
    attempts++;
    const px = x0 + hash21(attempts * 1.7, 3.1) * (x1 - x0);
    const pz = z0 + hash21(attempts * 2.3, 7.9) * (z1 - z0);
    // cluster mask: only keep points where large-scale noise is high
    if (vnoise(px * 0.045, pz * 0.045) < 0.58) continue;
    if (keepOut.some(([kx, kz, kr]) => (px - kx) ** 2 + (pz - kz) ** 2 < kr * kr)) continue;

    const s = 0.6 + hash21(attempts * 5.1, 1.3) * 0.9;
    q.setFromAxisAngle(up, hash21(attempts, 9.4) * Math.PI * 2);
    m.compose(
      new THREE.Vector3(px, heightAt(px, pz) + 0.18 * s, pz),
      q,
      new THREE.Vector3(s, s, s),
    );
    if (hash21(attempts * 3.3, 4.7) > 0.25) tufts.push(m.clone());
    else rocks.push(m.clone());
  }

  const tuftInst = new THREE.InstancedMesh(tuftGeo, tuftMat, tufts.length);
  tufts.forEach((mat, i) => tuftInst.setMatrixAt(i, mat));
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
  rocks.forEach((mat, i) => rockInst.setMatrixAt(i, mat));
  g.add(tuftInst, rockInst);
  return g;
}

