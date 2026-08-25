import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/gallery/phase-march/phase-engine.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const phase = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("display phase wraps while the stored field stays unbounded", () => {
  assert.ok(Math.abs(phase.wrapPhase(phase.TAU * 8.25) - phase.TAU * .25) < 1e-10);
  const field = new Float32Array(25);
  phase.applyGaussianTurn(field, 5, 5, 2, 2, 3, 3, 1, 1);
  assert.ok(field[12] > phase.TAU * 2.9);
});

test("Gaussian phase painting is strongest at the brush center", () => {
  const field = new Float32Array(21 * 21);
  phase.applyGaussianTurn(field, 21, 21, 10, 10, 5, 2, 1, 1);
  assert.ok(field[10 * 21 + 10] > field[10 * 21 + 14]);
  assert.ok(field[10 * 21 + 14] > field[0]);
});

test("preset fields preserve expected geometry", () => {
  const blank = phase.makePhaseField(32, 18, "blank");
  assert.ok(blank.every((value) => value === 0));
  const stripes = phase.makePhaseField(32, 18, "striated", { depth: 4, angle: 0 });
  assert.notEqual(stripes[0], stripes[31]);
  assert.equal(stripes[0], stripes[32]);
  const rings = phase.makePhaseField(32, 18, "concentric", { depth: 4 });
  assert.ok(rings[0] > rings[9 * 32 + 16]);
});

test("phase contour velocity points opposite the gradient for forward time", () => {
  const velocity = phase.localPhaseVelocity(2, -1, phase.TAU);
  assert.ok(velocity.x < 0);
  assert.ok(velocity.y > 0);
  assert.deepEqual(phase.localPhaseVelocity(0, 0, phase.TAU), { x: 0, y: 0 });
});

test("every cyclic palette closes at a complete turn", () => {
  for (const name of ["spectrum", "psychedelic", "tidepool", "sunset", "monochrome"]) {
    assert.deepEqual(phase.paletteColor(name, 0), phase.paletteColor(name, phase.TAU));
  }
});
