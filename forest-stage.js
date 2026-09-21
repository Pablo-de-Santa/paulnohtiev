import {
  createClearingLife,
  fadeWorld,
  daylightAt,
  localHour,
} from "./clearing-life.js";
import { createClearingTilt } from "./clearing-tilt.js";
import * as THREE from "./vendor/three.module.min.js";
import { createSeasonalScene } from "./seasonal-scene.js";
import { seasonForDate } from "./seasons.js";
import { createExploreControls } from "./explore-controls.js";
export function createForestStage(button) {
  const host = document.createElement("div");
  host.id = "forest-stage";
  host.setAttribute("aria-hidden", "true");
  document.body.append(host);
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.append(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera();
  let world = createSeasonalScene(seasonForDate());
  let fading = null,
    fadeAge = 0;
  let selectedSeason = "auto",
    calendarChecked = 0;
  scene.add(world);
  // Start at the actual time-of-day brightness; avoid a daytime flash at night.
  scene.background = new THREE.Color(0x111e37).lerp(
    new THREE.Color(world.userData.palette.sky),
    daylightAt(localHour()),
  );
  scene.fog = new THREE.Fog(scene.background, 110, 195);
  camera.near = 0.1;
  camera.far = 260;
  const hemi = new THREE.HemisphereLight(0xffe5bb, 0x435547, 2.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd29c, 3.2);
  sun.position.set(-14, 24, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -25,
    right: 25,
    top: 25,
    bottom: -25,
    near: 1,
    far: 80,
  });
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  if (world.userData.season === "winter") {
    hemi.color.set(0xdceaff);
    sun.color.set(0xffe8d0);
  }
  const exploration = createExploreControls({
    canvas: renderer.domElement,
    button,
    getObservationCamera: () => camera,
    getDoorAngle: () => world.userData.cabin.userData.doorAngle,
    onBoundary: () => life.notifyBoundary(),
    getDoorOpen: () => world.userData.cabin.userData.doorOpen,
    onChange: (active) => life.setExploring(active),
    getTrees: () => [
      ...world.userData.treeObstacles,
      {
        x: world.userData.dog.position.x,
        z: world.userData.dog.position.z,
        radius: 0.48,
      },
    ],
  });
  function setSeason(value) {
    selectedSeason = value;
    if (fading) {
      scene.remove(fading);
      fading.userData.dispose();
    }
    fading = world;
    fadeAge = 0;
    world = createSeasonalScene(value === "auto" ? seasonForDate() : value);
    world.userData.cabin.userData.doorOpen =
      fading.userData.cabin.userData.doorOpen;
    for (const key of ["lightOn", "fireOn"])
      world.userData.cabin.userData[key] = fading.userData.cabin.userData[key];
    world.userData.cabin.userData.roomLight.intensity = world.userData.cabin
      .userData.lightOn
      ? 13
      : 0;
    world.userData.cabin.userData.hearthLight.intensity = world.userData.cabin
      .userData.fireOn
      ? 5
      : 0;
    fadeWorld(world, 0);
    scene.add(world);
  }
  const life = createClearingLife({
    scene,
    sun,
    hemi,
    exploration,
    getWorld: () => world,
    setSeason,
  });
  let phase = 0,
    disposed = false,
    preparing = false,
    last = performance.now(),
    elapsed = 0,
    raf;
  const tilt = createClearingTilt(
    () =>
      phase >= 5.8 &&
      !exploration.active &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  function resize() {
    const aspect = innerWidth / innerHeight,
      half = aspect < 1 ? 4.8 : (13.5 * aspect) / 2;
    camera.left = -half;
    camera.right = half;
    camera.top = half / aspect;
    camera.bottom = -half / aspect;
    camera.updateProjectionMatrix();
    const scale = innerWidth < 700 ? 1.25 : 2;
    renderer.setSize(
      Math.round(innerWidth / scale),
      Math.round(innerHeight / scale),
      false,
    );
    exploration.resize();
  }
  function render(now, warming = false) {
    if (disposed) return;
    if (!warming) raf = requestAnimationFrame(render);
    if (preparing && !warming) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (now - calendarChecked > 60000) {
      calendarChecked = now;
      if (
        selectedSeason === "auto" &&
        world.userData.season !== seasonForDate()
      )
        setSeason("auto");
    }
    if (phase < 4.94 || document.hidden) return;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) elapsed += dt;
    const descent = 1 - THREE.MathUtils.smoothstep(phase, 5.05, 5.8);
    if (!exploration.active) {
      const shift = tilt.update(dt);
      camera.position.set(
        12 + shift.x * 3.2,
        21 + descent * 30 + shift.y * 1.6,
        65,
      );
      camera.lookAt(1 + shift.x * 0.5, 1.5 + descent * 30 + shift.y * 0.35, 0);
    }
    world.userData.visitorPosition = exploration.active
      ? exploration.camera.position
      : null;
    life.update(dt, elapsed);
    if (life.arcadeActive) return;
    world.userData.update(elapsed);
    if (fading) {
      fadeAge += dt;
      const a = Math.min(1, fadeAge / 3);
      fading.userData.update(elapsed);
      fadeWorld(fading, 1 - a);
      fadeWorld(world, a);
      if (a === 1) {
        scene.remove(fading);
        fading.userData.dispose();
        fading = null;
      }
    }
    exploration.update(dt);
    if (!warming)
      renderer.render(scene, exploration.active ? exploration.camera : camera);
  }
  resize();
  raf = requestAnimationFrame(render);
  return {
    resize,
    async warmup() {
      preparing = true;
      phase = 6;
      try {
        render(performance.now(), true);
        await renderer.compileAsync(scene, camera);
        renderer.render(scene, camera);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      } finally {
        preparing = false;
        this.setPhase(0);
        last = performance.now();
      }
    },
    setPhase(p) {
      phase = p;
      life.setVisible(p >= 5.7);
      const opacity = THREE.MathUtils.smoothstep(p, 4.94, 5.2);
      host.style.opacity = opacity;
      host.style.visibility = opacity > 0 ? "visible" : "hidden";
      if (p < 5.7 && exploration.active) exploration.exit({ immediate: true });
      host.dataset.phase = p.toFixed(3);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      tilt.dispose();
      life.dispose();
      if (fading) fading.userData.dispose();
      exploration.dispose();
      world.userData.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      host.remove();
    },
  };
}
