import test from "node:test";
import assert from "node:assert/strict";
import { phaseAtScroll, flightPaths } from "../choreography.js";

test("chapter mapping is continuous, reversible, and handles the final viewport", () => {
  const offsets = [0, 1800, 7300, 9300, 11700, 17300],
    end = 18100;
  for (let i = 0; i < offsets.length; i++)
    assert.equal(phaseAtScroll(offsets[i], offsets, end), i);
  assert.equal(phaseAtScroll(end, offsets, end), 6);
  assert.equal(phaseAtScroll(17700, offsets, end), 5.5);
  for (let y = end; y >= 0; y -= 73) {
    const phase = phaseAtScroll(y, offsets, end);
    assert.ok(phase >= 0 && phase <= 6);
  }
  assert.ok(Math.abs(phaseAtScroll(7299.999, offsets, end) - 2) < 0.00001);
});

test("aircraft use four distinct 3D paths and valid forward directions", () => {
  const signatures = flightPaths.map((path) => {
    for (let i = 0; i <= 100; i++) {
      const at = path.getPoint(i / 100),
        direction = path.getTangent(i / 100);
      assert.ok(
        [...at.toArray(), ...direction.toArray()].every(Number.isFinite),
      );
      assert.ok(Math.abs(direction.length() - 1) < 0.00001);
    }
    return path.getPoint(0.5).toArray().join(",");
  });
  assert.equal(new Set(signatures).size, 4);
  assert.ok(flightPaths[0].getTangent(0.5).x > 0);
  assert.ok(flightPaths[1].getTangent(0.5).x < 0);
  assert.ok(flightPaths[2].getTangent(0.5).x > 0.7);
  assert.ok(flightPaths[3].getTangent(0.5).z > 0.5);
});

test("solar orbits remain separated and inside wide and narrow viewports", async () => {
  const { solarPosition, solarSizes, solarExtent } =
    await import("../choreography.js");
  for (const aspect of [0.38, 0.46, 1, 1.6, 2.4])
    for (let t = 0; t < 300; t += 0.5) {
      const positions = solarSizes.map((_, i) => solarPosition(i, t, aspect));
      const radii = solarSizes.map((r, i) => r * (i === 6 ? 2.12 : 1));
      for (let i = 0; i < positions.length; i++) {
        assert.ok(
          Math.abs(positions[i].x) + radii[i] <
            solarExtent * Math.max(1, aspect),
        );
        assert.ok(
          Math.abs(positions[i].y) + radii[i] <
            solarExtent * Math.max(1, 1 / aspect),
        );
        for (let j = i + 1; j < positions.length; j++)
          assert.ok(
            positions[i].distanceTo(positions[j]) > radii[i] + radii[j],
          );
      }
    }
});

test("heavy aircraft remain upright in either flight direction", async () => {
  const { flightOrientation } = await import("../choreography.js");
  const THREE = await import("../vendor/three.module.min.js");
  for (const index of [0, 1, 2, 3])
    for (let i = 0; i <= 100; i++) {
      const tangent = flightPaths[index].getTangent(i / 100),
        q = flightOrientation(tangent, 0.075);
      assert.ok(
        new THREE.Vector3(1, 0, 0).applyQuaternion(q).dot(tangent) > 0.999,
      );
      assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(q).y > 0.6);
    }
});

test("Edmonton maps to the center of the locked Earth view", async () => {
  const { edmontonNormal, surfaceNormal } = await import("../choreography.js");
  const THREE = await import("../vendor/three.module.min.js");
  const front = new THREE.Vector3(0, 0, 1),
    q = new THREE.Quaternion().setFromUnitVectors(edmontonNormal, front);
  assert.ok(
    edmontonNormal.clone().applyQuaternion(q).distanceTo(front) < 1e-12,
  );
  assert.ok(surfaceNormal(0, 0).distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-12);
  assert.ok(surfaceNormal(90, 0).y > 0.9999);
});

test("full-size aircraft start and finish outside the camera frustum", async () => {
  const { flightPathsForViewport } = await import("../choreography.js");
  const THREE = await import("../vendor/three.module.min.js");
  for (const mobile of [false, true])
    for (const aspect of [0.38, 0.46, 1, 1.6, 2.4, 3.6]) {
      const camera = new THREE.PerspectiveCamera(42, aspect, 0.25, 1800);
      camera.position.set(0, 1.2, mobile ? 27 : 19);
      camera.lookAt(0, 0.8, 0);
      camera.updateMatrixWorld(true);
      const frustum = new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse,
        ),
      );
      for (const path of flightPathsForViewport(aspect, mobile)) {
        for (const t of [0, 1])
          assert.equal(
            frustum.intersectsSphere(
              new THREE.Sphere(path.getPoint(t), mobile ? 4.9 : 7),
            ),
            false,
          );
        assert.ok(
          Array.from({ length: 21 }, (_, i) =>
            frustum.containsPoint(path.getPoint(i / 20)),
          ).some(Boolean),
          "Route passes through the screen",
        );
      }
    }
});

test("cinematic orbital clocks keep speed ordering while making outer planets visible", async () => {
  const { solarSpeeds, moonAngularSpeed } = await import("../choreography.js");
  assert.equal(solarSpeeds[0], 0);
  for (let i = 1; i < 8; i++) assert.ok(solarSpeeds[i] > solarSpeeds[i + 1]);
  assert.ok(solarSpeeds[8] > 0.03);
  assert.ok(Math.abs(moonAngularSpeed * 24 - Math.PI * 2) < 1e-12);
});

test("galaxies are fully behind the camera before the solar reveal at every aspect", async () => {
  const { cosmicCameraOffset, smooth, solarExtent } =
    await import("../choreography.js");
  for (const aspect of [0.38, 0.46, 1, 1.6, 2.4, 3.6]) {
    const cameraZ =
      (solarExtent * Math.max(1, 1 / aspect)) / Math.tan((21 * Math.PI) / 180);
    // At the first solar frame, camera travel is still finishing smoothly.
    const atReveal = cameraZ + 292 * (1 - smooth(1.05, 1.56, 1.53));
    // Closest galaxy centered at 112, bounded conservatively by radius 28.
    assert.ok(112 - 28 + cosmicCameraOffset(aspect) > atReveal + 20);
  }
});

test("Moon keeps the same face toward Earth and a stable orbital pole", async () => {
  const { moonPose } = await import("../choreography.js");
  const THREE = await import("../vendor/three.module.min.js");
  for (const mobile of [false, true]) {
    const north = new THREE.Vector3(0, 1, 0).applyQuaternion(
      moonPose(0, mobile).rotation,
    );
    for (let a = 0; a < Math.PI * 2; a += 0.025) {
      const { position, rotation } = moonPose(a, mobile);
      assert.ok(Math.abs(position.length() - 1.5) < 1e-10);
      const next = moonPose(a + 0.025, mobile);
      assert.ok(
        Math.abs(rotation.angleTo(next.rotation) - 0.025) < 1e-10,
        "One uniform axial turn for each orbit",
      );
      assert.ok(
        new THREE.Vector3(0, 0, 1)
          .applyQuaternion(rotation)
          .dot(position.clone().negate().normalize()) > 0.99999,
      );
      assert.ok(
        new THREE.Vector3(0, 1, 0).applyQuaternion(rotation).dot(north) >
          0.99999,
      );
    }
  }
});

test("Earth arrives at Edmonton eastward and holds its final orientation", async () => {
  const { earthArrivalPose, edmontonNormal, axialSpeeds, earthSunDirection } =
    await import("../choreography.js");
  const THREE = await import("../vendor/three.module.min.js");
  assert.deepEqual(
    axialSpeeds.slice(1).map(Math.sign),
    [1, -1, 1, 1, 1, 1, -1, 1],
  );
  for (const spin of [0, 1, 3, 6, 10, 24]) {
    let previous = earthArrivalPose(spin, 0);
    for (let step = 1; step <= 100; step++) {
      const next = earthArrivalPose(spin, step / 100);
      const delta = previous.clone().invert().multiply(next);
      assert.ok(
        delta.y >= -1e-8,
        "Edmonton arrival must not reverse axial spin",
      );
      previous = next;
    }
    assert.ok(
      edmontonNormal
        .clone()
        .applyQuaternion(previous)
        .distanceTo(new THREE.Vector3(0, 0, 1)) < 1e-6,
    );
  }
  const light = earthSunDirection(0);
  assert.ok(light.x < 0 && light.z > 0);
  assert.ok(
    earthSunDirection(1).z > light.z,
    "Sun moves toward the illuminated landing view",
  );
});

test("sky descent is continuous, forward and downward on desktop and mobile", async () => {
  const { descentPose } = await import("../choreography.js");
  for (const mobile of [false, true]) {
    let previous = descentPose(3.76, mobile).position;
    for (let phase = 3.765; phase <= 5.865; phase += 0.005) {
      const { position, target } = descentPose(phase, mobile);
      assert.ok(position.y <= previous.y + 1e-8);
      assert.ok(position.z <= previous.z + 1e-8);
      assert.ok(position.distanceTo(previous) < 4);
      assert.ok(position.y > 0, "Camera stays above ground");
      assert.ok([...target.toArray()].every(Number.isFinite));
      previous = position;
    }
    assert.ok(
      descentPose(4.1, mobile).position.y >
        descentPose(4.7, mobile).position.y + 60,
    );
    assert.ok(descentPose(5.99, mobile).position.y < 4);
  }
});

test("airliners keep a constant heading and engine outlets stay outside the fuselage", async () => {
  const { aircraftPose, engineOutlets, flightPathsForViewport } =
    await import("../choreography.js");
  for (const mobile of [false, true]) {
    const paths = flightPathsForViewport(mobile ? 0.46 : 1.6, mobile);
    for (let index = 0; index < paths.length; index++) {
      const initial = aircraftPose(
        4 + ((index + 0.01) * 0.87) / 4,
        index,
        paths[index],
        mobile,
      );
      const final = aircraftPose(
        4 + ((index + 0.99) * 0.87) / 4,
        index,
        paths[index],
        mobile,
      );
      assert.ok(initial.rotation.angleTo(final.rotation) < 1e-6);
      assert.equal(initial.scale, final.scale);
    }
  }
  assert.equal(engineOutlets[0].length, 4);
  assert.equal(engineOutlets[1].length, 2);
  for (const outlets of engineOutlets)
    for (const [x, y, z] of outlets) {
      assert.ok(Number.isFinite(x) && y < 0);
      assert.ok(
        Math.abs(z) > 1,
        "outlet belongs under the wing, not in the fuselage",
      );
    }
});
