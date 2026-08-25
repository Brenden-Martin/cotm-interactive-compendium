"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ANNIHILATE_RULE,
  EMPTY_RULE,
  cellKey,
  parseCellKey,
  presetRule,
  ruleFromGrid,
  stepAutomaton,
  symmetricSeeds,
  type CellState,
  type CollisionMode,
} from "./automata-engine";

const COLUMNS = 101;
const ROWS = 73;
const PALETTE = ["#ffef63", "#ff5b79", "#40d9ff", "#8df45a", "#a67cff", "#ff9b38", "#f7f2df", "#28f2b1"];
type Mode = "binary" | "color";
type SeedPattern = "single" | "pair" | "fourfold" | "ring";

function centralSeed(color = 0) {
  return new Map<string, CellState>([[cellKey(Math.floor(COLUMNS / 2), Math.floor(ROWS / 2)), { color, ready: true }]]);
}

export function CellularAutomata() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintValueRef = useRef<CellState | null | undefined>(undefined);
  const paintedRef = useRef(new Set<string>());
  const [mode, setMode] = useState<Mode>("binary");
  const [cells, setCells] = useState(() => symmetricSeeds("single", COLUMNS, ROWS));
  const [ruleGrid, setRuleGrid] = useState(() => presetRule("sierpinski"));
  const [collisionMode, setCollisionMode] = useState<CollisionMode>("parity");
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(180);
  const [iteration, setIteration] = useState(0);
  const [colorCount, setColorCount] = useState(5);
  const [ruleBrush, setRuleBrush] = useState(0);
  const [seedColor, setSeedColor] = useState(0);
  const [seedPattern, setSeedPattern] = useState<SeedPattern>("single");
  const [preset, setPreset] = useState("Sierpinski triangle");
  const [stats, setStats] = useState({ births: 0, deaths: 0, collisions: 0 });

  const advance = useCallback(() => {
    setCells((current) => {
      const result = stepAutomaton(current, ruleFromGrid(ruleGrid), COLUMNS, ROWS, collisionMode, mode === "binary" ? 1 : colorCount);
      setStats({ births: result.births, deaths: result.deaths, collisions: result.collisions });
      return result.cells;
    });
    setIteration((value) => value + 1);
  }, [collisionMode, colorCount, mode, ruleGrid]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(advance, duration);
    return () => window.clearInterval(timer);
  }, [advance, duration, paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const density = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * density));
      canvas.height = Math.max(1, Math.round(bounds.height * density));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(density, 0, 0, density, 0, 0);
      context.fillStyle = "#05050a";
      context.fillRect(0, 0, bounds.width, bounds.height);
      const cellWidth = bounds.width / COLUMNS;
      const cellHeight = bounds.height / ROWS;
      if (cellWidth >= 5) {
        context.strokeStyle = "rgba(255,255,255,.045)";
        context.lineWidth = 1;
        for (let x = 0; x <= COLUMNS; x++) { context.beginPath(); context.moveTo(x * cellWidth, 0); context.lineTo(x * cellWidth, bounds.height); context.stroke(); }
        for (let y = 0; y <= ROWS; y++) { context.beginPath(); context.moveTo(0, y * cellHeight); context.lineTo(bounds.width, y * cellHeight); context.stroke(); }
      }
      for (const [key, cell] of cells) {
        const { x, y } = parseCellKey(key);
        const color = mode === "binary" ? PALETTE[0] : PALETTE[cell.color % colorCount];
        context.fillStyle = color;
        if (cell.ready) { context.shadowColor = color; context.shadowBlur = Math.max(4, cellWidth * 1.5); }
        context.fillRect(x * cellWidth + .35, y * cellHeight + .35, Math.max(.75, cellWidth - .7), Math.max(.75, cellHeight - .7));
        context.shadowBlur = 0;
      }
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [cells, colorCount, mode]);

  const resetWithSeeds = useCallback((pattern = seedPattern) => {
    setCells(symmetricSeeds(pattern, COLUMNS, ROWS, seedColor));
    setIteration(0);
    setStats({ births: 0, deaths: 0, collisions: 0 });
  }, [seedColor, seedPattern]);

  const loadPreset = (name: "sierpinski" | "celtic") => {
    setRuleGrid(presetRule(name, mode === "color", colorCount));
    setCells(name === "sierpinski" ? symmetricSeeds("single", COLUMNS, ROWS, seedColor) : centralSeed(seedColor));
    setSeedPattern("single");
    setIteration(0);
    setPreset(name === "sierpinski" ? "Sierpinski triangle" : "Celtic cross");
    setPaused(false);
  };

  const selectMode = (nextMode: Mode) => {
    setMode(nextMode);
    setCollisionMode(nextMode === "binary" ? "parity" : "cycle");
    setRuleGrid(presetRule("sierpinski", nextMode === "color", colorCount));
    setCells(symmetricSeeds("single", COLUMNS, ROWS, seedColor));
    setIteration(0);
    setPreset(nextMode === "binary" ? "Sierpinski triangle" : "Chromatic Sierpinski");
  };

  const updateColorCount = (count: number) => {
    setColorCount(count);
    setSeedColor((value) => value % count);
    setRuleBrush((value) => value >= 0 ? value % count : value);
    setCells((current) => new Map(Array.from(current, ([key, cell]) => [key, { ...cell, color: cell.color % count }])));
    setRuleGrid((current) => current.map((action) => action >= 0 ? action % count : action));
  };

  const randomizeRule = () => {
    const next = new Array<number>(25).fill(EMPTY_RULE).map(() => {
      if (Math.random() > .24) return EMPTY_RULE;
      if (mode === "color" && Math.random() < .16) return ANNIHILATE_RULE;
      return mode === "binary" ? 0 : Math.floor(Math.random() * colorCount);
    });
    if (next.every((action) => action === EMPTY_RULE)) next[18] = 0;
    setRuleGrid(next);
    setPreset("Handwritten crystal");
    resetWithSeeds();
  };

  const editRule = (index: number) => {
    setRuleGrid((current) => current.map((action, cell) => cell === index ? (mode === "binary" ? action === EMPTY_RULE ? 0 : EMPTY_RULE : ruleBrush) : action));
    setPreset("Handwritten crystal");
  };

  const canvasCell = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(COLUMNS - 1, Math.floor((event.clientX - bounds.left) / bounds.width * COLUMNS))), y: Math.max(0, Math.min(ROWS - 1, Math.floor((event.clientY - bounds.top) / bounds.height * ROWS))) };
  };

  const paintInitialCell = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = canvasCell(event);
    const key = cellKey(x, y);
    if (paintedRef.current.has(key)) return;
    paintedRef.current.add(key);
    setCells((current) => {
      const next = new Map(current);
      if (paintValueRef.current === null) next.delete(key);
      else next.set(key, paintValueRef.current ?? { color: seedColor, ready: true });
      return next;
    });
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setPaused(true);
    paintedRef.current.clear();
    const { x, y } = canvasCell(event);
    paintValueRef.current = cells.has(cellKey(x, y)) ? null : { color: seedColor, ready: true };
    paintInitialCell(event);
  };

  return <main className="cellular-page">
    <header className="cellular-head"><Link href="/gallery">← Gallery</Link><div><span className="eyebrow">Interactive Exhibit 36 · Recursive Computation</span><h1>Cellular<br/>Automata</h1><p>Before the name came the collision: make clones, let overlaps annihilate, and watch a child’s game-object experiment reveal a family of fractals.</p></div><Link href="/compendium/cellular-automata-childhood">Read the field log ↗</Link></header>
    <nav className="cellular-tabs" aria-label="Cellular automata chambers"><button className={mode === "binary" ? "active" : ""} onClick={() => selectMode("binary")}>Binary growth</button><button className={mode === "color" ? "active" : ""} onClick={() => selectMode("color")}>Color reactions</button></nav>
    <section className="cellular-console">
      <div className="cellular-stage"><canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={(event) => { if (paintValueRef.current !== undefined) paintInitialCell(event); }} onPointerUp={() => { paintValueRef.current = undefined; paintedRef.current.clear(); }} onPointerCancel={() => { paintValueRef.current = undefined; paintedRef.current.clear(); }} aria-label="Editable cellular automaton lattice. Tap or drag cells to change the active initial conditions."/><div className="cellular-telemetry"><span>ITERATION <b>{iteration}</b></span><span>CELLS <b>{cells.size}</b></span><span>BIRTHS <b>{stats.births}</b></span><span>DEATHS <b>{stats.deaths}</b></span><span>COLLISIONS <b>{stats.collisions}</b></span></div><p>Tap or drag to edit cells. Editing pauses the clock.</p></div>
      <aside className="cellular-controls">
        <div className="cellular-actions"><button className="primary" onClick={() => setPaused((value) => !value)}>{paused ? "Play" : "Pause"}</button><button onClick={advance}>One iteration</button><button onClick={() => resetWithSeeds()}>Reset seeds</button><button onClick={() => { setCells(new Map()); setIteration(0); setPaused(true); }}>Clear lattice</button></div>
        <div className="cellular-presets"><button className={preset.includes("Sierpinski") ? "active" : ""} onClick={() => loadPreset("sierpinski")}>Sierpinski triangle</button><button className={preset === "Celtic cross" ? "active" : ""} onClick={() => loadPreset("celtic")}>Celtic cross</button><button onClick={randomizeRule}>Random seed crystal</button></div>
        <label className="cellular-slider"><span>Iteration duration <output>{duration} ms</output></span><input type="range" min="35" max="1500" step="5" value={duration} onChange={(event) => setDuration(Number(event.target.value))}/></label>
        <label className="cellular-select"><span>Overlap reaction</span><select value={collisionMode} onChange={(event) => setCollisionMode(event.target.value as CollisionMode)}><option value="parity">Pair annihilation / parity</option><option value="all">Annihilate all overlappers</option>{mode === "color" && <option value="cycle">Color-add reaction</option>}</select></label>
        {mode === "color" && <label className="cellular-slider"><span>Color states <output>{colorCount}</output></span><input type="range" min="2" max="8" step="1" value={colorCount} onChange={(event) => updateColorCount(Number(event.target.value))}/></label>}
        <section className="cellular-seeds"><h2>Initial symmetry</h2><div>{(["single", "pair", "fourfold", "ring"] as SeedPattern[]).map((pattern) => <button key={pattern} className={seedPattern === pattern ? "active" : ""} onClick={() => { setSeedPattern(pattern); resetWithSeeds(pattern); setPaused(true); }}>{pattern}</button>)}</div>{mode === "color" && <div className="cellular-palette" aria-label="Seed color">{Array.from({ length: colorCount }, (_, color) => <button key={color} aria-label={`Seed color ${color + 1}`} className={seedColor === color ? "active" : ""} style={{ background: PALETTE[color] }} onClick={() => setSeedColor(color)}/>)}</div>}</section>
        <section className="cellular-rule"><div><h2>5 × 5 offspring stencil</h2><small>{mode === "binary" ? "Tap cells to toggle clone placement." : "Choose a reaction, then paint the stencil."}</small></div>{mode === "color" && <div className="cellular-rule-brush"><button className={ruleBrush === EMPTY_RULE ? "active" : ""} onClick={() => setRuleBrush(EMPTY_RULE)}>Off</button><button className={ruleBrush === ANNIHILATE_RULE ? "active kill" : "kill"} onClick={() => setRuleBrush(ANNIHILATE_RULE)}>Annihilate</button>{Array.from({ length: colorCount }, (_, color) => <button key={color} aria-label={`Spawn color ${color + 1}`} className={ruleBrush === color ? "active" : ""} style={{ background: PALETTE[color] }} onClick={() => setRuleBrush(color)}/>)}</div>}<div className="cellular-rule-grid">{ruleGrid.map((action, index) => <button key={index} className={`${action !== EMPTY_RULE ? "set" : ""}${action === ANNIHILATE_RULE ? " kill" : ""}${index === 12 ? " origin" : ""}`} style={action >= 0 && mode === "color" ? { background: PALETTE[action % colorCount] } : undefined} aria-label={`Rule offset ${index % 5 - 2}, ${Math.floor(index / 5) - 2}`} onClick={() => editRule(index)}>{action === ANNIHILATE_RULE ? "×" : index === 12 ? "•" : ""}</button>)}</div></section>
        <section className="cellular-future"><span>Later chambers</span><b>Wolfram rules · Conway Life · Turing interpreter</b><p>The engine is deliberately organized as the first room of a broader tour through one-dimensional rules, universal Life, and read-head computation.</p></section>
      </aside>
    </section>
  </main>;
}
