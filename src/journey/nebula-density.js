export const nebulaDensitySize = 64;

// Bake irregular multi-scale density once. Rendering uses four texture samples,
// avoiding per-pixel fractal noise and costly volume ray marching.
export function bakeNebulaDensity() {
  const size = nebulaDensitySize,
    data = new Uint8Array(size ** 3);
  const hash = (x, y, z) => {
    let n =
      Math.imul(x, 374761393) ^
      Math.imul(y, 668265263) ^
      Math.imul(z, 2147483647);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  function octave(scale, originX, originY, originZ) {
    const side = scale + 1;
    const plane = side ** 2;
    const grid = new Float64Array(side ** 3);
    const cells = new Uint8Array(size);
    const blend = new Float64Array(size);
    for (let z = 0; z < side; z++)
      for (let y = 0; y < side; y++)
        for (let x = 0; x < side; x++)
          grid[x + side * y + plane * z] = hash(x + originX, y + originY, z + originZ);
    for (let pixel = 0; pixel < size; pixel++) {
      const location = (pixel / size) * scale;
      const cell = Math.floor(location);
      const fraction = location - cell;
      cells[pixel] = cell;
      blend[pixel] = fraction * fraction * (3 - 2 * fraction);
    }
    return (x, y, z) => {
      const index = cells[x] + cells[y] * side + cells[z] * plane;
      const a = blend[x], b = blend[y], c = blend[z];
      const back = index + plane;
      return (
        grid[index] * (1 - a) * (1 - b) * (1 - c) +
        grid[index + 1] * a * (1 - b) * (1 - c) +
        grid[index + side] * (1 - a) * b * (1 - c) +
        grid[index + side + 1] * a * b * (1 - c) +
        grid[back] * (1 - a) * (1 - b) * c +
        grid[back + 1] * a * (1 - b) * c +
        grid[back + side] * (1 - a) * b * c +
        grid[back + side + 1] * a * b * c
      );
    };
  };
  const coarse = octave(5, 3, 7, 11);
  const detail = octave(11, 23, 17, 5);
  const filament = octave(23, 47, 31, 19);
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        data[x + size * (y + size * z)] = Math.round(
          255 * (
            coarse(x, y, z) * 0.57 +
            detail(x, y, z) * 0.28 +
            filament(x, y, z) * 0.15
          ),
        );
  return data;
}

// This module also serves as the one-shot worker, without loading Three.js.
if (typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope) {
  const density = bakeNebulaDensity();
  postMessage(density, [density.buffer]);
}
