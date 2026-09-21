export const odieCommands = [
  "sit",
  "lie down",
  "speak",
  "roll over",
  "spin",
  "treat",
];
// Smooth entry/exit envelopes keep tricks independent from the walking clock.
export function odieActionPose(command, age, duration = 5) {
  const smooth = (v) => {
    const x = Math.max(0, Math.min(1, v));
    return x * x * (3 - 2 * x);
  };
  const blend = smooth(age / 0.5) * smooth((duration - age) / 0.6);
  const cycle = smooth((age - 0.6) / 2.5);
  return {
    crouch:
      (["sit", "treat"].includes(command)
        ? 0.28
        : ["lie down", "roll over"].includes(command)
          ? 0.55
          : 0) * blend,
    roll: command === "roll over" ? cycle * Math.PI * 2 : 0,
    yaw: command === "spin" ? cycle * Math.PI * 2 : 0,
    hop:
      command === "speak" ? Math.max(0, Math.sin(age * 9)) * 0.07 * blend : 0,
    blend,
  };
}
