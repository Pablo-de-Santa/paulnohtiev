export const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

export const yieldToBrowser = () =>
  globalThis.scheduler?.yield?.() ?? new Promise((resolve) => setTimeout(resolve, 0));
