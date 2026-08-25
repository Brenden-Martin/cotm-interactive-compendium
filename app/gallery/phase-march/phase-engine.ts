export const TAU = Math.PI * 2;
export type PhasePreset = "blank" | "striated" | "concentric" | "spiral" | "saddle" | "correlated";
export type PhasePalette = "spectrum" | "psychedelic" | "tidepool" | "sunset" | "monochrome";

export const wrapPhase = (phase: number) => ((phase % TAU) + TAU) % TAU;
export const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

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
  return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
}

export function makePhaseField(
  width: number,
  height: number,
  preset: PhasePreset,
  options: { seed?: number; correlation?: number; depth?: number; angle?: number } = {},
) {
  const field = new Float32Array(width * height);
  const seed = options.seed ?? 1513;
  const correlation = Math.max(1, options.correlation ?? 18);
  const depth = options.depth ?? 5;
  const angle = options.angle ?? 0;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const nx = (x + .5) / width - .5;
    const ny = (y + .5) / height - .5;
    const aspectX = nx * width / height;
    const radius = Math.hypot(aspectX, ny);
    let phase = 0;
    if (preset === "striated") phase = (aspectX * cosine + ny * sine) * TAU * depth;
    if (preset === "concentric") phase = radius * TAU * depth;
    if (preset === "spiral") phase = radius * TAU * depth + Math.atan2(ny, aspectX) * 3;
    if (preset === "saddle") phase = (aspectX * aspectX - ny * ny) * TAU * depth * 2;
    if (preset === "correlated") phase = valueNoise(x / correlation, y / correlation, seed) * TAU * depth;
    field[y * width + x] = phase;
  }
  return field;
}

export function applyGaussianTurn(
  field: Float32Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
  turns: number,
  softness: number,
  strength = 1,
) {
  const sigma = Math.max(.45, radius / Math.max(.35, softness));
  const reach = Math.ceil(radius * 1.75);
  const x0 = Math.max(0, Math.floor(centerX - reach));
  const x1 = Math.min(width - 1, Math.ceil(centerX + reach));
  const y0 = Math.max(0, Math.floor(centerY - reach));
  const y1 = Math.min(height - 1, Math.ceil(centerY + reach));
  const amount = turns * TAU * strength;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const distanceSquared = (x - centerX) ** 2 + (y - centerY) ** 2;
    const weight = Math.exp(-distanceSquared / (2 * sigma * sigma));
    field[y * width + x] += amount * weight;
  }
}

export function phaseGradient(field: Float32Array, width: number, height: number, x: number, y: number) {
  const left = field[y * width + Math.max(0, x - 1)];
  const right = field[y * width + Math.min(width - 1, x + 1)];
  const up = field[Math.max(0, y - 1) * width + x];
  const down = field[Math.min(height - 1, y + 1) * width + x];
  return { x: (right - left) * .5, y: (down - up) * .5 };
}

export function localPhaseVelocity(gradientX: number, gradientY: number, angularFrequency: number) {
  const magnitudeSquared = gradientX * gradientX + gradientY * gradientY;
  if (magnitudeSquared < 1e-10) return { x: 0, y: 0 };
  return {
    x: -angularFrequency * gradientX / magnitudeSquared,
    y: -angularFrequency * gradientY / magnitudeSquared,
  };
}

export function paletteColor(palette: PhasePalette, phase: number): [number, number, number] {
  const p = wrapPhase(phase);
  if (palette === "monochrome") {
    const value = Math.round(127.5 + 127.5 * Math.cos(p));
    return [value, value, value];
  }
  if (palette === "psychedelic") return [
    Math.round(132 + 118 * Math.cos(p + .1)),
    Math.round(132 + 118 * Math.cos(p - 2.05)),
    Math.round(132 + 118 * Math.cos(p + 2.15)),
  ];
  if (palette === "tidepool") return [
    Math.round(70 + 65 * (1 + Math.cos(p + 2.6))),
    Math.round(118 + 68 * (1 + Math.cos(p - 1.7))),
    Math.round(125 + 64 * (1 + Math.cos(p + .2))),
  ];
  if (palette === "sunset") return [
    Math.round(150 + 100 * Math.cos(p) * .5 + 5),
    Math.round(90 + 82 * Math.cos(p - 1.5) * .72),
    Math.round(105 + 100 * Math.cos(p + 1.8) * .72),
  ].map((value) => clamp(value, 0, 255)) as [number, number, number];
  const hue = p / TAU * 6;
  const sector = Math.floor(hue) % 6;
  const fraction = hue - Math.floor(hue);
  const rising = Math.round(255 * fraction);
  const falling = 255 - rising;
  return ([[255, rising, 0], [falling, 255, 0], [0, 255, rising], [0, falling, 255], [rising, 0, 255], [255, 0, falling]][sector]) as [number, number, number];
}
