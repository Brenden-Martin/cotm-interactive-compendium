import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/gallery/phase-barrel/phase-engine.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const phase = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("frequency edits change future velocity without teleporting phase", () => {
  const first = phase.integratePhase(1.25, 2, .1);
  const edited = phase.integratePhase(first.phase, 7, 0);
  assert.equal(edited.phase, first.phase);
  assert.notEqual(phase.integratePhase(edited.phase, 7, .1).phase, edited.phase);
});

test("phase integration reports every trigger crossing", () => {
  const result = phase.integratePhase(phase.TAU * .9, 22, .1);
  assert.equal(result.crossings, 3);
  assert.ok(result.phase >= 0 && result.phase < phase.TAU);
});

test("Gaussian coincidence is strongest at alignment and decays smoothly", () => {
  const hits = [{ time: 10, gain: 1 }, { time: 10, gain: .5 }];
  assert.equal(phase.coincidenceSignal(hits, 10, .1), 1.5);
  assert.ok(phase.coincidenceSignal(hits, 10.1, .1) < 1.5);
  assert.ok(phase.coincidenceSignal(hits, 10.4, .1) < .001);
});

test("layered pendulums are a periodic view of the same continuous phase", () => {
  const center = phase.pendulumPosition(0, 2, Math.PI / 3);
  const right = phase.pendulumPosition(Math.PI / 2, 2, Math.PI / 3);
  const repeated = phase.pendulumPosition(Math.PI * 2, 2, Math.PI / 3);
  assert.ok(Math.abs(center.x) < 1e-12);
  assert.ok(right.x > 0);
  assert.ok(Math.abs(repeated.x - center.x) < 1e-12);
  assert.ok(Math.abs(repeated.y - center.y) < 1e-12);
});
