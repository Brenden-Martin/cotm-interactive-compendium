"use client";

/* eslint-disable @next/next/no-img-element -- user-owned archive art is served without a proxy */
import { useEffect, useRef, useState } from "react";
import type { MorphBank, SoldAsIsTrack } from "./tracks";

const GRID_WIDTH = 112;
const GRID_HEIGHT = 84;
const CELL_COUNT = GRID_WIDTH * GRID_HEIGHT;
type Field = [Float32Array, Float32Array, Float32Array];
type Anchor = { diffusion: [number, number, number]; coupling: [number, number, number]; drift: number };

const banks: Record<MorphBank, Anchor[]> = {
  calculator: [
    { diffusion: [.145, .092, .121], coupling: [.042, -.031, .035], drift: .0036 },
    { diffusion: [.082, .158, .106], coupling: [-.037, .048, .029], drift: .0028 },
    { diffusion: [.126, .074, .167], coupling: [.031, .026, -.046], drift: .0042 },
    { diffusion: [.102, .133, .087], coupling: [-.026, .039, .044], drift: .0032 },
  ],
  tube: [
    { diffusion: [.074, .122, .096], coupling: [.018, -.021, .033], drift: .0023 },
    { diffusion: [.132, .082, .061], coupling: [-.028, .036, .017], drift: .0031 },
    { diffusion: [.093, .147, .111], coupling: [.034, .019, -.029], drift: .0026 },
  ],
  "stellar-a": [
    { diffusion: [.061, .087, .162], coupling: [.036, -.018, .042], drift: .0021 },
    { diffusion: [.139, .064, .124], coupling: [-.026, .044, .021], drift: .0038 },
    { diffusion: [.077, .151, .092], coupling: [.029, .024, -.038], drift: .0027 },
  ],
  "stellar-b": [
    { diffusion: [.118, .071, .154], coupling: [-.032, .027, .044], drift: .0034 },
    { diffusion: [.069, .143, .103], coupling: [.041, -.025, .019], drift: .0024 },
    { diffusion: [.151, .094, .072], coupling: [.018, .038, -.033], drift: .0030 },
  ],
  "stellar-c": [
    { diffusion: [.164, .076, .091], coupling: [.047, -.036, .023], drift: .0041 },
    { diffusion: [.083, .169, .067], coupling: [-.021, .051, .032], drift: .0036 },
    { diffusion: [.104, .072, .178], coupling: [.035, .022, -.049], drift: .0044 },
  ],
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function imageBoundary(image: HTMLImageElement) {
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

function estimateTempo(buffer: AudioBuffer) {
  const channel = buffer.getChannelData(0);
  const windowSize = 1024;
  const frameRate = buffer.sampleRate / windowSize;
  const frameCount = Math.min(Math.floor(channel.length / windowSize), Math.floor(frameRate * 120));
  const flux = new Float32Array(frameCount);
  let previous = 0;
  let mean = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;
    const start = frame * windowSize;
    for (let sample = 0; sample < windowSize; sample += 8) sum += Math.abs(channel[start + sample] ?? 0);
    const energy = sum / (windowSize / 8);
    flux[frame] = Math.max(0, energy - previous);
    previous = energy;
    mean += flux[frame];
  }
  mean /= Math.max(1, frameCount);
  let variance = 0;
  for (const value of flux) variance += (value - mean) ** 2;
  const threshold = mean + Math.sqrt(variance / Math.max(1, frameCount)) * .55;
  const peaks: number[] = [];
  const minimumGap = Math.max(1, Math.round(frameRate * .16));
  for (let frame = 2; frame < frameCount - 2; frame += 1) {
    if (flux[frame] > threshold && flux[frame] >= flux[frame - 1] && flux[frame] > flux[frame + 1]) {
      if (!peaks.length || frame - peaks[peaks.length - 1] >= minimumGap) peaks.push(frame);
      else if (flux[frame] > flux[peaks[peaks.length - 1]]) peaks[peaks.length - 1] = frame;
    }
  }

  const histogram = new Float32Array(181);
  for (let index = 0; index < peaks.length; index += 1) {
    for (let next = index + 1; next < Math.min(peaks.length, index + 9); next += 1) {
      const seconds = (peaks[next] - peaks[index]) / frameRate;
      let bpm = 60 / seconds;
      while (bpm < 70) bpm *= 2;
      while (bpm > 170) bpm /= 2;
      const bucket = Math.round(bpm);
      if (bucket >= 60 && bucket < histogram.length) histogram[bucket] += 1 / (next - index);
    }
  }
  let best = 0;
  let second = 0;
  let bpm = 0;
  for (let candidate = 60; candidate < histogram.length; candidate += 1) {
    const score = histogram[candidate - 1] * .5 + histogram[candidate] + histogram[candidate + 1] * .5;
    if (score > best) {
      second = best;
      best = score;
      bpm = candidate;
    } else if (score > second) second = score;
  }
  return {
    bpm: bpm || 0,
    confidence: best ? clamp01((best - second) / best + Math.min(.45, peaks.length / 500)) : 0,
    offset: peaks.length ? peaks[0] / frameRate : 0,
  };
}

export function SoldAsIsListeningRoom({ track }: { track: SoldAsIsTrack }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysisStartedRef = useRef(false);
  const tempoRef = useRef({ bpm: track.fallbackBpm, offset: 0 });
  const bandsRef = useRef<[number, number, number]>([0, 0, 0]);
  const [amplitude, setAmplitude] = useState(0);
  const [duration, setDuration] = useState("—:—");
  const [tempo, setTempo] = useState({ bpm: track.fallbackBpm, confidence: 0, detected: false });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const connect = async () => {
      const AudioContextClass = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) {
        const context = new AudioContextClass();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = .72;
        const source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);
        audioContextRef.current = context;
        analyserRef.current = analyser;
      }
      await audioContextRef.current.resume();

      if (!analysisStartedRef.current) {
        analysisStartedRef.current = true;
        try {
          const response = await fetch(track.audioSrc);
          const decoded = await audioContextRef.current.decodeAudioData(await response.arrayBuffer());
          const result = estimateTempo(decoded);
          if (result.bpm) {
            tempoRef.current = { bpm: result.bpm, offset: result.offset };
            setTempo({ bpm: result.bpm, confidence: result.confidence, detected: true });
          }
        } catch {
          setTempo({ bpm: track.fallbackBpm, confidence: 0, detected: false });
        }
      }
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
  }, [track.audioSrc, track.fallbackBpm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const imageData = context.createImageData(GRID_WIDTH, GRID_HEIGHT);
    const random = seededRandom(track.seed);
    const anchors = banks[track.morphBank];
    let field: Field = [new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT)];
    let next: Field = [new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT)];
    let artwork: Field | null = null;
    const spectrum: Field = [new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT), new Float32Array(CELL_COUNT)];
    let frame = 0;
    let animation = 0;
    let last = performance.now();
    let elapsed = 0;
    let envelope = 0;
    const waveform = new Uint8Array(512);
    const frequency = new Uint8Array(256);

    for (let index = 0; index < CELL_COUNT; index += 1) {
      field[0][index] = .2 + random() * .55;
      field[1][index] = .2 + random() * .55;
      field[2][index] = .2 + random() * .55;
    }

    const image = new Image();
    image.src = track.boundarySrc;
    image.onload = () => {
      artwork = imageBoundary(image);
      if (!artwork) return;
      for (let index = 0; index < CELL_COUNT; index += 1) {
        for (let channel = 0; channel < 3; channel += 1) {
          field[channel][index] = clamp01(field[channel][index] * .54 + artwork[channel][index] * .46);
        }
      }
    };

    const sampleAudio = () => {
      const analyser = analyserRef.current;
      if (!analyser) {
        envelope *= .94;
        bandsRef.current = bandsRef.current.map((value) => value * .94) as [number, number, number];
        return;
      }
      analyser.getByteTimeDomainData(waveform);
      analyser.getByteFrequencyData(frequency);
      let sum = 0;
      for (const value of waveform) sum += ((value - 128) / 128) ** 2;
      envelope = Math.max(Math.sqrt(sum / waveform.length) * 3.5, envelope * .86);
      const ranges = [[1, 14], [14, 62], [62, 180]] as const;
      bandsRef.current = ranges.map(([start, end]) => {
        let total = 0;
        for (let index = start; index < end; index += 1) total += frequency[index];
        return total / ((end - start) * 255);
      }) as [number, number, number];

      if (frame % 3 === 0) {
        for (let y = 0; y < GRID_HEIGHT; y += 1) {
          const bin = Math.min(frequency.length - 1, Math.floor(((GRID_HEIGHT - 1 - y) / GRID_HEIGHT) ** 1.65 * frequency.length));
          const intensity = frequency[bin] / 255;
          for (let x = 0; x < GRID_WIDTH - 1; x += 1) {
            const index = y * GRID_WIDTH + x;
            const source = index + 1;
            for (let channel = 0; channel < 3; channel += 1) spectrum[channel][index] = spectrum[channel][source] * .992;
          }
          const edge = y * GRID_WIDTH + GRID_WIDTH - 1;
          spectrum[0][edge] = clamp01(intensity * (1.1 + bandsRef.current[0]));
          spectrum[1][edge] = clamp01(intensity * (.55 + bandsRef.current[1] * 1.4));
          spectrum[2][edge] = clamp01(intensity * (.8 + bandsRef.current[2] * 1.25));
        }
      }
    };

    const step = (time: number) => {
      const audio = audioRef.current;
      const beatPosition = audio && !audio.paused
        ? Math.max(0, audio.currentTime - tempoRef.current.offset) * tempoRef.current.bpm / 60
        : elapsed / 1000 * track.fallbackBpm / 60;
      const anchorPosition = (beatPosition / track.cadenceBeats) % anchors.length;
      const anchorIndex = Math.floor(anchorPosition);
      const blend = smoothstep(anchorPosition - anchorIndex);
      const from = anchors[anchorIndex];
      const to = anchors[(anchorIndex + 1) % anchors.length];
      const spectrumMix = analyserRef.current ? .5 - .5 * Math.cos(beatPosition / track.boundaryCycleBeats * Math.PI) : 0;
      const wildness = .07 + Math.min(1, envelope) * .88;
      const bands = bandsRef.current;

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
            average *= .25;
            const diffusion = from.diffusion[channel] * (1 - blend) + to.diffusion[channel] * blend;
            const coupling = from.coupling[channel] * (1 - blend) + to.coupling[channel] * blend;
            const artValue = artwork?.[channel][index] ?? .5;
            const boundaryValue = artValue * (1 - spectrumMix) + spectrum[channel][index] * spectrumMix;
            const companion = current[(channel + 1) % 3] - current[(channel + 2) % 3];
            const phase = time * .00016 + x * .071 - y * .047 + channel * 2.094;
            const forcing = Math.sin(phase + companion * 8.2) * wildness * (.007 + bands[channel] * .008);
            const memory = (boundaryValue - current[channel]) * (.0012 + spectrumMix * .0024);
            const drift = from.drift * (1 - blend) + to.drift * blend;
            next[channel][index] = clamp01(current[channel] + diffusion * (.38 + boundaryValue * 1.08) * (average - current[channel]) + coupling * companion + forcing + memory - drift * (current[channel] - .48));
          }
        }
      }
      [field, next] = [next, field];
    };

    const draw = (now: number) => {
      const delta = Math.min(48, now - last);
      last = now;
      elapsed += delta;
      sampleAudio();
      step(now);
      step(now + 8);
      for (let index = 0; index < CELL_COUNT; index += 1) {
        const offset = index * 4;
        imageData.data[offset] = Math.round(255 * clamp01((field[0][index] - .14) * 1.36));
        imageData.data[offset + 1] = Math.round(255 * clamp01((field[1][index] - .1) * 1.32));
        imageData.data[offset + 2] = Math.round(255 * clamp01((field[2][index] - .18) * 1.42));
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
  }, [track]);

  const style = {
    "--track-page": track.palette.page,
    "--track-panel": track.palette.panel,
    "--track-accent": track.palette.accent,
    "--track-ink": track.palette.ink,
    "--track-shell": track.palette.shell,
  } as React.CSSProperties;

  return (
    <section className="sai-listening-room" style={style}>
      <div className="sai-title-block">
        <span className="eyebrow">Child of the Machine · Sold As Is {"{No Returns}"}</span>
        <h1>{track.title}</h1>
        <p>{track.subtitle}</p>
      </div>

      <div className="sai-artifact-panel">
        <img src={track.artifactSrc} alt={track.artifactAlt} />
        <div className="sai-artifact-label"><span>{track.catalogNumber}</span><b>Archive artifact</b></div>
      </div>

      <section className="goo-crt" aria-label={`Audio-reactive listening monitor for ${track.title}`}>
        <div className="goo-crt-shell">
          <div className="goo-crt-screen">
            <canvas ref={canvasRef} width={GRID_WIDTH} height={GRID_HEIGHT} aria-label={`A color field driven by ${track.boundaryLabel}, a live spectrogram, and the song`} />
          </div>
          <div className="goo-crt-panel">
            <div className="goo-crt-brand">COTM<br /><small>LISTENING COMPUTER</small></div>
            <div className="goo-crt-knobs" aria-hidden="true"><i /><i /><i /></div>
          </div>
        </div>
        <div className="goo-readout">
          <span>Boundary <b>{track.boundaryLabel} ↔ live spectrum</b></span>
          <span>Tempo <b>{tempo.bpm} BPM {tempo.detected ? `· ${Math.round(tempo.confidence * 100)}%` : "· awaiting play"}</b></span>
          <span>Envelope <b>{Math.round(amplitude * 100)}% · three-band</b></span>
        </div>
      </section>

      <section className="sai-player-panel">
        <div className="sai-player-copy">
          <span className="eyebrow">Original Archive Recording</span>
          <h2>{track.title}</h2>
          <p>Press play to detect the track’s pulse. Tempo moves the morph bank; loudness and low, middle, and high frequency energy bend the field independently.</p>
        </div>
        <audio ref={audioRef} controls preload="metadata" src={track.audioSrc}>Your browser does not support the audio element.</audio>
        <dl className="sai-track-facts">
          <div><dt>Artist</dt><dd>Child of the Machine</dd></div>
          <div><dt>Archive</dt><dd>Sold As Is {"{No Returns}"}</dd></div>
          <div><dt>Runtime</dt><dd>{duration}</dd></div>
          <div><dt>Morph bank</dt><dd>{track.morphBank}</dd></div>
        </dl>
      </section>
    </section>
  );
}
