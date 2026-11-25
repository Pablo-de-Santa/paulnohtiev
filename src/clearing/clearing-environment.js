import * as THREE from "../../vendor/three.module.min.js";
import { createClearingSky } from "./clearing-sky.js";

export function localHour(date = new Date()) {
  return Number.isFinite(date.getTime())
    ? date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
    : 12;
}

export function daylightAt(hour) {
  return THREE.MathUtils.smoothstep(
    Math.sin(((hour - 6) / 24) * Math.PI * 2),
    -0.16,
    0.65,
  );
}

export function createClearingEnvironment({ scene, sun, hemi }) {
  const skyWorld = createClearingSky(scene);
  const sky = new THREE.Color(),
    daySky = new THREE.Color(),
    warm = new THREE.Color(),
    daylightTint = new THREE.Color(0xffe4bd),
    moonlightTint = new THREE.Color(0xaac7ed),
    night = new THREE.Color(0x111e37);
  let hour = localHour();
  let timeOverride = null;

  return {
    get hour() {
      return hour;
    },
    setHour(value) {
      timeOverride = value === null ? null : { hour: value, at: performance.now() };
    },
    update(world, dt, elapsed) {
      const target = timeOverride
        ? (timeOverride.hour + (performance.now() - timeOverride.at) / 3600000) % 24
        : localHour();
      const delta = ((target - hour + 36) % 24) - 12;
      hour = (hour + delta * (1 - Math.exp(-dt * 0.75)) + 24) % 24;
      const light = daylightAt(hour),
        dusk = 1 - Math.min(1, Math.abs(light - 0.45) * 2);
      sky.copy(night).lerp(daySky.set(world.userData.palette.sky), light);
      scene.background.lerp(sky, 1 - Math.exp(-dt * 0.8));
      scene.fog.color.copy(scene.background);
      hemi.intensity = 0.25 + light * 1.85;
      sun.intensity = 0.32 + light * 3.1;
      warm.set(0xffbe88).lerp(daylightTint, 1 - dusk);
      sun.color.copy(warm).lerp(moonlightTint, 1 - light);
      sun.position.set(
        Math.cos(((hour - 6) / 24) * Math.PI * 2) * 22,
        9 + light * 20,
        10,
      );
      skyWorld.update(elapsed, light, sun.position);
      world.userData.daylight = light;
      world.userData.cabin.userData.update(dt, hour);
      return delta;
    },
    dispose: skyWorld.dispose,
  };
}

// Materials crossfade while both seasonal scenes coexist, then old resources are released.
export function fadeWorld(world, amount) {
  const seen = new Set();
  world.traverse((o) => {
    if (o.isLight) {
      if (o.userData.baseIntensity === undefined)
        o.userData.baseIntensity = o.intensity;
      o.intensity = o.userData.baseIntensity * amount;
    }
    for (const m of o.material
      ? Array.isArray(o.material)
        ? o.material
        : [o.material]
      : []) {
      if (seen.has(m)) continue;
      seen.add(m);
      if (m.userData.baseOpacity === undefined) {
        m.userData.baseOpacity = m.opacity;
        m.userData.baseTransparent = m.transparent;
      }
      m.transparent = amount < 1 || m.userData.baseTransparent;
      m.opacity = m.userData.baseOpacity * amount;
    }
  });
}
