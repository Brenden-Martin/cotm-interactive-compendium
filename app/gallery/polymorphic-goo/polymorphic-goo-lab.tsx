"use client";

import { useEffect, useRef, useState } from "react";
import {
  analyseGooAudio,
  EMPTY_GOO_BANDS,
  renderPolymorphicGoo,
  smoothGooBands,
  type GooAudioBands,
} from "../../shared/polymorphic-goo";

type SourceMode = "slider" | "random" | "audio";
type ParameterKey = "shape" | "rotation" | "wobble" | "shadowDepth" | "roundness";
type SourceMap = Record<ParameterKey, SourceMode>;
type ValueMap = Record<ParameterKey, number>;
type HueMode = "slider" | "drift" | "audio";

const INITIAL_SOURCES: SourceMap = { shape: "random", rotation: "slider", wobble: "random", shadowDepth: "slider", roundness: "slider" };
const INITIAL_VALUES: ValueMap = { shape: .45, rotation: .26, wobble: .55, shadowDepth: .62, roundness: .68 };

const LABELS: Record<ParameterKey, string> = {
  shape: "Polygon morph",
  rotation: "Rotation speed",
  wobble: "Harmonic wobble",
  shadowDepth: "Shadow thickness",
  roundness: "Rim roundness",
};

const AUDIO_LABELS: Record<ParameterKey, string> = {
  shape: "Mid RMS · 180–1000 Hz",
  rotation: "Low RMS · 30–180 Hz",
  wobble: "High RMS · 3.4–12 kHz",
  shadowDepth: "Transition A · 1–1.9 kHz",
  roundness: "Transition B · 1.9–3.4 kHz",
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function randomWalk(value: number, target: number, delta: number, speed: number) {
  return value + (target - value) * (1 - Math.exp(-delta * speed));
}

export function PolymorphicGooLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const sourceRef = useRef<SourceMap>(INITIAL_SOURCES);
  const valueRef = useRef<ValueMap>(INITIAL_VALUES);
  const hueModeRef = useRef<HueMode>("audio");
  const hueRef = useRef(25);
  const [sources, setSources] = useState<SourceMap>(INITIAL_SOURCES);
  const [values, setValues] = useState<ValueMap>(INITIAL_VALUES);
  const [hueMode, setHueMode] = useState<HueMode>("audio");
  const [hue, setHue] = useState(25);
  const [audioName, setAudioName] = useState("No audio file loaded");
  const [bands, setBands] = useState<GooAudioBands>(EMPTY_GOO_BANDS);

  useEffect(() => { sourceRef.current = sources; }, [sources]);
  useEffect(() => { valueRef.current = values; }, [values]);
  useEffect(() => { hueModeRef.current = hueMode; }, [hueMode]);
  useEffect(() => { hueRef.current = hue; }, [hue]);

  const connectAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContextRef.current) {
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = .35;
      context.createMediaElementSource(audio).connect(analyser);
      analyser.connect(context.destination);
      audioContextRef.current = context;
      analyserRef.current = analyser;
    }
    await audioContextRef.current.resume();
  };

  const chooseAudio = (file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    const audio = audioRef.current;
    if (audio) {
      audio.src = objectUrlRef.current;
      audio.load();
    }
    setAudioName(file.name);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const frequency = new Uint8Array(1024);
    const waveform = new Uint8Array(2048);
    let animation = 0;
    let last = performance.now();
    let lastMeter = 0;
    let smoothedBands = { ...EMPTY_GOO_BANDS };
    let rotation = 0;
    let wobblePhase = 0;
    let movingHue = 25;
    const randomValues = { ...INITIAL_VALUES };
    const randomTargets = { ...INITIAL_VALUES };
    let targetClock = 0;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.7);
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const resolve = (key: ParameterKey, audioValue: number) => {
      const mode = sourceRef.current[key];
      return mode === "audio" ? clamp01(audioValue) : mode === "random" ? randomValues[key] : valueRef.current[key];
    };

    const draw = (now: number) => {
      const delta = Math.min(.05, (now - last) / 1000);
      last = now;
      targetClock -= delta;
      if (targetClock <= 0) {
        targetClock = .65 + Math.random() * 2.7;
        (Object.keys(randomTargets) as ParameterKey[]).forEach((key) => { randomTargets[key] = Math.random(); });
      }
      (Object.keys(randomValues) as ParameterKey[]).forEach((key, index) => {
        randomValues[key] = randomWalk(randomValues[key], randomTargets[key], delta, .35 + index * .08);
      });

      const analyser = analyserRef.current;
      if (analyser) smoothedBands = smoothGooBands(smoothedBands, analyseGooAudio(analyser, frequency, waveform), .2);
      else smoothedBands = smoothGooBands(smoothedBands, EMPTY_GOO_BANDS, .035);

      const shape = resolve("shape", smoothedBands.mid * 2.9);
      const wobble = resolve("wobble", smoothedBands.high * 3.5);
      const rotationSpeed = resolve("rotation", smoothedBands.low * 2.5);
      const shadowDepth = resolve("shadowDepth", smoothedBands.transitionLow * 3.2);
      const roundness = resolve("roundness", smoothedBands.transitionHigh * 3.4);
      rotation += delta * (.08 + rotationSpeed * 1.55);
      wobblePhase += delta * (.7 + wobble * 4.5);
      if (hueModeRef.current === "slider") movingHue = hueRef.current;
      else movingHue = (movingHue + delta * (hueModeRef.current === "audio" ? 7 + smoothedBands.overall * 260 : 24)) % 360;

      const box = canvas.getBoundingClientRect();
      renderPolymorphicGoo(context, box.width, box.height, {
        shape: shape * 4,
        wobble: wobble * 1.45,
        rotation,
        wobblePhase,
        shadowDepth: shadowDepth * 1.25,
        roundness,
        hue: movingHue,
      });
      if (now - lastMeter > 90) {
        lastMeter = now;
        setBands({ ...smoothedBands });
      }
      animation = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    animation = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      void audioContextRef.current?.close();
    };
  }, []);

  return (
    <section className="polymorph-lab">
      <div className="polymorph-stage"><canvas ref={canvasRef} aria-label="A Fourier polygon smoothly morphing, wobbling, rotating, changing hue, and wearing a layered cartoon shadow" /></div>
      <aside className="polymorph-controls">
        <div className="polymorph-audio">
          <span className="eyebrow">Five-band modulation source</span>
          <label><input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) chooseAudio(file); }} /><b>Choose audio file</b></label>
          <small>{audioName}</small>
          <audio ref={audioRef} controls onPlay={() => void connectAudio()}>Your browser does not support audio playback.</audio>
        </div>
        <div className="polymorph-parameter-list">
          {(Object.keys(LABELS) as ParameterKey[]).map((key) => (
            <div className="polymorph-parameter" key={key}>
              <div><strong>{LABELS[key]}</strong><small>{sources[key] === "audio" ? AUDIO_LABELS[key] : sources[key] === "random" ? "Smooth correlated random variable" : "Direct control"}</small></div>
              <select aria-label={`${LABELS[key]} source`} value={sources[key]} onChange={(event) => setSources((current) => ({ ...current, [key]: event.target.value as SourceMode }))}>
                <option value="slider">Slider</option><option value="random">Random</option><option value="audio">Audio band</option>
              </select>
              <input aria-label={`${LABELS[key]} manual value`} type="range" min="0" max="1" step=".01" value={values[key]} disabled={sources[key] !== "slider"} onChange={(event) => setValues((current) => ({ ...current, [key]: Number(event.target.value) }))} />
            </div>
          ))}
        </div>
        <div className="polymorph-hue">
          <label>Hue traversal<select value={hueMode} onChange={(event) => setHueMode(event.target.value as HueMode)}><option value="slider">Fixed hue</option><option value="drift">Slow drift</option><option value="audio">Overall RMS speed</option></select></label>
          <input aria-label="Fixed hue" type="range" min="0" max="360" step="1" value={hue} disabled={hueMode !== "slider"} onChange={(event) => setHue(Number(event.target.value))} />
        </div>
        <div className="polymorph-meters" aria-label="Current audio band RMS levels">
          {(["low", "mid", "transitionLow", "transitionHigh", "high", "overall"] as const).map((key) => <span key={key}><i style={{ transform: `scaleX(${clamp01(bands[key] * 2.8)})` }} /><b>{key.replace("transition", "T")}</b></span>)}
        </div>
        <p>The original triangle → square → pentagon → hexagon Fourier loop is intact. Audio mode maps instantaneous band RMS to rotation, shape, wobble, and the two toon-rim controls; overall RMS controls hue-traversal speed.</p>
      </aside>
    </section>
  );
}
