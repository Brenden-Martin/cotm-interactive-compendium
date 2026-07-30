"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Waveform = "sine" | "triangle" | "saw" | "square";
type Point = { x: number; y: number };

const wave = (type: Waveform, phase: number) => {
  const cycle = ((phase / (Math.PI * 2)) % 1 + 1) % 1;
  if (type === "triangle") return 1 - 4 * Math.abs(cycle - .5);
  if (type === "saw") return 2 * cycle - 1;
  if (type === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  return Math.sin(phase);
};

function Knob({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const angle = -135 + (value - min) / (max - min) * 270;
  return (
    <label className="scope-knob">
      <span className="knob-dial" style={{ transform: `rotate(${angle}deg)` }}><i /></span>
      <b>{label}</b>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <output>{Number(value.toFixed(2))}</output>
    </label>
  );
}

export function LissajousScope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef({ fx: 3, fy: 2, phase: Math.PI / 2, scale: .78, persistence: 520, speed: .9, xWave: "sine" as Waveform, yWave: "sine" as Waveform });
  const [fx, setFx] = useState(3);
  const [fy, setFy] = useState(2);
  const [phase, setPhase] = useState(90);
  const [scale, setScale] = useState(.78);
  const [persistence, setPersistence] = useState(520);
  const [speed, setSpeed] = useState(.9);
  const [xWave, setXWave] = useState<Waveform>("sine");
  const [yWave, setYWave] = useState<Waveform>("sine");

  useEffect(() => {
    paramsRef.current = { fx, fy, phase: phase / 180 * Math.PI, scale, persistence, speed, xWave, yWave };
  }, [fx, fy, phase, scale, persistence, speed, xWave, yWave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let time = 0;
    let frame = 0;
    const trail: Point[] = [];

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = () => {
      const params = paramsRef.current;
      time += .018 * params.speed;
      const radius = Math.min(width, height) * .43 * params.scale;
      const point = {
        x: width / 2 + wave(params.xWave, time * params.fx + params.phase) * radius,
        y: height / 2 + wave(params.yWave, time * params.fy) * radius,
      };
      trail.push(point);
      while (trail.length > params.persistence) trail.shift();
      ctx.fillStyle = "#082d2a";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(90,155,135,.14)";
      ctx.lineWidth = 1;
      for (let index = 1; index < 8; index++) {
        const offset = index / 8;
        ctx.beginPath(); ctx.moveTo(width * offset, 0); ctx.lineTo(width * offset, height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, height * offset); ctx.lineTo(width, height * offset); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.strokeStyle = "rgba(150,220,190,.26)"; ctx.stroke();
      for (let index = 1; index < trail.length; index++) {
        const opacity = Math.pow(index / trail.length, 2) * .72;
        ctx.beginPath(); ctx.moveTo(trail[index - 1].x, trail[index - 1].y); ctx.lineTo(trail[index].x, trail[index].y);
        ctx.strokeStyle = `rgba(171,255,195,${opacity})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 14);
      glow.addColorStop(0, "rgba(224,255,208,1)");
      glow.addColorStop(.3, "rgba(170,255,190,.8)");
      glow.addColorStop(1, "rgba(170,255,190,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(point.x, point.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e0ffd0"; ctx.beginPath(); ctx.arc(point.x, point.y, 2.4, 0, Math.PI * 2); ctx.fill();
      frame = requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <main className="scope-page">
      <header className="scope-header"><Link className="back" href="/gallery">Gallery</Link><div><span className="eyebrow">Interactive Exhibit 05 · Harmonic Motion</span><h1>Lissajous Scope</h1></div><span className="scope-model">COTM · TYPE 502</span></header>
      <section className="scope-console">
        <div className="scope-bezel"><div className="scope-screen"><canvas ref={canvasRef} className="scope-canvas" /></div><span className="scope-mark">PHOSPHOR DISPLAY</span></div>
        <aside className="scope-controls">
          <div className="wave-selects">
            <label><span>X waveform</span><select value={xWave} onChange={(event) => setXWave(event.target.value as Waveform)}>{["sine","triangle","saw","square"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>Y waveform</span><select value={yWave} onChange={(event) => setYWave(event.target.value as Waveform)}>{["sine","triangle","saw","square"].map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          <div className="scope-knob-grid">
            <Knob label="X FREQ" value={fx} min={1} max={12} step={1} onChange={setFx} />
            <Knob label="Y FREQ" value={fy} min={1} max={12} step={1} onChange={setFy} />
            <Knob label="PHASE" value={phase} min={0} max={360} step={1} onChange={setPhase} />
            <Knob label="SCALE" value={scale} min={.2} max={1} step={.01} onChange={setScale} />
            <Knob label="TRACE" value={persistence} min={60} max={1400} step={10} onChange={setPersistence} />
            <Knob label="RATE" value={speed} min={.1} max={3} step={.05} onChange={setSpeed} />
          </div>
          <div className="scope-readout"><span>X:Y</span><b>{fx}:{fy}</b><i /></div>
        </aside>
      </section>
    </main>
  );
}
