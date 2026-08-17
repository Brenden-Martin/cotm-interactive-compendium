"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clamp,
  exponentialInterval,
  normalSample,
  shapedSpeed,
  tickGate,
  wrapAgent,
  wrapCoordinate,
  wrappedDelta,
  type TelegraphGate,
} from "./agent-engine";

type FieldView = "hidden" | "trail" | "gradient" | "both";

type Parameters = {
  ratCorrelation: number;
  catCorrelation: number;
  wandering: number;
  panic: number;
  socialAttraction: number;
  socialRadius: number;
  separation: number;
  separationRadius: number;
  cheeseAttraction: number;
  catPursuit: number;
  catRepulsion: number;
  trailAvoidance: number;
  trailDecay: number;
  fearStrength: number;
  fearMemory: number;
  burstGain: number;
  burstCurve: number;
  ratMaximum: number;
  catMaximum: number;
  catEnabled: boolean;
  fieldView: FieldView;
};

type Rat = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  wanderAngle: number;
  wanderTarget: number;
  turnClock: number;
  wigglePhase: number;
  fear: number;
  scale: number;
  moveGate: TelegraphGate;
  scentGate: TelegraphGate;
  socialGate: TelegraphGate;
};

type Cat = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  wanderAngle: number;
  wanderTarget: number;
  turnClock: number;
  pursuitGate: TelegraphGate;
  targetId: number | null;
};

type Simulation = {
  rats: Rat[];
  cat: Cat;
  cheese: { x: number; y: number };
  trail: Float32Array;
  trailNext: Float32Array;
  briars: Float32Array;
  gridWidth: number;
  gridHeight: number;
  statsClock: number;
};

const DEFAULTS: Parameters = {
  ratCorrelation: 5,
  catCorrelation: 4.1,
  wandering: 4,
  panic: 8,
  socialAttraction: 2.5,
  socialRadius: 32,
  separation: 6.9,
  separationRadius: 42,
  cheeseAttraction: 4.25,
  catPursuit: 1.9,
  catRepulsion: 5,
  trailAvoidance: 3.35,
  trailDecay: 17.1,
  fearStrength: 8,
  fearMemory: 8.85,
  burstGain: 1.45,
  burstCurve: 1.1,
  ratMaximum: 325,
  catMaximum: 465,
  catEnabled: true,
  fieldView: "hidden",
};

const GRID_WIDTH = 72;
const GRID_HEIGHT = 42;

function RangeControl({ label, value, min, max, step, unit = "", onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const decimals = step < .1 ? 2 : step < 1 ? 1 : 0;
  return (
    <label className="ratz-slider">
      <span>{label}</span>
      <output>{value.toFixed(decimals)}{unit}</output>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

const makeGate = (active: boolean, mean: number): TelegraphGate => ({ active, remaining: exponentialInterval(mean) });

function createRat(id: number, width: number, height: number): Rat {
  const angle = Math.random() * Math.PI * 2;
  return {
    id,
    x: 40 + Math.random() * Math.max(1, width - 80),
    y: 40 + Math.random() * Math.max(1, height - 80),
    vx: Math.cos(angle) * 12,
    vy: Math.sin(angle) * 12,
    angle,
    wanderAngle: angle,
    wanderTarget: angle,
    turnClock: exponentialInterval(.8),
    wigglePhase: Math.random() * Math.PI * 2,
    fear: 0,
    scale: .78 + Math.random() * .38,
    moveGate: makeGate(Math.random() > .35, .8),
    scentGate: makeGate(Math.random() > .45, 1.1),
    socialGate: makeGate(Math.random() > .5, .9),
  };
}

function createSimulation(count: number, width: number, height: number): Simulation {
  const size = GRID_WIDTH * GRID_HEIGHT;
  return {
    rats: Array.from({ length: count }, (_, index) => createRat(index + 1, width, height)),
    cat: {
      x: width * .72,
      y: height * .52,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      wanderAngle: Math.PI,
      wanderTarget: Math.PI,
      turnClock: 1,
      pursuitGate: makeGate(false, 2.8),
      targetId: null,
    },
    cheese: { x: width * .27, y: height * .46 },
    trail: new Float32Array(size),
    trailNext: new Float32Array(size),
    briars: new Float32Array(size),
    gridWidth: GRID_WIDTH,
    gridHeight: GRID_HEIGHT,
    statsClock: 0,
  };
}

function trailSample(simulation: Simulation, x: number, y: number, width: number, height: number) {
  const gx = clamp(Math.round(x / Math.max(1, width) * (simulation.gridWidth - 1)), 0, simulation.gridWidth - 1);
  const gy = clamp(Math.round(y / Math.max(1, height) * (simulation.gridHeight - 1)), 0, simulation.gridHeight - 1);
  return simulation.trail[gy * simulation.gridWidth + gx];
}

function trailGradient(simulation: Simulation, x: number, y: number, width: number, height: number) {
  const gx = clamp(Math.round(x / Math.max(1, width) * (simulation.gridWidth - 1)), 0, simulation.gridWidth - 1);
  const gy = clamp(Math.round(y / Math.max(1, height) * (simulation.gridHeight - 1)), 0, simulation.gridHeight - 1);
  const left = gy * simulation.gridWidth + (gx - 1 + simulation.gridWidth) % simulation.gridWidth;
  const right = gy * simulation.gridWidth + (gx + 1) % simulation.gridWidth;
  const up = ((gy - 1 + simulation.gridHeight) % simulation.gridHeight) * simulation.gridWidth + gx;
  const down = ((gy + 1) % simulation.gridHeight) * simulation.gridWidth + gx;
  return {
    x: (simulation.trail[right] - simulation.trail[left]) * .5,
    y: (simulation.trail[down] - simulation.trail[up]) * .5,
  };
}

function briarSample(simulation: Simulation, x: number, y: number, width: number, height: number) {
  const gx = Math.floor(wrapCoordinate(x, width) / Math.max(1, width) * simulation.gridWidth) % simulation.gridWidth;
  const gy = Math.floor(wrapCoordinate(y, height) / Math.max(1, height) * simulation.gridHeight) % simulation.gridHeight;
  return simulation.briars[gy * simulation.gridWidth + gx];
}

function paintBriars(simulation: Simulation, x: number, y: number, width: number, height: number, radius = 34) {
  const cellWidth = width / simulation.gridWidth;
  const cellHeight = height / simulation.gridHeight;
  for (let gy = 0; gy < simulation.gridHeight; gy++) {
    const cellY = (gy + .5) * cellHeight;
    const dy = wrappedDelta(y, cellY, height);
    if (Math.abs(dy) > radius) continue;
    for (let gx = 0; gx < simulation.gridWidth; gx++) {
      const cellX = (gx + .5) * cellWidth;
      const dx = wrappedDelta(x, cellX, width);
      const distance = Math.hypot(dx, dy);
      if (distance > radius) continue;
      const index = gy * simulation.gridWidth + gx;
      const strength = clamp(1.2 - distance / radius, .18, 1);
      simulation.briars[index] = Math.max(simulation.briars[index], strength);
    }
  }
}

function catBriarRepulsion(simulation: Simulation, x: number, y: number, width: number, height: number) {
  const cellWidth = width / simulation.gridWidth;
  const cellHeight = height / simulation.gridHeight;
  const radius = 92;
  let forceX = 0;
  let forceY = 0;
  let weightTotal = 0;
  for (let gy = 0; gy < simulation.gridHeight; gy++) {
    const cellY = (gy + .5) * cellHeight;
    const dy = wrappedDelta(cellY, y, height);
    if (Math.abs(dy) > radius) continue;
    for (let gx = 0; gx < simulation.gridWidth; gx++) {
      const value = simulation.briars[gy * simulation.gridWidth + gx];
      if (value < .08) continue;
      const cellX = (gx + .5) * cellWidth;
      const dx = wrappedDelta(cellX, x, width);
      const distance = Math.max(1, Math.hypot(dx, dy));
      if (distance >= radius) continue;
      const weight = value * (1 - distance / radius) ** 2;
      forceX += dx / distance * weight;
      forceY += dy / distance * weight;
      weightTotal += weight;
    }
  }
  if (weightTotal < 1e-6) return { x: 0, y: 0 };
  return { x: forceX / weightTotal * 38, y: forceY / weightTotal * 38 };
}

function catTouchesBriars(simulation: Simulation, x: number, y: number, width: number, height: number) {
  if (briarSample(simulation, x, y, width, height) > .12) return true;
  for (let index = 0; index < 8; index++) {
    const angle = index / 8 * Math.PI * 2;
    if (briarSample(simulation, x + Math.cos(angle) * 17, y + Math.sin(angle) * 17, width, height) > .2) return true;
  }
  return false;
}

function ejectCatFromBriars(simulation: Simulation, width: number, height: number) {
  const cat = simulation.cat;
  for (let radius = 20; radius <= 150; radius += 10) {
    for (let index = 0; index < 24; index++) {
      const angle = index / 24 * Math.PI * 2;
      const x = wrapCoordinate(cat.x + Math.cos(angle) * radius, width);
      const y = wrapCoordinate(cat.y + Math.sin(angle) * radius, height);
      if (catTouchesBriars(simulation, x, y, width, height)) continue;
      cat.x = x;
      cat.y = y;
      cat.vx = Math.cos(angle) * Math.min(70, Math.hypot(cat.vx, cat.vy));
      cat.vy = Math.sin(angle) * Math.min(70, Math.hypot(cat.vx, cat.vy));
      return;
    }
  }
}

function updateTrail(simulation: Simulation, delta: number, parameters: Parameters, width: number, height: number) {
  const decay = Math.exp(-delta / Math.max(.2, parameters.trailDecay));
  const diffusion = .52 * delta;
  const gridWidth = simulation.gridWidth;
  const gridHeight = simulation.gridHeight;
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const index = y * gridWidth + x;
      const center = simulation.trail[index] * decay;
      const left = simulation.trail[y * gridWidth + (x - 1 + gridWidth) % gridWidth];
      const right = simulation.trail[y * gridWidth + (x + 1) % gridWidth];
      const up = simulation.trail[((y - 1 + gridHeight) % gridHeight) * gridWidth + x];
      const down = simulation.trail[((y + 1) % gridHeight) * gridWidth + x];
      simulation.trailNext[index] = clamp(center + diffusion * (left + right + up + down - 4 * simulation.trail[index]), 0, 1);
    }
  }
  const previous = simulation.trail;
  simulation.trail = simulation.trailNext;
  simulation.trailNext = previous;
  if (!parameters.catEnabled) return;
  const catX = clamp(Math.round(simulation.cat.x / Math.max(1, width) * (gridWidth - 1)), 0, gridWidth - 1);
  const catY = clamp(Math.round(simulation.cat.y / Math.max(1, height) * (gridHeight - 1)), 0, gridHeight - 1);
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const y = (catY + oy + gridHeight) % gridHeight;
      const x = (catX + ox + gridWidth) % gridWidth;
      const index = y * gridWidth + x;
      simulation.trail[index] = clamp(simulation.trail[index] + delta * (ox === 0 && oy === 0 ? 3.6 : 1.4), 0, 1);
    }
  }
}

function chooseCatTarget(cat: Cat, rats: Rat[], width: number, height: number) {
  const nearest = rats
    .map((rat) => {
      const dx = wrappedDelta(cat.x, rat.x, width);
      const dy = wrappedDelta(cat.y, rat.y, height);
      return { id: rat.id, distance: dx * dx + dy * dy };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);
  cat.targetId = nearest.length ? nearest[Math.floor(Math.random() * nearest.length)].id : null;
}

function drawRat(context: CanvasRenderingContext2D, rat: Rat, offsetX = 0, offsetY = 0) {
  context.save();
  context.translate(Math.round(rat.x + offsetX), Math.round(rat.y + offsetY));
  context.rotate(rat.angle);
  context.scale(rat.scale, rat.scale);
  context.strokeStyle = "#3b332e";
  context.lineWidth = 2.2;
  context.beginPath();
  context.moveTo(-10, 1);
  context.bezierCurveTo(-22, -3, -27, 8, -33, 4);
  context.stroke();
  context.fillStyle = rat.fear > .58 ? "#76504a" : "#544a43";
  context.beginPath();
  context.ellipse(0, 0, 13, 7.5, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#6c5c53";
  context.beginPath();
  context.arc(9, 0, 6.2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#d99395";
  context.beginPath();
  context.arc(7, -5.2, 2.8, 0, Math.PI * 2);
  context.arc(7, 5.2, 2.8, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#171413";
  context.beginPath();
  context.arc(12.5, -2, 1.2, 0, Math.PI * 2);
  context.arc(12.5, 2, 1.2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ed9a9e";
  context.beginPath();
  context.arc(15.2, 0, 1.6, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawCat(context: CanvasRenderingContext2D, cat: Cat, pursuing: boolean, offsetX = 0, offsetY = 0) {
  context.save();
  context.translate(Math.round(cat.x + offsetX), Math.round(cat.y + offsetY));
  context.rotate(cat.angle);
  context.strokeStyle = "#512b18";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-17, 1);
  context.bezierCurveTo(-35, -8, -38, 19, -48, 8);
  context.stroke();
  context.fillStyle = pursuing ? "#e46f2f" : "#c98946";
  context.beginPath();
  context.ellipse(-1, 0, 22, 13, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(17, 0, 11, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(14, -8); context.lineTo(16, -18); context.lineTo(22, -8);
  context.moveTo(14, 8); context.lineTo(16, 18); context.lineTo(22, 8);
  context.fill();
  context.fillStyle = "#101414";
  context.beginPath();
  context.arc(21, -3.5, 1.7, 0, Math.PI * 2);
  context.arc(21, 3.5, 1.7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#f5d866";
  context.fillRect(-8, -14.5, 15, 3.5);
  context.restore();
}

function drawCheese(context: CanvasRenderingContext2D, cheese: { x: number; y: number }, offsetX = 0, offsetY = 0) {
  context.save();
  context.translate(Math.round(cheese.x + offsetX), Math.round(cheese.y + offsetY));
  context.fillStyle = "#f1c83d";
  context.strokeStyle = "#7a5c12";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-15, 11); context.lineTo(17, 7); context.lineTo(-9, -14); context.closePath();
  context.fill(); context.stroke();
  context.fillStyle = "#a87916";
  context.beginPath();
  context.arc(-5, 3, 2.6, 0, Math.PI * 2);
  context.arc(4, -3, 2.2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function wrappedOffsets(x: number, y: number, width: number, height: number, margin: number) {
  const xOffsets = [0];
  const yOffsets = [0];
  if (x < margin) xOffsets.push(width);
  if (x > width - margin) xOffsets.push(-width);
  if (y < margin) yOffsets.push(height);
  if (y > height - margin) yOffsets.push(-height);
  return xOffsets.flatMap((offsetX) => yOffsets.map((offsetY) => ({ offsetX, offsetY })));
}

export function RatzField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<Simulation | null>(null);
  const parametersRef = useRef<Parameters>(DEFAULTS);
  const boundsRef = useRef({ width: 1280, height: 720 });
  const frameRef = useRef(0);
  const pausedRef = useRef(false);
  const controlsHiddenRef = useRef(false);
  const [ratCount, setRatCount] = useState(84);
  const [paused, setPaused] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [stats, setStats] = useState({ alive: 84, meanFear: 0, catPursuing: false });
  const [parameters, setParameters] = useState<Parameters>(DEFAULTS);

  useEffect(() => { parametersRef.current = parameters; }, [parameters]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { controlsHiddenRef.current = controlsHidden; }, [controlsHidden]);

  const setParameter = <K extends keyof Parameters>(key: K, value: Parameters[K]) => {
    setParameters((current) => ({ ...current, [key]: value }));
  };

  const resetSimulation = useCallback(() => {
    const { width, height } = boundsRef.current;
    simulationRef.current = createSimulation(clamp(Math.round(ratCount), 12, 180), width, height);
    setStats({ alive: clamp(Math.round(ratCount), 12, 180), meanFear: 0, catPursuing: false });
  }, [ratCount]);

  const relocateCheese = () => {
    const simulation = simulationRef.current;
    if (!simulation) return;
    const { width, height } = boundsRef.current;
    simulation.cheese = { x: 42 + Math.random() * Math.max(1, width - 84), y: 42 + Math.random() * Math.max(1, height - 84) };
  };

  const clearBriars = () => {
    simulationRef.current?.briars.fill(0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let lastTime = performance.now();
    let drawingPointer: number | null = null;
    let lastBriarPoint: { x: number; y: number } | null = null;

    const paintBriarStroke = (x: number, y: number) => {
      const simulation = simulationRef.current;
      if (!simulation) return;
      const { width, height } = boundsRef.current;
      if (lastBriarPoint) {
        const dx = x - lastBriarPoint.x;
        const dy = y - lastBriarPoint.y;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 9));
        for (let step = 1; step <= steps; step++) {
          paintBriars(simulation, lastBriarPoint.x + dx * step / steps, lastBriarPoint.y + dy * step / steps, width, height);
        }
      } else {
        paintBriars(simulation, x, y, width, height);
      }
      lastBriarPoint = { x, y };
    };

    const pointerDown = (event: PointerEvent) => {
      if (!controlsHiddenRef.current || drawingPointer !== null) return;
      event.preventDefault();
      drawingPointer = event.pointerId;
      lastBriarPoint = null;
      canvas.setPointerCapture(event.pointerId);
      paintBriarStroke(event.clientX, event.clientY);
    };

    const pointerMove = (event: PointerEvent) => {
      if (event.pointerId !== drawingPointer) return;
      event.preventDefault();
      paintBriarStroke(event.clientX, event.clientY);
    };

    const pointerUp = (event: PointerEvent) => {
      if (event.pointerId !== drawingPointer) return;
      drawingPointer = null;
      lastBriarPoint = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.55);
      boundsRef.current = { width, height };
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
      if (!simulationRef.current) simulationRef.current = createSimulation(84, width, height);
    };

    const update = (delta: number) => {
      const simulation = simulationRef.current;
      if (!simulation) return;
      const parameters = parametersRef.current;
      const { width, height } = boundsRef.current;
      updateTrail(simulation, delta, parameters, width, height);
      const cat = simulation.cat;
      const catActiveBefore = cat.pursuitGate.active;
      const catActive = parameters.catEnabled && tickGate(cat.pursuitGate, delta, 1.15, parameters.catCorrelation);
      if (catActive && (!catActiveBefore || cat.targetId === null || !simulation.rats.some((rat) => rat.id === cat.targetId))) {
        chooseCatTarget(cat, simulation.rats, width, height);
      }

      const nextVelocities = simulation.rats.map((rat) => {
        const dxCat = wrappedDelta(cat.x, rat.x, width);
        const dyCat = wrappedDelta(cat.y, rat.y, height);
        const catDistance = Math.max(1, Math.hypot(dxCat, dyCat));
        const localTrail = trailSample(simulation, rat.x, rat.y, width, height);
        const threat = parameters.catEnabled ? clamp(Math.exp(-catDistance / 92) * 1.35 + localTrail * .72, 0, 1) : 0;
        rat.fear += (threat - rat.fear) * (1 - Math.exp(-delta / Math.max(.12, parameters.fearMemory)));

        let fx = 0;
        let fy = 0;
        const catPressure = parameters.catEnabled && catDistance < 185
          ? parameters.catRepulsion * (1 + rat.fear * parameters.fearStrength) * clamp((185 / catDistance) ** 2 - 1, 0, 9)
          : 0;
        if (catPressure > 0) {
          fx += dxCat / catDistance * catPressure;
          fy += dyCat / catDistance * catPressure;
        }

        const gradient = trailGradient(simulation, rat.x, rat.y, width, height);
        const trailScale = parameters.trailAvoidance * (1 + rat.fear * parameters.fearStrength) * 9;
        fx -= gradient.x * trailScale;
        fy -= gradient.y * trailScale;

        const cheeseDx = wrappedDelta(rat.x, simulation.cheese.x, width);
        const cheeseDy = wrappedDelta(rat.y, simulation.cheese.y, height);
        const cheeseDistance = Math.max(1, Math.hypot(cheeseDx, cheeseDy));
        if (tickGate(rat.scentGate, delta, parameters.ratCorrelation * 1.1, parameters.ratCorrelation * .72)) {
          const scent = parameters.cheeseAttraction * clamp(1.15 - cheeseDistance / Math.max(width, height), .12, 1);
          fx += cheeseDx / cheeseDistance * scent;
          fy += cheeseDy / cheeseDistance * scent;
        }

        const nearest: Array<{ dx: number; dy: number; distance: number }> = [];
        let separationX = 0;
        let separationY = 0;
        for (const other of simulation.rats) {
          if (other.id === rat.id) continue;
          const dx = wrappedDelta(rat.x, other.x, width);
          const dy = wrappedDelta(rat.y, other.y, height);
          const distance = Math.hypot(dx, dy);
          if (distance < parameters.separationRadius) {
            if (distance < .001) {
              const escapeAngle = Math.random() * Math.PI * 2;
              separationX += Math.cos(escapeAngle) * parameters.separation * 3;
              separationY += Math.sin(escapeAngle) * parameters.separation * 3;
            } else {
              const overlap = 1 - distance / parameters.separationRadius;
              const closeBoost = distance < 13 ? (13 - distance) / 13 * 2.5 : 0;
              const push = parameters.separation * (overlap * overlap + closeBoost);
              separationX -= dx / distance * push;
              separationY -= dy / distance * push;
            }
          }
          if (distance >= parameters.socialRadius) continue;
          const candidate = { dx, dy, distance };
          const position = nearest.findIndex((item) => distance < item.distance);
          if (position < 0) nearest.push(candidate); else nearest.splice(position, 0, candidate);
          if (nearest.length > 3) nearest.pop();
        }
        fx += separationX;
        fy += separationY;
        if (nearest.length && tickGate(rat.socialGate, delta, parameters.ratCorrelation * .82, parameters.ratCorrelation * .72)) {
          for (const neighbor of nearest) {
            const pull = parameters.socialAttraction * (1 - neighbor.distance / parameters.socialRadius) / nearest.length;
            fx += neighbor.dx / Math.max(1, neighbor.distance) * pull;
            fy += neighbor.dy / Math.max(1, neighbor.distance) * pull;
          }
        }

        const crowd = nearest[0] ? clamp(1 - nearest[0].distance / Math.max(20, parameters.socialRadius * .55), 0, 1) : 0;
        rat.turnClock -= delta * (1 + crowd * 2.2 + rat.fear * 4.2);
        if (rat.turnClock <= 0) {
          const variance = parameters.wandering * (.34 + crowd * 1.5 + rat.fear * parameters.panic);
          rat.wanderTarget += normalSample() * variance;
          rat.turnClock = exponentialInterval(parameters.ratCorrelation / (1 + crowd + rat.fear * 2.5));
        }
        const wanderDelta = Math.atan2(Math.sin(rat.wanderTarget - rat.wanderAngle), Math.cos(rat.wanderTarget - rat.wanderAngle));
        rat.wanderAngle += wanderDelta * (1 - Math.exp(-delta / Math.max(.08, parameters.ratCorrelation * .34)));
        rat.wigglePhase += delta * (2.2 + crowd * 4 + rat.fear * 8);
        const continuousWiggle = Math.sin(rat.wigglePhase) * parameters.wandering * (.24 + rat.fear * .55);
        fx += Math.cos(rat.wanderAngle + continuousWiggle) * parameters.wandering * .46;
        fy += Math.sin(rat.wanderAngle + continuousWiggle) * parameters.wandering * .46;

        const moving = tickGate(rat.moveGate, delta, parameters.ratCorrelation * .86, parameters.ratCorrelation * .58) || rat.fear > .18;
        const forceMagnitude = Math.hypot(fx, fy);
        const speed = moving
          ? shapedSpeed(forceMagnitude, 7, parameters.ratMaximum, parameters.burstGain, parameters.burstCurve)
          : 2.2;
        const desiredAngle = forceMagnitude > 1e-6 ? Math.atan2(fy, fx) : rat.angle;
        const directionBlend = 1 - Math.exp(-delta * (moving ? 6.5 : 2.2));
        const currentX = Math.cos(rat.angle) * (Math.hypot(rat.vx, rat.vy) || speed);
        const currentY = Math.sin(rat.angle) * (Math.hypot(rat.vx, rat.vy) || speed);
        return {
          vx: currentX + (Math.cos(desiredAngle) * speed - currentX) * directionBlend,
          vy: currentY + (Math.sin(desiredAngle) * speed - currentY) * directionBlend,
        };
      });

      simulation.rats.forEach((rat, index) => {
        rat.vx = nextVelocities[index].vx;
        rat.vy = nextVelocities[index].vy;
        rat.angle = Math.atan2(rat.vy, rat.vx);
        rat.x += rat.vx * delta;
        rat.y += rat.vy * delta;
        wrapAgent(rat, width, height);
      });

      if (parameters.catEnabled) {
        const previousCatX = cat.x;
        const previousCatY = cat.y;
        cat.turnClock -= delta;
        if (cat.turnClock <= 0) {
          cat.wanderTarget += normalSample() * .78;
          cat.turnClock = exponentialInterval(parameters.catCorrelation * .52);
        }
        const catWanderDelta = Math.atan2(Math.sin(cat.wanderTarget - cat.wanderAngle), Math.cos(cat.wanderTarget - cat.wanderAngle));
        cat.wanderAngle += catWanderDelta * (1 - Math.exp(-delta / Math.max(.12, parameters.catCorrelation * .28)));
        const target = catActive ? simulation.rats.find((rat) => rat.id === cat.targetId) : undefined;
        let catFx = Math.cos(cat.wanderAngle) * .32;
        let catFy = Math.sin(cat.wanderAngle) * .32;
        if (target) {
          const dx = wrappedDelta(cat.x, target.x, width);
          const dy = wrappedDelta(cat.y, target.y, height);
          const distance = Math.max(1, Math.hypot(dx, dy));
          catFx += dx / distance * parameters.catPursuit;
          catFy += dy / distance * parameters.catPursuit;
        }
        const briarForce = catBriarRepulsion(simulation, cat.x, cat.y, width, height);
        catFx += briarForce.x;
        catFy += briarForce.y;
        const forceMagnitude = Math.hypot(catFx, catFy);
        const catMaximum = Math.max(parameters.catMaximum, parameters.ratMaximum + 15);
        const speed = catActive
          ? shapedSpeed(forceMagnitude, 10, catMaximum, parameters.burstGain * .92, parameters.burstCurve)
          : shapedSpeed(forceMagnitude, 3, catMaximum * .22, .65, 1.45);
        const desiredAngle = Math.atan2(catFy, catFx);
        const blend = 1 - Math.exp(-delta * (catActive ? 4.2 : 2.1));
        cat.vx += (Math.cos(desiredAngle) * speed - cat.vx) * blend;
        cat.vy += (Math.sin(desiredAngle) * speed - cat.vy) * blend;
        cat.angle = Math.atan2(cat.vy, cat.vx);
        cat.x += cat.vx * delta;
        cat.y += cat.vy * delta;
        wrapAgent(cat, width, height);
        if (catTouchesBriars(simulation, cat.x, cat.y, width, height)) {
          cat.x = previousCatX;
          cat.y = previousCatY;
          cat.vx *= -.32;
          cat.vy *= -.32;
          if (catTouchesBriars(simulation, cat.x, cat.y, width, height)) ejectCatFromBriars(simulation, width, height);
        }
        const before = simulation.rats.length;
        simulation.rats = simulation.rats.filter((rat) => {
          const dx = wrappedDelta(cat.x, rat.x, width);
          const dy = wrappedDelta(cat.y, rat.y, height);
          return Math.hypot(dx, dy) > 19;
        });
        if (simulation.rats.length !== before) chooseCatTarget(cat, simulation.rats, width, height);
      }

      if (simulation.rats.some((rat) => {
        const dx = wrappedDelta(rat.x, simulation.cheese.x, width);
        const dy = wrappedDelta(rat.y, simulation.cheese.y, height);
        return Math.hypot(dx, dy) < 18;
      })) {
        simulation.cheese = { x: 42 + Math.random() * Math.max(1, width - 84), y: 42 + Math.random() * Math.max(1, height - 84) };
      }

      simulation.statsClock += delta;
      if (simulation.statsClock > .25) {
        simulation.statsClock = 0;
        const meanFear = simulation.rats.reduce((sum, rat) => sum + rat.fear, 0) / Math.max(1, simulation.rats.length);
        setStats({ alive: simulation.rats.length, meanFear, catPursuing: catActive });
      }
    };

    const drawField = (simulation: Simulation, view: FieldView, width: number, height: number) => {
      if (view === "hidden") return;
      const cellWidth = width / simulation.gridWidth;
      const cellHeight = height / simulation.gridHeight;
      if (view === "trail" || view === "both") {
        for (let y = 0; y < simulation.gridHeight; y++) {
          for (let x = 0; x < simulation.gridWidth; x++) {
            const value = simulation.trail[y * simulation.gridWidth + x];
            if (value < .025) continue;
            context.fillStyle = `rgba(176, 62, 49, ${value * .36})`;
            context.fillRect(x * cellWidth, y * cellHeight, cellWidth + 1, cellHeight + 1);
          }
        }
      }
      if (view === "gradient" || view === "both") {
        context.strokeStyle = "rgba(77, 28, 23, .62)";
        context.lineWidth = 1.2;
        for (let y = 2; y < simulation.gridHeight - 2; y += 4) {
          for (let x = 2; x < simulation.gridWidth - 2; x += 4) {
            const index = y * simulation.gridWidth + x;
            const gx = (simulation.trail[index + 1] - simulation.trail[index - 1]) * .5;
            const gy = (simulation.trail[index + simulation.gridWidth] - simulation.trail[index - simulation.gridWidth]) * .5;
            const magnitude = Math.hypot(gx, gy);
            if (magnitude < .006) continue;
            const px = (x + .5) * cellWidth;
            const py = (y + .5) * cellHeight;
            const scale = Math.min(20, 5 + magnitude * 52);
            context.beginPath();
            context.moveTo(px, py);
            context.lineTo(px + gx / magnitude * scale, py + gy / magnitude * scale);
            context.stroke();
          }
        }
      }
    };

    const drawBriars = (simulation: Simulation, width: number, height: number) => {
      const cellWidth = width / simulation.gridWidth;
      const cellHeight = height / simulation.gridHeight;
      context.lineCap = "round";
      for (let y = 0; y < simulation.gridHeight; y++) {
        for (let x = 0; x < simulation.gridWidth; x++) {
          const index = y * simulation.gridWidth + x;
          const value = simulation.briars[index];
          if (value < .08) continue;
          const px = (x + .5) * cellWidth;
          const py = (y + .5) * cellHeight;
          const reach = Math.min(10, Math.max(4, Math.min(cellWidth, cellHeight) * .8)) * (.72 + value * .28);
          const angle = ((index * 47) % 31) / 31 * Math.PI;
          context.strokeStyle = `rgba(62, 73, 36, ${.42 + value * .48})`;
          context.lineWidth = 1.2 + value * 1.5;
          context.beginPath();
          context.moveTo(px - Math.cos(angle) * reach, py - Math.sin(angle) * reach);
          context.lineTo(px + Math.cos(angle) * reach, py + Math.sin(angle) * reach);
          context.moveTo(px - Math.cos(angle + 1.15) * reach * .76, py - Math.sin(angle + 1.15) * reach * .76);
          context.lineTo(px + Math.cos(angle + 1.15) * reach * .76, py + Math.sin(angle + 1.15) * reach * .76);
          context.stroke();
          context.fillStyle = `rgba(109, 83, 46, ${.32 + value * .42})`;
          context.fillRect(px - 1, py - 1, 2.5, 2.5);
        }
      }
    };

    const draw = (now: number) => {
      const delta = Math.min(.034, (now - lastTime) / 1000);
      lastTime = now;
      const simulation = simulationRef.current;
      const { width, height } = boundsRef.current;
      if (simulation && !pausedRef.current) {
        const maximumSpeed = Math.max(parametersRef.current.ratMaximum, parametersRef.current.catMaximum);
        const substeps = clamp(Math.ceil(delta * maximumSpeed / 12), 1, 8);
        for (let step = 0; step < substeps; step++) update(delta / substeps);
      }
      context.fillStyle = "#d8cfad";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "rgba(72,63,45,.08)";
      context.lineWidth = 1;
      for (let x = 0; x < width; x += 48) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
      for (let y = 0; y < height; y += 48) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
      if (simulation) {
        drawField(simulation, parametersRef.current.fieldView, width, height);
        drawBriars(simulation, width, height);
        for (const offset of wrappedOffsets(simulation.cheese.x, simulation.cheese.y, width, height, 22)) {
          drawCheese(context, simulation.cheese, offset.offsetX, offset.offsetY);
        }
        for (const rat of simulation.rats) {
          for (const offset of wrappedOffsets(rat.x, rat.y, width, height, 38)) drawRat(context, rat, offset.offsetX, offset.offsetY);
        }
        if (parametersRef.current.catEnabled) {
          for (const offset of wrappedOffsets(simulation.cat.x, simulation.cat.y, width, height, 55)) {
            drawCat(context, simulation.cat, simulation.cat.pursuitGate.active, offset.offsetX, offset.offsetY);
          }
        }
      }
      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove, { passive: false });
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
    };
  }, []);

  return (
    <main className="ratz-page">
      <canvas ref={canvasRef} className={`ratz-canvas${controlsHidden ? " is-briar-mode" : ""}`} aria-label="A live stochastic colony of rats seeking cheese, clustering in small groups, fleeing a cat, remembering its fading scent trail, and sheltering in drawable briar refuges." />
      <header className="ratz-chrome" hidden={controlsHidden}>
        <Link href="/gallery">← Gallery</Link>
        <span className="eyebrow">Interactive Exhibit 23</span>
        <h1>Ratz</h1>
        <p>Bursting motion, intermittent intent, scent gradients, pursuit, and fear memory: a spoof of collective-motion models that is still suspiciously legitimate.</p>
      </header>
      <aside className="ratz-controls" aria-label="Ratz behavior controls" hidden={controlsHidden}>
        <button type="button" className="ratz-minimize" onClick={() => setControlsHidden(true)}>Hide all UI</button>
        <div className="ratz-control-head">
          <strong>Behavior laboratory</strong>
          <span>{stats.alive} ratz alive<br />fear {Math.round(stats.meanFear * 100)}% · cat {parameters.catEnabled ? (stats.catPursuing ? "hunting" : "resting") : "away"}</span>
        </div>
        <details open>
          <summary>Behavior clocks</summary>
          <RangeControl label="Rat correlation" value={parameters.ratCorrelation} min={.12} max={5} step={.02} unit="s" onChange={(value) => setParameter("ratCorrelation", value)} />
          <RangeControl label="Cat correlation" value={parameters.catCorrelation} min={.4} max={12} step={.1} unit="s" onChange={(value) => setParameter("catCorrelation", value)} />
          <RangeControl label="Wiggly motion" value={parameters.wandering} min={0} max={4} step={.05} onChange={(value) => setParameter("wandering", value)} />
          <RangeControl label="Panic variance" value={parameters.panic} min={0} max={8} step={.1} onChange={(value) => setParameter("panic", value)} />
        </details>
        <details>
          <summary>Attraction &amp; pursuit</summary>
          <RangeControl label="Clique attraction" value={parameters.socialAttraction} min={0} max={4} step={.05} onChange={(value) => setParameter("socialAttraction", value)} />
          <RangeControl label="Clique radius" value={parameters.socialRadius} min={30} max={240} step={1} unit="px" onChange={(value) => setParameter("socialRadius", value)} />
          <RangeControl label="Separation" value={parameters.separation} min={0} max={10} step={.1} onChange={(value) => setParameter("separation", value)} />
          <RangeControl label="Separation radius" value={parameters.separationRadius} min={12} max={80} step={1} unit="px" onChange={(value) => setParameter("separationRadius", value)} />
          <RangeControl label="Cheese scent" value={parameters.cheeseAttraction} min={0} max={5} step={.05} onChange={(value) => setParameter("cheeseAttraction", value)} />
          <RangeControl label="Cat pursuit" value={parameters.catPursuit} min={0} max={6} step={.05} onChange={(value) => setParameter("catPursuit", value)} />
        </details>
        <details>
          <summary>Scent &amp; fear hysteresis</summary>
          <RangeControl label="Cat repulsion" value={parameters.catRepulsion} min={0} max={8} step={.1} onChange={(value) => setParameter("catRepulsion", value)} />
          <RangeControl label="Trail avoidance" value={parameters.trailAvoidance} min={0} max={6} step={.05} onChange={(value) => setParameter("trailAvoidance", value)} />
          <RangeControl label="Trail decay" value={parameters.trailDecay} min={.5} max={24} step={.1} unit="s" onChange={(value) => setParameter("trailDecay", value)} />
          <RangeControl label="Fear" value={parameters.fearStrength} min={0} max={8} step={.1} onChange={(value) => setParameter("fearStrength", value)} />
          <RangeControl label="Fear memory" value={parameters.fearMemory} min={.15} max={18} step={.05} unit="s" onChange={(value) => setParameter("fearMemory", value)} />
        </details>
        <details>
          <summary>Burst shaping</summary>
          <RangeControl label="Burst gain" value={parameters.burstGain} min={.1} max={4} step={.05} onChange={(value) => setParameter("burstGain", value)} />
          <RangeControl label="Burst curve" value={parameters.burstCurve} min={.5} max={4} step={.05} onChange={(value) => setParameter("burstCurve", value)} />
          <RangeControl label="Rat maximum" value={parameters.ratMaximum} min={45} max={800} step={5} unit="px/s" onChange={(value) => setParameter("ratMaximum", value)} />
          <RangeControl label="Cat maximum" value={parameters.catMaximum} min={120} max={1200} step={5} unit="px/s" onChange={(value) => setParameter("catMaximum", value)} />
        </details>
        <label className="ratz-field-select">
          <span>Cat scent field</span>
          <select value={parameters.fieldView} onChange={(event) => setParameter("fieldView", event.target.value as FieldView)}>
            <option value="hidden">Hidden</option>
            <option value="trail">Trail density</option>
            <option value="gradient">Gradient arrows</option>
            <option value="both">Trail + gradient</option>
          </select>
        </label>
        <label className="ratz-slider ratz-population">
          <span>Population · reset</span><output>{ratCount}</output>
          <input type="range" min="12" max="180" step="4" value={ratCount} onChange={(event) => setRatCount(Number(event.target.value))} />
        </label>
        <div className="ratz-actions">
          <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button>
          <button type="button" onClick={() => setParameter("catEnabled", !parameters.catEnabled)}>{parameters.catEnabled ? "Cat off" : "Cat on"}</button>
          <button type="button" onClick={relocateCheese}>Move cheese</button>
          <button type="button" onClick={resetSimulation}>Reset ratz</button>
          <button type="button" onClick={clearBriars}>Clear briars</button>
        </div>
        <p>Each rat plans from the same frozen frame, follows no more than three neighbors, and carries its own fading memory of danger. Hide the UI, then draw briar refuges that the ratz can enter but the cat cannot.</p>
      </aside>
      {controlsHidden && (
        <div className="ratz-hidden-tools">
          <span>Draw briars · rat refuge · cat proof</span>
          <button type="button" className="ratz-restore" onClick={() => setControlsHidden(false)}>Show Ratz UI</button>
        </div>
      )}
    </main>
  );
}
