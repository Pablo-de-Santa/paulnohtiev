export const seatedPosition = { x: 1.5, z: -0.35 };
export function odiePose(time) {
  const a = time * 0.45;
  return {
    x: 1.6 + Math.cos(a) * 1.6,
    z: 5.35 + Math.sin(a) * 0.65,
    y: Math.abs(Math.sin(time * 7)) * 0.07,
    yaw: Math.atan2(-1.6 * Math.sin(a), 0.65 * Math.cos(a)),
  };
}
export function pondContains(x, z, margin = 0) {
  return (
    ((x + 7) / (5.3 + margin)) ** 2 + ((z - 4.5) / (3.3 + margin)) ** 2 < 1
  );
}
export function pathPoint(t) {
  return {
    x: 5.8 + (2.8 - 5.8) * t + Math.sin(t * Math.PI) * 0.15,
    z: -1.35 + 3.7 * t,
  };
}
