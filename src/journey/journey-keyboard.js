const tapDistance = 40;
const arrowKeyWidgets = "input, select, textarea, [contenteditable], dialog, [role=slider], [role=listbox], [role=spinbutton]";

export function attachJourneyKeyboard({
  getMaximumScroll = () => document.documentElement.scrollHeight - innerHeight,
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)"),
} = {}) {
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let frame = 0;
  let activeKey, direction, position, previousTime, traveled;
  let held = false;

  function isPageScrollable() {
    return !reducedMotion.matches && !document.hidden &&
      !document.body.classList.contains("exploring") &&
      !document.documentElement.classList.contains("journey-loading");
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    activeKey = null;
    held = false;
  }

  function advance(time) {
    frame = 0;
    if (!isPageScrollable()) {
      stop();
      return;
    }
    // Maintain a fractional position so subpixel motion isn't discarded each frame.
    const speed = Math.min(590, Math.max(330, innerHeight * 0.62));
    const step = speed * Math.min(50, Math.max(0, time - previousTime)) / 1000;
    const distance = held ? step : Math.min(step, tapDistance - traveled);
    const next = Math.max(0, Math.min(getMaximumScroll(), position + direction * distance));
    const moved = Math.abs(next - position);
    const clamped = moved + 0.01 < distance;
    previousTime = time;
    traveled += moved;
    position = next;
    window.scrollTo({ top: position, behavior: "instant" });
    if (clamped || (!held && traveled >= tapDistance - 0.01)) stop();
    else frame = requestAnimationFrame(advance);
  }

  window.addEventListener("keydown", (event) => {
    const { key } = event;
    if (
      (key !== "ArrowDown" && key !== "ArrowUp") ||
      event.defaultPrevented || event.altKey || event.ctrlKey ||
      event.metaKey || event.shiftKey || event.target.closest?.(arrowKeyWidgets) ||
      !isPageScrollable()
    ) return;
    event.preventDefault();
    if (event.repeat || (held && key === activeKey)) return;
    activeKey = key;
    direction = key === "ArrowDown" ? 1 : -1;
    held = true;
    position = window.scrollY;
    previousTime = performance.now();
    traveled = 0;
    if (!frame) frame = requestAnimationFrame(advance);
  }, options);

  window.addEventListener("keyup", (event) => {
    if (event.key !== activeKey) return;
    held = false;
    if (traveled >= tapDistance) stop();
  }, options);
  for (const event of ["blur", "wheel", "pointerdown", "touchstart"])
    window.addEventListener(event, stop, { ...options, passive: true });
  document.addEventListener("visibilitychange", stop, options);
  reducedMotion.addEventListener("change", stop, options);

  return () => {
    stop();
    listeners.abort();
  };
}
