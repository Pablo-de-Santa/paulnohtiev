// Orientation is calibrated to the user's current hold, then mapped into the
// same normalized input as a mouse. Native page scrolling remains untouched.
export function createDeviceTilt(
  parallax,
  { invalidate, isSuspended, isEnabled = () => true },
) {
  const abort = new AbortController(),
    options = { signal: abort.signal, passive: true };
  const api = window.DeviceOrientationEvent,
    welcome = document.querySelector("#welcome-copy");
  let baseline = null,
    active = false,
    attempted = false,
    touch = null;
  const reset = () => {
    baseline = null;
    active = false;
    touch = null;
  };
  function orient(event) {
    if (!isEnabled() || isSuspended() || document.hidden) {
      reset();
      return;
    }
    if (
      typeof event.beta !== "number" ||
      typeof event.gamma !== "number" ||
      !Number.isFinite(event.beta + event.gamma)
    )
      return;
    if (!baseline) baseline = { beta: event.beta, gamma: event.gamma };
    const delta = (v) => ((v + 540) % 360) - 180;
    const b = delta(event.beta - baseline.beta),
      g = delta(event.gamma - baseline.gamma);
    const angle =
      ((screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI) / 180;
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    parallax.set(
      clamp((g * Math.cos(angle) + b * Math.sin(angle)) / 18),
      clamp((-b * Math.cos(angle) + g * Math.sin(angle)) / 18),
    );
    active = true;
    invalidate();
  }
  function listen() {
    window.addEventListener("deviceorientation", orient, options);
  }
  function clearPrompt() {
    if (!welcome) return;
    welcome.removeAttribute("role");
    welcome.removeAttribute("tabindex");
    welcome.removeAttribute("aria-label");
    welcome.removeAttribute("title");
  }
  async function enable() {
    if (attempted || isSuspended()) return;
    attempted = true;
    try {
      if (
        (await api.requestPermission()) === "granted" &&
        !abort.signal.aborted
      )
        listen();
    } catch {
      /* Touch navigation remains available. */
    }
    clearPrompt();
  }
  if (window.isSecureContext && api) {
    if (typeof api.requestPermission === "function" && welcome) {
      welcome.setAttribute("role", "button");
      welcome.tabIndex = 0;
      welcome.setAttribute("aria-label", "Welcome. Enable device tilt");
      welcome.title = "Enable device tilt";
      welcome.addEventListener("click", enable, { signal: abort.signal });
      welcome.addEventListener(
        "keydown",
        (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            enable();
          }
        },
        { signal: abort.signal },
      );
    } else listen();
  }
  window.addEventListener("orientationchange", reset, options);
  screen.orientation?.addEventListener("change", reset, options);
  document.addEventListener("visibilitychange", reset, options);
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "touch" && isEnabled())
        touch = { x: e.clientX, start: parallax.x };
    },
    options,
  );
  document.addEventListener(
    "pointermove",
    (e) => {
      if (
        e.pointerType !== "touch" ||
        !touch ||
        active ||
        !isEnabled() ||
        isSuspended()
      )
        return;
      parallax.x = Math.max(
        -1,
        Math.min(1, touch.start + ((e.clientX - touch.x) / innerWidth) * 2),
      );
      invalidate();
    },
    options,
  );
  document.addEventListener(
    "pointerup",
    () => {
      touch = null;
    },
    options,
  );
  document.addEventListener(
    "pointercancel",
    () => {
      touch = null;
    },
    options,
  );
  return {
    reset,
    dispose() {
      abort.abort();
      clearPrompt();
    },
  };
}
