import { cabinWalkable, cabinFloor, doorPanelBlocks } from "./cabin.js";
import * as THREE from "./vendor/three.module.min.js";
export function canWalkAt(x, z, trees = [], doorOpen = false) {
  if (x < -11 || x > 11 || z < -9 || z > 11) return false;
  if (((x + 7) / 5.8) ** 2 + ((z - 4.5) / 3.8) ** 2 < 1) return false;
  if (!cabinWalkable(x, z, doorOpen)) return false;
  if (
    Math.hypot(x - 4.1, z - 2.8) < 1.35 ||
    Math.hypot(x - 1.5, z + 0.35) < 0.9
  )
    return false;
  return !trees.some((t) => Math.hypot(x - t.x, z - t.z) < t.radius + 0.3);
}
export function createExploreControls({
  canvas,
  button,
  getObservationCamera = () => null,
  getTrees = () => [],
  getDoorAngle = () => null,
  onBoundary = () => {},
  onChange = () => {},
  getDoorOpen = () => false,
}) {
  const camera = new THREE.PerspectiveCamera(
    62,
    innerWidth / innerHeight,
    0.08,
    200,
  );
  let locked = false,
    entry = null,
    returning = null,
    helpUntil = 0,
    savedScroll = { x: 0, y: 0 };
  let active = false,
    yaw = 0,
    pitch = -0.05,
    look = null,
    joy = null,
    savedOverflow = "",
    savedFocus;
  const copyInert = new Map();
  const keys = new Set(),
    stick = new THREE.Vector2();
  const ui = document.createElement("div");
  ui.className = "explore-ui";
  ui.hidden = true;
  ui.innerHTML =
    '<button type="button" class="explore-exit">Exit exploration</button><div class="explore-stick" role="group" aria-label="Drag to walk"><span></span></div><p class="explore-help" role="status" hidden></p>';
  document.body.append(ui);
  const exitButton = ui.querySelector("button"),
    pad = ui.querySelector(".explore-stick"),
    knob = pad.firstElementChild,
    help = ui.querySelector(".explore-help");
  const clean = () => {
    keys.clear();
    stick.set(0, 0);
    joy = null;
    look = null;
    knob.style.transform = "translate(0px,0px)";
  };
  function finishExit() {
    if (!active) return;
    active = false;
    entry = null;
    returning = null;
    helpUntil = 0;
    help.hidden = true;
    canvas.dataset.entering = "false";
    canvas.dataset.exiting = "false";
    clean();
    ui.hidden = true;
    document.body.classList.remove("exploring");
    copyInert.forEach((value, element) => {
      element.inert = value;
    });
    copyInert.clear();
    document.body.style.overflow = savedOverflow;
    window.scrollTo({
      left: savedScroll.x,
      top: savedScroll.y,
      behavior: "instant",
    });
    button.setAttribute("aria-pressed", "false");
    onChange(false);
    savedFocus?.focus({ preventScroll: true });
  }
  function showHelp() {
    help.textContent = matchMedia("(pointer: coarse)").matches
      ? "Drag the left joystick to walk · Drag the scene to look around"
      : "WASD or arrow keys to move · Drag the scene to look around";
    help.hidden = false;
    helpUntil = performance.now() + 3000;
  }
  function exit({ immediate = false } = {}) {
    if (!active) return;
    if (immediate) {
      finishExit();
      return;
    }
    if (returning) return;
    const target = getObservationCamera();
    if (!target || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishExit();
      return;
    }
    entry = null;
    clean();
    help.hidden = true;
    helpUntil = 0;
    ui.hidden = true;
    returning = {
      t: 0,
      position: camera.position.clone(),
      rotation: camera.quaternion.clone(),
      projection: camera.projectionMatrix.clone(),
    };
    canvas.dataset.entering = "false";
    canvas.dataset.exiting = "true";
  }
  function enter() {
    if (active) return;
    active = true;
    locked = false;
    savedFocus = document.activeElement;
    savedScroll = { x: window.scrollX, y: window.scrollY };
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("exploring");
    document
      .querySelectorAll(
        "#contact-copy, #pixel-copy, #earth-copy, #welcome-copy",
      )
      .forEach((element) => {
        copyInert.set(element, element.inert);
        element.inert = true;
      });
    ui.hidden = false;
    button.setAttribute("aria-pressed", "true");
    camera.position.set(0, 1.7, 7);
    yaw = 0;
    pitch = -0.06;
    clean();
    const source = getObservationCamera();
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);
    camera.fov = 62;
    if (source && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      entry = {
        t: 0,
        position: source.position.clone(),
        rotation: source.quaternion.clone(),
        end: camera.quaternion.clone(),
        fov: source.isOrthographicCamera
          ? THREE.MathUtils.radToDeg(
              2 *
                Math.atan(
                  (source.top - source.bottom) /
                    source.zoom /
                    2 /
                    source.position.distanceTo(new THREE.Vector3(1, 1.5, 0)),
                ),
            )
          : source.fov,
      };
      camera.position.copy(entry.position);
      camera.quaternion.copy(entry.rotation);
      camera.fov = entry.fov;
    }
    camera.updateProjectionMatrix();
    canvas.dataset.entering = String(!!entry);
    canvas.dataset.exiting = "false";
    if (!entry) showHelp();
    onChange(true);
    exitButton.focus({ preventScroll: true });
  }
  button.addEventListener("click", enter);
  exitButton.addEventListener("click", exit);
  function down(e) {
    if (!active || locked || returning) return;
    if (e.code === "Escape") {
      exit();
      return;
    }
    if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code)) {
      e.preventDefault();
      keys.add(e.code);
    }
  }
  function up(e) {
    keys.delete(e.code);
  }
  function startLook(e) {
    if (!active || entry || returning || locked || e.button > 0) return;
    e.preventDefault();
    look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  }
  function moveLook(e) {
    if (!active || look?.id !== e.pointerId) return;
    yaw -= (e.clientX - look.x) * 0.004;
    pitch = THREE.MathUtils.clamp(
      pitch - (e.clientY - look.y) * 0.004,
      -1.05,
      1.48,
    );
    look.x = e.clientX;
    look.y = e.clientY;
  }
  function endLook(e) {
    if (look?.id === e.pointerId) look = null;
  }
  function updateStick(e) {
    const b = pad.getBoundingClientRect(),
      x = e.clientX - b.left - b.width / 2,
      y = e.clientY - b.top - b.height / 2,
      v = new THREE.Vector2(x, y).clampLength(0, 38);
    stick.copy(v).multiplyScalar(1 / 38);
    knob.style.transform = `translate(${v.x}px,${v.y}px)`;
  }
  function startStick(e) {
    if (!active || entry || returning || locked || joy !== null) return;
    e.preventDefault();
    joy = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    updateStick(e);
  }
  function moveStick(e) {
    if (joy === e.pointerId) updateStick(e);
  }
  function endStick(e) {
    if (joy === e.pointerId) {
      joy = null;
      stick.set(0, 0);
      knob.style.transform = "translate(0px,0px)";
    }
  }
  const listeners = [
    [window, "keydown", down],
    [window, "keyup", up],
    [window, "blur", clean],
    [document, "visibilitychange", clean],
    [canvas, "pointerdown", startLook],
    [canvas, "pointermove", moveLook],
    [canvas, "pointerup", endLook],
    [canvas, "pointercancel", endLook],
    [canvas, "lostpointercapture", endLook],
    [pad, "pointerdown", startStick],
    [pad, "pointermove", moveStick],
    [pad, "pointerup", endStick],
    [pad, "pointercancel", endStick],
    [pad, "lostpointercapture", endStick],
  ];
  listeners.forEach(([o, n, f]) => o.addEventListener(n, f));
  return {
    camera,
    get active() {
      return active;
    },
    get transitioning() {
      return !!entry || !!returning;
    },
    get exiting() {
      return !!returning;
    },
    exit,
    setLocked(value) {
      locked = value;
      clean();
    },
    resize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    },
    update(dt) {
      if (!active) return;
      if (helpUntil && performance.now() >= helpUntil) {
        help.hidden = true;
        helpUntil = 0;
      }
      if (returning) {
        returning.t += dt;
        const u = THREE.MathUtils.smootherstep(returning.t, 0, 1.8),
          target = getObservationCamera();
        if (!target) {
          finishExit();
          return;
        }
        camera.position.lerpVectors(returning.position, target.position, u);
        camera.quaternion.slerpQuaternions(
          returning.rotation,
          target.quaternion,
          u,
        );
        // Blend the projection too: the website uses an orthographic camera.
        // A position/FOV-only return would visibly pop on the final frame.
        for (let i = 0; i < 16; i++)
          camera.projectionMatrix.elements[i] = THREE.MathUtils.lerp(
            returning.projection.elements[i],
            target.projectionMatrix.elements[i],
            u,
          );
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
        if (u === 1) finishExit();
        return;
      }
      if (entry) {
        entry.t += dt;
        const u = THREE.MathUtils.smootherstep(entry.t, 0, 1.8);
        camera.position.lerpVectors(
          entry.position,
          new THREE.Vector3(0, 1.7, 7),
          u,
        );
        camera.quaternion.slerpQuaternions(entry.rotation, entry.end, u);
        camera.fov = THREE.MathUtils.lerp(entry.fov, 62, u);
        camera.updateProjectionMatrix();
        canvas.dataset.entering = String(u < 1);
        if (u === 1) {
          entry = null;
          showHelp();
        }
        return;
      }
      if (locked) return;
      let x =
          stick.x +
          (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
          (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
        z =
          stick.y +
          (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
          (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
      const length = Math.hypot(x, z);
      if (length > 1) {
        x /= length;
        z /= length;
      }
      const distance = Math.min(dt, 0.05) * 2.6,
        dx = (x * Math.cos(yaw) + z * Math.sin(yaw)) * distance,
        dz = (-x * Math.sin(yaw) + z * Math.cos(yaw)) * distance;
      if (
        !doorPanelBlocks(
          camera.position.x + dx,
          camera.position.z,
          getDoorAngle(),
        ) &&
        canWalkAt(
          camera.position.x + dx,
          camera.position.z,
          getTrees(),
          getDoorOpen(),
        )
      )
        camera.position.x += dx;
      if (
        !doorPanelBlocks(
          camera.position.x,
          camera.position.z + dz,
          getDoorAngle(),
        ) &&
        canWalkAt(
          camera.position.x,
          camera.position.z + dz,
          getTrees(),
          getDoorOpen(),
        )
      )
        camera.position.z += dz;
      if (
        (dx || dz) &&
        (camera.position.x + dx < -11 ||
          camera.position.x + dx > 11 ||
          camera.position.z + dz < -9 ||
          camera.position.z + dz > 11)
      )
        onBoundary();
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        1.7 + cabinFloor(camera.position.x, camera.position.z),
        12,
        dt,
      );
      camera.rotation.order = "YXZ";
      camera.rotation.set(pitch, yaw, 0);
      canvas.dataset.walkX = camera.position.x.toFixed(3);
      canvas.dataset.walkZ = camera.position.z.toFixed(3);
    },
    dispose() {
      finishExit();
      listeners.forEach(([o, n, f]) => o.removeEventListener(n, f));
      button.removeEventListener("click", enter);
      ui.remove();
    },
  };
}
