export type SwimProfile = {
  period: number;
  phase: number;
  depth: number;
  driftPhase: number;
  amplitude: number;
};
/** PixelFish normalizes every image to face left before swimming transforms. */
export function swimFacing(velocity: number, previous = 1): number {
  return Math.abs(velocity) < 0.0001 ? previous : velocity > 0 ? -1 : 1;
}
const positions: Record<string, [number, number]> = {
  "black-seabream": [0.17, 0.27],
  "yellowfin-seabream": [0.48, 0.4],
  "red-scorpionfish": [0.73, 0.4],
  "japanese-seabass": [0.84, 0.64],
  "jack-mackerel": [0.71, 0.78],
  rabbitfish: [0.49, 0.73],
};
export function swimProfile(id: string, index: number): SwimProfile {
  const seed = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const [start, depth] = positions[id] || [
    0.2 + (index % 3) * 0.3,
    0.2 + (seed % 60) / 100,
  ];
  const phase = Math.asin(2 * start - 1);
  return {
    period: 20 + (seed % 41),
    phase: seed % 2 ? Math.PI - phase : phase,
    depth,
    driftPhase: (seed % 628) / 100,
    amplitude: 4 + (seed % 9),
  };
}
/**
 * theta = 2πt/T + phase + .12 sin(.37·2πt/T + driftPhase)
 * x = margin + travelWidth·(1 + sin(theta))/2
 * y = depth + A sin(1.7·2πt/T + driftPhase) + .35A sin(.61·2πt/T)
 * Direction follows dx/dt; cosine slows each fish before its turn.
 */
export function swimPosition(
  profile: SwimProfile,
  seconds: number,
  width: number,
  height: number,
  fishWidth: number,
  fishHeight: number,
) {
  const wave = (2 * Math.PI * seconds) / profile.period;
  const theta =
    wave + profile.phase + 0.12 * Math.sin(0.37 * wave + profile.driftPhase);
  const left = Math.min(18, Math.max(0, (width - fishWidth) / 2));
  const travel = Math.max(0, width - fishWidth - left * 2);
  const top = Math.min(56, Math.max(0, height - fishHeight));
  const bottom = Math.max(top, height - fishHeight - 24);
  const y =
    top +
    (bottom - top) * profile.depth +
    profile.amplitude * Math.sin(1.7 * wave + profile.driftPhase) +
    0.35 * profile.amplitude * Math.sin(0.61 * wave);
  return {
    x: left + (travel * (1 + Math.sin(theta))) / 2,
    y: Math.max(top, Math.min(bottom, y)),
    velocity:
      Math.cos(theta) *
      (1 + 0.0444 * Math.cos(0.37 * wave + profile.driftPhase)),
  };
}
