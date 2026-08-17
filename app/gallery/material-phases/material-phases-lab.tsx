"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "magnet" | "steel" | "eutectic" | "water";
type WaterPhase = "vapor" | "liquid" | "supercritical" | "ice Ih" | "ice III" | "ice V" | "ice VI" | "ice VII";
type Envelope = { attack: number; decay: number; sustain: number; release: number; peak: number; soak: number; finish: number };
type WaterParticle = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; seed: number };
type SimState = {
  spins: Float32Array;
  grains: Uint16Array;
  defects: Uint8Array;
  alloy: Float32Array;
  alloyNext: Float32Array;
  water: WaterParticle[];
  lastTemperature: number;
  coolingRate: number;
};

const TAU = Math.PI * 2;
const MAG_W = 56;
const MAG_H = 32;
const STEEL_W = 82;
const STEEL_H = 46;
const ALLOY_W = 96;
const ALLOY_H = 54;
const TABS: Array<{ id: Mode; label: string; kicker: string }> = [
  { id: "magnet", label: "Magnetic domains", kicker: "symmetry breaking" },
  { id: "steel", label: "Crystal tempering", kicker: "grain kinetics" },
  { id: "eutectic", label: "Au–Si eutectic", kicker: "phase separation" },
  { id: "water", label: "Water / ice", kicker: "pressure + temperature" },
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const index = (x: number, y: number, w: number, h: number) => ((y + h) % h) * w + ((x + w) % w);

function makeSimulation(siFraction = .5, carbon = .4): SimState {
  const spins = new Float32Array(MAG_W * MAG_H);
  for (let i = 0; i < spins.length; i += 1) spins[i] = Math.random() * TAU;

  const grains = new Uint16Array(STEEL_W * STEEL_H);
  const seeds = Array.from({ length: 42 }, () => ({ x: Math.random() * STEEL_W, y: Math.random() * STEEL_H, id: 1 + Math.floor(Math.random() * 255) }));
  for (let y = 0; y < STEEL_H; y += 1) for (let x = 0; x < STEEL_W; x += 1) {
    let nearest = seeds[0];
    let distance = Infinity;
    for (const seed of seeds) {
      const d = (seed.x - x) ** 2 + (seed.y - y) ** 2;
      if (d < distance) { distance = d; nearest = seed; }
    }
    grains[y * STEEL_W + x] = nearest.id;
  }
  const defects = new Uint8Array(STEEL_W * STEEL_H);
  const defectChance = clamp(carbon / 2.2, 0, 1) * .24;
  for (let i = 0; i < defects.length; i += 1) defects[i] = Math.random() < defectChance ? 1 : 0;

  const alloy = new Float32Array(ALLOY_W * ALLOY_H);
  const alloyNext = new Float32Array(alloy.length);
  const divide = Math.round(ALLOY_H * siFraction);
  for (let y = 0; y < ALLOY_H; y += 1) for (let x = 0; x < ALLOY_W; x += 1) {
    alloy[y * ALLOY_W + x] = y < divide ? .98 : .02;
  }

  const water: WaterParticle[] = Array.from({ length: 240 }, (_, i) => ({
    x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .01, vy: (Math.random() - .5) * .01,
    tx: 0, ty: 0, seed: i * 1.618,
  }));
  return { spins, grains, defects, alloy, alloyNext, water, lastTemperature: 20, coolingRate: 0 };
}

function waterPhase(temperature: number, pressure: number): WaterPhase {
  if (temperature >= 647.096 && pressure >= 22.064) return "supercritical";
  const meltIh = 273.16 - .105 * Math.min(pressure, 210);
  if (pressure >= 2200 && temperature < 420) return "ice VII";
  if (pressure >= 630 && temperature < 360) return "ice VI";
  if (pressure >= 350 && temperature < 300) return "ice V";
  if (pressure >= 210 && temperature < 270) return "ice III";
  const vaporBoundary = temperature < 273.16
    ? .000611657 * Math.exp((temperature - 273.16) / 19)
    : .000611657 * Math.exp(clamp((temperature - 273.16) / 46, 0, 6.6));
  if (pressure < vaporBoundary) return "vapor";
  if (temperature < meltIh) return "ice Ih";
  return "liquid";
}

function alloyLiquidus(si: number) {
  return si <= 18.6 ? mix(1064, 363, si / 18.6) : mix(363, 1414, (si - 18.6) / 81.4);
}

function steelPhase(temperature: number, carbon: number, coolingRate: number) {
  if (temperature > 1450 - carbon * 45) return "liquid steel";
  if (temperature > Math.max(727, 912 - 243 * Math.min(carbon / .76, 1))) return "austenite";
  if (coolingRate > 180 && temperature < 500) return "martensite-rich";
  if (carbon < .76) return "ferrite + pearlite";
  return "pearlite + cementite";
}

function setWaterTargets(particles: WaterParticle[], phase: WaterPhase) {
  const cols = 20;
  for (let i = 0; i < particles.length; i += 1) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    let tx = (col + .6) / cols;
    let ty = (row + .7) / 12.5;
    if (phase === "ice Ih") tx += (row % 2) * .024;
    if (phase === "ice III") { tx += Math.sin(row * 1.7) * .012; ty += Math.sin(col * 1.3) * .01; }
    if (phase === "ice V") { tx += (row % 3) * .012; ty += Math.sin(col * .8) * .018; }
    if (phase === "ice VI") { tx += (i % 2 ? .018 : -.018); ty += (col % 2 ? .012 : -.012); }
    if (phase === "ice VII") { tx += (row % 2) * .025; ty += (col % 2) * .02; }
    particles[i].tx = clamp(tx, .03, .97);
    particles[i].ty = clamp(ty, .04, .96);
  }
}

function drawMagnet(ctx: CanvasRenderingContext2D, sim: SimState, temperature: number, field: number, exchange: number) {
  const spins = sim.spins;
  const updates = 1700;
  for (let k = 0; k < updates; k += 1) {
    const x = Math.floor(Math.random() * MAG_W);
    const y = Math.floor(Math.random() * MAG_H);
    let vx = field * 2.3;
    let vy = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = spins[index(x + dx, y + dy, MAG_W, MAG_H)];
      vx += Math.cos(a) * exchange;
      vy += Math.sin(a) * exchange;
    }
    const old = spins[index(x, y, MAG_W, MAG_H)];
    const anisotropy = .32 * Math.cos(old * 2);
    const target = Math.atan2(vy, vx + anisotropy);
    const delta = Math.atan2(Math.sin(target - old), Math.cos(target - old));
    spins[index(x, y, MAG_W, MAG_H)] = old + delta * .18 + (Math.random() - .5) * temperature * .42;
  }
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cw = w / MAG_W;
  const ch = h / MAG_H;
  ctx.fillStyle = "#080708";
  ctx.fillRect(0, 0, w, h);
  let mx = 0;
  let my = 0;
  for (let y = 0; y < MAG_H; y += 1) for (let x = 0; x < MAG_W; x += 1) {
    const a = spins[y * MAG_W + x];
    mx += Math.cos(a); my += Math.sin(a);
    ctx.fillStyle = `hsl(${(a / TAU * 360 + 360) % 360} 88% 20%)`;
    ctx.fillRect(x * cw, y * ch, cw + .5, ch + .5);
    ctx.strokeStyle = `hsl(${(a / TAU * 360 + 360) % 360} 96% 72%)`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo((x + .5) * cw - Math.cos(a) * cw * .34, (y + .5) * ch - Math.sin(a) * ch * .34);
    ctx.lineTo((x + .5) * cw + Math.cos(a) * cw * .34, (y + .5) * ch + Math.sin(a) * ch * .34);
    ctx.stroke();
  }
  const order = Math.hypot(mx, my) / spins.length;
  ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(12, 12, 190, 34);
  ctx.fillStyle = "#fff6b5"; ctx.font = "700 14px ui-monospace,monospace";
  ctx.fillText(`ORDER |M| = ${order.toFixed(3)}`, 22, 34);
}

function boundaryCount(grains: Uint16Array, x: number, y: number) {
  const own = grains[index(x, y, STEEL_W, STEEL_H)];
  let n = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (grains[index(x + dx, y + dy, STEEL_W, STEEL_H)] !== own) n += 1;
  return n;
}

function drawSteel(ctx: CanvasRenderingContext2D, sim: SimState, temperature: number, carbon: number) {
  const dt = 1 / 60;
  sim.coolingRate = sim.coolingRate * .94 + Math.max(0, sim.lastTemperature - temperature) / dt * .06;
  sim.lastTemperature = temperature;
  const mobility = clamp((temperature - 450) / 650, 0, 1) * clamp((1500 - temperature) / 180, .15, 1);
  const attempts = Math.floor(250 + mobility * 2500);
  for (let k = 0; k < attempts; k += 1) {
    const x = Math.floor(Math.random() * STEEL_W);
    const y = Math.floor(Math.random() * STEEL_H);
    const i = y * STEEL_W + x;
    if (sim.defects[i] && Math.random() < .82) continue;
    if (temperature > 1450 - carbon * 45 && Math.random() < .08) { sim.grains[i] = 1 + Math.floor(Math.random() * 255); continue; }
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const [dx, dy] = neighbors[Math.floor(Math.random() * neighbors.length)];
    const source = index(x + dx, y + dy, STEEL_W, STEEL_H);
    const before = boundaryCount(sim.grains, x, y);
    const old = sim.grains[i];
    sim.grains[i] = sim.grains[source];
    const after = boundaryCount(sim.grains, x, y);
    if (after > before && Math.random() > mobility * .18) sim.grains[i] = old;
  }
  const w = ctx.canvas.width, h = ctx.canvas.height, cw = w / STEEL_W, ch = h / STEEL_H;
  const phase = steelPhase(temperature, carbon, sim.coolingRate);
  ctx.fillStyle = "#0a0b0d"; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < STEEL_H; y += 1) for (let x = 0; x < STEEL_W; x += 1) {
    const i = y * STEEL_W + x;
    const g = sim.grains[i];
    const hue = phase === "austenite" ? 38 + (g % 18) : phase === "martensite-rich" ? 195 + (g % 32) : 205 + (g % 70);
    const light = phase === "liquid steel" ? 45 + Math.sin(g) * 12 : 34 + (g % 23);
    ctx.fillStyle = `hsl(${hue} ${phase === "liquid steel" ? 90 : 42}% ${light}%)`;
    ctx.fillRect(x * cw, y * ch, cw + .4, ch + .4);
    if (sim.defects[i]) { ctx.fillStyle = "#1a0907"; ctx.fillRect((x + .25) * cw, (y + .25) * ch, cw * .5, ch * .5); }
  }
  ctx.fillStyle = "rgba(0,0,0,.74)"; ctx.fillRect(12, 12, 260, 34);
  ctx.fillStyle = "#fff1ae"; ctx.font = "700 14px ui-monospace,monospace"; ctx.fillText(phase.toUpperCase(), 22, 34);
}

function drawEutectic(ctx: CanvasRenderingContext2D, sim: SimState, temperature: number, si: number, mobilityControl: number) {
  const liquidus = alloyLiquidus(si);
  const separation = clamp((liquidus - temperature) / 260, -1.1, 1.25);
  const mobility = (.008 + mobilityControl * .035) * (temperature > liquidus ? 1.3 : .72);
  for (let y = 0; y < ALLOY_H; y += 1) for (let x = 0; x < ALLOY_W; x += 1) {
    const i = y * ALLOY_W + x;
    const p = sim.alloy[i] * 2 - 1;
    const lap = sim.alloy[index(x + 1, y, ALLOY_W, ALLOY_H)] + sim.alloy[index(x - 1, y, ALLOY_W, ALLOY_H)] + sim.alloy[index(x, y + 1, ALLOY_W, ALLOY_H)] + sim.alloy[index(x, y - 1, ALLOY_W, ALLOY_H)] - 4 * sim.alloy[i];
    const mu = p * p * p - separation * p - 1.1 * lap;
    sim.alloyNext[i] = mu;
  }
  for (let y = 0; y < ALLOY_H; y += 1) for (let x = 0; x < ALLOY_W; x += 1) {
    const i = y * ALLOY_W + x;
    const lapMu = sim.alloyNext[index(x + 1, y, ALLOY_W, ALLOY_H)] + sim.alloyNext[index(x - 1, y, ALLOY_W, ALLOY_H)] + sim.alloyNext[index(x, y + 1, ALLOY_W, ALLOY_H)] + sim.alloyNext[index(x, y - 1, ALLOY_W, ALLOY_H)] - 4 * sim.alloyNext[i];
    sim.alloyNext[i] = clamp(sim.alloy[i] + mobility * lapMu + (Math.random() - .5) * Math.max(0, temperature - liquidus) / 6000, 0, 1);
  }
  const swap = sim.alloy; sim.alloy = sim.alloyNext; sim.alloyNext = swap;
  const w = ctx.canvas.width, h = ctx.canvas.height, cw = w / ALLOY_W, ch = h / ALLOY_H;
  ctx.fillStyle = "#0a0907"; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < ALLOY_H; y += 1) for (let x = 0; x < ALLOY_W; x += 1) {
    const c = sim.alloy[y * ALLOY_W + x];
    const gold = [242, 174, 36], silicon = [45, 215, 224];
    const r = Math.round(mix(gold[0], silicon[0], c));
    const g = Math.round(mix(gold[1], silicon[1], c));
    const b = Math.round(mix(gold[2], silicon[2], c));
    ctx.fillStyle = `rgb(${r} ${g} ${b})`; ctx.fillRect(x * cw, y * ch, cw + .5, ch + .5);
  }
  const label = temperature >= liquidus ? "LIQUID / MIXING" : "SOLID / DEMIXING";
  ctx.fillStyle = "rgba(0,0,0,.72)"; ctx.fillRect(12, 12, 250, 34);
  ctx.fillStyle = "#fff4b0"; ctx.font = "700 14px ui-monospace,monospace"; ctx.fillText(label, 22, 34);
}

function drawWater(ctx: CanvasRenderingContext2D, sim: SimState, temperature: number, pressure: number) {
  const phase = waterPhase(temperature, pressure);
  const solid = phase.startsWith("ice");
  if (solid) setWaterTargets(sim.water, phase);
  const speed = phase === "vapor" ? .0028 + temperature / 240000 : phase === "supercritical" ? .004 : .0011;
  for (const p of sim.water) {
    if (solid) {
      p.vx += (p.tx - p.x) * .008; p.vy += (p.ty - p.y) * .008;
      p.vx *= .86; p.vy *= .86;
    } else if (phase === "liquid") {
      p.vx += (.5 - p.x) * .00013 + (Math.random() - .5) * speed;
      p.vy += (.58 - p.y) * .00013 + (Math.random() - .5) * speed;
      p.vx *= .985; p.vy *= .985;
    } else {
      p.vx += (Math.random() - .5) * speed; p.vy += (Math.random() - .5) * speed;
      p.vx *= .995; p.vy *= .995;
    }
    p.x += p.vx; p.y += p.vy;
    if (p.x < .01 || p.x > .99) { p.vx *= -1; p.x = clamp(p.x, .01, .99); }
    if (p.y < .02 || p.y > .98) { p.vy *= -1; p.y = clamp(p.y, .02, .98); }
  }
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.fillStyle = phase === "vapor" ? "#11131c" : phase === "supercritical" ? "#220f25" : "#071522"; ctx.fillRect(0, 0, w, h);
  if (solid) {
    ctx.strokeStyle = "rgba(130,225,255,.2)"; ctx.lineWidth = 1;
    for (let i = 1; i < sim.water.length; i += 1) {
      const a = sim.water[i - 1], b = sim.water[i];
      if (Math.abs(a.y - b.y) < .08) { ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke(); }
    }
  }
  for (const p of sim.water) {
    const radius = phase === "vapor" ? 2.2 : solid ? 3.4 : 4.1;
    ctx.fillStyle = phase === "supercritical" ? "rgba(255,97,225,.72)" : solid ? "rgba(175,240,255,.9)" : "rgba(64,174,255,.78)";
    ctx.beginPath(); ctx.arc(p.x * w, p.y * h, radius, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(12, 12, 230, 34);
  ctx.fillStyle = "#dffaff"; ctx.font = "700 14px ui-monospace,monospace"; ctx.fillText(phase.toUpperCase(), 22, 34);
}

function drawAxes(ctx: CanvasRenderingContext2D, xLabel: string, yLabel: string) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.fillStyle = "#f7efc5"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#21120e"; ctx.lineWidth = 2; ctx.strokeRect(48, 20, w - 72, h - 70);
  ctx.fillStyle = "#21120e"; ctx.font = "700 12px ui-monospace,monospace";
  ctx.fillText(xLabel, w / 2 - ctx.measureText(xLabel).width / 2, h - 14);
  ctx.save(); ctx.translate(16, h / 2 + ctx.measureText(yLabel).width / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();
}

function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
  ctx.strokeStyle = "#ff3d2e"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.stroke();
  ctx.fillStyle = "#ff3d2e"; ctx.font = "800 11px ui-monospace,monospace"; ctx.fillText(label, clamp(x + 12, 54, ctx.canvas.width - 180), clamp(y - 9, 18, ctx.canvas.height - 55));
}

function drawDiagram(ctx: CanvasRenderingContext2D, mode: Mode, values: { magT: number; field: number; steelT: number; carbon: number; eutecticT: number; si: number; waterT: number; pressure: number }) {
  const w = ctx.canvas.width, h = ctx.canvas.height, left = 48, top = 20, right = w - 24, bottom = h - 50;
  if (mode === "magnet") {
    drawAxes(ctx, "EXTERNAL FIELD H / J", "TEMPERATURE T / Tc");
    const tcY = mix(bottom, top, 1 / 1.8);
    ctx.fillStyle = "rgba(255,70,48,.16)"; ctx.fillRect(left, tcY, right - left, bottom - tcY);
    ctx.fillStyle = "rgba(49,189,255,.12)"; ctx.fillRect(left, top, right - left, tcY - top);
    ctx.setLineDash([8, 7]); ctx.strokeStyle = "#db392d"; ctx.beginPath(); ctx.moveTo(left, tcY); ctx.lineTo(right, tcY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#21120e"; ctx.font = "800 13px ui-monospace,monospace"; ctx.fillText("DOMAIN ORDER", 64, bottom - 18); ctx.fillText("THERMAL DISORDER", 64, top + 22); ctx.fillText("FINITE-GRID Tc", right - 142, tcY - 8);
    drawCursor(ctx, mix(left, right, (values.field + 1.2) / 2.4), mix(bottom, top, values.magT / 1.8), `T/Tc ${values.magT.toFixed(2)} · H ${values.field.toFixed(2)}`);
  } else if (mode === "steel") {
    drawAxes(ctx, "CARBON (wt%)", "TEMPERATURE (°C)");
    const px = (c: number) => mix(left, right, c / 2.1), py = (t: number) => mix(bottom, top, (t - 20) / 1580);
    ctx.fillStyle = "rgba(255,184,45,.18)"; ctx.beginPath(); ctx.moveTo(px(0), py(1538)); ctx.lineTo(px(2.1), py(1350)); ctx.lineTo(px(2.1), top); ctx.lineTo(left, top); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#a52820"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px(0), py(912)); ctx.lineTo(px(.76), py(727)); ctx.lineTo(px(2.1), py(1147)); ctx.stroke();
    ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(left, py(727)); ctx.lineTo(right, py(727)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#21120e"; ctx.font = "800 12px ui-monospace,monospace"; ctx.fillText("AUSTENITE", px(.55), py(1050)); ctx.fillText("FERRITE + PEARLITE", px(.12), py(430)); ctx.fillText("EUTECTOID", px(.78), py(727) - 8);
    drawCursor(ctx, px(values.carbon), py(values.steelT), `${values.steelT.toFixed(0)}°C · ${values.carbon.toFixed(2)} wt% C`);
  } else if (mode === "eutectic") {
    drawAxes(ctx, "SILICON (atomic %)", "TEMPERATURE (°C)");
    const px = (c: number) => mix(left, right, c / 100), py = (t: number) => mix(bottom, top, (t - 20) / 1450);
    ctx.fillStyle = "rgba(57,211,224,.14)"; ctx.beginPath(); ctx.moveTo(px(0), py(1064)); ctx.lineTo(px(18.6), py(363)); ctx.lineTo(px(100), py(1414)); ctx.lineTo(right, top); ctx.lineTo(left, top); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#a52820"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px(0), py(1064)); ctx.lineTo(px(18.6), py(363)); ctx.lineTo(px(100), py(1414)); ctx.stroke();
    ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(left, py(363)); ctx.lineTo(right, py(363)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#21120e"; ctx.font = "800 12px ui-monospace,monospace"; ctx.fillText("LIQUID", px(48), py(1120)); ctx.fillText("Au + Si", px(46), py(210)); ctx.fillText("18.6% Si / 363°C EUTECTIC", px(18.6) + 8, py(363) - 8);
    drawCursor(ctx, px(values.si), py(values.eutecticT), `${values.eutecticT.toFixed(0)}°C · ${values.si.toFixed(1)} at% Si`);
  } else {
    drawAxes(ctx, "TEMPERATURE (K)", "PRESSURE (MPa, log scale)");
    const px = (t: number) => mix(left, right, (t - 150) / 600), py = (p: number) => mix(bottom, top, (Math.log10(clamp(p, 1e-4, 1e4)) + 4) / 8);
    const regions: Array<[string, number, number, string]> = [["ICE Ih", 210, .03, "#d8f5ff"], ["ICE III / V", 245, 320, "#b8e4ff"], ["ICE VI", 310, 850, "#9dccff"], ["ICE VII", 370, 3300, "#c6a9ff"], ["LIQUID", 400, 8, "#63c4ff"], ["VAPOR", 520, .001, "#f4d5ff"]];
    for (const [label, t, p, color] of regions) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px(t as number), py(p as number), 32, 0, TAU); ctx.fill(); ctx.fillStyle = "#21120e"; ctx.font = "800 10px ui-monospace,monospace"; ctx.fillText(label as string, px(t as number) - 25, py(p as number) + 4); }
    ctx.strokeStyle = "#a52820"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px(150), py(.0001)); ctx.quadraticCurveTo(px(235), py(.0002), px(273.16), py(.000611657)); ctx.quadraticCurveTo(px(430), py(.6), px(647.096), py(22.064)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(273.16), py(.000611657)); ctx.lineTo(px(251.165), py(210)); ctx.lineTo(px(273), py(350)); ctx.lineTo(px(355), py(2200)); ctx.stroke();
    ctx.fillStyle = "#21120e"; ctx.font = "800 10px ui-monospace,monospace"; ctx.fillText("TRIPLE", px(273.16) + 6, py(.000611657) - 7); ctx.fillText("CRITICAL", px(647.096) - 62, py(22.064) - 8);
    drawCursor(ctx, px(values.waterT), py(values.pressure), `${values.waterT.toFixed(1)} K · ${values.pressure.toPrecision(3)} MPa`);
  }
}

function Numeric({ label, value, unit, min, max, step, onChange }: { label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="material-numeric"><span>{label}</span><span><input type="number" value={Number(value.toFixed(step < .01 ? 4 : step < 1 ? 2 : 0))} min={min} max={max} step={step} onChange={(event) => onChange(clamp(Number(event.target.value), min, max))} /> {unit}</span></label>;
}

export function MaterialPhasesLab() {
  const simCanvas = useRef<HTMLCanvasElement>(null);
  const diagramCanvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef(makeSimulation());
  const valuesRef = useRef({ magT: .68, field: 0, exchange: 1, steelT: 780, carbon: .4, eutecticT: 420, si: 50, mobility: .65, waterT: 298, pressure: .101325 });
  const [mode, setMode] = useState<Mode>("magnet");
  const [magT, setMagT] = useState(.68);
  const [field, setField] = useState(0);
  const [exchange, setExchange] = useState(1);
  const [steelT, setSteelT] = useState(780);
  const [carbon, setCarbon] = useState(.4);
  const [eutecticT, setEutecticT] = useState(420);
  const [si, setSi] = useState(50);
  const [mobility, setMobility] = useState(.65);
  const [waterT, setWaterT] = useState(298);
  const [pressure, setPressure] = useState(.101325);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [envelope, setEnvelope] = useState<Envelope>({ attack: 4, decay: 2, sustain: 6, release: 8, peak: 1180, soak: 840, finish: 80 });
  const [envelopeStage, setEnvelopeStage] = useState("idle");
  const envelopeRun = useRef<{ started: number; initial: number; mode: Mode } | null>(null);

  useEffect(() => { valuesRef.current = { magT, field, exchange, steelT, carbon, eutecticT, si, mobility, waterT, pressure }; }, [magT, field, exchange, steelT, carbon, eutecticT, si, mobility, waterT, pressure]);

  const reset = useCallback((targetMode = mode, overrides?: { si?: number; carbon?: number }) => {
    const nextSi = overrides?.si ?? valuesRef.current.si;
    const nextCarbon = overrides?.carbon ?? valuesRef.current.carbon;
    sim.current = makeSimulation(nextSi / 100, nextCarbon);
    setResetToken((v) => v + 1);
    if (targetMode === "water") setWaterTargets(sim.current.water, waterPhase(valuesRef.current.waterT, valuesRef.current.pressure));
  }, [mode]);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      const canvas = simCanvas.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        const v = valuesRef.current;
        if (mode === "magnet") drawMagnet(ctx, sim.current, v.magT, v.field, v.exchange);
        else if (mode === "steel") drawSteel(ctx, sim.current, v.steelT, v.carbon);
        else if (mode === "eutectic") drawEutectic(ctx, sim.current, v.eutecticT, v.si, v.mobility);
        else drawWater(ctx, sim.current, v.waterT, v.pressure);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [mode, resetToken]);

  useEffect(() => {
    const ctx = diagramCanvas.current?.getContext("2d");
    if (ctx) drawDiagram(ctx, mode, { magT, field, steelT, carbon, eutecticT, si, waterT, pressure });
  }, [mode, magT, field, steelT, carbon, eutecticT, si, waterT, pressure]);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      const run = envelopeRun.current;
      if (run) {
        const elapsed = (now - run.started) / 1000;
        const a = envelope.attack, d = envelope.decay, s = envelope.sustain, r = envelope.release;
        let value = run.initial;
        let stage = "heat ramp {attack}";
        if (elapsed < a) value = mix(run.initial, envelope.peak, elapsed / Math.max(a, .01));
        else if (elapsed < a + d) { stage = "equalize {decay}"; value = mix(envelope.peak, envelope.soak, (elapsed - a) / Math.max(d, .01)); }
        else if (elapsed < a + d + s) { stage = "soak {sustain}"; value = envelope.soak; }
        else if (elapsed < a + d + s + r) { stage = "cooldown {release}"; value = mix(envelope.soak, envelope.finish, (elapsed - a - d - s) / Math.max(r, .01)); }
        else { envelopeRun.current = null; stage = "complete"; value = envelope.finish; }
        if (run.mode === "steel") setSteelT(value); else setEutecticT(value);
        setEnvelopeStage(stage);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [envelope]);

  const selectDiagram = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = diagramCanvas.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 48 / 700, 676 / 700);
    const y = clamp((event.clientY - rect.top) / rect.height, 20 / 340, 290 / 340);
    const nx = (x - 48 / 700) / ((676 - 48) / 700);
    const ny = 1 - (y - 20 / 340) / ((290 - 20) / 340);
    if (mode === "magnet") { setField(nx * 2.4 - 1.2); setMagT(ny * 1.8); }
    else if (mode === "steel") { const nextCarbon = nx * 2.1; setCarbon(nextCarbon); setSteelT(20 + ny * 1580); reset("steel", { carbon: nextCarbon }); }
    else if (mode === "eutectic") { const nextSi = nx * 100; setSi(nextSi); setEutecticT(20 + ny * 1450); reset("eutectic", { si: nextSi }); }
    else { setWaterT(150 + nx * 600); setPressure(10 ** (-4 + ny * 8)); }
  };

  const runThermalEnvelope = () => {
    const initial = mode === "steel" ? steelT : eutecticT;
    envelopeRun.current = { started: performance.now(), initial, mode };
    setEnvelopeStage("heat ramp {attack}");
  };

  const active = TABS.find((tab) => tab.id === mode)!;
  return (
    <main className="material-page">
      <header className="material-head">
        <Link href="/gallery">← Gallery</Link>
        <span>Interactive Exhibit 28</span>
        <button type="button" onClick={() => setControlsOpen((v) => !v)}>{controlsOpen ? "Hide controls" : "Show controls"}</button>
      </header>
      <section className="material-title">
        <p>PHASE SPACE / KINETIC MATTER</p>
        <h1>Material<br />Phases</h1>
        <span>Tap a thermodynamic condition below. Watch matter negotiate it above.</span>
      </section>

      <nav className="material-tabs" aria-label="Material systems">
        {TABS.map((tab) => <button key={tab.id} type="button" className={mode === tab.id ? "active" : ""} onClick={() => setMode(tab.id)}><small>{tab.kicker}</small>{tab.label}</button>)}
      </nav>

      <section className="material-ds" aria-label={`${active.label} dual-screen phase laboratory`}>
        <div className="material-screen material-sim-screen">
          <header><span>PARTICLE / DOMAIN WINDOW</span><b>{active.label}</b></header>
          <canvas ref={simCanvas} width="700" height="390" aria-label={`Live ${active.label} simulation`} />
        </div>
        <div className="material-hinge"><i /><i /><span>THERMODYNAMIC HINGE</span><i /><i /></div>
        <div className="material-screen material-diagram-screen">
          <header><span>PHASE DIAGRAM / TOUCH SURFACE</span><b>tap or drag to set conditions</b></header>
          <canvas ref={diagramCanvas} width="700" height="340" onPointerDown={selectDiagram} onPointerMove={(event) => { if (event.buttons) selectDiagram(event); }} aria-label={`Interactive ${active.label} phase diagram`} />
        </div>
      </section>

      {controlsOpen && <section className="material-console">
        <div className="material-console-head"><div><span>DIRECT ENTRY</span><b>{active.label}</b></div><button type="button" onClick={() => reset()}>Reset material</button></div>
        <div className="material-numeric-grid">
          {mode === "magnet" && <>
            <Numeric label="Temperature" value={magT} unit="T/Tc" min={0} max={1.8} step={.01} onChange={setMagT} />
            <Numeric label="External field" value={field} unit="H/J" min={-1.2} max={1.2} step={.01} onChange={setField} />
            <Numeric label="Exchange coupling" value={exchange} unit="J" min={.1} max={2.5} step={.01} onChange={setExchange} />
          </>}
          {mode === "steel" && <>
            <Numeric label="Temperature" value={steelT} unit="°C" min={20} max={1600} step={1} onChange={setSteelT} />
            <Numeric label="Carbon defects" value={carbon} unit="wt% C" min={0} max={2.1} step={.01} onChange={(value) => { setCarbon(value); reset("steel", { carbon: value }); }} />
          </>}
          {mode === "eutectic" && <>
            <Numeric label="Temperature" value={eutecticT} unit="°C" min={20} max={1470} step={1} onChange={setEutecticT} />
            <Numeric label="Silicon fraction" value={si} unit="atomic %" min={0} max={100} step={.1} onChange={(value) => { setSi(value); reset("eutectic", { si: value }); }} />
            <Numeric label="Atomic mobility" value={mobility} unit="relative" min={.05} max={1.5} step={.01} onChange={setMobility} />
          </>}
          {mode === "water" && <>
            <Numeric label="Temperature" value={waterT} unit="K" min={150} max={750} step={.1} onChange={setWaterT} />
            <Numeric label="Pressure" value={pressure} unit="MPa" min={.0001} max={10000} step={.0001} onChange={setPressure} />
          </>}
        </div>

        {(mode === "steel" || mode === "eutectic") && <div className="material-envelope">
          <header><div><span>THERMAL PROCESS ENVELOPE</span><b>{envelopeStage}</b></div><button type="button" onClick={runThermalEnvelope}>Run cycle</button></header>
          <div className="material-envelope-grid">
            {(["attack", "decay", "sustain", "release"] as const).map((key) => <label key={key}><span>{key === "attack" ? "Heat ramp {attack}" : key === "decay" ? "Equalize {decay}" : key === "sustain" ? "Soak {sustain}" : "Cooldown {release}"}</span><input type="range" min=".5" max="20" step=".5" value={envelope[key]} onChange={(event) => setEnvelope({ ...envelope, [key]: Number(event.target.value) })} /><b>{envelope[key].toFixed(1)} s</b></label>)}
            {(["peak", "soak", "finish"] as const).map((key) => <label key={key}><span>{key === "peak" ? "Peak / melt" : key === "soak" ? "Hold temperature" : "Final temperature"}</span><input type="range" min="20" max={mode === "steel" ? 1600 : 1470} step="5" value={envelope[key]} onChange={(event) => setEnvelope({ ...envelope, [key]: Number(event.target.value) })} /><b>{envelope[key].toFixed(0)} °C</b></label>)}
          </div>
        </div>}
      </section>}

      <section className="material-model-notes">
        <h2>What the toy knows</h2>
        <p><b>Magnet:</b> planar spins use nearest-neighbor exchange, weak easy-axis anisotropy, thermal noise, and an external field. The marked Tc is a finite-grid ordering crossover—not a calibration to a named magnet.</p>
        <p><b>Steel:</b> a Potts-style grain-growth field shows curvature-driven coarsening, carbon pinning, melting disorder, and a cooling-rate martensite cue. It is an intuition machine, not a CALPHAD, TTT, or CCT predictor.</p>
        <p><b>Au–Si:</b> a conservative phase-field sketch begins as two thin-film layers, mixes above the liquidus, and demixes below it. The eutectic anchor is 18.6 atomic % Si at 363 ± 3 °C.</p>
        <p><b>Water:</b> particles settle into distinct visual lattices selected by an approximate phase map. The triple and critical anchors are exact reference points; the broad ice-region boundaries are deliberately schematic.</p>
        <div><a href="https://advanced.onlinelibrary.wiley.com/doi/full/10.1002/advs.201903544">Au–Si crystallization study ↗</a><a href="https://iapws.org/documents/release/MeltSub.download">IAPWS ice boundaries ↗</a><a href="https://www.nist.gov/publications/heat-treatment-and-properties-iron-and-steel">NIST heat-treatment monograph ↗</a><a href="https://journals.aps.org/prresearch/abstract/10.1103/PhysRevResearch.3.043024">2D magnetic anisotropy ↗</a></div>
      </section>
    </main>
  );
}
