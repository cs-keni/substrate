import * as THREE from 'three';
import { VOLT, boneMat, outlined, whiteMat } from '../palette';
import { road } from './groundworks';

/**
 * LAYER 03 — COMPUTE. Data center campus: rows of long halls with rooftop
 * cooling units (instanced), a close-detail hall with individual rack rows,
 * and a status beacon. Anchored around (96,-26) where the corridor ends.
 */

const beacons: THREE.Mesh[] = [];

function hall(len: number): THREE.Group {
  const g = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(len, 3.2, 7);
  const body = outlined(bodyGeo, whiteMat(), 0.22);
  body.position.y = 1.6;
  g.add(body);

  // rooftop cooling units
  const unitGeo = new THREE.BoxGeometry(1.6, 0.9, 1.6);
  const count = Math.floor(len / 3);
  const units = new THREE.InstancedMesh(unitGeo, boneMat(), count * 2);
  const m = new THREE.Matrix4();
  let idx = 0;
  for (let i = 0; i < count; i++) {
    m.setPosition(-len / 2 + 2 + i * 3, 3.65, -1.8);
    units.setMatrixAt(idx++, m);
    m.setPosition(-len / 2 + 2 + i * 3, 3.65, 1.8);
    units.setMatrixAt(idx++, m);
  }
  g.add(units);

  // intake louvres — dark strip along the wall
  const louvre = new THREE.Mesh(
    new THREE.BoxGeometry(len - 0.6, 1.1, 0.06),
    new THREE.MeshLambertMaterial({ color: '#b9b7ae' }),
  );
  louvre.position.set(0, 1.35, 3.53);
  g.add(louvre);
  return g;
}

/** Open-air rack yard for the close-up beat: rows of cabinets. */
function rackYard(rows: number, perRow: number): THREE.Group {
  const g = new THREE.Group();
  const rackGeo = new THREE.BoxGeometry(0.9, 1.9, 1.1);
  const bodies = new THREE.InstancedMesh(rackGeo, whiteMat(), rows * perRow);
  const faceGeo = new THREE.BoxGeometry(0.74, 1.6, 0.05);
  const faces = new THREE.InstancedMesh(
    faceGeo,
    new THREE.MeshLambertMaterial({ color: '#2a2b26' }),
    rows * perRow,
  );
  const m = new THREE.Matrix4();
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < perRow; c++) {
      const x = c * 1.15;
      const z = r * 3.2;
      m.setPosition(x, 0.95, z);
      bodies.setMatrixAt(idx, m);
      m.setPosition(x, 1.05, z + 0.58);
      faces.setMatrixAt(idx, m);
      idx++;
    }
  }
  g.add(bodies, faces);

  // cold-aisle rails
  const railGeo = new THREE.BoxGeometry(perRow * 1.15 + 1, 0.06, 0.12);
  for (let r = 0; r <= rows; r++) {
    const rail = new THREE.Mesh(railGeo, boneMat());
    rail.position.set((perRow * 1.15) / 2 - 0.6, 0.03, r * 3.2 - 1.6);
    g.add(rail);
  }
  return g;
}

export function buildCompute(): THREE.Group {
  const campus = new THREE.Group();

  // campus pad
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(64, 0.18, 46),
    new THREE.MeshLambertMaterial({ color: '#eeece5' }),
  );
  pad.position.set(0, 0.09, 0);
  campus.add(pad);

  // hall grid — 2 columns × 4 rows
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const h = hall(22);
      h.position.set(-14 + c * 28, 0.18, -16 + r * 10.5);
      campus.add(h);
    }
  }

  // rack yard close-up zone on the east edge
  const yard = rackYard(4, 10);
  yard.position.set(14, 0.18, 14);
  campus.add(yard);

  // substation feed + beacon mast
  const feed = outlined(new THREE.BoxGeometry(3.4, 1.8, 3.4), whiteMat(), 0.3);
  feed.position.set(-26, 1.08, 16);
  campus.add(feed);

  const mastGeo = new THREE.CylinderGeometry(0.06, 0.09, 7, 6);
  const mast = new THREE.Mesh(mastGeo, whiteMat());
  mast.position.set(-26, 3.7, 16);
  campus.add(mast);

  // cooling water tanks on the southwest corner
  for (let i = 0; i < 2; i++) {
    const tank = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 3.2, 18),
      whiteMat(),
    );
    body.position.y = 1.6;
    tank.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.08, 6, 18), boneMat());
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 3.2;
    tank.add(rim);
    tank.position.set(-24 + i * 5.4, 0.18, -14);
    campus.add(tank);
  }

  // gatehouse where the entry road meets the pad
  const gate = outlined(new THREE.BoxGeometry(1.8, 1.3, 1.4), whiteMat(), 0.3);
  gate.position.set(-27, 0.83, 20);
  campus.add(gate);

  // internal circulation: spine down the west edge, cross-run along the
  // south — halls sit on a street grid, not in a void
  const v2 = (x: number, z: number) => new THREE.Vector2(x, z);
  campus.add(road([v2(-24, 20), v2(-28.5, 12), v2(-28.5, -20)], 1.4, 0.19));
  campus.add(road([v2(-28.5, -20), v2(26, -20)], 1.4, 0.19));
  campus.add(road([v2(0, 20), v2(0, -20)], 1.4, 0.19));
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: VOLT }),
  );
  beacon.position.set(-26, 7.3, 16);
  beacons.push(beacon);
  campus.add(beacon);

  campus.position.set(96 + 8, 0, -26);
  return campus;
}

export function tickCompute(elapsed: number): void {
  for (const b of beacons) {
    const s = 0.75 + 0.25 * Math.sin(elapsed * 4);
    b.scale.setScalar(s);
  }
}
