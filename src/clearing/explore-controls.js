import { cabinWalkable, cabinFloor, doorPanelBlocks } from "./cabin.js";
import * as THREE from "../../vendor/three.module.min.js";

export const compactExploreQuery =
  "(max-width: 600px), (pointer: coarse) and (max-height: 600px)";
const hudIdleDelay = 3000;

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
  bindButton = true,
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
  const compactScreen = matchMedia(compactExploreQuery);
  const touchScreen = matchMedia("(pointer: coarse)");
  const activePointers = new Set();
  let hudIdleAt = 0;
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
  function resetHud() {
    activePointers.clear();
    hudIdleAt = 0;
    document.body.classList.remove("explore-hud-idle");
  }
  function showHud() {
    if (!active || returning || !compactScreen.matches) return;
    if (!hudIdleAt) document.body.classList.remove("explore-hud-idle");
    hudIdleAt = performance.now() + hudIdleDelay;
  }
  function onCompactScreenChange() {
    resetHud();
    if (help.hidden) showHud();
    else showHelp();
  }
  function startHudPointer(e) {
    if (!active || returning || !compactScreen.matches) return;
    activePointers.add(e.pointerId);
    showHud();
  }
  function endHudPointer(e) {
    if (activePointers.delete(e.pointerId)) showHud();
  }
  function moveHudPointer(e) {
    if (e.pointerType === "mouse") showHud();
  }
  function resetInput() {
    clean();
    activePointers.clear();
    showHud();
  }
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
    resetHud();
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
    help.textContent = touchScreen.matches
      ? "Drag the left joystick to walk · Drag the scene to look around"
      : compactScreen.matches
        ? "Drag the scene to look around"
        : "WASD or arrow keys to move · Drag the scene to look around";
    help.hidden = false;
    helpUntil = performance.now() + 3000;
    showHud();
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
    showHud();
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
  if (bindButton) button.addEventListener("click", enter);
  exitButton.addEventListener("click", exit);
  function down(e) {
    showHud();
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
    if (keys.delete(e.code)) showHud();
  }
  function startLook(e) {
    if (!active || entry || returning || locked || look || e.button !== 0) return;
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
    if (look?.id !== e.pointerId) return;
    if (e.type === "pointerup") moveLook(e);
    look = null;
  }
  function syncLook() {
    if (!active || entry || returning || locked) return;
    const rotation = camera.rotation;
    if (rotation.x !== pitch || rotation.y !== yaw || rotation.z !== 0)
      rotation.set(pitch, yaw, 0);
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
    [window, "blur", resetInput],
    [window, "focusin", showHud],
    [document, "visibilitychange", resetInput],
    [compactScreen, "change", onCompactScreenChange],
    [window, "pointerdown", startHudPointer, true],
    [window, "pointermove", moveHudPointer, true],
    [window, "pointerup", endHudPointer, true],
    [window, "pointercancel", endHudPointer, true],
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
  listeners.forEach(([o, n, f, capture]) => o.addEventListener(n, f, capture));
  return {
    canvas,
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
    enter,
    exit,
    showHud,
    syncLook,
    setLocked(value) {
      locked = value;
      clean();
      if (!locked) showHud();
    },
    resize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    },
    update(dt) {
      if (!active) return;
      if (helpUntil || hudIdleAt) {
        const now = performance.now();
        if (helpUntil && now >= helpUntil) {
          help.hidden = true;
          helpUntil = 0;
        }
        if (
          !entry && !returning && hudIdleAt && now >= hudIdleAt &&
          !keys.size && !activePointers.size
        ) {
          hudIdleAt = 0;
          document.body.classList.add("explore-hud-idle");
        }
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
      if (length > 0) {
        const distance = Math.min(dt, 0.05) * 2.6;
        const dx = (x * Math.cos(yaw) + z * Math.sin(yaw)) * distance;
        const dz = (-x * Math.sin(yaw) + z * Math.cos(yaw)) * distance;
        const trees = getTrees(), doorAngle = getDoorAngle(), doorOpen = getDoorOpen();
        const position = camera.position;
        if (
          dx && !doorPanelBlocks(position.x + dx, position.z, doorAngle) &&
          canWalkAt(position.x + dx, position.z, trees, doorOpen)
        )
          position.x += dx;
        if (
          dz && !doorPanelBlocks(position.x, position.z + dz, doorAngle) &&
          canWalkAt(position.x, position.z + dz, trees, doorOpen)
        )
          position.z += dz;
        if (
          position.x + dx < -11 || position.x + dx > 11 ||
          position.z + dz < -9 || position.z + dz > 11
        )
          onBoundary();
      }
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        1.7 + cabinFloor(camera.position.x, camera.position.z),
        12,
        dt,
      );
      syncLook();
      const walkX = camera.position.x.toFixed(3), walkZ = camera.position.z.toFixed(3);
      if (canvas.dataset.walkX !== walkX) canvas.dataset.walkX = walkX;
      if (canvas.dataset.walkZ !== walkZ) canvas.dataset.walkZ = walkZ;
    },
    dispose() {
      finishExit();
      listeners.forEach(([o, n, f, capture]) => o.removeEventListener(n, f, capture));
      if (bindButton) button.removeEventListener("click", enter);
      ui.remove();
    },
  };
}
