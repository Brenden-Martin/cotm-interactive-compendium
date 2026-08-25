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

test("sunlight attracts while shade repels", () => {
  const sunlight = vines.guidanceVector(.25, .5, [{ x: .75, y: .5, radius: .5, polarity: 1 }], 1);
  const shade = vines.guidanceVector(.25, .5, [{ x: .75, y: .5, radius: .5, polarity: -1 }], 1);
  assert.ok(sunlight.x > 0);
  assert.ok(shade.x < 0);
  assert.ok(Math.abs(sunlight.y) < 1e-12);
});

test("topology merging preserves roots, forks, ornament nodes, and the active lead tail", () => {
  const nodes = [
    { id: 0, parent: -1, depth: 0, label: "root" },
    { id: 1, parent: 0, depth: 1, label: "linear-a" },
    { id: 2, parent: 1, depth: 2, label: "fork" },
    { id: 3, parent: 2, depth: 3, label: "ornament" },
    { id: 4, parent: 3, depth: 4, label: "tip" },
    { id: 5, parent: 2, depth: 3, label: "side" },
  ];
  const result = vines.mergeLinearTopology(nodes, new Set([0, 3]), [4], 8, 1);
  const labels = new Set(result.nodes.map((node) => node.label));
  assert.ok(labels.has("root"));
  assert.ok(labels.has("fork"));
  assert.ok(labels.has("ornament"));
  assert.ok(labels.has("tip"));
  assert.ok(result.removed > 0);
  for (const node of result.nodes) assert.ok(node.parent < node.id || node.parent === -1);
});

test("leaf and flower growth eases monotonically from bud to maturity", () => {
  assert.equal(vines.bloomProgress(0, 5), 0);
  assert.equal(vines.bloomProgress(5, 5), 1);
  assert.ok(vines.bloomProgress(1, 5) < vines.bloomProgress(3, 5));
});
