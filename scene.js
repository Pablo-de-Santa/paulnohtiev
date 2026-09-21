import { createPixelPlane, createPixelCloudField } from "./pixel-sky.js";
import * as THREE from "./vendor/three.module.min.js";
import { loadAssets } from "./assets.js";
import { createPlanet, createStars, random } from "./models.js";
import { createCosmicJourney, createSunlight } from "./cosmos.js";
import { createNebulaField } from "./nebula.js";
import { createSolarActivity } from "./solar-activity.js";
import { createDescentEffects } from "./descent-effects.js";
import { createInteractionSystem } from "./interactions.js";
import { aircraftTypes } from "./config.js";
import {
  smooth,
  mix,
  flightPathsForViewport,
  solarSizes,
  solarExtent,
  moonAngularSpeed,
  moonPose,
  cosmicCameraOffset,
  solarPosition,
  axialSpeeds,
  earthArrivalPose,
  earthSunDirection,
  descentPose,
  aircraftPose,
} from "./choreography.js";

export async function createWorld(
  host,
  { onFailure, onFrame, reducedMotion = false },
) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.appendChild(renderer.domElement);
  const assets = await loadAssets();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#000000");
  const camera = new THREE.PerspectiveCamera(
    42,
    innerWidth / innerHeight,
    0.012,
    1800,
  );
  const hemi = new THREE.HemisphereLight("#b7d5f2", "#514735", 0.06);
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#fff0d5", 1.8);
  key.position.set(-9, 12, 14);
  scene.add(key);
  const parkFill = new THREE.DirectionalLight("#d5e9ff", 0);
  parkFill.position.set(5, 4, 8);
  scene.add(parkFill);
  const parkRim = new THREE.DirectionalLight("#ffcb7b", 0);
  parkRim.position.set(-5, 7, -10);
  scene.add(parkRim);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.00015;
  const sunLight = new THREE.PointLight("#fff2d8", 2.3, 0, 0);
  scene.add(sunLight);
  const moonLightingPosition = new THREE.Vector3();
  let phase = 0,
    elapsed = 0,
    orbitTime = 0,
    paused = reducedMotion,
    dirty = true,
    disposed = false,
    mobile = innerWidth < 700;
  const invalidate = () => {
    dirty = true;
  };
  const interactions = createInteractionSystem(camera, {
    reducedMotion,
    invalidate,
  });
  const stars = interactions.register(
    "stars",
    "Stars",
    createStars(mobile ? 1700 : 2900),
  );
  scene.add(stars);
  const starMesh = stars.children[0].children[0];
  const cosmos = createCosmicJourney(mobile);
  scene.add(cosmos);
  const distantNebula = createNebulaField();
  scene.add(distantNebula);
  const sunlight = createSunlight();
  scene.add(sunlight);
  const solar = new THREE.Group();
  scene.add(solar);
  const planetNames = [
    "Sun",
    "Mercury",
    "Venus",
    "Earth",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
  ];
  const sizes = solarSizes;
  const rng = random(154),
    chaos = planetNames.map(
      () =>
        new THREE.Vector3(
          (rng() - 0.5) * 75,
          (rng() - 0.5) * 60,
          (rng() - 0.5) * 40,
        ),
    );
  const bodies = planetNames.map((name) => createPlanet(name, assets.textures));
  const planets = bodies.map((body, i) => {
    const entity = interactions.register(
      planetNames[i].toLowerCase(),
      planetNames[i],
      body,
    );
    solar.add(entity);
    return entity;
  });
  const activity = createSolarActivity();
  solar.add(activity);
  const earth = planets[3],
    moonBody = createPlanet("Moon", assets.textures),
    moon = interactions.register("moon", "Moon", moonBody);
  solar.add(moon);
  const skyGroup = new THREE.Group();
  scene.add(skyGroup);
  skyGroup.position.y = 0;
  const cloudField = createPixelCloudField(mobile);
  const clouds = interactions.register("clouds", "Clouds", cloudField);
  skyGroup.add(clouds);
  const fleet = aircraftTypes.map((spec, index) => {
    const model = createPixelPlane(index);
    const entity = interactions.register(spec.id, spec.name, model, {
      bank: true,
    });
    skyGroup.add(entity);
    return entity;
  });
  cloudField.children.forEach((cloud, i) => {
    const anchor = descentPose(
      3.92 + (i / cloudField.children.length) * 1.13,
      mobile,
    ).position;
    cloud.position.add(new THREE.Vector3(anchor.x, anchor.y, anchor.z - 20));
    cloud.userData.origin.copy(cloud.position);
  });
  const descentEffects = createDescentEffects(assets.models.bird, mobile);
  scene.add(descentEffects);
  const veil = document.querySelector("#atmosphere-veil");
  const black = new THREE.Color("#000000"),
    skyBlue = new THREE.Color("#7595ad"),
    parkSky = new THREE.Color("#809dac");
  const position = new THREE.Vector3(),
    target = new THREE.Vector3(),
    solarCamera = new THREE.Vector3(),
    earthCamera = new THREE.Vector3(),
    earthTarget = new THREE.Vector3(),
    direction = new THREE.Vector3();
  const parallax = new THREE.Vector2();
  const contextLost = (event) => {
    event.preventDefault();
    onFailure(new Error("WebGL context lost"));
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  let flightPaths;
  let pixelSky = false;
  function resize() {
    mobile = innerWidth < 700;
    // Bound fill-rate and framebuffer memory on large / Retina displays.
    renderer.setPixelRatio(
      pixelSky
        ? 0.85
        : Math.min(
            devicePixelRatio,
            mobile ? 1.35 : 1.5,
            Math.sqrt(2_000_000 / (innerWidth * innerHeight)),
          ),
    );
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.domElement.style.imageRendering = pixelSky ? "pixelated" : "auto";
    camera.aspect = innerWidth / innerHeight;
    flightPaths = flightPathsForViewport(camera.aspect, mobile);
    camera.updateProjectionMatrix();
    invalidate();
  }
  resize();
  function render(_time, deltaMs = 16.67, prepareOnly = false) {
    if (disposed || document.hidden || (paused && !dirty)) return;
    dirty = false;
    const dt = Math.min(deltaMs / 1000, 0.05);
    if (!paused) {
      elapsed += dt;
      if (phase < 2) orbitTime += dt;
    }
    const p = phase,
      focus = smooth(2, 2.5, p),
      dive = smooth(2.96, 3.76, p),
      skyAmount = smooth(3.48, 3.84, p),
      parkAmount = smooth(4.96, 5.68, p);
    stars.visible = p > 1.04 && p < 3.73;
    starMesh.material.opacity =
      smooth(1.04, 1.27, p) * (1 - smooth(3.22, 3.7, p));
    // No flash veil or fade-to-black: the same hot matter forms the galaxies.
    const cloudPass = smooth(3.48, 3.72, p) * (1 - smooth(3.76, 4, p));
    veil.style.opacity = cloudPass.toFixed(4);
    cosmos.visible = p > 0.5 && p < 1.53;
    cosmos.userData.update(p, elapsed);
    distantNebula.visible = p > 1.4 && p < 3.3;
    distantNebula.userData.update(
      8 + p * 0.8 + elapsed * 0.012,
      0.92,
      smooth(1.4, 1.7, p) * (1 - smooth(2.6, 3.3, p)) * 0.17,
    );
    solar.visible = p > 1.53 && p < 3.76;
    planets.forEach((planet, i) => {
      const arrival =
        i === 0
          ? smooth(1.53, 1.6, p)
          : smooth(1.74 + (i - 1) * 0.019, 1.85 + (i - 1) * 0.019, p);
      solarPosition(i, orbitTime, camera.aspect, direction);
      // Move neighboring bodies out along their own radial directions before
      // the close-up can crop them. Visibility changes happen outside the view.
      if (i !== 0 && i !== 3 && focus > 0) {
        direction.multiplyScalar(1 + focus * 7);
        direction.z -= focus * 55;
      }
      planet.position.copy(chaos[i]).lerp(direction, arrival);
      if (i === 0) planet.position.set(0, 0, 0);
      planet.scale.setScalar(Math.max(0.00001, sizes[i] * arrival));
      planet.visible = arrival > 0.001;
      bodies[i].userData.body.rotation.set(
        0,
        (i === 3 ? orbitTime : elapsed) * axialSpeeds[i] + i * 0.31,
        0,
      );
      if (i === 3) {
        earthArrivalPose(
          orbitTime * axialSpeeds[3] + 3 * 0.31,
          smooth(2.25, 2.94, p),
          bodies[i].userData.body.quaternion,
        );
      }
    });
    const moonAngle = elapsed * moonAngularSpeed + 2.4;
    const lunarPose = moonPose(moonAngle, mobile);
    moon.position.copy(earth.position).add(lunarPose.position);
    moon.quaternion.copy(lunarPose.rotation);
    moon.scale.setScalar(0.19 * smooth(2.25, 2.55, p));
    moon.visible = p > 2.25 && p < 3.65;
    host.dataset.moonAngle = moonAngle.toFixed(4);
    if (bodies[3].userData.clouds)
      bodies[3].userData.clouds.quaternion.copy(
        bodies[3].userData.body.quaternion,
      );
    const heroSun = earth.position
      .clone()
      .add(
        mobile
          ? new THREE.Vector3(-3.7, 2.65, -23)
          : new THREE.Vector3(-8.7, 3.8, -18),
      );
    planets[0].position.lerp(heroSun, focus);
    sunLight.position.copy(planets[0].position);
    const solarDistance =
      (solarExtent * Math.max(1, 1 / camera.aspect)) /
      Math.tan(THREE.MathUtils.degToRad(21));
    const cosmicOffset = cosmicCameraOffset(camera.aspect);
    cosmos.position.z = cosmicOffset;
    solarCamera.set(0, 0, solarDistance);
    if (p < 1.56) {
      const travel = smooth(1.05, 1.56, p);
      solarCamera.set(
        Math.sin(travel * Math.PI * 2) * 9 * (1 - travel),
        Math.sin(travel * Math.PI) * 5,
        mix(350 + cosmicOffset, solarDistance, travel),
      );
    }
    const offset = (mobile ? 0.85 : -1.08) * (1 - smooth(2.82, 3.23, p));
    // Fit the complete lunar orbit, including the near-side Moon, before diving.
    // Otherwise its dark limb can leave the viewport and resemble a phase change.
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(21));
    const tanHalfWidth = tanHalfFov * camera.aspect;
    const lunarHorizontalExtent = mobile
      ? 0.734 + tanHalfWidth * 1.309
      : Math.hypot(1.5, tanHalfWidth * 1.026);
    const orbitDistance =
      (lunarHorizontalExtent +
        (mobile ? 0 : 1.08) +
        0.19 * Math.hypot(1, tanHalfWidth) +
        0.35) /
      tanHalfWidth;
    const closeupDistance = Math.max((mobile ? 4.9 : 3.7) * 1.1, orbitDistance);
    const distance = Math.exp(
      mix(Math.log(closeupDistance), Math.log(sizes[3] * 1.02125), dive),
    );
    earthCamera
      .copy(earth.position)
      .add(
        new THREE.Vector3(
          mobile ? 0 : offset,
          mobile ? offset : 0.16 * (1 - dive),
          distance,
        ),
      );
    earthTarget
      .copy(earth.position)
      .add(new THREE.Vector3(mobile ? 0 : offset, mobile ? offset : 0, 0));
    position.copy(solarCamera).lerp(earthCamera, focus);
    target.set(0, 0, 0).lerp(earthTarget, focus);
    if (p >= 3.76) {
      const descent = descentPose(p, mobile);
      position.copy(descent.position);
      target.copy(descent.target);
    }
    const parallaxWeight =
      smooth(1.53, 1.8, p) * (1 - smooth(2.9, 3.3, p)) + parkAmount * 0.7;
    // Mouse, touch and tilt share the same scene gate. Calibrate the phone
    // when movement starts, rather than when Welcome permission is granted.
    interactions.setParallaxEnabled(parallaxWeight > 0);
    if (parallaxWeight === 0) parallax.set(0, 0);
    else if (!paused) {
      parallax.lerp(interactions.parallax, 1 - Math.exp(-dt * 3));
    }
    target.x += parallax.x * 2.1 * smooth(1.53, 1.8, p) * (1 - focus);
    target.y += parallax.y * 1.35 * smooth(1.53, 1.8, p) * (1 - focus);
    // In the close-up, aim as well as translate so looking toward the Sun
    // visibly changes its angle to the lens (mouse and device tilt alike).
    target.x += parallax.x * (mobile ? 0.25 : 0.65) * focus * parallaxWeight;
    target.y += parallax.y * (mobile ? 0.2 : 0.45) * focus * parallaxWeight;
    position.x += parallax.x * 0.32 * parallaxWeight;
    position.y += parallax.y * 0.24 * parallaxWeight;
    const nearPlane = p >= 3.76 ? 0.25 : 0.012;
    if (camera.near !== nearPlane) {
      camera.near = nearPlane;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(position);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    sunlight.visible = p > 2.1 && p < 3.52;
    sunlight.scale.setScalar(mobile ? 10 : 15);
    sunlight.position.copy(planets[0].position);
    // The visible Sun travels up-left as the camera dives into the lit surface.
    const sunTravel = smooth(2.96, 3.52, p);
    sunlight.position.add(
      new THREE.Vector3(-10, 7, 12).multiplyScalar(sunTravel),
    );
    // Recede along the same viewing ray, matching the retained glare core.
    const retreat = smooth(2.02, 2.55, p);
    const retreatFactor = mix(
      1,
      sizes[0] / ((mobile ? 10 : 15) * 0.028),
      retreat,
    );
    if (p > 2.02)
      planets[0].position
        .sub(camera.position)
        .multiplyScalar(retreatFactor)
        .add(camera.position);
    sunLight.position.copy(planets[0].position);
    if (focus > 0) {
      // A fixed world-space direction prevents the terminator following the
      // mouse. Only the deliberate Sun travel during the dive changes it.
      const lightDirection = earthSunDirection(sunTravel);
      const current = sunLight.position.clone().sub(earth.position);
      const distance = mix(current.length(), 1000, focus);
      current.normalize().lerp(lightDirection, focus).normalize();
      sunLight.position.copy(earth.position).addScaledVector(current, distance);
    }
    bodies.forEach((body) => body.userData.setSunPosition(sunLight.position));
    // Compose the same phase relative to the Moon's own viewing direction.
    // Its changing orbit otherwise alters the visible phase despite Earth
    // retaining a 70/30 split under the same distant light.
    const moonView = camera.position.clone().sub(moon.position).normalize();
    const moonDirection = sunlight.position.clone().sub(moon.position);
    moonDirection
      .addScaledVector(moonView, -moonDirection.dot(moonView))
      .normalize();
    moonDirection
      .multiplyScalar(Math.sqrt(1 - 0.4 ** 2))
      .addScaledVector(moonView, 0.4);
    moonLightingPosition
      .copy(moon.position)
      .addScaledVector(moonDirection, 1000);
    moonBody.userData.setSunPosition(moonLightingPosition);
    sunlight.quaternion.copy(camera.quaternion);
    const sunView = sunlight.position
      .clone()
      .applyMatrix4(camera.matrixWorldInverse);
    const offAxis = Math.atan2(Math.hypot(sunView.x, sunView.y), -sunView.z);
    const glareAngle = smooth(0, 0.65, offAxis);
    sunlight.material.uniforms.uStretch.value = mix(0.18, 1.12, glareAngle);
    sunlight.material.uniforms.uRayStrength.value = mix(0.06, 1, glareAngle);
    sunlight.material.uniforms.uOpacity.value =
      smooth(2.1, 2.55, p) * (1 - smooth(3.1, 3.52, p));
    bodies[0].userData.body.visible = p < 2.58;
    bodies[0].userData.body.material.transparent = true;
    bodies[0].userData.body.material.opacity = 1 - smooth(2.18, 2.58, p);
    bodies[0].children[1].visible = p < 2.35;
    scene.background
      .copy(black)
      .lerp(
        skyBlue
          .clone()
          .lerp(new THREE.Color("#163656"), 1 - smooth(3.76, 4.98, p)),
        skyAmount,
      )
      .lerp(parkSky, parkAmount);
    if (skyAmount > 0.01) {
      if (!scene.fog) scene.fog = new THREE.Fog(scene.background, 24, 110);
      scene.fog.color.copy(scene.background);
      const landing = smooth(5.26, 5.86, p);
      scene.fog.near = mix(100, 65, landing);
      scene.fog.near = p > 4.88 ? mix(20, 65, smooth(4.88, 5.12, p)) : 100;
      scene.fog.far = p > 4.88 ? mix(60, 1150, smooth(4.88, 5.18, p)) : 520;
    } else scene.fog = null;
    hemi.intensity = mix(mix(0.07, 1.1, skyAmount), 1.1, parkAmount);
    key.intensity = mix(mix(0, 2.2, skyAmount), 2.8, parkAmount);
    key.color.set("#fff0d5").lerp(new THREE.Color("#ffd1a1"), parkAmount);
    parkFill.intensity = parkAmount * 0.8;
    parkRim.intensity = parkAmount * 1.6;
    sunLight.intensity = 2.3 * (1 - skyAmount);
    activity.visible = p < 2.35;
    activity.userData.update(
      elapsed,
      planets[0].position,
      planets[0].scale.x,
      smooth(1.53, 1.6, p) * (1 - smooth(2.1, 2.35, p)),
      camera.aspect,
    );
    starMesh.userData.update(elapsed);
    key.castShadow = p > 5.45;
    renderer.shadowMap.enabled = p > 5.45;
    skyGroup.visible = p > 3.63 && p < 5.03;
    clouds.visible = p < 5.03;
    cloudField.userData.setOpacity(1 - smooth(4.86, 5.03, p));
    if (skyGroup.visible && clouds.visible)
      cloudField.userData.update(elapsed, 0);
    const flight = THREE.MathUtils.clamp((p - 4) / 0.87, 0, 0.99999) * 4,
      index = Math.floor(flight),
      local = flight - index;
    host.dataset.aircraft = p >= 4 && p < 4.88 ? aircraftTypes[index].id : "";
    fleet.forEach((plane, i) => {
      if (!plane) return;
      plane.visible = p >= 4 && p < 4.87 && index === i;
      if (!plane.visible) return;
      const pose = aircraftPose(p, i, flightPaths[i], mobile);
      plane.position.copy(pose.position);
      plane.quaternion.copy(pose.rotation);
      plane.scale.setScalar(pose.scale);
    });
    descentEffects.visible = p > 3.9 && p < 4.94;
    if (descentEffects.visible)
      descentEffects.userData.update(p, elapsed, flightPaths);
    const activePlane = p >= 4 && p < 4.87 ? fleet[index] : null;
    skyGroup.updateMatrixWorld(true);
    if (activePlane && skyGroup.visible)
      cloudField.userData.setWake(
        activePlane.getWorldPosition(new THREE.Vector3()),
        flightPaths[index].getTangent(local),
        4,
      );
    else cloudField.userData.setWake(null);
    host.dataset.explosion = String(p > 0.5 && p < 1.02);
    host.dataset.cosmicStage =
      p < 0.68
        ? "hot-dense"
        : p < 0.9
          ? "expansion"
          : p < 1.21
            ? "formation"
            : p < 1.53
              ? "galaxies"
              : "solar";
    host.dataset.cameraHeight = camera.position.y.toFixed(2);
    host.dataset.moon = String(moon.visible);
    host.dataset.clouds = String(skyGroup.visible && clouds.visible);
    host.dataset.earthLocked = String(p >= 2.94 && p < 3.76);
    host.dataset.journey = cosmos.visible
      ? "galaxies"
      : skyGroup.visible
        ? "sky"
        : solar.visible
          ? "solar"
          : "bang";
    interactions.update(dt);
    onFrame?.({ phase: p, focus, dive, parkAmount });
    // GSAP passes a numeric frame counter as the third ticker argument.
    if (prepareOnly !== true) renderer.render(scene, camera);
  }
  gsap.ticker.add(render);

  host.dataset.assetFailures = assets.failures.join(",");
  return {
    resize,
    async warmup() {
      const wasPaused = paused;
      gsap.ticker.remove(render);
      paused = true;
      try {
        // Exercise the actual chapter states, without moving the document.
        for (const p of [
          0, 0.6, 0.85, 1.15, 1.4, 1.8, 2.5, 3.3, 3.8, 4.1, 4.4, 4.7, 4.9,
        ]) {
          this.setPhase(p);
          dirty = true;
          render(0, 0, true);
          await renderer.compileAsync(scene, camera);
          renderer.render(scene, camera);
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      } finally {
        this.setPhase(0);
        dirty = true;
        render(0, 0);
        paused = wasPaused;
        gsap.ticker.add(render);
      }
    },
    setPhase(value) {
      const nextPixelSky = value >= 3.65;
      if (nextPixelSky !== pixelSky) {
        pixelSky = nextPixelSky;
        resize();
      }
      if (Math.abs(phase - value) > 0.00001) invalidate();
      phase = value;
      host.dataset.phase = value.toFixed(4);
    },
    setPaused(value) {
      paused = value;
      interactions.setSuspended(value);
      invalidate();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      gsap.ticker.remove(render);
      interactions.dispose();
      descentEffects.userData.dispose();
      cloudField.userData.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      const geometries = new Set(),
        materials = new Set(),
        textures = new Set(Object.values(assets.textures));
      scene.traverse((o) => {
        if (o.isInstancedMesh) o.dispose();
        if (o.geometry) geometries.add(o.geometry);
        if (o.material)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(
            (m) => {
              materials.add(m);
              Object.values(m.uniforms ?? {}).forEach((uniform) => {
                if (uniform.value?.isTexture) textures.add(uniform.value);
              });
              Object.values(m).forEach((v) => {
                if (v?.isTexture) textures.add(v);
              });
            },
          );
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
