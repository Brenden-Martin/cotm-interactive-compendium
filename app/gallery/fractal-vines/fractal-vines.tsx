"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  childHeading,
  clamp,
  logarithmicThickness,
  mulberry32,
  sampleChildCount,
  windVector,
  type RandomSource,
} from "./vine-engine";

type Settings = {
  growthRate: number;
  segmentLength: number;
  lengthVariance: number;
  maximumNodes: number;
  splitChance: number;
  averageChildren: number;
  childVariance: number;
  minimumRun: number;
  terminationChance: number;
  directionalSpread: number;
  angleVariance: number;
  upwardBias: number;
  chaos: number;
  curvatureMemory: number;
  curvatureVariance: number;
  baseThickness: number;
  thickeningRate: number;
  saturationWidth: number;
  terminalLeaves: number;
  internodeLeaves: number;
  leafSize: number;
  leafVariance: number;
  windStrength: number;
  windScale: number;
  windDrift: number;
  branchWind: number;
  leafWind: number;
  gustDetail: number;
  stemHue: number;
  leafHue: number;
};

type VineNode = { id: number; parent: number; x: number; y: number; heading: number; birth: number; depth: number; generation: number };
type Tip = { node: number; heading: number; curvature: number; run: number; generation: number };
type Leaf = { node: number; size: number; angle: number; birth: number };
type Forest = { nodes: VineNode[]; tips: Tip[]; leaves: Leaf[]; roots: number[]; random: RandomSource; seed: number };
type SliderSpec = { key: keyof Settings; label: string; min: number; max: number; step: number; suffix?: string };

const DEFAULTS: Settings = {
  growthRate: 8.5, segmentLength: 1.15, lengthVariance: .24, maximumNodes: 3200,
  splitChance: .075, averageChildren: 2, childVariance: .35, minimumRun: 9, terminationChance: .018,
  directionalSpread: .36, angleVariance: .42, upwardBias: .42,
  chaos: .48, curvatureMemory: .88, curvatureVariance: .27,
  baseThickness: .55, thickeningRate: 1.15, saturationWidth: 8.5,
  terminalLeaves: .88, internodeLeaves: .035, leafSize: 10, leafVariance: .38,
  windStrength: .72, windScale: 5.2, windDrift: .17, branchWind: .72, leafWind: 1.35, gustDetail: .48,
  stemHue: 122, leafHue: 82,
};

const PRESETS: Record<string, Settings> = {
  "Climbing Ivy": DEFAULTS,
  "Classic Binary": { ...DEFAULTS, splitChance: .09, averageChildren: 2, childVariance: 0, directionalSpread: .25, angleVariance: .08, chaos: 0, curvatureVariance: 0, internodeLeaves: .015, windStrength: .16 },
  "Radial Bramble": { ...DEFAULTS, splitChance: .105, averageChildren: 2.7, childVariance: .9, directionalSpread: .94, angleVariance: .8, upwardBias: .05, chaos: .78, terminationChance: .025, leafSize: 7, maximumNodes: 4300 },
  "Wind Garden": { ...DEFAULTS, growthRate: 6.8, directionalSpread: .48, chaos: .62, curvatureMemory: .95, windStrength: 1.8, windScale: 3.1, windDrift: .34, branchWind: 1.35, leafWind: 2.2, gustDetail: 1.4, internodeLeaves: .06 },
  "Hairline Nebula": { ...DEFAULTS, segmentLength: .72, maximumNodes: 6200, splitChance: .058, averageChildren: 2.3, childVariance: .65, terminationChance: .009, directionalSpread: .72, chaos: 1.25, curvatureMemory: .97, curvatureVariance: .6, baseThickness: .2, thickeningRate: .32, saturationWidth: 2.5, terminalLeaves: .32, internodeLeaves: .004, windStrength: .45 },
};

const GROUPS: Array<{ title: string; controls: SliderSpec[] }> = [
  { title: "Growth clock", controls: [
    { key: "growthRate", label: "Growth rate", min: .5, max: 24, step: .1, suffix: " Hz" },
    { key: "segmentLength", label: "Segment length", min: .25, max: 3.5, step: .01 },
    { key: "lengthVariance", label: "Length variance", min: 0, max: 1.5, step: .01 },
    { key: "maximumNodes", label: "Growth ceiling", min: 200, max: 8000, step: 100 },
  ]},
  { title: "Branch architecture", controls: [
    { key: "splitChance", label: "Split probability", min: 0, max: .3, step: .001 },
    { key: "averageChildren", label: "Average new paths", min: 1, max: 5.5, step: .1 },
    { key: "childVariance", label: "Path-count variance", min: 0, max: 3, step: .01 },
    { key: "minimumRun", label: "Minimum stem run", min: 2, max: 32, step: 1 },
    { key: "terminationChance", label: "Leaf termination", min: 0, max: .15, step: .001 },
    { key: "directionalSpread", label: "Directional spread", min: 0, max: 1, step: .01 },
    { key: "angleVariance", label: "Split-angle variance", min: 0, max: 2.2, step: .01 },
    { key: "upwardBias", label: "Phototropic bias", min: 0, max: 1, step: .01 },
  ]},
  { title: "Lineage & chaos", controls: [
    { key: "chaos", label: "Chaos", min: 0, max: 2.5, step: .01 },
    { key: "curvatureMemory", label: "Curve memory", min: 0, max: .995, step: .005 },
    { key: "curvatureVariance", label: "Wandering variance", min: 0, max: 1.5, step: .01 },
    { key: "baseThickness", label: "New growth width", min: .1, max: 3, step: .05, suffix: " px" },
    { key: "thickeningRate", label: "Log thickening", min: 0, max: 4, step: .05 },
    { key: "saturationWidth", label: "Saturation width", min: .5, max: 20, step: .1, suffix: " px" },
  ]},
  { title: "Leaves", controls: [
    { key: "terminalLeaves", label: "Terminal leaf chance", min: 0, max: 1, step: .01 },
    { key: "internodeLeaves", label: "Internode leaf chance", min: 0, max: .25, step: .001 },
    { key: "leafSize", label: "Leaf size", min: 1, max: 28, step: .5, suffix: " px" },
    { key: "leafVariance", label: "Leaf variance", min: 0, max: 1.5, step: .01 },
  ]},
  { title: "Invisible wind", controls: [
    { key: "windStrength", label: "Wind strength", min: 0, max: 3, step: .01 },
    { key: "windScale", label: "Field scale", min: .4, max: 18, step: .1 },
    { key: "windDrift", label: "Horizontal drift", min: -.8, max: .8, step: .01 },
    { key: "branchWind", label: "Branch response", min: 0, max: 2.5, step: .01 },
    { key: "leafWind", label: "Leaf response", min: 0, max: 4, step: .01 },
    { key: "gustDetail", label: "Lead wiggle", min: 0, max: 2.5, step: .01 },
  ]},
  { title: "Pigment", controls: [
    { key: "stemHue", label: "Stem hue", min: 0, max: 360, step: 1, suffix: "°" },
    { key: "leafHue", label: "Leaf hue", min: 0, max: 360, step: 1, suffix: "°" },
  ]},
];

const makeForest = (seed: number): Forest => ({ nodes: [], tips: [], leaves: [], roots: [], random: mulberry32(seed), seed });

function VineSlider({ spec, value, onChange }: { spec: SliderSpec; value: number; onChange: (value: number) => void }) {
  const digits = spec.step < .01 ? 3 : spec.step < 1 ? 2 : 0;
  return <label className="vine-slider"><span>{spec.label}<output>{value.toFixed(digits)}{spec.suffix ?? ""}</output></span><input aria-label={spec.label} type="range" min={spec.min} max={spec.max} step={spec.step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function FractalVines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(DEFAULTS);
  const forestRef = useRef<Forest>(makeForest(2401));
  const pausedRef = useRef(false);
  const timeRef = useRef(0);
  const [settings, setSettings] = useState(DEFAULTS);
  const [seed, setSeed] = useState(2401);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [preset, setPreset] = useState("Climbing Ivy");
  const [status, setStatus] = useState({ nodes: 0, tips: 0, leaves: 0, depth: 0, wind: 0 });

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const plantRoot = useCallback((x = .5, y = .94, heading = -Math.PI / 2) => {
    const forest = forestRef.current;
    const id = forest.nodes.length;
    forest.nodes.push({ id, parent: -1, x, y, heading, birth: timeRef.current, depth: 0, generation: 0 });
    forest.tips.push({ node: id, heading, curvature: 0, run: 0, generation: 0 });
    forest.roots.push(id);
  }, []);

  const reset = useCallback((nextSeed = seed) => {
    forestRef.current = makeForest(nextSeed);
    timeRef.current = 0;
    plantRoot(.5, .93, -Math.PI / 2);
  }, [plantRoot, seed]);

  useEffect(() => { reset(seed); }, [reset, seed]);

  const loadPreset = (name: string) => {
    setSettings(PRESETS[name]);
    setPreset(name);
    setTimeout(() => reset(seed), 0);
  };

  const randomize = () => {
    const next = { ...settings };
    for (const group of GROUPS) for (const control of group.controls) {
      const unit = Math.random();
      const value = control.min + (control.max - control.min) * unit;
      (next[control.key] as number) = control.step >= 1 ? Math.round(value / control.step) * control.step : value;
    }
    next.maximumNodes = Math.max(1200, next.maximumNodes);
    setSettings(next);
    setPreset("Wild cutting");
    setTimeout(() => reset(seed), 0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let animation = 0;
    let last = performance.now();
    let growthAccumulator = 0;
    let statusClock = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const density = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * density));
      canvas.height = Math.max(1, Math.round(bounds.height * density));
      context.setTransform(density, 0, 0, density, 0, 0);
    };
    resize();
    addEventListener("resize", resize);

    const terminate = (tip: Tip, terminal = true) => {
      const forest = forestRef.current;
      const settingsNow = settingsRef.current;
      if (terminal && forest.random() < settingsNow.terminalLeaves) {
        forest.leaves.push({ node: tip.node, size: .5 + forest.random(), angle: forest.random() * Math.PI * 2, birth: timeRef.current });
      }
    };

    const grow = () => {
      const forest = forestRef.current;
      const s = settingsRef.current;
      if (!forest.tips.length || forest.nodes.length >= s.maximumNodes) return;
      const nextTips: Tip[] = [];
      for (const tip of forest.tips) {
        if (forest.nodes.length >= s.maximumNodes) { terminate(tip, true); continue; }
        const parent = forest.nodes[tip.node];
        const randomTurn = (forest.random() * 2 - 1) * s.curvatureVariance * s.chaos;
        tip.curvature = tip.curvature * s.curvatureMemory + randomTurn * (1 - s.curvatureMemory + .025);
        const upwardDelta = Math.atan2(Math.sin(-Math.PI / 2 - tip.heading), Math.cos(-Math.PI / 2 - tip.heading));
        tip.heading += tip.curvature + upwardDelta * s.upwardBias * .035;
        const length = .0095 * s.segmentLength * Math.max(.15, 1 + (forest.random() * 2 - 1) * s.lengthVariance);
        const x = parent.x + Math.cos(tip.heading) * length;
        const y = parent.y + Math.sin(tip.heading) * length;
        if (x < -.12 || x > 1.12 || y < -.14 || y > 1.08) { terminate(tip, true); continue; }
        const id = forest.nodes.length;
        const node: VineNode = { id, parent: parent.id, x, y, heading: tip.heading, birth: timeRef.current, depth: parent.depth + 1, generation: tip.generation };
        forest.nodes.push(node);
        const run = tip.run + 1;
        if (forest.random() < s.internodeLeaves) forest.leaves.push({ node: id, size: .5 + forest.random(), angle: tip.heading + (forest.random() * 2 - 1) * 1.8, birth: timeRef.current });
        const canChange = run >= s.minimumRun;
        if (canChange && forest.random() < s.splitChance) {
          const count = sampleChildCount(s.averageChildren, s.childVariance, forest.random);
          for (let child = 0; child < count; child++) {
            nextTips.push({ node: id, heading: childHeading(tip.heading, child, count, s.directionalSpread, s.angleVariance, forest.random), curvature: tip.curvature * .3, run: 0, generation: tip.generation + 1 });
          }
        } else if (canChange && forest.random() < s.terminationChance) {
          terminate({ ...tip, node: id }, true);
        } else {
          nextTips.push({ ...tip, node: id, run });
        }
      }
      forest.tips = nextTips;
    };

    const displaced = (node: VineNode, now: number) => {
      const s = settingsRef.current;
      if (node.depth === 0 || s.windStrength === 0 || s.branchWind === 0) return { x: node.x, y: node.y };
      const field = windVector(node.x, node.y, now, forestRef.current.seed, s.windScale, s.windDrift);
      const leverage = 1 - Math.exp(-node.depth / 28);
      const amplitude = .028 * s.windStrength * s.branchWind * leverage;
      const leadWiggle = Math.sin(now * (1.3 + s.gustDetail) + node.id * .71) * .0025 * s.gustDetail * leverage;
      return { x: node.x + field.x * amplitude + leadWiggle, y: node.y + field.y * amplitude * .65 };
    };

    const draw = (nowMs: number) => {
      const dt = Math.min(.05, (nowMs - last) / 1000);
      last = nowMs;
      const s = settingsRef.current;
      if (!pausedRef.current) {
        timeRef.current += dt;
        growthAccumulator += dt * s.growthRate;
        const updates = Math.min(5, Math.floor(growthAccumulator));
        if (updates > 0) growthAccumulator -= updates;
        for (let update = 0; update < updates; update++) grow();
      }
      const time = timeRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const forest = forestRef.current;
      const displayed = new Array<{ x: number; y: number }>(forest.nodes.length);
      for (const node of forest.nodes) displayed[node.id] = displaced(node, time);

      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#081615");
      sky.addColorStop(.6, "#10221b");
      sky.addColorStop(1, "#1a241a");
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "rgba(173, 230, 181, .045)";
      context.lineWidth = 1;
      for (let x = 0; x < width; x += 64) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
      for (let y = 0; y < height; y += 64) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }

      context.lineCap = "round";
      context.lineJoin = "round";
      for (const node of forest.nodes) {
        if (node.parent < 0) continue;
        const parent = forest.nodes[node.parent];
        const a = displayed[parent.id];
        const b = displayed[node.id];
        const dx = (b.x - a.x) * width;
        const dy = (b.y - a.y) * height;
        const distance = Math.hypot(dx, dy);
        const scale = Math.min(width, height);
        context.beginPath();
        context.moveTo(a.x * width, a.y * height);
        context.bezierCurveTo(
          a.x * width + Math.cos(parent.heading) * distance * .38,
          a.y * height + Math.sin(parent.heading) * distance * .38,
          b.x * width - Math.cos(node.heading) * distance * .32,
          b.y * height - Math.sin(node.heading) * distance * .32,
          b.x * width,
          b.y * height,
        );
        const age = time - node.birth;
        const taper = Math.max(.35, Math.pow(.91, node.generation));
        context.lineWidth = logarithmicThickness(age, s.baseThickness, s.thickeningRate, s.saturationWidth) * taper * clamp(scale / 700, .72, 1.4);
        const light = clamp(39 + node.generation * 2.4, 36, 62);
        context.strokeStyle = `hsl(${s.stemHue + node.generation * 4} 52% ${light}%)`;
        context.stroke();
      }

      for (const leaf of forest.leaves) {
        const node = forest.nodes[leaf.node];
        const point = displayed[leaf.node];
        if (!node || !point) continue;
        const wind = windVector(node.x, node.y, time, forest.seed + 991, s.windScale * 1.17, s.windDrift);
        const flutter = wind.x * s.windStrength * s.leafWind + Math.sin(time * (2.2 + s.gustDetail) + node.id) * .3 * s.leafWind;
        const size = s.leafSize * Math.max(.18, leaf.size * (1 + (leaf.size - .9) * s.leafVariance));
        context.save();
        context.translate(point.x * width + wind.x * s.leafWind * s.windStrength * 2.5, point.y * height + wind.y * s.leafWind * s.windStrength * 2);
        context.rotate(leaf.angle + flutter * .22);
        context.fillStyle = `hsl(${s.leafHue + flutter * 9} 74% ${48 + clamp(leaf.size * 8, 0, 12)}%)`;
        context.beginPath();
        context.ellipse(0, 0, size * 1.35, size * .48, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = `hsla(${s.stemHue} 55% 28% / .75)`;
        context.lineWidth = 1;
        context.beginPath(); context.moveTo(-size, 0); context.lineTo(size, 0); context.stroke();
        context.restore();
      }

      for (const tip of forest.tips) {
        const point = displayed[tip.node];
        if (!point) continue;
        const pulse = 2.5 + Math.sin(time * 4 + tip.node) * 1.2;
        context.fillStyle = `hsla(${s.leafHue + 28} 100% 76% / .72)`;
        context.beginPath(); context.arc(point.x * width, point.y * height, pulse, 0, Math.PI * 2); context.fill();
      }

      statusClock += dt;
      if (statusClock > .22) {
        statusClock = 0;
        const wind = windVector(.5, .5, time, forest.seed, s.windScale, s.windDrift).x * s.windStrength;
        setStatus({ nodes: forest.nodes.length, tips: forest.tips.length, leaves: forest.leaves.length, depth: forest.nodes.reduce((max, node) => Math.max(max, node.depth), 0), wind });
      }
      animation = requestAnimationFrame(draw);
    };

    animation = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animation); removeEventListener("resize", resize); };
  }, []);

  const plantAtPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / bounds.width, .02, .98);
    const y = clamp((event.clientY - bounds.top) / bounds.height, .02, .98);
    const heading = Math.atan2(.48 - y, .5 - x) + (forestRef.current.random() * 2 - 1) * .25;
    plantRoot(x, y, heading);
  };

  return <main className={`vine-page${hidden ? " controls-hidden" : ""}`}>
    <button className="vine-ui-toggle" onClick={() => setHidden((value) => !value)}>{hidden ? "Cultivate controls" : "Hide the greenhouse"}</button>
    <header className="vine-head">
      <Link href="/gallery">← Gallery</Link>
      <div><span className="eyebrow">Interactive Exhibit 34 · Generative Botany</span><h1>Fractal<br/>Vines</h1><p>A recursive family tree with loose morals. Grow straight mathematical branches, unruly vines, radial brambles, or something the wind invented.</p></div>
      <span className="vine-seed">CUTTING<br/><b>{seed}</b></span>
    </header>
    <section className="vine-console">
      <div className="vine-stage"><canvas ref={canvasRef} onPointerDown={plantAtPointer} aria-label="Interactive wind-tossed fractal vine growth field. Tap to plant another cutting."/><div className="vine-telemetry"><span>NODES <b>{status.nodes}</b></span><span>LEADS <b>{status.tips}</b></span><span>LEAVES <b>{status.leaves}</b></span><span>DEPTH <b>{status.depth}</b></span><span>WIND <b>{status.wind.toFixed(2)}</b></span></div><p>Tap the field to plant another cutting.</p></div>
      <aside className="vine-controls">
        <div className="vine-actions"><button className="primary" onClick={() => setPaused((value) => !value)}>{paused ? "Resume growth" : "Pause growth"}</button><button onClick={() => reset(seed)}>Regrow</button><button onClick={() => { const next = Math.floor(Math.random() * 999999); setSeed(next); setPreset("New cutting"); }}>New cutting</button><button onClick={randomize}>Scramble lineage</button></div>
        <div className="vine-presets">{Object.keys(PRESETS).map((name) => <button key={name} className={preset === name ? "active" : ""} onClick={() => loadPreset(name)}>{name}</button>)}</div>
        {GROUPS.map((group, index) => <details key={group.title} open={index < 2}><summary>{group.title}</summary><div className="vine-grid">{group.controls.map((spec) => <VineSlider key={spec.key} spec={spec} value={settings[spec.key]} onChange={(value) => { setSettings((current) => ({ ...current, [spec.key]: value })); setPreset("Hand-trained"); }} />)}</div></details>)}
        <p className="vine-note"><b>Chaos</b> interpolates from geometric recursion toward correlated wandering. <b>Directional spread</b> opens one traveling line into a fan and finally a radial thicket. The invisible wind is a horizontally advected coherent field; branches and their parented leaves may disagree about how seriously to take it.</p>
      </aside>
    </section>
  </main>;
}
