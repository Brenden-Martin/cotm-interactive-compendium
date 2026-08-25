export type RandomSource = () => number;
export type GuidanceSource = { x: number; y: number; radius: number; polarity: 1 | -1 };

export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (value: number) => value * value * (3 - 2 * value);
const hash = (x: number, y: number, seed: number) => {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
};

export function valueNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = hash(x0, y0, seed) * 2 - 1;
  const b = hash(x0 + 1, y0, seed) * 2 - 1;
  const c = hash(x0, y0 + 1, seed) * 2 - 1;
  const d = hash(x0 + 1, y0 + 1, seed) * 2 - 1;
  const lower = a + (b - a) * tx;
  const upper = c + (d - c) * tx;
  return lower + (upper - lower) * ty;
}

export function fractalNoise(x: number, y: number, seed: number, octaves = 3) {
  let total = 0;
  let amplitude = 1;
  let normalization = 0;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave++) {
    total += valueNoise(x * frequency, y * frequency, seed + octave * 1013) * amplitude;
    normalization += amplitude;
    amplitude *= 0.52;
    frequency *= 2.03;
  }
  return total / Math.max(normalization, 1e-6);
}

export function logarithmicThickness(
  ageSeconds: number,
  baseWidth: number,
  growth: number,
  saturationWidth: number,
) {
  return Math.min(saturationWidth, baseWidth + Math.log1p(Math.max(0, ageSeconds)) * growth);
}

export function sampleChildCount(mean: number, variance: number, random: RandomSource) {
  const spread = (random() + random() + random() - 1.5) * variance * 1.35;
  return clamp(Math.round(mean + spread), 1, 7);
}

export function childHeading(
  parentHeading: number,
  childIndex: number,
  childCount: number,
  directionalSpread: number,
  angleVariance: number,
  random: RandomSource,
) {
  const spread = clamp(directionalSpread, 0, 1);
  const ordered = childCount <= 1 ? 0 : childIndex / (childCount - 1) * 2 - 1;
  const fan = ordered * Math.PI * spread;
  const circular = spread > 0.78 ? (random() * 2 - 1) * Math.PI * ((spread - 0.78) / 0.22) : 0;
  const jitter = (random() * 2 - 1) * angleVariance * (0.15 + spread * 0.85);
  return parentHeading + fan + circular + jitter;
}

export function windVector(
  x: number,
  y: number,
  time: number,
  seed: number,
  scale: number,
  drift: number,
) {
  const sampleX = x * scale - time * drift;
  const sampleY = y * scale;
  const horizontal = fractalNoise(sampleX, sampleY, seed, 4);
  const vertical = fractalNoise(sampleX + 37.1, sampleY - 19.7, seed + 701, 3);
  return { x: horizontal, y: vertical * 0.42 };
}

export function guidanceVector(x: number, y: number, sources: GuidanceSource[], strength: number) {
  let forceX = 0;
  let forceY = 0;
  for (const source of sources) {
    const radius = Math.max(.002, source.radius);
    const dx = source.x - x;
    const dy = source.y - y;
    const distanceSquared = dx * dx + dy * dy;
    const weight = Math.exp(-distanceSquared / (2 * radius * radius));
    forceX += source.polarity * dx / radius * weight;
    forceY += source.polarity * dy / radius * weight;
  }
  return { x: forceX * strength, y: forceY * strength };
}

export function shouldDecimatePrevious(
  nextDepth: number,
  interval: number,
  previous: { parent: number; createdFrame: number; retired: boolean },
  currentFrame: number,
  protectedPoint: boolean,
) {
  return nextDepth % Math.max(2, Math.round(interval)) === 0
    && previous.createdFrame < currentFrame
    && previous.parent >= 0
    && !previous.retired
    && !protectedPoint;
}

export function bloomProgress(ageSeconds: number, durationSeconds: number) {
  const progress = clamp(ageSeconds / Math.max(.001, durationSeconds), 0, 1);
  return smoothstep(progress);
}

export function randomizedFlowersEnabled(random: RandomSource) {
  return random() >= .5;
}
