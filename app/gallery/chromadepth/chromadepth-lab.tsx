"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyseGooAudio,
  EMPTY_GOO_BANDS,
  GOO_BAND_LABELS,
  smoothGooBands,
  type GooAudioBands,
  type GooBandKey,
} from "../../shared/polymorphic-goo";

type Vector3 = { x: number; y: number; z: number };
type SpeciesParameters = {
  gravity: number;
  buoyancy: number;
  vortex: number;
  alignment: number;
  cohesion: number;
  separation: number;
  perception: number;
  viscosity: number;
  wandering: number;
  correlation: number;
  activity: number;
  fear: number;
  fearMemory: number;
  maximumSpeed: number;
  crossAttraction: number;
};
type SpeciesKey = keyof SpeciesParameters;
type Particle = Vector3 & {
  vx: number;
  vy: number;
  vz: number;
  wx: number;
  wy: number;
  wz: number;
  fear: number;
  heat: number;
  gateClock: number;
  active: boolean;
  species: number;
  seed: number;
};
type ModulationRoute = {
  id: number;
  source: GooBandKey;
  sink: SpeciesKey;
  target: number;
  strength: number;
};
type ChromadepthColorMode = "tension" | "discrete";

const TAU = Math.PI * 2;
const WORLD_RADIUS = 1.55;
const WORLD_EXTENT = WORLD_RADIUS * 2;
const BAND_KEYS = Object.keys(GOO_BAND_LABELS) as GooBandKey[];
const SPECIES_NAMES = ["Ember", "Viridian", "Cobalt"];

const SPECIES_DEFAULTS: SpeciesParameters[] = [
  { gravity: .28, buoyancy: .56, vortex: 1.22, alignment: .52, cohesion: .72, separation: 2.3, perception: .58, viscosity: .42, wandering: .72, correlation: 2.8, activity: .82, fear: 2.4, fearMemory: 3.8, maximumSpeed: 1.48, crossAttraction: .28 },
  { gravity: .18, buoyancy: -.22, vortex: -.74, alignment: 1.1, cohesion: .42, separation: 2.8, perception: .48, viscosity: .62, wandering: 1.15, correlation: 4.1, activity: .68, fear: 3.6, fearMemory: 5.2, maximumSpeed: 1.22, crossAttraction: -.18 },
  { gravity: .42, buoyancy: .12, vortex: .44, alignment: .24, cohesion: 1.18, separation: 1.8, perception: .68, viscosity: .88, wandering: .42, correlation: 5.6, activity: .9, fear: 1.35, fearMemory: 7.2, maximumSpeed: .92, crossAttraction: .52 },
];

const PARAMETER_CONTROLS: Array<{ key: SpeciesKey; label: string; min: number; max: number; step: number }> = [
  { key: "gravity", label: "Central gravity", min: -1.5, max: 2.5, step: .01 },
  { key: "buoyancy", label: "Thermal buoyancy", min: -1.5, max: 1.5, step: .01 },
  { key: "vortex", label: "Vortex circulation", min: -3, max: 3, step: .02 },
  { key: "alignment", label: "Velocity alignment", min: 0, max: 3, step: .02 },
  { key: "cohesion", label: "Cohesion / surface tension", min: -1.5, max: 3.5, step: .02 },
  { key: "separation", label: "Particle separation", min: 0, max: 7, step: .05 },
  { key: "perception", label: "Neighborhood radius", min: .12, max: 1.2, step: .01 },
  { key: "viscosity", label: "Viscosity", min: 0, max: 4, step: .02 },
  { key: "wandering", label: "Correlated wandering", min: 0, max: 4, step: .02 },
  { key: "correlation", label: "Correlation time", min: .15, max: 9, step: .05 },
  { key: "activity", label: "Motion duty cycle", min: .05, max: 1, step: .01 },
  { key: "fear", label: "Cross-species panic", min: 0, max: 8, step: .05 },
  { key: "fearMemory", label: "Fear memory", min: .15, max: 12, step: .05 },
  { key: "maximumSpeed", label: "Maximum speed", min: .12, max: 4, step: .02 },
  { key: "crossAttraction", label: "Cross-species attraction", min: -3, max: 3, step: .02 },
];

const CONTROL_BY_KEY = Object.fromEntries(PARAMETER_CONTROLS.map((control) => [control.key, control])) as Record<SpeciesKey, typeof PARAMETER_CONTROLS[number]>;
const SINK_OPTIONS = PARAMETER_CONTROLS.filter(({ key }) => key !== "perception" && key !== "correlation" && key !== "fearMemory" && key !== "activity");
const DEFAULT_ROUTES: ModulationRoute[] = [
  { id: 1, source: "low", sink: "gravity", target: -1, strength: .75 },
  { id: 2, source: "mid", sink: "vortex", target: -1, strength: 1.1 },
  { id: 3, source: "transitionLow", sink: "cohesion", target: 0, strength: .8 },
  { id: 4, source: "transitionHigh", sink: "separation", target: 1, strength: .9 },
  { id: 5, source: "high", sink: "wandering", target: -1, strength: 1.25 },
  { id: 6, source: "overall", sink: "maximumSpeed", target: 2, strength: .9 },
];

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const wrap = (value: number) => ((value + WORLD_RADIUS) % WORLD_EXTENT + WORLD_EXTENT) % WORLD_EXTENT - WORLD_RADIUS;
const wrappedDelta = (from: number, to: number) => {
  let delta = to - from;
  if (delta > WORLD_RADIUS) delta -= WORLD_EXTENT;
  else if (delta < -WORLD_RADIUS) delta += WORLD_EXTENT;
  return delta;
};
const randomNormal = () => {
  const u = Math.max(1e-7, Math.random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random());
};
const cloneSpecies = () => SPECIES_DEFAULTS.map((species) => ({ ...species }));

function chromadepthRgb(depth: number, tension: number, mode: ChromadepthColorMode) {
  if (mode === "discrete") {
    if (depth < .25) return "rgb(255 0 0)";
    if (depth < .75) return "rgb(0 255 0)";
    return "rgb(0 0 255)";
  }
  const segment = clamp(depth, 0, 1) * 2;
  const local = segment < 1 ? segment : segment - 1;
  const power = 1 + tension * 6;
  const towardNext = Math.pow(local, power) / Math.max(1e-8, Math.pow(local, power) + Math.pow(1 - local, power));
  let red = segment < 1 ? 1 - towardNext : 0;
  let green = segment < 1 ? towardNext : 1 - towardNext;
  let blue = segment < 1 ? 0 : towardNext;
  const brightest = Math.max(red, green, blue, 1e-8);
  red /= brightest; green /= brightest; blue /= brightest;
  return `rgb(${Math.round(red * 255)} ${Math.round(green * 255)} ${Math.round(blue * 255)})`;
}

function ControlSlider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const decimals = step < .02 ? 2 : step < .1 ? 2 : step < 1 ? 1 : 0;
  return <label className="chromadepth-slider"><span>{label}</span><output>{value.toFixed(decimals)}</output><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function seedParticles(count: number, speciesCount: number, species: SpeciesParameters[]) {
  return Array.from({ length: count }, (_, index): Particle => {
    const speciesIndex = index % speciesCount;
    const speed = species[speciesIndex].maximumSpeed * (.08 + Math.random() * .22);
    const theta = Math.random() * TAU;
    const phi = Math.acos(2 * Math.random() - 1);
    return {
      x: (Math.random() * 2 - 1) * WORLD_RADIUS,
      y: (Math.random() * 2 - 1) * WORLD_RADIUS,
      z: (Math.random() * 2 - 1) * WORLD_RADIUS,
      vx: Math.sin(phi) * Math.cos(theta) * speed,
      vy: Math.cos(phi) * speed,
      vz: Math.sin(phi) * Math.sin(theta) * speed,
      wx: randomNormal() * .2,
      wy: randomNormal() * .2,
      wz: randomNormal() * .2,
      fear: 0,
      heat: Math.random(),
      gateClock: .2 + Math.random() * species[speciesIndex].correlation,
      active: Math.random() < species[speciesIndex].activity,
      species: speciesIndex,
      seed: Math.floor(Math.random() * 1000000),
    };
  });
}

function drawSuperellipse(context: CanvasRenderingContext2D, x: number, y: number, radius: number, exponent: number, rotation: number) {
  context.beginPath();
  for (let index = 0; index <= 18; index++) {
    const angle = index / 18 * TAU;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const px = Math.sign(cosine) * Math.pow(Math.abs(cosine), 2 / exponent) * radius;
    const py = Math.sign(sine) * Math.pow(Math.abs(sine), 2 / exponent) * radius;
    const rx = px * Math.cos(rotation) - py * Math.sin(rotation);
    const ry = px * Math.sin(rotation) + py * Math.cos(rotation);
    if (index === 0) context.moveTo(x + rx, y + ry); else context.lineTo(x + rx, y + ry);
  }
  context.closePath();
}

export function ChromadepthLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const speciesRef = useRef<SpeciesParameters[]>(cloneSpecies());
  const speciesCountRef = useRef(3);
  const pausedRef = useRef(false);
  const routesRef = useRef<ModulationRoute[]>(DEFAULT_ROUTES);
  const driftRef = useRef(.32);
  const perspectiveRef = useRef(1.62);
  const cameraDistanceRef = useRef(4.5);
  const particleScaleRef = useRef(1);
  const colorTensionRef = useRef(.78);
  const colorModeRef = useRef<ChromadepthColorMode>("tension");
  const viewRef = useRef({ yaw: -.28, pitch: .16 });
  const pointerRef = useRef({ active: false, x: 0, y: 0 });
  const [species, setSpecies] = useState<SpeciesParameters[]>(cloneSpecies());
  const [speciesCount, setSpeciesCount] = useState(3);
  const [selectedSpecies, setSelectedSpecies] = useState(0);
  const [particleCount, setParticleCount] = useState(720);
  const [parameterDrift, setParameterDrift] = useState(.32);
  const [perspective, setPerspective] = useState(1.62);
  const [cameraDistance, setCameraDistance] = useState(4.5);
  const [particleScale, setParticleScale] = useState(1);
  const [colorTension, setColorTension] = useState(.78);
  const [colorMode, setColorMode] = useState<ChromadepthColorMode>("tension");
  const [paused, setPaused] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [routes, setRoutes] = useState<ModulationRoute[]>(DEFAULT_ROUTES);
  const [audioName, setAudioName] = useState("No audio loaded");
  const [audioLevels, setAudioLevels] = useState<GooAudioBands>({ ...EMPTY_GOO_BANDS });
  const [stats, setStats] = useState({ fps: 60, meanSpeed: 0 });

  useEffect(() => { speciesRef.current = species; }, [species]);
  useEffect(() => { speciesCountRef.current = speciesCount; }, [speciesCount]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { routesRef.current = routes; }, [routes]);
  useEffect(() => { driftRef.current = parameterDrift; }, [parameterDrift]);
  useEffect(() => { perspectiveRef.current = perspective; }, [perspective]);
  useEffect(() => { cameraDistanceRef.current = cameraDistance; }, [cameraDistance]);
  useEffect(() => { particleScaleRef.current = particleScale; }, [particleScale]);
  useEffect(() => { colorTensionRef.current = colorTension; }, [colorTension]);
  useEffect(() => { colorModeRef.current = colorMode; }, [colorMode]);

  const reset = useCallback(() => {
    particlesRef.current = seedParticles(particleCount, speciesCount, speciesRef.current);
  }, [particleCount, speciesCount]);

  const randomizeSliders = () => {
    const randomRange = (minimum: number, maximum: number) => minimum + Math.random() * (maximum - minimum);
    const nextParticleCount = Math.round(randomRange(120, 1400) / 20) * 20;
    const nextSpecies = species.map((entry) => {
      const next = { ...entry };
      for (const control of PARAMETER_CONTROLS) next[control.key] = randomRange(control.min, control.max);
      return next;
    });
    const nextRoutes = routes.map((route) => ({ ...route, strength: randomRange(-3, 3) }));
    speciesRef.current = nextSpecies;
    routesRef.current = nextRoutes;
    setSpecies(nextSpecies);
    setRoutes(nextRoutes);
    setParticleCount(nextParticleCount);
    setParameterDrift(randomRange(0, 1.5));
    setPerspective(randomRange(.65, 2.8));
    setCameraDistance(randomRange(2.2, 9));
    setParticleScale(randomRange(.35, 3));
    setColorTension(randomRange(0, 1.5));
    particlesRef.current = seedParticles(nextParticleCount, speciesCountRef.current, nextSpecies);
  };

  useEffect(() => { reset(); }, [reset]);

  const updateSpecies = (key: SpeciesKey, value: number) => {
    setSpecies((current) => current.map((entry, index) => index === selectedSpecies ? { ...entry, [key]: value } : entry));
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
      analyser.smoothingTimeConstant = .3;
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
    if (audioRef.current) {
      audioRef.current.src = objectUrlRef.current;
      audioRef.current.load();
    }
    setAudioName(file.name);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const frequency = new Uint8Array(1024);
    const waveform = new Uint8Array(2048);
    let smoothedAudio = { ...EMPTY_GOO_BANDS };
    const audioMeans = { ...EMPTY_GOO_BANDS };
    const centeredAudio = { ...EMPTY_GOO_BANDS };
    let animation = 0;
    let last = performance.now();
    let statsClock = last;
    let frames = 0;
    let neighborhoodPhase = 0;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.7);
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const effectiveSpecies = (time: number) => speciesRef.current.map((base, speciesIndex) => {
      const result = { ...base };
      const drift = driftRef.current;
      result.vortex += Math.sin(time * .19 + speciesIndex * 2.1) * drift * 1.15;
      result.buoyancy += Math.sin(time * .13 + speciesIndex * 3.4) * drift * .42;
      result.cohesion += Math.sin(time * .11 + speciesIndex * 1.7) * drift * .58;
      result.gravity += Math.sin(time * .073 + speciesIndex * 2.8) * drift * .3;
      for (const route of routesRef.current) {
        if (route.target >= 0 && route.target !== speciesIndex) continue;
        const control = CONTROL_BY_KEY[route.sink];
        const span = control.max - control.min;
        result[route.sink] = clamp(result[route.sink] + centeredAudio[route.source] * route.strength * span * .72, control.min, control.max);
      }
      return result;
    });

    const simulate = (delta: number, time: number) => {
      const particles = particlesRef.current;
      const count = particles.length;
      if (!count) return;
      const params = effectiveSpecies(time);
      const acceleration = Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0 }));
      neighborhoodPhase = (neighborhoodPhase + 1) % 24;

      for (let index = 0; index < count; index++) {
        const particle = particles[index];
        const parameter = params[particle.species];
        const force = acceleration[index];
        const alignment = { x: 0, y: 0, z: 0 };
        const cohesion = { x: 0, y: 0, z: 0 };
        const separation = { x: 0, y: 0, z: 0 };
        const cross = { x: 0, y: 0, z: 0 };
        let sameNeighbors = 0;
        let nearestOther = Infinity;
        const samples = Math.min(24, count - 1);

        for (let sample = 0; sample < samples; sample++) {
          const offset = 1 + ((particle.seed + sample * 83 + neighborhoodPhase * 19) % (count - 1));
          const other = particles[(index + offset) % count];
          const dx = wrappedDelta(particle.x, other.x);
          const dy = wrappedDelta(particle.y, other.y);
          const dz = wrappedDelta(particle.z, other.z);
          const distanceSquared = dx * dx + dy * dy + dz * dz;
          const distance = Math.sqrt(distanceSquared) || 1e-5;
          const closeRadius = parameter.perception * .46;
          if (distance < closeRadius) {
            const pressure = (1 - distance / closeRadius) ** 2 / distance;
            separation.x -= dx * pressure;
            separation.y -= dy * pressure;
            separation.z -= dz * pressure;
          }
          if (other.species === particle.species && distance < parameter.perception) {
            alignment.x += other.vx; alignment.y += other.vy; alignment.z += other.vz;
            cohesion.x += dx; cohesion.y += dy; cohesion.z += dz;
            sameNeighbors++;
          } else if (other.species !== particle.species) {
            nearestOther = Math.min(nearestOther, distance);
            if (distance < parameter.perception * 1.65) {
              const pull = 1 - distance / (parameter.perception * 1.65);
              cross.x += dx / distance * pull;
              cross.y += dy / distance * pull;
              cross.z += dz / distance * pull;
            }
          }
        }

        if (sameNeighbors) {
          const inverse = 1 / sameNeighbors;
          force.x += ((alignment.x * inverse - particle.vx) * parameter.alignment + cohesion.x * inverse * parameter.cohesion) * .42;
          force.y += ((alignment.y * inverse - particle.vy) * parameter.alignment + cohesion.y * inverse * parameter.cohesion) * .42;
          force.z += ((alignment.z * inverse - particle.vz) * parameter.alignment + cohesion.z * inverse * parameter.cohesion) * .42;
        }
        force.x += separation.x * parameter.separation + cross.x * parameter.crossAttraction;
        force.y += separation.y * parameter.separation + cross.y * parameter.crossAttraction;
        force.z += separation.z * parameter.separation + cross.z * parameter.crossAttraction;

        const threat = nearestOther < parameter.perception * 1.4 ? 1 - nearestOther / (parameter.perception * 1.4) : 0;
        particle.fear += (threat - particle.fear) * (1 - Math.exp(-delta / Math.max(.1, parameter.fearMemory)));
        if (nearestOther < Infinity && particle.fear > 0) {
          force.x += separation.x * particle.fear * parameter.fear;
          force.y += separation.y * particle.fear * parameter.fear;
          force.z += separation.z * particle.fear * parameter.fear;
        }

        const wanderRelax = 1 - Math.exp(-delta / Math.max(.08, parameter.correlation));
        const wanderNoise = Math.sqrt(wanderRelax) * parameter.wandering * (.5 + particle.fear * parameter.fear * .22);
        particle.wx += -particle.wx * wanderRelax + randomNormal() * wanderNoise;
        particle.wy += -particle.wy * wanderRelax + randomNormal() * wanderNoise;
        particle.wz += -particle.wz * wanderRelax + randomNormal() * wanderNoise;
        particle.gateClock -= delta;
        if (particle.gateClock <= 0) {
          particle.active = Math.random() < parameter.activity;
          particle.gateClock = Math.max(.05, -Math.log(Math.max(1e-5, Math.random())) * parameter.correlation * (particle.active ? .58 : .34));
        }

        particle.heat += ((.5 - particle.y / WORLD_EXTENT) - particle.heat) * (1 - Math.exp(-delta * .34));
        force.x += -particle.x * parameter.gravity - particle.z * parameter.vortex + particle.wx;
        force.y += -particle.y * parameter.gravity + (particle.heat - .5) * parameter.buoyancy + particle.wy;
        force.z += -particle.z * parameter.gravity + particle.x * parameter.vortex + particle.wz;
      }

      for (let index = 0; index < count; index++) {
        const particle = particles[index];
        const parameter = params[particle.species];
        const force = acceleration[index];
        const activity = particle.active || particle.fear > .12 ? 1 : .08;
        particle.vx += force.x * delta * activity;
        particle.vy += force.y * delta * activity;
        particle.vz += force.z * delta * activity;
        const damping = Math.exp(-parameter.viscosity * delta);
        particle.vx *= damping; particle.vy *= damping; particle.vz *= damping;
        const speed = Math.hypot(particle.vx, particle.vy, particle.vz);
        if (speed > parameter.maximumSpeed) {
          const scale = parameter.maximumSpeed / speed;
          particle.vx *= scale; particle.vy *= scale; particle.vz *= scale;
        }
        particle.x = wrap(particle.x + particle.vx * delta);
        particle.y = wrap(particle.y + particle.vy * delta);
        particle.z = wrap(particle.z + particle.vz * delta);
      }
    };

    const draw = (time: number) => {
      const box = canvas.getBoundingClientRect();
      const width = box.width;
      const height = box.height;
      const shortSide = Math.min(width, height);
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);
      const yaw = viewRef.current.yaw;
      const pitch = viewRef.current.pitch;
      const cosineYaw = Math.cos(yaw), sineYaw = Math.sin(yaw);
      const cosinePitch = Math.cos(pitch), sinePitch = Math.sin(pitch);
      const cameraDistance = cameraDistanceRef.current;
      const projection = particlesRef.current.map((particle) => {
        const xzX = particle.x * cosineYaw - particle.z * sineYaw;
        const xzZ = particle.x * sineYaw + particle.z * cosineYaw;
        const viewY = particle.y * cosinePitch - xzZ * sinePitch;
        const viewZ = particle.y * sinePitch + xzZ * cosinePitch;
        const scale = perspectiveRef.current / Math.max(.65, cameraDistance - viewZ);
        return { particle, viewZ, x: width * .5 + xzX * shortSide * scale, y: height * .5 + viewY * shortSide * scale, scale };
      }).sort((a, b) => a.viewZ - b.viewZ);

      let meanSpeed = 0;
      const params = speciesRef.current;
      for (const item of projection) {
        const particle = item.particle;
        const speed = Math.hypot(particle.vx, particle.vy, particle.vz);
        meanSpeed += speed;
        const speedRatio = clamp(speed / Math.max(.01, params[particle.species].maximumSpeed), 0, 1);
        const depth = clamp((WORLD_RADIUS - item.viewZ) / WORLD_EXTENT, 0, 1);
        const radius = clamp(6.8 * particleScaleRef.current * item.scale * (1 + speedRatio * .52), 1.2, 22);
        const exponent = 2 + speedRatio * 18;
        const angle = Math.atan2(particle.vy, particle.vx) + time * .09 * (particle.species - 1);
        drawSuperellipse(context, item.x, item.y, radius, exponent, angle);
        context.fillStyle = chromadepthRgb(depth, colorTensionRef.current, colorModeRef.current);
        context.fill();
      }
      return meanSpeed / Math.max(1, projection.length);
    };

    const frame = (now: number) => {
      const delta = Math.min(.035, (now - last) / 1000);
      last = now;
      const analyser = analyserRef.current;
      if (analyser) smoothedAudio = smoothGooBands(smoothedAudio, analyseGooAudio(analyser, frequency, waveform), .18);
      else smoothedAudio = smoothGooBands(smoothedAudio, EMPTY_GOO_BANDS, .04);
      for (const key of BAND_KEYS) {
        const logarithmic = Math.log1p(Math.max(0, smoothedAudio[key]));
        audioMeans[key] += (logarithmic - audioMeans[key]) * (1 - Math.exp(-delta / 5.5));
        centeredAudio[key] = logarithmic - audioMeans[key];
      }
      if (!pausedRef.current) simulate(delta, now / 1000);
      const meanSpeed = draw(now / 1000);
      frames++;
      if (now - statsClock > 500) {
        setStats({ fps: Math.round(frames * 1000 / (now - statsClock)), meanSpeed });
        setAudioLevels({ ...smoothedAudio });
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
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      void audioContextRef.current?.close();
    };
  }, []);

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointerRef.current = { active: true, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current.active) return;
    viewRef.current.yaw += (event.clientX - pointerRef.current.x) * .006;
    viewRef.current.pitch = clamp(viewRef.current.pitch + (event.clientY - pointerRef.current.y) * .006, -1.2, 1.2);
    pointerRef.current.x = event.clientX;
    pointerRef.current.y = event.clientY;
  };
  const pointerUp = () => { pointerRef.current.active = false; };

  return (
    <main className={`chromadepth-page${controlsHidden ? " controls-hidden" : ""}`}>
      <canvas ref={canvasRef} className="chromadepth-canvas" aria-label="Perspective particle sculpture with red near particles and blue far particles" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} />
      <header className="chromadepth-head"><Link href="/gallery">← Gallery</Link><span className="eyebrow">Interactive Exhibit 25 · Depth Encoding</span><h1>Chroma<br />Depth</h1><p>A 3D kinetic sculpture living very insistently on a 2D plane. Drag the field to orbit the camera.</p></header>
      <button className="chromadepth-ui-toggle" onClick={() => setControlsHidden((value) => !value)}>{controlsHidden ? "UI" : "Hide laboratory"}</button>
      <aside className="chromadepth-controls" aria-label="Chromadepth particle laboratory">
        <div className="chromadepth-transport"><button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button><button onClick={reset}>Reseed</button><button onClick={randomizeSliders}>Randomize sliders</button><span>{particleCount} particles · {stats.fps} fps · v̄ {stats.meanSpeed.toFixed(2)}</span></div>
        <details open><summary>Field and camera</summary>
          <div className="chromadepth-grid">
            <label className="chromadepth-select">Independent species<select value={speciesCount} onChange={(event) => { const value = Number(event.target.value); setSpeciesCount(value); setSelectedSpecies((current) => Math.min(current, value - 1)); }}><option value="1">One</option><option value="2">Two</option><option value="3">Three</option></select></label>
            <ControlSlider label="Particle count · reseeds" value={particleCount} min={120} max={1400} step={20} onChange={setParticleCount} />
            <ControlSlider label="Perspective strength" value={perspective} min={.65} max={2.8} step={.01} onChange={setPerspective} />
            <ControlSlider label="Camera distance / zoom" value={cameraDistance} min={2.2} max={9} step={.02} onChange={setCameraDistance} />
            <ControlSlider label="Particle scale" value={particleScale} min={.35} max={3} step={.01} onChange={setParticleScale} />
            <label className="chromadepth-select">Depth color map<select value={colorMode} onChange={(event) => setColorMode(event.target.value as ChromadepthColorMode)}><option value="tension">Tensioned continuous RGB</option><option value="discrete">Discrete R / G / B</option></select></label>
            <ControlSlider label="RGB anchor tension" value={colorTension} min={0} max={1.5} step={.01} onChange={setColorTension} />
            <ControlSlider label="Autonomous parameter drift" value={parameterDrift} min={0} max={1.5} step={.01} onChange={setParameterDrift} />
          </div>
        </details>
        <details open><summary>Species dynamics</summary>
          <div className="chromadepth-species-tabs">{SPECIES_NAMES.slice(0, speciesCount).map((name, index) => <button key={name} className={selectedSpecies === index ? "active" : ""} onClick={() => setSelectedSpecies(index)}>{name}</button>)}</div>
          <div className="chromadepth-grid">{PARAMETER_CONTROLS.map((control) => <ControlSlider key={control.key} label={control.label} value={species[selectedSpecies][control.key]} min={control.min} max={control.max} step={control.step} onChange={(value) => updateSpecies(control.key, value)} />)}</div>
        </details>
        <details><summary>Audio modulation matrix</summary>
          <div className="chromadepth-audio"><label><input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) chooseAudio(file); }} /><b>Choose audio</b></label><small>{audioName}</small><audio ref={audioRef} controls onPlay={() => void connectAudio()} /></div>
          <div className="chromadepth-meters">{BAND_KEYS.map((key) => <span key={key}><i style={{ transform: `scaleX(${clamp(audioLevels[key] * 2.2, 0, 1)})` }} /><b>{key.replace("transition", "T")}</b></span>)}</div>
          <p className="chromadepth-note">Each source is log-RMS centered around its own slowly moving mean, so modulation fluctuates around—not instead of—the species base value.</p>
          <div className="chromadepth-matrix">{routes.map((route) => <div className="chromadepth-route" key={route.id}>
            <select aria-label="Audio source" value={route.source} onChange={(event) => setRoutes((current) => current.map((item) => item.id === route.id ? { ...item, source: event.target.value as GooBandKey } : item))}>{BAND_KEYS.map((key) => <option value={key} key={key}>{GOO_BAND_LABELS[key]}</option>)}</select>
            <span>→</span>
            <select aria-label="Particle parameter sink" value={route.sink} onChange={(event) => setRoutes((current) => current.map((item) => item.id === route.id ? { ...item, sink: event.target.value as SpeciesKey } : item))}>{SINK_OPTIONS.map((control) => <option value={control.key} key={control.key}>{control.label}</option>)}</select>
            <select aria-label="Target species" value={route.target} onChange={(event) => setRoutes((current) => current.map((item) => item.id === route.id ? { ...item, target: Number(event.target.value) } : item))}><option value="-1">All species</option>{SPECIES_NAMES.slice(0, speciesCount).map((name, index) => <option value={index} key={name}>{name}</option>)}</select>
            <label><span>Strength</span><output>{route.strength.toFixed(2)}</output><input type="range" min="-3" max="3" step=".05" value={route.strength} onChange={(event) => setRoutes((current) => current.map((item) => item.id === route.id ? { ...item, strength: Number(event.target.value) } : item))} /></label>
          </div>)}</div>
        </details>
        <p className="chromadepth-footnote">Near → far is pure red → green → blue. RGB tension compresses the mixed-color transitions while every emitted color keeps maximum display saturation and value; discrete mode uses only the three unmixed display primaries. Projected size follows inverse camera distance.</p>
      </aside>
    </main>
  );
}
