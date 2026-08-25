import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/gallery/harmonic-topography/harmonic-engine.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const engine = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const controls = { familiarity: .76, breakoutChance: .22, runChance: .58, tensionBias: .008, melodyDensity: 1 };
const make = (seed = 1513) => new engine.CompositionEngine(seed, engine.createNodes(), structuredClone(engine.DEFAULT_ROUTES), structuredClone(engine.DEFAULT_PALETTES), controls);

test("v24 contains the exact fixed local chord cycles", () => {
  const nodes = engine.createNodes();
  const labels = Object.fromEntries(["INTRO", "VERSE", "CHORUS", "BRIDGE"].map(section => [section, nodes.filter(node => node.section === section).map(node => node.label)]));
  assert.deepEqual(labels, {
    INTRO: ["Fm9", "Bb13", "Ebmaj7", "Csus4"],
    VERSE: ["Fm9", "Bb13", "Ebmaj7", "Ab", "Gm", "C7alt", "Fm9"],
    CHORUS: ["Ebmaj7", "Ab13", "Dbmaj7", "Gb7", "Fm9", "Bb13"],
    BRIDGE: ["Db7", "C7alt"],
  });
});

test("same seed reproduces the symbolic walk, scales, chords, motifs, and breakouts", () => {
  const a = make(); const b = make();
  const summarize = generator => Array.from({ length: 80 }, () => { const event = generator.nextEvent(); return [event.node.id, event.nextNode.id, event.scale, event.chordQuality, event.motif.id, event.motif.sourceId ?? null, event.breakout]; });
  assert.deepEqual(summarize(a), summarize(b));
});

test("section changes occur only at cycle exits and motif memory really recurs", () => {
  const generator = make(); let reused = 0;
  for (let i = 0; i < 160; i++) {
    const event = generator.nextEvent();
    if (event.motif.sourceId) reused += 1;
    if (event.node.section !== event.nextNode.section) {
      const lastSlot = engine.createNodes().filter(node => node.section === event.node.section).at(-1).slot;
      assert.equal(event.node.slot, lastSlot, `${event.node.id} jumped sections before its local cycle ended`);
    }
  }
  assert.ok(reused > 0, "expected the six-slot FIFO motif bank to reuse at least one motif");
});

test("reference routing and palettes retain the v24 probabilities", () => {
  assert.deepEqual(engine.DEFAULT_ROUTES, {
    INTRO: { VERSE: .46, CHORUS: .34, BRIDGE: .2 },
    VERSE: { VERSE: .34, CHORUS: .66 },
    CHORUS: { VERSE: .44, CHORUS: .18, BRIDGE: .38 },
    BRIDGE: { BRIDGE: .48, CHORUS: .52 },
  });
  assert.deepEqual(engine.DEFAULT_PALETTES.INTRO.map(item => item.weight), [.6, .4]);
  assert.deepEqual(engine.DEFAULT_PALETTES.VERSE.map(item => item.weight), [.58, .24, .18]);
  assert.deepEqual(engine.DEFAULT_PALETTES.CHORUS.map(item => item.weight), [.44, .3, .26]);
  assert.deepEqual(engine.DEFAULT_PALETTES.BRIDGE.map(item => item.weight), [.52, .48]);
});

test("dynamic section lengths preserve complete local cycles and repeated bars", () => {
  const chord = (root, quality, label) => ({ root, quality, label, tension: engine.QUALITY_TENSION[quality] });
  const groups = {
    INTRO: [chord(5, "m9", "Fm9"), chord(5, "m9", "Fm9"), chord(10, "13", "Bb13")],
    VERSE: [chord(3, "maj7", "Ebmaj7"), chord(8, "7", "Ab7"), chord(1, "m7", "Dbm7"), chord(6, "7", "Gb7")],
    CHORUS: [chord(0, "6", "C6"), chord(7, "7", "G7")],
    BRIDGE: [chord(1, "dim7", "Dbdim7"), chord(2, "m7", "Dm7"), chord(7, "7", "G7")],
  };
  const nodes = engine.layoutNodeGroups(groups);
  const generator = new engine.CompositionEngine(44, nodes, structuredClone(engine.DEFAULT_ROUTES), structuredClone(engine.DEFAULT_PALETTES), controls);
  assert.deepEqual(nodes.filter(node => node.section === "INTRO").map(node => node.label), ["Fm9", "Fm9", "Bb13"]);
  for (let i = 0; i < 100; i++) {
    const event = generator.nextEvent();
    if (event.node.section !== event.nextNode.section) assert.equal(event.node.slot, nodes.filter(node => node.section === event.node.section).length - 1);
  }
});
