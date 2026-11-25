const lineHeight = 18;
const fineGestureGap = 160;
const wheelSpringRate = 19;
const touchpadSpringRate = 32;
const nativeTargets = "dialog, input, select, textarea, [contenteditable]";
const scrollKeys = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);

function needsNativeScroll(event) {
  for (const node of event.composedPath()) {
    if (node === document.body || node === document.documentElement) break;
    if (!(node instanceof HTMLElement)) continue;
    if (node.matches(nativeTargets)) return true;
    if (node.scrollHeight > node.clientHeight + 1) {
      const { overflowY } = getComputedStyle(node);
      if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") return true;
    }
  }
  return false;
}

export function attachJourneyWheel({ getMaximumScroll, reducedMotion, onMotionChange }) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let frame = 0;
  let moving = false;
  let position = 0;
  let target = 0;
  let velocity = 0;
  let springRate = wheelSpringRate;
  let previousTime = 0;
  let fineUntil = -Infinity;

  function isPageScrollable() {
    return !reducedMotion.matches && !document.hidden &&
      !document.body.classList.contains("exploring") &&
      !document.documentElement.classList.contains("journey-loading");
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!moving) return;
    moving = false;
    onMotionChange(false);
  }

  function advance(time) {
    frame = 0;
    if (!isPageScrollable() || Math.abs(window.scrollY - position) > 2) {
      stop();
      return;
    }

    const elapsed = Math.min(64, Math.max(0, time - previousTime)) / 1000;
    previousTime = time;
    const offset = position - target;
    // A critically damped spring eases into each notch and settles without bouncing.
    const combined = velocity + springRate * offset;
    const decay = Math.exp(-springRate * elapsed);
    const nextOffset = (offset + combined * elapsed) * decay;
    velocity = (velocity - springRate * combined * elapsed) * decay;
    const settled = offset * nextOffset <= 0 ||
      (Math.abs(nextOffset) < 0.65 && Math.abs(velocity) < 12);
    position = settled ? target : target + nextOffset;
    window.scrollTo({ top: position, behavior: "instant" });

    if (settled) stop();
    else frame = requestAnimationFrame(advance);
  }

  window.addEventListener("wheel", (event) => {
    if (
      !isPageScrollable() || !event.cancelable || event.defaultPrevented ||
      event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
    ) {
      stop();
      return;
    }

    const mode = event.deltaMode;
    const { deltaX, deltaY, deltaZ, timeStamp } = event;
    if (mode === WheelEvent.DOM_DELTA_PAGE || deltaZ) {
      stop();
      return;
    }
    const pixelInput = mode === WheelEvent.DOM_DELTA_PIXEL;
    // Wheel events do not identify the device. Fine samples select a faster
    // response for the whole burst, including momentum samples sent by the OS.
    const fineSample = pixelInput && (
      Math.abs(deltaY) < 40 || !Number.isInteger(deltaY) || deltaX !== 0
    );
    const fine = pixelInput && (fineSample || timeStamp < fineUntil);
    if (fine) {
      fineUntil = timeStamp + fineGestureGap;
    }
    if (!deltaY || Math.abs(deltaX) > Math.abs(deltaY)) return;
    if (needsNativeScroll(event)) {
      stop();
      return;
    }

    const current = window.scrollY;
    if (Math.abs(current - position) > (moving ? 2 : 0.75)) {
      stop();
      position = current;
    }
    const previousTarget = moving ? target : position;
    if (!moving) {
      velocity = 0;
    }
    springRate = fine ? touchpadSpringRate : wheelSpringRate;
    const direction = Math.sign(deltaY);
    const pixels = Math.abs(deltaY) * (mode === WheelEvent.DOM_DELTA_LINE ? lineHeight : 1);
    const notch = fine ? pixels : Math.min(pixels, 180, Math.max(90, innerHeight * 0.18));
    const reversing = direction * (previousTarget - position) < 0;
    const remaining = reversing ? 0 : Math.abs(previousTarget - position);
    const lead = Math.min(600, innerHeight * 0.66);
    const destination = position + direction * Math.min(lead, remaining + notch);
    target = Math.max(0, Math.min(getMaximumScroll(), destination));
    if (!moving && target === position) return;
    event.preventDefault();

    if (reversing) velocity = 0;
    if (!moving) {
      moving = true;
      previousTime = performance.now();
      onMotionChange(true);
      frame = requestAnimationFrame(advance);
    }
  }, { ...options, passive: false });

  window.addEventListener("keydown", (event) => {
    if (scrollKeys.has(event.key)) stop();
  }, options);
  for (const event of ["blur", "pointerdown", "touchstart", "resize"])
    window.addEventListener(event, stop, { ...options, passive: true });
  document.addEventListener("visibilitychange", stop, options);
  reducedMotion.addEventListener("change", stop, options);

  return () => {
    stop();
    listeners.abort();
  };
}
