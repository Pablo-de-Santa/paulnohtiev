import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.min.js";
import { createDescentEffects } from "../descent-effects.js";
import { flightPaths, aircraftPose, engineOutlets } from "../choreography.js";
test("contrails start at each engine and extend directly opposite aircraft heading", () => {
  const effect = createDescentEffects(null);
  for (const phase of [4.04, 4.15, 4.25, 4.4]) {
    effect.userData.update(phase, 0, flightPaths);
    const index = Math.floor(((phase - 4) / 0.87) * 4),
      pose = aircraftPose(phase, index, flightPaths[index], false);
    effect.children
      .filter((o) => o.visible)
      .forEach((trail, i) => {
        const a = trail.geometry.attributes.position;
        const midpoint = (n) =>
          new THREE.Vector3()
            .fromBufferAttribute(a, n * 2)
            .add(new THREE.Vector3().fromBufferAttribute(a, n * 2 + 1))
            .multiplyScalar(0.5);
        const head = midpoint(31),
          tail = midpoint(0),
          expected = new THREE.Vector3(...engineOutlets[index][i])
            .multiplyScalar(pose.scale)
            .applyQuaternion(pose.rotation)
            .add(pose.position);
        // Vertex buffers are Float32 at large scene coordinates.
        assert(head.distanceTo(expected) < 0.00002);
        const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(
          pose.rotation,
        );
        assert(head.clone().sub(tail).normalize().dot(forward) > 0.99999);
      });
  }
});
