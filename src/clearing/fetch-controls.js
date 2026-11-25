import { Vector3 } from "../../vendor/three.module.min.js";

const chargeTime = 1100;
const doubleTapTime = 320;
const quickTapTime = 180;
const dragThreshold = 10;
const minimumPower = 0.08;
const cancelDown = -Math.sin(50 * Math.PI / 180);
const resumeUp = -Math.sin(44 * Math.PI / 180);

export function createFetchControls({
  ui, canvas, camera, fetch, canUse, syncLook, hideKeyboardHints, onCancel, signal,
}) {
  const tools = document.createElement("div");
  tools.className = "fetch-tools";
  tools.hidden = true;
  tools.innerHTML = `
    <p class="fetch-instructions"></p>
    <div class="fetch-buttons">
      <button type="button" class="fetch-throw">Throw ball</button>
      <button type="button" class="fetch-squeak">Squeak ball</button>
      <button type="button" class="fetch-drop">Drop ball</button>
    </div>`;
  const aim = document.createElement("div");
  aim.className = "fetch-aim";
  aim.hidden = true;
  aim.innerHTML = `
    <div class="fetch-power" role="progressbar" aria-label="Throw power" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden></div>
    <span class="fetch-aim-dot" aria-hidden="true"></span>`;
  const cancelCue = document.createElement("div");
  cancelCue.className = "fetch-cancel";
  cancelCue.setAttribute("role", "status");
  const cancelLabel = document.createElement("span");
  cancelLabel.className = "fetch-cancel-label";
  cancelCue.append(cancelLabel);
  ui.append(tools, aim, cancelCue);
  const instructions = tools.querySelector(".fetch-instructions");
  const meter = aim.querySelector(".fetch-power");
  const throwButton = tools.querySelector(".fetch-throw");
  const opts = { signal };
  const direction = new Vector3();
  let press = null;
  let tap = null;
  let shown = false;
  let lookingDown = false;
  let meterPercent = 0;
  let cancelBounds = null;
  let cueVisible = false;
  let cueArmed = false;

  const available = () => fetch.held && canUse();
  const powerAt = (ms) => Math.max(minimumPower, Math.min(1, ms / chargeTime));
  function clearTap() {
    if (!tap) return;
    clearTimeout(tap.timer);
    tap = null;
  }
  function reset() {
    press = null;
    clearTap();
    lookingDown = false;
    cancelBounds = null;
    showCancelCue(false);
    showPower(0);
  }
  function showCancelCue(visible, armed = false) {
    if (cueVisible === visible && cueArmed === armed) return;
    cueVisible = visible;
    cueArmed = armed;
    ui.classList.toggle("fetch-charging", visible);
    cancelCue.toggleAttribute("data-armed", armed);
    if (visible) {
      const direction = press.id === "keyboard" ? "Look down" : "Drag here";
      cancelLabel.textContent = armed ? "Release to cancel" : `${direction} and release to cancel`;
    }
  }
  function showPower(percent) {
    if (percent === meterPercent) return;
    meterPercent = percent;
    meter.hidden = percent === 0;
    meter.style.setProperty("--throw-power", `${percent}%`);
    meter.setAttribute("aria-valuenow", percent);
  }
  function squeak() {
    if (!available()) return;
    reset();
    fetch.squeak();
  }
  function aimsDown() {
    lookingDown = camera.getWorldDirection(direction).y <= (lookingDown ? resumeUp : cancelDown);
    return lookingDown;
  }
  function wasDragged(gesture, x, y) {
    return Math.hypot(x - gesture.x, y - gesture.y) > dragThreshold;
  }
  function isOverCancelTarget(gesture, x, y) {
    if (gesture.id === "keyboard" || !wasDragged(gesture, x, y)) return false;
    cancelBounds ??= cancelCue.getBoundingClientRect();
    const { left, right, top, bottom } = cancelBounds;
    const contains = (x, y) => x >= left && x <= right && y >= top && y <= bottom;
    // A throw started on a low button can still be aimed sideways.
    return contains(x, y) && (!contains(gesture.x, gesture.y) || y - gesture.y > dragThreshold);
  }
  function cancelThrow() {
    reset();
    onCancel();
  }
  function cancelIfLookingDown() {
    if (!aimsDown()) return false;
    cancelThrow();
    return true;
  }
  function throwBall(power) {
    if (!available()) return;
    syncLook();
    if (cancelIfLookingDown()) return;
    reset();
    fetch.throwBall(power);
  }

  function startPointer(e) {
    if (!available()) return;
    if (e.button === 2) {
      e.preventDefault();
      squeak();
      return;
    }
    if (e.button !== 0 || !e.isPrimary || press) return;
    const now = performance.now();
    const double = tap && now - tap.at <= doubleTapTime &&
      tap.target === e.currentTarget && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 44;
    clearTap();
    press = {
      id: e.pointerId, x: e.clientX, y: e.clientY, at: now,
      clientX: e.clientX, clientY: e.clientY, target: e.currentTarget, double, moved: false,
    };
    if (e.currentTarget === throwButton) throwButton.setPointerCapture(e.pointerId);
  }
  function movePointer(e) {
    if (press?.id !== e.pointerId) return;
    if (e.button === 2 && (e.buttons & 2)) {
      squeak();
      return;
    }
    press.clientX = e.clientX;
    press.clientY = e.clientY;
    press.moved ||= wasDragged(press, e.clientX, e.clientY);
  }
  function releasePointer(e) {
    if (press?.id !== e.pointerId) return;
    const gesture = press;
    const { at, double, target } = gesture;
    const moved = gesture.moved || wasDragged(gesture, e.clientX, e.clientY);
    press = null;
    showCancelCue(false);
    if (!available()) {
      reset();
      return;
    }
    if (isOverCancelTarget(gesture, e.clientX, e.clientY)) {
      cancelThrow();
      return;
    }
    const now = performance.now();
    const duration = now - at;
    if (moved || duration >= quickTapTime) {
      throwBall(powerAt(duration));
      return;
    }
    syncLook();
    if (cancelIfLookingDown()) return;
    if (double) {
      squeak();
      return;
    }
    // A short scene tap can bring back compact controls without throwing the ball.
    const throwsOnTap = target === throwButton || !hideKeyboardHints.matches;
    const timer = throwsOnTap ? setTimeout(() => {
      tap = null;
      throwBall(powerAt(duration));
    }, doubleTapTime) : null;
    tap = { timer, at: now, x: e.clientX, y: e.clientY, target };
  }

  for (const target of [canvas, throwButton]) {
    target.addEventListener("pointerdown", startPointer, opts);
    // Some browsers report a second button only as mousedown during a drag.
    target.addEventListener("mousedown", (e) => {
      if (e.button !== 2 || !press || !available()) return;
      e.preventDefault();
      squeak();
    }, opts);
    target.addEventListener("contextmenu", (e) => {
      if (!available()) return;
      e.preventDefault();
      if (e.button === 2 && press) squeak();
    }, opts);
  }
  window.addEventListener("pointermove", movePointer, opts);
  window.addEventListener("pointerup", releasePointer, opts);
  window.addEventListener("pointercancel", (e) => {
    if (press?.id === e.pointerId) reset();
  }, opts);
  window.addEventListener("blur", reset, opts);
  window.addEventListener("resize", () => { cancelBounds = null; }, opts);
  document.addEventListener("visibilitychange", reset, opts);
  signal.addEventListener("abort", reset, { once: true });
  window.addEventListener("keydown", (e) => {
    if (e.code !== "KeyF" || !available()) return;
    e.preventDefault();
    if (e.repeat || press) return;
    clearTap();
    press = { id: "keyboard", at: performance.now() };
  }, opts);
  window.addEventListener("keyup", (e) => {
    if (e.code !== "KeyF" || press?.id !== "keyboard") return;
    const { at } = press;
    throwBall(powerAt(performance.now() - at));
  }, opts);
  throwButton.addEventListener("click", (e) => {
    if (e.detail === 0) throwBall(minimumPower);
  }, opts);
  tools.querySelector(".fetch-squeak").addEventListener("click", squeak, opts);
  tools.querySelector(".fetch-drop").addEventListener("click", () => {
    if (!available()) return;
    reset();
    fetch.drop();
  }, opts);

  function updateInstructions() {
    const charge = hideKeyboardHints.matches ? "Hold to build power." : "Hold the mouse button or F to build power.";
    instructions.textContent = `${charge} Drag to aim and release to throw. Look down and release to cancel.`;
  }
  hideKeyboardHints.addEventListener("change", updateInstructions, opts);
  updateInstructions();

  return {
    reset,
    update() {
      const ready = available();
      if (ready !== shown) {
        shown = ready;
        tools.hidden = aim.hidden = !ready;
        ui.classList.toggle("holding-ball", ready);
        if (!ready) reset();
      }
      if (!ready) return;
      const duration = press ? performance.now() - press.at : 0;
      showPower(duration < 100 ? 0 : Math.round(powerAt(duration) * 100));
      const armed = Boolean(press && (aimsDown() || isOverCancelTarget(press, press.clientX, press.clientY)));
      showCancelCue(Boolean(press && (armed || press.moved || duration >= 100)), armed);
    },
  };
}
