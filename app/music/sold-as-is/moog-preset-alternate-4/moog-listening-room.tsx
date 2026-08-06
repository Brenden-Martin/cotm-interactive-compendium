"use client";

/* eslint-disable @next/next/no-img-element -- cover art is served as the exact supplied source asset */
import { useEffect, useRef, useState } from "react";

const GRID_WIDTH = 112;
const GRID_HEIGHT = 84;
const CELL_COUNT = GRID_WIDTH * GRID_HEIGHT;

type Field = [Float32Array, Float32Array, Float32Array];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);

const morphAnchors = [
  { diffusion: [0.145, 0.092, 0.121], coupling: [0.042, -0.031, 0.035], drift: 0.0036 },
  { diffusion: [0.082, 0.158, 0.106], coupling: [-0.037, 0.048, 0.029], drift: 0.0028 },
  { diffusion: [0.126, 0.074, 0.167], coupling: [0.031, 0.026, -0.046], drift: 0.0042 },
  { diffusion: [0.102, 0.133, 0.087], coupling: [-0.026, 0.039, 0.044], drift: 0.0032 },
] as const;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function coverBoundary(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_WIDTH;
  canvas.height = GRID_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const scale = Math.max(GRID_WIDTH / image.width, GRID_HEIGHT / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, (GRID_WIDTH - width) / 2, (GRID_HEIGHT - height) / 2, width, height);
  const pixels = context.getImageData(0, 0, GRID_WIDTH, GRID_HEIGHT).data;
  const boundary: Field = [new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT)];
  for (let index = 0; index < CELL_COUNT; index += 1) {
    boundary[0][index] = pixels[index * 4] / 255;
    boundary[1][index] = pixels[index * 4 + 1] / 255;
    boundary[2][index] = pixels[index * 4 + 2] / 255;
  }
  return boundary;
}

export function MoogListeningRoom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [amplitude, setAmplitude] = useState(0);
  const [duration, setDuration] = useState("—:—");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const connect = () => {
      const AudioContextClass = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) {
        const context = new AudioContextClass();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.76;
        const source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);
        audioContextRef.current = context;
        analyserRef.current = analyser;
      }
      void audioContextRef.current.resume();
    };

    const reportDuration = () => {
      if (!Number.isFinite(audio.duration)) return;
      const minutes = Math.floor(audio.duration / 60);
      const seconds = Math.floor(audio.duration % 60).toString().padStart(2, "0");
      setDuration(`${minutes}:${seconds}`);
    };
    audio.addEventListener("play", connect);
    audio.addEventListener("loadedmetadata", reportDuration);
    if (audio.readyState >= 1) reportDuration();
    return () => {
      audio.removeEventListener("play", connect);
      audio.removeEventListener("loadedmetadata", reportDuration);
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const imageData = context.createImageData(GRID_WIDTH, GRID_HEIGHT);
    const random = seededRandom(0xc07a1404);
    let field: Field = [new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT)];
    let next: Field = [new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT)];
    let boundary: Field | null = null;
    let frame = 0;
    let animation = 0;
    let last = performance.now();
    let elapsed = 0;
    let envelope = 0;
    const waveform = new Uint8Array(512);

    for (let index = 0; index < CELL_COUNT; index += 1) {
      field[0][index] = 0.2 + random() * 0.55;
      field[1][index] = 0.2 + random() * 0.55;
      field[2][index] = 0.2 + random() * 0.55;
    }

    const image = new Image();
    image.src = "/music/sold-as-is/cotm-calculator.png";
    image.onload = () => {
      boundary = coverBoundary(image);
      if (!boundary) return;
      for (let index = 0; index < CELL_COUNT; index += 1) {
        field[0][index] = clamp01(field[0][index] * 0.54 + boundary[0][index] * 0.46);
        field[1][index] = clamp01(field[1][index] * 0.54 + boundary[1][index] * 0.46);
        field[2][index] = clamp01(field[2][index] * 0.54 + boundary[2][index] * 0.46);
      }
    };

    const sampleEnvelope = () => {
      const analyser = analyserRef.current;
      if (!analyser) {
        envelope *= 0.94;
        return;
      }
      analyser.getByteTimeDomainData(waveform);
      let sum = 0;
      for (let index = 0; index < waveform.length; index += 1) {
        const sample = (waveform[index] - 128) / 128;
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / waveform.length);
      envelope = Math.max(rms * 3.5, envelope * 0.88);
    };

    const step = (time: number) => {
      const anchorPosition = (elapsed / 9200) % morphAnchors.length;
      const anchorIndex = Math.floor(anchorPosition);
      const blend = smoothstep(anchorPosition - anchorIndex);
      const from = morphAnchors[anchorIndex];
      const to = morphAnchors[(anchorIndex + 1) % morphAnchors.length];
      const wildness = 0.08 + Math.min(1, envelope) * 0.82;

      for (let y = 0; y < GRID_HEIGHT; y += 1) {
        const up = (y + GRID_HEIGHT - 1) % GRID_HEIGHT;
        const down = (y + 1) % GRID_HEIGHT;
        for (let x = 0; x < GRID_WIDTH; x += 1) {
          const left = (x + GRID_WIDTH - 1) % GRID_WIDTH;
          const right = (x + 1) % GRID_WIDTH;
          const index = y * GRID_WIDTH + x;
          const neighbors = [up * GRID_WIDTH + x, down * GRID_WIDTH + x, y * GRID_WIDTH + left, y * GRID_WIDTH + right];
          const current = [field[0][index], field[1][index], field[2][index]];

          for (let channel = 0; channel < 3; channel += 1) {
            let average = 0;
            for (const neighbor of neighbors) average += field[channel][neighbor];
            average *= 0.25;
            const diffusion = from.diffusion[channel] * (1 - blend) + to.diffusion[channel] * blend;
            const coupling = from.coupling[channel] * (1 - blend) + to.coupling[channel] * blend;
            const boundaryWeight = boundary ? 0.38 + boundary[channel][index] * 1.08 : 0.82;
            const companion = current[(channel + 1) % 3] - current[(channel + 2) % 3];
            const phase = time * 0.00016 + x * 0.071 - y * 0.047 + channel * 2.094;
            const forcing = Math.sin(phase + companion * 8.2) * wildness * 0.008;
            const memory = boundary ? (boundary[channel][index] - current[channel]) * 0.0014 : 0;
            const drift = from.drift * (1 - blend) + to.drift * blend;
            next[channel][index] = clamp01(
              current[channel] + diffusion * boundaryWeight * (average - current[channel]) + coupling * companion + forcing + memory - drift * (current[channel] - 0.48),
            );
          }
        }
      }
      [field, next] = [next, field];
    };

    const draw = (now: number) => {
      const delta = Math.min(48, now - last);
      last = now;
      elapsed += delta;
      sampleEnvelope();
      step(now);
      step(now + 8);

      for (let index = 0; index < CELL_COUNT; index += 1) {
        const offset = index * 4;
        const edge = boundary ? 0.78 + (boundary[0][index] + boundary[1][index] + boundary[2][index]) * 0.073 : 1;
        imageData.data[offset] = Math.round(255 * clamp01((field[0][index] - 0.14) * 1.36) * edge);
        imageData.data[offset + 1] = Math.round(255 * clamp01((field[1][index] - 0.1) * 1.32) * edge);
        imageData.data[offset + 2] = Math.round(255 * clamp01((field[2][index] - 0.18) * 1.42) * edge);
        imageData.data[offset + 3] = 255;
      }
      context.putImageData(imageData, 0, 0);
      if (frame % 10 === 0) setAmplitude(Math.min(1, envelope));
      frame += 1;
      animation = requestAnimationFrame(draw);
    };
    animation = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animation);
      image.onload = null;
    };
  }, []);

  return (
    <section className="moog-listening-room">
      <div className="moog-title-block">
        <span className="eyebrow">Child of the Machine · Sold As Is {"{No Returns}"}</span>
        <h1>Moog Preset<br />Alternate 4</h1>
        <p>An alternate recording recovered from the backlog and given a listening machine of its own.</p>
      </div>

      <div className="moog-cover-panel">
        <img src="/music/sold-as-is/cotm-calculator.png" alt="A green pocket synthesizer calculator with Child of the Machine album art taped into its case" />
        <div className="moog-cover-label"><span>SAI / 001</span><b>Cover artifact</b></div>
      </div>

      <section className="goo-crt" aria-label="Audio-reactive Glitch Goo monitor">
        <div className="goo-crt-shell">
          <div className="goo-crt-screen">
            <canvas ref={canvasRef} width={GRID_WIDTH} height={GRID_HEIGHT} aria-label="Color field driven by the calculator cover and the live amplitude of the song" />
          </div>
          <div className="goo-crt-panel">
            <div className="goo-crt-brand">COTM<br /><small>LISTENING COMPUTER</small></div>
            <div className="goo-crt-knobs" aria-hidden="true"><i /><i /><i /></div>
          </div>
        </div>
        <div className="goo-readout">
          <span>Boundary <b>Calculator cover</b></span>
          <span>Envelope <b>{Math.round(amplitude * 100)}%</b></span>
          <span>Morph <b>{amplitude > 0.035 ? "Audio-linked" : "Idle drift"}</b></span>
        </div>
      </section>

      <section className="moog-player-panel">
        <div className="moog-player-copy">
          <span className="eyebrow">Original Recording / MP3</span>
          <h2>Moog Preset Alternate 4</h2>
          <p>
            Press play to route the track through the monitor. Its amplitude envelope increases the field’s wildness while the cover image weights the three color channels.
          </p>
        </div>
        <audio ref={audioRef} controls preload="metadata" src="/music/sold-as-is/moog-preset-alternate-4.mp3">
          Your browser does not support the audio element.
        </audio>
        <dl className="moog-track-facts">
          <div><dt>Artist</dt><dd>Child of the Machine</dd></div>
          <div><dt>Archive</dt><dd>Sold As Is {"{No Returns}"}</dd></div>
          <div><dt>Runtime</dt><dd>{duration}</dd></div>
          <div><dt>Field bank</dt><dd>First-pass / cover-bound</dd></div>
        </dl>
      </section>
    </section>
  );
}
