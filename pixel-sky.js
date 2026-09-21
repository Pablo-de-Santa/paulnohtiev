import * as THREE from "./vendor/three.module.min.js";
import { engineOutlets } from "./choreography.js";
export function createPixelPlane(index) {
  const root = new THREE.Group(),
    g = new THREE.BoxGeometry(1, 1, 1),
    materials = new Map();
  const add = (x, y, z, w, h, d, color) => {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.9,
          flatShading: true,
        }),
      );
    const mesh = new THREE.Mesh(g, materials.get(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    root.add(mesh);
    return mesh;
  };
  const ivory = 0xe7debc,
    trim = [0x678d87, 0xb7774b, 0x687e91, 0xa49b5f][index];
  add(0, 0, 0, 6.2, 0.85, 0.85, ivory);
  add(3.25, -0.03, 0, 0.6, 0.66, 0.66, ivory);
  add(3.65, -0.08, 0, 0.3, 0.42, 0.43, ivory);
  add(-3.35, 0.03, 0, 0.8, 0.57, 0.58, ivory);
  add(2.8, 0.36, 0, 0.65, 0.18, 0.67, 0x495f64);
  for (let i = 0; i < 12; i++)
    for (const side of [-1, 1])
      add(2.3 - i * 0.4, 0.1, side * 0.438, 0.12, 0.16, 0.025, 0x526d70);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++)
      add(
        -i * 0.24,
        -0.38,
        side * (0.6 + i * 0.43),
        1.65 - i * 0.1,
        0.15,
        0.5,
        i % 2 ? ivory : 0xc7bea0,
      );
    for (let i = 0; i < 4; i++)
      add(
        -2.9 - i * 0.15,
        0.17,
        side * (0.5 + i * 0.3),
        0.8 - i * 0.1,
        0.1,
        0.35,
        trim,
      );
  }
  for (let i = 0; i < 5; i++)
    add(-2.8 - i * 0.12, 0.5 + i * 0.22, 0, 0.85 - i * 0.1, 0.25, 0.16, trim);
  for (const [x, y, z] of engineOutlets[index] ?? [
    [0.2, -0.65, -1.5],
    [0.2, -0.65, 1.5],
  ]) {
    add(x + 0.4, y, z, 0.8, 0.46, 0.42, ivory);
    add(x + 0.81, y, z, 0.025, 0.32, 0.3, 0x435351);
    add(x, y, z, 0.025, 0.25, 0.25, 0x68766c);
    add(x + 0.4, y + 0.25, z, 0.22, 0.35, 0.13, trim);
  }
  root.name = "Pixel aircraft";
  return root;
}
export function createPixelCloudField(mobile) {
  const root = new THREE.Group(),
    geometry = new THREE.BoxGeometry(1, 1, 1);
  let seed = 24,
    opacity = 1,
    wake = null;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296,
    position = new THREE.Vector3();
  for (let i = 0; i < (mobile ? 12 : 18); i++) {
    const cloud = new THREE.Group();
    cloud.position.set(
      (rand() - 0.5) * 100,
      (rand() - 0.5) * 24,
      -8 - rand() * 40,
    );
    cloud.userData.origin = cloud.position.clone();
    for (let j = 0; j < 9; j++) {
      const material = new THREE.MeshStandardMaterial({
        color: [0xe4e1cf, 0xd7dcd1, 0xf2ebd5][j % 3],
        roughness: 1,
        transparent: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (rand() - 0.5) * 19,
        (rand() - 0.5) * 4,
        (rand() - 0.5) * 8,
      );
      mesh.scale.set(5 + rand() * 7, 2 + rand() * 3, 4 + rand() * 6);
      cloud.add(mesh);
    }
    root.add(cloud);
  }
  root.userData.update = (t) => {
    root.children.forEach((cloud, i) => {
      cloud.position.x = cloud.userData.origin.x + Math.sin(t * 0.02 + i) * 1.2;
      cloud.children.forEach((m) => {
        m.getWorldPosition(position);
        const gap = wake
          ? 1 - THREE.MathUtils.smoothstep(position.distanceTo(wake), 2, 7)
          : 0;
        m.material.opacity = opacity * (1 - gap * 0.65);
      });
    });
  };
  root.userData.setOpacity = (v) => {
    opacity = v;
    root.traverse((o) => {
      if (o.isMesh) o.material.opacity = v;
    });
  };
  root.userData.setWake = (p) => {
    wake = p?.clone() ?? null;
  };
  root.userData.dispose = () => {
    geometry.dispose();
    root.traverse((o) => o.material?.dispose());
  };
  return root;
}
