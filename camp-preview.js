import * as THREE from "./vendor/three.module.min.js";
// A single small renderer per open menu. Clones share source resources, which
// belong to the live world and must not be disposed by this preview.
export function createCampPreview(container, sources) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(280, 220);
  renderer.domElement.className = "camp-model-preview";
  renderer.domElement.setAttribute("aria-label", "Rotating object preview");
  container.append(renderer.domElement);
  const scene = new THREE.Scene(),
    group = new THREE.Group();
  scene.add(group, new THREE.HemisphereLight(0xffeed3, 0x586a7a, 3));
  const light = new THREE.DirectionalLight(0xffe3c1, 3);
  light.position.set(3, 6, 5);
  scene.add(light);
  for (const source of sources.filter(Boolean)) {
    const clone = source.clone(true);
    clone.visible = true;
    clone.traverse((o) => {
      o.userData = {};
    });
    group.add(clone);
  }
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  if (!bounds.isEmpty()) {
    const center = bounds.getCenter(new THREE.Vector3());
    for (const child of group.children) child.position.sub(center);
    group.scale.setScalar(
      3 / Math.max(...bounds.getSize(new THREE.Vector3()).toArray(), 0.1),
    );
  }
  const camera = new THREE.PerspectiveCamera(40, 280 / 220, 0.1, 30);
  camera.position.set(0, 1.5, 6);
  camera.lookAt(0, 0, 0);
  return {
    update(dt) {
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        group.rotation.y += dt * 0.38;
      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
