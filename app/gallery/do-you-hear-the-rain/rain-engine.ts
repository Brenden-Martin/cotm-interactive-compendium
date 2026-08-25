export type RainSurface = "bucket" | "gutter" | "heater" | "puddle";

export type ImpactProfile = {
  startHz: number;
  endHz: number;
  decay: number;
  noise: number;
  resonance: number;
};

export function poissonInterval(ratePerSecond: number, unitRandom: number) {
  if (ratePerSecond <= 0) return Infinity;
  return -Math.log(Math.max(1e-9, 1 - Math.min(.999999999, Math.max(0, unitRandom)))) / ratePerSecond;
}

export function correlatedDrift(value: number, center: number, correlationSeconds: number, dt: number, signedNoise: number, volatility = 1) {
  const a = Math.exp(-Math.max(0, dt) / Math.max(.02, correlationSeconds));
  return center + (value - center) * a + Math.sqrt(Math.max(0, 1 - a * a)) * signedNoise * volatility;
}

export function decayWetness(value: number, memorySeconds: number, dt: number, deposited = 0) {
  return Math.max(0, value * Math.exp(-Math.max(0, dt) / Math.max(.02, memorySeconds)) + Math.max(0, deposited));
}

export function chooseSurface(unitRandom: number, weights: Record<RainSurface, number>): RainSurface {
  const entries = Object.entries(weights) as Array<[RainSurface, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0) || 1;
  let cursor = Math.min(.999999, Math.max(0, unitRandom)) * total;
  for (const [surface, weight] of entries) { cursor -= Math.max(0, weight); if (cursor <= 0) return surface; }
  return "puddle";
}

export function impactProfile(surface: RainSurface, size: number, wetness: number, cavityHz: number, pitchShift: number): ImpactProfile {
  const wet = Math.min(2, Math.max(0, wetness));
  const radiusScale = 1 / Math.sqrt(Math.max(.12, size));
  const wetScale = Math.pow(2, Math.max(-1, Math.min(1, pitchShift)) * wet * .5);
  const base = Math.max(28, cavityHz * radiusScale * wetScale);
  if (surface === "heater") return { startHz: base * 1.8, endHz: base * 2.45, decay: .18 + wet * .16, noise: .16, resonance: 1.8 };
  if (surface === "bucket") return { startHz: base * .9, endHz: base * .62, decay: .32 + wet * .42, noise: .3, resonance: 1.25 };
  if (surface === "gutter") return { startHz: base * 1.25, endHz: base * .78, decay: .11 + wet * .2, noise: .55, resonance: .85 };
  return { startHz: base * .55, endHz: base * .32, decay: .08 + wet * .12, noise: .9, resonance: .45 };
}
