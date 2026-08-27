import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/gallery/cellular-automata/automata-engine.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const automata = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const cell = (color = 0, ready = true) => ({ color, ready });

test("Sierpinski newborns split diagonally and emit only once", () => {
  const rules = automata.ruleFromGrid(automata.presetRule("sierpinski"));
  const seed = new Map([[automata.cellKey(5, 1), cell()]]);
  const first = automata.stepAutomaton(seed, rules, 12, 12, "parity", 2);
  assert.deepEqual([...first.cells.keys()].sort(), ["4,2", "5,1", "6,2"]);
  assert.equal(first.cells.get("5,1").ready, false);
  const second = automata.stepAutomaton(first.cells, rules, 12, 12, "parity", 2);
  assert.equal(second.cells.has("5,3"), false, "paired inward offspring should annihilate");
  assert.equal(second.cells.has("5,1"), true, "the spent parent remains in the crystal");
  assert.equal(second.cells.size, 5);
});

test("parity preserves an odd overlap while all-overlap annihilation clears it", () => {
  const sources = new Map([
    [automata.cellKey(2, 3), cell()],
    [automata.cellKey(4, 3), cell()],
    [automata.cellKey(3, 2), cell()],
  ]);
  const rules = [
    { dx: 1, dy: 0, action: 0 },
    { dx: -1, dy: 0, action: 0 },
    { dx: 0, dy: 1, action: 0 },
  ];
  const parity = automata.stepAutomaton(sources, rules, 8, 8, "parity", 2);
  const all = automata.stepAutomaton(sources, rules, 8, 8, "all", 2);
  assert.equal(parity.cells.has("3,3"), true);
  assert.equal(all.cells.has("3,3"), false);
});

test("Celtic cross emits exactly four orthogonal neighbors", () => {
  const rules = automata.ruleFromGrid(automata.presetRule("celtic"));
  assert.deepEqual(rules.map(({ dx, dy }) => [dx, dy]).sort(), [[-1, 0], [0, -1], [0, 1], [1, 0]].sort());
});

test("color reactions can create arbitrary states and explicit annihilators win", () => {
  const seed = new Map([[automata.cellKey(2, 2), cell(1)]]);
  const colored = automata.stepAutomaton(seed, [{ dx: 1, dy: 0, action: 4 }], 6, 6, "cycle", 6);
  assert.deepEqual(colored.cells.get("3,2"), { color: 4, ready: true });

  const occupied = new Map([
    [automata.cellKey(2, 2), cell(1)],
    [automata.cellKey(3, 2), cell(3, false)],
  ]);
  const cleared = automata.stepAutomaton(occupied, [{ dx: 1, dy: 0, action: automata.ANNIHILATE_RULE }], 6, 6, "cycle", 6);
  assert.equal(cleared.cells.has("3,2"), false);
});

test("symmetric seed helpers preserve the requested structures", () => {
  assert.equal(automata.symmetricSeeds("single", 101, 73).size, 1);
  assert.equal(automata.symmetricSeeds("pair", 101, 73).size, 2);
  assert.equal(automata.symmetricSeeds("fourfold", 101, 73).size, 4);
  assert.equal(automata.symmetricSeeds("ring", 101, 73).size, 12);
});

test("field scales preserve the original lattice and expand through 32x", () => {
  assert.deepEqual(automata.FIELD_SCALES, [1, 2, 4, 8, 16, 32]);
  assert.deepEqual(automata.fieldDimensions(1), { columns: 101, rows: 73 });
  assert.deepEqual(automata.fieldDimensions(32), { columns: 3232, rows: 2336 });
});

test("direction-agnostic rules can start from the exact field center", () => {
  const { columns, rows } = automata.fieldDimensions(16);
  const seeds = automata.centeredSeed(columns, rows, 3);
  assert.deepEqual([...seeds.entries()], [[automata.cellKey(Math.floor(columns / 2), Math.floor(rows / 2)), { color: 3, ready: true }]]);
});
