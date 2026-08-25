"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  bloomProgress,
  childHeading,
  clamp,
  guidanceVector,
  logarithmicThickness,
  mulberry32,
  randomizedFlowersEnabled,
  sampleChildCount,
  shouldDecimatePrevious,
  windVector,
  type GuidanceSource,
  type RandomSource,
} from "./vine-engine";

type Settings = {
  growthRate: number;
  segmentLength: number;
  lengthVariance: number;
  maximumDepth: number;
  decimationInterval: number;
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
  leafGrowthDuration: number;
  flowerChance: number;
  flowerOnLeafChance: number;
  bloomDuration: number;
  flowerSpread: number;
  windStrength: number;
  windScale: number;
  windDrift: number;
  branchWind: number;
  leafWind: number;
  gustDetail: number;
  guidanceStrength: number;
  guidanceRadius: number;
  fieldOpacity: number;
  fractalLevels: number;
  fractalChildren: number;
  fractalAngle: number;
  fractalShrink: number;
  fractalLength: number;
  stemHue: number;
  leafHue: number;
  flowerHue: number;
};

type VineGenome = {
  id: number;
  weight: number;
  split: number;
  children: number;
  termination: number;
  spread: number;
  angle: number;
  chaos: number;
  curve: number;
  length: number;
  leaves: number;
  flowers: number;
  size: number;
  stemHue: number;
  leafHue: number;
  flowerHue: number;
};
type VineNode = { id: number; parent: number; x: number; y: number; heading: number; birth: number; depth: number; generation: number; genome: number; createdFrame: number; retired: boolean };
type Tip = { node: number; heading: number; curvature: number; run: number; generation: number; genome: number };
type Ornament = { node: number; size: number; angle: number; birth: number; kind: "leaf" | "flower" };
type Forest = { nodes: VineNode[]; visibleNodeIds: Set<number>; tips: Tip[]; ornaments: Ornament[]; roots: number[]; genomes: VineGenome[]; protectedNodes: Set<number>; random: RandomSource; seed: number; frame: number };
type SliderSpec = { key: keyof Settings; label: string; min: number; max: number; step: number; suffix?: string };

const DEFAULTS: Settings = {
  growthRate: 8.5, segmentLength: 1.15, lengthVariance: .24, maximumDepth: 900, decimationInterval: 3,
  splitChance: .075, averageChildren: 2, childVariance: .35, minimumRun: 9, terminationChance: .018,
  directionalSpread: .36, angleVariance: .42, upwardBias: .42,
  chaos: .48, curvatureMemory: .88, curvatureVariance: .27,
  baseThickness: .55, thickeningRate: 1.15, saturationWidth: 8.5,
  terminalLeaves: .88, internodeLeaves: .035, leafSize: 10, leafVariance: .38, leafGrowthDuration: 5.2, flowerChance: .14, flowerOnLeafChance: .86, bloomDuration: 7.5, flowerSpread: 1,
  windStrength: .72, windScale: 5.2, windDrift: .17, branchWind: .72, leafWind: 1.35, gustDetail: .48,
  guidanceStrength: .14, guidanceRadius: 180, fieldOpacity: .32,
  fractalLevels: 8, fractalChildren: 2, fractalAngle: .72, fractalShrink: .72, fractalLength: 170,
  stemHue: 122, leafHue: 82, flowerHue: 326,
};

const PRESETS: Record<string, Settings> = {
  "Climbing Ivy": DEFAULTS,
  "Classic Binary": { ...DEFAULTS, splitChance: .09, averageChildren: 2, childVariance: 0, directionalSpread: .25, angleVariance: .08, chaos: 0, curvatureVariance: 0, internodeLeaves: .015, windStrength: .16 },
  "Radial Bramble": { ...DEFAULTS, splitChance: .105, averageChildren: 2.7, childVariance: .9, directionalSpread: .94, angleVariance: .8, upwardBias: .05, chaos: .78, terminationChance: .025, leafSize: 7, maximumDepth: 1200 },
  "Wind Garden": { ...DEFAULTS, growthRate: 6.8, directionalSpread: .48, chaos: .62, curvatureMemory: .95, windStrength: 1.8, windScale: 3.1, windDrift: .34, branchWind: 1.35, leafWind: 2.2, gustDetail: 1.4, internodeLeaves: .06 },
  "Hairline Nebula": { ...DEFAULTS, segmentLength: .72, maximumDepth: 1600, splitChance: .058, averageChildren: 2.3, childVariance: .65, terminationChance: .009, directionalSpread: .72, chaos: 1.25, curvatureMemory: .97, curvatureVariance: .6, baseThickness: .2, thickeningRate: .32, saturationWidth: 2.5, terminalLeaves: .32, internodeLeaves: .004, windStrength: .45 },
};

const GROUPS: Array<{ title: string; controls: SliderSpec[] }> = [
  { title: "Growth clock", controls: [
    { key: "growthRate", label: "Growth rate", min: .5, max: 24, step: .1, suffix: " Hz" },
    { key: "segmentLength", label: "Segment length", min: .25, max: 3.5, step: .01 },
    { key: "lengthVariance", label: "Length variance", min: 0, max: 1.5, step: .01 },
    { key: "maximumDepth", label: "Maximum lineage depth", min: 40, max: 4000, step: 10, suffix: " steps" },
    { key: "decimationInterval", label: "Near-tip decimation interval", min: 2, max: 16, step: 1, suffix: " steps" },
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
  { title: "Leaves & blossoms", controls: [
    { key: "terminalLeaves", label: "Terminal leaf chance", min: 0, max: 1, step: .01 },
    { key: "internodeLeaves", label: "Internode leaf chance", min: 0, max: .25, step: .001 },
    { key: "leafSize", label: "Leaf / flower size", min: 1, max: 28, step: .5, suffix: " px" },
    { key: "leafVariance", label: "Leaf variance", min: 0, max: 1.5, step: .01 },
    { key: "leafGrowthDuration", label: "Leaf growth time", min: .1, max: 30, step: .1, suffix: " s" },
    { key: "flowerChance", label: "Flower bud chance", min: 0, max: 1, step: .01 },
    { key: "flowerOnLeafChance", label: "Flowers on leaf nodes", min: 0, max: 1, step: .01 },
    { key: "bloomDuration", label: "Bloom duration", min: .2, max: 30, step: .1, suffix: " s" },
    { key: "flowerSpread", label: "Petal spread", min: .2, max: 1.8, step: .01 },
  ]},
  { title: "Invisible wind", controls: [
    { key: "windStrength", label: "Wind strength", min: 0, max: 3, step: .01 },
    { key: "windScale", label: "Field scale", min: .4, max: 18, step: .1 },
    { key: "windDrift", label: "Horizontal drift", min: -.8, max: .8, step: .01 },
    { key: "branchWind", label: "Branch response", min: 0, max: 2.5, step: .01 },
    { key: "leafWind", label: "Leaf response", min: 0, max: 4, step: .01 },
    { key: "gustDetail", label: "Lead wiggle", min: 0, max: 2.5, step: .01 },
  ]},
  { title: "Sunlight & shade", controls: [
    { key: "guidanceStrength", label: "Tropic response", min: 0, max: 1.5, step: .005 },
    { key: "guidanceRadius", label: "Field brush radius", min: 40, max: 420, step: 1, suffix: " px" },
    { key: "fieldOpacity", label: "Field visibility", min: 0, max: 1, step: .01 },
  ]},
  { title: "Pigment", controls: [
    { key: "stemHue", label: "Stem hue", min: 0, max: 360, step: 1, suffix: "°" },
    { key: "leafHue", label: "Leaf hue", min: 0, max: 360, step: 1, suffix: "°" },
    { key: "flowerHue", label: "Flower hue", min: 0, max: 360, step: 1, suffix: "°" },
  ]},
];

const GEOMETRIC_GROUPS: Array<{ title: string; controls: SliderSpec[] }> = [
  { title: "Recursive geometry", controls: [
    { key: "fractalLevels", label: "Recursive levels", min: 2, max: 11, step: 1 },
    { key: "fractalChildren", label: "Children per split", min: 2, max: 4, step: 1 },
    { key: "fractalAngle", label: "Branching angle", min: .08, max: 1.45, step: .01 },
    { key: "fractalShrink", label: "Length ratio", min: .48, max: .86, step: .01 },
    { key: "fractalLength", label: "Trunk length", min: 50, max: 320, step: 1, suffix: " px" },
  ]},
  { title: "Drawing", controls: [
    { key: "growthRate", label: "Reveal rate", min: .5, max: 24, step: .1 },
    { key: "baseThickness", label: "Twig width", min: .1, max: 3, step: .05, suffix: " px" },
    { key: "saturationWidth", label: "Trunk width", min: .5, max: 20, step: .1, suffix: " px" },
    { key: "leafSize", label: "Terminal leaf size", min: 1, max: 28, step: .5, suffix: " px" },
    { key: "stemHue", label: "Stem hue", min: 0, max: 360, step: 1, suffix: "°" },
    { key: "leafHue", label: "Leaf hue", min: 0, max: 360, step: 1, suffix: "°" },
  ]},
];

const baseGenome = (): VineGenome => ({ id: 0, weight: 1, split: 1, children: 0, termination: 1, spread: 0, angle: 1, chaos: 1, curve: 1, length: 1, leaves: 1, flowers: 1, size: 1, stemHue: 0, leafHue: 0, flowerHue: 0 });
const makeForest = (seed: number): Forest => ({ nodes: [], visibleNodeIds: new Set(), tips: [], ornaments: [], roots: [], genomes: [baseGenome()], protectedNodes: new Set(), random: mulberry32(seed), seed, frame: 0 });

function VineSlider({ spec, value, onChange }: { spec: SliderSpec; value: number; onChange: (value: number) => void }) {
  const digits = spec.step < .01 ? 3 : spec.step < 1 ? 2 : 0;
  return <label className="vine-slider"><span>{spec.label}<output>{value.toFixed(digits)}{spec.suffix ?? ""}</output></span><input aria-label={spec.label} type="range" min={spec.min} max={spec.max} step={spec.step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function FractalVines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(DEFAULTS);
  const forestRef = useRef<Forest>(makeForest(2401));
  const guidanceSourcesRef = useRef<GuidanceSource[]>([]);
  const guidanceEnabledRef = useRef(false);
  const fieldToolRef = useRef<"plant" | "sunlight" | "shade">("sunlight");
  const viewModeRef = useRef<"vines" | "geometric">("vines");
  const fieldDrawingRef = useRef(false);
  const lastFieldPointRef = useRef<{ x: number; y: number } | null>(null);
  const pausedRef = useRef(false);
  const timeRef = useRef(0);
  const fractalStartRef = useRef(0);
  const totalPrunedRef = useRef(0);
  const [settings, setSettings] = useState(DEFAULTS);
  const [seed, setSeed] = useState(2401);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [guidanceEnabled, setGuidanceEnabled] = useState(false);
  const [fieldTool, setFieldTool] = useState<"plant" | "sunlight" | "shade">("sunlight");
  const [mutationBasis, setMutationBasis] = useState<Settings | null>(null);
  const [mutationReach, setMutationReach] = useState(.18);
  const [bouquetMix, setBouquetMix] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"vines" | "geometric">("vines");
  const [preset, setPreset] = useState("Climbing Ivy");
  const [status, setStatus] = useState({ nodes: 0, tips: 0, leaves: 0, flowers: 0, depth: 0, wind: 0, merged: 0 });

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { guidanceEnabledRef.current = guidanceEnabled; }, [guidanceEnabled]);
  useEffect(() => { fieldToolRef.current = fieldTool; }, [fieldTool]);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);

  const plantRoot = useCallback((x = .5, y = .94, heading = -Math.PI / 2, genome = 0) => {
    const forest = forestRef.current;
    const id = forest.nodes.length;
    forest.nodes.push({ id, parent: -1, x, y, heading, birth: timeRef.current, depth: 0, generation: 0, genome, createdFrame: forest.frame, retired: false });
    forest.tips.push({ node: id, heading, curvature: 0, run: 0, generation: 0, genome });
    forest.roots.push(id);
    forest.protectedNodes.add(id);
    forest.visibleNodeIds.add(id);
  }, []);

  const reset = useCallback((nextSeed = seed) => {
    forestRef.current = makeForest(nextSeed);
    timeRef.current = 0;
    fractalStartRef.current = 0;
    totalPrunedRef.current = 0;
    setBouquetMix([]);
    plantRoot(.5, .93, -Math.PI / 2);
  }, [plantRoot, seed]);

  useEffect(() => { reset(seed); }, [reset, seed]);

  const loadPreset = (name: string) => {
    setSettings(PRESETS[name]);
    setPreset(name);
    setTimeout(() => reset(seed), 0);
  };

  const randomize = () => {
    const next = { ...(mutationBasis ?? settings) };
    for (const group of [...GROUPS, ...GEOMETRIC_GROUPS]) for (const control of group.controls) {
      const value = mutationBasis
        ? clamp(mutationBasis[control.key] + (Math.random() + Math.random() - 1) * (control.max - control.min) * mutationReach, control.min, control.max)
        : control.min + (control.max - control.min) * Math.random();
      (next[control.key] as number) = Math.round(value / control.step) * control.step;
    }
    if (!randomizedFlowersEnabled(Math.random)) next.flowerChance = 0;
    setSettings(next);
    setPreset("Wild cutting");
    setTimeout(() => reset(seed), 0);
  };

  const plantBouquet = () => {
    const bouquetBase = mutationBasis ?? settings;
    const forest = makeForest(seed);
    const flowersEnabled = randomizedFlowersEnabled(forest.random);
    const bouquetSettings = { ...bouquetBase, flowerChance: flowersEnabled ? bouquetBase.flowerChance : 0 };
    settingsRef.current = bouquetSettings;
    setSettings(bouquetSettings);
    const signed = (amount: number) => (forest.random() + forest.random() - 1) * amount;
    const reach = mutationReach;
    const rawWeights = Array.from({ length: 3 }, () => .18 + forest.random());
    const totalWeight = rawWeights.reduce((sum, value) => sum + value, 0);
    forest.genomes = rawWeights.map((weight, id) => ({
      id,
      weight: weight / totalWeight,
      split: clamp(1 + signed(reach * 2.8), .2, 2.4),
      children: signed(reach * 4.5),
      termination: clamp(1 + signed(reach * 3.2), .12, 2.7),
      spread: signed(reach),
      angle: clamp(1 + signed(reach * 3), .18, 2.4),
      chaos: clamp(1 + signed(reach * 3.6), .12, 2.8),
      curve: clamp(1 + signed(reach * 3.1), .15, 2.6),
      length: clamp(1 + signed(reach * 1.8), .35, 1.8),
      leaves: clamp(1 + signed(reach * 3.2), .12, 2.8),
      flowers: clamp(1 + signed(reach * 4), .08, 3),
      size: clamp(1 + signed(reach * 2), .35, 1.8),
      stemHue: signed(360 * reach),
      leafHue: signed(360 * reach),
      flowerHue: signed(360 * reach),
    }));
    forestRef.current = forest;
    timeRef.current = 0;
    totalPrunedRef.current = 0;
    const sprouts = 10 + Math.floor(forest.random() * 9);
    for (let sprout = 0; sprout < sprouts; sprout++) {
      const roll = forest.random();
      let genome = 0;
      let cumulative = 0;
      for (const candidate of forest.genomes) { cumulative += candidate.weight; if (roll <= cumulative) { genome = candidate.id; break; } }
      const x = .1 + forest.random() * .8;
      const y = .82 + forest.random() * .15;
      const heading = -Math.PI / 2 + signed(.46);
      plantRoot(x, y, heading, genome);
    }
    setBouquetMix(forest.genomes.map((genome) => genome.weight));
    setPreset("Three-species bouquet");
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
    const guidanceLayer = document.createElement("canvas");
    let guidanceStamp = -1;
    let guidanceOpacity = -1;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const density = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * density));
      canvas.height = Math.max(1, Math.round(bounds.height * density));
      context.setTransform(density, 0, 0, density, 0, 0);
      guidanceStamp = -1;
    };
    resize();
    addEventListener("resize", resize);

    const sproutOrnament = (forest: Forest, node: number, size: number, angle: number, s: Settings) => {
      const genome = forest.genomes[forest.nodes[node]?.genome ?? 0] ?? forest.genomes[0];
      const flower = forest.random() < clamp(s.flowerChance * genome.flowers, 0, 1);
      const sharesLeaf = !flower || forest.random() < s.flowerOnLeafChance;
      if (sharesLeaf) forest.ornaments.push({ node, size, angle, birth: timeRef.current, kind: "leaf" });
      if (flower) forest.ornaments.push({ node, size: size * (.78 + forest.random() * .3), angle: angle + (forest.random() * 2 - 1) * .45, birth: timeRef.current, kind: "flower" });
      if (sharesLeaf || flower) forest.protectedNodes.add(node);
    };

    const terminate = (tip: Tip, terminal = true) => {
      const forest = forestRef.current;
      const settingsNow = settingsRef.current;
      const genome = forest.genomes[tip.genome] ?? forest.genomes[0];
      if (terminal && forest.random() < clamp(settingsNow.terminalLeaves * genome.leaves, 0, 1)) {
        sproutOrnament(forest, tip.node, .5 + forest.random(), forest.random() * Math.PI * 2, settingsNow);
      }
    };

    const grow = () => {
      const forest = forestRef.current;
      const s = settingsRef.current;
      if (!forest.tips.length || forest.nodes.length >= 60000) return;
      const nextTips: Tip[] = [];
      for (const tip of forest.tips) {
        const parent = forest.nodes[tip.node];
        if (parent.depth >= s.maximumDepth || forest.nodes.length >= 60000) { terminate(tip, true); continue; }
        const genome = forest.genomes[tip.genome] ?? forest.genomes[0];
        const randomTurn = (forest.random() * 2 - 1) * s.curvatureVariance * genome.curve * s.chaos * genome.chaos;
        tip.curvature = tip.curvature * s.curvatureMemory + randomTurn * (1 - s.curvatureMemory + .025);
        const upwardDelta = Math.atan2(Math.sin(-Math.PI / 2 - tip.heading), Math.cos(-Math.PI / 2 - tip.heading));
        tip.heading += tip.curvature + upwardDelta * s.upwardBias * .035;
        if (guidanceEnabledRef.current && guidanceSourcesRef.current.length) {
          const guidance = guidanceVector(parent.x, parent.y, guidanceSourcesRef.current, s.guidanceStrength);
          const magnitude = Math.hypot(guidance.x, guidance.y);
          if (magnitude > 1e-5) {
            const target = Math.atan2(guidance.y, guidance.x);
            const turn = Math.atan2(Math.sin(target - tip.heading), Math.cos(target - tip.heading));
            tip.heading += turn * clamp(magnitude * .045, 0, .08);
          }
        }
        const length = .0095 * s.segmentLength * genome.length * Math.max(.15, 1 + (forest.random() * 2 - 1) * s.lengthVariance);
        const x = parent.x + Math.cos(tip.heading) * length;
        const y = parent.y + Math.sin(tip.heading) * length;
        if (x < -.12 || x > 1.12 || y < -.14 || y > 1.08) { terminate(tip, true); continue; }
        const id = forest.nodes.length;
        const node: VineNode = { id, parent: parent.id, x, y, heading: tip.heading, birth: timeRef.current, depth: parent.depth + 1, generation: tip.generation, genome: tip.genome, createdFrame: forest.frame, retired: false };
        forest.nodes.push(node);
        forest.visibleNodeIds.add(id);
        if (shouldDecimatePrevious(node.depth, s.decimationInterval, parent, forest.frame, forest.protectedNodes.has(parent.id))) {
          node.parent = parent.parent;
          parent.retired = true;
          forest.visibleNodeIds.delete(parent.id);
          totalPrunedRef.current++;
        }
        const run = tip.run + 1;
        if (forest.random() < clamp(s.internodeLeaves * genome.leaves, 0, 1)) sproutOrnament(forest, id, .5 + forest.random(), tip.heading + (forest.random() * 2 - 1) * 1.8, s);
        const canChange = run >= s.minimumRun;
        if (canChange && forest.random() < clamp(s.splitChance * genome.split, 0, 1)) {
          const count = sampleChildCount(clamp(s.averageChildren + genome.children, 1, 7), s.childVariance, forest.random);
          if (count > 1) forest.protectedNodes.add(id);
          for (let child = 0; child < count; child++) {
            nextTips.push({ node: id, heading: childHeading(tip.heading, child, count, clamp(s.directionalSpread + genome.spread, 0, 1), s.angleVariance * genome.angle, forest.random), curvature: tip.curvature * .3, run: 0, generation: tip.generation + 1, genome: tip.genome });
          }
        } else if (canChange && forest.random() < clamp(s.terminationChance * genome.termination, 0, 1)) {
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

    const drawGeometricTree = (width: number, height: number, now: number, s: Settings) => {
      type Branch = { x: number; y: number; length: number; angle: number; level: number; generation: number };
      const children = Math.round(s.fractalChildren);
      const requestedLevels = Math.round(s.fractalLevels);
      const limit = 14000;
      const branchCount = (levels: number) => children === 1 ? levels + 1 : (children ** (levels + 1) - 1) / (children - 1);
      let levels = requestedLevels;
      while (levels > 2 && branchCount(levels) > limit) levels--;
      const reveal = Math.max(1, Math.floor((now - fractalStartRef.current) * s.growthRate * 42));
      const stack: Branch[] = [{ x: width * .5, y: height * .95, length: s.fractalLength, angle: -Math.PI / 2, level: levels, generation: 0 }];
      let visited = 0;
      let drawn = 0;
      let terminals = 0;
      context.lineCap = "round";
      while (stack.length && visited < limit) {
        const branch = stack.pop()!;
        visited++;
        const endX = branch.x + Math.cos(branch.angle) * branch.length;
        const endY = branch.y + Math.sin(branch.angle) * branch.length;
        if (visited <= reveal) {
          const maturity = branch.level / Math.max(1, levels);
          context.strokeStyle = `hsl(${s.stemHue + branch.generation * 8} 58% ${38 + branch.generation * 2.5}%)`;
          context.lineWidth = s.baseThickness + (s.saturationWidth - s.baseThickness) * maturity * maturity;
          context.beginPath(); context.moveTo(branch.x, branch.y); context.lineTo(endX, endY); context.stroke();
          drawn++;
        }
        if (branch.level <= 0) {
          if (visited <= reveal) {
            context.save();
            context.translate(endX, endY);
            context.rotate(branch.angle);
            context.fillStyle = `hsl(${s.leafHue} 78% 55%)`;
            context.beginPath(); context.ellipse(s.leafSize * .55, 0, s.leafSize * .55, s.leafSize * .2, 0, 0, Math.PI * 2); context.fill();
            context.restore();
            terminals++;
          }
          continue;
        }
        for (let child = children - 1; child >= 0; child--) {
          const centered = children === 1 ? 0 : child / (children - 1) - .5;
          stack.push({ x: endX, y: endY, length: branch.length * s.fractalShrink, angle: branch.angle + centered * s.fractalAngle * 2, level: branch.level - 1, generation: branch.generation + 1 });
        }
      }
      return { nodes: drawn, tips: terminals, leaves: terminals, depth: levels, truncated: visited >= limit };
    };

    const draw = (nowMs: number) => {
      const dt = Math.min(.05, (nowMs - last) / 1000);
      last = nowMs;
      const s = settingsRef.current;
      const forest = forestRef.current;
      forest.frame++;
      if (!pausedRef.current) {
        timeRef.current += dt;
        if (viewModeRef.current === "vines") {
          growthAccumulator += dt * s.growthRate;
          const updates = Math.min(5, Math.floor(growthAccumulator));
          if (updates > 0) growthAccumulator -= updates;
          for (let update = 0; update < updates; update++) grow();
        }
      }
      const time = timeRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const displayed = new Map<number, { x: number; y: number }>();
      for (const id of forest.visibleNodeIds) displayed.set(id, displaced(forest.nodes[id], time));

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

      if (viewModeRef.current === "geometric") {
        const metrics = drawGeometricTree(width, height, time, s);
        statusClock += dt;
        if (statusClock > .22) {
          statusClock = 0;
          setStatus({ nodes: metrics.nodes, tips: metrics.tips, leaves: metrics.leaves, flowers: 0, depth: metrics.depth, wind: 0, merged: 0 });
        }
        animation = requestAnimationFrame(draw);
        return;
      }

      if (guidanceEnabledRef.current && s.fieldOpacity > 0) {
        if (guidanceStamp !== guidanceSourcesRef.current.length || guidanceOpacity !== s.fieldOpacity || guidanceLayer.width !== Math.round(width) || guidanceLayer.height !== Math.round(height)) {
          guidanceLayer.width = Math.max(1, Math.round(width));
          guidanceLayer.height = Math.max(1, Math.round(height));
          const layerContext = guidanceLayer.getContext("2d");
          layerContext?.clearRect(0, 0, width, height);
          if (layerContext) for (const source of guidanceSourcesRef.current) {
            const radius = source.radius * width;
            const gradient = layerContext.createRadialGradient(source.x * width, source.y * height, 0, source.x * width, source.y * height, radius);
            const color = source.polarity > 0 ? `246,225,80` : `74,55,122`;
            gradient.addColorStop(0, `rgba(${color},${s.fieldOpacity * .34})`);
            gradient.addColorStop(.58, `rgba(${color},${s.fieldOpacity * .13})`);
            gradient.addColorStop(1, `rgba(${color},0)`);
            layerContext.fillStyle = gradient;
            layerContext.beginPath(); layerContext.arc(source.x * width, source.y * height, radius, 0, Math.PI * 2); layerContext.fill();
          }
          guidanceStamp = guidanceSourcesRef.current.length;
          guidanceOpacity = s.fieldOpacity;
        }
        context.drawImage(guidanceLayer, 0, 0, width, height);
      }

      context.lineCap = "round";
      context.lineJoin = "round";
      for (const id of forest.visibleNodeIds) {
        const node = forest.nodes[id];
        if (node.parent < 0) continue;
        const parent = forest.nodes[node.parent];
        const a = displayed.get(parent.id);
        const b = displayed.get(node.id);
        if (!a || !b) continue;
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
        const genome = forest.genomes[node.genome] ?? forest.genomes[0];
        const taper = Math.max(.35, Math.pow(.91, node.generation));
        context.lineWidth = logarithmicThickness(age, s.baseThickness, s.thickeningRate, s.saturationWidth) * genome.size * taper * clamp(scale / 700, .72, 1.4);
        const light = clamp(39 + node.generation * 2.4, 36, 62);
        context.strokeStyle = `hsl(${s.stemHue + genome.stemHue + node.generation * 4} 52% ${light}%)`;
        context.stroke();
      }

      for (const ornament of forest.ornaments) {
        const node = forest.nodes[ornament.node];
        const point = displayed.get(ornament.node);
        if (!node || !point) continue;
        const wind = windVector(node.x, node.y, time, forest.seed + 991, s.windScale * 1.17, s.windDrift);
        const genome = forest.genomes[node.genome] ?? forest.genomes[0];
        const flutter = wind.x * s.windStrength * s.leafWind + Math.sin(time * (2.2 + s.gustDetail) + node.id) * .3 * s.leafWind;
        const growth = .12 + .88 * bloomProgress(time - ornament.birth, s.leafGrowthDuration);
        const size = s.leafSize * genome.size * Math.max(.18, ornament.size * (1 + (ornament.size - .9) * s.leafVariance)) * growth;
        context.save();
        context.translate(point.x * width + wind.x * s.leafWind * s.windStrength * 2.5, point.y * height + wind.y * s.leafWind * s.windStrength * 2);
        context.rotate(ornament.angle + flutter * .22);
        if (ornament.kind === "flower") {
          const progress = bloomProgress(time - ornament.birth, s.bloomDuration);
          const leafHue = s.leafHue + genome.leafHue;
          const flowerHue = s.flowerHue + genome.flowerHue;
          const hueDistance = ((flowerHue - leafHue + 540) % 360) - 180;
          const hue = leafHue + hueDistance * progress;
          context.fillStyle = `hsl(${hue + flutter * 4} ${72 + progress * 20}% ${48 + progress * 12}%)`;
          for (let petal = 0; petal < 5; petal++) {
            context.save();
            context.rotate(petal / 5 * Math.PI * 2 * progress * s.flowerSpread);
            context.beginPath();
            context.ellipse(size * .68, 0, size * .72, size * (.22 + progress * .12), 0, 0, Math.PI * 2);
            context.fill();
            context.restore();
          }
          context.fillStyle = `hsl(${45 + progress * 12} 90% ${38 + progress * 18}%)`;
          context.beginPath(); context.arc(0, 0, size * (.12 + progress * .12), 0, Math.PI * 2); context.fill();
        } else {
          context.fillStyle = `hsl(${s.leafHue + genome.leafHue + flutter * 9} 74% ${48 + clamp(ornament.size * 8, 0, 12)}%)`;
          context.beginPath();
          context.ellipse(size * 1.35, 0, size * 1.35, size * .48, 0, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = `hsla(${s.stemHue + genome.stemHue} 55% 28% / .75)`;
          context.lineWidth = 1;
          context.beginPath(); context.moveTo(0, 0); context.lineTo(size * 2.45, 0); context.stroke();
        }
        context.restore();
      }

      for (const tip of forest.tips) {
        const point = displayed.get(tip.node);
        if (!point) continue;
        const pulse = 2.5 + Math.sin(time * 4 + tip.node) * 1.2;
        const genome = forest.genomes[tip.genome] ?? forest.genomes[0];
        context.fillStyle = `hsla(${s.leafHue + genome.leafHue + 28} 100% 76% / .72)`;
        context.beginPath(); context.arc(point.x * width, point.y * height, pulse, 0, Math.PI * 2); context.fill();
      }

      statusClock += dt;
      if (statusClock > .22) {
        statusClock = 0;
        const wind = windVector(.5, .5, time, forest.seed, s.windScale, s.windDrift).x * s.windStrength;
        const flowers = forest.ornaments.reduce((count, ornament) => count + Number(ornament.kind === "flower"), 0);
        setStatus({ nodes: forest.visibleNodeIds.size, tips: forest.tips.length, leaves: forest.ornaments.length - flowers, flowers, depth: forest.nodes.reduce((max, node) => Math.max(max, node.depth), 0), wind, merged: totalPrunedRef.current });
      }
      animation = requestAnimationFrame(draw);
    };

    animation = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animation); removeEventListener("resize", resize); };
  }, []);

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / bounds.width, .02, .98);
    const y = clamp((event.clientY - bounds.top) / bounds.height, .02, .98);
    return { x, y, bounds };
  };

  const plantAtPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = pointerPosition(event);
    const heading = Math.atan2(.48 - y, .5 - x) + (forestRef.current.random() * 2 - 1) * .25;
    plantRoot(x, y, heading);
  };

  const paintGuidance = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y, bounds } = pointerPosition(event);
    const radius = settingsRef.current.guidanceRadius / Math.max(1, bounds.width);
    const previous = lastFieldPointRef.current;
    if (previous && Math.hypot(previous.x - x, previous.y - y) < radius * .16) return;
    guidanceSourcesRef.current.push({ x, y, radius, polarity: fieldToolRef.current === "sunlight" ? 1 : -1 });
    if (guidanceSourcesRef.current.length > 180) guidanceSourcesRef.current.splice(0, 20);
    lastFieldPointRef.current = { x, y };
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (viewModeRef.current === "geometric") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!guidanceEnabledRef.current || fieldToolRef.current === "plant") { plantAtPointer(event); return; }
    fieldDrawingRef.current = true;
    lastFieldPointRef.current = null;
    paintGuidance(event);
  };

  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (fieldDrawingRef.current) paintGuidance(event);
  };

  const finishPointer = () => { fieldDrawingRef.current = false; lastFieldPointRef.current = null; };

  const selectViewMode = (mode: "vines" | "geometric") => {
    viewModeRef.current = mode;
    setViewMode(mode);
    if (mode === "geometric") fractalStartRef.current = timeRef.current;
  };

  return <main className={`vine-page${hidden ? " controls-hidden" : ""}`}>
    <button className="vine-ui-toggle" onClick={() => setHidden((value) => !value)}>{hidden ? "Cultivate controls" : "Hide the greenhouse"}</button>
    <header className="vine-head">
      <Link href="/gallery">← Gallery</Link>
      <div><span className="eyebrow">Interactive Exhibit 34 · Generative Botany</span><h1>Fractal<br/>Vines</h1><p>A recursive family tree with loose morals. Grow straight mathematical branches, unruly vines, radial brambles, or something the wind invented.</p></div>
      <span className="vine-seed">CUTTING<br/><b>{seed}</b></span>
    </header>
    <nav className="vine-tabs" aria-label="Fractal Vines modes"><button className={viewMode === "vines" ? "active" : ""} onClick={() => selectViewMode("vines")}>Stochastic vines</button><button className={viewMode === "geometric" ? "active" : ""} onClick={() => selectViewMode("geometric")}>Geometric tree fractals</button></nav>
    <section className="vine-console">
      <div className="vine-stage"><canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} aria-label={viewMode === "vines" ? "Interactive wind-tossed fractal vine growth field. Plant cuttings or paint attractive sunlight and repulsive shade." : "Pure geometric tree fractal growing through recursive straight-line splits."}/><div className="vine-telemetry"><span>NODES <b>{status.nodes}</b></span><span>LEADS <b>{status.tips}</b></span><span>LEAVES <b>{status.leaves}</b></span><span>FLOWERS <b>{status.flowers}</b></span><span>DEPTH <b>{status.depth}</b></span><span>DECIMATED <b>{status.merged}</b></span><span>WIND <b>{status.wind.toFixed(2)}</b></span></div><p>{viewMode === "geometric" ? "A deterministic branching law, revealed one segment at a time." : guidanceEnabled ? fieldTool === "plant" ? "Tap to plant another cutting." : `Draw ${fieldTool}.` : "Tap the field to plant another cutting."}</p></div>
      <aside className="vine-controls">
        {viewMode === "vines" ? <>
          <div className="vine-actions"><button className="primary" onClick={() => setPaused((value) => !value)}>{paused ? "Resume growth" : "Pause growth"}</button><button onClick={() => reset(seed)}>Regrow</button><button onClick={() => { const next = Math.floor(Math.random() * 999999); setSeed(next); setPreset("New cutting"); }}>New cutting</button><button onClick={randomize}>{mutationBasis ? "Mutate descendant" : "Scramble lineage"}</button><button className="bouquet" onClick={plantBouquet}>Plant three-species bouquet</button></div>
          {bouquetMix.length > 0 && <div className="vine-bouquet"><b>Bouquet mixture</b>{bouquetMix.map((weight, index) => <span key={index} style={{ "--species": index } as CSSProperties}>Species {String.fromCharCode(65 + index)} <output>{Math.round(weight * 100)}%</output></span>)}</div>}
          <div className={`vine-mutation${mutationBasis ? " locked" : ""}`}><div><b>{mutationBasis ? "Mutation parent locked" : "Unbounded scrambling"}</b><button onClick={() => setMutationBasis((basis) => basis ? null : { ...settings })}>{mutationBasis ? "Release parent" : "Lock current as parent"}</button></div><label><span>Mutation distance <output>{Math.round(mutationReach * 100)}%</output></span><input aria-label="Mutation distance" type="range" min="0.01" max="0.5" step="0.01" value={mutationReach} onChange={(event) => setMutationReach(Number(event.target.value))} /></label><p>{mutationBasis ? "Each descendant and bouquet species varies around the captured parent; the parent itself remains unchanged." : "Scramble Lineage samples the complete control bank; Bouquet uses this same mutation distance."}</p></div>
          <div className="vine-guidance"><label><input type="checkbox" checked={guidanceEnabled} onChange={(event) => setGuidanceEnabled(event.target.checked)} /><span>Sunlight & shade guidance</span></label><div><button className={fieldTool === "sunlight" ? "active sun" : ""} onClick={() => setFieldTool("sunlight")}>Draw sunlight</button><button className={fieldTool === "shade" ? "active shade" : ""} onClick={() => setFieldTool("shade")}>Draw shade</button><button className={fieldTool === "plant" ? "active" : ""} onClick={() => setFieldTool("plant")}>Plant cutting</button><button onClick={() => { guidanceSourcesRef.current = []; }}>Clear field</button></div></div>
          <div className="vine-presets">{Object.keys(PRESETS).map((name) => <button key={name} className={preset === name ? "active" : ""} onClick={() => loadPreset(name)}>{name}</button>)}</div>
        </> : <div className="vine-actions geometric"><button className="primary" onClick={() => setPaused((value) => !value)}>{paused ? "Resume drawing" : "Pause drawing"}</button><button onClick={() => { fractalStartRef.current = timeRef.current; }}>Redraw fractal</button><button className="bouquet" onClick={randomize}>Scramble geometry</button></div>}
        {(viewMode === "vines" ? GROUPS : GEOMETRIC_GROUPS).map((group, index) => <details key={group.title} open={index < 2}><summary>{group.title}</summary><div className="vine-grid">{group.controls.map((spec) => <VineSlider key={spec.key} spec={spec} value={settings[spec.key]} onChange={(value) => { setSettings((current) => ({ ...current, [spec.key]: value })); setPreset("Hand-trained"); }} />)}</div></details>)}
        {viewMode === "vines" ? <p className="vine-note"><b>Chaos</b> interpolates from geometric recursion toward correlated wandering. <b>Directional spread</b> opens one traveling line into a fan and finally a radial thicket. New samples are always drawn once, then eligible leafless non-fork points are collapsed only while they remain beside the active lead; mature geometry is never revisited. Five-petal buds usually share an existing leaf node, while every full scramble and bouquet flips a fair coin for flowers at all. Bouquet species use the exact Mutation Distance setting. Optional broad sunlight gently suggests a heading while shade repels it.</p> : <p className="vine-note">This tab removes stochastic topology entirely. Every straight branch obeys the same child count, angular spacing, and length ratio, producing the classic deterministic tree-fractal family while the reveal clock draws its construction in order.</p>}
      </aside>
    </section>
  </main>;
}
