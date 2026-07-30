"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Body = { name: string; color: string; mass: number; x: number; y: number; vx: number; vy: number };
type Axis = "x" | "y" | "vx" | "vy" | "mass";

const palette = [
  { name: "Yellow", color: "#f7e700" },
  { name: "Cyan", color: "#20d7d7" },
  { name: "Sienna", color: "#c15b31" },
];

const presets: Record<2 | 3, Body[]> = {
  2: [
    { ...palette[0], mass: 900, x: -120, y: 0, vx: 0, vy: -1.15 },
    { ...palette[1], mass: 900, x: 120, y: 0, vx: 0, vy: 1.15 },
  ],
  3: [
    { ...palette[0], mass: 700, x: -120, y: 10, vx: 0.18, vy: -1.05 },
    { ...palette[1], mass: 700, x: 120, y: 10, vx: -0.18, vy: 1.05 },
    { ...palette[2], mass: 520, x: 0, y: -145, vx: 1.12, vy: 0 },
  ],
};

const clonePreset = (count: 2 | 3) => presets[count].map((body) => ({ ...body }));

export function GravitySim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodiesRef = useRef<Body[]>(clonePreset(3));
  const initialRef = useRef<Body[]>(clonePreset(3));
  const trailsRef = useRef<Array<Array<{ x: number; y: number }>>>([[], [], []]);
  const frameRef = useRef(0);
  const lastRef = useRef(0);
  const dragRef = useRef<number | null>(null);
  const [count, setCount] = useState<2 | 3>(3);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [drafts, setDrafts] = useState<Body[]>(clonePreset(3));

  const reset = useCallback((nextCount = count, nextBodies?: Body[]) => {
    const changingMode = nextCount !== count;
    const source = (nextBodies ?? (changingMode ? clonePreset(nextCount) : initialRef.current))
      .slice(0, nextCount)
      .map((body) => ({ ...body }));
    if (nextBodies || changingMode) initialRef.current = source.map((body) => ({ ...body }));
    bodiesRef.current = source;
    trailsRef.current = source.map(() => []);
    setDrafts(source.map((body) => ({ ...body })));
  }, [count]);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0;
    let height = 0;
    let scale = 1;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const box = canvas.getBoundingClientRect();
      width = box.width;
      height = box.height;
      scale = Math.min(width / 700, height / 600);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const toScreen = (body: { x: number; y: number }) => ({
      x: width / 2 + body.x * scale,
      y: height / 2 + body.y * scale,
    });
    const toWorld = (x: number, y: number) => ({
      x: (x - width / 2) / scale,
      y: (y - height / 2) / scale,
    });

    const down = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const found = bodiesRef.current.findIndex((body) => {
        const p = toScreen(body);
        return Math.hypot(x - p.x, y - p.y) < Math.max(22, Math.sqrt(body.mass) * .8);
      });
      if (found >= 0) {
        dragRef.current = found;
        canvas.setPointerCapture(event.pointerId);
      }
    };
    const move = (event: PointerEvent) => {
      if (dragRef.current === null) return;
      const rect = canvas.getBoundingClientRect();
      const p = toWorld(event.clientX - rect.left, event.clientY - rect.top);
      const body = bodiesRef.current[dragRef.current];
      body.x = p.x;
      body.y = p.y;
      trailsRef.current[dragRef.current] = [];
    };
    const up = () => {
      if (dragRef.current !== null) setDrafts(bodiesRef.current.map((body) => ({ ...body })));
      dragRef.current = null;
    };

    const step = (dt: number) => {
      const bodies = bodiesRef.current;
      const accelerations = bodies.map(() => ({ x: 0, y: 0 }));
      const G = .7;
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const dx = bodies[j].x - bodies[i].x;
          const dy = bodies[j].y - bodies[i].y;
          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          accelerations[i].x += (G * bodies[j].mass / distSq) * nx;
          accelerations[i].y += (G * bodies[j].mass / distSq) * ny;
          accelerations[j].x -= (G * bodies[i].mass / distSq) * nx;
          accelerations[j].y -= (G * bodies[i].mass / distSq) * ny;
        }
      }
      bodies.forEach((body, index) => {
        if (dragRef.current === index) return;
        body.vx += accelerations[index].x * dt;
        body.vy += accelerations[index].y * dt;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        const trail = trailsRef.current[index];
        trail.push({ x: body.x, y: body.y });
        if (trail.length > 220) trail.shift();
      });
    };

    const draw = (time: number) => {
      const elapsed = Math.min(2, Math.max(.35, (time - lastRef.current) / 16.667 || 1));
      lastRef.current = time;
      if (!pausedRef.current) {
        for (let sub = 0; sub < 3; sub++) step(elapsed / 3);
      }
      ctx.fillStyle = "#111820";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(255,255,255,.045)";
      ctx.lineWidth = 1;
      for (let x = width / 2 % 40; x < width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = height / 2 % 40; y < height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
      bodiesRef.current.forEach((body, index) => {
        const trail = trailsRef.current[index];
        if (trail.length > 1) {
          ctx.beginPath();
          trail.forEach((point, trailIndex) => {
            const p = toScreen(point);
            if (trailIndex === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          });
          ctx.strokeStyle = `${body.color}78`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        const p = toScreen(body);
        const radius = Math.max(10, Math.min(24, Math.sqrt(body.mass) * .55));
        const glow = ctx.createRadialGradient(p.x, p.y, radius * .4, p.x, p.y, radius * 2.2);
        glow.addColorStop(0, `${body.color}bb`);
        glow.addColorStop(1, `${body.color}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = body.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  const chooseCount = (nextCount: 2 | 3) => {
    setCount(nextCount);
    reset(nextCount);
  };
  const changeDraft = (index: number, axis: Axis, value: string) => {
    const number = Number(value);
    setDrafts((current) => current.map((body, bodyIndex) => bodyIndex === index ? { ...body, [axis]: Number.isFinite(number) ? number : 0 } : body));
  };
  const nudge = (index: number, dx: number, dy: number) => {
    const body = bodiesRef.current[index];
    body.vx += dx;
    body.vy += dy;
    setDrafts(bodiesRef.current.map((item) => ({ ...item })));
  };

  return (
    <section className="gravity-lab">
      <div className="gravity-stage">
        <canvas ref={canvasRef} className="gravity-canvas" aria-label={`Interactive ${count}-body gravity simulation. Drag a mass to perturb it.`} />
        <div className="stage-note"><b>LIVE FIELD</b><span>Drag any mass to perturb its orbit</span></div>
      </div>
      <aside className="gravity-controls">
        <div className="control-block">
          <span className="control-label">Number of bodies</span>
          <div className="segmented">
            <button className={count === 2 ? "active" : ""} onClick={() => chooseCount(2)}>Two</button>
            <button className={count === 3 ? "active" : ""} onClick={() => chooseCount(3)}>Three</button>
          </div>
        </div>
        <div className="transport">
          <button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button>
          <button onClick={() => reset()}>Restart</button>
        </div>
        <div className="control-block initial-block">
          <span className="control-label">Initial conditions</span>
          {drafts.slice(0, count).map((body, index) => (
            <details key={body.name} open={index === 0}>
              <summary><i style={{ background: body.color }} />Body {index + 1} · {body.name}</summary>
              <div className="condition-grid">
                {(["mass", "x", "y", "vx", "vy"] as Axis[]).map((axis) => (
                  <label key={axis}><span>{axis}</span><input type="number" step={axis === "mass" ? 10 : .1} value={Number(drafts[index][axis].toFixed(2))} onChange={(event) => changeDraft(index, axis, event.target.value)} /></label>
                ))}
              </div>
              <div className="nudge-row">
                <span>Orbital nudge</span>
                <button aria-label={`Nudge ${body.name} left`} onClick={() => nudge(index, -.12, 0)}>←</button>
                <button aria-label={`Nudge ${body.name} up`} onClick={() => nudge(index, 0, -.12)}>↑</button>
                <button aria-label={`Nudge ${body.name} down`} onClick={() => nudge(index, 0, .12)}>↓</button>
                <button aria-label={`Nudge ${body.name} right`} onClick={() => nudge(index, .12, 0)}>→</button>
              </div>
            </details>
          ))}
          <button className="apply-button" onClick={() => reset(count, drafts)}>Apply &amp; restart</button>
        </div>
      </aside>
    </section>
  );
}
