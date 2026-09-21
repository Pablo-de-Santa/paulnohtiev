import * as THREE from "./vendor/three.module.min.js";
// Scroll phase boundaries are explicit and reversible. No timeouts advance scenes.
export const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);
export const mix = THREE.MathUtils.lerp;
export function phaseAtScroll(y, offsets, end) {
  const i = Math.max(
    0,
    offsets.findLastIndex((offset) => y >= offset),
  );
  const next = offsets[i + 1] ?? end;
  return (
    i +
    THREE.MathUtils.clamp(
      (y - offsets[i]) / Math.max(1, next - offsets[i]),
      0,
      1,
    )
  );
}
// Constant headings: real airliners cross the frame without display aerobatics.
export const flightPaths = [
  [
    [-34, 1.5, -4],
    [34, 1.5, -4],
  ],
  [
    [34, 0.5, -7],
    [-34, 0.5, -7],
  ],
  [
    [-32, -1, -10],
    [32, 0, -3],
  ],
  [
    [28, 1, -34],
    [-28, 0, 10],
  ],
].map((points) => {
  const vectors = points.map((p) => new THREE.Vector3(...p));
  const path = new THREE.LineCurve3(...vectors);
  path.points = vectors;
  return path;
});

// Screen-filling nested ellipses. Radial gaps exceed neighboring silhouettes,
// including Saturn's rings, so autonomous orbits do not cross in projection.
export const solarRadii = [0, 3.1, 4.5, 6.4, 8, 10.5, 15.3, 20, 23];
// Earth stays .88. Inner planets use Earth-relative diameters; giant sizes
// are compressed for readability, preserving their order and fixed ratios.
export const solarSizes = [
  0.88 * 2.9,
  0.88 * 0.383,
  0.88 * 0.949,
  0.88,
  0.88 * 0.532,
  0.88 * 1.9,
  0.88 * 1.6,
  0.88 * 1.3,
  0.88 * 1.25,
];
export const solarExtent = 25.2;
// NASA sidereal orbital periods in days; one shared accelerated clock.
export const simulatedDaysPerSecond = 4;
export const orbitalPeriods = [
  Infinity,
  88,
  224.7,
  365.2,
  687,
  4331,
  10747,
  30589,
  59800,
];
export const physicalSolarSpeeds = orbitalPeriods.map(
  (days) => (Math.PI * 2 * simulatedDaysPerSecond) / days,
);
// Compress the time differences: Mercury remains fastest, Neptune slowest,
// but even the outermost world visibly advances (one orbit in ~3 minutes).
export const solarSpeeds = orbitalPeriods.map((days) =>
  Number.isFinite(days) ? 0.16 * (365.2 / days) ** 0.3 : 0,
);
export const moonAngularSpeed = (Math.PI * 2) / 24;
export function cosmicCameraOffset(aspect) {
  return (
    (solarExtent * Math.max(1, 1 / aspect)) /
      Math.tan(THREE.MathUtils.degToRad(21)) -
    58
  );
}
export function solarPosition(
  index,
  time,
  aspect,
  target = new THREE.Vector3(),
) {
  const theta = index * 2.41 + time * solarSpeeds[index];
  const r = solarRadii[index];
  return target.set(
    Math.cos(theta) * r * Math.max(1, aspect),
    Math.sin(theta) * r * Math.max(1, 1 / aspect),
    0,
  );
}
// Equirectangular day-map longitude + Three.js SphereGeometry UV convention.
export function surfaceNormal(latitude, longitude) {
  const lat = THREE.MathUtils.degToRad(latitude),
    lon = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    -Math.cos(lat) * Math.sin(lon),
  );
}
export const edmontonNormal = surfaceNormal(53.5461, -113.4938);
// Fix the roll ambiguity of a shortest-arc X-axis quaternion for westbound jets.
export function flightOrientation(tangent, bank = 0) {
  const forward = tangent.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0)
    .addScaledVector(forward, -forward.y)
    .normalize();
  const side = new THREE.Vector3().crossVectors(forward, up).normalize();
  return new THREE.Quaternion()
    .setFromRotationMatrix(new THREE.Matrix4().makeBasis(forward, up, side))
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), bank),
    );
}

// Extend each flight beyond the actual viewport, with room for the whole model.
// The interior control points retain the original route and depth changes.
export function flightPathsForViewport(aspect, mobile = false) {
  const cameraZ = mobile ? 27 : 19,
    radius = mobile ? 4.9 : 7;
  const halfFovTangent = Math.tan(THREE.MathUtils.degToRad(21)) * aspect;
  return flightPaths.map((path) => {
    const points = path.points.map((p) =>
      p
        .clone()
        .multiply(
          mobile
            ? new THREE.Vector3(0.62, 0.75, 0.6)
            : new THREE.Vector3(1, 1, 1),
        ),
    );
    for (const endpoint of [points[0], points.at(-1)]) {
      const depth = cameraZ - endpoint.z + Math.abs(endpoint.y - 1.2) * 0.1;
      const outside = (depth + radius) * halfFovTangent + radius + 4;
      endpoint.x =
        Math.sign(endpoint.x) * Math.max(Math.abs(endpoint.x), outside);
    }
    const line = new THREE.LineCurve3(points[0], points.at(-1));
    line.points = points;
    return line;
  });
}

// One body-fixed lunar face follows Earth, with a fixed orbital north pole.
export function moonPose(angle, mobile = false) {
  const u = new THREE.Vector3(mobile ? 0.7 : 1.5, 0, mobile ? 1.25 : 0)
    .normalize()
    .multiplyScalar(1.5);
  const v = new THREE.Vector3(0, mobile ? 1.45 : 0.8, mobile ? 0 : 0.75)
    .normalize()
    .multiplyScalar(1.5);
  const position = u
    .clone()
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(v, Math.sin(angle));
  const north = new THREE.Vector3().crossVectors(u, v).normalize();
  const facing = position.clone().negate().normalize();
  const right = new THREE.Vector3().crossVectors(north, facing).normalize();
  const rotation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, north, facing),
  );
  return { position, rotation };
}

// Positive Y rotation advances eastward with our equirectangular UV mapping.
// Venus and Uranus retain retrograde spin; speeds are illustrative.
export const axialSpeeds = [
  0.035, 0.12, -0.085, 0.2, 0.18, 0.28, 0.25, -0.16, 0.18,
];
export function earthArrivalPose(
  spin,
  progress,
  target = new THREE.Quaternion(),
) {
  const yaw = Math.atan2(-edmontonNormal.x, edmontonNormal.z);
  const forward = THREE.MathUtils.euclideanModulo(yaw - spin, Math.PI * 2);
  return target.setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(53.5461) * progress,
      spin + forward * progress,
      0,
      "XYZ",
    ),
  );
}
// World-space lighting stays independent of camera parallax and lunar motion.
export function earthSunDirection(dive, target = new THREE.Vector3()) {
  return target
    .set(-0.97, 0.25, 0.22)
    .lerp(new THREE.Vector3(-0.6, 0.35, 0.72), dive)
    .normalize();
}

// One forward, descending camera path shared by aircraft placement and landing.
export function descentPose(phase, mobile = false) {
  // Aircraft occupy the upper descent. Ground approach starts only after departure.
  const upper = smooth(3.76, 4.88, phase);
  const landing = smooth(4.88, 5.86, phase);
  const remaining = 1 - landing;
  const position = new THREE.Vector3(
    Math.sin(landing * Math.PI) * -48 + mix(0, mobile ? 3.8 : 4.8, landing),
    (mobile ? 3.3 : 3.1) +
      (mix(261.2, 165, upper) - (mobile ? 3.3 : 3.1)) * remaining ** 1.55,
    (mobile ? 11.7 : 10.5) +
      (mix(510.5, 390, upper) - (mobile ? 11.7 : 10.5)) * remaining ** 1.2,
  );
  const target = position
    .clone()
    .add(new THREE.Vector3(0, -6 - 32 * Math.sin(landing * Math.PI), -140));
  target.lerp(new THREE.Vector3(0.3, 1.4, 0.35), smooth(5.25, 5.86, phase));
  return { position, target };
}

// Outlet centers measured against the normalized imported meshes (nose +X).
export const engineOutlets = [
  [
    [0.55, -0.96, -1.63],
    [0.55, -0.96, 1.63],
    [-0.2, -0.9, -2.63],
    [-0.2, -0.9, 2.63],
  ],
  [
    [0.27, -0.84, -1.32],
    [0.27, -0.84, 1.32],
  ],
];
export function aircraftPose(phase, index, path, mobile = false) {
  const progress = ((phase - 4) / 0.87) * 4 - index;
  const position = path
    .getPoint(progress)
    .add(descentPose(phase, mobile).position);
  position.y -= 1.2;
  position.z -= mobile ? 27 : 19;
  return {
    position,
    rotation: flightOrientation(path.getTangent(progress)),
    scale: (mobile ? 0.7 : 1) * [1.2, 1, 0.88, 0.78][index],
  };
}
