import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/gallery/do-you-hear-the-rain/rain-engine.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const rain = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("Poisson arrivals remain positive and respond to rain rate", () => {
  assert.equal(rain.poissonInterval(0, .5), Infinity);
  assert.ok(rain.poissonInterval(80, .5) > 0);
  assert.ok(rain.poissonInterval(80, .5) < rain.poissonInterval(8, .5));
});

test("correlated weather cannot jump when no simulation time passes", () => {
  assert.equal(rain.correlatedDrift(2.4, 1, 8, 0, -.9, 3), 2.4);
  const relaxed = rain.correlatedDrift(2.4, 1, 8, 1, 0, 3);
  assert.ok(relaxed < 2.4 && relaxed > 1);
});

test("wet surfaces remember new drops and then decay", () => {
  const deposited = rain.decayWetness(.8, 4, 0, .2);
  assert.equal(deposited, 1);
  assert.ok(rain.decayWetness(deposited, 4, 2) < deposited);
});

test("surface routing follows the configured patch weights", () => {
  const weights = { bucket: 1, gutter: 1, heater: 2, puddle: 0 };
  assert.equal(rain.chooseSurface(.1, weights), "bucket");
  assert.equal(rain.chooseSurface(.3, weights), "gutter");
  assert.equal(rain.chooseSurface(.8, weights), "heater");
});

test("heater splashes chirp upward while vessels plunk downward", () => {
  const heater = rain.impactProfile("heater", 1, .4, 330, .2);
  const bucket = rain.impactProfile("bucket", 1, .4, 330, .2);
  assert.ok(heater.endHz > heater.startHz);
  assert.ok(bucket.endHz < bucket.startHz);
  assert.notEqual(rain.impactProfile("bucket", 1, 0, 330, .4).startHz, rain.impactProfile("bucket", 1, 1, 330, .4).startHz);
});
