import * as THREE from 'three';

export const PAPER = new THREE.Color('#f4f3ef');
export const PAPER_DIM = new THREE.Color('#e9e7e0');
export const INK = new THREE.Color('#0e0f0c');
export const BONE = new THREE.Color('#cfcdc4');
export const VOLT = new THREE.Color('#ff4e00');

/** Flat "technical model" white with soft lambert shading. */
export function whiteMat(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: PAPER });
}

export function boneMat(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: BONE });
}

export function voltMat(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: VOLT });
}

/** Thin ink edge lines — the "engineering drawing" outline look. */
export function edgeLines(
  geo: THREE.BufferGeometry,
  opacity = 0.16,
): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(geo, 24);
  const mat = new THREE.LineBasicMaterial({
    color: INK,
    transparent: true,
    opacity,
  });
  return new THREE.LineSegments(edges, mat);
}

/** Mesh + its edge outline as one group. */
export function outlined(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  edgeOpacity = 0.16,
): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat));
  g.add(edgeLines(geo, edgeOpacity));
  return g;
}
