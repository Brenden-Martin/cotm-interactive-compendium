"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Particle = { x: number; y: number; vx: number; vy: number; heat: number };
type PointerMode = "attract" | "repel";
type LavaPreset = {
  label: string;
  heaterGain: number;
  heatDecay: number;
  buoyancy: number;
  cohesion: number;
  surfaceTension: number;
  count: number;
  heaterSize: number;
  simulationWidth: number;
  simulationHeight: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const SLIDER_STEPS = 1000;
const BASE_PARTICLE_COUNT = 180;
const LARGE_PARTICLE_COUNT = 1600;
const LAVA_DEFAULTS = {
  heaterGain: 250,
  heatDecay: .01,
  buoyancy: 699,
  cohesion: .15,
  surfaceTension: 2.65,
  count: BASE_PARTICLE_COUNT,
  heaterSize: 1,
  simulationWidth: 1,
  simulationHeight: 1,
};
const LAVA_RANGES = {
  heaterGain: { min: .1, max: 250 },
  heatDecay: { min: .0001, max: .1 },
  buoyancy: { min: 1, max: 1500 },
  cohesion: { min: .005, max: .5 },
  surfaceTension: { min: .01, max: 8 },
  count: { min: 40, max: 1600 },
  heaterSize: { min: .25, max: 2 },
  simulationDimension: { min: .5, max: 3 },
};
const toExponentialPosition = (value: number, min: number, max: number) =>
  clamp(Math.log(Math.max(value, min) / min) / Math.log(max / min) * SLIDER_STEPS, 0, SLIDER_STEPS);
const fromExponentialPosition = (position: number, min: number, max: number) =>
  min * Math.pow(max / min, clamp(position, 0, SLIDER_STEPS) / SLIDER_STEPS);
const roundTo = (value: number, places: number) => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};
const suggestedDimension = (count: number) => {
  const areaScale = count <= BASE_PARTICLE_COUNT
    ? count / BASE_PARTICLE_COUNT
    : 1 + (count - BASE_PARTICLE_COUNT) / (LARGE_PARTICLE_COUNT - BASE_PARTICLE_COUNT);
  return roundTo(clamp(Math.sqrt(Math.max(.25, areaScale)), LAVA_RANGES.simulationDimension.min, LAVA_RANGES.simulationDimension.max), 3);
};
const LARGE_PRESET_DIMENSION = suggestedDimension(LARGE_PARTICLE_COUNT);
const LAVA_PRESETS: Record<string, LavaPreset> = {
  current: {
    label: "Current gallery tuning · 180 particles",
    ...LAVA_DEFAULTS,
  },
  highDensity: {
    label: "High-density tuning · 1,600 particles",
    heaterGain: 81,
    heatDecay: .00119,
    buoyancy: 465,
    cohesion: .125,
    surfaceTension: 6.416,
    count: LARGE_PARTICLE_COUNT,
    heaterSize: LARGE_PRESET_DIMENSION,
    simulationWidth: LARGE_PRESET_DIMENSION,
    simulationHeight: LARGE_PRESET_DIMENSION,
  },
};

export function LavaLamp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const worldRef = useRef({ width: LAVA_DEFAULTS.simulationWidth, height: LAVA_DEFAULTS.simulationHeight });
  const pointerRef = useRef({ x: 0, y: 0, active: false, mode: "attract" as PointerMode });
  const modeRef = useRef<PointerMode>("attract");
  const paramsRef = useRef({ ...LAVA_DEFAULTS, heater: true, paused: false });
  const [heaterGain, setHeaterGain] = useState(LAVA_DEFAULTS.heaterGain);
  const [heatDecay, setHeatDecay] = useState(LAVA_DEFAULTS.heatDecay);
  const [buoyancy, setBuoyancy] = useState(LAVA_DEFAULTS.buoyancy);
  const [cohesion, setCohesion] = useState(LAVA_DEFAULTS.cohesion);
  const [surfaceTension, setSurfaceTension] = useState(LAVA_DEFAULTS.surfaceTension);
  const [particleCount, setParticleCount] = useState(LAVA_DEFAULTS.count);
  const [heaterSize, setHeaterSize] = useState(LAVA_DEFAULTS.heaterSize);
  const [simulationWidth, setSimulationWidth] = useState(LAVA_DEFAULTS.simulationWidth);
  const [simulationHeight, setSimulationHeight] = useState(LAVA_DEFAULTS.simulationHeight);
  const [presetSelection, setPresetSelection] = useState("");
  const [heater, setHeater] = useState(true);
  const [paused, setPaused] = useState(false);
  const [pointerMode, setPointerMode] = useState<PointerMode>("attract");

  useEffect(() => {
    paramsRef.current = { heaterGain, heatDecay, buoyancy, cohesion, surfaceTension, count: particleCount, heaterSize, simulationWidth, simulationHeight, heater, paused };
  }, [heaterGain, heatDecay, buoyancy, cohesion, surfaceTension, particleCount, heaterSize, simulationWidth, simulationHeight, heater, paused]);

  useEffect(() => {
    modeRef.current = pointerMode;
    pointerRef.current.mode = pointerMode;
  }, [pointerMode]);

  const seed = useCallback((
    count = paramsRef.current.count,
    worldWidth = paramsRef.current.simulationWidth,
    worldHeight = paramsRef.current.simulationHeight,
  ) => {
    const width = clamp(worldWidth, LAVA_RANGES.simulationDimension.min, LAVA_RANGES.simulationDimension.max);
    const height = clamp(worldHeight, LAVA_RANGES.simulationDimension.min, LAVA_RANGES.simulationDimension.max);
    worldRef.current = { width, height };
    const particles: Particle[] = [];
    for (let index = 0; index < count; index++) {
      particles.push({
        x: (.12 + Math.random() * .76) * width,
        y: (.55 + Math.random() * .38) * height,
        vx: (Math.random() - .5) * .08,
        vy: (Math.random() - .5) * .08,
        heat: 0,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const pixelCanvas = pixelRef.current;
    if (!canvas || !pixelCanvas) return;
    const ctx = canvas.getContext("2d");
    const pixelCtx = pixelCanvas.getContext("2d");
    if (!ctx || !pixelCtx) return;
    seed();
    let width = 0;
    let height = 0;
    let last = performance.now();

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const positionPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.x = clamp((event.clientX - rect.left) / rect.width, 0, 1) * worldRef.current.width;
      pointerRef.current.y = clamp((event.clientY - rect.top) / rect.height, 0, 1) * worldRef.current.height;
    };
    const pointerDown = (event: PointerEvent) => {
      positionPointer(event);
      pointerRef.current.active = true;
      pointerRef.current.mode = event.button === 2 ? "repel" : modeRef.current;
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => positionPointer(event);
    const pointerUp = () => {
      pointerRef.current.active = false;
      pointerRef.current.mode = modeRef.current;
    };
    const contextMenu = (event: MouseEvent) => event.preventDefault();

    const step = (dt: number) => {
      const particles = particlesRef.current;
      const params = paramsRef.current;
      const ax = new Float32Array(particles.length);
      const ay = new Float32Array(particles.length);
      const neighborX = new Float32Array(particles.length);
      const neighborY = new Float32Array(particles.length);
      const neighborCount = new Uint16Array(particles.length);
      const world = worldRef.current;
      const rest = .031;
      const cohesionRange = .085;
      const cellSize = cohesionRange;
      const grid = new Map<string, number[]>();

      particles.forEach((particle, index) => {
        const cx = Math.floor(particle.x / cellSize);
        const cy = Math.floor(particle.y / cellSize);
        const key = `${cx},${cy}`;
        const bucket = grid.get(key);
        if (bucket) bucket.push(index); else grid.set(key, [index]);
      });

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        ay[i] += .2;
        ax[i] -= a.vx * .2;
        ay[i] -= a.vy * .2;
        a.heat *= Math.exp(-params.heatDecay * dt * 10);
        const hx = a.x - world.width * .5;
        const hy = a.y - (world.height - .06);
        const heaterField = Math.exp(-(hx * hx + hy * hy) / (.018 * params.heaterSize * params.heaterSize));
        if (params.heater) a.heat += params.heaterGain * .0008 * heaterField * dt;
        ay[i] -= params.buoyancy * .0017 * a.heat;

        if (pointerRef.current.active) {
          const dx = pointerRef.current.x - a.x;
          const dy = pointerRef.current.y - a.y;
          const d2 = dx * dx + dy * dy + .001;
          const influence = Math.exp(-d2 / .035) * (pointerRef.current.mode === "attract" ? 1 : -1);
          ax[i] += dx * influence * 4.8;
          ay[i] += dy * influence * 4.8;
        }

        const cellX = Math.floor(a.x / cellSize);
        const cellY = Math.floor(a.y / cellSize);
        for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) {
          const bucket = grid.get(`${cellX + gx},${cellY + gy}`);
          if (!bucket) continue;
          for (const j of bucket) {
            if (j <= i) continue;
            const b = particles[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > cohesionRange * cohesionRange || d2 < .0000001) continue;
            const distance = Math.sqrt(d2);
            const nx = dx / distance;
            const ny = dy / distance;
            let force = 0;
            if (distance < rest) {
              force = -(rest - distance) * 21;
            } else {
              const t = (distance - rest) / (cohesionRange - rest);
              force = Math.sin(Math.PI * t) * .075 * params.cohesion;
            }
            ax[i] += nx * force; ay[i] += ny * force;
            ax[j] -= nx * force; ay[j] -= ny * force;
            neighborX[i] += b.x; neighborY[i] += b.y; neighborCount[i]++;
            neighborX[j] += a.x; neighborY[j] += a.y; neighborCount[j]++;
          }
        }
      }

      particles.forEach((particle, index) => {
        const count = neighborCount[index];
        if (count === 0 || count >= 12 || params.surfaceTension === 0) return;
        const centerX = neighborX[index] / count;
        const centerY = neighborY[index] / count;
        const boundaryFactor = (12 - count) / 12;
        ax[index] += (centerX - particle.x) * params.surfaceTension * boundaryFactor * 3.2;
        ay[index] += (centerY - particle.y) * params.surfaceTension * boundaryFactor * 3.2;
      });

      particles.forEach((particle, index) => {
        particle.vx = clamp((particle.vx + ax[index] * dt) * .992, -.65, .65);
        particle.vy = clamp((particle.vy + ay[index] * dt) * .992, -.65, .65);
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        const radius = .012;
        if (particle.x < radius) { particle.x = radius; particle.vx = Math.abs(particle.vx) * .78; }
        if (particle.x > world.width - radius) { particle.x = world.width - radius; particle.vx = -Math.abs(particle.vx) * .78; }
        if (particle.y < radius) { particle.y = radius; particle.vy = Math.abs(particle.vy) * .78; }
        if (particle.y > world.height - radius) { particle.y = world.height - radius; particle.vy = -Math.abs(particle.vy) * .78; }
      });
    };

    const drawPixels = () => {
      const pw = pixelCanvas.width;
      const ph = pixelCanvas.height;
      pixelCtx.fillStyle = "#0b1015";
      pixelCtx.fillRect(0, 0, pw, ph);
      const world = worldRef.current;
      particlesRef.current.forEach((particle) => {
        const t = clamp(particle.heat / .4, 0, 1);
        pixelCtx.fillStyle = t > .38 ? "#d66b3d" : "#20d7d7";
        pixelCtx.fillRect(Math.floor(particle.x / world.width * pw), Math.floor(particle.y / world.height * ph), 2, 2);
      });
    };
    const draw = (now: number) => {
      const dt = Math.min(.026, (now - last) / 1000 || .016);
      last = now;
      if (!paramsRef.current.paused) {
        step(dt);
        step(dt);
      }
      ctx.fillStyle = "#0b1015";
      ctx.fillRect(0, 0, width, height);
      const lampGradient = ctx.createLinearGradient(0, 0, 0, height);
      lampGradient.addColorStop(0, "rgba(32,215,215,.08)");
      lampGradient.addColorStop(.7, "rgba(193,91,49,.05)");
      lampGradient.addColorStop(1, "rgba(247,231,0,.12)");
      ctx.fillStyle = lampGradient;
      ctx.fillRect(0, 0, width, height);

      const world = worldRef.current;
      particlesRef.current.forEach((particle) => {
        const x = particle.x / world.width * width;
        const y = particle.y / world.height * height;
        const t = clamp(particle.heat / .4, 0, 1);
        const cold = { r: 32, g: 215, b: 215 };
        const hot = { r: 214, g: 107, b: 61 };
        const r = Math.round(cold.r * (1 - t) + hot.r * t);
        const g = Math.round(cold.g * (1 - t) + hot.g * t);
        const b = Math.round(cold.b * (1 - t) + hot.b * t);
        const radius = Math.max(2.2, Math.min(10, width / world.width * .018 * Math.sqrt(110 / Math.max(40, particlesRef.current.length))));
        ctx.fillStyle = `rgba(${r},${g},${b},.18)`;
        ctx.beginPath(); ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      });

      if (paramsRef.current.heater) {
        const heaterY = (world.height - .06) / world.height * height;
        const heaterRadius = width / world.width * .26 * paramsRef.current.heaterSize;
        const glow = ctx.createRadialGradient(width / 2, heaterY, 0, width / 2, heaterY, heaterRadius);
        glow.addColorStop(0, "rgba(247,231,0,.7)");
        glow.addColorStop(1, "rgba(247,231,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, Math.max(0, heaterY - heaterRadius), width, Math.min(height, heaterRadius * 1.25));
      }
      drawPixels();
      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("contextmenu", contextMenu);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("contextmenu", contextMenu);
    };
  }, [seed]);

  const updateCount = (value: number) => {
    const next = clamp(Math.round(value), 20, 4000);
    const nextDimension = suggestedDimension(next);
    setParticleCount(next);
    setSimulationWidth(nextDimension);
    setSimulationHeight(nextDimension);
    paramsRef.current.count = next;
    paramsRef.current.simulationWidth = nextDimension;
    paramsRef.current.simulationHeight = nextDimension;
  };

  const applyPreset = (key: string) => {
    const preset = LAVA_PRESETS[key];
    if (!preset) return;
    setHeaterGain(preset.heaterGain);
    setHeatDecay(preset.heatDecay);
    setBuoyancy(preset.buoyancy);
    setCohesion(preset.cohesion);
    setSurfaceTension(preset.surfaceTension);
    setParticleCount(preset.count);
    setHeaterSize(preset.heaterSize);
    setSimulationWidth(preset.simulationWidth);
    setSimulationHeight(preset.simulationHeight);
    setHeater(true);
    setPaused(false);
    paramsRef.current = { ...preset, heater: true, paused: false };
    seed(preset.count, preset.simulationWidth, preset.simulationHeight);
  };

  return (
    <section className="lava-lab">
      <div className="lamp-stage">
        <div className="lamp-cap top" />
        <div className="lamp-glass">
          <canvas ref={canvasRef} className="lava-canvas" aria-label="Interactive heated-particle lava lamp. Press and drag to move the fluid." />
        </div>
        <div className="lamp-cap bottom" />
        <div className="lamp-instruction"><b>PRESS + HOLD</b><span>{pointerMode} the fluid</span></div>
      </div>
      <aside className="lava-controls">
        <div className="pixel-monitor">
          <div><span className="control-label">Binary fluid readout</span><b>32 × 65</b></div>
          <canvas ref={pixelRef} width="64" height="130" aria-label="Low-resolution fluid occupancy view" />
        </div>
        <div className="control-block">
          <span className="control-label">Pointer field</span>
          <div className="segmented">
            <button className={pointerMode === "attract" ? "active" : ""} onClick={() => setPointerMode("attract")}>Attract</button>
            <button className={pointerMode === "repel" ? "active" : ""} onClick={() => setPointerMode("repel")}>Repel</button>
          </div>
        </div>
        <div className="lava-slider">
          <label><span>Heater gain</span><input className="lava-number" aria-label="Enter heater gain" type="number" min="0" max="1000" step=".5" value={heaterGain} onChange={(event) => setHeaterGain(clamp(Number(event.target.value), 0, 1000))} /></label>
          <input aria-label="Adjust heater gain exponentially" type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(heaterGain, LAVA_RANGES.heaterGain.min, LAVA_RANGES.heaterGain.max)} onChange={(event) => setHeaterGain(roundTo(fromExponentialPosition(Number(event.target.value), LAVA_RANGES.heaterGain.min, LAVA_RANGES.heaterGain.max), 1))} />
        </div>
        <div className="lava-slider">
          <label><span>Heat decay</span><input className="lava-number" aria-label="Enter heat decay" type="number" min="0" max="10" step=".0001" value={heatDecay} onChange={(event) => setHeatDecay(clamp(Number(event.target.value), 0, 10))} /></label>
          <input aria-label="Adjust heat decay exponentially" type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(heatDecay, LAVA_RANGES.heatDecay.min, LAVA_RANGES.heatDecay.max)} onChange={(event) => setHeatDecay(roundTo(fromExponentialPosition(Number(event.target.value), LAVA_RANGES.heatDecay.min, LAVA_RANGES.heatDecay.max), 5))} />
        </div>
        <div className="lava-slider">
          <label><span>Buoyancy</span><input className="lava-number" aria-label="Enter buoyancy" type="number" min="0" max="10000" step="1" value={buoyancy} onChange={(event) => setBuoyancy(clamp(Number(event.target.value), 0, 10000))} /></label>
          <input aria-label="Adjust buoyancy exponentially" type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(buoyancy, LAVA_RANGES.buoyancy.min, LAVA_RANGES.buoyancy.max)} onChange={(event) => setBuoyancy(Math.round(fromExponentialPosition(Number(event.target.value), LAVA_RANGES.buoyancy.min, LAVA_RANGES.buoyancy.max)))} />
        </div>
        <div className="lava-slider">
          <label><span>Cohesion strength</span><input className="lava-number" aria-label="Enter cohesion strength" type="number" min="0" max="20" step=".005" value={cohesion} onChange={(event) => setCohesion(clamp(Number(event.target.value), 0, 20))} /></label>
          <input aria-label="Adjust cohesion strength exponentially" type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(cohesion, LAVA_RANGES.cohesion.min, LAVA_RANGES.cohesion.max)} onChange={(event) => setCohesion(roundTo(fromExponentialPosition(Number(event.target.value), LAVA_RANGES.cohesion.min, LAVA_RANGES.cohesion.max), 3))} />
        </div>
        <div className="lava-slider">
          <label><span>Surface tension</span><input className="lava-number" aria-label="Enter surface tension" type="number" min="0" max="20" step=".01" value={surfaceTension} onChange={(event) => setSurfaceTension(clamp(Number(event.target.value), 0, 20))} /></label>
          <input aria-label="Adjust surface tension exponentially" type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(surfaceTension, LAVA_RANGES.surfaceTension.min, LAVA_RANGES.surfaceTension.max)} onChange={(event) => setSurfaceTension(roundTo(fromExponentialPosition(Number(event.target.value), LAVA_RANGES.surfaceTension.min, LAVA_RANGES.surfaceTension.max), 3))} />
        </div>
        <div className="lava-slider">
          <label><span>Particles · applies on reset</span><input className="lava-number" aria-label="Enter particle count" type="number" min="20" max="4000" step="10" value={particleCount} onChange={(event) => updateCount(Number(event.target.value))} /></label>
          <input aria-label="Adjust particle count exponentially" type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(particleCount, LAVA_RANGES.count.min, LAVA_RANGES.count.max)} onChange={(event) => updateCount(Math.round(fromExponentialPosition(Number(event.target.value), LAVA_RANGES.count.min, LAVA_RANGES.count.max) / 10) * 10)} />
        </div>
        <div className="lava-slider">
          <label><span>Heater size</span><input className="lava-number" aria-label="Enter heater size" type="number" min=".25" max="2" step=".01" value={heaterSize} onChange={(event) => setHeaterSize(clamp(Number(event.target.value), LAVA_RANGES.heaterSize.min, LAVA_RANGES.heaterSize.max))} /></label>
          <input aria-label="Adjust heater size exponentially" type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(heaterSize, LAVA_RANGES.heaterSize.min, LAVA_RANGES.heaterSize.max)} onChange={(event) => setHeaterSize(roundTo(fromExponentialPosition(Number(event.target.value), LAVA_RANGES.heaterSize.min, LAVA_RANGES.heaterSize.max), 3))} />
        </div>
        <div className="lava-slider">
          <label><span>Simulation width · reset</span><input className="lava-number" aria-label="Enter simulation width" type="number" min=".5" max="3" step=".01" value={simulationWidth} onChange={(event) => setSimulationWidth(clamp(Number(event.target.value), LAVA_RANGES.simulationDimension.min, LAVA_RANGES.simulationDimension.max))} /></label>
          <input aria-label="Adjust simulation width exponentially" type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(simulationWidth, LAVA_RANGES.simulationDimension.min, LAVA_RANGES.simulationDimension.max)} onChange={(event) => setSimulationWidth(roundTo(fromExponentialPosition(Number(event.target.value), LAVA_RANGES.simulationDimension.min, LAVA_RANGES.simulationDimension.max), 3))} />
        </div>
        <div className="lava-slider">
          <label><span>Simulation height · reset</span><input className="lava-number" aria-label="Enter simulation height" type="number" min=".5" max="3" step=".01" value={simulationHeight} onChange={(event) => setSimulationHeight(clamp(Number(event.target.value), LAVA_RANGES.simulationDimension.min, LAVA_RANGES.simulationDimension.max))} /></label>
          <input aria-label="Adjust simulation height exponentially" type="range" min="0" max={SLIDER_STEPS} step="1" value={toExponentialPosition(simulationHeight, LAVA_RANGES.simulationDimension.min, LAVA_RANGES.simulationDimension.max)} onChange={(event) => setSimulationHeight(roundTo(fromExponentialPosition(Number(event.target.value), LAVA_RANGES.simulationDimension.min, LAVA_RANGES.simulationDimension.max), 3))} />
        </div>
        <div className="transport lava-transport">
          <button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button>
          <button onClick={() => { setHeater((value) => !value); }}>{heater ? "Heater off" : "Heater on"}</button>
          <button onClick={() => seed(particleCount, simulationWidth, simulationHeight)}>Reset fluid</button>
        </div>
        <div className="lava-preset">
          <label htmlFor="lava-preset-select">Preset loader</label>
          <select
            id="lava-preset-select"
            value={presetSelection}
            onChange={(event) => {
              const next = event.target.value;
              setPresetSelection("");
              applyPreset(next);
            }}
          >
            <option value="">Choose a preset…</option>
            {Object.entries(LAVA_PRESETS).map(([key, preset]) => <option key={key} value={key}>{preset.label}</option>)}
          </select>
        </div>
        <p className="lava-scale-note">Particle changes suggest a square-root-scaled domain. Width, height, and particle count take effect when the fluid resets.</p>
        <p className="lab-note">Desktop: left click attracts and right click repels. On touch, choose a field above and drag directly through the lamp.</p>
      </aside>
    </section>
  );
}
