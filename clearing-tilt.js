import * as THREE from "./vendor/three.module.min.js";
// Small camera offsets only in seated mode. Device permission is requested
// by the site's existing Welcome control; this listener never prompts again.
export function createClearingTilt(enabled) {
  const input = new THREE.Vector2(),
    value = new THREE.Vector2(),
    abort = new AbortController();
  let base = null;
  const opts = { signal: abort.signal, passive: true };
  window.addEventListener(
    "pointermove",
    (e) => {
      if (enabled() && e.pointerType !== "touch")
        input.set(
          (e.clientX / innerWidth) * 2 - 1,
          1 - (e.clientY / innerHeight) * 2,
        );
    },
    opts,
  );
  window.addEventListener(
    "deviceorientation",
    (e) => {
      if (!enabled()) {
        base = null;
        return;
      }
      if (!Number.isFinite(e.beta) || !Number.isFinite(e.gamma)) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      const angle = ((screen.orientation?.angle ?? 0) * Math.PI) / 180,
        db = ((e.beta - base.b + 540) % 360) - 180,
        dg = ((e.gamma - base.g + 540) % 360) - 180;
      input.set(
        THREE.MathUtils.clamp(
          (dg * Math.cos(angle) + db * Math.sin(angle)) / 20,
          -1,
          1,
        ),
        THREE.MathUtils.clamp(
          (-db * Math.cos(angle) + dg * Math.sin(angle)) / 20,
          -1,
          1,
        ),
      );
    },
    opts,
  );
  window.addEventListener(
    "orientationchange",
    () => {
      base = null;
      input.set(0, 0);
    },
    opts,
  );
  return {
    update(dt) {
      if (!enabled()) {
        input.set(0, 0);
        base = null;
      }
      value.lerp(input, 1 - Math.exp(-dt * 4));
      return value;
    },
    dispose() {
      abort.abort();
    },
  };
}
