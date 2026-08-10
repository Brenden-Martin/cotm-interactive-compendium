"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const W = 160;
const H = 72;
const SIZE = W * H;
const CONSONANTS = /[bcdfghjklmnpqrstvwxyz]/i;

type Rgb = { red: number; green: number; blue: number };
type VoiceSettings = { speed: number; pitch: number; variance: number; portamento: number; rgb: Rgb };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

const hexToRgb = (hex: string): Rgb => ({
  red: Number.parseInt(hex.slice(1, 3), 16) / 255,
  green: Number.parseInt(hex.slice(3, 5), 16) / 255,
  blue: Number.parseInt(hex.slice(5, 7), 16) / 255,
});

const chunkSpeech = (text: string) => text.match(/[bcdfghjklmnpqrstvwxyz]*[aeiouy]+|[bcdfghjklmnpqrstvwxyz]+|\d+|\s+|[^\w\s]/gi) ?? [];

const chunkHash = (chunk: string) => {
  let hash = 2166136261;
  for (const character of chunk) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967295;
};

const renderBoundaryText = (text: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const mask = new Uint8Array(SIZE);
  if (!context || !text) return mask;
  context.clearRect(0, 0, W, H);
  context.fillStyle = "#fff";
  context.font = "900 10px monospace";
  context.textBaseline = "top";
  const lines: string[] = [];
  let line = "";
  for (const character of text) {
    if (character === "\n") { lines.push(line); line = ""; continue; }
    if (context.measureText(line + character).width > W - 16) { lines.push(line); line = character; }
    else line += character;
  }
  lines.push(line);
  const visibleLines = lines.slice(-5);
  visibleLines.forEach((visibleLine, index) => context.fillText(visibleLine, 8, 8 + index * 13));
  const pixels = context.getImageData(0, 0, W, H).data;
  for (let index = 0; index < SIZE; index++) mask[index] = pixels[index * 4 + 3];
  return mask;
};

export function GibberishGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boundaryMaskRef = useRef(new Uint8Array(SIZE));
  const identityRef = useRef<Rgb>(hexToRgb("#86b7d9"));
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioMasterRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const lastPitchRef = useRef(220);
  const settingsRef = useRef<VoiceSettings>({ speed: 105, pitch: 220, variance: 7, portamento: .42, rgb: hexToRgb("#86b7d9") });
  const [text, setText] = useState("Luck, strength, intelligence.");
  const [revealed, setRevealed] = useState("");
  const [color, setColor] = useState("#86b7d9");
  const [speed, setSpeed] = useState(105);
  const [pitch, setPitch] = useState(220);
  const [variance, setVariance] = useState(7);
  const [portamento, setPortamento] = useState(.42);
  const [playing, setPlaying] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);
  const chunks = useMemo(() => chunkSpeech(text), [text]);
  const rgb = useMemo(() => hexToRgb(color), [color]);

  useEffect(() => {
    identityRef.current = rgb;
    settingsRef.current = { speed, pitch, variance, portamento, rgb };
  }, [pitch, portamento, rgb, speed, variance]);

  useEffect(() => { boundaryMaskRef.current = renderBoundaryText(revealed); }, [revealed]);

  const stopSources = useCallback(() => {
    for (const source of activeSourcesRef.current) { try { source.stop(); } catch {} }
    activeSourcesRef.current.clear();
  }, []);

  const synthesizeChunk = useCallback((chunk: string) => {
    if (!chunk.trim()) return;
    const context = audioContextRef.current;
    const master = audioMasterRef.current;
    if (!context || !master) return;
    const { speed: currentSpeed, pitch: centerPitch, variance: currentVariance, portamento: glide, rgb: identity } = settingsRef.current;
    const total = identity.red + identity.green + identity.blue;
    const strength = total > .001 ? identity.red / total : 1 / 3;
    const luck = total > .001 ? identity.green / total : 1 / 3;
    const intelligence = total > .001 ? identity.blue / total : 1 / 3;
    const hash = chunkHash(chunk);
    const stableOffset = hash * 2 - 1;
    const wanderingOffset = Math.random() * 2 - 1;
    const pitchOffset = mix(stableOffset, wanderingOffset, luck * .68);
    const targetPitch = centerPitch * Math.pow(2, pitchOffset * currentVariance / 12);
    const startPitch = mix(targetPitch, lastPitchRef.current, glide);
    lastPitchRef.current = targetPitch;
    const duration = Math.max(.075, Math.min(.44, currentSpeed / 1000 * (1.18 + chunk.length * .1)));
    const frameCount = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const output = buffer.getChannelData(0);
    const consonantPositions = [...chunk].map((character, index) => CONSONANTS.test(character) ? index / Math.max(1, chunk.length) : -1).filter((position) => position >= 0);
    const vowel = chunk.toLowerCase().match(/[aeiouy]/)?.[0] ?? "";
    const triangleMorph = ({ a: .15, e: .38, i: .62, o: .78, u: .92, y: .52 } as Record<string, number>)[vowel] ?? (.15 + hash * .75);
    const formantRatio = 1.42 + intelligence * .85 + luck * .22 + hash * .16;
    const phase = [0, 0];
    for (let sample = 0; sample < frameCount; sample++) {
      const time = sample / context.sampleRate;
      const progress = sample / Math.max(1, frameCount - 1);
      const glideRate = glide <= .001 ? 1 : 1 - Math.exp(-time / (.006 + glide * .14));
      const baseFrequency = mix(startPitch, targetPitch, glideRate) * (1 + Math.sin(time * Math.PI * (3 + luck * 9)) * luck * .018);
      const envelope = Math.min(1, progress / (.025 + intelligence * .045)) * Math.pow(1 - progress, .72 + strength * .55);
      let tone = 0;
      for (let voice = 0; voice < 2; voice++) {
        const frequency = voice === 0 ? baseFrequency : baseFrequency * formantRatio;
        phase[voice] = (phase[voice] + frequency / context.sampleRate) % 1;
        const saw = phase[voice] * 2 - 1;
        const triangle = 1 - 4 * Math.abs(phase[voice] - .5);
        const luckWave = mix(saw, triangle, triangleMorph);
        const width = .14 + .68 * (.5 + .5 * Math.sin(time * Math.PI * (5 + hash * 13) + hash * Math.PI * 2));
        const strengthWave = phase[voice] < width ? 1 : -1;
        const sine = Math.sin(phase[voice] * Math.PI * 2);
        const sineWave = Math.max(-1, Math.min(1, sine * (1.45 + intelligence * 5 + hash * 1.5)));
        const waveform = luckWave * luck + strengthWave * strength + sineWave * intelligence;
        tone += waveform * (voice === 0 ? .7 : .3);
      }
      let noise = 0;
      for (const position of consonantPositions) {
        const distance = progress - position;
        if (distance >= 0 && distance < .19) noise += (Math.random() * 2 - 1) * Math.exp(-distance * (28 - strength * 10));
      }
      const brightness = Math.max(identity.red, identity.green, identity.blue);
      output[sample] = Math.max(-1, Math.min(1, (tone * (.17 + brightness * .2) + noise * (.08 + strength * .16 + luck * .05)) * envelope));
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = .72;
    source.connect(gain).connect(master);
    activeSourcesRef.current.add(source);
    source.onended = () => { activeSourcesRef.current.delete(source); source.disconnect(); gain.disconnect(); };
    source.start();
  }, []);

  const ensureAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return false;
      const context = new AudioContextClass();
      const master = context.createGain();
      master.gain.value = .78;
      master.connect(context.destination);
      audioContextRef.current = context;
      audioMasterRef.current = master;
    }
    await audioContextRef.current.resume();
    return true;
  }, []);

  const start = async () => {
    if (playing) { setPlaying(false); stopSources(); return; }
    if (!text.trim() || !(await ensureAudio())) return;
    stopSources();
    const firstChunk = chunks[0] ?? "";
    setRevealed(firstChunk);
    setChunkIndex(0);
    synthesizeChunk(firstChunk);
    setPlaying(chunks.length > 0);
  };

  useEffect(() => {
    if (!playing) return;
    const chunk = chunks[chunkIndex];
    const punctuation = /[.!?;:]/.test(chunk);
    const whitespace = /^\s+$/.test(chunk);
    const delay = speed * (punctuation ? 2.15 : whitespace ? .38 : 1);
    const timer = window.setTimeout(() => {
      const nextIndex = chunkIndex + 1;
      if (nextIndex >= chunks.length) { setPlaying(false); return; }
      const nextChunk = chunks[nextIndex];
      setChunkIndex(nextIndex);
      setRevealed(chunks.slice(0, nextIndex + 1).join(""));
      synthesizeChunk(nextChunk);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [chunkIndex, chunks, playing, speed, synthesizeChunk]);

  useEffect(() => () => {
    stopSources();
    const context = audioContextRef.current;
    if (context) void context.close();
  }, [stopSources]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let current = [new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)];
    let next = [new Float32Array(SIZE), new Float32Array(SIZE), new Float32Array(SIZE)];
    for (let index = 0; index < SIZE; index++) {
      current[0][index] = .08 + Math.random() * .22;
      current[1][index] = .08 + Math.random() * .22;
      current[2][index] = .08 + Math.random() * .22;
    }
    const image = context.createImageData(W, H);
    let animationFrame = 0;
    let last = 0;
    const animate = (now: number) => {
      if (now - last > 28) {
        const identity = identityRef.current;
        const mask = boundaryMaskRef.current;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const index = y * W + x;
          const left = y * W + (x + W - 1) % W;
          const right = y * W + (x + 1) % W;
          const up = ((y + H - 1) % H) * W + x;
          const down = ((y + 1) % H) * W + x;
          const r = current[0][index], g = current[1][index], b = current[2][index];
          const lapR = (current[0][left] + current[0][right] + current[0][up] + current[0][down]) * .25 - r;
          const lapG = (current[1][left] + current[1][right] + current[1][up] + current[1][down]) * .25 - g;
          const lapB = (current[2][left] + current[2][right] + current[2][up] + current[2][down]) * .25 - b;
          let newR = clamp01(r * .994 + lapR * .31 + (g * g - b * r) * .036 + identity.red * .0025);
          let newG = clamp01(g * .994 + lapG * .27 + (b * b - r * g) * .036 + identity.green * .0025);
          let newB = clamp01(b * .994 + lapB * .23 + (r * r - g * b) * .036 + identity.blue * .0025);
          const boundary = mask[index] / 255;
          if (boundary > 0) {
            newR = mix(newR, .16 + identity.red * .84, boundary * .82);
            newG = mix(newG, .16 + identity.green * .84, boundary * .82);
            newB = mix(newB, .16 + identity.blue * .84, boundary * .82);
          }
          next[0][index] = newR; next[1][index] = newG; next[2][index] = newB;
        }
        [current, next] = [next, current];
        for (let index = 0; index < SIZE; index++) {
          const offset = index * 4;
          image.data[offset] = Math.round(current[0][index] * 255);
          image.data[offset + 1] = Math.round(current[1][index] * 255);
          image.data[offset + 2] = Math.round(current[2][index] * 255);
          image.data[offset + 3] = 255;
        }
        context.putImageData(image, 0, 0);
        last = now;
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const changeText = (value: string) => {
    setPlaying(false);
    stopSources();
    setText(value.slice(0, 280));
    setRevealed("");
    setChunkIndex(0);
  };

  return (
    <section className="gibberish-lab">
      <div className="gibberish-stage">
        <div className="speech-field" style={{ "--character-color": color } as React.CSSProperties}>
          <canvas ref={canvasRef} width={W} height={H} aria-label={`Nonlinear speech field displaying: ${revealed || "no text yet"}`} />
          <span className="speech-cursor" aria-hidden="true">{playing ? "▮" : ""}</span>
        </div>
        <div className="gibberish-monitor" aria-live="polite"><b>{playing ? "VOICE RUNNING" : revealed ? "UTTERANCE HELD" : "READY"}</b><span>{chunkIndex} / {chunks.length} chunks</span></div>
      </div>
      <aside className="gibberish-controls">
        <div className="gibberish-copy">
          <span className="control-label">Character utterance</span>
          <p>Text enters the speech field as a live boundary condition. Its alignment color becomes the voice.</p>
        </div>
        <label className="gibberish-text"><span>Dialogue text</span><textarea value={text} rows={5} maxLength={280} onChange={(event) => changeText(event.target.value)} /></label>
        <div className="gibberish-transport"><button className={playing ? "active" : ""} onClick={() => void start()}>{playing ? "Stop speaking" : revealed ? "Speak again" : "Speak"}</button><button onClick={() => { setPlaying(false); stopSources(); setRevealed(text); setChunkIndex(chunks.length); }}>Set full boundary</button></div>
        <div className="identity-control">
          <label><span>Alignment color</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
          <div className="identity-stats">
            <span className="strength"><i style={{ width: `${rgb.red * 100}%` }} />Strength <b>{Math.round(rgb.red * 100)}</b></span>
            <span className="luck"><i style={{ width: `${rgb.green * 100}%` }} />Luck <b>{Math.round(rgb.green * 100)}</b></span>
            <span className="intelligence"><i style={{ width: `${rgb.blue * 100}%` }} />Intelligence <b>{Math.round(rgb.blue * 100)}</b></span>
          </div>
        </div>
        <div className="gibberish-sliders">
          <label><span>Speech speed</span><output>{speed} ms / chunk</output><input type="range" min="35" max="360" step="1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label>
          <label><span>Center pitch</span><output>{pitch} Hz</output><input type="range" min="70" max="900" step="1" value={pitch} onChange={(event) => setPitch(Number(event.target.value))} /></label>
          <label><span>Pitch variance</span><output>±{variance.toFixed(1)} st</output><input type="range" min="0" max="24" step=".5" value={variance} onChange={(event) => setVariance(Number(event.target.value))} /></label>
          <label><span>Portamento</span><output>{Math.round(portamento * 100)}%</output><input type="range" min="0" max="1" step=".01" value={portamento} onChange={(event) => setPortamento(Number(event.target.value))} /></label>
        </div>
        <div className="voice-legend">
          <span className="luck">G · Luck<b>saw ↔ triangle · wandering pitch</b></span>
          <span className="strength">R · Strength<b>PWM pulse · percussive attack</b></span>
          <span className="intelligence">B · Intelligence<b>clipped sine · stable formant</b></span>
        </div>
        <p className="gibberish-note">Two blended tone voices form each syllabic chunk. Consonants strike a separate noise pulse; letter identity bends saw shape, pulse width, and sine clipping.</p>
      </aside>
    </section>
  );
}
