"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Sheet = { x: number; y: number; angle: number; spacing: number };

export function MoireField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ kind: "linear" | "rings"; dx: number; dy: number } | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [foreground, setForeground] = useState("#ffffff");
  const [background, setBackground] = useState("#000000");
  const [linear, setLinear] = useState<Sheet>({ x: 58, y: 54, angle: 7, spacing: 7 });
  const [rings, setRings] = useState<Sheet>({ x: 72, y: 35, angle: 0, spacing: 8 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const random = (() => {
      let value = seed || 1;
      return () => {
        value = (value * 1664525 + 1013904223) % 4294967296;
        return value / 4294967296;
      };
    })();
    const layers = Array.from({ length: 9 }, (_, index) => ({
      type: index % 3 === 0 ? "rings" : "lines",
      x: random() * width,
      y: random() * height,
      angle: random() * Math.PI,
      spacing: 7 + Math.floor(random() * 15),
      phase: random() * 20,
      weight: random() > .7 ? 2 : 1,
    }));
    const draw = () => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = foreground;
      ctx.globalAlpha = .78;
      layers.forEach((layer) => {
        ctx.save();
        ctx.lineWidth = layer.weight;
        if (layer.type === "rings") {
          const max = Math.hypot(width, height);
          for (let radius = layer.phase; radius < max; radius += layer.spacing) {
            ctx.beginPath();
            ctx.arc(layer.x, layer.y, radius, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          ctx.translate(width / 2, height / 2);
          ctx.rotate(layer.angle);
          const extent = Math.hypot(width, height);
          for (let x = -extent + layer.phase; x < extent; x += layer.spacing) {
            ctx.beginPath();
            ctx.moveTo(x, -extent);
            ctx.lineTo(x, extent);
            ctx.stroke();
          }
        }
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [seed, foreground, background]);

  const startDrag = (kind: "linear" | "rings", event: React.PointerEvent<HTMLDivElement>) => {
    const current = kind === "linear" ? linear : rings;
    dragRef.current = { kind, dx: event.clientX - current.x / 100 * window.innerWidth, dy: event.clientY - current.y / 100 * window.innerHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = dragRef.current;
    if (!active) return;
    const next = {
      x: Math.max(0, Math.min(100, (event.clientX - active.dx) / window.innerWidth * 100)),
      y: Math.max(0, Math.min(100, (event.clientY - active.dy) / window.innerHeight * 100)),
    };
    if (active.kind === "linear") setLinear((current) => ({ ...current, ...next }));
    else setRings((current) => ({ ...current, ...next }));
  };
  const stopDrag = () => { dragRef.current = null; };

  const sheetStyle = useCallback((sheet: Sheet, type: "linear" | "rings") => ({
    left: `${sheet.x}%`,
    top: `${sheet.y}%`,
    backgroundImage: type === "linear"
      ? `repeating-linear-gradient(${sheet.angle}deg, ${foreground} 0 1px, transparent 1px ${sheet.spacing}px)`
      : `repeating-radial-gradient(circle, ${foreground} 0 1px, transparent 1px ${sheet.spacing}px)`,
  }), [foreground]);

  return (
    <main className="moire-page" style={{ color: foreground }}>
      <canvas ref={canvasRef} className="moire-canvas" />
      <div className="moire-chrome">
        <Link className="back" href="/gallery">Gallery</Link>
        <div><span className="eyebrow">Interactive Exhibit 04</span><h1>Moiré Field</h1></div>
        <p>Pick up either interference sheet. Drag it anywhere across the live field, rotate the linear grating, or regenerate the periodic background.</p>
      </div>
      <div
        className="moire-sheet linear-sheet"
        style={sheetStyle(linear, "linear")}
        onPointerDown={(event) => startDrag("linear", event)}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        aria-label="Draggable linear interference grating"
      ><span>LINEAR / DRAG</span></div>
      <div
        className="moire-sheet ring-sheet"
        style={sheetStyle(rings, "rings")}
        onPointerDown={(event) => startDrag("rings", event)}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        aria-label="Draggable concentric-ring interference grating"
      ><span>RINGS / DRAG</span></div>
      <aside className="moire-controls">
        <button onClick={() => setSeed(Math.floor(Math.random() * 1000000))}>Regenerate field</button>
        <label><span>Linear angle</span><input type="range" min="-90" max="90" value={linear.angle} onChange={(event) => setLinear((current) => ({ ...current, angle: Number(event.target.value) }))} /></label>
        <label><span>Linear spacing</span><input type="range" min="3" max="22" value={linear.spacing} onChange={(event) => setLinear((current) => ({ ...current, spacing: Number(event.target.value) }))} /></label>
        <label><span>Ring spacing</span><input type="range" min="3" max="22" value={rings.spacing} onChange={(event) => setRings((current) => ({ ...current, spacing: Number(event.target.value) }))} /></label>
        <div className="moire-colors"><label>Field<input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label><label>Lines<input type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} /></label></div>
      </aside>
    </main>
  );
}
