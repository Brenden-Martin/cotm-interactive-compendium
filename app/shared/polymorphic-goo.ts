export type GooAudioBands = {
  low: number;
  mid: number;
  transitionLow: number;
  transitionHigh: number;
  high: number;
  overall: number;
};

export type GooFrame = {
  shape: number;
  wobble: number;
  rotation: number;
  wobblePhase: number;
  shadowDepth: number;
  roundness: number;
  hue: number;
  background?: string;
};

export const EMPTY_GOO_BANDS: GooAudioBands = {
  low: 0,
  mid: 0,
  transitionLow: 0,
  transitionHigh: 0,
  high: 0,
  overall: 0,
};

type Complex = { re: number; im: number };
type Point = { x: number; y: number };

const SAMPLE_COUNT = 96;
const SHAPES = [3, 4, 5, 6];

const regularPolygon = (sides: number) => Array.from({ length: SAMPLE_COUNT }, (_, index) => {
  const perimeterPosition = index / SAMPLE_COUNT * sides;
  const edge = Math.floor(perimeterPosition) % sides;
  const local = perimeterPosition - Math.floor(perimeterPosition);
  const phase = sides === 4 ? Math.PI / 4 : sides === 6 ? 0 : Math.PI / 2;
  const a = phase + edge / sides * Math.PI * 2;
  const b = phase + ((edge + 1) % sides) / sides * Math.PI * 2;
  return {
    x: Math.cos(a) * (1 - local) + Math.cos(b) * local,
    y: Math.sin(a) * (1 - local) + Math.sin(b) * local,
  };
});

const dft = (points: Point[]) => Array.from({ length: SAMPLE_COUNT }, (_, harmonic) => {
  let re = 0;
  let im = 0;
  for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
    const angle = -Math.PI * 2 * harmonic * sample / SAMPLE_COUNT;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    re += points[sample].x * cosine - points[sample].y * sine;
    im += points[sample].x * sine + points[sample].y * cosine;
  }
  return { re: re / SAMPLE_COUNT, im: im / SAMPLE_COUNT };
});

const canonicalize = (coefficients: Complex[]) => {
  const result = coefficients.map((value) => ({ ...value }));
  result[0] = { re: 0, im: 0 };
  const reference = result[1];
  const magnitude = Math.max(1e-9, Math.hypot(reference.re, reference.im));
  const phase = -Math.atan2(reference.im, reference.re);
  for (let harmonic = 1; harmonic < result.length; harmonic++) {
    const value = result[harmonic];
    const rotated = {
      re: value.re * Math.cos(phase) - value.im * Math.sin(phase),
      im: value.re * Math.sin(phase) + value.im * Math.cos(phase),
    };
    const signedHarmonic = harmonic <= SAMPLE_COUNT / 2 ? harmonic : harmonic - SAMPLE_COUNT;
    const highBoost = 1 + 2.5 * Math.pow(Math.abs(signedHarmonic) / (SAMPLE_COUNT / 2), 2);
    result[harmonic] = { re: rotated.re / magnitude * highBoost, im: rotated.im / magnitude * highBoost };
  }
  return result;
};

const FOURIER_SHAPES = SHAPES.map((sides) => canonicalize(dft(regularPolygon(sides))));

const ease = (value: number) => .5 - .5 * Math.cos(Math.max(0, Math.min(1, value)) * Math.PI);

function gooContour(frame: GooFrame) {
  const position = ((frame.shape % SHAPES.length) + SHAPES.length) % SHAPES.length;
  const fromIndex = Math.floor(position);
  const toIndex = (fromIndex + 1) % SHAPES.length;
  const blend = ease(position - fromIndex);
  const coefficients = FOURIER_SHAPES[fromIndex].map((from, harmonic) => {
    const to = FOURIER_SHAPES[toIndex][harmonic];
    const signedHarmonic = harmonic <= SAMPLE_COUNT / 2 ? harmonic : harmonic - SAMPLE_COUNT;
    const harmonicScale = Math.abs(signedHarmonic) / (SAMPLE_COUNT / 2);
    const phase = frame.rotation * (1 + 3.2 * Math.pow(harmonicScale, 2.5));
    const re = from.re + (to.re - from.re) * blend;
    const im = from.im + (to.im - from.im) * blend;
    return {
      re: re * Math.cos(phase) - im * Math.sin(phase),
      im: re * Math.sin(phase) + im * Math.cos(phase),
    };
  });

  const points = Array.from({ length: SAMPLE_COUNT }, (_, sample) => {
    let x = 0;
    let y = 0;
    for (let harmonic = 0; harmonic < SAMPLE_COUNT; harmonic++) {
      const angle = Math.PI * 2 * harmonic * sample / SAMPLE_COUNT;
      const value = coefficients[harmonic];
      x += value.re * Math.cos(angle) - value.im * Math.sin(angle);
      y += value.re * Math.sin(angle) + value.im * Math.cos(angle);
    }
    const radial = 1 + frame.wobble * .13 * Math.sin(Math.atan2(y, x) * 4 + frame.wobblePhase);
    return { x: x * radial, y: y * radial };
  });

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const centerX = (minX + maxX) * .5;
  const centerY = (minY + maxY) * .5;
  const span = Math.max(1e-8, maxX - minX, maxY - minY);
  return points.map((point) => ({ x: (point.x - centerX) / span * 2, y: (point.y - centerY) / span * 2 }));
}

function polygonPath(context: CanvasRenderingContext2D, points: Point[], centerX: number, centerY: number, radius: number, offsetX = 0, offsetY = 0) {
  context.beginPath();
  points.forEach((point, index) => {
    const x = centerX + point.x * radius + offsetX;
    const y = centerY + point.y * radius + offsetY;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  });
  context.closePath();
}

export function renderPolymorphicGoo(context: CanvasRenderingContext2D, width: number, height: number, frame: GooFrame) {
  const hue = ((frame.hue % 360) + 360) % 360;
  const depth = Math.max(0, frame.shadowDepth) * Math.min(width, height) * .055;
  const radius = Math.min(width, height) * .38;
  const centerX = width * .5;
  const centerY = height * .49;
  const points = gooContour(frame);
  context.clearRect(0, 0, width, height);
  context.fillStyle = frame.background ?? `hsl(${(hue + 285) % 360} 38% 13%)`;
  context.fillRect(0, 0, width, height);
  context.lineJoin = "round";
  context.lineCap = "round";

  polygonPath(context, points, centerX, centerY, radius, depth * .78, depth);
  context.fillStyle = `hsl(${(hue + 345) % 360} 72% 19%)`;
  context.fill();

  polygonPath(context, points, centerX, centerY, radius, depth * .34, depth * .42);
  context.fillStyle = `hsl(${(hue + 18) % 360} 77% 34%)`;
  context.fill();

  polygonPath(context, points, centerX, centerY, radius);
  context.fillStyle = `hsl(${hue} 80% 47%)`;
  context.fill();
  context.strokeStyle = `hsl(${(hue + 35) % 360} 82% 78%)`;
  context.lineWidth = Math.max(1, (1.5 + frame.roundness * 5.5) * Math.min(width, height) / 256);
  context.shadowColor = `hsla(${(hue + 42) % 360} 90% 86% / ${.15 + frame.roundness * .42})`;
  context.shadowBlur = frame.roundness * Math.min(width, height) * .045;
  context.stroke();
  context.shadowBlur = 0;
}

function bandRms(data: Uint8Array, analyser: AnalyserNode, lowHz: number, highHz: number) {
  const nyquist = analyser.context.sampleRate / 2;
  const start = Math.max(0, Math.floor(lowHz / nyquist * data.length));
  const end = Math.max(start + 1, Math.min(data.length, Math.ceil(highHz / nyquist * data.length)));
  let sum = 0;
  for (let index = start; index < end; index++) sum += Math.pow(data[index] / 255, 2);
  return Math.sqrt(sum / Math.max(1, end - start));
}

export function analyseGooAudio(analyser: AnalyserNode, frequency: Uint8Array, waveform: Uint8Array): GooAudioBands {
  analyser.getByteFrequencyData(frequency);
  analyser.getByteTimeDomainData(waveform);
  let overall = 0;
  for (const value of waveform) overall += Math.pow((value - 128) / 128, 2);
  return {
    low: bandRms(frequency, analyser, 30, 180),
    mid: bandRms(frequency, analyser, 180, 1000),
    transitionLow: bandRms(frequency, analyser, 1000, 1900),
    transitionHigh: bandRms(frequency, analyser, 1900, 3400),
    high: bandRms(frequency, analyser, 3400, 12000),
    overall: Math.sqrt(overall / Math.max(1, waveform.length)),
  };
}

export function smoothGooBands(previous: GooAudioBands, next: GooAudioBands, amount = .22): GooAudioBands {
  return {
    low: previous.low + (next.low - previous.low) * amount,
    mid: previous.mid + (next.mid - previous.mid) * amount,
    transitionLow: previous.transitionLow + (next.transitionLow - previous.transitionLow) * amount,
    transitionHigh: previous.transitionHigh + (next.transitionHigh - previous.transitionHigh) * amount,
    high: previous.high + (next.high - previous.high) * amount,
    overall: previous.overall + (next.overall - previous.overall) * amount,
  };
}
