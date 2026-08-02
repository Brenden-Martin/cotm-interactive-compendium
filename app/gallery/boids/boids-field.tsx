"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Boid = { x: number; y: number; vx: number; vy: number; scale: number };
type Cloud = { x: number; y: number; scale: number; speed: number };
type FlockParameters = {
  alignment: number;
  cohesion: number;
  separation: number;
  perception: number;
  speed: number;
  cursorPressure: number;
};

const DEFAULTS = {
  alignment: 1.15,
  cohesion: .82,
  separation: 1.55,
  perception: 74,
  speed: 2.65,
  cursorPressure: 1.15,
  count: 180,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function BoidSlider({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const decimals = step < .1 ? 2 : step < 1 ? 1 : 0;
  return (
    <label className="boids-slider">
      <span>{label}</span>
      <output>{value.toFixed(decimals)}</output>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function BoidsField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boidsRef = useRef<Boid[]>([]);
  const frameRef = useRef(0);
  const boundsRef = useRef({ width: 1280, height: 720 });
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const cloudsRef = useRef<Cloud[]>([
    { x: .14, y: .23, scale: 1.05, speed: .75 },
    { x: .47, y: .12, scale: .68, speed: .46 },
    { x: .75, y: .31, scale: 1.28, speed: .58 },
    { x: .94, y: .66, scale: .82, speed: .38 },
    { x: .33, y: .76, scale: .92, speed: .52 },
  ]);
  const paramsRef = useRef<FlockParameters>({
    alignment: DEFAULTS.alignment,
    cohesion: DEFAULTS.cohesion,
    separation: DEFAULTS.separation,
    perception: DEFAULTS.perception,
    speed: DEFAULTS.speed,
    cursorPressure: DEFAULTS.cursorPressure,
  });
  const pausedRef = useRef(false);
  const [alignment, setAlignment] = useState(DEFAULTS.alignment);
  const [cohesion, setCohesion] = useState(DEFAULTS.cohesion);
  const [separation, setSeparation] = useState(DEFAULTS.separation);
  const [perception, setPerception] = useState(DEFAULTS.perception);
  const [speed, setSpeed] = useState(DEFAULTS.speed);
  const [cursorPressure, setCursorPressure] = useState(DEFAULTS.cursorPressure);
  const [flockSize, setFlockSize] = useState(DEFAULTS.count);
  const [activeCount, setActiveCount] = useState(DEFAULTS.count);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    paramsRef.current = { alignment, cohesion, separation, perception, speed, cursorPressure };
  }, [alignment, cohesion, cursorPressure, perception, separation, speed]);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const seed = useCallback((count: number) => {
    const { width, height } = boundsRef.current;
    const centerX = width * (.35 + Math.random() * .3);
    const centerY = height * (.33 + Math.random() * .34);
    boidsRef.current = Array.from({ length: count }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.sqrt(Math.random()) * Math.min(width, height) * .3;
      const heading = angle + (Math.random() - .5) * .9;
      return {
        x: (centerX + Math.cos(angle) * spread + width) % width,
        y: (centerY + Math.sin(angle) * spread + height) % height,
        vx: Math.cos(heading) * DEFAULTS.speed,
        vy: Math.sin(heading) * DEFAULTS.speed,
        scale: .72 + (index % 7) * .065,
      };
    });
  }, []);

  const resetFlock = () => {
    const nextCount = clamp(Math.round(flockSize), 24, 420);
    setActiveCount(nextCount);
    seed(nextCount);
  };

  const scatter = () => {
    boidsRef.current = boidsRef.current.map((boid) => {
      const angle = Math.random() * Math.PI * 2;
      const impulse = 2.5 + Math.random() * 4;
      return {
        ...boid,
        vx: boid.vx + Math.cos(angle) * impulse,
        vy: boid.vy + Math.sin(angle) * impulse,
      };
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let lastTime = performance.now();

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      boundsRef.current = { width, height };
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
    };

    const positionPointer = (event: PointerEvent) => {
      pointerRef.current.x = event.clientX;
      pointerRef.current.y = event.clientY;
      pointerRef.current.active = true;
    };
    const leavePointer = () => { pointerRef.current.active = false; };

    const drawCloud = (x: number, y: number, scale: number) => {
      const circles = [
        { x: -44, y: 8, r: 28 },
        { x: -18, y: -7, r: 38 },
        { x: 20, y: -14, r: 48 },
        { x: 55, y: 2, r: 34 },
        { x: 4, y: 15, r: 44 },
      ];
      context.fillStyle = "#ffffff";
      for (const circle of circles) {
        context.beginPath();
        context.arc(x + circle.x * scale, y + circle.y * scale, circle.r * scale, 0, Math.PI * 2);
        context.fill();
      }
    };

    const update = (frameScale: number) => {
      const boids = boidsRef.current;
      const { width, height } = boundsRef.current;
      const params = paramsRef.current;
      const cellSize = Math.max(20, params.perception);
      const grid = new Map<string, number[]>();
      const cellColumns = Math.max(1, Math.ceil(width / cellSize));
      const cellRows = Math.max(1, Math.ceil(height / cellSize));

      boids.forEach((boid, index) => {
        const cellX = Math.floor(boid.x / cellSize);
        const cellY = Math.floor(boid.y / cellSize);
        const key = `${cellX},${cellY}`;
        const bucket = grid.get(key);
        if (bucket) bucket.push(index); else grid.set(key, [index]);
      });

      const accelerations = boids.map(() => ({ x: 0, y: 0 }));
      const perceptionSquared = params.perception * params.perception;
      const separationRadius = params.perception * .48;
      const separationSquared = separationRadius * separationRadius;

      boids.forEach((boid, index) => {
        const cellX = Math.floor(boid.x / cellSize);
        const cellY = Math.floor(boid.y / cellSize);
        let neighbors = 0;
        let alignmentX = 0;
        let alignmentY = 0;
        let cohesionX = 0;
        let cohesionY = 0;
        let separationX = 0;
        let separationY = 0;

        for (let offsetX = -1; offsetX <= 1; offsetX++) {
          for (let offsetY = -1; offsetY <= 1; offsetY++) {
            const wrappedX = (cellX + offsetX + cellColumns) % cellColumns;
            const wrappedY = (cellY + offsetY + cellRows) % cellRows;
            const bucket = grid.get(`${wrappedX},${wrappedY}`);
            if (!bucket) continue;
            for (const otherIndex of bucket) {
              if (otherIndex === index) continue;
              const other = boids[otherIndex];
              let dx = other.x - boid.x;
              let dy = other.y - boid.y;
              if (dx > width / 2) dx -= width;
              else if (dx < -width / 2) dx += width;
              if (dy > height / 2) dy -= height;
              else if (dy < -height / 2) dy += height;
              const distanceSquared = dx * dx + dy * dy;
              if (distanceSquared <= .0001 || distanceSquared > perceptionSquared) continue;
              neighbors++;
              alignmentX += other.vx;
              alignmentY += other.vy;
              cohesionX += dx;
              cohesionY += dy;
              if (distanceSquared < separationSquared) {
                separationX -= dx / distanceSquared;
                separationY -= dy / distanceSquared;
              }
            }
          }
        }

        if (neighbors > 0) {
          alignmentX /= neighbors;
          alignmentY /= neighbors;
          cohesionX /= neighbors;
          cohesionY /= neighbors;
          accelerations[index].x += (alignmentX - boid.vx) * params.alignment * .018;
          accelerations[index].y += (alignmentY - boid.vy) * params.alignment * .018;
          accelerations[index].x += cohesionX * params.cohesion * .00052;
          accelerations[index].y += cohesionY * params.cohesion * .00052;
          accelerations[index].x += separationX * params.separation * 1.7;
          accelerations[index].y += separationY * params.separation * 1.7;
        }

        const pointer = pointerRef.current;
        if (pointer.active && params.cursorPressure > 0) {
          const dx = pointer.x - boid.x;
          const dy = pointer.y - boid.y;
          const distanceSquared = dx * dx + dy * dy;
          const cursorRadius = 150;
          if (distanceSquared > .01 && distanceSquared < cursorRadius * cursorRadius) {
            const distance = Math.sqrt(distanceSquared);
            const pressure = (1 - distance / cursorRadius) * params.cursorPressure;
            accelerations[index].x -= dx / distance * pressure * .34;
            accelerations[index].y -= dy / distance * pressure * .34;
          }
        }
      });

      boids.forEach((boid, index) => {
        boid.vx += accelerations[index].x * frameScale;
        boid.vy += accelerations[index].y * frameScale;
        const magnitude = Math.hypot(boid.vx, boid.vy) || 1;
        const targetSpeed = params.speed;
        const easedSpeed = magnitude + (targetSpeed - magnitude) * .055 * frameScale;
        const limitedSpeed = clamp(easedSpeed, targetSpeed * .55, targetSpeed * 1.4);
        boid.vx = boid.vx / magnitude * limitedSpeed;
        boid.vy = boid.vy / magnitude * limitedSpeed;
        boid.x = (boid.x + boid.vx * frameScale + width) % width;
        boid.y = (boid.y + boid.vy * frameScale + height) % height;
      });
    };

    const draw = (now: number) => {
      const { width, height } = boundsRef.current;
      const delta = Math.min(34, now - lastTime);
      lastTime = now;
      const frameScale = delta / (1000 / 60);
      if (!pausedRef.current) update(frameScale);

      context.fillStyle = "#a9ddf2";
      context.fillRect(0, 0, width, height);
      cloudsRef.current.forEach((cloud, index) => {
        const travel = (now * .000006 * cloud.speed + cloud.x + index * .04) % 1.24;
        const x = (travel - .12) * width;
        drawCloud(x, cloud.y * height, cloud.scale * clamp(width / 1200, .68, 1.2));
      });

      context.fillStyle = "#050505";
      for (const boid of boidsRef.current) {
        const angle = Math.atan2(boid.vy, boid.vx);
        const size = 8.2 * boid.scale;
        context.save();
        context.translate(Math.round(boid.x), Math.round(boid.y));
        context.rotate(angle);
        context.beginPath();
        context.moveTo(size * 1.35, 0);
        context.lineTo(-size, size * .63);
        context.lineTo(-size * .53, 0);
        context.lineTo(-size, -size * .63);
        context.closePath();
        context.fill();
        context.restore();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    seed(DEFAULTS.count);
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", positionPointer);
    canvas.addEventListener("pointerdown", positionPointer);
    canvas.addEventListener("pointerleave", leavePointer);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", positionPointer);
      canvas.removeEventListener("pointerdown", positionPointer);
      canvas.removeEventListener("pointerleave", leavePointer);
    };
  }, [seed]);

  return (
    <main className="boids-page">
      <canvas ref={canvasRef} className="boids-canvas" aria-label="A live flock of black triangular boids flying through a blue sky. Move the pointer through the flock to part it." />
      <header className="boids-chrome">
        <Link href="/gallery">← Gallery</Link>
        <span className="eyebrow">Interactive Exhibit 15</span>
        <h1>Boids</h1>
        <p>Alignment, cohesion, and separation turn a crowd of simple agents into something that looks remarkably alive. Move through the sky to part the flock.</p>
      </header>
      <aside className="boids-controls" aria-label="Boids flight controls">
        <div className="boids-control-head"><strong>Flight computer</strong><span>{activeCount} agents / sky wrap</span></div>
        <BoidSlider label="Alignment" value={alignment} min={0} max={3} step={.05} onChange={setAlignment} />
        <BoidSlider label="Cohesion" value={cohesion} min={0} max={3} step={.05} onChange={setCohesion} />
        <BoidSlider label="Separation" value={separation} min={0} max={4} step={.05} onChange={setSeparation} />
        <BoidSlider label="Neighborhood" value={perception} min={24} max={160} step={1} onChange={setPerception} />
        <BoidSlider label="Cruise speed" value={speed} min={.4} max={6} step={.05} onChange={setSpeed} />
        <BoidSlider label="Cursor pressure" value={cursorPressure} min={0} max={4} step={.05} onChange={setCursorPressure} />
        <label className="boids-slider">
          <span>Flock size · reset</span><output>{flockSize}</output>
          <input type="range" min="24" max="420" step="4" value={flockSize} onChange={(event) => setFlockSize(Number(event.target.value))} />
        </label>
        <div className="boids-actions">
          <button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button>
          <button onClick={scatter}>Scatter</button>
          <button onClick={resetFlock}>Reset flock</button>
        </div>
        <p>Each triangle knows only its neighbors. The apparent flock is the rule set, repeated.</p>
      </aside>
    </main>
  );
}
