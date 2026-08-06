"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "small" | "exact" | "double" | "triple";
type Point = { x: number; y: number };
type Sample = { t: number; values: number[] };

const MODES: Array<{ id: Mode; label: string; note: string }> = [
  { id: "small", label: "Small angle", note: "Uses sin(θ) ≈ θ. Accurate only near the bottom." },
  { id: "exact", label: "Exact", note: "Uses the full nonlinear sin(θ) restoring force." },
  { id: "double", label: "Double", note: "Two coupled links exchange energy and develop chaos." },
  { id: "triple", label: "Triple", note: "Three coupled links amplify sensitivity and spectral complexity." },
];

const COLORS = ["#7ee7e7", "#f5de59", "#f58fa9"];

function linkCount(mode: Mode) {
  return mode === "double" ? 2 : mode === "triple" ? 3 : 1;
}

function solveLinear(matrix: number[][], vector: number[]) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column] || 1e-9;
    for (let entry = column; entry <= size; entry += 1) augmented[column][entry] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let entry = column; entry <= size; entry += 1) augmented[row][entry] -= factor * augmented[column][entry];
    }
  }
  return augmented.map((row) => row[size]);
}

export function PendulumLab() {
  const stageRef = useRef<HTMLCanvasElement>(null);
  const plotRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<Mode>("exact");
  const lengthRef = useRef(1);
  const massRef = useRef(1);
  const pausedRef = useRef(false);
  const resetRef = useRef<(mode?: Mode) => void>(() => undefined);
  const [mode, setMode] = useState<Mode>("exact");
  const [length, setLength] = useState(1);
  const [mass, setMass] = useState(1);
  const [paused, setPaused] = useState(false);
  const [telemetry, setTelemetry] = useState({ angle: 0, position: 0, time: 0 });

  useEffect(() => {
    const canvas = stageRef.current;
    const plot = plotRef.current;
    if (!canvas || !plot) return;
    const context = canvas.getContext("2d");
    const plotContext = plot.getContext("2d");
    if (!context || !plotContext) return;

    let width = 0;
    let height = 0;
    let plotWidth = 0;
    let plotHeight = 0;
    let animation = 0;
    let dragging = false;
    let theta: number[] = [];
    let velocity: number[] = [];
    let trails: Point[][] = [];
    let samples: Sample[] = [];
    let time = 0;
    let frame = 0;

    const resizeCanvas = (target: HTMLCanvasElement, cssWidth: number, cssHeight: number) => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      target.width = Math.max(1, Math.floor(cssWidth * ratio));
      target.height = Math.max(1, Math.floor(cssHeight * ratio));
      const targetContext = target.getContext("2d");
      targetContext?.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const resize = () => {
      const stageBox = canvas.getBoundingClientRect();
      const plotBox = plot.getBoundingClientRect();
      width = stageBox.width;
      height = stageBox.height;
      plotWidth = plotBox.width;
      plotHeight = plotBox.height;
      resizeCanvas(canvas, width, height);
      resizeCanvas(plot, plotWidth, plotHeight);
    };

    const reset = (nextMode = modeRef.current) => {
      const count = linkCount(nextMode);
      const starts = count === 1 ? [1.12] : count === 2 ? [1.18, 0.58] : [1.08, 0.36, -0.52];
      theta = starts.slice(0, count);
      velocity = Array(count).fill(0);
      trails = Array.from({ length: count }, () => []);
      samples = [];
      time = 0;
    };
    resetRef.current = reset;

    const accelerations = () => {
      const activeMode = modeRef.current;
      const count = theta.length;
      const segmentLength = lengthRef.current;
      const gravity = 9.81;
      if (count === 1) {
        const restoring = activeMode === "small" ? theta[0] : Math.sin(theta[0]);
        return [-gravity / segmentLength * restoring - 0.008 * velocity[0]];
      }

      const masses = Array(count).fill(1);
      masses[count - 1] = massRef.current;
      const cumulative = masses.map((_, index) => masses.slice(index).reduce((sum, value) => sum + value, 0));
      const matrix = Array.from({ length: count }, () => Array(count).fill(0));
      const rhs = Array(count).fill(0);
      for (let row = 0; row < count; row += 1) {
        for (let column = 0; column < count; column += 1) {
          const inertia = segmentLength * segmentLength * cumulative[Math.max(row, column)];
          matrix[row][column] = inertia * Math.cos(theta[row] - theta[column]);
          rhs[row] -= inertia * Math.sin(theta[row] - theta[column]) * velocity[column] * velocity[column];
        }
        rhs[row] -= gravity * segmentLength * cumulative[row] * Math.sin(theta[row]);
        rhs[row] -= 0.006 * velocity[row];
      }
      return solveLinear(matrix, rhs);
    };

    const integrate = (dt: number) => {
      const acceleration = accelerations();
      for (let index = 0; index < theta.length; index += 1) {
        velocity[index] += acceleration[index] * dt;
        theta[index] += velocity[index] * dt;
      }
      time += dt;
    };

    const geometry = () => {
      const count = theta.length;
      const origin = { x: width / 2, y: 56 };
      const available = Math.min(width * 0.34, (height - 100) / Math.max(1, count));
      const pixelsPerMeter = available / 1.2;
      const segmentPixels = Math.max(48, lengthRef.current * pixelsPerMeter);
      const points: Point[] = [];
      let current = origin;
      for (const angle of theta) {
        current = { x: current.x + segmentPixels * Math.sin(angle), y: current.y + segmentPixels * Math.cos(angle) };
        points.push(current);
      }
      return { origin, points };
    };

    const bottomPositions = () => {
      const positions: number[] = [];
      let x = 0;
      for (let index = 0; index < theta.length; index += 1) {
        x += Math.sin(theta[index]);
        positions.push(x / (index + 1));
      }
      return positions;
    };

    const drawStage = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#06151d";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "rgba(126,231,231,.08)";
      context.lineWidth = 1;
      for (let x = 0; x < width; x += 36) { context.beginPath();context.moveTo(x, 0);context.lineTo(x, height);context.stroke(); }
      for (let y = 0; y < height; y += 36) { context.beginPath();context.moveTo(0, y);context.lineTo(width, y);context.stroke(); }

      const { origin, points } = geometry();
      points.forEach((point, index) => {
        trails[index].push(point);
        if (trails[index].length > 150) trails[index].shift();
        const trail = trails[index];
        for (let segment = 1; segment < trail.length; segment += 1) {
          const alpha = (segment / trail.length) * 0.42;
          const color = COLORS[index];
          const rgb = color === COLORS[0] ? "126,231,231" : color === COLORS[1] ? "245,222,89" : "245,143,169";
          context.strokeStyle = `rgba(${rgb},${alpha})`;
          context.lineWidth = index === points.length - 1 ? 2.3 : 1.2;
          context.beginPath();context.moveTo(trail[segment - 1].x, trail[segment - 1].y);context.lineTo(trail[segment].x, trail[segment].y);context.stroke();
        }
      });

      context.strokeStyle = "#e9e2cb";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(origin.x, origin.y);
      points.forEach((point) => context.lineTo(point.x, point.y));
      context.stroke();
      context.fillStyle = "#e9e2cb";
      context.beginPath();context.arc(origin.x, origin.y, 7, 0, Math.PI * 2);context.fill();
      points.forEach((point, index) => {
        const radius = index === points.length - 1 ? 11 + Math.sqrt(massRef.current) * 4 : 12;
        context.fillStyle = COLORS[index];
        context.shadowColor = COLORS[index];
        context.shadowBlur = 18;
        context.beginPath();context.arc(point.x, point.y, radius, 0, Math.PI * 2);context.fill();
        context.shadowBlur = 0;
      });
      context.fillStyle = "rgba(233,226,203,.66)";
      context.font = "800 9px Arial";
      context.fillText(dragging ? "RELEASE TO RUN" : "DRAG THE LOWEST MASS", 16, height - 18);
    };

    const drawPlot = () => {
      plotContext.clearRect(0, 0, plotWidth, plotHeight);
      plotContext.fillStyle = "#091116";
      plotContext.fillRect(0, 0, plotWidth, plotHeight);
      const left = 44, right = 14, top = 18, bottom = 30;
      const chartWidth = Math.max(1, plotWidth - left - right);
      const chartHeight = Math.max(1, plotHeight - top - bottom);
      plotContext.strokeStyle = "rgba(233,226,203,.18)";
      plotContext.fillStyle = "rgba(233,226,203,.64)";
      plotContext.font = "800 9px Arial";
      for (let grid = 0; grid <= 4; grid += 1) {
        const y = top + chartHeight * grid / 4;
        plotContext.beginPath();plotContext.moveTo(left, y);plotContext.lineTo(left + chartWidth, y);plotContext.stroke();
      }
      plotContext.fillText("+1", 14, top + 4);plotContext.fillText("0", 22, top + chartHeight / 2 + 3);plotContext.fillText("−1", 14, top + chartHeight + 3);
      const minimumTime = Math.max(0, time - 12);
      for (let channel = 0; channel < theta.length; channel += 1) {
        plotContext.strokeStyle = COLORS[channel];
        plotContext.lineWidth = channel === theta.length - 1 ? 2 : 1;
        plotContext.beginPath();
        let started = false;
        for (const sample of samples) {
          if (sample.t < minimumTime || sample.values[channel] === undefined) continue;
          const x = left + ((sample.t - minimumTime) / 12) * chartWidth;
          const y = top + (1 - (sample.values[channel] + 1) / 2) * chartHeight;
          if (!started) { plotContext.moveTo(x, y);started = true; } else plotContext.lineTo(x, y);
        }
        plotContext.stroke();
      }
      plotContext.fillStyle = "rgba(233,226,203,.72)";
      plotContext.fillText("12 SECOND POSITION HISTORY  ·  x / total length", left, plotHeight - 10);
    };

    const setFromPointer = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      const { origin } = geometry();
      const x = event.clientX - box.left - origin.x;
      const y = event.clientY - box.top - origin.y;
      const angle = Math.atan2(x, Math.max(10, y));
      for (let index = 0; index < theta.length; index += 1) {
        theta[index] = angle + (index - (theta.length - 1) / 2) * 0.045;
        velocity[index] = 0;
        trails[index] = [];
      }
      samples = [];
      time = 0;
    };

    const pointerDown = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      const { points } = geometry();
      const bottom = points.at(-1);
      if (!bottom || Math.hypot(event.clientX - box.left - bottom.x, event.clientY - box.top - bottom.y) > 70) return;
      dragging = true;
      canvas.setPointerCapture(event.pointerId);
      setFromPointer(event);
    };
    const pointerMove = (event: PointerEvent) => { if (dragging) setFromPointer(event); };
    const pointerUp = (event: PointerEvent) => { dragging = false;if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); };

    const draw = () => {
      if (!pausedRef.current && !dragging) {
        for (let step = 0; step < 4; step += 1) integrate(1 / 240);
        if (frame % 2 === 0) {
          samples.push({ t: time, values: bottomPositions() });
          const threshold = time - 12.2;
          while (samples.length && samples[0].t < threshold) samples.shift();
        }
      }
      drawStage();
      drawPlot();
      if (frame % 12 === 0) {
        const positions = bottomPositions();
        setTelemetry({ angle: theta.at(-1) ?? 0, position: positions.at(-1) ?? 0, time });
      }
      frame += 1;
      animation = requestAnimationFrame(draw);
    };

    reset();
    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    animation = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
    };
  }, []);

  const chooseMode = (nextMode: Mode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
    setPaused(false);
    pausedRef.current = false;
    resetRef.current(nextMode);
  };
  const modeInfo = MODES.find((candidate) => candidate.id === mode) ?? MODES[1];

  return (
    <section className="pendulum-console">
      <div className="pendulum-views">
        <div className="pendulum-stage"><canvas ref={stageRef} aria-label="Interactive pendulum simulation. Drag the lowest glowing mass and release it." /></div>
        <div className="pendulum-plot"><canvas ref={plotRef} aria-label="Time series of each pendulum mass horizontal position over the last twelve seconds" /></div>
      </div>
      <aside className="pendulum-controls">
        <div className="pendulum-mode-tabs" role="tablist" aria-label="Pendulum model">
          {MODES.map((candidate) => <button type="button" role="tab" aria-selected={mode === candidate.id} className={mode === candidate.id ? "active" : ""} key={candidate.id} onClick={() => chooseMode(candidate.id)}>{candidate.label}</button>)}
        </div>
        <div className="pendulum-model-note"><span>Active model</span><strong>{modeInfo.label}</strong><p>{modeInfo.note}</p></div>
        <label className="pendulum-slider"><span>Segment length</span><output>{length.toFixed(2)} m</output><input type="range" min="0.4" max="1.6" step="0.01" value={length} onChange={(event) => { const value=Number(event.target.value);lengthRef.current=value;setLength(value);resetRef.current(); }} /></label>
        <label className="pendulum-slider"><span>Lowest mass</span><output>{mass.toFixed(2)} kg</output><input type="range" min="0.1" max="6" step="0.05" value={mass} onChange={(event) => { const value=Number(event.target.value);massRef.current=value;setMass(value);resetRef.current(); }} /></label>
        <div className="pendulum-actions"><button type="button" onClick={() => resetRef.current()}>Restart</button><button type="button" className={paused ? "active" : ""} onClick={() => { const next=!paused;pausedRef.current=next;setPaused(next); }}>{paused ? "Resume" : "Pause"}</button></div>
        <dl className="pendulum-readout"><div><dt>Bottom angle</dt><dd>{(telemetry.angle * 180 / Math.PI).toFixed(1)}°</dd></div><div><dt>Normalized x</dt><dd>{telemetry.position.toFixed(3)}</dd></div><div><dt>Run time</dt><dd>{telemetry.time.toFixed(1)} s</dd></div></dl>
        <p className="pendulum-physics-note">In the ideal single pendulum, mass cancels from the equation of motion. In the coupled models, the lowest-mass control changes how energy moves between links.</p>
      </aside>
    </section>
  );
}
