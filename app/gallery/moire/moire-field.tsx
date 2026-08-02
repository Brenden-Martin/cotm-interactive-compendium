"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Position = { x: number; y: number };
type Sheet = Position & { angle: number; spacing: number };
type DragKind = "linear" | "rings" | "field" | "reference" | "blur" | "fisheye";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const TABLE_RED = "#ff1a16";
const INK = "#050505";

const seededRandom = (seed: number) => {
  let value = seed || 1;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

const sceneSizes = (width: number) => ({
  sheet: clamp(width * .27, 210, 390),
  field: clamp(width * .31, 270, 410),
  reference: clamp(width * .29, 260, 380),
  blur: clamp(width * .15, 150, 220),
  fisheye: clamp(width * .16, 160, 230),
});

const cardOrigin = (position: Position, width: number, height: number, size: number) => ({
  x: position.x / 100 * width - size / 2,
  y: position.y / 100 * height - size / 2,
});

const drawGeneratedField = (
  ctx: CanvasRenderingContext2D,
  position: Position,
  size: number,
  width: number,
  height: number,
  seed: number,
  foreground: string,
  background: string,
) => {
  const origin = cardOrigin(position, width, height, size);
  const margin = Math.max(14, size * .045);
  const innerX = origin.x + margin;
  const innerY = origin.y + margin;
  const innerSize = size - margin * 2;
  const random = seededRandom(seed);

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.fillRect(origin.x + 9, origin.y + 9, size, size);
  ctx.fillStyle = "#fff";
  ctx.fillRect(origin.x, origin.y, size, size);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(origin.x + .75, origin.y + .75, size - 1.5, size - 1.5);
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerSize, innerSize);
  ctx.clip();
  ctx.fillStyle = background;
  ctx.fillRect(innerX, innerY, innerSize, innerSize);
  ctx.strokeStyle = foreground;
  ctx.globalAlpha = .88;

  for (let index = 0; index < 9; index++) {
    const rings = index % 3 === 0;
    const spacing = 6 + Math.floor(random() * 15);
    const weight = random() > .72 ? 2 : 1;
    const phase = random() * spacing;
    ctx.save();
    ctx.lineWidth = weight;
    if (rings) {
      const centerX = innerX + random() * innerSize;
      const centerY = innerY + random() * innerSize;
      const extent = Math.hypot(innerSize, innerSize) * 1.35;
      for (let radius = phase; radius < extent; radius += spacing) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      const angle = random() * Math.PI;
      const extent = Math.hypot(innerSize, innerSize);
      ctx.translate(innerX + innerSize / 2, innerY + innerSize / 2);
      ctx.rotate(angle);
      for (let x = -extent + phase; x < extent; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, -extent);
        ctx.lineTo(x, extent);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();
};

const drawReferenceCard = (
  ctx: CanvasRenderingContext2D,
  position: Position,
  size: number,
  width: number,
  height: number,
) => {
  const origin = cardOrigin(position, width, height, size);
  const margin = Math.max(16, size * .055);
  const innerX = origin.x + margin;
  const innerY = origin.y + margin;
  const innerSize = size - margin * 2;
  const half = innerSize / 2;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.fillRect(origin.x + 9, origin.y + 9, size, size);
  ctx.fillStyle = "#fff";
  ctx.fillRect(origin.x, origin.y, size, size);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(origin.x + .75, origin.y + .75, size - 1.5, size - 1.5);
  ctx.strokeRect(innerX, innerY, innerSize, innerSize);
  ctx.beginPath();
  ctx.moveTo(innerX + half, innerY);
  ctx.lineTo(innerX + half, innerY + innerSize);
  ctx.moveTo(innerX, innerY + half);
  ctx.lineTo(innerX + innerSize, innerY + half);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, half, half);
  ctx.clip();
  ctx.lineWidth = 1.5;
  for (let radius = 5; radius < half * .8; radius += 6) {
    ctx.beginPath();
    ctx.arc(innerX + half / 2, innerY + half / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX + half, innerY, half, half);
  ctx.clip();
  for (let inset = 5; inset < half / 2; inset += 6) {
    ctx.strokeRect(innerX + half + inset, innerY + inset, half - inset * 2, half - inset * 2);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY + half, half, half);
  ctx.clip();
  ctx.lineWidth = 1.5;
  const chevronCenter = innerX + half / 2;
  for (let y = innerY + half - 22; y < innerY + innerSize + 28; y += 7) {
    ctx.beginPath();
    ctx.moveTo(innerX - 8, y);
    ctx.lineTo(chevronCenter, y + half * .42);
    ctx.lineTo(innerX + half + 8, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX + half, innerY + half, half, half);
  ctx.clip();
  let x = innerX + half + 4;
  let index = 0;
  while (x < innerX + innerSize) {
    const lineWidth = index % 2 === 0 ? 1.5 : 4;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x, innerY + half);
    ctx.lineTo(x, innerY + innerSize);
    ctx.stroke();
    x += index % 2 === 0 ? 6 : 9;
    index++;
  }
  ctx.restore();
  ctx.restore();
};

const drawLinearSheet = (
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  size: number,
  width: number,
  height: number,
) => {
  const origin = cardOrigin(sheet, width, height, size);
  const period = Math.max(3, sheet.spacing);
  const extent = Math.hypot(size, size);
  ctx.save();
  ctx.beginPath();
  ctx.rect(origin.x, origin.y, size, size);
  ctx.clip();
  ctx.translate(origin.x + size / 2, origin.y + size / 2);
  ctx.rotate(sheet.angle * Math.PI / 180);
  ctx.fillStyle = INK;
  for (let x = -extent; x < extent; x += period) {
    ctx.fillRect(x, -extent, period / 2, extent * 2);
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(origin.x + .75, origin.y + .75, size - 1.5, size - 1.5);
};

const drawRingSheet = (
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  size: number,
  width: number,
  height: number,
) => {
  const centerX = sheet.x / 100 * width;
  const centerY = sheet.y / 100 * height;
  const radius = size / 2;
  const period = Math.max(3, sheet.spacing);
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = INK;
  ctx.lineWidth = period / 2;
  for (let ring = period / 4; ring < radius + period; ring += period) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, ring, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - .75, 0, Math.PI * 2);
  ctx.stroke();
};

export function MoireField() {
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const fisheyeRef = useRef<HTMLCanvasElement>(null);
  const sceneRatioRef = useRef(1);
  const dragRef = useRef<{ kind: DragKind; dx: number; dy: number } | null>(null);
  const [viewportVersion, setViewportVersion] = useState(0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [foreground, setForeground] = useState(INK);
  const [background, setBackground] = useState(TABLE_RED);
  const [linear, setLinear] = useState<Sheet>({ x: 67, y: 50, angle: 5, spacing: 8 });
  const [rings, setRings] = useState<Sheet>({ x: 31, y: 35, angle: 0, spacing: 8 });
  const [fieldPosition, setFieldPosition] = useState<Position>({ x: 74, y: 25 });
  const [referencePosition, setReferencePosition] = useState<Position>({ x: 28, y: 72 });
  const [blurPosition, setBlurPosition] = useState<Position>({ x: 52, y: 24 });
  const [fisheyePosition, setFisheyePosition] = useState<Position>({ x: 54, y: 76 });

  useEffect(() => {
    const resize = () => setViewportVersion((version) => version + 1);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const canvas = sceneRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const sizes = sceneSizes(width);
    sceneRatioRef.current = ratio;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    drawGeneratedField(ctx, fieldPosition, sizes.field, width, height, seed, foreground, background);
    drawReferenceCard(ctx, referencePosition, sizes.reference, width, height);
    drawRingSheet(ctx, rings, sizes.sheet, width, height);
    drawLinearSheet(ctx, linear, sizes.sheet, width, height);
  }, [background, fieldPosition, foreground, linear, referencePosition, rings, seed, viewportVersion]);

  useEffect(() => {
    const sourceCanvas = sceneRef.current;
    const lensCanvas = fisheyeRef.current;
    if (!sourceCanvas || !lensCanvas) return;
    const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    const lensCtx = lensCanvas.getContext("2d");
    if (!sourceCtx || !lensCtx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = sceneRatioRef.current;
    const size = sceneSizes(width).fisheye;
    const radius = size / 2;
    const outputWidth = Math.max(1, Math.round(size * ratio));
    const outputHeight = outputWidth;
    const centerX = fisheyePosition.x / 100 * width;
    const centerY = fisheyePosition.y / 100 * height;
    const sourceLeft = clamp(Math.floor((centerX - radius - 2) * ratio), 0, Math.max(0, sourceCanvas.width - 1));
    const sourceTop = clamp(Math.floor((centerY - radius - 2) * ratio), 0, Math.max(0, sourceCanvas.height - 1));
    const sourceRight = clamp(Math.ceil((centerX + radius + 2) * ratio), sourceLeft + 1, sourceCanvas.width);
    const sourceBottom = clamp(Math.ceil((centerY + radius + 2) * ratio), sourceTop + 1, sourceCanvas.height);
    const source = sourceCtx.getImageData(sourceLeft, sourceTop, sourceRight - sourceLeft, sourceBottom - sourceTop);
    const output = lensCtx.createImageData(outputWidth, outputHeight);

    for (let py = 0; py < outputHeight; py++) {
      for (let px = 0; px < outputWidth; px++) {
        const dx = (px + .5) / ratio - radius;
        const dy = (py + .5) / ratio - radius;
        const normalizedRadius = Math.sqrt(dx * dx + dy * dy) / radius;
        const outputIndex = (py * outputWidth + px) * 4;
        if (normalizedRadius > 1) {
          output.data[outputIndex + 3] = 0;
          continue;
        }
        const inverseScale = .4 + .6 * normalizedRadius * normalizedRadius;
        const sourceX = Math.round((centerX + dx * inverseScale) * ratio) - sourceLeft;
        const sourceY = Math.round((centerY + dy * inverseScale) * ratio) - sourceTop;
        if (sourceX < 0 || sourceY < 0 || sourceX >= source.width || sourceY >= source.height) continue;
        const sourceIndex = (sourceY * source.width + sourceX) * 4;
        output.data[outputIndex] = source.data[sourceIndex];
        output.data[outputIndex + 1] = source.data[sourceIndex + 1];
        output.data[outputIndex + 2] = source.data[sourceIndex + 2];
        output.data[outputIndex + 3] = 255;
      }
    }

    lensCanvas.width = outputWidth;
    lensCanvas.height = outputHeight;
    lensCtx.putImageData(output, 0, 0);
  }, [background, fieldPosition, fisheyePosition, foreground, linear, referencePosition, rings, seed, viewportVersion]);

  const getPosition = useCallback((kind: DragKind): Position => {
    if (kind === "linear") return linear;
    if (kind === "rings") return rings;
    if (kind === "field") return fieldPosition;
    if (kind === "reference") return referencePosition;
    if (kind === "blur") return blurPosition;
    return fisheyePosition;
  }, [blurPosition, fieldPosition, fisheyePosition, linear, referencePosition, rings]);

  const setPosition = (kind: DragKind, next: Position) => {
    if (kind === "linear") setLinear((current) => ({ ...current, ...next }));
    else if (kind === "rings") setRings((current) => ({ ...current, ...next }));
    else if (kind === "field") setFieldPosition(next);
    else if (kind === "reference") setReferencePosition(next);
    else if (kind === "blur") setBlurPosition(next);
    else setFisheyePosition(next);
  };

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    const kind = event.currentTarget.dataset.dragKind as DragKind;
    const current = getPosition(kind);
    dragRef.current = {
      kind,
      dx: event.clientX - current.x / 100 * window.innerWidth,
      dy: event.clientY - current.y / 100 * window.innerHeight,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: React.PointerEvent<HTMLElement>) => {
    const active = dragRef.current;
    if (!active) return;
    setPosition(active.kind, {
      x: clamp((event.clientX - active.dx) / window.innerWidth * 100, 0, 100),
      y: clamp((event.clientY - active.dy) / window.innerHeight * 100, 0, 100),
    });
  };

  const stopDrag = () => { dragRef.current = null; };

  const nudge = (event: React.KeyboardEvent<HTMLElement>) => {
    const kind = event.currentTarget.dataset.dragKind as DragKind;
    const directions: Record<string, Position> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const current = getPosition(kind);
    const amount = event.shiftKey ? 4 : 1;
    setPosition(kind, {
      x: clamp(current.x + direction.x * amount, 0, 100),
      y: clamp(current.y + direction.y * amount, 0, 100),
    });
  };

  const positionStyle = (position: Position) => ({ left: `${position.x}%`, top: `${position.y}%` });

  return (
    <main className="moire-page" style={{ backgroundColor: background }}>
      <canvas ref={sceneRef} className="moire-scene" aria-hidden="true" />
      <div className="moire-chrome">
        <Link className="back" href="/gallery">Gallery</Link>
        <div><span className="eyebrow">Interactive Exhibit 04</span><h1>Moiré Field</h1></div>
        <p>Move transparencies, printouts, blur glass, and a fisheye lens across the red optical table. The title card is deliberately part of the experiment: slide patterns beneath its sampled blur.</p>
      </div>

      <div className="moire-drag-target generated-target" data-drag-kind="field" style={positionStyle(fieldPosition)} tabIndex={0} role="button" aria-label="Draggable randomly generated field printout" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onKeyDown={nudge}>
        <span className="moire-sheet-label">GENERATED FIELD / DRAG</span>
      </div>
      <div className="moire-drag-target reference-target" data-drag-kind="reference" style={positionStyle(referencePosition)} tabIndex={0} role="button" aria-label="Draggable four-pattern reference printout" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onKeyDown={nudge}>
        <span className="moire-sheet-label">REFERENCE SET / DRAG</span>
      </div>
      <div className="moire-drag-target ring-target" data-drag-kind="rings" style={positionStyle(rings)} tabIndex={0} role="button" aria-label="Draggable concentric-ring interference grating" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onKeyDown={nudge}>
        <span className="moire-sheet-label">RINGS / DRAG</span>
      </div>
      <div className="moire-drag-target linear-target" data-drag-kind="linear" style={positionStyle(linear)} tabIndex={0} role="button" aria-label="Draggable linear interference grating" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onKeyDown={nudge}>
        <span className="moire-sheet-label">LINEAR / DRAG</span>
      </div>

      <div className="moire-blur-lens" data-drag-kind="blur" style={positionStyle(blurPosition)} tabIndex={0} role="button" aria-label="Draggable Gaussian blur lens" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onKeyDown={nudge}>
        <span className="moire-sheet-label">BLUR / DRAG</span>
      </div>
      <div className="moire-fisheye-shell" data-drag-kind="fisheye" style={positionStyle(fisheyePosition)} tabIndex={0} role="button" aria-label="Draggable fisheye lens" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onKeyDown={nudge}>
        <canvas ref={fisheyeRef} className="moire-fisheye-lens" aria-hidden="true" />
        <span className="moire-fisheye-label">FISHEYE / DRAG</span>
      </div>

      <aside className="moire-controls">
        <button onClick={() => setSeed(Math.floor(Math.random() * 1000000))}>Regenerate field</button>
        <label><span>Linear angle</span><input type="range" min="-90" max="90" value={linear.angle} onChange={(event) => setLinear((current) => ({ ...current, angle: Number(event.target.value) }))} /></label>
        <label><span>Linear spacing</span><input type="range" min="3" max="22" value={linear.spacing} onChange={(event) => setLinear((current) => ({ ...current, spacing: Number(event.target.value) }))} /></label>
        <label><span>Ring spacing</span><input type="range" min="3" max="22" value={rings.spacing} onChange={(event) => setRings((current) => ({ ...current, spacing: Number(event.target.value) }))} /></label>
        <div className="moire-colors"><label>Table<input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label><label>Field lines<input type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} /></label></div>
      </aside>
    </main>
  );
}
