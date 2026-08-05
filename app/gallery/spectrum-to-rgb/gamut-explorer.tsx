"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CIE_1931_2DEG_5NM } from "./cie-1931";
import type { SpectrumMode } from "./spectrum-lab";

type Point = { x: number; y: number };
type Mapping = "clip" | "compress";

const WHITE = { x: .3127, y: .3290 };
const PRIMARIES = [{ x: .64, y: .33 }, { x: .3, y: .6 }, { x: .15, y: .06 }];
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const encode = (linear: number) => linear <= .0031308 ? 12.92 * linear : 1.055 * Math.pow(linear, 1 / 2.4) - .055;
const hex = (rgb: number[]) => `#${rgb.map((channel) => Math.round(clamp(channel) * 255).toString(16).padStart(2, "0")).join("")}`;

function xyToLinear({ x, y }: Point) {
  const safeY = Math.max(y, .00001);
  const X = x / safeY; const Y = 1; const Z = (1 - x - y) / safeY;
  return [3.2409699419 * X - 1.5373831776 * Y - .4986107603 * Z, -.9692436363 * X + 1.8759675015 * Y + .0415550574 * Z, .0556300797 * X - .2039769589 * Y + 1.0569715142 * Z];
}

function normalizedDisplay(point: Point) {
  const linear = xyToLinear(point);
  const maximum = Math.max(...linear, .000001);
  const normalized = linear.map((channel) => channel / maximum);
  return { linear: normalized, encoded: normalized.map((channel) => encode(clamp(channel))), inside: normalized.every((channel) => channel >= -1e-7 && channel <= 1 + 1e-7) };
}

function insideTriangle(point: Point) {
  const [a, b, c] = PRIMARIES;
  const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  const u = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denominator;
  const v = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denominator;
  return u >= 0 && v >= 0 && 1 - u - v >= 0;
}

function compressToGamut(target: Point) {
  if (insideTriangle(target)) return target;
  let low = 0; let high = 1;
  for (let index = 0; index < 32; index++) {
    const t = (low + high) / 2;
    const candidate = { x: WHITE.x + (target.x - WHITE.x) * t, y: WHITE.y + (target.y - WHITE.y) * t };
    if (insideTriangle(candidate)) low = t; else high = t;
  }
  return { x: WHITE.x + (target.x - WHITE.x) * low, y: WHITE.y + (target.y - WHITE.y) * low };
}

function clippedChromaticity(target: Point) {
  const rgb = xyToLinear(target).map((channel) => Math.max(0, channel));
  const X = .4123907993 * rgb[0] + .3575843394 * rgb[1] + .1804807884 * rgb[2];
  const Y = .2126390059 * rgb[0] + .7151686788 * rgb[1] + .0721923154 * rgb[2];
  const Z = .0193308187 * rgb[0] + .1191947798 * rgb[1] + .9505321522 * rgb[2];
  const sum = X + Y + Z || 1;
  return { x: X / sum, y: Y / sum };
}

const spectralLocus = CIE_1931_2DEG_5NM.map(([, xBar, yBar, zBar]) => { const sum = xBar + yBar + zBar || 1; return { x: xBar / sum, y: yBar / sum }; });

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]; const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function GamutExplorer({ onModeChange }: { onModeChange: (mode: SpectrumMode) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const [target, setTarget] = useState<Point>({ x: .42, y: .24 });
  const [mapping, setMapping] = useState<Mapping>("compress");
  const mapped = useMemo(() => mapping === "compress" ? compressToGamut(target) : clippedChromaticity(target), [mapping, target]);
  const source = normalizedDisplay(target); const result = normalizedDisplay(mapped);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const context = canvas.getContext("2d"); if (!context) return;
    let width = 0; let height = 0;
    const pad = { left: 48, right: 24, top: 24, bottom: 48 };
    const xFor = (x: number) => pad.left + x / .8 * (width - pad.left - pad.right);
    const yFor = (y: number) => height - pad.bottom - y / .9 * (height - pad.top - pad.bottom);
    const pointFor = (clientX: number, clientY: number) => { const rect = canvas.getBoundingClientRect(); return { x: clamp((clientX - rect.left - pad.left) / (width - pad.left - pad.right) * .8, 0, .8), y: clamp((height - pad.bottom - (clientY - rect.top)) / (height - pad.top - pad.bottom) * .9, 0, .9) }; };
    const drawPath = (points: Point[], close = false) => { context.beginPath(); points.forEach((point, index) => index ? context.lineTo(xFor(point.x), yFor(point.y)) : context.moveTo(xFor(point.x), yFor(point.y))); if (close) context.closePath(); };
    const draw = () => {
      context.fillStyle = "#090d14"; context.fillRect(0, 0, width, height);
      const step = 4;
      for (let py = pad.top; py < height - pad.bottom; py += step) for (let px = pad.left; px < width - pad.right; px += step) {
        const point = { x: (px - pad.left) / (width - pad.left - pad.right) * .8, y: (height - pad.bottom - py) / (height - pad.top - pad.bottom) * .9 };
        if (!pointInPolygon(point, spectralLocus)) continue;
        context.fillStyle = hex(normalizedDisplay(point).encoded); context.fillRect(px, py, step + 1, step + 1);
      }
      context.strokeStyle = "rgba(244,240,223,.18)"; context.fillStyle = "rgba(244,240,223,.65)"; context.font = "800 9px Arial";
      for (let tick = 0; tick <= .8; tick += .1) { const x = xFor(tick); context.beginPath(); context.moveTo(x, pad.top); context.lineTo(x, height - pad.bottom); context.stroke(); context.fillText(tick.toFixed(1), x - 7, height - 25); }
      for (let tick = 0; tick <= .9; tick += .1) { const y = yFor(tick); context.beginPath(); context.moveTo(pad.left, y); context.lineTo(width - pad.right, y); context.stroke(); context.fillText(tick.toFixed(1), 15, y + 3); }
      drawPath(spectralLocus, true); context.strokeStyle = "#f4f0df"; context.lineWidth = 2; context.stroke();
      drawPath([...PRIMARIES, PRIMARIES[0]]); context.strokeStyle = "#111820"; context.lineWidth = 7; context.stroke(); context.strokeStyle = "#f4d64b"; context.lineWidth = 3; context.stroke();
      context.setLineDash([5, 5]); drawPath([target, mapped]); context.strokeStyle = "#f4f0df"; context.lineWidth = 2; context.stroke(); context.setLineDash([]);
      context.fillStyle = "#f4f0df"; context.beginPath(); context.arc(xFor(mapped.x), yFor(mapped.y), 7, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#ff553d"; context.strokeStyle = "#090d14"; context.lineWidth = 3; context.beginPath(); context.arc(xFor(target.x), yFor(target.y), 10, 0, Math.PI * 2); context.fill(); context.stroke();
      context.fillStyle = "#f4f0df"; context.fillText("x", width / 2, height - 8); context.fillText("y", 10, pad.top - 8);
    };
    const resize = () => { const rect = canvas.getBoundingClientRect(); const ratio = Math.min(devicePixelRatio || 1, 1.5); width = rect.width; height = rect.height; canvas.width = width * ratio; canvas.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0); draw(); };
    const move = (event: PointerEvent) => { if (dragging.current) setTarget(pointFor(event.clientX, event.clientY)); };
    const down = (event: PointerEvent) => { dragging.current = true; canvas.setPointerCapture(event.pointerId); setTarget(pointFor(event.clientX, event.clientY)); };
    const up = () => { dragging.current = false; };
    resize(); window.addEventListener("resize", resize); canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("resize", resize); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); };
  }, [mapped, target]);

  const setCoordinate = (key: keyof Point, value: number) => setTarget((current) => ({ ...current, [key]: clamp(value, 0, key === "x" ? .8 : .9) }));
  return <section className="spectrum-lab gamut-lab">
    <div className="spectrum-workbench">
      <div className="spectrum-mode-tabs" role="tablist" aria-label="Spectrum source"><button role="tab" aria-selected={false} onClick={() => onModeChange("emitters")}>Line emitters</button><button role="tab" aria-selected={false} onClick={() => onModeChange("blackbody")}>Blackbody radiation</button><button role="tab" aria-selected className="active">sRGB gamut</button></div>
      <div className="spectrum-plot-head"><span>CIE 1931 xy chromaticity</span><span><i className="gamut-target-dot" /> Target <i className="gamut-map-dot" /> Displayable</span></div>
      <canvas ref={canvasRef} className="spectrum-canvas gamut-canvas" aria-label={`CIE chromaticity diagram. Target x ${target.x.toFixed(3)}, y ${target.y.toFixed(3)}. ${source.inside ? "Inside" : "Outside"} the sRGB triangle.`} />
      <div className="spectrum-gesture-key"><b>● Drag the coral target</b><span>The horseshoe is visible chromaticity; the yellow triangle is what an sRGB display can reproduce.</span></div>
      <div className="gamut-verdict"><span className="eyebrow">Reality check</span><strong>{source.inside ? "This color fits." : "Your screen cannot make this color."}</strong><p>{source.inside ? "The target falls inside the sRGB primary triangle." : "The coral target is physical chromaticity. The white dot shows the chosen display approximation."}</p></div>
    </div>
    <aside className="spectrum-controls">
      <div className="gamut-swatches"><div style={{ background: hex(source.encoded) }}><span>Clipped preview</span></div><div style={{ background: hex(result.encoded) }}><span>Mapped sRGB</span><strong>{hex(result.encoded)}</strong></div></div>
      <div className="gamut-coordinates"><label>x <input type="number" min="0" max=".8" step=".001" value={target.x.toFixed(3)} onChange={(event) => setCoordinate("x", Number(event.target.value))} /></label><label>y <input type="number" min="0" max=".9" step=".001" value={target.y.toFixed(3)} onChange={(event) => setCoordinate("y", Number(event.target.value))} /></label></div>
      <div className="spectrum-readout gamut-readout"><span>Linear RGB <b>{source.linear.map((channel) => channel.toFixed(3)).join(" · ")}</b></span><span>Encoded RGB <b>{result.encoded.map((channel) => Math.round(channel * 255)).join(" · ")}</b></span><span className={source.inside ? "" : "warning"}>{source.inside ? "Inside sRGB" : "Outside sRGB"}</span></div>
      <div className="emitter-title"><span>Approximation method</span><b>{mapping === "compress" ? "Preserve hue" : "Clip channels"}</b></div>
      <div className="gamut-methods"><button className={mapping === "compress" ? "active" : ""} onClick={() => setMapping("compress")}>Compress toward D65</button><button className={mapping === "clip" ? "active" : ""} onClick={() => setMapping("clip")}>Clip negative channels</button></div>
      <div className="spectrum-model-note"><b>Chromaticity is not a screen color</b><p>The diagram describes ratios of tristimulus values, not brightness. Colored pixels here are only an orientation aid. Outside the yellow sRGB triangle, every preview is necessarily a substitute.</p><p><b>Compression</b> moves toward D65 white until it reaches the triangle. <b>Clipping</b> zeroes impossible negative linear channels, which can shift hue.</p><a href="https://www.color.org/chardata/rgb/srgb.xalter" target="_blank" rel="noreferrer">ICC sRGB characterization ↗</a></div>
    </aside>
  </section>;
}
