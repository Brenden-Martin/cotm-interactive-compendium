"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Params = { ix: number; iz: number; coupling: number; wx: number; wy: number; wz: number; speed: number };
type V3 = [number, number, number];
type Q4 = [number, number, number, number];

const rotate = (q: Q4, v: V3): V3 => {
  const [w, x, y, z] = q, [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + y * tz - z * ty, vy + w * ty + z * tx - x * tz, vz + w * tz + x * ty - y * tx];
};

export function RotatingRings() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef<Params>({ ix: 1, iz: 1.8, coupling: .08, wx: .35, wy: .04, wz: 2.1, speed: 1 });
  const [params, setParams] = useState(paramsRef.current);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [trail, setTrail] = useState(true);
  const trailRef = useRef(true);
  const resetRef = useRef(0);

  const update = (key: keyof Params, value: number) => {
    const next = { ...paramsRef.current, [key]: value };
    paramsRef.current = next; setParams(next);
  };
  const reset = () => { resetRef.current++; };
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { trailRef.current = trail; }, [trail]);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 0, h = 0, raf = 0, last = performance.now(), resetSeen = -1;
    let q: Q4 = [1, 0, 0, 0], omega: V3 = [0, 0, 0], path: Array<[number, number]> = [];
    let yaw = -.55, pitch = .42, dragging = false, px = 0, py = 0;
    const history: V3[] = [];
    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2); w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const project = (v: V3): [number, number, number] => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const x1 = cy * v[0] + sy * v[2], z1 = -sy * v[0] + cy * v[2];
      const y1 = cp * v[1] - sp * z1, z2 = sp * v[1] + cp * z1;
      const scale = Math.min(w, h) * .25 * (3.7 / (3.7 + z2));
      return [w * .5 + x1 * scale, h * .47 + y1 * scale, z2];
    };
    const restart = () => {
      const p = paramsRef.current; omega = [p.wx, p.wy, p.wz]; q = [1, 0, 0, 0]; path = []; history.length = 0; resetSeen = resetRef.current;
    };
    const step = (dt: number) => {
      const p = paramsRef.current, [wx, wy, wz] = omega;
      const ix = p.ix, iy = p.ix * 1.03, iz = p.iz;
      const c = p.coupling;
      omega = [
        wx + (((iy - iz) / ix) * wy * wz + c * wz * wz * .08) * dt,
        wy + (((iz - ix) / iy) * wz * wx - c * wz * wz * .055) * dt,
        wz + (((ix - iy) / iz) * wx * wy - c * wx * wz * .03) * dt,
      ];
      const mag = Math.hypot(...omega);
      if (mag > 8) omega = omega.map(v => v * 8 / mag) as V3;
      const [qw, qx, qy, qz] = q, [a, b, c2] = omega;
      q = [
        qw + (-qx * a - qy * b - qz * c2) * dt * .5,
        qx + (qw * a + qy * c2 - qz * b) * dt * .5,
        qy + (qw * b + qz * a - qx * c2) * dt * .5,
        qz + (qw * c2 + qx * b - qy * a) * dt * .5,
      ];
      const n = Math.hypot(...q); q = q.map(v => v / n) as Q4;
      history.push([...omega]); if (history.length > 150) history.shift();
    };
    const line3 = (a: V3, b: V3, color: string, width = 1) => {
      const p1 = project(a), p2 = project(b); ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    };
    const draw = (now: number) => {
      if (resetSeen !== resetRef.current) restart();
      const dt = Math.min(.025, (now - last) / 1000) * paramsRef.current.speed; last = now;
      if (!pausedRef.current) for (let i = 0; i < 3; i++) step(dt / 3);
      ctx.fillStyle = "#07121b"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(139,225,255,.1)"; ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) { line3([-2, i * .35, 0], [2, i * .35, 0], "rgba(139,225,255,.09)"); line3([i * .35, -2, 0], [i * .35, 2, 0], "rgba(139,225,255,.09)"); }
      const ring = Array.from({ length: 121 }, (_, i) => rotate(q, [Math.cos(i / 120 * Math.PI * 2) * 1.35, Math.sin(i / 120 * Math.PI * 2) * 1.35, 0] as V3));
      const normal = rotate(q, [0, 0, 1]);
      const tip = project([normal[0] * 1.8, normal[1] * 1.8, normal[2] * 1.8]);
      if (trailRef.current) { path.push([tip[0], tip[1]]); if (path.length > 420) path.shift(); }
      else path = [];
      if (path.length > 1) {
        ctx.beginPath(); path.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
        ctx.strokeStyle = "rgba(244,99,72,.55)"; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.beginPath(); ring.forEach((v, i) => { const p = project(v); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
      ctx.closePath(); ctx.strokeStyle = "#e7f3e8"; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = "#45c9cc"; ctx.lineWidth = 2; ctx.stroke();
      line3([0, 0, 0], [normal[0] * 1.8, normal[1] * 1.8, normal[2] * 1.8], "#f46348", 3);
      const marker = project(rotate(q, [1.35, 0, 0])); ctx.beginPath(); ctx.arc(marker[0], marker[1], 8, 0, Math.PI * 2); ctx.fillStyle = "#f2d83d"; ctx.fill();
      const ox = 24, oy = h - 108, gw = Math.min(280, w * .35), gh = 70;
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.strokeRect(ox, oy, gw, gh);
      const colors = ["#f46348", "#45c9cc", "#f2d83d"];
      colors.forEach((color, component) => {
        ctx.beginPath(); history.forEach((v, i) => {
          const x = ox + i / 149 * gw, y = oy + gh / 2 - v[component] * 13;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
      });
      ctx.fillStyle = "#e7f3e8"; ctx.font = "700 10px monospace"; ctx.fillText("ωx / ωy / ωz", ox, oy - 8);
      raf = requestAnimationFrame(draw);
    };
    const down = (e: PointerEvent) => { dragging = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!dragging) return; yaw += (e.clientX - px) * .008; pitch += (e.clientY - py) * .008; px = e.clientX; py = e.clientY; };
    const up = () => { dragging = false; };
    resize(); restart(); addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); };
  }, []);

  const sliders: Array<[keyof Params, string, number, number, number]> = [
    ["ix", "Equatorial inertia", .25, 3, .01], ["iz", "Axial inertia", .25, 3, .01],
    ["coupling", "EM coupling", 0, .6, .005], ["wx", "Initial ωx", -3, 3, .01],
    ["wy", "Initial ωy", -3, 3, .01], ["wz", "Initial ωz", -4, 4, .01], ["speed", "Time scale", .1, 3, .05],
  ];
  return (
    <main className="rings-page">
      <header className="rings-header"><Link className="back" href="/gallery">Gallery</Link><div><span className="eyebrow">Interactive Exhibit 07 · IPT</span><h1>Rotating Rings</h1></div><span className="folio">Iω̇ = −ω × Iω</span></header>
      <section className="rings-lab">
        <div className="rings-stage"><canvas ref={canvasRef} className="rings-canvas" /><p>Drag the field to orbit the camera. The red trace follows the ring normal.</p></div>
        <aside className="rings-controls">
          <div className="rings-transport"><button onClick={() => setPaused(v => !v)}>{paused ? "Resume" : "Pause"}</button><button onClick={reset}>Restart</button></div>
          {sliders.map(([key, label, min, max, step]) => <label key={key}><span>{label}</span><output>{params[key].toFixed(2)}</output><input aria-label={label} type="range" min={min} max={max} step={step} value={params[key]} onChange={e => update(key, +e.target.value)} /></label>)}
          <button className={`rings-toggle ${trail ? "active" : ""}`} onClick={() => setTrail(v => !v)}>Wobble trail {trail ? "on" : "off"}</button>
          <p>Unequal moments of inertia trade angular velocity between the body axes. Coupling makes the effective inertia depend on the spin, pushing the ring away from ideal torque-free motion.</p>
        </aside>
      </section>
    </main>
  );
}
