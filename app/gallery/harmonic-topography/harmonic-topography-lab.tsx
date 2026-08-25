"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  chordPitchClasses, chooseMelodyNote, chooseVoicing, CompositionEngine, createNodes,
  DEFAULT_PALETTES, DEFAULT_ROUTES, layoutNodeGroups, melodyCandidates, midiToFrequency, nearestScaleIndex, QUALITY_TENSION,
  scalePool, SCALES, SECTION_CENTERS, SeededRandom,
  type ChordQuality, type EngineControls, type HarmonicEvent, type HarmonicNode, type MelodyCandidate,
  type ScaleId, type SectionId,
} from "./harmonic-engine";

type Track = "chords" | "lead" | "harmony1" | "harmony2" | "bass" | "shaker" | "hat" | "pulse" | "snare";
type MixChannel = { gain: number; mute: boolean; solo: boolean };
type ScheduledEvent = { event: HarmonicEvent; start: number; duration: number; melodyNote: number; candidates: MelodyCandidate[] };
type SynthControls = {
  longNoteChance: number; portamentoChance: number; vibratoChance: number; pwmChance: number; pwmDepth: number;
  octaveJump: number; chordAttraction: number; harmonyFreedom: number; leadDecay: number;
  snareChance: number; bassPatternMemory: number;
};
type TerrainControls = { sigma: number; height: number; contours: number; trail: number };

const TRACKS: Array<{ id: Track; label: string; gain: number }> = [
  { id: "chords", label: "Chord bed", gain: .66 }, { id: "lead", label: "Lead", gain: .76 },
  { id: "harmony1", label: "Harmony 1", gain: .48 }, { id: "harmony2", label: "Harmony 2", gain: .38 },
  { id: "bass", label: "Bass", gain: .72 }, { id: "shaker", label: "Shaker", gain: .5 },
  { id: "hat", label: "32nd hat", gain: .43 }, { id: "pulse", label: "Pulse", gain: .52 },
  { id: "snare", label: "Snare", gain: .62 },
];
const SECTION_IDS: SectionId[] = ["INTRO", "VERSE", "CHORUS", "BRIDGE"];
const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const QUALITY_LABEL: Record<ChordQuality | "alt", string> = { maj: "", min: "m", dim: "dim", dim7: "dim7", sus4: "sus4", "6": "6", "69": "6/9", maj7: "maj7", "7": "7", "9": "9", "11": "11", "13": "13", "7b9": "7b9", "7#9": "7#9", m7: "m7", m9: "m9", alt: "7alt" };
type ChordSeed = [number, ChordQuality | "alt"];
type ArchitecturePreset = { id: string; label: string; note: string; groups: Record<SectionId, ChordSeed[]> };
const seed = (root: number, quality: ChordQuality | "alt"): ChordSeed => [root, quality];
const makeChordSeed = seed;
const ARCHITECTURE_PRESETS: ArchitecturePreset[] = [
  { id: "chopin-em", label: "Chopin · Prelude in E minor", note: "Descending minor gravity, diminished hinges, and dominant-b9 return.", groups: { INTRO: [seed(4,"min"),seed(0,"maj7"),seed(9,"m7"),seed(11,"7b9")], VERSE: [seed(4,"min"),seed(9,"min"),seed(2,"7"),seed(7,"maj7"),seed(0,"maj7"),seed(6,"dim7"),seed(11,"7b9")], CHORUS: [seed(7,"maj7"),seed(0,"maj7"),seed(6,"dim7"),seed(11,"7"),seed(4,"min"),seed(9,"m7"),seed(11,"7b9")], BRIDGE: [seed(0,"maj7"),seed(9,"min"),seed(6,"dim7"),seed(11,"7b9")] } },
  { id: "wild-rose", label: "To a Wild Rose", note: "Open diatonic warmth, plagal motion, and patient six chords.", groups: { INTRO: [seed(4,"maj"),seed(9,"maj"),seed(4,"6"),seed(11,"7")], VERSE: [seed(4,"maj"),seed(8,"min"),seed(9,"maj"),seed(6,"m7"),seed(11,"7"),seed(4,"maj")], CHORUS: [seed(1,"m7"),seed(6,"7"),seed(11,"m7"),seed(4,"7"),seed(9,"maj"),seed(11,"7")], BRIDGE: [seed(0,"maj7"),seed(6,"m7"),seed(11,"7"),seed(4,"6")] } },
  { id: "rhapsody-blue", label: "Rhapsody in Blue", note: "Blue dominants, chromatic side-steps, and bright orchestral releases.", groups: { INTRO: [seed(10,"7"),seed(3,"7"),seed(10,"7"),seed(5,"7#9")], VERSE: [seed(10,"6"),seed(2,"7"),seed(7,"m7"),seed(0,"9"),seed(5,"m7"),seed(10,"13"),seed(3,"maj7"),seed(8,"7")], CHORUS: [seed(1,"7"),seed(0,"7"),seed(10,"7"),seed(3,"9"),seed(8,"13"),seed(7,"7"),seed(0,"7"),seed(5,"7#9")], BRIDGE: [seed(6,"m7"),seed(11,"7"),seed(4,"maj7"),seed(0,"7#9"),seed(5,"7")] } },
  { id: "entertainer", label: "The Entertainer", note: "Ragtime circle motion, diminished connectors, and crisp dominant resets.", groups: { INTRO: [seed(0,"6"),seed(1,"dim7"),seed(2,"m7"),seed(7,"7")], VERSE: [seed(0,"6"),seed(9,"7"),seed(2,"7"),seed(7,"7"),seed(0,"6"),seed(4,"7"),seed(9,"7"),seed(2,"7")], CHORUS: [seed(5,"6"),seed(6,"dim7"),seed(0,"6"),seed(9,"7"),seed(2,"7"),seed(7,"7"),seed(0,"6")], BRIDGE: [seed(4,"7"),seed(9,"7"),seed(2,"7"),seed(7,"7")] } },
  { id: "nat-king-cole", label: "Nat King Cole · velvet changes", note: "An original vocal-jazz palette: close major sevenths, ii–V turns, and chromatic warmth—not a song transcription.", groups: { INTRO: [seed(5,"maj7"),seed(7,"m7"),seed(0,"9"),seed(5,"6")], VERSE: [seed(5,"maj7"),seed(9,"m7"),seed(2,"7b9"),seed(7,"m7"),seed(0,"13"),seed(5,"69")], CHORUS: [seed(10,"maj7"),seed(11,"m7"),seed(4,"9"),seed(9,"m7"),seed(2,"7b9"),seed(7,"m7"),seed(0,"13")], BRIDGE: [seed(8,"maj7"),seed(7,"m7"),seed(0,"9"),seed(5,"maj7")] } },
  { id: "louis-armstrong", label: "Louis Armstrong · hot-jazz changes", note: "An original traditional-jazz palette: brass-bright sixths, sturdy dominants, and bluesy turnarounds—not a song transcription.", groups: { INTRO: [seed(10,"6"),seed(3,"7"),seed(10,"6"),seed(5,"7")], VERSE: [seed(10,"6"),seed(3,"6"),seed(10,"7"),seed(3,"6"),seed(4,"dim7"),seed(5,"7"),seed(10,"6")], CHORUS: [seed(3,"6"),seed(8,"7"),seed(10,"6"),seed(7,"7"),seed(0,"7"),seed(5,"7"),seed(10,"6")], BRIDGE: [seed(2,"7"),seed(7,"7"),seed(0,"7"),seed(5,"7")] } },
];
const WORLD = { left: -4.25, right: 4.25, top: 3.2, bottom: -2.75 };
const TERRAIN_COLORS = ["#210f36", "#5b247a", "#e14c9a", "#ef6d3b", "#f6ca32", "#a9dd3f", "#32d6c3", "#3187d6"];
const DEFAULT_ENGINE: EngineControls = { familiarity: .76, breakoutChance: .22, runChance: .58, tensionBias: .008, melodyDensity: 1 };
const DEFAULT_SYNTH: SynthControls = { longNoteChance: .23, portamentoChance: .34, vibratoChance: .52, pwmChance: .62, pwmDepth: .14, octaveJump: .38, chordAttraction: 1, harmonyFreedom: .86, leadDecay: .32, snareChance: .84, bassPatternMemory: .78 };
const DEFAULT_TERRAIN: TerrainControls = { sigma: .48, height: 1, contours: 10, trail: 28 };
const DEFAULT_MIX = Object.fromEntries(TRACKS.map(x => [x.id, { gain: x.gain, mute: false, solo: false }])) as Record<Track, MixChannel>;
const cloneRoutes = () => structuredClone(DEFAULT_ROUTES);
const clonePalettes = () => structuredClone(DEFAULT_PALETTES);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const noteName = (midi: number) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
const nodeLabel = (root: number, quality: ChordQuality | "alt") => `${NOTE_NAMES[root]}${QUALITY_LABEL[quality]}`;
const nodesFromGroups = (groups: Record<SectionId, ChordSeed[]>) => layoutNodeGroups(Object.fromEntries(SECTION_IDS.map(section => [section, groups[section].map(([root, quality]) => ({ root, quality, label: nodeLabel(root, quality), tension: QUALITY_TENSION[quality] }))])) as Record<SectionId, Array<Pick<HarmonicNode, "root" | "label" | "quality" | "tension">>>);
const paletteForPreset = (id: string): Record<SectionId, Array<{ scale: ScaleId; weight: number }>> => {
  const pair = (a: ScaleId, b: ScaleId, weight = .7) => [{ scale: a, weight }, { scale: b, weight: 1 - weight }];
  if (id === "chopin-em") return { INTRO: pair("E natural minor", "G major", .82), VERSE: pair("E natural minor", "G major", .76), CHORUS: pair("G major", "E natural minor", .58), BRIDGE: pair("E natural minor", "C altered", .78) };
  if (id === "wild-rose") return { INTRO: pair("E major", "E major pentatonic", .9), VERSE: pair("E major", "E major pentatonic", .86), CHORUS: pair("E major", "E major pentatonic", .76), BRIDGE: pair("E major", "C altered", .8) };
  if (id === "rhapsody-blue") return { INTRO: pair("Bb blues", "Bb Mixolydian", .62), VERSE: pair("Bb Mixolydian", "Bb blues", .54), CHORUS: pair("Eb Mixolydian", "C blues", .58), BRIDGE: pair("Bb blues", "C altered", .67) };
  if (id === "entertainer") return { INTRO: pair("C major", "C blues", .86), VERSE: pair("C major", "F major", .68), CHORUS: pair("F major", "C major", .58), BRIDGE: pair("C major", "C altered", .82) };
  if (id === "nat-king-cole") return { INTRO: pair("F major", "Bb major", .72), VERSE: pair("F major", "Bb major", .65), CHORUS: pair("Bb major", "F major", .6), BRIDGE: pair("F major", "C altered", .76) };
  return { INTRO: pair("Bb major", "Bb blues", .68), VERSE: pair("Bb blues", "Eb major", .54), CHORUS: pair("Eb major", "Bb Mixolydian", .62), BRIDGE: pair("Bb blues", "C blues", .62) };
};

function Slider({ label, value, min, max, step, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; suffix?: string }) {
  const decimals = step < .01 ? 3 : step < 1 ? 2 : 0;
  return <label className="topo-slider"><span>{label}</span><output>{value.toFixed(decimals)}{suffix}</output><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}

export function HarmonicTopographyLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const engineRef = useRef<CompositionEngine | null>(null);
  const nextEventTimeRef = useRef(0);
  const queueRef = useRef<ScheduledEvent[]>([]);
  const activeRef = useRef<ScheduledEvent | null>(null);
  const previousVoicingRef = useRef<number[] | undefined>(undefined);
  const previousMelodyRef = useRef(74);
  const bassPatternRef = useRef<number[] | null>(null);
  const trailRef = useRef<Array<{ x: number; y: number }>>([]);
  const nodeDragRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const playingRef = useRef(false);
  const controlsRef = useRef(DEFAULT_ENGINE);
  const synthRef = useRef(DEFAULT_SYNTH);
  const mixRef = useRef(DEFAULT_MIX);
  const nodesRef = useRef(createNodes());
  const routesRef = useRef(cloneRoutes());
  const palettesRef = useRef(clonePalettes());
  const bpmRef = useRef(58.11);
  const swingRef = useRef(.075);
  const masterRef = useRef(.72);

  const [nodes, setNodes] = useState<HarmonicNode[]>(() => createNodes());
  const [routes, setRoutes] = useState(() => cloneRoutes());
  const [palettes, setPalettes] = useState(() => clonePalettes());
  const [engineControls, setEngineControls] = useState(DEFAULT_ENGINE);
  const [synth, setSynth] = useState(DEFAULT_SYNTH);
  const [terrain, setTerrain] = useState(DEFAULT_TERRAIN);
  const [mix, setMix] = useState(DEFAULT_MIX);
  const [bpm, setBpm] = useState(58.11);
  const [swing, setSwing] = useState(.075);
  const [master, setMaster] = useState(.72);
  const [seed, setSeed] = useState(1513);
  const [playing, setPlaying] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState("INTRO-0");
  const [paletteSection, setPaletteSection] = useState<SectionId>("INTRO");
  const [active, setActive] = useState<ScheduledEvent | null>(null);
  const [motifBank, setMotifBank] = useState<Array<{ id: number; sourceId?: number }>>([]);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [status, setStatus] = useState("Transport standing by");
  const [architecturePreset, setArchitecturePreset] = useState("v24");
  const [architectureNote, setArchitectureNote] = useState("The preserved v24 modal-funk graph: colorful, cyclical, and fixed beneath the stochastic walk.");

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { routesRef.current = routes; }, [routes]);
  useEffect(() => { palettesRef.current = palettes; }, [palettes]);
  useEffect(() => { controlsRef.current = engineControls; }, [engineControls]);
  useEffect(() => { synthRef.current = synth; }, [synth]);
  useEffect(() => { mixRef.current = mix; }, [mix]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { masterRef.current = master; }, [master]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? nodes[0];
  const anySolo = TRACKS.some(x => mix[x.id].solo);
  const trackLevel = useCallback((track: Track, reference: number) => {
    const channel = mixRef.current[track];
    if (channel.mute || (Object.values(mixRef.current).some(x => x.solo) && !channel.solo)) return 0;
    return reference * channel.gain * masterRef.current;
  }, []);

  const addOsc = useCallback((ctx: AudioContext, destination: AudioNode, frequency: number, start: number, duration: number, gainValue: number, type: OscillatorType, attack = .01, release = .12, detuneFrom?: number, vibrato?: { rate: number; depth: number }, pulseDuty?: number) => {
    if (gainValue <= 0 || duration <= 0) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    if (pulseDuty !== undefined) { const harmonics = 36; const real = new Float32Array(harmonics + 1); const imag = new Float32Array(harmonics + 1); for (let n = 1; n <= harmonics; n++) imag[n] = 2 * Math.sin(Math.PI * n * pulseDuty) / (Math.PI * n); osc.setPeriodicWave(ctx.createPeriodicWave(real, imag, { disableNormalization: false })); } else osc.type = type;
    if (detuneFrom !== undefined) { osc.frequency.setValueAtTime(detuneFrom, start); osc.frequency.exponentialRampToValueAtTime(frequency, start + Math.min(.13, duration * .28)); } else osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(Math.max(.0001, gainValue), start + attack); gain.gain.exponentialRampToValueAtTime(.0001, start + duration + release);
    if (vibrato) { const lfo = ctx.createOscillator(); const depth = ctx.createGain(); lfo.frequency.value = vibrato.rate; depth.gain.value = vibrato.depth; lfo.connect(depth).connect(osc.detune); lfo.start(start); lfo.stop(start + duration + release + .02); }
    osc.connect(gain).connect(destination); osc.start(start); osc.stop(start + duration + release + .03);
  }, []);

  const addNoise = useCallback((ctx: AudioContext, destination: AudioNode, start: number, duration: number, gainValue: number, highpass: number) => {
    if (gainValue <= 0) return;
    const length = Math.max(16, Math.ceil(duration * ctx.sampleRate)); const buffer = ctx.createBuffer(1, length, ctx.sampleRate); const data = buffer.getChannelData(0);
    const noise = new SeededRandom(2513 + Math.floor(start * 1000)); for (let i = 0; i < length; i++) data[i] = noise.next() * 2 - 1;
    const source = ctx.createBufferSource(); const filter = ctx.createBiquadFilter(); const gain = ctx.createGain(); filter.type = "highpass"; filter.frequency.value = highpass;
    gain.gain.setValueAtTime(gainValue, start); gain.gain.exponentialRampToValueAtTime(.0001, start + duration); source.buffer = buffer; source.connect(filter).connect(gain).connect(destination); source.start(start); source.stop(start + duration + .01);
  }, []);

  const scheduleBar = useCallback((ctx: AudioContext, start: number, event: HarmonicEvent) => {
    const beat = 60 / bpmRef.current; const bar = beat * 4; const output = ctx.destination;
    const voicing = chooseVoicing(event.node.root, event.chordQuality, previousVoicingRef.current); previousVoicingRef.current = voicing.upper;
    addOsc(ctx, output, midiToFrequency(voicing.bass), start, bar * .94, trackLevel("chords", .18), "sine", .1, .18);
    voicing.upper.forEach((midi, j) => addOsc(ctx, output, midiToFrequency(midi), start, bar * .94, trackLevel("chords", .14 / (1 + .12 * j)), "sine", .1, .18));

    const ctl = controlsRef.current; const syn = synthRef.current; const pool = scalePool(event.scale, 64, 96);
    const normalOnsets = event.motif.onsets.flatMap((x, i, list) => i < list.length - 1 ? [x, (x + list[i + 1]) / 2] : [x, Math.min(.92, x + .16)]);
    const onsets = normalOnsets.filter((_, i) => i % Math.max(1, Math.round(1 / clamp(ctl.melodyDensity, .5, 2))) === 0);
    const melodyNotes: Array<{ note: number; onset: number; length: number; accent: number }> = [];
    let firstCandidates: MelodyCandidate[] = [];
    if (event.breakout) {
      const count = engineRef.current!.rng.int(7, 13); const span = .28 + engineRef.current!.rng.next() * .34; const isRun = engineRef.current!.rng.next() < ctl.runChance;
      let index = nearestScaleIndex(pool, previousMelodyRef.current); let direction = engineRef.current!.rng.next() < .5 ? -1 : 1;
      for (let i = 0; i < count; i++) {
        let note: number;
        if (isRun) { if (i > 1 && engineRef.current!.rng.next() < .32 / count) direction *= -1; index = clamp(index + direction * (engineRef.current!.rng.next() < .24 ? 2 : 1), 0, pool.length - 1); note = pool[index]; }
        else { const chordPool = Array.from({ length: 30 }, (_, k) => 64 + k).filter(n => chordPitchClasses(event.node.root, event.chordQuality).includes(n % 12)); note = chordPool[i % chordPool.length]; if (engineRef.current!.rng.next() < syn.octaveJump) note = clamp(note + (engineRef.current!.rng.next() < .5 ? -12 : 12), 64, 96); }
        melodyNotes.push({ note, onset: .04 + i / count * span, length: Math.min(.62 / bar, span / count * 1.8), accent: .82 }); previousMelodyRef.current = note;
      }
    } else {
      for (let i = 0; i < onsets.length; i++) {
        const contour = event.motif.contour[i % event.motif.contour.length]; const candidates = melodyCandidates(event.scale, event.node.root, event.chordQuality, previousMelodyRef.current, contour, syn.chordAttraction);
        const note = chooseMelodyNote(engineRef.current!.rng, event.scale, event.node.root, event.chordQuality, previousMelodyRef.current, contour, syn.chordAttraction);
        if (i === 0) firstCandidates = candidates; previousMelodyRef.current = note;
        const long = engineRef.current!.rng.next() < syn.longNoteChance; const nominal = long ? 2.9 * (.72 + engineRef.current!.rng.next() * .56) : .83 * (.72 + engineRef.current!.rng.next() * .56);
        melodyNotes.push({ note, onset: onsets[i], length: Math.min(.9 - onsets[i], nominal / bar), accent: event.motif.accents[i % event.motif.accents.length] });
      }
    }
    for (const [i, item] of melodyNotes.entries()) {
      const noteStart = start + item.onset * bar; const length = Math.max(.05, item.length * bar); const previous = i ? melodyNotes[i - 1].note : item.note;
      const porta = engineRef.current!.rng.next() < (event.breakout ? .22 : syn.portamentoChance); const vibrato = engineRef.current!.rng.next() < (event.breakout ? .28 : syn.vibratoChance);
      const usePwm = engineRef.current!.rng.next() < syn.pwmChance; const duty = clamp(.5 + (engineRef.current!.rng.next() * 2 - 1) * (.18 + syn.pwmDepth), .12, .88);
      addOsc(ctx, output, midiToFrequency(item.note), noteStart, length, trackLevel("lead", .18 * item.accent), "square", .012, event.breakout ? .08 : syn.leadDecay, porta ? midiToFrequency(previous) : undefined, vibrato ? { rate: 4.2 + engineRef.current!.rng.next() * 3, depth: event.breakout ? 18 : 28 } : undefined, usePwm ? duty : .5);
      const scaleIndex = nearestScaleIndex(pool, item.note); const step1 = engineRef.current!.rng.weighted([{ value: 2, weight: .38 }, { value: 3, weight: .26 }, { value: 4, weight: .22 }, { value: 5, weight: .14 }]);
      const step2 = engineRef.current!.rng.weighted([{ value: 4, weight: .2 }, { value: 5, weight: .3 }, { value: 6, weight: .24 }, { value: 7, weight: .16 }, { value: 8, weight: .1 }]);
      const modal1 = pool[clamp(scaleIndex - step1, 0, pool.length - 1)]; const modal2 = pool[clamp(scaleIndex - step2, 0, pool.length - 1)];
      const chordPcs = chordPitchClasses(event.node.root, event.chordQuality); const lock = (modal: number) => { const choices = Array.from({ length: 32 }, (_, k) => 48 + k).filter(n => chordPcs.includes(n % 12) && n < item.note); return choices.reduce((a, b) => Math.abs(b - modal) < Math.abs(a - modal) ? b : a, choices[0] ?? modal); };
      const h1 = engineRef.current!.rng.next() < syn.harmonyFreedom ? modal1 : lock(modal1); const h2 = engineRef.current!.rng.next() < syn.harmonyFreedom ? modal2 : lock(modal2); const breakoutGain = event.breakout ? .62 : 1;
      addOsc(ctx, output, midiToFrequency(h1), noteStart, Math.min(length * 1.2, 2.07), trackLevel("harmony1", .11 * breakoutGain), "sine", .015, .2);
      addOsc(ctx, output, midiToFrequency(h2), noteStart, Math.min(length * 1.55, 2.87), trackLevel("harmony2", .085 * breakoutGain), "sine", .015, .24);
    }

    const bassPatterns = [[0, 4, 8, 12], [0, 3, 6, 10, 12, 14], [0, 4, 7, 8, 12], [0, 6, 8, 12]]; if (!bassPatternRef.current || engineRef.current!.rng.next() > syn.bassPatternMemory) bassPatternRef.current = engineRef.current!.rng.pick(bassPatterns); const pattern = bassPatternRef.current;
    pattern.forEach((step, i) => { const odd = step % 2; const onset = start + step * beat / 4 + odd * swingRef.current * beat / 4; const root = voicing.bass + (engineRef.current!.rng.next() < .72 ? 0 : 7); addOsc(ctx, output, midiToFrequency(root), onset, .44, trackLevel("bass", .18 * (i ? .86 : 1.22)), "triangle", .005, .06); });
    for (let i = 0; i < 16; i++) { const onset = start + i * beat / 4 + (i % 2) * swingRef.current * beat / 4; addNoise(ctx, output, onset, .073, trackLevel("shaker", .0275), 6400); }
    for (let i = 0; i < 32; i++) { const onset = start + i * beat / 8 + (i % 2) * swingRef.current * beat / 8; addNoise(ctx, output, onset, .033, trackLevel("hat", .0105), 9000); }
    for (let i = 0; i < 4; i++) { const onset = start + i * beat; addNoise(ctx, output, onset, .147, trackLevel("pulse", .064 * (i ? 1 : 1.1)), 1200); if ((i === 1 || i === 3) && engineRef.current!.rng.next() < syn.snareChance) addNoise(ctx, output, onset, .32, trackLevel("snare", .115), 1100); }
    return { melodyNote: melodyNotes[0]?.note ?? previousMelodyRef.current, candidates: firstCandidates };
  }, [addNoise, addOsc, trackLevel]);

  const stopScheduler = useCallback(() => { if (schedulerRef.current !== null) window.clearInterval(schedulerRef.current); schedulerRef.current = null; }, []);
  const resetEngine = useCallback((nextSeed = seed) => {
    engineRef.current = new CompositionEngine(nextSeed, nodesRef.current, routesRef.current, palettesRef.current, controlsRef.current);
    previousVoicingRef.current = undefined; previousMelodyRef.current = 74; bassPatternRef.current = null; queueRef.current = []; activeRef.current = null; trailRef.current = []; setActive(null); setMotifBank([]);
    if (audioRef.current) nextEventTimeRef.current = audioRef.current.currentTime + .08;
    setStatus(`Seed ${nextSeed} rewound to INTRO`);
  }, [seed]);

  const installArchitecture = useCallback((nextNodes: HarmonicNode[], nextRoutes: typeof routes, nextPalettes: typeof palettes, label: string, note: string) => {
    setNodes(nextNodes); setRoutes(nextRoutes); setPalettes(nextPalettes); nodesRef.current = nextNodes; routesRef.current = nextRoutes; palettesRef.current = nextPalettes; setArchitecturePreset(label); setArchitectureNote(note); setSelectedNodeId(nextNodes[0].id); resetEngine(seed);
  }, [resetEngine, seed]);

  const applyArchitecturePreset = useCallback((id: string) => {
    if (id === "v24") { installArchitecture(createNodes(), cloneRoutes(), clonePalettes(), "v24", "The preserved v24 modal-funk graph: colorful, cyclical, and fixed beneath the stochastic walk."); return; }
    const preset = ARCHITECTURE_PRESETS.find(item => item.id === id); if (!preset) return;
    installArchitecture(nodesFromGroups(preset.groups), cloneRoutes(), paletteForPreset(id), id, preset.note);
  }, [installArchitecture]);

  const randomizeArchitecture = useCallback(() => {
    const randomSeed = crypto.getRandomValues(new Uint32Array(1))[0]; const rng = new SeededRandom(randomSeed); const availableKeys = [0, 3, 4, 5, 7, 10]; const key = rng.pick(availableKeys); const minor = rng.next() < .42;
    const majorDegrees = [0, 2, 4, 5, 7, 9, 11]; const minorDegrees = [0, 2, 3, 5, 7, 8, 10];
    const chooseQuality = (degree: number): ChordQuality => {
      const majorChoices: Record<number, ChordQuality[]> = { 0: ["maj", "maj7", "6", "69"], 2: ["min", "m7", "m9"], 4: ["min", "m7"], 5: ["maj", "maj7", "6"], 7: ["7", "9", "13", "sus4"], 9: ["min", "m7", "m9"], 11: ["dim", "dim7"] };
      const minorChoices: Record<number, ChordQuality[]> = { 0: ["min", "m7", "m9"], 2: ["dim", "dim7"], 3: ["maj", "maj7"], 5: ["min", "m7"], 7: ["min", "7", "9"], 8: ["maj", "maj7", "6"], 10: ["maj", "7"] };
      return rng.pick((minor ? minorChoices : majorChoices)[degree]);
    };
    const groups = Object.fromEntries(SECTION_IDS.map((section, sectionIndex) => {
      const count = rng.int(2, 10); const degrees = minor ? minorDegrees : majorDegrees; const chords: ChordSeed[] = []; let degree = degrees[(sectionIndex * 2) % degrees.length];
      for (let i = 0; i < count; i++) {
        if (i && rng.next() < .2) { chords.push([...chords.at(-1)!] as ChordSeed); continue; }
        if (i) degree = rng.weighted([{ value: degree, weight: .08 }, { value: degrees[(degrees.indexOf(degree) + 3) % degrees.length], weight: .24 }, { value: degrees[(degrees.indexOf(degree) + 4) % degrees.length], weight: .32 }, { value: rng.pick(degrees), weight: .36 }]);
        if (rng.next() < .18) { const target = (key + degree) % 12; chords.push(makeChordSeed((target + 7) % 12, rng.pick(["7", "9", "13", "7b9"]))); }
        else chords.push(makeChordSeed((key + degree) % 12, chooseQuality(degree)));
      }
      return [section, chords];
    })) as Record<SectionId, ChordSeed[]>;
    const nextRoutes = Object.fromEntries(SECTION_IDS.map(section => [section, Object.fromEntries(SECTION_IDS.map(destination => [destination, .08 + rng.next()]))])) as typeof routes;
    const scaleIds = (Object.keys(SCALES) as ScaleId[]).filter(scale => { const root = SCALES[scale].root; return root === key || root === (key + 5) % 12 || root === (key + 7) % 12; });
    const fallbackScales = (Object.keys(SCALES) as ScaleId[]); const nextPalettes = Object.fromEntries(SECTION_IDS.map(section => { const source = scaleIds.length >= 2 ? scaleIds : fallbackScales; const shuffled = [...source].sort(() => rng.next() - .5).slice(0, rng.int(2, Math.min(3, source.length))); return [section, shuffled.map(scale => ({ scale, weight: .1 + rng.next() }))]; })) as typeof palettes;
    installArchitecture(nodesFromGroups(groups), nextRoutes, nextPalettes, "random", `Theory-tamed mutation ${randomSeed}: ${NOTE_NAMES[key]} ${minor ? "minor" : "major"} gravity, functional fifth motion, secondary dominants, diminished connectors, and a 20% permission to hold the same chord.`);
  }, [installArchitecture]);

  const resizeSection = useCallback((section: SectionId, count: number) => {
    const rng = new SeededRandom(Date.now() + count + section.length); const groups = Object.fromEntries(SECTION_IDS.map(id => [id, nodesRef.current.filter(node => node.section === id).sort((a, b) => a.slot - b.slot).map(node => makeChordSeed(node.root, node.quality))])) as Record<SectionId, ChordSeed[]>; const local = groups[section];
    while (local.length > count) local.pop(); while (local.length < count) { const previous = local.at(-1)!; if (rng.next() < .24) local.push([...previous] as ChordSeed); else { const root = (previous[0] + rng.pick([2, 5, 7, 10])) % 12; const quality = rng.pick<ChordQuality>(["m7", "maj7", "7", "9", "13", "6", "dim7"]); local.push(makeChordSeed(root, quality)); } }
    const next = nodesFromGroups(groups); setNodes(next); nodesRef.current = next; setSelectedNodeId(current => next.some(node => node.id === current) ? current : next[0].id); setArchitecturePreset("custom"); setArchitectureNote("Manual section-length edit. New slots use fifth/step motion with restrained jazz-functional qualities; repeated bars remain legal."); resetEngine(seed);
  }, [resetEngine, seed]);

  const scheduler = useCallback(() => {
    const ctx = audioRef.current; const engine = engineRef.current; if (!ctx || !engine || !playingRef.current || ctx.state !== "running") return;
    engine.nodes = nodesRef.current; engine.routes = routesRef.current; engine.palettes = palettesRef.current; engine.controls = controlsRef.current;
    const lookahead = .14;
    while (nextEventTimeRef.current < ctx.currentTime + lookahead) {
      const event = engine.nextEvent(); const duration = 4 * 60 / bpmRef.current; const detail = scheduleBar(ctx, nextEventTimeRef.current, event);
      queueRef.current.push({ event, start: nextEventTimeRef.current, duration, ...detail });
      if (queueRef.current.length > 20) queueRef.current.shift(); nextEventTimeRef.current += duration;
      setMotifBank(engine.motifBuffer.map(m => ({ id: m.id, sourceId: m.sourceId })));
    }
  }, [scheduleBar]);

  const play = useCallback(async () => {
    if (!audioRef.current) audioRef.current = new AudioContext(); const ctx = audioRef.current;
    if (!engineRef.current) resetEngine(seed); await ctx.resume();
    if (!startedRef.current || nextEventTimeRef.current < ctx.currentTime) nextEventTimeRef.current = ctx.currentTime + .08;
    startedRef.current = true; playingRef.current = true; setPlaying(true); setStatus("Web Audio clock running"); stopScheduler(); scheduler(); schedulerRef.current = window.setInterval(scheduler, 25);
  }, [resetEngine, scheduler, seed, stopScheduler]);
  const pause = useCallback(async () => { playingRef.current = false; setPlaying(false); stopScheduler(); if (audioRef.current) await audioRef.current.suspend(); setStatus("Clock suspended in place"); }, [stopScheduler]);

  const updateNode = useCallback((id: string, patch: Partial<HarmonicNode>) => setNodes(list => list.map(n => n.id === id ? { ...n, ...patch } : n)), []);
  const updateRoute = useCallback((section: SectionId, destination: SectionId, value: number) => setRoutes(current => ({ ...current, [section]: { ...current[section], [destination]: value } })), []);
  const updatePalette = useCallback((section: SectionId, scale: ScaleId, value: number) => setPalettes(current => ({ ...current, [section]: current[section].map(item => item.scale === scale ? { ...item, weight: value } : item) })), []);
  const updateMix = useCallback((track: Track, patch: Partial<MixChannel>) => setMix(current => ({ ...current, [track]: { ...current[track], ...patch } })), []);

  const serialize = useCallback(() => ({
    name: "v24-herbie-colors-fixed-tempo", version: 24, bpm, beatsPerEvent: 4, swing, seed, noiseSeed: 2513,
    engine: engineControls, synthesis: synth, terrain, mixer: mix, nodes, routes, palettes,
    invariants: { fixedEventBeats: 4, midCycleCrosslinks: false, motifTempoWarp: false },
  }), [bpm, engineControls, mix, nodes, palettes, routes, seed, swing, synth, terrain]);
  const copyPreset = useCallback(async () => { await navigator.clipboard.writeText(JSON.stringify(serialize(), null, 2)); setStatus("Complete machine copied as JSON"); }, [serialize]);
  const importPreset = useCallback(async (file: File) => {
    try { const data = JSON.parse(await file.text()); if (data.version !== 24) throw new Error("Not a v24 machine"); setBpm(data.bpm); setSwing(data.swing); setSeed(data.seed); setEngineControls(data.engine); setSynth(data.synthesis); setTerrain(data.terrain); setMix(data.mixer); setNodes(data.nodes); setRoutes(data.routes); setPalettes(data.palettes); nodesRef.current = data.nodes; routesRef.current = data.routes; palettesRef.current = data.palettes; controlsRef.current = data.engine; synthRef.current = data.synthesis; mixRef.current = data.mixer; bpmRef.current = data.bpm; swingRef.current = data.swing; resetEngine(data.seed); setStatus(`Loaded ${data.name}`); } catch (error) { setStatus(error instanceof Error ? error.message : "Preset could not be read"); }
  }, [resetEngine]);

  const worldToCanvas = useCallback((x: number, y: number, width: number, height: number) => ({ x: (x - WORLD.left) / (WORLD.right - WORLD.left) * width, y: (WORLD.top - y) / (WORLD.top - WORLD.bottom) * height }), []);
  const canvasToWorld = useCallback((x: number, y: number, width: number, height: number) => ({ x: WORLD.left + x / width * (WORLD.right - WORLD.left), y: WORLD.top - y / height * (WORLD.top - WORLD.bottom) }), []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const context = canvas.getContext("2d", { alpha: false }); if (!context) return; const off = document.createElement("canvas"); off.width = 118; off.height = 82; const offContext = off.getContext("2d")!;
    let lastActive = -1;
    const draw = () => {
      const rect = canvas.getBoundingClientRect(); const ratio = Math.min(2, window.devicePixelRatio || 1); const width = Math.max(1, Math.round(rect.width * ratio)); const height = Math.max(1, Math.round(rect.height * ratio)); if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const w = 118, h = 82; const field = new Float32Array(w * h); let max = .001;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const wx = WORLD.left + px / (w - 1) * (WORLD.right - WORLD.left); const wy = WORLD.top - py / (h - 1) * (WORLD.top - WORLD.bottom); let z = 0; for (const node of nodesRef.current) z += node.tension * Math.exp(-((wx - node.x) ** 2 + (wy - node.y) ** 2) / (2 * terrain.sigma ** 2)); field[py * w + px] = z * terrain.height; max = Math.max(max, z * terrain.height); }
      const image = context.createImageData(w, h); for (let i = 0; i < field.length; i++) { const t = clamp(field[i] / max, 0, .999) * (TERRAIN_COLORS.length - 1); const a = Math.floor(t); const q = t - a; const c0 = TERRAIN_COLORS[a].match(/\w\w/g)!.map(x => parseInt(x, 16)); const c1 = TERRAIN_COLORS[Math.min(a + 1, TERRAIN_COLORS.length - 1)].match(/\w\w/g)!.map(x => parseInt(x, 16)); image.data[i * 4] = c0[0] + (c1[0] - c0[0]) * q; image.data[i * 4 + 1] = c0[1] + (c1[1] - c0[1]) * q; image.data[i * 4 + 2] = c0[2] + (c1[2] - c0[2]) * q; image.data[i * 4 + 3] = 255; }
      offContext.putImageData(image, 0, 0); context.imageSmoothingEnabled = true; context.drawImage(off, 0, 0, width, height);
      context.strokeStyle = "rgba(255,248,211,.3)"; context.lineWidth = ratio * .65; for (let level = 1; level < terrain.contours; level++) { const threshold = max * level / terrain.contours; context.beginPath(); for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const values = [field[y * w + x], field[y * w + x + 1], field[(y + 1) * w + x + 1], field[(y + 1) * w + x]]; const edges: Array<[number, number]> = []; const points: Array<[number, number]> = [[x + .5, y], [x + 1, y + .5], [x + .5, y + 1], [x, y + .5]]; for (let e = 0; e < 4; e++) if ((values[e] >= threshold) !== (values[(e + 1) % 4] >= threshold)) edges.push(points[e]); if (edges.length >= 2) { context.moveTo(edges[0][0] / w * width, edges[0][1] / h * height); context.lineTo(edges[1][0] / w * width, edges[1][1] / h * height); } } context.stroke(); }
      context.font = `900 ${10 * ratio}px Arial`; context.textAlign = "center"; context.textBaseline = "middle";
      for (const section of SECTION_IDS) { const local = nodesRef.current.filter(n => n.section === section); context.strokeStyle = "rgba(255,248,211,.42)"; context.lineWidth = ratio; context.setLineDash([]); context.beginPath(); local.forEach((node, i) => { const a = worldToCanvas(node.x, node.y, width, height); const next = worldToCanvas(local[(i + 1) % local.length].x, local[(i + 1) % local.length].y, width, height); context.moveTo(a.x, a.y); context.lineTo(next.x, next.y); }); context.stroke(); const center = worldToCanvas(...SECTION_CENTERS[section], width, height); context.fillStyle = "rgba(255,248,211,.78)"; context.fillText(section, center.x, center.y + 24 * ratio); }
      context.setLineDash([5 * ratio, 8 * ratio]); context.strokeStyle = "rgba(255,248,211,.25)"; context.beginPath(); for (const section of SECTION_IDS) { const local = nodesRef.current.filter(n => n.section === section); const source = local.at(-1)!; for (const destination of Object.keys(routesRef.current[section])) { const target = nodesRef.current.find(n => n.section === destination && n.slot === 0)!; const a = worldToCanvas(source.x, source.y, width, height); const b = worldToCanvas(target.x, target.y, width, height); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); } } context.stroke(); context.setLineDash([]);
      for (const node of nodesRef.current) { const p = worldToCanvas(node.x, node.y, width, height); context.beginPath(); context.fillStyle = node.id === selectedNodeId ? "#fff8d3" : "#140b23"; context.strokeStyle = "#fff8d3"; context.lineWidth = node.id === selectedNodeId ? 3 * ratio : 1.5 * ratio; context.arc(p.x, p.y, 8 * ratio, 0, Math.PI * 2); context.fill(); context.stroke(); context.fillStyle = node.id === selectedNodeId ? "#140b23" : "#fff8d3"; context.fillText(node.label, p.x, p.y - 14 * ratio); }
      const ctx = audioRef.current; const now = ctx?.currentTime ?? 0; const current = [...queueRef.current].reverse().find(item => item.start <= now && now < item.start + item.duration) ?? activeRef.current;
      if (current) { const alpha = clamp((now - current.start) / current.duration, 0, 1); const x = current.event.node.x + (current.event.nextNode.x - current.event.node.x) * alpha; const y = current.event.node.y + (current.event.nextNode.y - current.event.node.y) * alpha; trailRef.current.push({ x, y }); if (trailRef.current.length > terrain.trail) trailRef.current.shift(); trailRef.current.forEach((point, i) => { const p = worldToCanvas(point.x, point.y, width, height); context.beginPath(); context.fillStyle = `rgba(255,255,255,${(i + 1) / trailRef.current.length * .36})`; context.arc(p.x, p.y, (2 + i / trailRef.current.length * 3) * ratio, 0, Math.PI * 2); context.fill(); }); const p = worldToCanvas(x, y, width, height); context.beginPath(); context.fillStyle = "#fff"; context.shadowColor = "#fff"; context.shadowBlur = 18 * ratio; context.arc(p.x, p.y, 8 * ratio, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; if (current.event.index !== lastActive) { lastActive = current.event.index; activeRef.current = current; setActive(current); } }
      animationRef.current = requestAnimationFrame(draw);
    };
    animationRef.current = requestAnimationFrame(draw); return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [selectedNodeId, terrain, worldToCanvas]);

  useEffect(() => () => { stopScheduler(); if (animationRef.current) cancelAnimationFrame(animationRef.current); void audioRef.current?.close(); }, [stopScheduler]);

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return canvasToWorld(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height); };
  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => { const pos = pointerPosition(event); const nearest = nodesRef.current.reduce((best, node) => ((node.x - pos.x) ** 2 + (node.y - pos.y) ** 2 < (best.x - pos.x) ** 2 + (best.y - pos.y) ** 2 ? node : best), nodesRef.current[0]); if ((nearest.x - pos.x) ** 2 + (nearest.y - pos.y) ** 2 < .18) { nodeDragRef.current = nearest.id; setSelectedNodeId(nearest.id); event.currentTarget.setPointerCapture(event.pointerId); } };
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!nodeDragRef.current) return; const pos = pointerPosition(event); updateNode(nodeDragRef.current, { x: clamp(pos.x, WORLD.left, WORLD.right), y: clamp(pos.y, WORLD.bottom, WORLD.top) }); };
  const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => { nodeDragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };

  const currentScaleNotes = useMemo(() => active ? scalePool(active.event.scale, 60, 83) : [], [active]);
  const chordPcs = useMemo(() => active ? chordPitchClasses(active.event.node.root, active.event.chordQuality) : [], [active]);

  return <main className={`topo-page${controlsHidden ? " controls-hidden" : ""}`}>
    <header className="topo-head"><Link href="/gallery">← Gallery</Link><div><span className="eyebrow">Interactive Exhibit 31 · Generative Systems</span><h1>Harmonic<br />Topography</h1><p>Topology says what music can do. Terrain says what it wants. Memory says what it remembers. The clock does not negotiate.</p></div><span className="topo-version">V24<br />HERBIE COLORS<br />FIXED TEMPO</span></header>
    <button className="topo-ui-toggle" onClick={() => setControlsHidden(value => !value)}>{controlsHidden ? "Show laboratory" : "Hide laboratory"}</button>
    <section className="topo-console">
      <div className="topo-stage">
        <canvas ref={canvasRef} aria-label="Interactive harmonic tension terrain with chord nodes and an animated harmonic traveler" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} />
        <div className="topo-now"><span>SECTION <b>{active?.event.node.section ?? "INTRO"}</b></span><span>CHORD <b>{active?.event.node.label ?? "Fm9"}</b></span><span>MODE <b>{active?.event.scale ?? "F Dorian"}</b></span><span>NEXT <b>{active?.event.nextNode.label ?? "Bb13"}</b></span></div>
        <div className="topo-legend"><i /> LOW TENSION <span /> HIGH TENSION</div>
      </div>
      <aside className="topo-controls" aria-label="Harmonic Topography controls">
        <div className="topo-transport"><button className="primary" onClick={() => void (playing ? pause() : play())}>{playing ? "Pause" : "Play"}</button><button onClick={() => resetEngine(seed)}>Reset</button><button onClick={() => { const next = crypto.getRandomValues(new Uint32Array(1))[0]; setSeed(next); resetEngine(next); }}>New seed</button><button onClick={() => resetEngine(seed)}>Replay seed</button></div>
        <div className="topo-status"><b>{status}</b><span>4 beats/event · {(4 * 60 / bpm).toFixed(3)} s/bar · seed {seed}</span></div>
        <details open><summary>Harmonic architecture / structural mutation</summary><div className="topo-architecture"><label className="topo-number"><span>Progression styling</span><select value={architecturePreset} onChange={event => setArchitecturePreset(event.target.value)}><option value="v24">V24 reference</option>{ARCHITECTURE_PRESETS.map(preset => <option value={preset.id} key={preset.id}>{preset.label}</option>)}{architecturePreset === "random" && <option value="random">Current mutation</option>}{architecturePreset === "custom" && <option value="custom">Current custom graph</option>}</select></label><button onClick={() => applyArchitecturePreset(architecturePreset)} disabled={architecturePreset === "random" || architecturePreset === "custom"}>Load styling</button><button className="primary" onClick={randomizeArchitecture}>Theory-tamed scramble</button></div><div className="topo-grid topo-section-lengths">{SECTION_IDS.map(section => <Slider key={section} label={`${section} chords`} value={nodes.filter(node => node.section === section).length} min={2} max={10} step={1} onChange={value => resizeSection(section, value)} />)}</div><div className="topo-chord-map">{SECTION_IDS.map(section => <section key={section}><b>{section}</b><span>{nodes.filter(node => node.section === section).sort((a,b) => a.slot-b.slot).map(node => node.label).join(" → ")}</span></section>)}</div><p className="topo-note">{architectureNote} Presets derived from public-domain scores are labeled by title; Nat King Cole and Louis Armstrong are original harmonic vocabularies inspired by their broad eras, not transcriptions.</p></details>
        <details open><summary>Transport / the unquestioned law</summary><div className="topo-grid"><Slider label="BPM" value={bpm} min={38} max={128} step={.01} onChange={setBpm} /><Slider label="Swing" value={swing} min={0} max={.22} step={.001} onChange={setSwing} /><Slider label="Master" value={master} min={0} max={1.2} step={.01} onChange={setMaster} /><label className="topo-number"><span>Composition seed</span><input type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 1)} /></label></div></details>
        <details open><summary>Memory / melodic weather</summary><div className="topo-grid"><Slider label="Motif memory" value={engineControls.familiarity} min={0} max={1} step={.01} onChange={value => setEngineControls(x => ({ ...x, familiarity: value }))} /><Slider label="Breakout probability" value={engineControls.breakoutChance} min={0} max={.8} step={.01} onChange={value => setEngineControls(x => ({ ...x, breakoutChance: value }))} /><Slider label="Run vs arpeggio" value={engineControls.runChance} min={0} max={1} step={.01} onChange={value => setEngineControls(x => ({ ...x, runChance: value }))} /><Slider label="Octave jump" value={synth.octaveJump} min={0} max={1} step={.01} onChange={value => setSynth(x => ({ ...x, octaveJump: value }))} /><Slider label="Chord-tone attraction" value={synth.chordAttraction} min={0} max={1.8} step={.01} onChange={value => setSynth(x => ({ ...x, chordAttraction: value }))} /><Slider label="Melody density" value={engineControls.melodyDensity} min={.5} max={2} step={.05} onChange={value => setEngineControls(x => ({ ...x, melodyDensity: value }))} /><Slider label="Harmony freedom" value={synth.harmonyFreedom} min={0} max={1} step={.01} onChange={value => setSynth(x => ({ ...x, harmonyFreedom: value }))} /><Slider label="Tension bias" value={engineControls.tensionBias} min={0} max={.1} step={.001} onChange={value => setEngineControls(x => ({ ...x, tensionBias: value }))} /></div><div className="topo-motifs">{motifBank.length ? motifBank.map(m => <span key={m.id} className={m.sourceId ? "reused" : "new"}>M{m.id}<small>{m.sourceId ? `REUSED M${m.sourceId}` : "NEW"}</small></span>) : <p>Six-slot FIFO motif memory will appear here.</p>}</div></details>
        <details><summary>Lead synthesis</summary><div className="topo-grid"><Slider label="Long-note chance" value={synth.longNoteChance} min={0} max={.8} step={.01} onChange={value => setSynth(x => ({ ...x, longNoteChance: value }))} /><Slider label="Portamento chance" value={synth.portamentoChance} min={0} max={1} step={.01} onChange={value => setSynth(x => ({ ...x, portamentoChance: value }))} /><Slider label="Vibrato chance" value={synth.vibratoChance} min={0} max={1} step={.01} onChange={value => setSynth(x => ({ ...x, vibratoChance: value }))} /><Slider label="PWM chance" value={synth.pwmChance} min={0} max={1} step={.01} onChange={value => setSynth(x => ({ ...x, pwmChance: value }))} /><Slider label="PWM depth" value={synth.pwmDepth} min={0} max={.4} step={.01} onChange={value => setSynth(x => ({ ...x, pwmDepth: value }))} /><Slider label="Lead release" value={synth.leadDecay} min={.05} max={1.4} step={.01} onChange={value => setSynth(x => ({ ...x, leadDecay: value }))} suffix="s" /><Slider label="Snare chance" value={synth.snareChance} min={0} max={1} step={.01} onChange={value => setSynth(x => ({ ...x, snareChance: value }))} /><Slider label="Bass phrase memory" value={synth.bassPatternMemory} min={0} max={1} step={.01} onChange={value => setSynth(x => ({ ...x, bassPatternMemory: value }))} /></div></details>
        <details open><summary>Mixer</summary><div className="topo-mixer">{TRACKS.map(track => <section key={track.id}><strong>{track.label}</strong><button className={mix[track.id].mute ? "active" : ""} onClick={() => updateMix(track.id, { mute: !mix[track.id].mute })}>M</button><button className={mix[track.id].solo ? "active" : ""} onClick={() => updateMix(track.id, { solo: !mix[track.id].solo })}>S</button><input aria-label={`${track.label} gain`} type="range" min="0" max="1.5" step=".01" value={mix[track.id].gain} onChange={e => updateMix(track.id, { gain: Number(e.target.value) })} /><output>{mix[track.id].gain.toFixed(2)}</output></section>)}</div>{anySolo && <p className="topo-note">Solo bus active. Non-solo channels are silent.</p>}</details>
        <details><summary>Topology / section routing</summary>{SECTION_IDS.map(section => <div className="topo-route" key={section}><b>{section} cycle exit</b>{Object.entries(routes[section]).map(([destination, weight]) => <Slider key={destination} label={`→ ${destination}`} value={weight ?? 0} min={0} max={1} step={.01} onChange={value => updateRoute(section, destination as SectionId, value)} />)}</div>)}<p className="topo-note">Probabilities normalize at the exit. No route is consulted before the local cycle finishes; BRIDGE alone alternates Db7 ↔ C7alt until discharge.</p></details>
        <details><summary>Terrain / selected chord</summary><div className="topo-selected"><b>{selectedNode.label}</b><span>{selectedNode.section} · slot {selectedNode.slot + 1}</span></div><div className="topo-grid"><label className="topo-number"><span>Chord option</span><select value={selectedNode.quality} onChange={e => { const quality = e.target.value as HarmonicNode["quality"]; updateNode(selectedNode.id, { quality, label: nodeLabel(selectedNode.root, quality), tension: QUALITY_TENSION[quality] }); }}><option value="maj">Major</option><option value="min">Minor</option><option value="dim">Diminished</option><option value="dim7">Diminished 7</option><option value="sus4">Sus4</option><option value="6">6</option><option value="69">6/9</option><option value="maj7">Maj7</option><option value="7">7</option><option value="9">9</option><option value="11">11</option><option value="13">13</option><option value="m7">m7</option><option value="m9">m9</option><option value="7b9">7b9</option><option value="7#9">7#9</option><option value="alt">7alt variant</option></select></label><Slider label="Node tension" value={selectedNode.tension} min={0} max={2.5} step={.01} onChange={value => updateNode(selectedNode.id, { tension: value })} /><Slider label="Hill width σ" value={terrain.sigma} min={.18} max={1.2} step={.01} onChange={value => setTerrain(x => ({ ...x, sigma: value }))} /><Slider label="Terrain height" value={terrain.height} min={.2} max={3} step={.01} onChange={value => setTerrain(x => ({ ...x, height: value }))} /><Slider label="Contour count" value={terrain.contours} min={3} max={24} step={1} onChange={value => setTerrain(x => ({ ...x, contours: value }))} /><Slider label="Trail memory" value={terrain.trail} min={4} max={120} step={1} onChange={value => setTerrain(x => ({ ...x, trail: value }))} /></div><p className="topo-note">Drag chord nodes on the map to rearrange visual geography. Position is deliberately non-musical; tension remains musical preference.</p></details>
        <details><summary>Modal palettes</summary><div className="topo-tabs">{SECTION_IDS.map(section => <button key={section} className={paletteSection === section ? "active" : ""} onClick={() => setPaletteSection(section)}>{section}</button>)}</div>{palettes[paletteSection].map(item => <Slider key={item.scale} label={item.scale} value={item.weight} min={0} max={1} step={.01} onChange={value => updatePalette(paletteSection, item.scale, value)} />)}<p className="topo-note">Weights normalize on entry and local-cycle restart. The chosen palette remains independent of the chord floor.</p></details>
        <details open><summary>Live probability inspector</summary>{active ? <><div className="topo-event-flags"><span>{active.event.breakout ? "BREAKOUT" : "MOTIF"}</span><span>{active.event.motif.sourceId ? `REUSED M${active.event.motif.sourceId}` : "NEW MOTIF"}</span><span>TENSION {active.event.node.tension.toFixed(2)}</span></div><div className="topo-piano">{Array.from({ length: 24 }, (_, i) => 60 + i).map(note => <i key={note} className={`${[1,3,6,8,10].includes(note % 12) ? "black" : "white"}${currentScaleNotes.includes(note) ? " scale" : ""}${chordPcs.includes(note % 12) ? " chord" : ""}`} title={noteName(note)} />)}</div><table className="topo-prob"><thead><tr><th>Candidate</th><th>Relation</th><th>Contour Δ</th><th>Repeat</th><th>Weight</th></tr></thead><tbody>{active.candidates.sort((a, b) => b.weight - a.weight).slice(0, 8).map(candidate => <tr key={candidate.note}><td>{noteName(candidate.note)}</td><td>{candidate.relation}</td><td>{candidate.contourDistance}</td><td>{candidate.repeated ? "yes" : "no"}</td><td>{candidate.weight.toFixed(3)}</td></tr>)}</tbody></table></> : <p className="topo-note">Press Play. The chosen event’s candidate field will become inspectable here.</p>}</details>
        <details><summary>Machine state / portability</summary><div className="topo-transport"><button onClick={() => void copyPreset()}>Copy JSON</button><label className="topo-import"><input type="file" accept="application/json" onChange={e => { const file = e.target.files?.[0]; if (file) void importPreset(file); }} /><b>Import JSON</b></label><button onClick={() => { setBpm(58.11); setSwing(.075); setSeed(1513); setEngineControls(DEFAULT_ENGINE); setSynth(DEFAULT_SYNTH); setTerrain(DEFAULT_TERRAIN); setMix(DEFAULT_MIX); applyArchitecturePreset("v24"); resetEngine(1513); }}>Reference preset</button></div><pre className="topo-json">{JSON.stringify({ architecture: architecturePreset, section: active?.event.node.section ?? "INTRO", chord: active?.event.node.label ?? "Fm9", scale: active?.event.scale ?? "F Dorian", seed, fixedEventBeats: 4 }, null, 2)}</pre></details>
      </aside>
    </section>
    <footer className="topo-foot"><span>Reconstructed v24 behavioral baseline</span><p>No mid-cycle crosslinks. No motif tempo warp. No reactive drum density. Later experiments belong to optional modifiers—not this clock.</p></footer>
  </main>;
}
