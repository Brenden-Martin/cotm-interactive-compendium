"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import archivedPresetData from "../deq-morph-bank/saved-presets.json";

const W = 160;
const H = 90;
const SIZE = W * H;
const templates = ["id", "dx", "dy", "|grad|", "lap"];
const channels = ["R", "G", "B"];

type Config = { k: number[]; exponent: number[]; dt: number; decay: number; noise: number };
type FieldState = [Float32Array, Float32Array, Float32Array];
type Preset = Config & { name: string };
type SharedPreset = { id: number; config: Config; createdAt: string };
type SharedPresetPage = { presets?: SharedPreset[]; total?: number; nextCursor?: number | null; error?: string };
type FoundryMode = "standard" | "photo" | "cursor";
type AnchorBank = "all" | "curated" | "color-cycle";
type RecursiveMode = "luckfield" | "periodic" | "manual";
type ChannelPermutation = readonly [number, number, number];
type FieldMetrics = { brightness: number; contrast: number; colorVariance: number; entropy: number; detail: number };
type BoundaryTransition = { from: FieldState; target: FieldState; current: FieldState; startedAt: number; duration: number };
type RecursiveSettings = {
  interval: number;
  brightnessGate: number;
  detailGate: number;
  luckChance: number;
  transitionTime: number;
  transitionWildness: number;
  glitchCarry: number;
};
type AutoCursor = {
  frequencyX: number;
  frequencyY: number;
  amplitudeX: number;
  amplitudeY: number;
  angularVelocity: number;
  harmonicsX: number[];
  harmonicsY: number[];
};
const archivedPresets = archivedPresetData.presets as SharedPreset[];
const archivedFingerprints = new Set(archivedPresets.map((preset) => JSON.stringify(preset.config)));
const DEFAULT_BRUSH_RADIUS = 13;
const DEFAULT_PAINT_COLOR = "#20d7d7";
const initialAutoCursor: AutoCursor = {
  frequencyX: 1,
  frequencyY: .7,
  amplitudeX: .43,
  amplitudeY: .36,
  angularVelocity: .08,
  harmonicsX: [1, .24, .08],
  harmonicsY: [1, .18, -.06],
};
const channelPermutations: ChannelPermutation[] = [
  [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
];
const initialRecursiveSettings: RecursiveSettings = {
  interval: 5,
  brightnessGate: .22,
  detailGate: .48,
  luckChance: .38,
  transitionTime: 2.8,
  transitionWildness: .32,
  glitchCarry: .16,
};
const emptyMetrics: FieldMetrics = { brightness: 0, contrast: 0, colorVariance: 0, entropy: 0, detail: 0 };

const indexK = (dest: number, source: number, template: number) => (dest * 3 + source) * 5 + template;
const sparseK = (entries: Array<[number, number, number, number]>) => {
  const values = Array(45).fill(0);
  entries.forEach(([d, s, t, value]) => { values[indexK(d, s, t)] = value; });
  return values;
};

const presets: Preset[] = [
  { name: "Nova", dt: .84, decay: 0, noise: .002, exponent: [1, 1, 1], k: sparseK([[0,1,4,.02],[1,2,4,.02],[2,0,4,1]]) },
  { name: "Swirls", dt: 1.38, decay: .11, noise: .001, exponent: [1,1,1], k: sparseK([[0,1,4,.02],[1,2,4,.02],[2,0,4,1],[2,1,3,.35]]) },
  { name: "Cells", dt: .28, decay: 0, noise: .001, exponent: [1,1,1], k: sparseK([[0,0,4,1],[0,1,3,-1],[0,2,3,-1],[1,0,3,-1],[1,1,4,1],[1,2,3,-1],[2,0,3,-1],[2,1,3,-1],[2,2,4,1]]) },
  { name: "Toxic Goo", dt: .08, decay: 0, noise: .002, exponent: [1,1,1], k: sparseK([[0,0,2,2],[0,0,4,1],[0,1,3,-1],[0,2,1,-10],[1,1,2,-10],[1,1,4,1],[1,2,1,-1.24],[1,2,3,-1],[2,0,1,10],[2,0,3,-1],[2,2,2,2],[2,2,4,1]]) },
  { name: "Fire", dt: .02, decay: .045, noise: .003, exponent: [1,1,1], k: sparseK([[0,0,3,-18.4],[0,0,4,-.88],[0,1,3,20.4],[0,1,4,1.88],[0,2,3,31.88],[0,2,4,-22.32],[1,2,3,-20.8],[1,2,4,1],[2,0,4,1.12],[2,1,4,-.42],[2,2,4,-5.56]]) },
  { name: "Undulating", dt: 1.38, decay: .11, noise: .001, exponent: [1,1,1], k: sparseK([[0,1,4,.02],[1,2,4,.02],[2,0,4,1],[2,1,3,6.52],[2,2,3,-.34]]) },
  { name: "Cross Fractal", dt: .02, decay: .2, noise: .002, exponent: [1,1,1], k: sparseK([[0,0,4,-.88],[0,1,4,1.88],[0,2,4,-22.32],[1,2,4,1],[2,0,4,1.12],[2,1,4,-.42],[2,2,4,-5.56]]) },
];

const cloneConfig = (preset: Preset): Config => ({ k: [...preset.k], exponent: [...preset.exponent], dt: preset.dt, decay: preset.decay, noise: preset.noise });
const permuteConfigChannels = (config: Config, permutation: ChannelPermutation): Config => {
  const k = Array(45).fill(0);
  for (let destination = 0; destination < 3; destination++) {
    for (let source = 0; source < 3; source++) {
      for (let template = 0; template < 5; template++) {
        k[indexK(destination, source, template)] = config.k[indexK(permutation[destination], permutation[source], template)];
      }
    }
  }
  return {
    ...config,
    k,
    exponent: permutation.map((channel) => config.exponent[channel]),
  };
};
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const cloneField = (field: FieldState): FieldState => [new Float32Array(field[0]), new Float32Array(field[1]), new Float32Array(field[2])];
const uniformBoundary = (): FieldState => [new Float32Array(SIZE).fill(1), new Float32Array(SIZE).fill(1), new Float32Array(SIZE).fill(1)];
const analyzeField = (field: FieldState): FieldMetrics => {
  const histogram = new Uint32Array(16);
  let brightness = 0;
  let contrast = 0;
  let colorVariance = 0;
  for (let y = 0; y < H; y++) {
    const row = y * W;
    const down = ((y + 1) % H) * W;
    for (let x = 0; x < W; x++) {
      const index = row + x;
      const right = row + ((x + 1) % W);
      const r = field[0][index], g = field[1][index], b = field[2][index];
      const luminance = (r + g + b) / 3;
      brightness += luminance;
      histogram[Math.min(15, Math.floor(luminance * 16))]++;
      colorVariance += ((r - luminance) ** 2 + (g - luminance) ** 2 + (b - luminance) ** 2) / 3;
      contrast += (Math.abs(r-field[0][right])+Math.abs(g-field[1][right])+Math.abs(b-field[2][right])
        + Math.abs(r-field[0][down+x])+Math.abs(g-field[1][down+x])+Math.abs(b-field[2][down+x])) / 6;
    }
  }
  let entropy = 0;
  for (const count of histogram) if (count) { const p = count / SIZE; entropy -= p * Math.log2(p); }
  const normalizedEntropy = entropy / 4;
  const normalizedContrast = clamp01(contrast / SIZE * 4.5);
  const normalizedColorVariance = clamp01(Math.sqrt(colorVariance / SIZE) * 2.8);
  return {
    brightness: brightness / SIZE,
    contrast: normalizedContrast,
    colorVariance: normalizedColorVariance,
    entropy: normalizedEntropy,
    detail: clamp01(normalizedEntropy*.38 + normalizedContrast*.37 + normalizedColorVariance*.25),
  };
};
const colorChannels = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16) / 255,
  Number.parseInt(hex.slice(3, 5), 16) / 255,
  Number.parseInt(hex.slice(5, 7), 16) / 255,
];

export function NonlinearDeq({ presetFoundry = false, recursiveBoundary = false }: { presetFoundry?: boolean; recursiveBoundary?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<FieldState>([new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)]);
  const configRef = useRef<Config>(cloneConfig(presets[0]));
  const frameRef = useRef(0);
  const pointerRef = useRef({ active: false, x: 0, y: 0 });
  const paintModeRef = useRef<"color" | "erase">("erase");
  const selectedPaintRef = useRef<"color" | "erase">("erase");
  const paintColorRef = useRef<[number, number, number]>(colorChannels(DEFAULT_PAINT_COLOR));
  const brushRef = useRef(DEFAULT_BRUSH_RADIUS);
  const pausedRef = useRef(false);
  const autoMutateRef = useRef(true);
  const mutationTimeRef = useRef(0);
  const foundryModeRef = useRef<FoundryMode>("standard");
  const boundaryRef = useRef<FieldState | null>(null);
  const uploadedBoundaryRef = useRef<FieldState | null>(null);
  const autoCursorRef = useRef<AutoCursor>(initialAutoCursor);
  const cursorStartRef = useRef(0);
  const morphIndexRef = useRef(0);
  const morphRateRef = useRef(1);
  const morphRandomnessRef = useRef(.18);
  const recursiveModeRef = useRef<RecursiveMode>("luckfield");
  const boundaryHeldRef = useRef(false);
  const recursiveSettingsRef = useRef<RecursiveSettings>(initialRecursiveSettings);
  const boundaryTransitionRef = useRef<BoundaryTransition | null>(null);
  const lastBoundaryScanRef = useRef(0);
  const [config, setConfig] = useState<Config>(cloneConfig(presets[0]));
  const [presetName, setPresetName] = useState("Nova");
  const [destination, setDestination] = useState(0);
  const [paintMode, setPaintMode] = useState<"color" | "erase">("erase");
  const [paintColor, setPaintColor] = useState(DEFAULT_PAINT_COLOR);
  const [brush, setBrush] = useState(DEFAULT_BRUSH_RADIUS);
  const [paused, setPaused] = useState(false);
  const [autoMutate, setAutoMutate] = useState(!presetFoundry && !recursiveBoundary);
  const [mutationCount, setMutationCount] = useState(0);
  const [sharedPresets, setSharedPresets] = useState<SharedPreset[]>([]);
  const [sharedPresetTotal, setSharedPresetTotal] = useState(0);
  const [bankLoadStatus, setBankLoadStatus] = useState("Loading complete bank…");
  const [morphing, setMorphing] = useState(recursiveBoundary);
  const [morphRate, setMorphRate] = useState(1);
  const [morphRandomness, setMorphRandomness] = useState(.18);
  const [foundryMode, setFoundryMode] = useState<FoundryMode>("standard");
  const [anchorBank, setAnchorBank] = useState<AnchorBank>(recursiveBoundary ? "color-cycle" : "all");
  const [boundaryName, setBoundaryName] = useState("No photo loaded");
  const [autoCursor, setAutoCursor] = useState<AutoCursor>(initialAutoCursor);
  const [saveStatus, setSaveStatus] = useState("Ready to collect this state");
  const [recursiveMode, setRecursiveMode] = useState<RecursiveMode>("luckfield");
  const [boundaryHeld, setBoundaryHeld] = useState(false);
  const [recursiveSettings, setRecursiveSettings] = useState<RecursiveSettings>(initialRecursiveSettings);
  const [fieldMetrics, setFieldMetrics] = useState<FieldMetrics>(emptyMetrics);
  const [boundaryStatus, setBoundaryStatus] = useState("Watching for a lucky field");
  const [boundaryMutations, setBoundaryMutations] = useState(0);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => {
    selectedPaintRef.current = paintMode;
    paintModeRef.current = paintMode;
  }, [paintMode]);
  useEffect(() => { paintColorRef.current = colorChannels(paintColor); }, [paintColor]);
  useEffect(() => { brushRef.current = brush; }, [brush]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { autoMutateRef.current = autoMutate; }, [autoMutate]);
  useEffect(() => { recursiveModeRef.current = recursiveMode; }, [recursiveMode]);
  useEffect(() => { boundaryHeldRef.current = boundaryHeld; }, [boundaryHeld]);
  useEffect(() => { recursiveSettingsRef.current = recursiveSettings; }, [recursiveSettings]);

  const switchFoundryMode = (mode: FoundryMode) => {
    foundryModeRef.current = mode;
    setFoundryMode(mode);
    boundaryRef.current = mode === "photo" ? uploadedBoundaryRef.current : null;
    pointerRef.current.active = false;
    if (mode === "cursor") cursorStartRef.current = performance.now();
  };

  const updateAutoCursor = (update: (current: AutoCursor) => AutoCursor) => {
    setAutoCursor((current) => {
      const next = update(current);
      autoCursorRef.current = next;
      return next;
    });
  };

  const loadBoundaryImage = async (file: File) => {
    try {
      setBoundaryName("Preparing image weights…");
      const bitmap = await createImageBitmap(file);
      const originalWidth = bitmap.width;
      const originalHeight = bitmap.height;
      const averageCanvas = document.createElement("canvas");
      averageCanvas.width = 32;
      averageCanvas.height = 32;
      const averageContext = averageCanvas.getContext("2d", { willReadFrequently: true });
      const gridCanvas = document.createElement("canvas");
      gridCanvas.width = W;
      gridCanvas.height = H;
      const gridContext = gridCanvas.getContext("2d", { willReadFrequently: true });
      if (!averageContext || !gridContext) throw new Error("Canvas unavailable");
      averageContext.drawImage(bitmap, 0, 0, 32, 32);
      const averagePixels = averageContext.getImageData(0, 0, 32, 32).data;
      let red = 0, green = 0, blue = 0, weight = 0;
      for (let index = 0; index < averagePixels.length; index += 4) {
        const alpha = averagePixels[index + 3] / 255;
        red += averagePixels[index] * alpha;
        green += averagePixels[index + 1] * alpha;
        blue += averagePixels[index + 2] * alpha;
        weight += alpha;
      }
      const divisor = Math.max(1, weight);
      gridContext.fillStyle = `rgb(${Math.round(red/divisor)},${Math.round(green/divisor)},${Math.round(blue/divisor)})`;
      gridContext.fillRect(0, 0, W, H);
      const scale = Math.max(W / bitmap.width, H / bitmap.height);
      const drawWidth = bitmap.width * scale;
      const drawHeight = bitmap.height * scale;
      gridContext.imageSmoothingEnabled = true;
      gridContext.imageSmoothingQuality = "high";
      gridContext.drawImage(bitmap, (W-drawWidth)/2, (H-drawHeight)/2, drawWidth, drawHeight);
      const pixels = gridContext.getImageData(0, 0, W, H).data;
      const weights: FieldState = [new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)];
      for (let index = 0; index < SIZE; index++) {
        weights[0][index] = pixels[index*4] / 255;
        weights[1][index] = pixels[index*4+1] / 255;
        weights[2][index] = pixels[index*4+2] / 255;
      }
      bitmap.close();
      uploadedBoundaryRef.current = weights;
      boundaryRef.current = weights;
      switchFoundryMode("photo");
      setBoundaryName(`${file.name} · ${originalWidth}×${originalHeight} → ${W}×${H}`);
    } catch {
      setBoundaryName("That image could not be decoded");
    }
  };

  useEffect(() => {
    if (!presetFoundry && !recursiveBoundary) return;
    const controller = new AbortController();
    const loadCompleteBank = async () => {
      try {
        const collected: SharedPreset[] = [];
        let cursor = 0;
        let total = 0;
        do {
          const response = await fetch(`/api/deq-presets?after=${cursor}&limit=200`, { signal: controller.signal });
          const data = await response.json() as SharedPresetPage;
          if (!response.ok) throw new Error(data.error);
          const page = Array.isArray(data.presets) ? data.presets : [];
          collected.push(...page);
          total = typeof data.total === "number" ? data.total : collected.length;
          if (typeof data.nextCursor !== "number") break;
          if (data.nextCursor <= cursor) throw new Error("The preset cursor did not advance.");
          cursor = data.nextCursor;
          setBankLoadStatus(`Loading ${Math.min(collected.length, total)} of ${total} anchors…`);
        } while (!controller.signal.aborted);
        if (controller.signal.aborted) return;
        const unique = Array.from(new Map(collected.map((preset) => [preset.id, preset])).values()).sort((left, right) => left.id - right.id);
        setSharedPresets(unique);
        setSharedPresetTotal(total);
        setBankLoadStatus(`All ${unique.length} shared anchors loaded`);
      } catch {
        if (!controller.signal.aborted) {
          setBankLoadStatus("Complete bank temporarily unavailable");
          setSaveStatus("Shared bank temporarily unavailable");
        }
      }
    };
    loadCompleteBank();
    return () => controller.abort();
  }, [presetFoundry, recursiveBoundary]);

  useEffect(() => {
    if ((!presetFoundry && !recursiveBoundary) || !morphing) return;
    const seenAnchors = new Set<string>();
    const anchors: Config[] = [
      ...presets.map(cloneConfig),
      ...archivedPresets.map((preset) => preset.config),
      ...(anchorBank !== "curated" ? sharedPresets.map((preset) => preset.config) : []),
    ].filter((anchor) => {
      const fingerprint = JSON.stringify(anchor);
      if (seenAnchors.has(fingerprint)) return false;
      seenAnchors.add(fingerprint);
      return true;
    });
    const traversalAnchors = anchorBank === "color-cycle"
      ? anchors.flatMap((anchor) => channelPermutations.map((permutation) => permuteConfigChannels(anchor, permutation)))
      : anchors;
    if (traversalAnchors.length < 2) return;
    let raf = 0;
    let lastPaint = 0;
    let lastTime = performance.now();
    let progress = 0;
    const startIndex = morphIndexRef.current % traversalAnchors.length;
    const from = configRef.current;
    let targetIndex = startIndex;
    while (targetIndex === startIndex) targetIndex = Math.floor(Math.random() * traversalAnchors.length);
    const to = traversalAnchors[targetIndex];
    const randomSigned = () => Math.random() * 2 - 1;
    const jitter: Config = {
      k: to.k.map((value) => randomSigned() * (.2 + Math.min(2, Math.abs(value) * .15))),
      exponent: to.exponent.map(() => randomSigned() * .4),
      dt: randomSigned() * .32,
      decay: randomSigned() * .2,
      noise: randomSigned() * .0015,
    };
    const animate = (now: number) => {
      progress = Math.min(1, progress + (now - lastTime) / 6500 * morphRateRef.current);
      lastTime = now;
      const raw = progress;
      const blend = raw * raw * (3 - 2 * raw);
      const wildness = Math.sin(Math.PI * blend) * morphRandomnessRef.current;
      const mix = (a: number, b: number) => a + (b - a) * blend;
      const next: Config = {
        k: from.k.map((value, index) => clamp(mix(value, to.k[index]) + jitter.k[index] * wildness, -100, 100)),
        exponent: from.exponent.map((value, index) => clamp(mix(value, to.exponent[index]) + jitter.exponent[index] * wildness, .25, 3)),
        dt: clamp(mix(from.dt, to.dt) + jitter.dt * wildness, .003, 2),
        decay: clamp(mix(from.decay, to.decay) + jitter.decay * wildness, 0, 1),
        noise: clamp(mix(from.noise, to.noise) + jitter.noise * wildness, 0, .02),
      };
      configRef.current = next;
      if (now - lastPaint > 32 || raw === 1) {
        setConfig(next);
        lastPaint = now;
      }
      if (raw === 1) {
        morphIndexRef.current = targetIndex;
        setMorphing(false);
        requestAnimationFrame(() => setMorphing(true));
      } else raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [anchorBank, morphing, presetFoundry, recursiveBoundary, sharedPresets]);

  const seedNoise = useCallback(() => {
    const next: FieldState = [new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)];
    for (let index = 0; index < SIZE; index++) {
      next[0][index] = clamp01(.5 + (Math.random() - .5) * .5);
      next[1][index] = clamp01(.5 + (Math.random() - .5) * .5);
      next[2][index] = clamp01(.5 + (Math.random() - .5) * .5);
    }
    fieldRef.current = next;
  }, []);

  const replaceBoundary = useCallback((label: string) => {
    const settings = recursiveSettingsRef.current;
    const previous = boundaryRef.current ? cloneField(boundaryRef.current) : uniformBoundary();
    const target = cloneField(fieldRef.current);
    const blocks = Math.round(settings.glitchCarry * 28);
    for (let block = 0; block < blocks; block++) {
      const blockWidth = 3 + Math.floor(Math.random() * (4 + settings.glitchCarry * W * .22));
      const blockHeight = 2 + Math.floor(Math.random() * (3 + settings.glitchCarry * H * .22));
      const startX = Math.floor(Math.random() * W);
      const startY = Math.floor(Math.random() * H);
      for (let dy = 0; dy < blockHeight; dy++) for (let dx = 0; dx < blockWidth; dx++) {
        const index = ((startY + dy) % H) * W + ((startX + dx) % W);
        target[0][index] = previous[0][index];
        target[1][index] = previous[1][index];
        target[2][index] = previous[2][index];
      }
    }
    const current = cloneField(previous);
    boundaryRef.current = current;
    boundaryTransitionRef.current = {
      from: previous,
      target,
      current,
      startedAt: performance.now(),
      duration: settings.transitionTime * 1000,
    };
    setBoundaryMutations((count) => count + 1);
    setBoundaryStatus(label);
  }, []);

  const resetBoundary = useCallback(() => {
    const reset = uniformBoundary();
    boundaryTransitionRef.current = null;
    boundaryRef.current = reset;
    setBoundaryStatus("Boundary conditions reset to uniform");
  }, []);

  const setRecursiveValue = (key: keyof RecursiveSettings, value: number) => {
    setRecursiveSettings((current) => ({ ...current, [key]: value }));
  };

  const applyPreset = (name: string) => {
    const preset = presets.find((item) => item.name === name) ?? presets[0];
    setPresetName(preset.name);
    setConfig(cloneConfig(preset));
    seedNoise();
  };

  const applySavedPreset = (value: string) => {
    const [source, rawId] = value.split(":");
    const id = Number(rawId);
    const preset = source === "archive"
      ? archivedPresets.find((item) => item.id === id)
      : sharedPresets.find((item) => item.id === id);
    if (!preset) return;
    setMorphing(false);
    setPresetName(`Shared ${String(preset.id).padStart(3, "0")}`);
    setConfig({ ...preset.config, k: [...preset.config.k], exponent: [...preset.config.exponent] });
    seedNoise();
  };

  const saveCurrentState = async () => {
    setSaveStatus("Writing anonymous anchor…");
    try {
      const response = await fetch("/api/deq-presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(configRef.current),
      });
      const data = await response.json() as { preset?: SharedPreset; error?: string };
      if (!response.ok || !data.preset) throw new Error(data.error);
      const alreadyLoaded = sharedPresets.some((item) => item.id === data.preset!.id);
      setSharedPresets((current) => current.some((item) => item.id === data.preset!.id) ? current : [...current, data.preset!].sort((left, right) => left.id - right.id));
      if (!alreadyLoaded) {
        setSharedPresetTotal((current) => current + 1);
        setBankLoadStatus((current) => current.startsWith("All ") ? `All ${sharedPresets.length + 1} shared anchors loaded` : current);
      }
      setSaveStatus(`Saved as shared anchor ${String(data.preset.id).padStart(3, "0")}`);
    } catch {
      setSaveStatus("Could not reach the shared bank");
    }
  };

  const mutate = useCallback(() => {
    setConfig((current) => {
      const next = { ...current, k: [...current.k], exponent: [...current.exponent] };
      const choice = Math.floor(Math.random() * 4);
      if (choice === 0) next.dt = .003 + Math.random() * 1.5;
      else if (choice === 1) next.decay = Math.random() * .8;
      else if (choice === 2) next.exponent[Math.floor(Math.random() * 3)] = .5 + Math.random() * 1.2;
      else {
        const target = next.k.reduce((sum, value) => sum + Math.abs(value), 0) || 1;
        next.k = next.k.map((value) => value * .98);
        const index = Math.floor(Math.random() * next.k.length);
        const freed = target - next.k.reduce((sum, value) => sum + Math.abs(value), 0);
        next.k[index] += (Math.random() < .5 ? -1 : 1) * freed;
      }
      return next;
    });
    setMutationCount((count) => count + 1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(W, H);
    seedNoise();
    mutationTimeRef.current = performance.now();
    if (recursiveBoundary) {
      boundaryRef.current = cloneField(fieldRef.current);
      boundaryTransitionRef.current = null;
      lastBoundaryScanRef.current = performance.now();
    }

    const paint = () => {
      if (!pointerRef.current.active) return;
      const cx = Math.floor(pointerRef.current.x * W);
      const cy = Math.floor(pointerRef.current.y * H);
      const radius = brushRef.current;
      const color = paintModeRef.current === "erase" ? [0,0,0] : paintColorRef.current;
      const field = fieldRef.current;
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const x = (cx + dx + W) % W;
        const y = (cy + dy + H) % H;
        const index = y * W + x;
        field[0][index] = color[0]; field[1][index] = color[1]; field[2][index] = color[2];
      }
    };

    const stepOriginal = () => {
      const src = fieldRef.current;
      const next: FieldState = [new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)];
      const cfg = configRef.current;
      for (let y = 0; y < H; y++) {
        const yu = ((y - 1 + H) % H) * W;
        const yd = ((y + 1) % H) * W;
        const row = y * W;
        for (let x = 0; x < W; x++) {
          const xl = (x - 1 + W) % W;
          const xr = (x + 1) % W;
          const index = row + x;
          for (let dest = 0; dest < 3; dest++) {
            let acc = 0;
            for (let source = 0; source < 3; source++) {
              const center = src[source][index];
              const dx = src[source][row + xr] - center;
              const dy = src[source][yd + x] - center;
              const grad = Math.sqrt(dx * dx + dy * dy);
              const lap = src[source][row + xl] + src[source][row + xr] + src[source][yu + x] + src[source][yd + x] - 4 * center;
              const values = [center, dx, dy, grad, lap];
              for (let template = 0; template < 5; template++) acc += cfg.k[indexK(dest, source, template)] * values[template];
            }
            let value = (1 - cfg.decay) * src[dest][index] + cfg.dt * acc;
            value = Math.sign(value) * Math.pow(Math.abs(value), cfg.exponent[dest]);
            if (cfg.noise > 0) value += (Math.random() - .5) * cfg.noise;
            next[dest][index] = clamp01(value);
          }
        }
      }
      fieldRef.current = next;
    };

    const stepBoundary = (weights: FieldState) => {
      const src = fieldRef.current;
      const next: FieldState = [new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)];
      const cfg = configRef.current;
      for (let y = 0; y < H; y++) {
        const yu = ((y - 1 + H) % H) * W;
        const yd = ((y + 1) % H) * W;
        const row = y * W;
        for (let x = 0; x < W; x++) {
          const xl = (x - 1 + W) % W;
          const xr = (x + 1) % W;
          const index = row + x;
          for (let dest = 0; dest < 3; dest++) {
            let acc = 0;
            for (let source = 0; source < 3; source++) {
              const field = src[source];
              const mask = weights[source];
              const center = field[index];
              const centerWeight = mask[index];
              const right = field[row + xr];
              const left = field[row + xl];
              const down = field[yd + x];
              const up = field[yu + x];
              const dx = (right - center) * centerWeight;
              const dy = (down - center) * centerWeight;
              const grad = Math.sqrt(dx * dx + dy * dy);
              const lap =
                (centerWeight + mask[row + xr]) * .5 * (right - center) +
                (centerWeight + mask[row + xl]) * .5 * (left - center) +
                (centerWeight + mask[yd + x]) * .5 * (down - center) +
                (centerWeight + mask[yu + x]) * .5 * (up - center);
              const values = [center * centerWeight, dx, dy, grad, lap];
              for (let template = 0; template < 5; template++) acc += cfg.k[indexK(dest, source, template)] * values[template];
            }
            let value = (1 - cfg.decay) * src[dest][index] + cfg.dt * acc;
            value = Math.sign(value) * Math.pow(Math.abs(value), cfg.exponent[dest]);
            if (cfg.noise > 0) value += (Math.random() - .5) * cfg.noise;
            next[dest][index] = clamp01(value);
          }
        }
      }
      fieldRef.current = next;
    };

    const step = () => {
      const weights = boundaryRef.current;
      if (weights) stepBoundary(weights);
      else stepOriginal();
    };

    const updateAutomatedPointer = (now: number) => {
      if (foundryModeRef.current !== "cursor") return;
      const settings = autoCursorRef.current;
      const seconds = (now - cursorStartRef.current) / 1000;
      const harmonic = (frequency: number, values: number[], phase: number) => {
        const normalizer = Math.max(1, values.reduce((sum, value) => sum + Math.abs(value), 0));
        return values.reduce((sum, value, index) => sum + value * Math.sin(2*Math.PI*frequency*(index+1)*seconds + phase), 0) / normalizer;
      };
      const localX = settings.amplitudeX * harmonic(settings.frequencyX, settings.harmonicsX, 0);
      const localY = settings.amplitudeY * harmonic(settings.frequencyY, settings.harmonicsY, Math.PI/2);
      const angle = settings.angularVelocity * seconds;
      pointerRef.current.x = clamp(.5 + localX*Math.cos(angle) - localY*Math.sin(angle), .001, .999);
      pointerRef.current.y = clamp(.5 + localX*Math.sin(angle) + localY*Math.cos(angle), .001, .999);
      pointerRef.current.active = true;
    };

    const updateRecursiveBoundary = (now: number) => {
      if (!recursiveBoundary || boundaryHeldRef.current) return;
      const transition = boundaryTransitionRef.current;
      if (transition) {
        const raw = clamp01((now - transition.startedAt) / Math.max(1, transition.duration));
        const blend = raw * raw * (3 - 2 * raw);
        const wildness = Math.sin(Math.PI * raw) * recursiveSettingsRef.current.transitionWildness * .16;
        for (let channel = 0; channel < 3; channel++) for (let index = 0; index < SIZE; index++) {
          const from = transition.from[channel][index];
          const to = transition.target[channel][index];
          const turbulence = Math.sin(index*12.9898 + channel*78.233 + transition.startedAt*.001);
          transition.current[channel][index] = clamp01(from + (to-from)*blend + turbulence*wildness);
        }
        boundaryRef.current = transition.current;
        if (raw >= 1) {
          boundaryRef.current = transition.target;
          boundaryTransitionRef.current = null;
          setBoundaryStatus("Boundary morph complete");
        }
      }
      const settings = recursiveSettingsRef.current;
      if (recursiveModeRef.current === "manual" || now - lastBoundaryScanRef.current < settings.interval*1000) return;
      lastBoundaryScanRef.current = now;
      const metrics = analyzeField(fieldRef.current);
      setFieldMetrics(metrics);
      if (recursiveModeRef.current === "periodic") {
        replaceBoundary("Periodic field capture");
        return;
      }
      const brightEnough = metrics.brightness >= settings.brightnessGate;
      const detailedEnough = metrics.detail >= settings.detailGate;
      if (brightEnough && detailedEnough && Math.random() < settings.luckChance) {
        replaceBoundary("Luckfield accepted this state");
      } else if (!brightEnough) setBoundaryStatus("Waiting for amplitude");
      else if (!detailedEnough) setBoundaryStatus("Waiting for richer detail");
      else setBoundaryStatus("Interesting field passed; luck declined");
    };

    const draw = () => {
      const field = fieldRef.current;
      for (let index = 0; index < SIZE; index++) {
        const offset = index * 4;
        image.data[offset] = Math.round(field[0][index] * 255);
        image.data[offset + 1] = Math.round(field[1][index] * 255);
        image.data[offset + 2] = Math.round(field[2][index] * 255);
        image.data[offset + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      if (foundryModeRef.current === "cursor") {
        ctx.beginPath();
        ctx.arc(pointerRef.current.x*W, pointerRef.current.y*H, Math.max(2, brushRef.current*.55), 0, Math.PI*2);
        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const locate = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = Math.max(0, Math.min(.999, (event.clientX - rect.left) / rect.width));
      pointerRef.current.y = Math.max(0, Math.min(.999, (event.clientY - rect.top) / rect.height));
    };
    const down = (event: PointerEvent) => {
      if (foundryModeRef.current === "cursor") return;
      locate(event);
      pointerRef.current.active = true;
      paintModeRef.current = event.button === 2 ? "erase" : selectedPaintRef.current;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => locate(event);
    const up = () => { pointerRef.current.active = false; paintModeRef.current = selectedPaintRef.current; };
    const preventMenu = (event: MouseEvent) => event.preventDefault();

    let last = performance.now();
    const loop = (now: number) => {
      updateAutomatedPointer(now);
      updateRecursiveBoundary(now);
      if (!pausedRef.current && now - last > 24) {
        paint();
        step();
        last = now;
      } else paint();
      if (autoMutateRef.current && now - mutationTimeRef.current > 5000) {
        mutate();
        mutationTimeRef.current = now;
      }
      draw();
      frameRef.current = requestAnimationFrame(loop);
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("contextmenu", preventMenu);
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("contextmenu", preventMenu);
    };
  }, [mutate, recursiveBoundary, replaceBoundary, seedNoise]);

  const setScalar = (key: "dt" | "decay" | "noise", value: number) => setConfig((current) => ({ ...current, [key]: value }));
  const setExponent = (channel: number, value: number) => setConfig((current) => ({ ...current, exponent: current.exponent.map((item, index) => index === channel ? value : item) }));
  const setCoefficient = (source: number, template: number, value: number) => setConfig((current) => {
    const k = [...current.k];
    k[indexK(destination, source, template)] = value;
    return { ...current, k };
  });
  const subsequentPresets = sharedPresets.filter((preset) => !archivedFingerprints.has(JSON.stringify(preset.config)));
  const bankSize = presets.length + archivedPresets.length + (anchorBank !== "curated" ? subsequentPresets.length : 0);
  const bankSizeLabel = anchorBank === "color-cycle"
    ? `${bankSize} states · 6 color identities each`
    : `${bankSize} states`;

  return (
    <section className={`deq-lab ${recursiveBoundary ? "luckfield-lab" : ""}`}>
      <div className={`deq-stage ${recursiveBoundary ? "luckfield-stage" : ""}`}>
        <canvas ref={canvasRef} width={W} height={H} className="deq-canvas" aria-label="Interactive three-channel nonlinear differential-equation field. Drag to paint into the system." />
        <div className="deq-status"><b>{paused ? "FIELD PAUSED" : "FIELD RUNNING"}</b><span>{recursiveBoundary ? `${boundaryMutations} boundary captures` : `${mutationCount} parameter mutations`}</span></div>
      </div>
      <aside className="deq-controls">
        {recursiveBoundary && <>
          <div className="deq-top-controls">
            <label className="preset-select"><span className="control-label">Equation preset</span><select value={presetName} onChange={(event) => applyPreset(event.target.value)}>{presets.map((preset) => <option key={preset.name}>{preset.name}</option>)}</select></label>
            <div className="transport deq-transport"><button onClick={() => setPaused((value) => !value)}>{paused ? "Resume field" : "Pause field"}</button><button onClick={seedNoise}>Re-seed</button><button onClick={mutate}>Mutate equation</button></div>
          </div>
          <div className="control-block luckfield-console">
            <div className="luckfield-title"><span className="control-label">Recursive boundary engine</span><b>{boundaryHeld ? "HELD" : recursiveMode.toUpperCase()}</b></div>
            <div className="deq-foundry-tabs" role="tablist" aria-label="Boundary replacement mode">
              {(["luckfield","periodic","manual"] as RecursiveMode[]).map((mode) => <button key={mode} role="tab" aria-selected={recursiveMode===mode} className={recursiveMode===mode?"active":""} onClick={()=>setRecursiveMode(mode)}>{mode === "luckfield" ? "The Luckfield" : mode}</button>)}
            </div>
            <div className="luckfield-actions transport">
              <button className={boundaryHeld ? "active" : ""} onClick={()=>setBoundaryHeld((value)=>!value)}>{boundaryHeld ? "Resume boundaries" : "Hold boundaries"}</button>
              <button onClick={resetBoundary}>Reset boundary conditions</button>
              <button className="luckfield-mutate" onClick={()=>replaceBoundary("Manual field capture")}>Mutate from current field</button>
            </div>
            <p className="luckfield-status" aria-live="polite">{boundaryStatus}</p>
            <div className="luckfield-meter" aria-label="Current field interestingness">
              <span><i style={{width:`${fieldMetrics.brightness*100}%`}}/>Amplitude <b>{Math.round(fieldMetrics.brightness*100)}</b></span>
              <span><i style={{width:`${fieldMetrics.detail*100}%`}}/>Detail <b>{Math.round(fieldMetrics.detail*100)}</b></span>
              <small>Entropy {Math.round(fieldMetrics.entropy*100)} · contrast {Math.round(fieldMetrics.contrast*100)} · color variance {Math.round(fieldMetrics.colorVariance*100)}</small>
            </div>
            <div className="deq-morph-sliders luckfield-sliders">
              <label><span>{recursiveMode === "periodic" ? "Capture interval" : "Interestingness scan"}</span><output>{recursiveSettings.interval.toFixed(1)} s</output><input type="range" min="1" max="20" step=".5" value={recursiveSettings.interval} onChange={(event)=>setRecursiveValue("interval",Number(event.target.value))}/></label>
              {recursiveMode === "luckfield" && <>
                <label><span>Brightness gate</span><output>{Math.round(recursiveSettings.brightnessGate*100)}%</output><input type="range" min="0" max=".8" step=".01" value={recursiveSettings.brightnessGate} onChange={(event)=>setRecursiveValue("brightnessGate",Number(event.target.value))}/></label>
                <label><span>True detail gate</span><output>{Math.round(recursiveSettings.detailGate*100)}%</output><input type="range" min=".05" max=".9" step=".01" value={recursiveSettings.detailGate} onChange={(event)=>setRecursiveValue("detailGate",Number(event.target.value))}/></label>
                <label><span>Luck at the gate</span><output>{Math.round(recursiveSettings.luckChance*100)}%</output><input type="range" min=".02" max="1" step=".01" value={recursiveSettings.luckChance} onChange={(event)=>setRecursiveValue("luckChance",Number(event.target.value))}/></label>
              </>}
              <label><span>Boundary morph time</span><output>{recursiveSettings.transitionTime.toFixed(1)} s</output><input type="range" min=".15" max="10" step=".05" value={recursiveSettings.transitionTime} onChange={(event)=>setRecursiveValue("transitionTime",Number(event.target.value))}/></label>
              <label><span>Replacement wildness</span><output>{Math.round(recursiveSettings.transitionWildness*100)}%</output><input type="range" min="0" max="1" step=".01" value={recursiveSettings.transitionWildness} onChange={(event)=>setRecursiveValue("transitionWildness",Number(event.target.value))}/></label>
              <label><span>Old-chunk glitch carry</span><output>{Math.round(recursiveSettings.glitchCarry*100)}%</output><input type="range" min="0" max="1" step=".01" value={recursiveSettings.glitchCarry} onChange={(event)=>setRecursiveValue("glitchCarry",Number(event.target.value))}/></label>
            </div>
          </div>
          <div className="control-block luckfield-morph-bank">
            <label className="preset-select deq-bank-select"><span className="control-label">Equation morph bank · {bankSizeLabel}</span><select value={anchorBank} onChange={(event)=>setAnchorBank(event.target.value as AnchorBank)}><option value="color-cycle">Full bank · all six RGB permutations</option><option value="all">All anchors · original colors</option><option value="curated">Curated · locked clean set</option></select></label>
            <div className="transport deq-foundry-actions"><button className={morphing ? "active" : ""} onClick={()=>setMorphing((value)=>!value)}>{morphing ? "Hold equation morph" : "Resume equation morph"}</button><button onClick={mutate}>Wild-card mutation</button></div>
            <div className="deq-morph-sliders">
              <label><span>Equation traversal rate</span><output>{morphRate.toFixed(2)}×</output><input type="range" min=".15" max="3" step=".05" value={morphRate} onChange={(event)=>{const value=Number(event.target.value);morphRateRef.current=value;setMorphRate(value);}}/></label>
              <label><span>Equation transition wildness</span><output>{Math.round(morphRandomness*100)}%</output><input type="range" min="0" max="1" step=".01" value={morphRandomness} onChange={(event)=>{const value=Number(event.target.value);morphRandomnessRef.current=value;setMorphRandomness(value);}}/></label>
            </div>
            <b className="deq-bank-summary">{bankLoadStatus}</b>
          </div>
        </>}
        {presetFoundry && <div className="control-block deq-foundry">
          <div className="deq-foundry-title"><span className="control-label">Anonymous master bank</span><b>{archivedPresets.length} archived · {sharedPresets.length}/{sharedPresetTotal || "?"} live</b></div>
          <b className="deq-bank-summary">{archivedPresets.length} curated · {subsequentPresets.length} subsequent · {bankLoadStatus}</b>
          <div className="deq-foundry-tabs" role="tablist" aria-label="Field input mode">
            <button role="tab" aria-selected={foundryMode==="standard"} className={foundryMode==="standard"?"active":""} onClick={()=>switchFoundryMode("standard")}>Standard field</button>
            <button role="tab" aria-selected={foundryMode==="photo"} className={foundryMode==="photo"?"active":""} onClick={()=>switchFoundryMode("photo")}>Photo boundary</button>
            <button role="tab" aria-selected={foundryMode==="cursor"} className={foundryMode==="cursor"?"active":""} onClick={()=>switchFoundryMode("cursor")}>Auto cursor</button>
          </div>
          {foundryMode==="photo" && <div className="deq-input-panel">
            <span className="control-label">RGB operator weights</span>
            <div className="deq-photo-actions">
              <label className="deq-file-input"><input type="file" accept="image/*" onChange={(event)=>{const file=event.target.files?.[0];if(file)void loadBoundaryImage(file);event.currentTarget.value="";}}/><span>Choose a photo</span></label>
              <button className="deq-clear-input" onClick={()=>{uploadedBoundaryRef.current=null;boundaryRef.current=null;setBoundaryName("No photo loaded");}}>Clear</button>
            </div>
            <p>{boundaryName}</p>
            <small>RGB scales gain and gradients by channel. Laplacian terms become div(RGB · grad(field)). The photo fills the field with a centered cover crop.</small>
          </div>}
          {foundryMode==="cursor" && <div className="deq-input-panel deq-cursor-panel">
            <span className="control-label">Rotating Lissajous brush path</span>
            <div className="deq-cursor-numbers">
              <label><span>X frequency</span><input type="number" min=".01" max="20" step=".01" value={autoCursor.frequencyX} onChange={(event)=>updateAutoCursor(current=>({...current,frequencyX:clamp(Number(event.target.value),.01,20)}))}/></label>
              <label><span>Y frequency</span><input type="number" min=".01" max="20" step=".01" value={autoCursor.frequencyY} onChange={(event)=>updateAutoCursor(current=>({...current,frequencyY:clamp(Number(event.target.value),.01,20)}))}/></label>
            </div>
            <div className="deq-cursor-sliders">
              <label><span>X amplitude</span><output>{autoCursor.amplitudeX.toFixed(2)}</output><input type="range" min="0" max=".49" step=".01" value={autoCursor.amplitudeX} onChange={(event)=>updateAutoCursor(current=>({...current,amplitudeX:Number(event.target.value)}))}/></label>
              <label><span>Y amplitude</span><output>{autoCursor.amplitudeY.toFixed(2)}</output><input type="range" min="0" max=".49" step=".01" value={autoCursor.amplitudeY} onChange={(event)=>updateAutoCursor(current=>({...current,amplitudeY:Number(event.target.value)}))}/></label>
              <label><span>Angular velocity</span><output>{autoCursor.angularVelocity.toFixed(2)} rad/s</output><input type="range" min="-2" max="2" step=".01" value={autoCursor.angularVelocity} onChange={(event)=>updateAutoCursor(current=>({...current,angularVelocity:Number(event.target.value)}))}/></label>
            </div>
            <div className="deq-harmonic-grid">
              {(["X","Y"] as const).map((axis)=>{const values=axis==="X"?autoCursor.harmonicsX:autoCursor.harmonicsY;return <div key={axis}><b>{axis} harmonics</b>{values.map((value,index)=><label key={`${axis}-${index}`}><span>{index+1}</span><input type="range" min="-1" max="1" step=".01" value={value} onChange={(event)=>updateAutoCursor(current=>{const key=axis==="X"?"harmonicsX":"harmonicsY";const next=[...current[key]];next[index]=Number(event.target.value);return {...current,[key]:next};})}/><output>{value.toFixed(2)}</output></label>)}</div>})}
            </div>
          </div>}
          <label className="preset-select deq-bank-select"><span className="control-label">Morph anchor bank · {bankSizeLabel}</span><select value={anchorBank} onChange={(event)=>setAnchorBank(event.target.value as AnchorBank)}><option value="all">All · curated + future saves</option><option value="curated">Curated · locked clean set</option><option value="color-cycle">Color cycle · six RGB identities</option></select></label>
          <div className="transport deq-foundry-actions">
            <button onClick={saveCurrentState}>Save current state</button>
            <button className={morphing ? "active" : ""} onClick={() => { setAutoMutate(false); setMorphing((value) => !value); }}>{morphing ? "Hold morph" : "Morph all anchors"}</button>
          </div>
          <div className="deq-morph-sliders">
            <label><span>Traversal rate</span><output>{morphRate.toFixed(2)}×</output><input type="range" min=".15" max="3" step=".05" value={morphRate} onChange={(event) => { const value=Number(event.target.value);morphRateRef.current=value;setMorphRate(value); }} /></label>
            <label><span>Transition wildness</span><output>{Math.round(morphRandomness*100)}%</output><input type="range" min="0" max="1" step=".01" value={morphRandomness} onChange={(event) => { const value=Number(event.target.value);morphRandomnessRef.current=value;setMorphRandomness(value); }} /></label>
          </div>
          <label className="preset-select deq-shared-select"><span className="control-label">Jump to a found state</span><select defaultValue="" onChange={(event) => applySavedPreset(event.target.value)}><option value="" disabled>Select saved anchor</option><optgroup label="Curated">{archivedPresets.map((preset) => <option key={`archive-${preset.id}`} value={`archive:${preset.id}`}>Curated {String(preset.id).padStart(3, "0")}</option>)}</optgroup>{anchorBank!=="curated"&&<optgroup label="Subsequent saves">{subsequentPresets.map((preset) => <option key={`live-${preset.id}`} value={`live:${preset.id}`}>All {String(preset.id).padStart(3, "0")}</option>)}</optgroup>}</select></label>
          <p className="deq-save-status" aria-live="polite">{saveStatus}</p>
        </div>}
        {!recursiveBoundary && <div className="deq-top-controls">
          <label className="preset-select"><span className="control-label">Preset</span><select value={presetName} onChange={(event) => applyPreset(event.target.value)}>{presets.map((preset) => <option key={preset.name}>{preset.name}</option>)}</select></label>
          <div className="transport deq-transport"><button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button><button onClick={seedNoise}>Re-seed</button><button onClick={mutate}>Mutate now</button></div>
        </div>}
        <div className="control-block">
          <span className="control-label">Screensaver evolution</span>
          <button className={`toggle-wide ${autoMutate ? "active" : ""}`} onClick={() => setAutoMutate((value) => !value)}>Auto-mutate every 5 seconds · {autoMutate ? "on" : "off"}</button>
        </div>
        <div className="deq-scalar-grid">
          <label><span>Time step</span><input type="number" step=".001" value={Number(config.dt.toFixed(3))} onChange={(event) => setScalar("dt", Number(event.target.value))} /></label>
          <label><span>Decay</span><input type="number" step=".001" value={Number(config.decay.toFixed(3))} onChange={(event) => setScalar("decay", Number(event.target.value))} /></label>
          <label><span>Noise</span><input type="number" step=".001" value={Number(config.noise.toFixed(3))} onChange={(event) => setScalar("noise", Number(event.target.value))} /></label>
        </div>
        <div className="control-block">
          <span className="control-label">Nonlinear exponent by channel</span>
          <div className="exponent-row">{config.exponent.map((value, index) => <label key={channels[index]}><i className={`channel-${index}`} />{channels[index]}<input type="number" step=".05" value={Number(value.toFixed(2))} onChange={(event) => setExponent(index, Number(event.target.value))} /></label>)}</div>
        </div>
        <div className="control-block matrix-block">
          <div className="matrix-title"><span className="control-label">Coupling tensor · destination</span><div className="channel-tabs">{channels.map((channel, index) => <button key={channel} className={destination === index ? "active" : ""} onClick={() => setDestination(index)}>{channel}</button>)}</div></div>
          <div className="matrix-grid">
            <span />
            {templates.map((template) => <b key={template}>{template}</b>)}
            {channels.map((channel, source) => [
              <strong key={`${channel}-label`}>{channel}→</strong>,
              ...templates.map((template, templateIndex) => <input key={`${channel}-${template}`} aria-label={`${channel} through ${template} into ${channels[destination]}`} type="number" step=".1" value={Number(config.k[indexK(destination, source, templateIndex)].toFixed(3))} onChange={(event) => setCoefficient(source, templateIndex, Number(event.target.value))} />),
            ])}
          </div>
        </div>
        <div className="control-block">
          <span className="control-label">Brush</span>
          <div className="segmented"><button className={paintMode === "color" ? "active" : ""} onClick={() => setPaintMode("color")}>Color</button><button className={paintMode === "erase" ? "active" : ""} onClick={() => setPaintMode("erase")}>Erase</button></div>
          <label className="deq-paint-color"><span>Draw color</span><input type="color" aria-label="Select brush color" value={paintColor} onChange={(event) => setPaintColor(event.target.value)} /></label>
          <label className="brush-size"><span>Radius</span><input type="range" min="1" max="22" value={brush} onChange={(event) => setBrush(Number(event.target.value))} /><output>{brush}</output></label>
        </div>
        <p className="lab-note">Paint directly into the field. Each matrix cell maps a source color through a spatial operator into the selected destination color. Right-click erases on desktop.</p>
      </aside>
    </section>
  );
}
