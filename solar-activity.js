import * as THREE from "./vendor/three.module.min.js";
import { random } from "./models.js";

// A few small meshes, no bloom pass, particles engine, or shadow-map budget.
export function createSolarActivity() {
  const root = new THREE.Group(),
    corona = new THREE.Group();
  root.add(corona);
  const loops = [],
    flareRandom = random(239);
  function flareEvent(previousEnd, pivot) {
    const start = previousEnd + flareRandom() * 5,
      duration = 3 + flareRandom() * 7;
    pivot.rotation.set(
      (flareRandom() - 0.5) * 1.4,
      flareRandom() * Math.PI,
      flareRandom() * Math.PI * 2,
    );
    return {
      start,
      end: start + duration,
      duration,
      strength: 0.35 + flareRandom() * 0.8,
    };
  }
  for (let i = 0; i < 4; i++) {
    const angle = i * 2.399;
    const points = Array.from({ length: 25 }, (_, j) => {
      const t = (j / 24) * Math.PI;
      return new THREE.Vector3(
        0.08 * Math.cos(t),
        0.995 + 0.11 * Math.sin(t),
        0,
      );
    });
    const material = new THREE.MeshBasicMaterial({
      color: "#ff7526",
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const loop = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        24,
        0.01,
        5,
        false,
      ),
      material,
    );
    const pivot = new THREE.Group();
    pivot.rotation.z = angle;
    pivot.rotation.y = i * 0.61;
    pivot.add(loop);
    corona.add(pivot);
    loops.push({ loop, pivot, event: flareEvent(-i * 2, pivot) });
  }
  const rng = random(987),
    rocks = [];
  const geometry = new THREE.IcosahedronGeometry(0.17, 0);
  function schedule(previousEnd) {
    const angle = (rng() - 0.5) * 1.5,
      direction = rng() < 0.5 ? -1 : 1;
    const start = previousEnd + 2 + rng() * 9,
      duration = 5 + rng() * 7;
    return {
      start,
      end: start + duration,
      duration,
      angle,
      direction,
      y: (rng() - 0.5) * 32,
      z: 8 + rng() * 14,
      size: 0.6 + rng() * 1.4,
    };
  }
  for (let i = 0; i < 3; i++) {
    const rock = new THREE.Mesh(
      geometry,
      new THREE.MeshPhongMaterial({
        color: "#a69c8c",
        shininess: 2,
        transparent: true,
      }),
    );
    root.add(rock);
    rocks.push({ rock, event: schedule(-i * 3) });
  }
  // Sparse rocky debris between the composed Mars and Jupiter orbits.
  const belt = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.04, 0),
    new THREE.MeshPhongMaterial({
      color: "#8c8170",
      shininess: 0,
      transparent: true,
    }),
    180,
  );
  const beltData = Array.from({ length: 180 }, () => ({
    angle: rng() * Math.PI * 2,
    radius: 9.05 + rng() * 0.65,
    z: (rng() - 0.5) * 1.4,
    size: 0.5 + rng(),
  }));
  const dummy = new THREE.Object3D();
  root.add(belt);
  root.userData.update = (time, sun, radius, opacity, aspect = 1) => {
    corona.position.copy(sun);
    corona.scale.setScalar(radius);
    loops.forEach((entry) => {
      while (time >= entry.event.end)
        entry.event = flareEvent(entry.event.end, entry.pivot);
      const { loop, event } = entry,
        t = (time - event.start) / event.duration;
      const pulse = t < 0 ? 0 : Math.sin(Math.min(t, 1) * Math.PI) ** 2;
      loop.visible = pulse > 0.001;
      const lift = pulse * event.strength * 0.09;
      loop.scale.y = 1 + lift;
      loop.position.y = -lift;
      loop.scale.x = 0.7 + event.strength * 0.5;
      loop.material.opacity = opacity * pulse * (0.2 + event.strength * 0.45);
    });
    rocks.forEach((entry) => {
      while (time >= entry.event.end) entry.event = schedule(entry.event.end);
      const { rock, event } = entry,
        t = (time - event.start) / event.duration;
      rock.visible = t >= 0 && t < 1 && opacity > 0.01;
      const x = (-52 + t * 104) * event.direction;
      rock.position.set(x, event.y + x * Math.sin(event.angle) * 0.3, event.z);
      rock.scale.set(event.size, event.size * 0.7, event.size * 1.3);
      rock.rotation.set(time * 0.4, event.angle + time * 0.3, time * 0.17);
      rock.material.opacity =
        opacity * Math.min(1, Math.max(0, t * 8), Math.max(0, (1 - t) * 8));
    });
    belt.visible = opacity > 0.01;
    belt.material.opacity = opacity;
    beltData.forEach((item, i) => {
      const angle = item.angle + time * 0.035;
      dummy.position.set(
        Math.cos(angle) * item.radius * Math.max(1, aspect),
        Math.sin(angle) * item.radius * Math.max(1, 1 / aspect),
        item.z,
      );
      dummy.rotation.set(angle, item.angle, angle * 0.3);
      dummy.scale.setScalar(item.size);
      dummy.updateMatrix();
      belt.setMatrixAt(i, dummy.matrix);
    });
    belt.instanceMatrix.needsUpdate = true;
  };
  return root;
}
