"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  analyseGooAudio,
  EMPTY_GOO_BANDS,
  GOO_BAND_LABELS,
  smoothGooBands,
  type GooAudioBands,
  type GooBandKey,
} from "../../shared/polymorphic-goo";
import {
  DEFAULT_PHOSPHOR_PARAMETERS,
  PHOSPHOR_PARAMETER_CONTROLS,
  PhosphorScanEngine,
  type PhosphorDeflectionMode,
  type PhosphorParameterKey,
  type PhosphorParameters,
  type PhosphorSourceMode,
} from "../../shared/phosphor-scan";

type CouplingMatrix = Record<string, number>;

const BAND_KEYS = Object.keys(GOO_BAND_LABELS) as GooBandKey[];
const PARAMETER_BY_KEY = Object.fromEntries(PHOSPHOR_PARAMETER_CONTROLS.map((control) => [control.key, control])) as Record<PhosphorParameterKey, typeof PHOSPHOR_PARAMETER_CONTROLS[number]>;
const matrixKey = (band: GooBandKey, parameter: PhosphorParameterKey) => `${band}:${parameter}`;
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

function initialMatrix() {
  const matrix: CouplingMatrix = {};
  for (const parameter of PHOSPHOR_PARAMETER_CONTROLS) for (const band of BAND_KEYS) matrix[matrixKey(band, parameter.key)] = 0;
  matrix[matrixKey("low", "noiseScale")] = -.72;
  matrix[matrixKey("low", "blueGlow")] = .28;
  matrix[matrixKey("mid", "noiseSpeed")] = .82;
  matrix[matrixKey("mid", "drawRate")] = .34;
  matrix[matrixKey("transitionLow", "lineWidth")] = .36;
  matrix[matrixKey("transitionHigh", "persistence")] = -.42;
  matrix[matrixKey("high", "noiseHarmonics")] = 1.05;
  matrix[matrixKey("high", "noiseRoughness")] = .9;
  matrix[matrixKey("overall", "deflection")] = .78;
  return matrix;
}

function drawCover(context: CanvasRenderingContext2D, source: HTMLImageElement | HTMLVideoElement, width: number, height: number) {
  const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!sourceWidth || !sourceHeight) return false;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.clearRect(0, 0, width, height);
  context.drawImage(source, (width - drawWidth) * .5, (height - drawHeight) * .5, drawWidth, drawHeight);
  return true;
}

function displayValue(key: PhosphorParameterKey, value: number) {
  if (key === "drawRate") return `${Math.round(value).toLocaleString()}`;
  if (key === "scanlines" || key === "pixelsPerRow" || key === "noiseHarmonics") return `${Math.round(value)}`;
  return value.toFixed(2);
}

function BaseSlider({ parameterKey, value, onChange }: { parameterKey: PhosphorParameterKey; value: number; onChange: (value: number) => void }) {
  const control = PARAMETER_BY_KEY[parameterKey];
  const exponential = parameterKey === "drawRate";
  const sliderValue = exponential ? Math.log(value / control.min) / Math.log(control.max / control.min) * 1000 : value;
  return <label className="phosphor-slider"><span>{control.label}</span><output>{displayValue(parameterKey, value)}</output><input type="range" min={exponential ? 0 : control.min} max={exponential ? 1000 : control.max} step={exponential ? 1 : control.step} value={sliderValue} onChange={(event) => {
    const raw = Number(event.target.value);
    const next = exponential ? control.min * Math.pow(control.max / control.min, raw / 1000) : raw;
    onChange(parameterKey === "scanlines" || parameterKey === "pixelsPerRow" || parameterKey === "noiseHarmonics" ? Math.round(next) : next);
  }} /></label>;
}

export function PhosphorScanLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const engineRef = useRef(new PhosphorScanEngine());
  const parametersRef = useRef<PhosphorParameters>({ ...DEFAULT_PHOSPHOR_PARAMETERS });
  const matrixRef = useRef<CouplingMatrix>(initialMatrix());
  const sourceModeRef = useRef<PhosphorSourceMode>("white");
  const deflectionModeRef = useRef<PhosphorDeflectionMode>("perlin");
  const pausedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceObjectUrlRef = useRef<string | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const [parameters, setParameters] = useState<PhosphorParameters>({ ...DEFAULT_PHOSPHOR_PARAMETERS });
  const [matrix, setMatrix] = useState<CouplingMatrix>(initialMatrix());
  const [sourceMode, setSourceMode] = useState<PhosphorSourceMode>("white");
  const [deflectionMode, setDeflectionMode] = useState<PhosphorDeflectionMode>("perlin");
  const [sourceName, setSourceName] = useState("Solid white phosphor");
  const [audioName, setAudioName] = useState("No modulation audio loaded");
  const [paused, setPaused] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [levels, setLevels] = useState<GooAudioBands>({ ...EMPTY_GOO_BANDS });
  const [stats, setStats] = useState({ fps: 60, dots: DEFAULT_PHOSPHOR_PARAMETERS.drawRate });

  useEffect(() => { parametersRef.current = parameters; }, [parameters]);
  useEffect(() => { matrixRef.current = matrix; }, [matrix]);
  useEffect(() => { sourceModeRef.current = sourceMode; }, [sourceMode]);
  useEffect(() => { deflectionModeRef.current = deflectionMode; }, [deflectionMode]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const updateParameter = (key: PhosphorParameterKey, value: number) => setParameters((current) => ({ ...current, [key]: value }));

  const randomizeSliders = () => {
    const nextParameters = Object.fromEntries(PHOSPHOR_PARAMETER_CONTROLS.map((control) => {
      const unit = Math.random();
      let value = control.key === "drawRate"
        ? control.min * Math.pow(control.max / control.min, unit)
        : control.min + (control.max - control.min) * unit;
      if (control.key === "scanlines" || control.key === "pixelsPerRow" || control.key === "noiseHarmonics") value = Math.round(value);
      return [control.key, value];
    })) as PhosphorParameters;
    const nextMatrix = Object.fromEntries(Object.keys(matrixRef.current).map((key) => [key, Math.random() * 6 - 3])) as CouplingMatrix;
    parametersRef.current = nextParameters;
    matrixRef.current = nextMatrix;
    setParameters(nextParameters);
    setMatrix(nextMatrix);
  };

  const chooseSource = (file: File) => {
    if (sourceObjectUrlRef.current) URL.revokeObjectURL(sourceObjectUrlRef.current);
    sourceObjectUrlRef.current = URL.createObjectURL(file);
    if (sourceMode === "image" && imageRef.current) imageRef.current.src = sourceObjectUrlRef.current;
    if (sourceMode === "video" && videoRef.current) {
      videoRef.current.src = sourceObjectUrlRef.current;
      videoRef.current.load();
    }
    setSourceName(file.name);
  };

  const chooseAudio = (file: File) => {
    if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    audioObjectUrlRef.current = URL.createObjectURL(file);
    if (audioRef.current) {
      audioRef.current.src = audioObjectUrlRef.current;
      audioRef.current.load();
    }
    setAudioName(file.name);
  };

  const connectAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContextRef.current) {
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = .18;
      context.createMediaElementSource(audio).connect(analyser);
      analyser.connect(context.destination);
      audioContextRef.current = context;
      analyserRef.current = analyser;
    }
    await audioContextRef.current.resume();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const sourceCanvas = document.createElement("canvas");
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) return;
    const frequency = new Uint8Array(1024);
    const byteWaveform = new Uint8Array(2048);
    const floatWaveform = new Float32Array(2048);
    let smoothed = { ...EMPTY_GOO_BANDS };
    const means = { ...EMPTY_GOO_BANDS };
    const centered = { ...EMPTY_GOO_BANDS };
    let analysisPrimed = false;
    let animation = 0;
    let last = performance.now();
    let statsClock = last;
    let frames = 0;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      engineRef.current.clear(context, canvas.width, canvas.height);
    };

    const effectiveParameters = () => {
      const result = { ...parametersRef.current };
      for (const control of PHOSPHOR_PARAMETER_CONTROLS) {
        let value = result[control.key];
        const span = control.max - control.min;
        for (const band of BAND_KEYS) value += centered[band] * matrixRef.current[matrixKey(band, control.key)] * span * .58;
        value = clamp(value, control.min, control.max);
        result[control.key] = control.key === "scanlines" || control.key === "pixelsPerRow" || control.key === "noiseHarmonics" ? Math.round(value) : value;
      }
      return result;
    };

    const frame = (now: number) => {
      const delta = Math.min(.05, (now - last) / 1000);
      last = now;
      const analyser = analyserRef.current;
      if (analyser) {
        smoothed = smoothGooBands(smoothed, analyseGooAudio(analyser, frequency, byteWaveform), .24);
        analyser.getFloatTimeDomainData(floatWaveform);
      } else {
        smoothed = smoothGooBands(smoothed, EMPTY_GOO_BANDS, .04);
        floatWaveform.fill(0);
      }
      for (const key of BAND_KEYS) {
        const logarithmic = Math.log1p(Math.max(0, smoothed[key]));
        if (analyser && !analysisPrimed) means[key] = logarithmic;
        else means[key] += (logarithmic - means[key]) * (1 - Math.exp(-delta / 5.5));
        centered[key] = logarithmic - means[key];
      }
      if (analyser) analysisPrimed = true;

      const effective = effectiveParameters();
      let pixels: Uint8ClampedArray | undefined;
      const sourceMode = sourceModeRef.current;
      if (sourceMode !== "white") {
        const columns = Math.max(1, Math.round(effective.pixelsPerRow));
        const rows = Math.max(1, Math.round(effective.scanlines));
        if (sourceCanvas.width !== columns || sourceCanvas.height !== rows) {
          sourceCanvas.width = columns;
          sourceCanvas.height = rows;
        }
        const media = sourceMode === "image" ? imageRef.current : videoRef.current;
        if (media && drawCover(sourceContext, media, columns, rows)) pixels = sourceContext.getImageData(0, 0, columns, rows).data;
      }
      if (!pausedRef.current) engineRef.current.render(context, canvas.width, canvas.height, delta, effective, {
        mode: sourceMode,
        pixels,
        columns: Math.round(effective.pixelsPerRow),
        rows: Math.round(effective.scanlines),
        waveform: floatWaveform,
      }, deflectionModeRef.current);

      frames++;
      if (now - statsClock > 500) {
        setStats({ fps: Math.round(frames * 1000 / (now - statsClock)), dots: effective.drawRate });
        setLevels({ ...smoothed });
        frames = 0;
        statsClock = now;
      }
      animation = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    animation = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
      if (sourceObjectUrlRef.current) URL.revokeObjectURL(sourceObjectUrlRef.current);
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
      void audioContextRef.current?.close();
    };
  }, []);

  return <main className={`phosphor-page${controlsHidden ? " controls-hidden" : ""}`}>
    <canvas ref={canvasRef} className="phosphor-canvas" aria-label="A serial phosphor raster drawing and exponentially fading one dot at a time" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={imageRef} className="phosphor-hidden-media" alt="Uploaded raster source" />
    <header className="phosphor-head"><Link href="/gallery">← Gallery</Link><span className="eyebrow">Interactive Exhibit 26 · Raster Persistence</span><h1>Phosphor<br />Scan</h1><p>One excited dot, an unreasonable amount of haste, and the long luminous memory of where it has been.</p></header>
    <button className="phosphor-ui-toggle" onClick={() => setControlsHidden((value) => !value)}>{controlsHidden ? "UI" : "Hide laboratory"}</button>
    <aside className="phosphor-controls" aria-label="Phosphor scan laboratory">
      <div className="phosphor-transport"><button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button><button onClick={() => engineRef.current.clear(canvasRef.current!.getContext("2d")!, canvasRef.current!.width, canvasRef.current!.height)}>Clear field</button><button onClick={() => engineRef.current.reseed()}>New noise</button><button onClick={randomizeSliders}>Randomize sliders</button><span>{Math.round(stats.dots).toLocaleString()} dots/s · {stats.fps} fps</span></div>
      <details open><summary>Raster source</summary>
        <div className="phosphor-source-grid">
          <label>Trace source<select value={sourceMode} onChange={(event) => { const mode = event.target.value as PhosphorSourceMode; setSourceMode(mode); setSourceName(mode === "white" ? "Solid white phosphor" : `Choose a ${mode}`); }}><option value="white">Solid white · real time</option><option value="image">Uploaded image</option><option value="video">Uploaded video · real time</option></select></label>
          <label>Vertical deflection<select value={deflectionMode} onChange={(event) => setDeflectionMode(event.target.value as PhosphorDeflectionMode)}><option value="waveform">Audio waveform</option><option value="perlin">Evolving Perlin vector</option></select></label>
        </div>
        {sourceMode !== "white" && <label className="phosphor-file"><input type="file" accept={sourceMode === "image" ? "image/*" : "video/*"} onChange={(event) => { const file = event.target.files?.[0]; if (file) chooseSource(file); }} /><b>Choose {sourceMode}</b><small>{sourceName}</small></label>}
        {sourceMode === "video" && <video ref={videoRef} className="phosphor-video" controls muted loop playsInline />}
      </details>
      <details open><summary>Base raster parameters</summary><div className="phosphor-base-grid">{PHOSPHOR_PARAMETER_CONTROLS.map(({ key }) => <BaseSlider key={key} parameterKey={key} value={parameters[key]} onChange={(value) => updateParameter(key, value)} />)}</div></details>
      <details><summary>Music and complete coupling matrix</summary>
        <div className="phosphor-audio"><label><input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) chooseAudio(file); }} /><b>Choose modulation audio</b></label><small>{audioName}</small><audio ref={audioRef} controls onPlay={() => void connectAudio()} /></div>
        <div className="phosphor-meters">{BAND_KEYS.map((key) => <span key={key}><i style={{ transform: `scaleX(${clamp(levels[key] * 2.4, 0, 1)})` }} /><b>{key.replace("transition", "T")}</b></span>)}</div>
        <p className="phosphor-note">All 66 band-to-parameter routes are available. Couplings are bipolar and act on lightly smoothed log-RMS after subtracting each band&apos;s slow mean.</p>
        <div className="phosphor-matrix">{PHOSPHOR_PARAMETER_CONTROLS.map((control) => <section key={control.key}><strong>{control.label}</strong><div>{BAND_KEYS.map((band) => {
          const key = matrixKey(band, control.key);
          return <label key={key}><span>{band.replace("transition", "T")}</span><output>{matrix[key].toFixed(2)}</output><input aria-label={`${GOO_BAND_LABELS[band]} to ${control.label}`} type="range" min="-3" max="3" step=".05" value={matrix[key]} onChange={(event) => setMatrix((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>;
        })}</div></section>)}</div>
      </details>
      <p className="phosphor-footnote">Slow rates expose the traversal dot by dot. Fast rates batch consecutive dots into a moving streak while the same exponentially decaying field preserves every displaced scanline.</p>
    </aside>
  </main>;
}
