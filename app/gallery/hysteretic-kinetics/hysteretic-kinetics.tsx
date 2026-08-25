"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Model = "reservoir" | "srh-taam" | "general" | "amphoteric";
type View = "loop" | "sweep";
type Waveform = "triangle" | "sine";
type Values = Record<string, number>;
type SliderSpec = { key: string; label: string; min: number; max: number; step: number; log?: boolean; unit?: string };
type Point = { x: number; y: number };
type SimState = { y: number[]; sweepIndex: number };

const Q = 1.602176634e-19;
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const pow10 = (x: number) => 10 ** x;
const triangle = (phase: number) => 2 * Math.abs(2 * (phase / TAU - Math.floor(phase / TAU + .5))) - 1;
const wave = (phase: number, waveform: Waveform) => waveform === "sine" ? Math.sin(phase) : triangle(phase);
const safeExp = (x: number) => Math.exp(clamp(x, -60, 60));

const INITIAL: Values = {
  batchCycles: 4, samplesPerCycle: 160, portraitRate: 7, sweepDisplayRate: 12, persistence: .12, responseGain: 1, frequency: 1.82e4, driveAmplitude: 5e-5, driveOffset: 0,
  reservoirA1: 4.5e3, reservoirB1: 7.2e3, reservoirA2: 8e2, reservoirB2: 1.5e3, thermalVoltage: .085, reservoirVoltage: .35, reservoirScale: 1,
  Nt: 1e17, cn: 1e-12, cp: 1e-9, T1: 2e-29, T2: 9e-31, T3: 1e-31, T4: 3e-32,
  en: 1e-2, ep: 1e-2, Gth: 1e10, thickness: 1e-6, etaN: 1e-3, etaP: 1e-3,
  n0: 1e15, p0: 1e15, f0: .5,
  generalG: 3.02e19, extraction: 7.244e23, radiativeB: 1e-10, augerN: 7.586e-25, augerP: 7.586e-25,
  intrinsic: 3.467e9, generalNt: 1e12, generalCn: 1.872e-5, generalCp: 1.872e-5,
  n1: 2.168e10, p1: 4.613e9, trapWeight: 2.54,
  ampCn1: 2e-10, ampCn2: 2e-11, ampCp1: 4e-10, ampCp2: 4e-11, ampEmission: 2e2, ampWeight: 1.5,
};

const INSTRUMENT: SliderSpec[] = [
  { key: "batchCycles", label: "Cycles per portrait", min: 2, max: 8, step: 1, unit: " cycles" },
  { key: "samplesPerCycle", label: "Samples per cycle", min: 60, max: 360, step: 20 },
  { key: "portraitRate", label: "Portrait update rate", min: 1, max: 12, step: 1, unit: " Hz" },
  { key: "sweepDisplayRate", label: "Display sweep rate", min: 1, max: 60, step: 1, unit: " sweeps/min" },
  { key: "persistence", label: "Phosphor persistence", min: 0, max: .96, step: .01 },
  { key: "responseGain", label: "Response gain", min: .1, max: 8, step: .05 },
  { key: "frequency", label: "Drive frequency", min: -5, max: 6, step: .01, log: true, unit: " Hz" },
  { key: "driveAmplitude", label: "AC drive amplitude", min: -12, max: 1, step: .01, log: true, unit: " A/cm²" },
  { key: "driveOffset", label: "DC drive offset", min: -6, max: 1, step: .01, log: true, unit: " A/cm²" },
];

const RESERVOIR: SliderSpec[] = [
  { key: "reservoirA1", label: "A₁ relaxation", min: -2, max: 7, step: .01, log: true, unit: " s⁻¹" },
  { key: "reservoirB1", label: "B₁ injection", min: -2, max: 8, step: .01, log: true },
  { key: "reservoirA2", label: "A₂ relaxation", min: -2, max: 7, step: .01, log: true, unit: " s⁻¹" },
  { key: "reservoirB2", label: "B₂ injection", min: -2, max: 8, step: .01, log: true },
  { key: "thermalVoltage", label: "Diode Vₜ", min: -3, max: .5, step: .01, log: true },
  { key: "reservoirVoltage", label: "Bias amplitude", min: .01, max: 2, step: .01, unit: " V" },
  { key: "reservoirScale", label: "Reservoir contrast", min: .05, max: 8, step: .05 },
];

const SRH_TAAM: SliderSpec[] = [
  { key: "Nt", label: "Trap density Nₜ", min: 8, max: 23, step: .01, log: true, unit: " cm⁻³" },
  { key: "cn", label: "Electron capture cₙ", min: -22, max: -3, step: .01, log: true, unit: " cm³/s" },
  { key: "cp", label: "Hole capture cₚ", min: -22, max: -3, step: .01, log: true, unit: " cm³/s" },
  { key: "T1", label: "TAAM T₁ · n²", min: -40, max: -20, step: .01, log: true, unit: " cm⁶/s" },
  { key: "T2", label: "TAAM T₂ · p²", min: -40, max: -20, step: .01, log: true, unit: " cm⁶/s" },
  { key: "T3", label: "TAAM T₃ · np (holes)", min: -40, max: -20, step: .01, log: true, unit: " cm⁶/s" },
  { key: "T4", label: "TAAM T₄ · np (electrons)", min: -40, max: -20, step: .01, log: true, unit: " cm⁶/s" },
  { key: "en", label: "Electron emission eₙ", min: -12, max: 14, step: .01, log: true, unit: " s⁻¹" },
  { key: "ep", label: "Hole emission eₚ", min: -12, max: 14, step: .01, log: true, unit: " s⁻¹" },
  { key: "Gth", label: "Thermal generation Gₜₕ", min: 0, max: 32, step: .01, log: true, unit: " cm⁻³s⁻¹" },
  { key: "thickness", label: "Active thickness", min: -9, max: -1, step: .01, log: true, unit: " cm" },
  { key: "etaN", label: "Electron injection ηₙ", min: -10, max: 0, step: .01, log: true },
  { key: "etaP", label: "Hole injection ηₚ", min: -10, max: 0, step: .01, log: true },
];

const GENERAL: SliderSpec[] = [
  { key: "generalG", label: "Generation G", min: 8, max: 32, step: .01, log: true, unit: " cm⁻³s⁻¹" },
  { key: "extraction", label: "Current extraction ξ", min: 12, max: 28, step: .01, log: true },
  { key: "radiativeB", label: "Radiative B", min: -18, max: -5, step: .01, log: true, unit: " cm³/s" },
  { key: "augerN", label: "Electron Auger Cₙ", min: -40, max: -18, step: .01, log: true, unit: " cm⁶/s" },
  { key: "augerP", label: "Hole Auger Cₚ", min: -40, max: -18, step: .01, log: true, unit: " cm⁶/s" },
  { key: "intrinsic", label: "Intrinsic density nᵢ", min: 0, max: 18, step: .01, log: true, unit: " cm⁻³" },
  { key: "generalNt", label: "SRH trap density", min: 4, max: 22, step: .01, log: true, unit: " cm⁻³" },
  { key: "generalCn", label: "SRH cₙ", min: -22, max: -3, step: .01, log: true, unit: " cm³/s" },
  { key: "generalCp", label: "SRH cₚ", min: -22, max: -3, step: .01, log: true, unit: " cm³/s" },
  { key: "n1", label: "SRH n₁", min: 0, max: 20, step: .01, log: true, unit: " cm⁻³" },
  { key: "p1", label: "SRH p₁", min: 0, max: 20, step: .01, log: true, unit: " cm⁻³" },
  { key: "trapWeight", label: "Trap observable weight", min: 0, max: 8, step: .05 },
];

const AMPHOTERIC: SliderSpec[] = [
  { key: "ampCn1", label: "Positive → neutral cₙ⁺", min: -22, max: -3, step: .01, log: true },
  { key: "ampCn2", label: "Neutral → negative cₙ⁰", min: -22, max: -3, step: .01, log: true },
  { key: "ampCp1", label: "Negative → neutral cₚ⁻", min: -22, max: -3, step: .01, log: true },
  { key: "ampCp2", label: "Neutral → positive cₚ⁰", min: -22, max: -3, step: .01, log: true },
  { key: "ampEmission", label: "Symmetric thermal emission", min: -4, max: 8, step: .01, log: true, unit: " s⁻¹" },
  { key: "ampWeight", label: "Charge-state contrast", min: .05, max: 8, step: .05 },
];

const MODEL_COPY: Record<Model, { title: string; equation: string; note: string }> = {
  reservoir: { title: "Experimental diode + two reservoirs", equation: "I = exp(V/Vₜ) − 1 · ṅᵢ = −Aᵢnᵢ + BᵢI", note: "The original heuristic paper model, kept separate from microscopic carrier claims." },
  "srh-taam": { title: "Binary trap · SRH + four TAAM channels", equation: "ė = cₙn + T₁n² + T₄np · ḣ = cₚp + T₂p² + T₃np", note: "Faithful channel structure, physical units, and positive linearly-implicit population updates for browser stability." },
  general: { title: "General recombination mixer", equation: "R = B(np−nᵢ²) + (Cₙn+Cₚp)(np−nᵢ²) + RSRH", note: "Radiative, ordinary Auger, extraction and SRH memory remain independently adjustable." },
  amphoteric: { title: "Three-charge-state amphoteric sandbox", equation: "D⁺ ⇄ D⁰ ⇄ D⁻", note: "Charge-conserving exploratory state network; intentionally not presented as a validated Mesopyramid fit." },
};

function formatValue(value: number, spec: SliderSpec) {
  const core = spec.log || Math.abs(value) >= 1e4 || (Math.abs(value) > 0 && Math.abs(value) < .001)
    ? value.toExponential(2) : value.toFixed(spec.step < .1 ? 2 : 1);
  return `${core}${spec.unit ?? ""}`;
}

function Slider({ spec, value, onChange }: { spec: SliderSpec; value: number; onChange: (v: number) => void }) {
  const shown = spec.log ? Math.log10(Math.max(value, 1e-300)) : value;
  return <label className="kin-slider"><span>{spec.label}<output>{formatValue(value, spec)}</output></span><input aria-label={spec.label} type="range" min={spec.min} max={spec.max} step={spec.step} value={shown} onChange={e => onChange(spec.log ? pow10(+e.target.value) : +e.target.value)} /></label>;
}

function initialState(model: Model, p: Values): number[] {
  if (model === "reservoir") return [0, 0];
  if (model === "amphoteric") return [p.n0, p.p0, p.f0, .2, .6, .2];
  return [p.n0, p.p0, p.f0];
}

function driveAt(phase: number, p: Values, waveform: Waveform) {
  return p.driveOffset + p.driveAmplitude * wave(phase, waveform);
}

function positiveLinearStep(value: number, production: number, lossRate: number, dt: number) {
  return Math.max(0, (value + dt * Math.max(0, production)) / (1 + dt * Math.max(0, lossRate)));
}

function stepReservoir(y: number[], current: number, dt: number, p: Values) {
  const voltage = current / Math.max(p.driveAmplitude, 1e-30) * p.reservoirVoltage;
  const diode = safeExp(voltage / Math.max(p.thermalVoltage, 1e-12)) - 1;
  y[0] = (y[0] + dt * p.reservoirB1 * diode) / (1 + dt * p.reservoirA1);
  y[1] = (y[1] + dt * p.reservoirB2 * diode) / (1 + dt * p.reservoirA2);
}

function stepSrhTaam(y: number[], current: number, dt: number, p: Values) {
  let [n, holes, f] = y;
  const j = Math.abs(current);
  const GJn = p.etaN * j / (Q * p.thickness);
  const GJp = p.etaP * j / (Q * p.thickness);
  const cnEff = p.cn + p.T1 * n + p.T4 * holes;
  const cpEff = p.cp + p.T2 * holes + p.T3 * n;
  n = positiveLinearStep(n, p.Gth + GJn + p.Nt * f * p.en, p.Nt * (1 - f) * cnEff, dt);
  holes = positiveLinearStep(holes, p.Gth + GJp + p.Nt * (1 - f) * p.ep, p.Nt * f * cpEff, dt);
  const electronCapture = p.cn * n + p.T1 * n * n + p.T4 * n * holes;
  const holeCapture = p.cp * holes + p.T2 * holes * holes + p.T3 * n * holes;
  const into = electronCapture + p.ep;
  const out = holeCapture + p.en;
  const total = into + out;
  if (total > 0) { const feq = into / total; f = feq + (f - feq) * safeExp(-dt * total); }
  y[0] = n; y[1] = holes; y[2] = clamp(f, 0, 1);
}

function stepGeneral(y: number[], current: number, dt: number, p: Values) {
  let [n, holes, f] = y;
  const excess = n * holes - p.intrinsic * p.intrinsic;
  const radiative = p.radiativeB * excess;
  const auger = (p.augerN * n + p.augerP * holes) * excess;
  const electronRate = p.generalCn * (n + p.n1);
  const holeRate = p.generalCp * (holes + p.p1);
  const srhDenominator = (n + p.n1) / Math.max(p.generalCp * p.generalNt, 1e-300) + (holes + p.p1) / Math.max(p.generalCn * p.generalNt, 1e-300);
  const srh = excess / Math.max(srhDenominator, 1e-300);
  const common = p.generalG - p.extraction * Math.abs(current) - radiative - auger - srh;
  const maxDelta = .35 * Math.max(n, holes, 1);
  n = Math.max(0, n + clamp(dt * common, -maxDelta, maxDelta));
  holes = Math.max(0, holes + clamp(dt * common, -maxDelta, maxDelta));
  const total = electronRate + holeRate;
  if (total > 0) { const feq = electronRate / total; f = feq + (f - feq) * safeExp(-dt * total); }
  y[0] = n; y[1] = holes; y[2] = clamp(f, 0, 1);
}

function stepAmphoteric(y: number[], current: number, dt: number, p: Values) {
  stepSrhTaam(y, current, dt, p);
  const n = y[0], holes = y[1]; let plus = y[3], neutral = y[4], minus = y[5];
  const pTo0 = p.ampCn1 * n + p.ampEmission, zeroToMinus = p.ampCn2 * n + p.ampEmission;
  const minusTo0 = p.ampCp1 * holes + p.ampEmission, zeroToPlus = p.ampCp2 * holes + p.ampEmission;
  const maxRate = Math.max(pTo0, zeroToMinus, minusTo0, zeroToPlus, 1);
  const substeps = clamp(Math.ceil(dt * maxRate / .3), 1, 18);
  const h = dt / substeps;
  for (let i = 0; i < substeps; i++) {
    const dPlus = -pTo0 * plus + zeroToPlus * neutral;
    const dMinus = zeroToMinus * neutral - minusTo0 * minus;
    plus = Math.max(0, plus + h * dPlus); minus = Math.max(0, minus + h * dMinus); neutral = Math.max(0, 1 - plus - minus);
    const sum = plus + neutral + minus; plus /= sum; neutral /= sum; minus /= sum;
  }
  y[3] = plus; y[4] = neutral; y[5] = minus;
}

function advance(model: Model, y: number[], current: number, dt: number, p: Values) {
  if (model === "reservoir") stepReservoir(y, current, dt, p);
  else if (model === "srh-taam") stepSrhTaam(y, current, dt, p);
  else if (model === "general") stepGeneral(y, current, dt, p);
  else stepAmphoteric(y, current, dt, p);
}

function response(model: Model, y: number[], p: Values) {
  if (model === "reservoir") return p.reservoirScale * (y[0] - y[1]);
  if (model === "srh-taam") return 2 * (y[2] - .5);
  if (model === "general") return 2 * (y[2] - .5) * p.trapWeight;
  return (y[3] - y[5]) * p.ampWeight;
}

function randomizeValues(current: Values, specs: SliderSpec[]) {
  const next = { ...current };
  for (const spec of specs) {
    const raw = spec.min + Math.random() * (spec.max - spec.min);
    next[spec.key] = spec.log ? pow10(raw) : raw;
  }
  return next;
}

export function HystereticKinetics() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const autoScaleRef = useRef(true);
  const paramsRef = useRef(INITIAL); const modelRef = useRef<Model>("reservoir"); const viewRef = useRef<View>("loop"); const waveformRef = useRef<Waveform>("triangle");
  const [params, setParams] = useState(INITIAL); const [model, setModel] = useState<Model>("reservoir"); const [view, setView] = useState<View>("loop"); const [waveform, setWaveform] = useState<Waveform>("triangle");
  const [paused, setPaused] = useState(false); const [autoScale, setAutoScale] = useState(true); const [reset, setReset] = useState(0); const [status, setStatus] = useState({ j: 0, y: 0, hz: INITIAL.frequency });
  const specs = useMemo(() => model === "reservoir" ? RESERVOIR : model === "srh-taam" ? SRH_TAAM : model === "general" ? GENERAL : AMPHOTERIC, [model]);
  useEffect(() => { paramsRef.current = params; }, [params]); useEffect(() => { modelRef.current = model; }, [model]); useEffect(() => { viewRef.current = view; }, [view]); useEffect(() => { waveformRef.current = waveform; }, [waveform]); useEffect(() => { pausedRef.current = paused; }, [paused]); useEffect(() => { autoScaleRef.current = autoScale; }, [autoScale]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return;
    let raf = 0; let lastBatch = -Infinity; const sweepRates = Array.from({ length: 29 }, (_, index) => 10 ** (-5 + 11 * index / 28)); let lastRenderedHz = sweepRates[0];
    const sim: SimState = { y: initialState(modelRef.current, paramsRef.current), sweepIndex: 0 };
    const resize = () => { const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2); canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.fillStyle = "#030b07"; ctx.fillRect(0, 0, r.width, r.height); };
    const grid = (w: number, h: number) => { ctx.save(); ctx.strokeStyle = "rgba(122,255,189,.13)"; ctx.lineWidth = 1; for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(i * w / 10, 0); ctx.lineTo(i * w / 10, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * h / 10); ctx.lineTo(w, i * h / 10); ctx.stroke(); } ctx.restore(); };
    resize(); addEventListener("resize", resize);
    const draw = (now: number) => {
      const p = paramsRef.current, m = modelRef.current, vw = viewRef.current, w = canvas.clientWidth, h = canvas.clientHeight;
      const updateInterval = vw === "sweep" ? 60000 / (p.sweepDisplayRate * sweepRates.length) : 1000 / p.portraitRate;
      if (!pausedRef.current && now - lastBatch >= updateInterval) {
        lastBatch = now; const hz = vw === "loop" ? p.frequency : sweepRates[sim.sweepIndex];
        lastRenderedHz = hz;
        const samplesPerCycle = Math.round(p.samplesPerCycle), cycleCount = Math.round(p.batchCycles), dt = 1 / (hz * samplesPerCycle);
        const cycles: Point[][] = [];
        let lastCurrent = 0;
        for (let cycle = 0; cycle < cycleCount; cycle++) {
          const points: Point[] = [];
          for (let sample = 0; sample <= samplesPerCycle; sample++) {
            const phase = TAU * sample / samplesPerCycle; const current = driveAt(phase, p, waveformRef.current); lastCurrent = current;
            if (sample > 0) advance(m, sim.y, current, dt, p);
            points.push({ x: clamp(current / Math.max(p.driveAmplitude + Math.abs(p.driveOffset), 1e-30), -1, 1), y: response(m, sim.y, p) * p.responseGain });
          }
          cycles.push(points);
        }
        const fadeAlpha = .2 + (1 - p.persistence) * .72; ctx.fillStyle = `rgba(3,11,7,${fadeAlpha})`; ctx.fillRect(0, 0, w, h); grid(w, h);
        const yValues = cycles.flatMap(points => points.map(point => point.y)); const yMin = Math.min(...yValues), yMax = Math.max(...yValues);
        const yCenter = (yMin + yMax) / 2, yHalfSpan = Math.max((yMax - yMin) * .575, 1e-12);
        cycles.forEach((points, cycle) => {
          const age = cycleCount === 1 ? 1 : cycle / (cycleCount - 1); ctx.save();
          ctx.strokeStyle = `rgba(${Math.round(66 + 56 * age)},${Math.round(150 + 105 * age)},${Math.round(112 + 77 * age)},${(.34 + .66 * age).toFixed(2)})`;
          ctx.shadowColor = "#7affbd"; ctx.shadowBlur = 2 + 8 * age; ctx.lineWidth = 1 + 1.35 * age; ctx.beginPath();
          points.forEach((point, index) => { const x = w * (.5 + .43 * point.x); const normalized = autoScaleRef.current ? clamp((point.y - yCenter) / yHalfSpan, -1, 1) : Math.tanh(point.y); const y = h * (.5 - .39 * normalized); index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
        });
        setStatus({ j: lastCurrent, y: response(m, sim.y, p), hz });
        if (vw === "sweep") { sim.sweepIndex = (sim.sweepIndex + 1) % sweepRates.length; sim.y = initialState(m, p); }
      }
      ctx.fillStyle = "#d9ffe9"; ctx.font = "800 10px ui-monospace"; ctx.fillText(viewRef.current === "loop" ? `MULTI-CYCLE PORTRAIT · ${Math.round(p.batchCycles)} CONSECUTIVE CYCLES` : `11-DECADE LOG SWEEP · ${lastRenderedHz.toExponential(2)} HZ`, 14, 20);
      ctx.textAlign = "right"; ctx.fillText("OLDEST DIM → NEWEST BRIGHT", w - 14, 20); ctx.textAlign = "left";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, [reset]);

  const set = (key: string, value: number) => setParams(old => ({ ...old, [key]: value }));
  const chooseModel = (next: Model) => { setModel(next); setReset(x => x + 1); };
  const chooseView = (next: View) => { setView(next); setReset(x => x + 1); };
  const scramble = () => { setParams(old => randomizeValues(old, [...INSTRUMENT.filter(x => !["batchCycles", "samplesPerCycle", "portraitRate", "sweepDisplayRate", "persistence"].includes(x.key)), ...specs])); setReset(x => x + 1); };

  return <main className="kin-page"><header className="kin-head"><Link href="/gallery">Gallery</Link><div><span className="eyebrow">Exhibit 30 / Nonequilibrium Kinetics</span><h1>Hysteretic Kinetics</h1></div><Link href="/research/mesopyramids">Research archive ↗</Link></header>
    <section className="kin-console"><div className="kin-scope"><div className="kin-bezel"><canvas ref={canvasRef} /><div className="kin-readout"><span>Current <b>{status.j.toExponential(2)}</b></span><span>Response <b>{status.y.toExponential(2)}</b></span><span>Rate <b>{status.hz.toExponential(2)} Hz</b></span></div></div><div className="kin-scope-label"><b>COTM TRANSIENT ANALYZER</b><span>{view === "sweep" ? `Full logarithmic traversal: ${(60 / params.sweepDisplayRate).toFixed(1)} seconds` : "Complete consecutive cycles reveal the approach to the settled loop"}</span></div></div>
      <aside className="kin-controls"><nav className="kin-models">{([['reservoir', 'Diode + reservoirs'], ['srh-taam', 'SRH + TAAM'], ['general', 'General mixer'], ['amphoteric', 'Amphoteric sandbox']] as [Model, string][]).map(([id, label]) => <button key={id} className={model === id ? "active" : ""} onClick={() => chooseModel(id)}>{label}</button>)}</nav>
        <div className="kin-view"><button className={view === "loop" ? "active" : ""} onClick={() => chooseView("loop")}>Multi-cycle portrait</button><button className={view === "sweep" ? "active" : ""} onClick={() => chooseView("sweep")}>10 μHz–1 MHz sweep</button></div>
        <div className="kin-actions"><button onClick={() => setPaused(x => !x)}>{paused ? "Resume" : "Pause"}</button><button onClick={scramble}>Randomize this model</button><button className={autoScale ? "active" : ""} aria-pressed={autoScale} onClick={() => setAutoScale(x => !x)}>Auto scale {autoScale ? "on" : "off"}</button></div>
        <div className="kin-model-card"><b>{MODEL_COPY[model].title}</b><span>{MODEL_COPY[model].equation}</span><p>{MODEL_COPY[model].note}</p></div>
        <details open><summary>Drive &amp; CRT instrument</summary><label className="kin-select">Waveform<select value={waveform} onChange={e => { setWaveform(e.target.value as Waveform); setReset(x => x + 1); }}><option value="triangle">Triangle</option><option value="sine">Sine</option></select></label>{INSTRUMENT.map(spec => <Slider key={spec.key} spec={spec} value={params[spec.key]} onChange={v => set(spec.key, v)} />)}</details>
        <details open><summary>{MODEL_COPY[model].title}</summary>{specs.map(spec => <Slider key={spec.key} spec={spec} value={params[spec.key]} onChange={v => set(spec.key, v)} />)}</details>
        {model !== "reservoir" && <details><summary>Initial populations</summary><Slider spec={{ key: "n0", label: "Initial electrons n(0)", min: 0, max: 22, step: .01, log: true, unit: " cm⁻³" }} value={params.n0} onChange={v => set("n0", v)} /><Slider spec={{ key: "p0", label: "Initial holes p(0)", min: 0, max: 22, step: .01, log: true, unit: " cm⁻³" }} value={params.p0} onChange={v => set("p0", v)} /><Slider spec={{ key: "f0", label: "Initial occupation f(0)", min: 0, max: 1, step: .01 }} value={params.f0} onChange={v => set("f0", v)} /><button onClick={() => setReset(x => x + 1)}>Apply initial state / reset</button></details>}
        <p className="kin-note">The SRH + TAAM tab preserves the supplied binary-trap equations and all four TAAM channels. The general tab independently exposes radiative, Auger, extraction and SRH terms. Browser integration uses positive linearly-implicit carrier updates and exact first-order occupation relaxation; the native stiff research solvers remain the quantitative reference.</p>
      </aside></section></main>;
}
