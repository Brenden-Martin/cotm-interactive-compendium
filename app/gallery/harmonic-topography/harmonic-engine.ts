export type SectionId = "INTRO" | "VERSE" | "CHORUS" | "BRIDGE";
export type ChordQuality = "maj" | "min" | "sus4" | "maj7" | "7" | "9" | "13" | "7b9" | "7#9" | "m7" | "m9";
export type ScaleId = "F Dorian" | "F minor pentatonic" | "Bb Mixolydian" | "Eb Lydian" | "C altered" | "Db Lydian dominant";

export type HarmonicNode = {
  id: string;
  section: SectionId;
  slot: number;
  root: number;
  label: string;
  quality: ChordQuality | "alt";
  tension: number;
  x: number;
  y: number;
};

export type Motif = { id: number; onsets: number[]; contour: number[]; accents: number[]; sourceId?: number };
export type HarmonicEvent = {
  index: number;
  node: HarmonicNode;
  nextNode: HarmonicNode;
  scale: ScaleId;
  chordQuality: ChordQuality;
  motif: Motif;
  phrasePosition: number;
  breakout: boolean;
};

export type EngineControls = {
  familiarity: number;
  breakoutChance: number;
  runChance: number;
  tensionBias: number;
  melodyDensity: number;
};

export const SECTION_CENTERS: Record<SectionId, [number, number]> = {
  INTRO: [-2.3, 1.8], VERSE: [-1.4, -.8], CHORUS: [1.5, -.6], BRIDGE: [2.2, 1.8],
};

const SECTION_ORDER: SectionId[] = ["INTRO", "VERSE", "CHORUS", "BRIDGE"];
const ROOTS: Record<string, number> = { C: 0, Db: 1, Eb: 3, F: 5, Gb: 6, G: 7, Ab: 8, Bb: 10 };
export const INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7], min: [0, 3, 7], sus4: [0, 5, 7], maj7: [0, 4, 7, 11],
  "7": [0, 4, 7, 10], "9": [0, 2, 4, 7, 10], "13": [0, 2, 4, 7, 9, 10],
  "7b9": [0, 1, 4, 7, 10], "7#9": [0, 3, 4, 7, 10], m7: [0, 3, 7, 10], m9: [0, 2, 3, 7, 10],
};

export const SCALES: Record<ScaleId, { root: number; intervals: number[] }> = {
  "F Dorian": { root: 5, intervals: [0, 2, 3, 5, 7, 9, 10] },
  "F minor pentatonic": { root: 5, intervals: [0, 3, 5, 7, 10] },
  "Bb Mixolydian": { root: 10, intervals: [0, 2, 4, 5, 7, 9, 10] },
  "Eb Lydian": { root: 3, intervals: [0, 2, 4, 6, 7, 9, 11] },
  "C altered": { root: 0, intervals: [0, 1, 3, 4, 6, 8, 10] },
  "Db Lydian dominant": { root: 1, intervals: [0, 2, 4, 6, 7, 9, 10] },
};

export const DEFAULT_PALETTES: Record<SectionId, Array<{ scale: ScaleId; weight: number }>> = {
  INTRO: [{ scale: "F Dorian", weight: .6 }, { scale: "F minor pentatonic", weight: .4 }],
  VERSE: [{ scale: "F Dorian", weight: .58 }, { scale: "Bb Mixolydian", weight: .24 }, { scale: "F minor pentatonic", weight: .18 }],
  CHORUS: [{ scale: "Eb Lydian", weight: .44 }, { scale: "Bb Mixolydian", weight: .3 }, { scale: "Db Lydian dominant", weight: .26 }],
  BRIDGE: [{ scale: "Db Lydian dominant", weight: .52 }, { scale: "C altered", weight: .48 }],
};

export const DEFAULT_ROUTES: Record<SectionId, Partial<Record<SectionId, number>>> = {
  INTRO: { VERSE: .46, CHORUS: .34, BRIDGE: .2 },
  VERSE: { VERSE: .34, CHORUS: .66 },
  CHORUS: { VERSE: .44, CHORUS: .18, BRIDGE: .38 },
  BRIDGE: { BRIDGE: .48, CHORUS: .52 },
};

const NODE_SPECS: Record<SectionId, Array<[string, string, ChordQuality | "alt", number]>> = {
  INTRO: [["F", "Fm9", "m9", .7], ["Bb", "Bb13", "13", 1.08], ["Eb", "Ebmaj7", "maj7", .55], ["C", "Csus4", "sus4", .72]],
  VERSE: [["F", "Fm9", "m9", .7], ["Bb", "Bb13", "13", 1.08], ["Eb", "Ebmaj7", "maj7", .55], ["Ab", "Ab", "maj", .3], ["G", "Gm", "min", .38], ["C", "C7alt", "alt", 1.6], ["F", "Fm9", "m9", .7]],
  CHORUS: [["Eb", "Ebmaj7", "maj7", .55], ["Ab", "Ab13", "13", 1.08], ["Db", "Dbmaj7", "maj7", .55], ["Gb", "Gb7", "7", .88], ["F", "Fm9", "m9", .7], ["Bb", "Bb13", "13", 1.08]],
  BRIDGE: [["Db", "Db7", "7", .88], ["C", "C7alt", "alt", 1.6]],
};

export function createNodes(): HarmonicNode[] {
  return SECTION_ORDER.flatMap((section) => {
    const specs = NODE_SPECS[section];
    const radius = specs.length > 4 ? 1 : .7;
    const [cx, cy] = SECTION_CENTERS[section];
    return specs.map(([root, label, quality, tension], slot) => {
      const theta = -Math.PI / 2 + slot / specs.length * Math.PI * 2;
      return { id: `${section}-${slot}`, section, slot, root: ROOTS[root], label, quality, tension, x: cx + Math.cos(theta) * radius, y: cy + Math.sin(theta) * radius };
    });
  });
}

export class SeededRandom {
  private state: number;
  constructor(seed = 1513) { this.state = seed >>> 0 || 1; }
  next() { let t = this.state += 0x6d2b79f5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  int(min: number, max: number) { return min + Math.floor(this.next() * (max - min + 1)); }
  pick<T>(items: T[]) { return items[Math.floor(this.next() * items.length)]; }
  weighted<T>(items: Array<{ value: T; weight: number }>) { const total = items.reduce((s, x) => s + Math.max(0, x.weight), 0); let cursor = this.next() * (total || 1); for (const item of items) { cursor -= Math.max(0, item.weight); if (cursor <= 0) return item.value; } return items.at(-1)!.value; }
}

const ONSETS = [[.1, .34, .58, .78], [.08, .26, .5, .72], [.14, .42, .68], [.1, .3, .48, .7, .86], [.18, .56, .82]];
const CONTOURS = [[0, 1, 1, -2, 1, -1], [0, 2, -1, -1, 2, -1], [0, -1, -1, 2, 1, -2], [0, 1, 2, -1, -2, 1]];
const ACCENTS = [{ value: .82, weight: .2 }, { value: 1, weight: .58 }, { value: 1.18, weight: .22 }];

export class CompositionEngine {
  rng: SeededRandom;
  nodes: HarmonicNode[];
  routes: Record<SectionId, Partial<Record<SectionId, number>>>;
  palettes: Record<SectionId, Array<{ scale: ScaleId; weight: number }>>;
  controls: EngineControls;
  section: SectionId = "INTRO";
  slot = 0;
  scale: ScaleId = "F Dorian";
  index = 0;
  motifId = 0;
  motifBuffer: Motif[] = [];
  phraseMotif?: Motif;

  constructor(seed: number, nodes: HarmonicNode[], routes: Record<SectionId, Partial<Record<SectionId, number>>>, palettes: Record<SectionId, Array<{ scale: ScaleId; weight: number }>>, controls: EngineControls) {
    this.rng = new SeededRandom(seed); this.nodes = nodes; this.routes = routes; this.palettes = palettes; this.controls = controls; this.scale = this.chooseScale("INTRO");
  }
  chooseScale(section: SectionId) { return this.rng.weighted(this.palettes[section].map(x => ({ value: x.scale, weight: x.weight }))); }
  node(section = this.section, slot = this.slot) { return this.nodes.find(n => n.section === section && n.slot === slot)!; }
  makeMotif() {
    const source = this.motifBuffer.length && this.rng.next() < this.controls.familiarity ? this.rng.pick(this.motifBuffer) : undefined;
    const motif: Motif = source
      ? { ...source, id: ++this.motifId, sourceId: source.id, onsets: [...source.onsets], contour: [...source.contour], accents: [...source.accents] }
      : { id: ++this.motifId, onsets: [...this.rng.pick(ONSETS)], contour: [...this.rng.pick(CONTOURS)], accents: Array.from({ length: 6 }, () => this.rng.weighted(ACCENTS)) };
    if (source && this.rng.next() < .42) { const i = this.rng.int(0, motif.contour.length - 1); motif.contour[i] += this.rng.next() < .5 ? -1 : 1; }
    this.motifBuffer.push(motif); if (this.motifBuffer.length > 6) this.motifBuffer.shift(); return motif;
  }
  advance() {
    const specs = NODE_SPECS[this.section];
    if (this.section === "BRIDGE") {
      if (this.slot === 0) this.slot = 1;
      else if (this.rng.next() < (this.routes.BRIDGE.BRIDGE ?? .48)) { this.slot = 0; this.scale = this.chooseScale("BRIDGE"); }
      else { this.section = "CHORUS"; this.slot = 0; this.scale = this.chooseScale("CHORUS"); }
    } else if (this.slot < specs.length - 1) this.slot += 1;
    else {
      const options = Object.entries(this.routes[this.section]).map(([value, weight]) => ({ value: value as SectionId, weight: weight ?? 0 }));
      const destination = this.rng.weighted(options); this.section = destination; this.slot = 0; this.scale = this.chooseScale(destination);
    }
  }
  nextEvent(): HarmonicEvent {
    const node = this.node(); const phrasePosition = this.index % 4;
    if (!this.phraseMotif || phrasePosition === 0) this.phraseMotif = this.makeMotif();
    const quality: ChordQuality = node.quality === "alt" ? this.rng.weighted([
      { value: "7#9" as ChordQuality, weight: .55 * Math.exp(-this.controls.tensionBias * 1.6) },
      { value: "7b9" as ChordQuality, weight: .45 * Math.exp(-this.controls.tensionBias * 1.58) },
    ]) : node.quality;
    const currentScale = this.scale; const motif = this.phraseMotif; const breakout = this.rng.next() < this.controls.breakoutChance;
    this.advance(); const nextNode = this.node();
    return { index: this.index++, node, nextNode, scale: currentScale, chordQuality: quality, motif, phrasePosition, breakout };
  }
}

export function midiToFrequency(midi: number) { return 440 * 2 ** ((midi - 69) / 12); }
export function scalePool(scale: ScaleId, low = 48, high = 96) { const spec = SCALES[scale]; const pcs = new Set(spec.intervals.map(i => (spec.root + i) % 12)); return Array.from({ length: high - low + 1 }, (_, i) => low + i).filter(n => pcs.has(n % 12)); }
export function chordPitchClasses(root: number, quality: ChordQuality) { return INTERVALS[quality].map(i => (root + i) % 12); }

export function chooseVoicing(root: number, quality: ChordQuality, previous: number[] | undefined) {
  const pcs = new Set(chordPitchClasses(root, quality));
  const basses = Array.from({ length: 17 }, (_, i) => 36 + i).filter(n => n % 12 === root);
  const bass = basses.reduce((a, b) => Math.abs(b - 43) < Math.abs(a - 43) ? b : a, basses[0]);
  const pool = Array.from({ length: 26 }, (_, i) => 52 + i).filter(n => pcs.has(n % 12));
  const candidates: number[][] = [];
  for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) for (let c = b + 1; c < pool.length; c++) for (let d = c + 1; d < pool.length; d++) {
    const v = [pool[a], pool[b], pool[c], pool[d]]; if (v[3] - v[0] <= 18 && new Set(v.map(n => n % 12)).size >= 3) candidates.push(v);
  }
  const target = previous ?? [55, 60, 64, 67];
  const upper = candidates.reduce((best, v) => {
    const cost = .5 * (v[3] - v[0]) + v.reduce((s, n, i) => s + Math.abs(n - target[i]), 0);
    const bestCost = .5 * (best[3] - best[0]) + best.reduce((s, n, i) => s + Math.abs(n - target[i]), 0);
    return cost < bestCost ? v : best;
  }, candidates[0] ?? target);
  return { bass, upper };
}

export function nearestScaleIndex(pool: number[], note: number) { return pool.reduce((best, n, i) => Math.abs(n - note) < Math.abs(pool[best] - note) ? i : best, 0); }
export type MelodyCandidate = { note: number; scaleIndex: number; relation: string; contourDistance: number; repeated: boolean; weight: number };

export function melodyCandidates(scale: ScaleId, chordRoot: number, quality: ChordQuality, previous: number, contour: number, chordAttraction = 1) {
  const pool = scalePool(scale, 67, 92); const chord = new Set(chordPitchClasses(chordRoot, quality));
  const currentIndex = nearestScaleIndex(pool, previous); const target = Math.max(0, Math.min(pool.length - 1, currentIndex + contour));
  return pool.map((note, index): MelodyCandidate => {
    const distances = [...chord].map(pc => Math.min((note % 12 - pc + 12) % 12, (pc - note % 12 + 12) % 12)); const d = Math.min(...distances);
    const consonance = [7, .12, 1.7, 1.35, 1.25, 1.05, .14][d] ?? .65;
    const repeated = note === previous; const weight = ((1 - chordAttraction) + consonance * chordAttraction) * (repeated ? .1 : 1) * (Math.exp(-.45 * Math.abs(index - target)) + .12);
    return { note, scaleIndex: index, relation: d === 0 ? "chord tone" : d === 1 ? "semitone clash" : `${d} semitones`, contourDistance: Math.abs(index - target), repeated, weight };
  });
}

export function chooseMelodyNote(rng: SeededRandom, scale: ScaleId, chordRoot: number, quality: ChordQuality, previous: number, contour: number, chordAttraction = 1) {
  return rng.weighted(melodyCandidates(scale, chordRoot, quality, previous, contour, chordAttraction).map(x => ({ value: x.note, weight: x.weight })));
}
