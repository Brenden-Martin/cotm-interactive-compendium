"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TAU,
  applyGaussianTurn,
  clamp,
  localPhaseVelocity,
  makePhaseField,
  paletteColor,
  phaseGradient,
  type PhasePalette,
  type PhasePreset,
} from "./phase-engine";

type Settings = {
  brushRadius: number;
  brushTurns: number;
  brushSoftness: number;
  brushStrength: number;
  frequency: number;
  spatialMultiplier: number;
  marchContrast: number;
  correlation: number;
  disorderDepth: number;
  striationAngle: number;
  photoDepth: number;
  arrowSpacing: number;
  arrowScale: number;
};
type SliderSpec = { key: keyof Settings; label: string; min: number; max: number; step: number; suffix?: string };
type PhotoMode = "phase-pigment" | "photo-cycle";

const DEFAULTS: Settings = {
  brushRadius: 34, brushTurns: .72, brushSoftness: 2.2, brushStrength: .72,
  frequency: .24, spatialMultiplier: 1, marchContrast: 1,
  correlation: 22, disorderDepth: 4.5, striationAngle: 0,
  photoDepth: 3.5, arrowSpacing: 16, arrowScale: 1,
};

const GROUPS: Array<{ title: string; controls: SliderSpec[] }> = [
  { title: "Phase brush", controls: [
    { key: "brushRadius", label: "Gaussian radius", min: 3, max: 120, step: 1, suffix: " px" },
    { key: "brushTurns", label: "Local hue rotation", min: -3, max: 3, step: .01, suffix: " turns" },
    { key: "brushSoftness", label: "Edge softness", min: .35, max: 8, step: .05 },
    { key: "brushStrength", label: "Deposition", min: .02, max: 2, step: .01 },
  ]},
  { title: "The common clock", controls: [
    { key: "frequency", label: "March rate", min: 0, max: 3, step: .01, suffix: " Hz" },
    { key: "spatialMultiplier", label: "Phase magnification", min: .1, max: 8, step: .01 },
    { key: "marchContrast", label: "Pigment contrast", min: .2, max: 3, step: .01 },
  ]},
  { title: "Boundary generators", controls: [
    { key: "correlation", label: "Random correlation", min: 2, max: 90, step: 1, suffix: " cells" },
    { key: "disorderDepth", label: "Field depth", min: .1, max: 16, step: .1, suffix: " turns" },
    { key: "striationAngle", label: "Stripe angle", min: 0, max: 360, step: 1, suffix: "°" },
    { key: "photoDepth", label: "Photo phase depth", min: .1, max: 12, step: .1, suffix: " turns" },
  ]},
  { title: "Gradient diagnostic", controls: [
    { key: "arrowSpacing", label: "Arrow spacing", min: 6, max: 36, step: 1, suffix: " cells" },
    { key: "arrowScale", label: "Arrow scale", min: .2, max: 3, step: .01 },
  ]},
];

const PRESETS: Array<{ id: PhasePreset; label: string }> = [
  { id: "blank", label: "Blank clock" },
  { id: "striated", label: "Linear strata" },
  { id: "concentric", label: "Concentric rings" },
  { id: "spiral", label: "Spiral well" },
  { id: "saddle", label: "Saddle crossing" },
  { id: "correlated", label: "Correlated disorder" },
];
const RESOLUTIONS = [96, 160, 240];
const PALETTES: PhasePalette[] = ["spectrum", "psychedelic", "tidepool", "sunset", "monochrome"];

const rgbToHsl = (red: number, green: number, blue: number) => {
  const r = red / 255, g = green / 255, b = blue / 255;
  const maximum = Math.max(r, g, b), minimum = Math.min(r, g, b);
  const lightness = (maximum + minimum) / 2;
  const delta = maximum - minimum;
  if (delta === 0) return [0, 0, lightness] as const;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = maximum === r ? ((g - b) / delta) % 6 : maximum === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return [hue, saturation, lightness] as const;
};
const hslToRgb = (hue: number, saturation: number, lightness: number): [number, number, number] => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = ((hue % 360) + 360) % 360 / 60;
  const intermediate = chroma * (1 - Math.abs(section % 2 - 1));
  const [r, g, b] = section < 1 ? [chroma, intermediate, 0] : section < 2 ? [intermediate, chroma, 0] : section < 3 ? [0, chroma, intermediate] : section < 4 ? [0, intermediate, chroma] : section < 5 ? [intermediate, 0, chroma] : [chroma, 0, intermediate];
  const match = lightness - chroma / 2;
  return [Math.round((r + match) * 255), Math.round((g + match) * 255), Math.round((b + match) * 255)];
};

function PhaseSlider({ spec, value, onChange }: { spec: SliderSpec; value: number; onChange: (value: number) => void }) {
  const digits = spec.step < .1 ? 2 : spec.step < 1 ? 1 : 0;
  return <label className="march-slider"><span>{spec.label}<output>{value.toFixed(digits)}{spec.suffix ?? ""}</output></span><input aria-label={spec.label} type="range" min={spec.min} max={spec.max} step={spec.step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function PhaseMarch() {
  const boundaryRef = useRef<HTMLCanvasElement>(null);
  const responseRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef(DEFAULTS);
  const paletteRef = useRef<PhasePalette>("psychedelic");
  const modeRef = useRef<PhotoMode>("phase-pigment");
  const fieldRef = useRef<Float32Array>(new Float32Array(160 * 90));
  const photoRef = useRef<Uint8ClampedArray | null>(null);
  const pausedRef = useRef(false);
  const arrowsRef = useRef(true);
  const directionRef = useRef(1);
  const pointerRef = useRef(false);
  const timeRef = useRef(0);
  const seedRef = useRef(1513);
  const [settings, setSettings] = useState(DEFAULTS);
  const [palette, setPalette] = useState<PhasePalette>("psychedelic");
  const [mode, setMode] = useState<PhotoMode>("phase-pigment");
  const [resolution, setResolution] = useState(160);
  const [preset, setPreset] = useState<PhasePreset>("spiral");
  const [paused, setPaused] = useState(false);
  const [arrows, setArrows] = useState(true);
  const [direction, setDirection] = useState(1);
  const [hidden, setHidden] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [status, setStatus] = useState({ low: 0, high: 0, gradient: 0 });
  const height = Math.round(resolution * 9 / 16);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { paletteRef.current = palette; }, [palette]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { arrowsRef.current = arrows; }, [arrows]);
  useEffect(() => { directionRef.current = direction; }, [direction]);

  const loadPreset = useCallback((nextPreset: PhasePreset) => {
    const s = settingsRef.current;
    fieldRef.current = makePhaseField(resolution, Math.round(resolution * 9 / 16), nextPreset, {
      seed: seedRef.current,
      correlation: s.correlation,
      depth: s.disorderDepth,
      angle: s.striationAngle / 180 * Math.PI,
    });
    photoRef.current = null;
    setPhotoName("");
    setMode("phase-pigment");
    setPreset(nextPreset);
  }, [resolution]);

  useEffect(() => { loadPreset(preset); }, [resolution]); // eslint-disable-line react-hooks/exhaustive-deps

  const paint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * resolution;
    const y = (event.clientY - bounds.top) / bounds.height * height;
    const pressure = event.pressure > 0 ? .45 + event.pressure * .85 : 1;
    const radius = settingsRef.current.brushRadius / Math.max(1, bounds.width) * resolution;
    applyGaussianTurn(fieldRef.current, resolution, height, x, y, radius, settingsRef.current.brushTurns, settingsRef.current.brushSoftness, settingsRef.current.brushStrength * pressure);
  };

  const importPhoto = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const offscreen = document.createElement("canvas");
    offscreen.width = resolution;
    offscreen.height = height;
    const context = offscreen.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(bitmap, 0, 0, resolution, height);
    bitmap.close();
    const pixels = context.getImageData(0, 0, resolution, height).data;
    photoRef.current = new Uint8ClampedArray(pixels);
    const field = new Float32Array(resolution * height);
    for (let index = 0; index < field.length; index++) {
      const offset = index * 4;
      const luma = (pixels[offset] * .2126 + pixels[offset + 1] * .7152 + pixels[offset + 2] * .0722) / 255;
      field[index] = (luma - .5) * TAU * settingsRef.current.photoDepth;
    }
    fieldRef.current = field;
    setPhotoName(file.name);
    setMode("photo-cycle");
    setPreset("blank");
  };

  const scrambleControls = () => {
    const next = { ...settings };
    for (const group of GROUPS) for (const control of group.controls) {
      const value = control.min + Math.random() * (control.max - control.min);
      (next[control.key] as number) = control.step >= 1 ? Math.round(value) : value;
    }
    setSettings(next);
    settingsRef.current = next;
    seedRef.current = Math.floor(Math.random() * 999999);
    loadPreset("correlated");
    setPalette(PALETTES[Math.floor(Math.random() * PALETTES.length)]);
  };

  useEffect(() => {
    const boundary = boundaryRef.current;
    const response = responseRef.current;
    if (!boundary || !response) return;
    const boundaryContext = boundary.getContext("2d");
    const responseContext = response.getContext("2d");
    if (!boundaryContext || !responseContext) return;
    const offscreen = document.createElement("canvas");
    offscreen.width = resolution;
    offscreen.height = height;
    const pixelContext = offscreen.getContext("2d");
    if (!pixelContext) return;
    let animation = 0;
    let last = performance.now();
    let statusClock = 0;

    const resize = () => {
      for (const canvas of [boundary, response]) {
        const bounds = canvas.getBoundingClientRect();
        const density = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(bounds.width * density));
        canvas.height = Math.max(1, Math.round(bounds.height * density));
        canvas.getContext("2d")?.setTransform(density, 0, 0, density, 0, 0);
      }
    };
    resize();
    addEventListener("resize", resize);

    const render = (target: CanvasRenderingContext2D, phaseShift: number, boundaryPlot: boolean) => {
      const field = fieldRef.current;
      if (field.length !== resolution * height) return;
      const image = pixelContext.createImageData(resolution, height);
      const photo = photoRef.current;
      const multiplier = boundaryPlot ? 1 : settingsRef.current.spatialMultiplier;
      for (let index = 0; index < field.length; index++) {
        const phase = field[index] * multiplier + phaseShift;
        let color: [number, number, number];
        if (modeRef.current === "photo-cycle" && photo?.length === field.length * 4) {
          const offset = index * 4;
          const [hue, saturation, lightness] = rgbToHsl(photo[offset], photo[offset + 1], photo[offset + 2]);
          color = hslToRgb(hue + phase / TAU * 360, Math.max(.52, saturation), clamp(lightness, .12, .88));
        } else color = paletteColor(paletteRef.current, phase);
        const contrast = boundaryPlot ? 1 : settingsRef.current.marchContrast;
        const offset = index * 4;
        image.data[offset] = clamp(128 + (color[0] - 128) * contrast, 0, 255);
        image.data[offset + 1] = clamp(128 + (color[1] - 128) * contrast, 0, 255);
        image.data[offset + 2] = clamp(128 + (color[2] - 128) * contrast, 0, 255);
        image.data[offset + 3] = 255;
      }
      pixelContext.putImageData(image, 0, 0);
      target.imageSmoothingEnabled = false;
      target.clearRect(0, 0, target.canvas.clientWidth, target.canvas.clientHeight);
      target.drawImage(offscreen, 0, 0, target.canvas.clientWidth, target.canvas.clientHeight);
    };

    const drawArrows = () => {
      if (!arrowsRef.current) return;
      const field = fieldRef.current;
      const spacing = Math.max(4, Math.round(settingsRef.current.arrowSpacing));
      const scaleX = response.clientWidth / resolution;
      const scaleY = response.clientHeight / height;
      const omega = TAU * settingsRef.current.frequency * directionRef.current;
      responseContext.strokeStyle = "rgba(255,255,255,.68)";
      responseContext.fillStyle = "rgba(255,255,255,.8)";
      responseContext.lineWidth = 1;
      for (let y = Math.floor(spacing / 2); y < height; y += spacing) for (let x = Math.floor(spacing / 2); x < resolution; x += spacing) {
        const gradient = phaseGradient(field, resolution, height, x, y);
        const velocity = localPhaseVelocity(gradient.x * settingsRef.current.spatialMultiplier, gradient.y * settingsRef.current.spatialMultiplier, omega);
        const magnitude = Math.hypot(velocity.x, velocity.y);
        if (magnitude < 1e-4) continue;
        const length = clamp(Math.sqrt(magnitude) * 7 * settingsRef.current.arrowScale, 3, spacing * scaleX * .7);
        const ux = velocity.x / magnitude, uy = velocity.y / magnitude;
        const startX = x * scaleX, startY = y * scaleY;
        const endX = startX + ux * length, endY = startY + uy * length;
        responseContext.beginPath(); responseContext.moveTo(startX, startY); responseContext.lineTo(endX, endY); responseContext.stroke();
        responseContext.beginPath(); responseContext.moveTo(endX, endY); responseContext.lineTo(endX - ux * 3 - uy * 2, endY - uy * 3 + ux * 2); responseContext.lineTo(endX - ux * 3 + uy * 2, endY - uy * 3 - ux * 2); responseContext.closePath(); responseContext.fill();
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) timeRef.current += dt * directionRef.current;
      render(boundaryContext, 0, true);
      render(responseContext, TAU * settingsRef.current.frequency * timeRef.current, false);
      drawArrows();
      statusClock += dt;
      if (statusClock > .25) {
        statusClock = 0;
        let low = Infinity, high = -Infinity, gradientTotal = 0, samples = 0;
        const field = fieldRef.current;
        for (let index = 0; index < field.length; index++) { low = Math.min(low, field[index]); high = Math.max(high, field[index]); }
        for (let y = 1; y < height - 1; y += 5) for (let x = 1; x < resolution - 1; x += 5) { const gradient = phaseGradient(field, resolution, height, x, y); gradientTotal += Math.hypot(gradient.x, gradient.y); samples++; }
        setStatus({ low: low / TAU, high: high / TAU, gradient: gradientTotal / Math.max(1, samples) });
      }
      animation = requestAnimationFrame(draw);
    };
    animation = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animation); removeEventListener("resize", resize); };
  }, [resolution, height]);

  return <main className={`march-page${hidden ? " controls-hidden" : ""}`}>
    <button className="march-ui-toggle" onClick={() => setHidden((value) => !value)}>{hidden ? "Restore apparatus" : "Hide apparatus"}</button>
    <header className="march-head"><Link href="/gallery">← Gallery</Link><div><span className="eyebrow">Interactive Exhibit 35 · Traveling Phase</span><h1>Phase<br/>March</h1><p>Every pixel obeys one simple clock. Draw delays into that clock and the gradients organize its identical local oscillators into apparent traveling waves.</p></div><div className="march-law"><span>LOCAL LAW</span><b>cos(φ(x,y) + ωt)</b></div></header>
    <section className="march-console">
      <div className="march-instrument">
        <figure className="march-view boundary"><figcaption><b>01</b><span>UNWRAPPED PHASE FIELD</span><small>Paint rotations into φ(x,y)</small></figcaption><canvas ref={boundaryRef} aria-label="Editable unwrapped phase field" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pointerRef.current = true; paint(event); }} onPointerMove={(event) => { if (pointerRef.current) paint(event); }} onPointerUp={() => { pointerRef.current = false; }} onPointerCancel={() => { pointerRef.current = false; }} /></figure>
        <div className="march-transfer"><i/><span>THE SAME CLOCK<br/>AT EVERY POINT</span><i/></div>
        <figure className="march-view response"><figcaption><b>02</b><span>MARCHING RESPONSE</span><small>Wavefronts follow ∇φ</small></figcaption><canvas ref={responseRef} aria-label="Animated phase response with optional local phase velocity arrows" /></figure>
        <div className="march-telemetry"><span>PHASE FLOOR <b>{status.low.toFixed(1)} turns</b></span><span>PHASE CEILING <b>{status.high.toFixed(1)} turns</b></span><span>MEAN |∇φ| <b>{status.gradient.toFixed(2)}</b></span><span>CLOCK <b>{settings.frequency.toFixed(2)} Hz</b></span></div>
      </div>
      <aside className="march-controls">
        <div className="march-actions"><button className="primary" onClick={() => setPaused((value) => !value)}>{paused ? "Resume march" : "Pause march"}</button><button onClick={() => { setDirection((value) => -value); }}>Reverse time</button><button onClick={() => loadPreset("blank")}>Clear phase</button><button onClick={scrambleControls}>Scramble field</button><button onClick={() => fileRef.current?.click()}>Import photo</button><input ref={fileRef} hidden type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importPhoto(file); event.currentTarget.value = ""; }} /></div>
        <div className="march-presets">{PRESETS.map((option) => <button key={option.id} className={preset === option.id && !photoName ? "active" : ""} onClick={() => loadPreset(option.id)}>{option.label}</button>)}</div>
        <div className="march-selects"><label>Color map<select value={palette} onChange={(event) => setPalette(event.target.value as PhasePalette)}>{PALETTES.map((name) => <option key={name}>{name}</option>)}</select></label><label>Rendering<select value={mode} disabled={!photoName} onChange={(event) => setMode(event.target.value as PhotoMode)}><option value="phase-pigment">Phase pigment</option><option value="photo-cycle">Photo color cycle</option></select></label><label>Field lattice<select value={resolution} onChange={(event) => setResolution(Number(event.target.value))}>{RESOLUTIONS.map((value) => <option key={value} value={value}>{value} × {Math.round(value * 9 / 16)}</option>)}</select></label></div>
        <label className="march-check"><input type="checkbox" checked={arrows} onChange={(event) => setArrows(event.target.checked)} /><span>Plot local phase velocity</span></label>
        {photoName && <p className="march-photo">PHOTO FIELD · {photoName}</p>}
        {GROUPS.map((group, index) => <details key={group.title} open={index < 2}><summary>{group.title}</summary><div className="march-grid">{group.controls.map((spec) => <PhaseSlider key={spec.key} spec={spec} value={settings[spec.key]} onChange={(value) => setSettings((current) => ({ ...current, [spec.key]: value }))} />)}</div></details>)}
        <p className="march-note">The stored phase never wraps; only the pigments do. A broad Gaussian brush can therefore pile many hidden turns into one region. Because equal-phase contours satisfy φ(x,y) + ωt = constant, their local velocity points opposite the phase gradient—even though no pixel communicates with its neighbor.</p>
      </aside>
    </section>
  </main>;
}
