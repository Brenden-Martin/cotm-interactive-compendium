"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number; ox: number; oy: number };
type LabState = {
  cable: Point[]; leftLead: Point[]; rightLead: Point[];
  anchors: [Point, Point]; drag: 0 | 1 | null; w: number; h: number;
};

const makeChain = (a: Point, b: Point, count: number, sag = 0) =>
  Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * sag;
    return { x, y, ox: x, oy: y };
  });

export function CatenaryLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<LabState | null>(null);
  const [tab, setTab] = useState<"physical" | "analytic">("physical");
  const tabRef = useRef(tab);
  const [tension, setTension] = useState(54);
  const tensionRef = useRef(tension);
  const [gravity, setGravity] = useState(.34);
  const gravityRef = useRef(gravity);
  const [damping, setDamping] = useState(.985);
  const dampingRef = useRef(damping);
  const [showNodes, setShowNodes] = useState(true);

  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => { tensionRef.current = tension; }, [tension]);
  useEffect(() => { gravityRef.current = gravity; }, [gravity]);
  useEffect(() => { dampingRef.current = damping; }, [damping]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;

    const reset = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const a = { x: w * .22, y: h * .27, ox: w * .22, oy: h * .27 };
      const b = { x: w * .78, y: h * .35, ox: w * .78, oy: h * .35 };
      const leadA = { x: a.x, y: a.y + Math.min(230, h * .34), ox: a.x, oy: a.y + Math.min(230, h * .34) };
      const leadB = { x: b.x, y: b.y + Math.min(230, h * .34), ox: b.x, oy: b.y + Math.min(230, h * .34) };
      stateRef.current = {
        cable: makeChain(a, b, 46, h * .14),
        leftLead: makeChain(a, leadA, 12),
        rightLead: makeChain(b, leadB, 12),
        anchors: [a, b], drag: null, w, h,
      };
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      reset();
    };
    const verlet = (points: Point[]) => {
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        const vx = (p.x - p.ox) * dampingRef.current;
        const vy = (p.y - p.oy) * dampingRef.current;
        p.ox = p.x; p.oy = p.y;
        p.x += vx; p.y += vy + gravityRef.current;
      }
    };
    const constrain = (points: Point[], length: number, first: Point, last?: Point, passes = 6) => {
      for (let pass = 0; pass < passes; pass++) {
        points[0].x = first.x; points[0].y = first.y;
        if (last) {
          const end = points.at(-1)!; end.x = last.x; end.y = last.y;
        }
        for (let i = 0; i < points.length - 1; i++) {
          const p = points[i], q = points[i + 1];
          const dx = q.x - p.x, dy = q.y - p.y, dist = Math.hypot(dx, dy) || 1;
          const c = (dist - length) / dist * Math.min(1, tensionRef.current / 68);
          if (i > 0) { p.x += dx * c * .5; p.y += dy * c * .5; }
          if (!last || i < points.length - 2) { q.x -= dx * c * (i ? .5 : 1); q.y -= dy * c * (i ? .5 : 1); }
        }
      }
    };
    const simulate = (s: LabState) => {
      const [a, b] = s.anchors;
      const span = Math.hypot(b.x - a.x, b.y - a.y);
      const rest = span * (1.06 + (100 - tensionRef.current) * .0038) / 45;
      verlet(s.cable); verlet(s.leftLead); verlet(s.rightLead);
      constrain(s.cable, rest, a, b, 8);
      constrain(s.leftLead, 16, a, undefined, 7);
      constrain(s.rightLead, 16, b, undefined, 7);
    };
    const stroke = (points: Point[], width: number) => {
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
      for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.lineWidth = width; ctx.strokeStyle = "#22231f"; ctx.stroke();
    };
    const analytic = (s: LabState) => {
      const [a, b] = s.anchors, dx = b.x - a.x;
      const scale = Math.max(28, Math.abs(dx) * (.11 + (100 - tensionRef.current) * .0035));
      ctx.setLineDash([2, 9]); ctx.strokeStyle = "rgba(35,36,31,.22)"; ctx.lineWidth = 1;
      for (let i = 1; i < 7; i++) {
        const y = s.h * i / 7; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s.w, y); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const t = i / 240, x = a.x + dx * t;
        const base = a.y + (b.y - a.y) * t;
        const y = base + scale * .63 * (1 - (Math.cosh((t - .5) * dx / scale) - 1) / (Math.cosh(dx / (2 * scale)) - 1));
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 5; ctx.strokeStyle = "#de4938"; ctx.stroke();
      ctx.fillStyle = "#22231f"; ctx.font = "700 13px monospace";
      ctx.fillText("y = a cosh((x − h) / a) + k", 30, s.h - 42);
      ctx.font = "11px monospace";
      ctx.fillText(`a ≈ ${scale.toFixed(1)} px  ·  tension ${tensionRef.current}`, 30, s.h - 22);
    };
    const draw = () => {
      const s = stateRef.current;
      if (!s) return;
      if (tabRef.current === "physical") simulate(s);
      ctx.clearRect(0, 0, s.w, s.h);
      ctx.fillStyle = "#ece8d5"; ctx.fillRect(0, 0, s.w, s.h);
      if (tabRef.current === "physical") {
        stroke(s.leftLead, 4); stroke(s.rightLead, 4); stroke(s.cable, 5);
        if (showNodes) {
          ctx.fillStyle = "#de4938";
          for (const p of s.cable) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.7, 0, Math.PI * 2); ctx.fill(); }
        }
      } else analytic(s);
      s.anchors.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = i ? "#31aeb1" : "#e3cd36"; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = "#22231f"; ctx.stroke();
      });
      raf = requestAnimationFrame(draw);
    };
    const pointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      const s = stateRef.current; if (!s) return;
      const p = pointer(e);
      const hit = s.anchors.findIndex(a => Math.hypot(a.x - p.x, a.y - p.y) < 34);
      if (hit >= 0) { s.drag = hit as 0 | 1; canvas.setPointerCapture(e.pointerId); }
    };
    const move = (e: PointerEvent) => {
      const s = stateRef.current; if (!s || s.drag === null) return;
      const p = pointer(e), a = s.anchors[s.drag];
      a.x = Math.max(28, Math.min(s.w - 28, p.x));
      a.y = Math.max(60, Math.min(s.h - 100, p.y)); a.ox = a.x; a.oy = a.y;
    };
    const up = () => { if (stateRef.current) stateRef.current.drag = null; };
    resize(); addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf); removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
    };
  }, [showNodes]);

  return (
    <main className="catenary-page">
      <header className="catenary-header">
        <Link className="back" href="/gallery">Gallery</Link>
        <div><span className="eyebrow">Interactive Exhibit 06</span><h1>Catenary Lab</h1></div>
        <span className="folio">SPRING / COSH</span>
      </header>
      <section className="catenary-console">
        <nav className="catenary-tabs" aria-label="Catenary views">
          <button className={tab === "physical" ? "active" : ""} onClick={() => setTab("physical")}>01 / Spring chain</button>
          <button className={tab === "analytic" ? "active" : ""} onClick={() => setTab("analytic")}>02 / Closed form</button>
        </nav>
        <div className="catenary-stage">
          <canvas ref={canvasRef} className="catenary-canvas" />
          <p className="catenary-instruction">{tab === "physical" ? "Drag either colored jack. The loose TRS leads swing with every move." : "The same boundary conditions, expressed as a hyperbolic cosine."}</p>
        </div>
        <aside className="catenary-controls">
          <div className="catenary-readout"><b>{tab === "physical" ? "EMERGENT" : "ANALYTIC"}</b><span>{tab === "physical" ? "Newton + Hooke" : "y = a cosh(x/a)"}</span></div>
          <label><span>Tension</span><output>{tension}</output><input aria-label="Tension" type="range" min="15" max="100" value={tension} onChange={e => setTension(+e.target.value)} /></label>
          <label><span>Gravity</span><output>{gravity.toFixed(2)}</output><input aria-label="Gravity" type="range" min=".05" max=".9" step=".01" value={gravity} onChange={e => setGravity(+e.target.value)} /></label>
          <label><span>Damping</span><output>{damping.toFixed(3)}</output><input aria-label="Damping" type="range" min=".94" max=".999" step=".001" value={damping} onChange={e => setDamping(+e.target.value)} /></label>
          <button className={showNodes ? "active" : ""} onClick={() => setShowNodes(v => !v)}>Mass nodes {showNodes ? "on" : "off"}</button>
          <p>Distributed weight pulls every mass downward. Neighboring spring forces settle the chain into the familiar catenary.</p>
        </aside>
      </section>
    </main>
  );
}
