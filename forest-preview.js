import {
  createClearingLife,
  fadeWorld,
  daylightAt,
  localHour,
} from "./clearing-life.js";
import { createClearingTilt } from "./clearing-tilt.js";
import { createExploreControls } from "./explore-controls.js";
import * as THREE from "./vendor/three.module.min.js";
import { createSeasonalScene } from "./seasonal-scene.js";
import { seasonForDate } from "./seasons.js";
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(),
  camera = new THREE.OrthographicCamera();
camera.near = 0.1;
camera.far = 260;
camera.position.set(12, 21, 65);
camera.lookAt(1, 1.5, 0);
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
let framing = "close";
let fading = null,
  fadeAge = 0;
let world,
  selected = "auto",
  current,
  paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
function setSeason(value) {
  selected = value;
  current = value === "auto" ? seasonForDate() : value;
  if (fading) {
    scene.remove(fading);
    fading.userData.dispose();
  }
  fading = world;
  fadeAge = 0;
  world = createSeasonalScene(current);
  if (fading) {
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
  }
  scene.add(world);
  if (!scene.background) {
    // Start at the actual time-of-day brightness; avoid a daytime flash at night.
    scene.background = new THREE.Color(0x111e37).lerp(
      new THREE.Color(world.userData.palette.sky),
      daylightAt(localHour()),
    );
    scene.fog = new THREE.Fog(scene.background, 110, 195);
  }
  hemi.color.set(current === "winter" ? 0xdceaff : 0xffe5bb);
  sun.color.set(current === "winter" ? 0xffe8d0 : 0xffd29c);
  document
    .querySelectorAll("button[data-season]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.season === value)),
    );
  document.querySelector("#status").textContent =
    `${current[0].toUpperCase() + current.slice(1)} · a quiet place to build`;
  document.body.dataset.season = current;
}
document
  .querySelectorAll("button[data-season]")
  .forEach((b) => (b.onclick = () => setSeason(b.dataset.season)));
function resize() {
  const aspect = innerWidth / innerHeight,
    span = framing === "close" ? 13.5 : 28;
  camera.left = (-span * aspect) / 2;
  camera.right = (span * aspect) / 2;
  camera.top = span / 2;
  camera.bottom = -span / 2;
  if (aspect < 1) {
    const half = framing === "close" ? 4.8 : 8.5;
    camera.left = -half;
    camera.right = half;
    camera.top = half / aspect;
    camera.bottom = -half / aspect;
  }
  camera.updateProjectionMatrix();
  const scale = innerWidth < 700 ? 1.25 : 2;
  renderer.setSize(
    Math.round(innerWidth / scale),
    Math.round(innerHeight / scale),
    false,
  );
  renderer.domElement.style.width = "100vw";
  renderer.domElement.style.height = "100svh";
}
document.querySelectorAll("[data-framing]").forEach(
  (b) =>
    (b.onclick = () => {
      framing = b.dataset.framing;
      document
        .querySelectorAll("[data-framing]")
        .forEach((button) =>
          button.setAttribute("aria-pressed", String(button === b)),
        );
      resize();
    }),
);
addEventListener("resize", resize);
setSeason("auto");
resize();
const exploration = createExploreControls({
  canvas: renderer.domElement,
  button: document.querySelector("#explore-button"),
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
addEventListener("resize", () => exploration.resize());
const tilt = createClearingTilt(() => !exploration.active && !paused);
const life = createClearingLife({
  scene,
  sun,
  hemi,
  exploration,
  getWorld: () => world,
  setSeason,
});
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  exploration.update(dt);
  if (!exploration.active) {
    const shift = tilt.update(dt);
    camera.position.set(12 + shift.x * 3.2, 21 + shift.y * 1.6, 65);
    camera.lookAt(1 + shift.x * 0.5, 1.5 + shift.y * 0.35, 0);
  }
  world.userData.visitorPosition = exploration.active
    ? exploration.camera.position
    : null;
  life.update(dt, t);
  if (life.arcadeActive) return;
  world.userData.update(paused ? 3 : t);
  if (fading) {
    fadeAge += dt;
    const a = Math.min(1, fadeAge / 3);
    fading.userData.update(paused ? 3 : t);
    fadeWorld(fading, 1 - a);
    fadeWorld(world, a);
    if (a === 1) {
      scene.remove(fading);
      fading.userData.dispose();
      fading = null;
    }
  }
  renderer.render(scene, exploration.active ? exploration.camera : camera);
  window.forestStats = {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
  };
}
frame();
document.body.dataset.ready = "true";
// Refresh the calendar choice if the tab remains open across a month boundary.
addEventListener("focus", () => {
  if (selected === "auto" && seasonForDate() !== current) setSeason("auto");
});

// Inspection hooks are limited to the standalone development preview.
window.forestDebug = {
  get world() {
    return world;
  },
  exploration,
};
