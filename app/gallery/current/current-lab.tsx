"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  createCurrentGrid,
  currentAt,
  diagnoseCurrent,
  iterateCurrent,
  paintMask,
  resetPotential,
  updateConductivity,
  type CurrentBias,
  type CurrentDiagnostics,
  type CurrentGrid,
} from "../../shared/current-flow";

type Resolution = { columns: number; rows: number; label: string };
type Preset = "empty" | "funnel" | "maze" | "lattice" | "islands";

const RESOLUTIONS: Resolution[] = [
  { columns: 80, rows: 60, label: "80 × 60 · quick" },
  { columns: 112, rows: 84, label: "112 × 84 · standard" },
  { columns: 160, rows: 120, label: "160 × 120 · fine" },
];
const EMPTY_DIAGNOSTICS: CurrentDiagnostics = { rmsResidual: 0, maxDelta: 0, sourceCurrent: 0, sinkCurrent: 0, imbalance: 0 };
const CYCLIC_STOPS = [
  [255, 117, 24],
  [119, 39, 190],
  [0, 214, 224],
  [156, 230, 28],
  [255, 198, 30],
  [255, 117, 24],
] as const;

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const formatScientific = (value: number) => value === 0 ? "0" : value.toExponential(2);

function cyclicColor(value: number) {
  const wrapped = ((value % 1) + 1) % 1;
  const scaled = wrapped * (CYCLIC_STOPS.length - 1);
  const lower = Math.floor(scaled);
  const blend = scaled - lower;
  const a = CYCLIC_STOPS[lower];
  const b = CYCLIC_STOPS[Math.min(CYCLIC_STOPS.length - 1, lower + 1)];
  return [
    Math.round(a[0] + (b[0] - a[0]) * blend),
    Math.round(a[1] + (b[1] - a[1]) * blend),
    Math.round(a[2] + (b[2] - a[2]) * blend),
  ];
}

function applyPreset(grid: CurrentGrid, preset: Preset) {
  const { columns, rows, mask } = grid;
  mask.fill(0);
  const set = (x: number, y: number, value = 1) => {
    if (x >= 0 && x < columns && y >= 0 && y < rows) mask[y * columns + x] = value;
  };
  if (preset === "funnel") {
    for (let y = 0; y < rows; y++) {
      const halfGap = 2 + Math.abs(y - rows / 2) * .34;
      const left = Math.round(columns / 2 - halfGap);
      const right = Math.round(columns / 2 + halfGap);
      for (let x = 0; x < columns; x++) if (x < left || x > right) set(x, y, .9);
    }
  } else if (preset === "maze") {
    const spacing = Math.max(7, Math.round(columns / 12));
    for (let x = spacing; x < columns - spacing; x += spacing) {
      const gap = (Math.floor(x / spacing) % 2 ? rows * .25 : rows * .75);
      for (let y = 3; y < rows - 3; y++) if (Math.abs(y - gap) > rows * .09) set(x, y);
    }
  } else if (preset === "lattice") {
    const spacing = Math.max(7, Math.round(columns / 11));
    for (let y = spacing; y < rows; y += spacing) for (let x = 0; x < columns; x++) set(x, y, .78);
    for (let x = spacing; x < columns; x += spacing) for (let y = 0; y < rows; y++) set(x, y, .78);
  } else if (preset === "islands") {
    const radius = Math.max(3, columns / 15);
    [[.25, .28], [.52, .25], [.72, .48], [.34, .68], [.58, .72]].forEach(([x, y], index) => paintMask(grid, x * columns, y * rows, radius * (index % 2 ? .72 : 1), 1));
  }
}

function drawPotential(canvas: HTMLCanvasElement, grid: CurrentGrid, bands: number, phase: number, residualOverlay: boolean) {
  const context = canvas.getContext("2d");
  if (!context) return;
  if (canvas.width !== grid.columns || canvas.height !== grid.rows) { canvas.width = grid.columns; canvas.height = grid.rows; }
  const image = context.createImageData(grid.columns, grid.rows);
  for (let index = 0; index < grid.potential.length; index++) {
    const color = cyclicColor(grid.potential[index] * bands + phase);
    const offset = index * 4;
    image.data[offset] = color[0]; image.data[offset + 1] = color[1]; image.data[offset + 2] = color[2]; image.data[offset + 3] = 255;
    if (grid.mask[index] > .02) {
      const mix = .2 + grid.mask[index] * .28;
      image.data[offset] = Math.round(image.data[offset] * (1 - mix) + 255 * mix);
      image.data[offset + 1] = Math.round(image.data[offset + 1] * (1 - mix) + 244 * mix);
      image.data[offset + 2] = Math.round(image.data[offset + 2] * (1 - mix) + 196 * mix);
    }
  }
  context.putImageData(image, 0, 0);
  if (residualOverlay) {
    context.fillStyle = "rgba(255,255,255,.72)";
    for (let index = 0; index < grid.fixed.length; index++) if (grid.fixed[index]) context.fillRect(index % grid.columns, Math.floor(index / grid.columns), 1, 1);
  }
}

function drawCurrent(canvas: HTMLCanvasElement, grid: CurrentGrid, arrowSpacing: number, arrowGain: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const box = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.round(box.width * ratio));
  const height = Math.max(1, Math.round(box.height * ratio));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const field = document.createElement("canvas");
  field.width = grid.columns; field.height = grid.rows;
  const fieldContext = field.getContext("2d")!;
  const image = fieldContext.createImageData(grid.columns, grid.rows);
  const magnitudes = new Float32Array(grid.potential.length);
  let maximum = 1e-12;
  for (let y = 0; y < grid.rows; y++) for (let x = 0; x < grid.columns; x++) {
    const current = currentAt(grid, x, y);
    const magnitude = Math.hypot(current.x, current.y);
    magnitudes[y * grid.columns + x] = magnitude;
    maximum = Math.max(maximum, magnitude);
  }
  const logMaximum = Math.log1p(maximum);
  for (let index = 0; index < magnitudes.length; index++) {
    const value = Math.log1p(magnitudes[index]) / logMaximum;
    const offset = index * 4;
    image.data[offset] = Math.round(7 + value * 248);
    image.data[offset + 1] = Math.round(10 + Math.pow(value, .72) * 178);
    image.data[offset + 2] = Math.round(22 + (1 - Math.abs(value - .45) * 1.7) * 135);
    image.data[offset + 3] = 255;
  }
  fieldContext.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = true;
  context.drawImage(field, 0, 0, width, height);
  context.strokeStyle = "rgba(255,255,238,.9)";
  context.fillStyle = "rgba(255,255,238,.9)";
  context.lineWidth = Math.max(1, ratio);
  const step = Math.max(3, arrowSpacing);
  for (let y = Math.floor(step / 2); y < grid.rows; y += step) for (let x = Math.floor(step / 2); x < grid.columns; x += step) {
    const current = currentAt(grid, x, y);
    const magnitude = Math.hypot(current.x, current.y);
    if (magnitude < 1e-12) continue;
    const normalized = Math.log1p(magnitude) / logMaximum;
    const length = clamp(normalized * step * arrowGain, 1.5, step * 1.8);
    const ux = current.x / magnitude;
    const uy = current.y / magnitude;
    const px = x / grid.columns * width;
    const py = y / grid.rows * height;
    const scaleX = width / grid.columns;
    const scaleY = height / grid.rows;
    const endX = px + ux * length * scaleX;
    const endY = py + uy * length * scaleY;
    const head = Math.min(6 * ratio, length * scaleX * .36);
    context.beginPath(); context.moveTo(px, py); context.lineTo(endX, endY); context.stroke();
    context.beginPath(); context.moveTo(endX, endY); context.lineTo(endX - ux * head - uy * head * .55, endY - uy * head + ux * head * .55); context.lineTo(endX - ux * head + uy * head * .55, endY - uy * head - ux * head * .55); context.closePath(); context.fill();
  }
}

export function CurrentLab() {
  const potentialCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef(createCurrentGrid(112, 84, "horizontal"));
  const pausedRef = useRef(false);
  const iterationsRef = useRef(8);
  const relaxationRef = useRef(.82);
  const bandsRef = useRef(7);
  const phaseRef = useRef(0);
  const arrowSpacingRef = useRef(9);
  const arrowGainRef = useRef(1.05);
  const residualOverlayRef = useRef(true);
  const contrastRef = useRef(3);
  const biasRef = useRef<CurrentBias>("horizontal");
  const brushRef = useRef(5);
  const eraseRef = useRef(false);
  const drawingRef = useRef(false);
  const stepRef = useRef(0);
  const cyclesRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [iterations, setIterations] = useState(8);
  const [relaxation, setRelaxation] = useState(.82);
  const [contrast, setContrast] = useState(3);
  const [resolution, setResolution] = useState(1);
  const [bias, setBias] = useState<CurrentBias>("horizontal");
  const [bands, setBands] = useState(7);
  const [phase, setPhase] = useState(0);
  const [arrowSpacing, setArrowSpacing] = useState(9);
  const [arrowGain, setArrowGain] = useState(1.05);
  const [brush, setBrush] = useState(5);
  const [erase, setErase] = useState(false);
  const [residualOverlay, setResidualOverlay] = useState(true);
  const [diagnostics, setDiagnostics] = useState(EMPTY_DIAGNOSTICS);
  const [cycles, setCycles] = useState(0);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { iterationsRef.current = iterations; }, [iterations]);
  useEffect(() => { relaxationRef.current = relaxation; }, [relaxation]);
  useEffect(() => { bandsRef.current = bands; }, [bands]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { arrowSpacingRef.current = arrowSpacing; }, [arrowSpacing]);
  useEffect(() => { arrowGainRef.current = arrowGain; }, [arrowGain]);
  useEffect(() => { residualOverlayRef.current = residualOverlay; }, [residualOverlay]);
  useEffect(() => { brushRef.current = brush; }, [brush]);
  useEffect(() => { eraseRef.current = erase; }, [erase]);

  const rebuild = (resolutionIndex = resolution, nextBias = bias) => {
    const selected = RESOLUTIONS[resolutionIndex];
    const next = createCurrentGrid(selected.columns, selected.rows, nextBias);
    updateConductivity(next, contrastRef.current);
    gridRef.current = next;
    cyclesRef.current = 0;
    setCycles(0);
  };

  useEffect(() => {
    let animation = 0;
    let lastDiagnostics = 0;
    const frame = (now: number) => {
      const grid = gridRef.current;
      let maximumDelta = 0;
      const requested = pausedRef.current ? stepRef.current : iterationsRef.current;
      if (requested > 0) {
        maximumDelta = iterateCurrent(grid, requested, relaxationRef.current);
        cyclesRef.current += requested;
        stepRef.current = 0;
      }
      if (potentialCanvasRef.current) drawPotential(potentialCanvasRef.current, grid, bandsRef.current, phaseRef.current, residualOverlayRef.current);
      if (currentCanvasRef.current) drawCurrent(currentCanvasRef.current, grid, arrowSpacingRef.current, arrowGainRef.current);
      if (now - lastDiagnostics > 180) {
        setDiagnostics(diagnoseCurrent(grid, maximumDelta));
        setCycles(cyclesRef.current);
        lastDiagnostics = now;
      }
      animation = requestAnimationFrame(frame);
    };
    animation = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animation);
  }, []);

  const paintFromPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = potentialCanvasRef.current!;
    const box = canvas.getBoundingClientRect();
    const grid = gridRef.current;
    const x = (event.clientX - box.left) / box.width * grid.columns;
    const y = (event.clientY - box.top) / box.height * grid.rows;
    paintMask(grid, x, y, brushRef.current, eraseRef.current ? 0 : 1);
    updateConductivity(grid, contrastRef.current);
  };

  const chooseImage = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const grid = gridRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = grid.columns; canvas.height = grid.rows;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(bitmap, 0, 0, grid.columns, grid.rows);
    const pixels = context.getImageData(0, 0, grid.columns, grid.rows).data;
    for (let index = 0; index < grid.mask.length; index++) {
      const offset = index * 4;
      const luminance = (pixels[offset] * .2126 + pixels[offset + 1] * .7152 + pixels[offset + 2] * .0722) / 255;
      grid.mask[index] = 1 - luminance;
    }
    bitmap.close();
    updateConductivity(grid, contrastRef.current);
  };

  const selectPreset = (preset: Preset) => {
    applyPreset(gridRef.current, preset);
    updateConductivity(gridRef.current, contrastRef.current);
  };

  return <main className={`current-page${controlsHidden ? " controls-hidden" : ""}`}>
    <header className="current-head"><Link href="/gallery">← Gallery</Link><span className="eyebrow">Interactive Exhibit 27 · Conductive Media</span><h1>Current</h1><p>Doodle a conductor. Watch voltage forget its curvature while current finds every available way through.</p></header>
    <button className="current-ui-toggle" onClick={() => setControlsHidden((value) => !value)}>{controlsHidden ? "UI" : "Hide laboratory"}</button>
    <section className="current-views">
      <figure><figcaption>Potential · draw here</figcaption><canvas ref={potentialCanvasRef} onPointerDown={(event) => { drawingRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); paintFromPointer(event); }} onPointerMove={paintFromPointer} onPointerUp={() => { drawingRef.current = false; }} onPointerCancel={() => { drawingRef.current = false; }} aria-label="Cyclic potential map and drawable conductivity field" /></figure>
      <figure><figcaption>Current magnitude + vector field</figcaption><canvas ref={currentCanvasRef} aria-label="Current magnitude heat map with scaled quiver arrows" /></figure>
    </section>
    <aside className="current-controls" aria-label="Current flow laboratory">
      <div className="current-transport"><button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button><button onClick={() => { pausedRef.current = true; setPaused(true); stepRef.current += 1; }}>Single cycle</button><button onClick={() => { resetPotential(gridRef.current, biasRef.current); cyclesRef.current = 0; setCycles(0); }}>Reset voltage</button><span>{cycles.toLocaleString()} solver cycles</span></div>
      <div className="current-diagnostics"><span>RMS residual <b>{formatScientific(diagnostics.rmsResidual)}</b></span><span>Largest nudge <b>{formatScientific(diagnostics.maxDelta)}</b></span><span>Flux mismatch <b>{(diagnostics.imbalance * 100).toFixed(2)}%</b></span></div>
      <details open><summary>Conductive doodle</summary>
        <div className="current-presets">{(["empty", "funnel", "maze", "lattice", "islands"] as Preset[]).map((preset) => <button key={preset} onClick={() => selectPreset(preset)}>{preset}</button>)}</div>
        <div className="current-grid current-grid-three"><label>Tool<select value={erase ? "erase" : "draw"} onChange={(event) => setErase(event.target.value === "erase")}><option value="draw">Draw conductor</option><option value="erase">Erase</option></select></label><Slider label="Brush radius" value={brush} min={1} max={18} step={1} onChange={setBrush} /><label className="current-file"><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void chooseImage(file); }} /><b>Load mask image</b><small>Dark pixels conduct</small></label></div>
      </details>
      <details open><summary>Solver</summary><div className="current-grid">
        <Slider label="Iterations / frame" value={iterations} min={1} max={40} step={1} onChange={setIterations} />
        <Slider label="Relaxation" value={relaxation} min={.1} max={1} step={.01} onChange={setRelaxation} />
        <Slider label="Conductivity contrast" value={contrast} min={0} max={6} step={.05} suffix={` decades · ${Math.pow(10, contrast).toPrecision(2)}×`} onChange={(value) => { contrastRef.current = value; setContrast(value); updateConductivity(gridRef.current, value); }} />
        <label>Resolution<select value={resolution} onChange={(event) => { const value = Number(event.target.value); setResolution(value); rebuild(value, biasRef.current); }}>{RESOLUTIONS.map((entry, index) => <option key={entry.label} value={index}>{entry.label}</option>)}</select></label>
        <label>Applied bias<select value={bias} onChange={(event) => { const value = event.target.value as CurrentBias; biasRef.current = value; setBias(value); rebuild(resolution, value); }}><option value="horizontal">Left → right</option><option value="vertical">Top → bottom</option><option value="diagonal">Corner → corner</option></select></label>
      </div></details>
      <details open><summary>Field displays</summary><div className="current-grid">
        <Slider label="Cyclic color bands" value={bands} min={1} max={28} step={1} onChange={setBands} />
        <Slider label="Color phase" value={phase} min={0} max={1} step={.01} onChange={setPhase} />
        <Slider label="Arrow spacing" value={arrowSpacing} min={4} max={20} step={1} onChange={setArrowSpacing} />
        <Slider label="Arrow gain" value={arrowGain} min={.15} max={3} step={.05} onChange={setArrowGain} />
        <label className="current-check"><input type="checkbox" checked={residualOverlay} onChange={(event) => setResidualOverlay(event.target.checked)} />Show electrode flare</label>
      </div></details>
      <p className="current-footnote">The update is conservative: each cell balances flux through four face conductances, using harmonic means at material boundaries. Slow it down, raise the contrast, draw awkward islands, and watch convergence become part of the exhibit.</p>
    </aside>
  </main>;
}

function Slider({ label, value, min, max, step, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="current-slider"><span>{label}</span><output>{value.toFixed(step < .1 ? 2 : 0)}{suffix}</output><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
