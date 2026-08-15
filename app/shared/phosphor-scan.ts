export type PhosphorSourceMode = "white" | "image" | "video";
export type PhosphorDeflectionMode = "waveform" | "perlin";

export type PhosphorParameters = {
  drawRate: number;
  scanlines: number;
  lineWidth: number;
  blueGlow: number;
  pixelsPerRow: number;
  persistence: number;
  deflection: number;
  noiseRoughness: number;
  noiseHarmonics: number;
  noiseScale: number;
  noiseSpeed: number;
};

export type PhosphorParameterKey = keyof PhosphorParameters;

export const PHOSPHOR_PARAMETER_CONTROLS: Array<{ key: PhosphorParameterKey; label: string; min: number; max: number; step: number }> = [
  { key: "drawRate", label: "Phosphor dots / second", min: 1, max: 220000, step: 1 },
  { key: "scanlines", label: "Scanlines", min: 6, max: 280, step: 1 },
  { key: "lineWidth", label: "Scanline width", min: .08, max: 4, step: .01 },
  { key: "blueGlow", label: "Blue underglow", min: 0, max: 3, step: .01 },
  { key: "pixelsPerRow", label: "Pixels per row", min: 8, max: 640, step: 1 },
  { key: "persistence", label: "Phosphor persistence", min: .04, max: 12, step: .01 },
  { key: "deflection", label: "Vertical deflection", min: 0, max: 18, step: .02 },
  { key: "noiseRoughness", label: "Perlin roughness", min: .05, max: 1.3, step: .01 },
  { key: "noiseHarmonics", label: "Perlin harmonics", min: 1, max: 10, step: 1 },
  { key: "noiseScale", label: "Perlin spatial scale", min: .25, max: 18, step: .01 },
  { key: "noiseSpeed", label: "Perlin evolution rate", min: 0, max: 5, step: .01 },
];

export const DEFAULT_PHOSPHOR_PARAMETERS: PhosphorParameters = {
  drawRate: 28000,
  scanlines: 72,
  lineWidth: .72,
  blueGlow: .62,
  pixelsPerRow: 180,
  persistence: 1.65,
  deflection: 3.2,
  noiseRoughness: .58,
  noiseHarmonics: 4,
  noiseScale: 3.4,
  noiseSpeed: .38,
};

type PhosphorFrameSource = {
  mode: PhosphorSourceMode;
  pixels?: Uint8ClampedArray;
  columns: number;
  rows: number;
  waveform?: Float32Array;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const fade = (value: number) => value * value * value * (value * (value * 6 - 15) + 10);
const hash = (index: number, seed: number) => {
  let value = Math.imul(index, 374761393) + Math.imul(seed, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295 * 2 - 1;
};

function valueNoise(position: number, seed: number) {
  const left = Math.floor(position);
  const blend = fade(position - left);
  const a = hash(left, seed);
  return a + (hash(left + 1, seed) - a) * blend;
}

function fractalNoise(position: number, time: number, harmonics: number, roughness: number, seed: number) {
  let total = 0;
  let normalization = 0;
  let frequency = 1;
  let amplitude = 1;
  const octaveCount = clamp(Math.round(harmonics), 1, 10);
  for (let octave = 0; octave < octaveCount; octave++) {
    total += valueNoise(position * frequency + time * (1 + octave * .071), seed + octave * 97) * amplitude;
    normalization += amplitude;
    frequency *= 2;
    amplitude *= clamp(roughness, .03, 1.3);
  }
  return total / Math.max(1e-8, normalization);
}

export class PhosphorScanEngine {
  private cursor = 0;
  private dotCarry = 0;
  private noiseTime = 0;
  private seed = 417;

  clear(context: CanvasRenderingContext2D, width: number, height: number) {
    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    context.restore();
    this.cursor = 0;
    this.dotCarry = 0;
  }

  reseed() {
    this.seed = Math.floor(Math.random() * 1000000);
  }

  render(context: CanvasRenderingContext2D, width: number, height: number, deltaSeconds: number, parameters: PhosphorParameters, source: PhosphorFrameSource, deflectionMode: PhosphorDeflectionMode) {
    const columns = clamp(Math.round(parameters.pixelsPerRow), 8, 640);
    const rows = clamp(Math.round(parameters.scanlines), 6, 280);
    const totalDots = columns * rows;
    this.cursor %= totalDots;
    this.noiseTime += deltaSeconds * parameters.noiseSpeed;

    const persistence = Math.max(.01, parameters.persistence);
    const fadeAlpha = 1 - Math.exp(-deltaSeconds / persistence);
    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = `rgba(0,0,0,${clamp(fadeAlpha, 0, 1)})`;
    context.fillRect(0, 0, width, height);
    context.restore();

    // A suspended tab must not return with minutes of stale raster work queued.
    this.dotCarry = Math.min(30000, this.dotCarry + Math.max(0, parameters.drawRate) * deltaSeconds);
    const drawCount = Math.min(15000, Math.floor(this.dotCarry));
    this.dotCarry -= drawCount;
    if (!drawCount) return;

    const cellWidth = width / columns;
    const rowHeight = height / rows;
    const dotHeight = Math.max(.55, rowHeight * parameters.lineWidth);
    const waveform = source.waveform;
    const waveformLength = waveform?.length ?? 0;
    context.save();
    context.globalCompositeOperation = "lighter";

    for (let drawn = 0; drawn < drawCount; drawn++) {
      const dot = (this.cursor + drawn) % totalDots;
      const row = Math.floor(dot / columns);
      const column = dot - row * columns;
      const x = (column + .5) * cellWidth;
      const baseY = (row + .5) * rowHeight;
      let displacement = 0;
      if (deflectionMode === "waveform" && waveformLength) {
        const waveformIndex = Math.min(waveformLength - 1, Math.floor(column / Math.max(1, columns - 1) * waveformLength));
        displacement = waveform![waveformIndex] * parameters.deflection * rowHeight;
      } else if (deflectionMode === "perlin") {
        const position = column / columns * parameters.noiseScale + row * .017;
        displacement = fractalNoise(position, this.noiseTime, parameters.noiseHarmonics, parameters.noiseRoughness, this.seed) * parameters.deflection * rowHeight;
      }
      const y = baseY + displacement;

      if (parameters.blueGlow > 0) {
        context.globalAlpha = clamp(.055 + parameters.blueGlow * .075, 0, .32);
        context.fillStyle = "rgb(18 55 255)";
        const glowHeight = dotHeight * (1.15 + parameters.blueGlow * 1.8);
        context.fillRect(x - cellWidth * .64, y - glowHeight * .5, cellWidth * 1.28, glowHeight);
      }

      context.globalAlpha = .88;
      if (source.mode === "white" || !source.pixels) {
        context.fillStyle = "rgb(255 255 255)";
      } else {
        const sourceColumn = Math.min(source.columns - 1, Math.floor(column / columns * source.columns));
        const sourceRow = Math.min(source.rows - 1, Math.floor(row / rows * source.rows));
        const pixelIndex = (sourceRow * source.columns + sourceColumn) * 4;
        const red = source.pixels[pixelIndex];
        const green = source.pixels[pixelIndex + 1];
        const blue = source.pixels[pixelIndex + 2];
        const alpha = source.pixels[pixelIndex + 3] / 255;
        context.globalAlpha = .88 * alpha;
        context.fillStyle = `rgb(${red} ${green} ${blue})`;
      }
      context.fillRect(x - cellWidth * .48, y - dotHeight * .5, Math.max(.7, cellWidth * .96), dotHeight);
    }
    context.restore();
    this.cursor = (this.cursor + drawCount) % totalDots;
  }
}
