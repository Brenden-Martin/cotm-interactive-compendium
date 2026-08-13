"use client";

/* eslint-disable @next/next/no-img-element -- user-owned archive art is served without a proxy */
import { useEffect, useRef, useState } from "react";
import archivedPresetData from "../../gallery/deq-morph-bank/saved-presets.json";
import sharedPresetArchiveData from "../../../analysis/deq-preset-space/data/shared-presets.json";
import type { SoldAsIsTrack } from "./tracks";

const FIELD_RESOLUTIONS = {
  "84 × 63": [84, 63],
  "112 × 84": [112, 84],
  "160 × 120": [160, 120],
} as const;
type FieldResolution = keyof typeof FIELD_RESOLUTIONS;
type SpectrumLayout = "trail" | "slice";
type SpectrumColor = "three-band" | "rainbow" | "white";
type Field = [Float32Array, Float32Array, Float32Array];
type DeqConfig = { k: number[]; exponent: number[]; dt: number; decay: number; noise: number };
type DeqPreset = { id: number; config: DeqConfig };
type ComputerControls = { randomize: () => void; capture: () => void; clear: () => void };
type SpectrumSettings = {
  bins: number;
  refreshRate: number;
  layout: SpectrumLayout;
  color: SpectrumColor;
  preamp: number;
  frequencyGain: number;
  gamma: number;
  boundaryStrength: number;
  overlayStrength: number;
};

const indexK = (destination: number, source: number, template: number) => (destination * 3 + source) * 5 + template;
const fullPresetBank = Array.from(new Map(
  ([...(archivedPresetData.presets as DeqPreset[]), ...(sharedPresetArchiveData.presets as DeqPreset[])])
    .map((preset) => [JSON.stringify(preset.config), preset]),
).values());

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
const mixConfig = (from: DeqConfig, to: DeqConfig, amount: number): DeqConfig => ({
  k: from.k.map((value, index) => mix(value, to.k[index], amount)),
  exponent: from.exponent.map((value, index) => mix(value, to.exponent[index], amount)),
  dt: mix(from.dt, to.dt, amount),
  decay: mix(from.decay, to.decay, amount),
  noise: mix(from.noise, to.noise, amount),
});

function spectrumHue(position: number): [number, number, number] {
  const hue = (1 - position) * 300;
  const section = hue / 60;
  const x = 1 - Math.abs(section % 2 - 1);
  if (section < 1) return [1, x, 0];
  if (section < 2) return [x, 1, 0];
  if (section < 3) return [0, 1, x];
  if (section < 4) return [0, x, 1];
  if (section < 5) return [x, 0, 1];
  return [1, 0, x];
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function imageBoundary(image: HTMLImageElement, gridWidth: number, gridHeight: number) {
  const cellCount = gridWidth * gridHeight;
  const canvas = document.createElement("canvas");
  canvas.width = gridWidth;
  canvas.height = gridHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  const scale = Math.max(gridWidth / image.width, gridHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, (gridWidth - width) / 2, (gridHeight - height) / 2, width, height);
  const pixels = context.getImageData(0, 0, gridWidth, gridHeight).data;
  const boundary: Field = [new Float32Array(cellCount), new Float32Array(cellCount), new Float32Array(cellCount)];
  for (let index = 0; index < cellCount; index += 1) {
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
  const spectrumSettingsRef = useRef<SpectrumSettings>({ bins: 96, refreshRate: 24, layout: "trail", color: "three-band", preamp: 2, frequencyGain: 3, gamma: 1, boundaryStrength: 1, overlayStrength: 1 });
  const computerControlsRef = useRef<ComputerControls | null>(null);
  const seekingRef = useRef(false);
  const [amplitude, setAmplitude] = useState(0);
  const [duration, setDuration] = useState("—:—");
  const [tempo, setTempo] = useState({ bpm: track.fallbackBpm, confidence: 0, detected: false });
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fourierBins, setFourierBins] = useState(96);
  const [spectrumRefreshRate, setSpectrumRefreshRate] = useState(24);
  const [spectrumLayout, setSpectrumLayout] = useState<SpectrumLayout>("trail");
  const [spectrumColor, setSpectrumColor] = useState<SpectrumColor>("three-band");
  const [spectrumPreamp, setSpectrumPreamp] = useState(2);
  const [spectrumFrequencyGain, setSpectrumFrequencyGain] = useState(3);
  const [spectrumGamma, setSpectrumGamma] = useState(1);
  const [spectrumBoundaryStrength, setSpectrumBoundaryStrength] = useState(1);
  const [spectrumOverlayStrength, setSpectrumOverlayStrength] = useState(1);
  const [fieldResolution, setFieldResolution] = useState<FieldResolution>("112 × 84");
  const [presetLabel, setPresetLabel] = useState(`AUTO BANK · ${fullPresetBank.length}`);
  const [boundaryMode, setBoundaryMode] = useState("LIVE ART + SPECTRUM");

  useEffect(() => {
    spectrumSettingsRef.current = { bins: fourierBins, refreshRate: spectrumRefreshRate, layout: spectrumLayout, color: spectrumColor, preamp: spectrumPreamp, frequencyGain: spectrumFrequencyGain, gamma: spectrumGamma, boundaryStrength: spectrumBoundaryStrength, overlayStrength: spectrumOverlayStrength };
    if (analyserRef.current) analyserRef.current.fftSize = Math.max(256, 2 ** Math.ceil(Math.log2(fourierBins * 2)));
  }, [fourierBins, spectrumRefreshRate, spectrumLayout, spectrumColor, spectrumPreamp, spectrumFrequencyGain, spectrumGamma, spectrumBoundaryStrength, spectrumOverlayStrength]);

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
      setDurationSeconds(audio.duration);
      const minutes = Math.floor(audio.duration / 60);
      const seconds = Math.floor(audio.duration % 60).toString().padStart(2, "0");
      setDuration(`${minutes}:${seconds}`);
    };
    const reportTime = () => {
      if (!seekingRef.current) setCurrentSeconds(audio.currentTime);
    };
    const reportPlayState = () => setIsPlaying(!audio.paused);
    audio.addEventListener("play", connect);
    audio.addEventListener("play", reportPlayState);
    audio.addEventListener("pause", reportPlayState);
    audio.addEventListener("ended", reportPlayState);
    audio.addEventListener("timeupdate", reportTime);
    audio.addEventListener("loadedmetadata", reportDuration);
    if (audio.readyState >= 1) reportDuration();
    return () => {
      audio.removeEventListener("play", connect);
      audio.removeEventListener("play", reportPlayState);
      audio.removeEventListener("pause", reportPlayState);
      audio.removeEventListener("ended", reportPlayState);
      audio.removeEventListener("timeupdate", reportTime);
      audio.removeEventListener("loadedmetadata", reportDuration);
      void audioContextRef.current?.close();
    };
  }, [track.audioSrc, track.fallbackBpm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const [gridWidth, gridHeight] = FIELD_RESOLUTIONS[fieldResolution];
    const cellCount = gridWidth * gridHeight;
    const imageData = context.createImageData(gridWidth, gridHeight);
    const random = seededRandom(track.seed);
    const sequence = Array.from({ length: 4 }, () => fullPresetBank[Math.floor(random() * fullPresetBank.length)]);
    let field: Field = [new Float32Array(cellCount), new Float32Array(cellCount), new Float32Array(cellCount)];
    let next: Field = [new Float32Array(cellCount), new Float32Array(cellCount), new Float32Array(cellCount)];
    let artwork: Field | null = null;
    let capturedBoundary: Field | null = null;
    let boundaryEnabled = true;
    let forcedConfig: DeqConfig | null = null;
    const spectrum: Field = [new Float32Array(cellCount), new Float32Array(cellCount), new Float32Array(cellCount)];
    let frame = 0;
    let animation = 0;
    let last = performance.now();
    let elapsed = 0;
    let envelope = 0;
    let lastSpectrumUpdate = 0;
    const waveform = new Uint8Array(512);
    const frequency = new Uint8Array(256);

    for (let index = 0; index < cellCount; index += 1) {
      field[0][index] = .2 + random() * .55;
      field[1][index] = .2 + random() * .55;
      field[2][index] = .2 + random() * .55;
    }

    const image = new Image();
    image.src = track.boundarySrc;
    image.onload = () => {
      artwork = imageBoundary(image, gridWidth, gridHeight);
      if (!artwork) return;
      for (let index = 0; index < cellCount; index += 1) {
        for (let channel = 0; channel < 3; channel += 1) {
          field[channel][index] = clamp01(field[channel][index] * .54 + artwork[channel][index] * .46);
        }
      }
    };

    computerControlsRef.current = {
      randomize: () => {
        const preset = fullPresetBank[Math.floor(Math.random() * fullPresetBank.length)];
        forcedConfig = preset.config;
        setPresetLabel(`PRESET ${preset.id} · ${fullPresetBank.length} BANK`);
      },
      capture: () => {
        const audio = audioRef.current;
        const beatPosition = audio ? Math.max(0, audio.currentTime - tempoRef.current.offset) * tempoRef.current.bpm / 60 : 0;
        const spectrumPhase = analyserRef.current ? .5 - .5 * Math.cos(beatPosition / track.boundaryCycleBeats * Math.PI) : 0;
        const spectrumGain = spectrumPhase * spectrumSettingsRef.current.boundaryStrength;
        capturedBoundary = [new Float32Array(cellCount), new Float32Array(cellCount), new Float32Array(cellCount)];
        for (let index = 0; index < cellCount; index += 1) {
          for (let channel = 0; channel < 3; channel += 1) {
            const artValue = artwork?.[channel][index] ?? 0;
            capturedBoundary[channel][index] = artValue * (1 - spectrumPhase) + spectrum[channel][index] * spectrumGain;
          }
        }
        boundaryEnabled = true;
        setBoundaryMode("CAPTURED ART + SPECTRUM");
      },
      clear: () => {
        capturedBoundary = null;
        boundaryEnabled = false;
        setBoundaryMode("CLEARED · SPECTRUM MONITOR ONLY");
      },
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

      const refreshInterval = 1000 / spectrumSettingsRef.current.refreshRate;
      if (performance.now() - lastSpectrumUpdate >= refreshInterval) {
        lastSpectrumUpdate = performance.now();
        const settings = spectrumSettingsRef.current;
        const binCount = Math.min(settings.bins, analyser.frequencyBinCount, frequency.length);
        const applySpectrumTransfer = (value: number, normalizedFrequency: number) => {
          const frequencyScale = 1 + (settings.frequencyGain - 1) * normalizedFrequency;
          return Math.pow(clamp01(value * settings.preamp * frequencyScale), settings.gamma);
        };
        const processedBands = bandsRef.current.map((value, index) => applySpectrumTransfer(value, [.05, .28, .75][index])) as [number, number, number];
        for (let y = 0; y < gridHeight; y += 1) {
          const verticalPosition = (gridHeight - 1 - y) / Math.max(1, gridHeight - 1);
          const bin = Math.min(binCount - 1, Math.floor(verticalPosition ** 1.65 * binCount));
          const normalizedFrequency = bin / Math.max(1, binCount - 1);
          const intensity = applySpectrumTransfer(frequency[bin] / 255, normalizedFrequency);
          if (settings.layout === "trail") for (let x = 0; x < gridWidth - 1; x += 1) {
            const index = y * gridWidth + x;
            const source = index + 1;
            for (let channel = 0; channel < 3; channel += 1) spectrum[channel][index] = spectrum[channel][source] * .992;
          }
          const color = settings.color === "rainbow"
            ? spectrumHue(verticalPosition)
            : settings.color === "white"
              ? [1, 1, 1]
              : processedBands;
          const firstX = settings.layout === "slice" ? 0 : gridWidth - 1;
          for (let x = firstX; x < gridWidth; x += 1) {
            const index = y * gridWidth + x;
            for (let channel = 0; channel < 3; channel += 1) spectrum[channel][index] = clamp01(intensity * color[channel]);
          }
        }
      }
    };

    const step = () => {
      const audio = audioRef.current;
      const beatPosition = audio && !audio.paused
        ? Math.max(0, audio.currentTime - tempoRef.current.offset) * tempoRef.current.bpm / 60
        : elapsed / 1000 * track.fallbackBpm / 60;
      const presetPosition = (beatPosition / track.cadenceBeats) % sequence.length;
      const presetIndex = Math.floor(presetPosition);
      const blend = smoothstep(presetPosition - presetIndex);
      const config = forcedConfig ?? mixConfig(sequence[presetIndex].config, sequence[(presetIndex + 1) % sequence.length].config, blend);
      const spectrumPhase = analyserRef.current ? .5 - .5 * Math.cos(beatPosition / track.boundaryCycleBeats * Math.PI) : 0;
      const spectrumGain = spectrumPhase * spectrumSettingsRef.current.boundaryStrength;
      const bands = bandsRef.current;

      for (let y = 0; y < gridHeight; y += 1) {
        const up = y === 0 ? 1 : y - 1;
        const down = y === gridHeight - 1 ? gridHeight - 2 : y + 1;
        const row = y * gridWidth;
        for (let x = 0; x < gridWidth; x += 1) {
          const left = x === 0 ? 1 : x - 1;
          const right = x === gridWidth - 1 ? gridWidth - 2 : x + 1;
          const index = row + x;

          for (let destination = 0; destination < 3; destination += 1) {
            let accumulator = 0;
            for (let source = 0; source < 3; source += 1) {
              const sourceField = field[source];
              const center = sourceField[index];
              const rightValue = sourceField[row + right];
              const leftValue = sourceField[row + left];
              const downValue = sourceField[down * gridWidth + x];
              const upValue = sourceField[up * gridWidth + x];
              const artValue = artwork?.[source][index] ?? 1;
              const liveBoundary = artValue * (1 - spectrumPhase) + spectrum[source][index] * spectrumGain;
              const boundaryValue = capturedBoundary?.[source][index] ?? liveBoundary;
              const weight = boundaryEnabled ? boundaryValue : 1;
              const dx = (rightValue - center) * weight;
              const dy = (downValue - center) * weight;
              const gradient = Math.sqrt(dx * dx + dy * dy);
              const laplacian = boundaryEnabled
                ? (weight + (capturedBoundary?.[source][row + right] ?? (artwork?.[source][row + right] ?? 1) * (1 - spectrumPhase) + spectrum[source][row + right] * spectrumGain)) * .5 * (rightValue - center)
                  + (weight + (capturedBoundary?.[source][row + left] ?? (artwork?.[source][row + left] ?? 1) * (1 - spectrumPhase) + spectrum[source][row + left] * spectrumGain)) * .5 * (leftValue - center)
                  + (weight + (capturedBoundary?.[source][down * gridWidth + x] ?? (artwork?.[source][down * gridWidth + x] ?? 1) * (1 - spectrumPhase) + spectrum[source][down * gridWidth + x] * spectrumGain)) * .5 * (downValue - center)
                  + (weight + (capturedBoundary?.[source][up * gridWidth + x] ?? (artwork?.[source][up * gridWidth + x] ?? 1) * (1 - spectrumPhase) + spectrum[source][up * gridWidth + x] * spectrumGain)) * .5 * (upValue - center)
                : rightValue + leftValue + downValue + upValue - 4 * center;
              const terms = [center * weight, dx, dy, gradient, laplacian];
              for (let template = 0; template < 5; template += 1) accumulator += config.k[indexK(destination, source, template)] * terms[template];
            }
            const audioDrive = .98 + Math.min(1, envelope) * .04 + bands[destination] * .08;
            let value = (1 - config.decay) * field[destination][index] + config.dt * accumulator * audioDrive;
            value = Math.sign(value) * Math.pow(Math.abs(value), config.exponent[destination]);
            if (config.noise > 0) value += (Math.random() - .5) * config.noise;
            next[destination][index] = clamp01(value);
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
      step();
      step();
      const overlayStrength = spectrumSettingsRef.current.overlayStrength;
      for (let index = 0; index < cellCount; index += 1) {
        const offset = index * 4;
        const spectrumGlow = Math.max(spectrum[0][index], spectrum[1][index], spectrum[2][index]);
        imageData.data[offset] = Math.round(255 * clamp01((field[0][index] - .14) * 1.3 + spectrum[0][index] * .38 * overlayStrength));
        imageData.data[offset + 1] = Math.round(255 * clamp01((field[1][index] - .1) * 1.26 + spectrum[1][index] * .42 * overlayStrength));
        imageData.data[offset + 2] = Math.round(255 * clamp01((field[2][index] - .18) * 1.34 + (spectrum[2][index] * .5 + spectrumGlow * .08) * overlayStrength));
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
      computerControlsRef.current = null;
    };
  }, [fieldResolution, track]);

  const [canvasWidth, canvasHeight] = FIELD_RESOLUTIONS[fieldResolution];

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
            <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} aria-label={`A simultaneous-update DEQ field driven by ${track.boundaryLabel}, a live spectrogram, and the song`} />
          </div>
          <div className="goo-crt-panel">
            <div className="goo-crt-brand">COTM<br /><small>LISTENING COMPUTER</small></div>
            <div className="goo-crt-knobs">
              <button type="button" title="Randomize from the full DEQ preset bank" aria-label="Randomize from the full DEQ preset bank" onClick={() => computerControlsRef.current?.randomize()}><i /><span>RND</span></button>
              <button type="button" title="Capture the current artwork and song spectrum as boundary conditions" aria-label="Capture the current boundary conditions" onClick={() => computerControlsRef.current?.capture()}><i /><span>CAP</span></button>
              <button type="button" title="Clear boundary conditions" aria-label="Clear boundary conditions" onClick={() => computerControlsRef.current?.clear()}><i /><span>CLR</span></button>
            </div>
          </div>
        </div>
        <div className="goo-readout">
          <span>Boundary <b>{boundaryMode}</b></span>
          <span>Tempo <b>{tempo.bpm} BPM {tempo.detected ? `· ${Math.round(tempo.confidence * 100)}%` : "· awaiting play"}</b></span>
          <span>Spectrum <b>{fourierBins} BINS · {spectrumRefreshRate} HZ · {spectrumLayout.toUpperCase()} · {spectrumColor === "three-band" ? "RGB" : spectrumColor.toUpperCase()} · {spectrumPreamp.toFixed(2)}× / HF {spectrumFrequencyGain.toFixed(2)}× / γ {spectrumGamma.toFixed(2)} · {Math.round(amplitude * 100)}%</b></span>
          <span>Preset <b>{presetLabel}</b></span>
        </div>
      </section>

      <section className="sai-player-panel">
        <div className="sai-player-copy">
          <span className="eyebrow">Original Archive Recording</span>
          <h2>{track.title}</h2>
          <p>Press play to detect the track’s pulse. Tempo moves the morph bank; loudness and low, middle, and high frequency energy bend the field independently.</p>
        </div>
        <audio ref={audioRef} preload="auto" src={track.audioSrc}>Your browser does not support the audio element.</audio>
        <div className="sai-transport">
          <button type="button" onClick={() => { const audio = audioRef.current; if (!audio) return; if (audio.paused) void audio.play(); else audio.pause(); }}>{isPlaying ? "PAUSE" : "PLAY"}</button>
          <input
            type="range"
            min="0"
            max={Math.max(durationSeconds, .01)}
            step=".01"
            value={Math.min(currentSeconds, Math.max(durationSeconds, .01))}
            aria-label={`Seek through ${track.title}`}
            onPointerDown={() => { seekingRef.current = true; }}
            onInput={(event) => {
              const value = Number(event.currentTarget.value);
              setCurrentSeconds(value);
              if (audioRef.current && Number.isFinite(audioRef.current.duration)) audioRef.current.currentTime = value;
            }}
            onPointerUp={(event) => {
              const value = Number(event.currentTarget.value);
              if (audioRef.current) audioRef.current.currentTime = value;
              seekingRef.current = false;
              setCurrentSeconds(value);
            }}
            onKeyUp={(event) => {
              const value = Number(event.currentTarget.value);
              if (audioRef.current) audioRef.current.currentTime = value;
              seekingRef.current = false;
              setCurrentSeconds(value);
            }}
          />
          <output>{Math.floor(currentSeconds / 60)}:{Math.floor(currentSeconds % 60).toString().padStart(2, "0")} / {duration}</output>
        </div>
        <div className="sai-spectrum-controls" aria-label="Spectrum analysis settings">
          <label>Fourier bins
            <select value={fourierBins} onChange={(event) => setFourierBins(Number(event.target.value))}>
              {[32, 64, 96, 128, 256].map((value) => <option value={value} key={value}>{value}</option>)}
            </select>
          </label>
          <label>Spectrum refresh
            <select value={spectrumRefreshRate} onChange={(event) => setSpectrumRefreshRate(Number(event.target.value))}>
              {[8, 12, 24, 30, 48, 60].map((value) => <option value={value} key={value}>{value} Hz</option>)}
            </select>
          </label>
          <label>Field resolution
            <select value={fieldResolution} onChange={(event) => setFieldResolution(event.target.value as FieldResolution)}>
              {Object.keys(FIELD_RESOLUTIONS).map((value) => <option value={value} key={value}>{value}</option>)}
            </select>
          </label>
          <label>Spectrum shape
            <select value={spectrumLayout} onChange={(event) => setSpectrumLayout(event.target.value as SpectrumLayout)}>
              <option value="trail">Scrolling trail</option>
              <option value="slice">Full-width slice</option>
            </select>
          </label>
          <label>Spectrum color
            <select value={spectrumColor} onChange={(event) => setSpectrumColor(event.target.value as SpectrumColor)}>
              <option value="three-band">Three-band RGB</option>
              <option value="rainbow">Vertical rainbow</option>
              <option value="white">White spectrum</option>
            </select>
          </label>
          <label className="sai-spectrum-slider">Linear preamp <output>{spectrumPreamp.toFixed(2)}×</output>
            <input aria-label="Spectrum linear preamp" type="range" min=".25" max="8" step=".05" value={spectrumPreamp} onChange={(event) => setSpectrumPreamp(Number(event.target.value))} />
          </label>
          <label className="sai-spectrum-slider">Frequency gain <output>1→{spectrumFrequencyGain.toFixed(2)}×</output>
            <input aria-label="Frequency proportional spectrum gain" type="range" min="1" max="12" step=".05" value={spectrumFrequencyGain} onChange={(event) => setSpectrumFrequencyGain(Number(event.target.value))} />
          </label>
          <label className="sai-spectrum-slider">Gamma nonlinearity <output>γ {spectrumGamma.toFixed(2)}</output>
            <input aria-label="Spectrum gamma nonlinearity" type="range" min=".35" max="3" step=".05" value={spectrumGamma} onChange={(event) => setSpectrumGamma(Number(event.target.value))} />
          </label>
          <label className="sai-spectrum-slider">Boundary strength <output>{Math.round(spectrumBoundaryStrength * 100)}%</output>
            <input aria-label="Spectrum boundary condition strength" type="range" min="0" max="5" step=".02" value={spectrumBoundaryStrength} onChange={(event) => setSpectrumBoundaryStrength(Number(event.target.value))} />
          </label>
          <label className="sai-spectrum-slider">Overlay strength <output>{Math.round(spectrumOverlayStrength * 100)}%</output>
            <input aria-label="Spectrum overlay strength" type="range" min="0" max="2" step=".02" value={spectrumOverlayStrength} onChange={(event) => setSpectrumOverlayStrength(Number(event.target.value))} />
          </label>
        </div>
        <p className="sai-spectrum-note">Linear preamp acts first. Frequency gain then rises proportionally from 1× at the lowest bin to the selected multiplier at the highest bin. Gamma remains a separate nonlinear transfer: values above 1 suppress low-energy bins and sharpen peaks. Boundary strength can overdrive the spectrum into the field equations up to 500%; overlay strength changes only the spectrum drawn over the evolved field.</p>
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
