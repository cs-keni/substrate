import * as THREE from 'three';
import { INK, VOLT, boneMat, outlined, whiteMat } from '../palette';

/**
 * LAYER 02 — TRANSMISSION. PCB-trace power corridors: bundles of parallel
 * polylines with right-angle bends, energy pulses running along them, and a
 * substation (transformers + gantry frames) mid-route.
 */

interface Pulse {
  mesh: THREE.Mesh;
  curve: THREE.CurvePath<THREE.Vector3>;
  t: number;
  speed: number;
}

const pulses: Pulse[] = [];

/** Right-angle waypoint run — the PCB aesthetic (45° chamfered corners). */
function traceRoute(points: THREE.Vector2[]): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const v3 = (p: THREE.Vector2) => new THREE.Vector3(p.x, 0.06, p.y);
  for (let i = 0; i < points.length - 1; i++) {
    path.add(new THREE.LineCurve3(v3(points[i]), v3(points[i + 1])));
  }
  return path;
}

/** A bundle of N parallel strands offset perpendicular to each segment. */
function traceBundle(
  route: THREE.Vector2[],
  strands: number,
  gap: number,
): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.28,
  });

  for (let s = 0; s < strands; s++) {
    const off = (s - (strands - 1) / 2) * gap;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < route.length; i++) {
      // offset direction: average of adjacent segment normals
      const prev = route[Math.max(0, i - 1)];
      const next = route[Math.min(route.length - 1, i + 1)];
      const dir = new THREE.Vector2().subVectors(next, prev).normalize();
      const normal = new THREE.Vector2(-dir.y, dir.x);
      pts.push(
        new THREE.Vector3(
          route[i].x + normal.x * off,
          0.06,
          route[i].y + normal.y * off,
        ),
      );
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    g.add(new THREE.Line(geo, mat));
  }
  return g;
}

function addPulse(route: THREE.Vector2[], speed: number): THREE.Mesh {
  const curve = traceRoute(route);
  const geo = new THREE.CapsuleGeometry(0.14, 1.6, 3, 6);
  geo.rotateZ(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: VOLT }));
  pulses.push({ mesh, curve, t: Math.random(), speed });
  return mesh;
}

function transformer(): THREE.Group {
  const g = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(2.6, 2.2, 1.8);
  const body = outlined(bodyGeo, whiteMat(), 0.3);
  body.position.y = 1.1;
  g.add(body);

  // radiator fins
  const finGeo = new THREE.BoxGeometry(0.08, 1.6, 1.6);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, boneMat());
    fin.position.set(-1.45 - i * 0.14, 1.1, 0);
    g.add(fin);
  }

  // bushings
  const bushGeo = new THREE.ConeGeometry(0.14, 0.8, 8);
  for (let i = 0; i < 3; i++) {
    const bush = new THREE.Mesh(bushGeo, whiteMat());
    bush.position.set(-0.7 + i * 0.7, 2.7, 0);
    g.add(bush);
  }
  return g;
}

/** Light H-frame pylon — carries the corridor visually above the traces. */
function pylon(): THREE.Group {
  const g = new THREE.Group();
  const legGeo = new THREE.CylinderGeometry(0.07, 0.1, 4.4, 6);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, whiteMat());
    leg.position.set(s * 1.15, 2.2, 0);
    g.add(leg);
  }
  const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 3.4, 6);
  armGeo.rotateZ(Math.PI / 2);
  const arm = new THREE.Mesh(armGeo, whiteMat());
  arm.position.y = 4.1;
  g.add(arm);
  const insGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6);
  for (let i = -1; i <= 1; i++) {
    const ins = new THREE.Mesh(insGeo, boneMat());
    ins.position.set(i * 1.1, 3.75, 0);
    g.add(ins);
  }
  return g;
}

/** Clone pylons along a polyline at ~fixed arc-length spacing, oriented
 *  perpendicular to the local run, skipping keep-out radii (yards). */
function pylonsAlong(
  route: THREE.Vector2[],
  spacing: number,
  keepOut: Array<[number, number, number]>,
): THREE.Group {
  const g = new THREE.Group();
  let carry = spacing * 0.5;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const segLen = a.distanceTo(b);
    const dir = new THREE.Vector2().subVectors(b, a).normalize();
    let d = carry;
    while (d < segLen) {
      const x = a.x + dir.x * d;
      const z = a.y + dir.y * d;
      d += spacing;
      if (keepOut.some(([kx, kz, kr]) => (x - kx) ** 2 + (z - kz) ** 2 < kr * kr)) continue;
      const p = pylon();
      p.position.set(x, 0, z);
      // crossarm perpendicular to the run: local +X → world (dir.y, -dir.x)
      p.rotation.y = Math.atan2(dir.x, dir.y);
      g.add(p);
    }
    carry = d - segLen;
  }
  return g;
}

function gantry(width: number): THREE.Group {
  const g = new THREE.Group();
  const legGeo = new THREE.CylinderGeometry(0.09, 0.12, 5.6, 6);
  const beamGeo = new THREE.CylinderGeometry(0.09, 0.09, width, 6);
  beamGeo.rotateZ(Math.PI / 2);

  const legL = new THREE.Mesh(legGeo, whiteMat());
  legL.position.set(-width / 2, 2.8, 0);
  const legR = new THREE.Mesh(legGeo, whiteMat());
  legR.position.set(width / 2, 2.8, 0);
  const beam = new THREE.Mesh(beamGeo, whiteMat());
  beam.position.y = 5.4;
  g.add(legL, legR, beam);

  // insulator strings
  const insGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 6);
  for (let i = 0; i < 3; i++) {
    const ins = new THREE.Mesh(insGeo, boneMat());
    ins.position.set(-width / 3 + (i * width) / 3, 4.8, 0);
    g.add(ins);
  }
  return g;
}

export interface TransmissionBuild {
  group: THREE.Group;
  /** main west→east corridor route in world XZ */
  corridor: THREE.Vector2[];
}

export function buildTransmission(): TransmissionBuild {
  const group = new THREE.Group();

  // main corridor: generation collector (-106,42) → substation (0,0) → campus (96,-26)
  const corridor: THREE.Vector2[] = [
    new THREE.Vector2(-106, 42),
    new THREE.Vector2(-88, 42),
    new THREE.Vector2(-74, 28),
    new THREE.Vector2(-46, 28),
    new THREE.Vector2(-30, 12),
    new THREE.Vector2(-30, 4),
    new THREE.Vector2(-8, 4),
    new THREE.Vector2(0, 0),
  ];
  const corridorEast: THREE.Vector2[] = [
    new THREE.Vector2(2, -1),
    new THREE.Vector2(18, -1),
    new THREE.Vector2(34, -14),
    new THREE.Vector2(58, -14),
    new THREE.Vector2(70, -26),
    new THREE.Vector2(92, -26),
  ];

  group.add(traceBundle(corridor, 7, 0.42));
  group.add(traceBundle(corridorEast, 9, 0.42));

  // spur lines for texture
  const spurA: THREE.Vector2[] = [
    new THREE.Vector2(-46, 28),
    new THREE.Vector2(-46, 52),
    new THREE.Vector2(-32, 66),
  ];
  const spurB: THREE.Vector2[] = [
    new THREE.Vector2(34, -14),
    new THREE.Vector2(34, 14),
    new THREE.Vector2(48, 28),
  ];
  group.add(traceBundle(spurA, 4, 0.4));
  group.add(traceBundle(spurB, 4, 0.4));

  // H-frame pylons pace the corridors — the traces stop reading as abstract
  // lines and start reading as a transmission line. Keep-outs clear the
  // collector yard, switchyard, and campus approach.
  const yardKeepOut: Array<[number, number, number]> = [
    [-106, 42, 10],
    [0, 0, 16],
    [92, -26, 12],
  ];
  group.add(pylonsAlong(corridor, 15, yardKeepOut));
  group.add(pylonsAlong(corridorEast, 15, yardKeepOut));
  group.add(pylonsAlong(spurA, 17, yardKeepOut));
  group.add(pylonsAlong(spurB, 17, yardKeepOut));

  // energy pulses — enough traffic that the grid always reads as live
  group.add(addPulse(corridor, 0.055));
  group.add(addPulse(corridor, 0.041));
  group.add(addPulse(corridor, 0.047));
  group.add(addPulse(corridor, 0.062));
  group.add(addPulse(corridorEast, 0.06));
  group.add(addPulse(corridorEast, 0.036));
  group.add(addPulse(corridorEast, 0.052));
  group.add(addPulse(spurA, 0.045));
  group.add(addPulse(spurB, 0.05));
  group.add(addPulse(spurB, 0.038));

  // substation at origin
  const sub = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(26, 0.2, 18),
    new THREE.MeshLambertMaterial({ color: '#edebe4' }),
  );
  pad.position.y = 0.1;
  sub.add(pad);

  const t1 = transformer();
  t1.position.set(-6, 0.2, -3);
  const t2 = transformer();
  t2.position.set(-1.5, 0.2, -3);
  const t3 = transformer();
  t3.position.set(3, 0.2, -3);
  sub.add(t1, t2, t3);

  for (let i = 0; i < 3; i++) {
    const frame = gantry(7);
    frame.position.set(-5 + i * 6, 0.2, 3.5);
    sub.add(frame);
  }

  const control = outlined(new THREE.BoxGeometry(4, 1.8, 2.4), whiteMat(), 0.3);
  control.position.set(9, 1.1, 4);
  sub.add(control);

  sub.position.set(0, 0, 0);
  group.add(sub);

  return { group, corridor: [...corridor, ...corridorEast] };
}

export function tickTransmission(dt: number): void {
  for (const p of pulses) {
    p.t = (p.t + dt * p.speed) % 1;
    const pos = p.curve.getPointAt(p.t);
    const tan = p.curve.getTangentAt(p.t);
    p.mesh.position.copy(pos).setY(0.2);
    p.mesh.rotation.y = Math.atan2(-tan.z, tan.x);
  }
}
