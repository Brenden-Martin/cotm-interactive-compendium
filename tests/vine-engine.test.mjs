import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/gallery/fractal-vines/vine-engine.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const vines = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("seeded growth decisions replay exactly", () => {
  const first = vines.mulberry32(2401);
  const second = vines.mulberry32(2401);
  assert.deepEqual(Array.from({ length: 12 }, first), Array.from({ length: 12 }, second));
});

test("branch thickness grows logarithmically and saturates", () => {
  const fresh = vines.logarithmicThickness(0, .5, 2, 8);
  const mature = vines.logarithmicThickness(20, .5, 2, 8);
  const ancient = vines.logarithmicThickness(100000, .5, 2, 8);
  assert.equal(fresh, .5);
  assert.ok(mature > fresh);
  assert.equal(ancient, 8);
});

test("path-count variance remains bounded and positive", () => {
  assert.equal(vines.sampleChildCount(2, 0, () => .5), 2);
  assert.ok(vines.sampleChildCount(5, 20, () => 1) <= 7);
  assert.ok(vines.sampleChildCount(1, 20, () => 0) >= 1);
});

test("directional spread opens a straight lineage into a fan", () => {
  const random = () => .5;
  const straight = vines.childHeading(-Math.PI / 2, 0, 3, 0, 0, random);
  const fanned = vines.childHeading(-Math.PI / 2, 0, 3, .5, 0, random);
  assert.ok(Math.abs(straight + Math.PI / 2) < 1e-12);
  assert.notEqual(fanned, straight);
});

test("advected wind is continuous and actually moves horizontally", () => {
  const first = vines.windVector(.4, .6, 0, 2401, 5, .2);
  const near = vines.windVector(.4, .6, .001, 2401, 5, .2);
  const later = vines.windVector(.4, .6, 3, 2401, 5, .2);
  assert.ok(Math.abs(first.x - near.x) < .01);
  assert.notEqual(first.x, later.x);
});
