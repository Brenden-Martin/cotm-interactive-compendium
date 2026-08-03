"use client";

import { CSSProperties, KeyboardEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import atlasData from "../../../analysis/deq-preset-space/output/atlas-model.json";

const W = 160;
const H = 90;
const SIZE = W * H;
const TAU = Math.PI * 2;
const INITIAL_POSITION = .37;
const INITIAL_EXCURSION = .18;

type Config = { k: number[]; exponent: number[]; dt: number; decay: number; noise: number };
type FieldState = [Float32Array, Float32Array, Float32Array];
type AtlasModel = {
  dimensions: number;
  dataset: { named_total: number; unique_exact: number; mainFamily: number; outerFamily: number };
  fit: { explainedVariance: number; sampleCount: number; excursionScale: number };
  featureSpace: {
    scales: { effective_k: number; exponent_delta: number; decay: number; noise: number };
    mean: number[];
    components: number[][];
  };
  curve: { points: number[][]; tangents: number[][]; radii: number[] };
};
type AtlasState = { config: Config; point: number[]; radius: number; effectiveRms: number };

const model = atlasData as AtlasModel;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const lerp = (left: number, right: number, amount: number) => left + (right - left) * amount;
const indexK = (destination: number, source: number, template: number) => (destination * 3 + source) * 5 + template;

function curveSample(position: number) {
  const scaled = clamp(position, 0, 1) * (model.curve.points.length - 1);
  const left = Math.min(Math.floor(scaled), model.curve.points.length - 2);
  const amount = scaled - left;
  return {
    point: model.curve.points[left].map((value, index) => lerp(value, model.curve.points[left + 1][index], amount)),
    tangent: model.curve.tangents[left].map((value, index) => lerp(value, model.curve.tangents[left + 1][index], amount)),
    radius: lerp(model.curve.radii[left], model.curve.radii[left + 1], amount),
  };
}

function atlasState(position: number, excursion: number): AtlasState {
  const sample = curveSample(position);
  const raw = Array.from({ length: model.dimensions }, (_, index) => {
    const primary = Math.sin(TAU * (position * (1.41 + index * .713) + excursion * (2.03 + index * 1.137) + index * .173));
    const secondary = Math.sin(TAU * (position * (3.17 + index * .337) - excursion * (1.19 + index * .619) + index * .311));
    return primary + secondary * .47;
  });
  const tangentLength = Math.hypot(...sample.tangent) || 1;
  const tangent = sample.tangent.map((value) => value / tangentLength);
  const tangentProjection = raw.reduce((sum, value, index) => sum + value * tangent[index], 0);
  const normal = raw.map((value, index) => value - tangentProjection * tangent[index]);
  const normalLength = Math.hypot(...normal) || 1;
  const amplitude = model.fit.excursionScale * Math.pow(clamp(excursion, 0, 1), 1.18) * sample.radius;
  const point = sample.point.map((value, index) => value + normal[index] / normalLength * amplitude);

  const features = model.featureSpace.mean.map((mean, feature) => {
    let value = mean;
    for (let dimension = 0; dimension < model.dimensions; dimension++) {
      value += point[dimension] * model.featureSpace.components[dimension][feature];
    }
    return value;
  });
  const scales = model.featureSpace.scales;
  const effectiveK = features.slice(0, 45).map((value) => value * scales.effective_k);
  const maximumCoupling = Math.max(...effectiveK.map(Math.abs), .001);
  const dt = clamp(Math.max(.35, maximumCoupling / 80), .35, 2);
  const k = effectiveK.map((value) => clamp(value / dt, -100, 100));
  const exponent = features.slice(45, 48).map((value) => clamp(1 + value * scales.exponent_delta, .25, 3));
  const decay = clamp(features[48] * scales.decay, 0, .95);
  const noise = clamp(features[49] * scales.noise, 0, .02);
  const effectiveRms = Math.sqrt(effectiveK.reduce((sum, value) => sum + value * value, 0) / effectiveK.length);
  return { config: { k, exponent, dt, decay, noise }, point, radius: sample.radius, effectiveRms };
}

function coordinateSeed(position: number, excursion: number) {
  const text = `${position.toFixed(4)}:${excursion.toFixed(4)}:COTM-ATLAS`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function Dial({ label, value, onChange, accent }: { label: string; value: number; onChange: (value: number) => void; accent: string }) {
  const dialRef = useRef<HTMLDivElement>(null);
  const setFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const dial = dialRef.current;
    if (!dial) return;
    const bounds = dial.getBoundingClientRect();
    let angle = Math.atan2(event.clientY - (bounds.top + bounds.height / 2), event.clientX - (bounds.left + bounds.width / 2)) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    if (angle < 135) angle += 360;
    onChange(clamp((angle - 135) / 270, 0, 1));
  };
  const commitInput = (input: HTMLInputElement) => {
    const parsed = Number(input.value);
    if (Number.isFinite(parsed)) onChange(clamp(parsed, 0, 1));
    else input.value = value.toFixed(3);
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? .01 : .001;
    if (["ArrowRight", "ArrowUp"].includes(event.key)) { event.preventDefault(); onChange(clamp(value + amount, 0, 1)); }
    if (["ArrowLeft", "ArrowDown"].includes(event.key)) { event.preventDefault(); onChange(clamp(value - amount, 0, 1)); }
    if (event.key === "Home") { event.preventDefault(); onChange(0); }
    if (event.key === "End") { event.preventDefault(); onChange(1); }
  };
  const style = { "--atlas-angle": `${-135 + value * 270}deg`, "--atlas-accent": accent } as CSSProperties;
  return (
    <label className="atlas-dial-group">
      <span>{label}</span>
      <div
        ref={dialRef}
        className="atlas-dial"
        style={style}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={Number(value.toFixed(3))}
        onKeyDown={key}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setFromPointer(event); }}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPointer(event); }}
      ><i /></div>
      <input
        key={value.toFixed(3)}
        type="number"
        min="0"
        max="1"
        step=".001"
        defaultValue={value.toFixed(3)}
        onBlur={(event) => commitInput(event.currentTarget)}
        onKeyDown={(event) => { if (event.key === "Enter") { commitInput(event.currentTarget); event.currentTarget.blur(); } }}
      />
    </label>
  );
}

export function DeqAtlas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef<Config>(atlasState(INITIAL_POSITION, INITIAL_EXCURSION).config);
  const coordinatesRef = useRef({ position: INITIAL_POSITION, excursion: INITIAL_EXCURSION });
  const pausedRef = useRef(false);
  const [position, setPosition] = useState(INITIAL_POSITION);
  const [excursion, setExcursion] = useState(INITIAL_EXCURSION);
  const [paused, setPaused] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [copyStatus, setCopyStatus] = useState("Two numbers · one repeatable field");
  const derived = useMemo(() => atlasState(position, excursion), [position, excursion]);

  useEffect(() => { configRef.current = derived.config; }, [derived]);
  useEffect(() => { coordinatesRef.current = { position, excursion }; }, [position, excursion]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(W, H);
    const resetCoordinates = coordinatesRef.current;
    let randomState = coordinateSeed(resetCoordinates.position, resetCoordinates.excursion);
    const random = () => {
      randomState = (randomState + 0x6D2B79F5) >>> 0;
      let value = randomState;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
    let field: FieldState = [new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)];
    for (let index = 0; index < SIZE; index++) {
      field[0][index] = .5 + (random() - .5) * .5;
      field[1][index] = .5 + (random() - .5) * .5;
      field[2][index] = .5 + (random() - .5) * .5;
    }
    const step = () => {
      const next: FieldState = [new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)];
      const config = configRef.current;
      for (let y = 0; y < H; y++) {
        const up = ((y - 1 + H) % H) * W;
        const down = ((y + 1) % H) * W;
        const row = y * W;
        for (let x = 0; x < W; x++) {
          const left = (x - 1 + W) % W;
          const right = (x + 1) % W;
          const index = row + x;
          for (let destination = 0; destination < 3; destination++) {
            let accumulator = 0;
            for (let source = 0; source < 3; source++) {
              const center = field[source][index];
              const dx = field[source][row + right] - center;
              const dy = field[source][down + x] - center;
              const gradient = Math.sqrt(dx * dx + dy * dy);
              const laplacian = field[source][row + left] + field[source][row + right] + field[source][up + x] + field[source][down + x] - 4 * center;
              const operators = [center, dx, dy, gradient, laplacian];
              for (let operator = 0; operator < 5; operator++) accumulator += config.k[indexK(destination, source, operator)] * operators[operator];
            }
            let value = (1 - config.decay) * field[destination][index] + config.dt * accumulator;
            value = Math.sign(value) * Math.pow(Math.abs(value), config.exponent[destination]);
            if (config.noise > 0) value += (random() - .5) * config.noise;
            next[destination][index] = clamp(value, 0, 1);
          }
        }
      }
      field = next;
    };
    const draw = () => {
      for (let index = 0; index < SIZE; index++) {
        const offset = index * 4;
        image.data[offset] = Math.round(field[0][index] * 255);
        image.data[offset + 1] = Math.round(field[1][index] * 255);
        image.data[offset + 2] = Math.round(field[2][index] * 255);
        image.data[offset + 3] = 255;
      }
      context.putImageData(image, 0, 0);
    };
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      if (!pausedRef.current && now - last > 24) { step(); last = now; }
      draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [resetToken]); // Reset intentionally freezes the current coordinates into a repeatable initial field.

  useEffect(() => {
    const canvas = mapRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const points = model.curve.points;
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const project = (point: number[]) => [
      18 + (point[0] - minX) / Math.max(maxX - minX, 1e-9) * (canvas.width - 36),
      canvas.height - 18 - (point[1] - minY) / Math.max(maxY - minY, 1e-9) * (canvas.height - 36),
    ];
    context.fillStyle = "#0b111a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(244,240,223,.12)";
    context.lineWidth = 1;
    for (let line = 1; line < 6; line++) {
      context.beginPath(); context.moveTo(line * canvas.width / 6, 0); context.lineTo(line * canvas.width / 6, canvas.height); context.stroke();
    }
    context.beginPath();
    points.forEach((point, index) => { const [x, y] = project(point); if (index === 0) context.moveTo(x, y); else context.lineTo(x, y); });
    context.strokeStyle = "#20d7d7";
    context.lineWidth = 2;
    context.stroke();
    const base = project(curveSample(position).point);
    const current = project(derived.point);
    context.beginPath(); context.moveTo(base[0], base[1]); context.lineTo(current[0], current[1]);
    context.strokeStyle = "#e74731"; context.lineWidth = 1; context.stroke();
    context.beginPath(); context.arc(current[0], current[1], 5, 0, TAU);
    context.fillStyle = "#f2dc43"; context.fill(); context.strokeStyle = "#0b111a"; context.stroke();
  }, [derived, position]);

  const copyCoordinates = async () => {
    const text = `DEQ Atlas · position ${position.toFixed(3)} · excursion ${excursion.toFixed(3)}`;
    try { await navigator.clipboard.writeText(text); setCopyStatus("Coordinates copied"); }
    catch { setCopyStatus(text); }
  };

  return (
    <section className="atlas-lab">
      <div className="atlas-stage">
        <canvas ref={canvasRef} width={W} height={H} className="atlas-field" aria-label="A deterministic nonlinear three-channel field selected by atlas position and excursion." />
        <div className="atlas-readout"><b>{paused ? "FIELD HELD" : "FIELD RUNNING"}</b><span>S {position.toFixed(3)} · X {excursion.toFixed(3)}</span></div>
      </div>
      <aside className="atlas-console">
        <div className="atlas-console-head">
          <span className="control-label">Seven-dimensional navigator</span>
          <strong>{Math.round(model.fit.explainedVariance * 100)}% variance retained</strong>
        </div>
        <canvas ref={mapRef} width={420} height={185} className="atlas-map" aria-label="Two-dimensional projection of the seven-dimensional atlas route and current point." />
        <div className="atlas-dials">
          <Dial label="Route position" value={position} onChange={setPosition} accent="#20d7d7" />
          <Dial label="Deterministic chaos" value={excursion} onChange={setExcursion} accent="#e74731" />
        </div>
        <div className="atlas-actions">
          <button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Hold"}</button>
          <button onClick={() => setResetToken((value) => value + 1)}>Restart exact field</button>
          <button onClick={() => setExcursion(0)}>Return to curve</button>
          <button onClick={copyCoordinates}>Copy coordinates</button>
        </div>
        <div className="atlas-metrics">
          <span><b>{model.dataset.mainFamily}</b> fitted anchors</span>
          <span><b>{derived.radius.toFixed(3)}</b> local width</span>
          <span><b>{derived.effectiveRms.toFixed(3)}</b> coupling RMS</span>
          <span><b>{model.dimensions}</b> dimensions</span>
        </div>
        <p className="atlas-copy-status" aria-live="polite">{copyStatus}</p>
        <p className="atlas-note">Position follows the learned main route. Chaos leaves it along a smooth, repeatable transverse field scaled by the density of nearby saved states. Set both numbers again and restart to reproduce the same evolution.</p>
      </aside>
    </section>
  );
}
