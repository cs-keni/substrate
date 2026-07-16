import * as THREE from 'three';
import { boneMat, outlined, whiteMat, VOLT } from '../palette';
import { road } from './groundworks';

/**
 * LAYER 01 — GENERATION. Wind farm, solar field, cooling towers + thermal
 * block. Everything procedural primitives with ink edge outlines.
 */

const rotors: Array<{ spinner: THREE.Group; speed: number }> = [];

function turbine(scale = 1): THREE.Group {
  const g = new THREE.Group();

  const towerGeo = new THREE.CylinderGeometry(0.22, 0.4, 11, 10);
  const tower = new THREE.Mesh(towerGeo, whiteMat());
  tower.position.y = 5.5;
  g.add(tower);

  const nacelleGeo = new THREE.BoxGeometry(1.5, 0.7, 0.7);
  const nacelle = outlined(nacelleGeo, whiteMat());
  nacelle.position.set(0.15, 11.2, 0);
  g.add(nacelle);

  // Blades live in the spinner's local XY plane (spaced around Z), so the
  // spin axis IS the hub axis. The outer rotor group then yaws the whole
  // disc to face out the front of the nacelle — spinning stays in-plane.
  // (Spacing around X + a 90° yaw made rotation.x tumble the disc.)
  const rotor = new THREE.Group();
  const spinner = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.16, 4.6, 0.42);
  bladeGeo.translate(0, 2.5, 0);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(bladeGeo, whiteMat());
    blade.rotation.z = (i * Math.PI * 2) / 3;
    spinner.add(blade);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), whiteMat());
  spinner.add(hub);
  spinner.rotation.z = Math.random() * Math.PI * 2;
  rotor.add(spinner);
  rotor.position.set(0.95, 11.2, 0);
  rotor.rotation.y = Math.PI / 2;
  g.add(rotor);
  rotors.push({ spinner, speed: 0.75 + Math.random() * 0.45 });

  g.scale.setScalar(scale);
  return g;
}

function coolingTower(): THREE.Group {
  // hyperboloid silhouette via lathe
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const r = 3.4 - 1.9 * Math.sin(t * Math.PI * 0.72);
    pts.push(new THREE.Vector2(r, t * 8.5));
  }
  const geo = new THREE.LatheGeometry(pts, 22);
  const g = new THREE.Group();
  // the lathe is an open shell — single-sided it reads as a hole straight
  // through to the ground grid from the iso camera. Double-side the wall
  // so the far interior is visible, and float a dark water disc inside.
  const shellMat = whiteMat();
  shellMat.side = THREE.DoubleSide;
  g.add(new THREE.Mesh(geo, shellMat));
  // radius must stay inside the shell at this height (inner r ≈ 1.53)
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(1.42, 22),
    new THREE.MeshLambertMaterial({ color: '#494a44' }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 5.2;
  water.userData.noShadow = true;
  g.add(water);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(pts[14].x, 0.12, 8, 22),
    boneMat(),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 8.5;
  g.add(rim);
  return g;
}

function thermalBlock(): THREE.Group {
  const g = new THREE.Group();
  const hallGeo = new THREE.BoxGeometry(10, 4, 6);
  const hall = outlined(hallGeo, whiteMat());
  hall.position.y = 2;
  g.add(hall);

  for (let i = 0; i < 2; i++) {
    const stackGeo = new THREE.CylinderGeometry(0.5, 0.65, 9, 10);
    const stack = new THREE.Mesh(stackGeo, whiteMat());
    stack.position.set(-3 + i * 2.2, 4.5, -2);
    g.add(stack);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.5, 10),
      new THREE.MeshBasicMaterial({ color: VOLT }),
    );
    band.position.set(-3 + i * 2.2, 8.6, -2);
    g.add(band);
  }
  const annexGeo = new THREE.BoxGeometry(4, 2.4, 4);
  const annex = outlined(annexGeo, whiteMat());
  annex.position.set(6.4, 1.2, 0.6);
  g.add(annex);
  return g;
}

function solarField(rows: number, cols: number): THREE.Group {
  const g = new THREE.Group();
  const panelGeo = new THREE.BoxGeometry(2.4, 0.08, 1.2);
  panelGeo.rotateZ(-0.42);
  const mat = new THREE.MeshLambertMaterial({ color: '#dbd9d0' });
  const inst = new THREE.InstancedMesh(panelGeo, mat, rows * cols);
  const m = new THREE.Matrix4();
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      m.setPosition(c * 3.1, 0.75, r * 2.1);
      inst.setMatrixAt(idx++, m);
    }
  }
  g.add(inst);

  // one highlighted row edge for accent
  const legGeo = new THREE.BoxGeometry(0.1, 0.75, 0.1);
  const legs = new THREE.InstancedMesh(legGeo, boneMat(), rows * cols);
  idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      m.setPosition(c * 3.1, 0.37, r * 2.1);
      legs.setMatrixAt(idx++, m);
    }
  }
  g.add(legs);
  return g;
}

export function buildGeneration(): THREE.Group {
  const zone = new THREE.Group();

  // wind farm — staggered arc; [x, z, scale]
  const turbinePos: Array<[number, number, number]> = [
    [-16, -10, 1],
    [-8, -18, 0.92],
    [2, -13, 1.05],
    [-24, -2, 0.9],
    [-6, -4, 1],
    [6, -22, 0.85],
  ];
  turbinePos.forEach(([x, z, s]) => {
    const t = turbine(s);
    t.position.set(x, 0, z);
    // shared wind heading with a touch of per-machine yaw drift
    t.rotation.y = -0.4 + (Math.random() - 0.5) * 0.12;
    zone.add(t);

    // grounding: gravel crane pad and a pad-mount transformer — a turbine
    // is a construction site, not a pin on a map (shadows are real now)
    const padMesh = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.06, 2.6),
      new THREE.MeshLambertMaterial({ color: '#e3e1d8' }),
    );
    padMesh.position.set(x + 0.4, 0.03, z + 0.6);
    zone.add(padMesh);
    const pmt = outlined(new THREE.BoxGeometry(0.7, 0.6, 0.5), boneMat(), 0.3);
    pmt.position.set(x + 1.6, 0.3, z + 1.2);
    zone.add(pmt);
  });

  // turbine spur tracks off the wind-farm road (built in world.ts); the
  // spine passes through zone-local (-14,-7) → (-21,-17) → (-26,-26)
  const v2 = (x: number, z: number) => new THREE.Vector2(x, z);
  zone.add(road([v2(-14, -7), v2(-16, -10)], 0.9));
  zone.add(road([v2(-21, -17), v2(-14, -18), v2(-8, -18)], 0.9));
  zone.add(road([v2(-6, 6), v2(-6, -4), v2(-2, -9), v2(2, -13), v2(6, -22)], 0.9));
  zone.add(road([v2(-14, -7), v2(-19, -4), v2(-24, -2)], 0.9));

  const ct1 = coolingTower();
  ct1.position.set(16, 0, 8);
  zone.add(ct1);
  const ct2 = coolingTower();
  ct2.scale.setScalar(0.85);
  ct2.position.set(24, 0, 3);
  zone.add(ct2);

  const thermal = thermalBlock();
  thermal.position.set(18, 0, 18);
  zone.add(thermal);

  // apron pad tying the thermal cluster together
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(24, 0.12, 22),
    new THREE.MeshLambertMaterial({ color: '#eceae2' }),
  );
  apron.position.set(20, 0.06, 11);
  zone.add(apron);

  const solar = solarField(9, 7);
  solar.position.set(-30, 0, 10);
  zone.add(solar);

  // inverter skids along the array's east edge
  for (let i = 0; i < 3; i++) {
    const skid = outlined(new THREE.BoxGeometry(1.3, 0.9, 1), boneMat(), 0.28);
    skid.position.set(-9.6, 0.45, 12 + i * 6);
    zone.add(skid);
  }

  // collector yard — where the traces will begin
  const collectorGeo = new THREE.BoxGeometry(3, 1.6, 3);
  const collector = outlined(collectorGeo, whiteMat(), 0.3);
  collector.position.set(34, 0.8, 22);
  zone.add(collector);
  zone.add(fence(34, 22, 6));

  return zone;
}

function fence(x: number, z: number, size: number): THREE.LineSegments {
  const half = size / 2;
  const pts = [
    new THREE.Vector3(x - half, 0.5, z - half),
    new THREE.Vector3(x + half, 0.5, z - half),
    new THREE.Vector3(x + half, 0.5, z - half),
    new THREE.Vector3(x + half, 0.5, z + half),
    new THREE.Vector3(x + half, 0.5, z + half),
    new THREE.Vector3(x - half, 0.5, z + half),
    new THREE.Vector3(x - half, 0.5, z + half),
    new THREE.Vector3(x - half, 0.5, z - half),
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: '#0e0f0c', transparent: true, opacity: 0.25 }),
  );
}

export function tickGeneration(dt: number): void {
  for (const r of rotors) r.spinner.rotation.z -= dt * r.speed;
}
