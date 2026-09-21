import * as THREE from "./vendor/three.module.min.js";
// A distant, inexpensive pixel sky; no fullscreen effects or light per star.
export function createClearingSky(scene) {
  const root = new THREE.Group();
  root.name = "Clearing sky";
  scene.add(root);
  const positions = [];
  let seed = 9271;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 650; i++) {
    const a = random() * Math.PI * 2,
      y = 0.12 + random() * 0.88,
      r = Math.sqrt(1 - y * y) * 125;
    positions.push(Math.cos(a) * r, y * 125, Math.sin(a) * r);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const material = new THREE.PointsMaterial({
    color: 0xe8efff,
    size: 0.24,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(geometry, material);
  root.add(stars);
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffedb4, fog: false }),
  );
  root.add(sun);
  const moon = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xd8e5e8, fog: false }),
  );
  moon.add(disc);
  for (let i = 0; i < 6; i++) {
    const crater = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.25, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x9aafba, fog: false }),
    );
    crater.position.set(Math.sin(i * 2.1) * 0.8, Math.cos(i * 1.7) * 0.9, 1.62);
    moon.add(crater);
  }
  root.add(moon);
  const auroraGeometry = new THREE.BufferGeometry(),
    coords = [],
    colors = [];
  for (let i = 0; i < 65; i++) {
    const a = -Math.PI * 0.9 + (i / 64) * Math.PI * 0.8;
    for (const h of [40, 58]) {
      coords.push(Math.cos(a) * 105, h, Math.sin(a) * 105);
      colors.push(
        h === 40 ? 0.15 : 0.35,
        h === 40 ? 0.8 : 0.25,
        h === 40 ? 0.55 : 0.7,
      );
    }
  }
  const indices = [];
  for (let i = 0; i < 64; i++) {
    const n = i * 2;
    indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  auroraGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(coords, 3),
  );
  auroraGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );
  auroraGeometry.setIndex(indices);
  const aurora = new THREE.Mesh(
    auroraGeometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  root.add(aurora);
  const meteorGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);
  const meteor = new THREE.Line(
    meteorGeometry,
    new THREE.LineBasicMaterial({
      color: 0xffedda,
      transparent: true,
      fog: false,
    }),
  );
  root.add(meteor);
  let next = 3,
    born = -100,
    origin = new THREE.Vector3();
  return {
    update(t, day, lightPosition) {
      material.opacity = (1 - day) * (0.75 + Math.sin(t * 0.6) * 0.12);
      stars.visible = day < 0.98;
      sun.position.copy(lightPosition).normalize().multiplyScalar(120);
      sun.visible = day > 0.15;
      moon.visible = day <= 0.15;
      moon.position.copy(lightPosition).normalize().multiplyScalar(120);
      moon.lookAt(0, 0, 0);
      root.userData.night = moon.visible;
      aurora.visible = day < 0.3;
      aurora.material.opacity = (1 - day) * 0.24;
      if (aurora.visible) {
        const attr = auroraGeometry.attributes.position;
        for (let i = 0; i < 130; i++)
          attr.setY(
            i,
            coords[i * 3 + 1] +
              Math.sin(i * 0.18 + t * 0.14) * 3 +
              Math.sin(i * 0.43 - t * 0.19) * 1.5,
          );
        attr.needsUpdate = true;
      }
      if (t > next) {
        born = t;
        next = t + 3 + random() * 6;
        origin.set((random() - 0.5) * 130, 75 + random() * 25, -65);
      }
      const age = t - born;
      meteor.visible = day < 0.3 && age >= 0 && age < 1.1;
      if (meteor.visible) {
        const attr = meteorGeometry.attributes.position;
        attr.setXYZ(0, origin.x + age * 35, origin.y - age * 20, origin.z);
        attr.setXYZ(
          1,
          origin.x + age * 35 - 6,
          origin.y - age * 20 + 3,
          origin.z,
        );
        attr.needsUpdate = true;
        meteor.material.opacity = Math.sin((age / 1.1) * Math.PI);
      }
    },
    dispose() {
      root.removeFromParent();
      root.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    },
  };
}
