const chargeTime = 1100;
const doubleTapTime = 320;
const quickTapTime = 180;
const minimumPower = 0.08;

export function createFetchControls({ ui, canvas, fetch, canUse, syncLook, signal }) {
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
  aim.innerHTML = '<div class="fetch-power" role="progressbar" aria-label="Throw power" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden></div><span class="fetch-aim-dot" aria-hidden="true"></span>';
  ui.append(tools, aim);
  const instructions = tools.querySelector(".fetch-instructions");
  const meter = aim.querySelector(".fetch-power");
  const throwButton = tools.querySelector(".fetch-throw");
  const opts = { signal };
  const touch = matchMedia("(pointer: coarse)");
  let press = null;
  let tap = null;
  let shown = false;
  let meterPercent = 0;

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
    showPower(0);
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
  function throwBall(power) {
    if (!available()) return;
    syncLook();
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
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, at: now, target: e.currentTarget, double, moved: false };
    if (e.currentTarget === throwButton) throwButton.setPointerCapture(e.pointerId);
  }
  function movePointer(e) {
    if (press?.id !== e.pointerId) return;
    if (e.button === 2 && (e.buttons & 2)) {
      squeak();
      return;
    }
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10)
      press.moved = true;
  }
  function releasePointer(e) {
    if (press?.id !== e.pointerId) return;
    const { at, double, target, moved } = press;
    press = null;
    if (!available()) return;
    const now = performance.now();
    const duration = now - at;
    if (!moved && duration < quickTapTime && double) {
      squeak();
    } else if (!moved && duration < quickTapTime) {
      const timer = setTimeout(() => {
        tap = null;
        throwBall(powerAt(duration));
      }, doubleTapTime);
      tap = { timer, at: now, x: e.clientX, y: e.clientY, target };
    } else {
      throwBall(powerAt(duration));
    }
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
    reset();
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
    instructions.textContent = touch.matches
      ? "Hold to build power. Drag to aim, then release to throw. Double-tap to squeak."
      : "Hold the mouse button or F to build power. Drag to aim, then release to throw. Right-click or double-click to squeak.";
  }
  touch.addEventListener("change", updateInstructions, opts);
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
    },
  };
}
