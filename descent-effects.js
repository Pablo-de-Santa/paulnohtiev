import * as THREE from "./vendor/three.module.min.js";
import {
  descentPose,
  smooth,
  aircraftPose,
  engineOutlets,
} from "./choreography.js";

export function createDescentEffects(birdModel, mobile = false) {
  const root = new THREE.Group(),
    birds = [],
    mixers = [];
  if (birdModel) {
    const box = new THREE.Box3().setFromObject(birdModel),
      size = box.getSize(new THREE.Vector3());
    for (let i = 0; i < (mobile ? 5 : 9); i++) {
      const bird = birdModel.clone(true);
      bird.userData.flightScale = 1.2 / Math.max(size.x, size.y, size.z);
      bird.scale.setScalar(bird.userData.flightScale);
      bird.traverse((o) => {
        if (o.isMesh) {
          o.material = new THREE.MeshStandardMaterial({
            color: "#4b5354",
            roughness: 1,
          });
        }
      });
      const mixer = new THREE.AnimationMixer(bird);
      for (const clip of birdModel.userData.clips || [])
        mixer.clipAction(clip).play();
      mixers.push(mixer);
      birds.push(bird);
      root.add(bird);
    }
  }
  const geometry = new THREE.BufferGeometry(),
    vertices = new Float32Array(32 * 2 * 3),
    alpha = new Float32Array(64),
    indices = [];
  for (let i = 0; i < 32; i++) {
    alpha[i * 2] = alpha[i * 2 + 1] = Math.sin((i / 31) * Math.PI * 0.5);
    if (i < 31) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute("opacity", new THREE.BufferAttribute(alpha, 1));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    vertexShader:
      "attribute float opacity;varying float vOpacity;void main(){vOpacity=opacity;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying float vOpacity;void main(){gl_FragColor=vec4(.94,.97,1.,vOpacity*.26);}",
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const trails = [0, 1, 2, 3].map(() => {
    const m = new THREE.Mesh(geometry.clone(), material);
    m.frustumCulled = false;
    root.add(m);
    return m;
  });
  root.userData.update = (phase, time, flightPaths) => {
    const nearGround = phase > 5.5;
    const start = nearGround ? 5.53 : 4.89,
      end = nearGround ? 5.82 : 5.05;
    const amount = smooth(start, end, phase),
      anchor = descentPose(phase, mobile).position;
    birds.forEach((bird, i) => {
      bird.visible = phase > start && phase < end;
      bird.scale.setScalar(bird.userData.flightScale * (nearGround ? 0.45 : 1));
      const x = -55 + amount * 110 - i * 2;
      bird.position.set(
        anchor.x + x,
        anchor.y + Math.sin(time * 0.6 + i) * 0.4 + i * 0.32,
        anchor.z - 25 - i * 0.7,
      );
      bird.rotation.y = Math.PI / 2;
      mixers[i].setTime(time * 0.8 + i * 0.23);
    });
    const flight = ((phase - 4) / 0.87) * 4,
      index = Math.floor(flight);
    const show = phase >= 4 && phase < 4 + 0.87 / 2;
    trails.forEach((trail, side) => {
      trail.visible = show && side < engineOutlets[index].length;
      if (!trail.visible) return;
      const data = trail.geometry.attributes.position;
      for (let i = 0; i < 32; i++) {
        const age = (31 - i) / 31;
        const pose = aircraftPose(phase, index, flightPaths[index], mobile);
        const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(
          pose.rotation,
        );
        const outlet = new THREE.Vector3(...engineOutlets[index][side]);
        outlet
          .multiplyScalar(pose.scale)
          .applyQuaternion(pose.rotation)
          .add(pose.position);
        outlet.addScaledVector(direction, -age * 22);
        const width = 0.022 + age * 0.13;
        for (let edge = 0; edge < 2; edge++)
          data.setXYZ(
            i * 2 + edge,
            outlet.x,
            outlet.y + (edge ? width : -width),
            outlet.z,
          );
      }
      data.needsUpdate = true;
    });
  };
  root.userData.dispose = () => mixers.forEach((m) => m.stopAllAction());
  return root;
}
