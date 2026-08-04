"use client";

import { useEffect, useRef, useState } from "react";

const TAU = Math.PI * 2;
const BALL_RADIUS = .105;
const FIXED_STEP = 1 / 150;

type SurfaceId = "torus" | "sphere" | "mobius" | "klein";
type GameMode = "golf" | "pool";
type GravityMode = "geodesic" | "world" | "normal";
type Vec3 = { x: number; y: number; z: number };
type Hill = { u: number; v: number; amplitude: number; sigma: number };
type TracePoint = { u: number; v: number; h: number };
type Ball = {
  id: number;
  u: number;
  v: number;
  du: number;
  dv: number;
  h: number;
  dh: number;
  color: string;
  sunk: boolean;
  trace: TracePoint[];
  traceClock: number;
};
type Target = { u: number; v: number };
type Camera = { yaw: number; pitch: number; zoom: number; dragging: boolean; aiming: boolean; pointerX: number; pointerY: number; aimBall: number };
type Config = {
  surface: SurfaceId;
  mode: GameMode;
  gravityMode: GravityMode;
  gravity: number;
  friction: number;
  terrain: number;
  power: number;
  aim: number;
  paused: boolean;
  poolCount: number;
  hills: Hill[];
};

const SURFACES: { id: SurfaceId; label: string; orientable: boolean }[] = [
  { id: "torus", label: "Torus", orientable: true },
  { id: "sphere", label: "Sphere", orientable: true },
  { id: "mobius", label: "Möbius", orientable: false },
  { id: "klein", label: "Klein bottle", orientable: false },
];

const BALL_COLORS = ["#f4f0df", "#f2d83d", "#20d7d7", "#f06448", "#8f79d6", "#f29b38", "#72d58b", "#e96aab", "#7eb9f5", "#d9d2c1"];
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec3, amount: number): Vec3 => ({ x: a.x * amount, y: a.y * amount, z: a.z * amount });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const length = (a: Vec3) => Math.hypot(a.x, a.y, a.z);
const unit = (a: Vec3) => scale(a, 1 / Math.max(length(a), 1e-9));
const shortAngle = (value: number) => {
  let result = value;
  while (result > Math.PI) result -= TAU;
  while (result < -Math.PI) result += TAU;
  return result;
};

function domain(surface: SurfaceId) {
  if (surface === "sphere") return { minV: -Math.PI / 2 + .055, maxV: Math.PI / 2 - .055, periodicV: false };
  if (surface === "mobius") return { minV: -.86, maxV: .86, periodicV: false };
  return { minV: 0, maxV: TAU, periodicV: true };
}

function rawPoint(surface: SurfaceId, u: number, v: number): Vec3 {
  if (surface === "sphere") {
    const radius = 2.15;
    return { x: radius * Math.cos(v) * Math.cos(u), y: radius * Math.cos(v) * Math.sin(u), z: radius * Math.sin(v) };
  }
  if (surface === "mobius") {
    const radial = 2.05 + v * Math.cos(u / 2);
    return { x: radial * Math.cos(u), y: radial * Math.sin(u), z: v * Math.sin(u / 2) };
  }
  if (surface === "klein") {
    const tube = Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v);
    const radial = 2.15 + .72 * tube;
    return {
      x: radial * Math.cos(u),
      y: radial * Math.sin(u),
      z: .72 * (Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v)),
    };
  }
  const major = 2.25;
  const minor = .82;
  return { x: (major + minor * Math.cos(v)) * Math.cos(u), y: (major + minor * Math.cos(v)) * Math.sin(u), z: minor * Math.sin(v) };
}

function rawNormal(surface: SurfaceId, u: number, v: number) {
  const epsilon = .0012;
  const tangentU = scale(sub(rawPoint(surface, u + epsilon, v), rawPoint(surface, u - epsilon, v)), 1 / (2 * epsilon));
  const tangentV = scale(sub(rawPoint(surface, u, v + epsilon), rawPoint(surface, u, v - epsilon)), 1 / (2 * epsilon));
  let normal = unit(cross(tangentU, tangentV));
  const point = rawPoint(surface, u, v);
  if ((surface === "sphere" && dot(normal, point) < 0) || (surface === "torus" && dot(normal, { x: Math.cos(v) * Math.cos(u), y: Math.cos(v) * Math.sin(u), z: Math.sin(v) }) < 0)) normal = scale(normal, -1);
  return normal;
}

function terrainHeight(surface: SurfaceId, u: number, v: number, amount: number, hills: Hill[]) {
  if (amount <= 0 || surface === "mobius" || surface === "klein") return 0;
  let height = 0;
  for (const hill of hills) {
    const du = shortAngle(u - hill.u);
    const dv = surface === "torus" ? shortAngle(v - hill.v) : v - hill.v;
    height += hill.amplitude * Math.exp(-(du * du + dv * dv) / (2 * hill.sigma * hill.sigma));
  }
  return height * amount;
}

function surfacePoint(surface: SurfaceId, u: number, v: number, terrain: number, hills: Hill[]) {
  const point = rawPoint(surface, u, v);
  const height = terrainHeight(surface, u, v, terrain, hills);
  return height === 0 ? point : add(point, scale(rawNormal(surface, u, v), height));
}

function surfaceFrame(surface: SurfaceId, u: number, v: number, terrain: number, hills: Hill[]) {
  const epsilon = .0015;
  const point = surfacePoint(surface, u, v, terrain, hills);
  const tangentU = scale(sub(surfacePoint(surface, u + epsilon, v, terrain, hills), surfacePoint(surface, u - epsilon, v, terrain, hills)), 1 / (2 * epsilon));
  const tangentV = scale(sub(surfacePoint(surface, u, v + epsilon, terrain, hills), surfacePoint(surface, u, v - epsilon, terrain, hills)), 1 / (2 * epsilon));
  let normal = unit(cross(tangentU, tangentV));
  if (surface === "sphere" && dot(normal, point) < 0) normal = scale(normal, -1);
  if (surface === "torus" && dot(normal, rawNormal(surface, u, v)) < 0) normal = scale(normal, -1);
  return { point, tangentU, tangentV, normal };
}

function metric(surface: SurfaceId, u: number, v: number, terrain: number, hills: Hill[]) {
  const frame = surfaceFrame(surface, u, v, terrain, hills);
  const E = dot(frame.tangentU, frame.tangentU);
  const F = dot(frame.tangentU, frame.tangentV);
  const G = dot(frame.tangentV, frame.tangentV);
  const determinant = Math.max(E * G - F * F, 1e-7);
  return { E, F, G, inv00: G / determinant, inv01: -F / determinant, inv11: E / determinant, frame };
}

function createHills(seed: number, surface: SurfaceId) {
  const limits = domain(surface);
  const hills: Hill[] = [];
  for (let index = 0; index < 10; index++) {
    const random = (salt: number) => {
      const value = Math.sin((seed + 1) * 91.73 + index * 37.11 + salt * 19.19) * 43758.5453;
      return value - Math.floor(value);
    };
    hills.push({
      u: random(1) * TAU,
      v: limits.minV + random(2) * (limits.maxV - limits.minV),
      amplitude: .12 + random(3) * .27,
      sigma: .24 + random(4) * .32,
    });
  }
  return hills;
}

function normalizeBall(surface: SurfaceId, ball: Ball) {
  if (surface === "sphere") {
    while (ball.v > Math.PI / 2 - .045) { ball.v = Math.PI - .09 - ball.v; ball.u += Math.PI; ball.dv *= -1; }
    while (ball.v < -Math.PI / 2 + .045) { ball.v = -Math.PI + .09 - ball.v; ball.u += Math.PI; ball.dv *= -1; }
  } else if (surface === "mobius") {
    while (ball.u >= TAU) { ball.u -= TAU; ball.v *= -1; ball.dv *= -1; ball.h *= -1; ball.dh *= -1; }
    while (ball.u < 0) { ball.u += TAU; ball.v *= -1; ball.dv *= -1; ball.h *= -1; ball.dh *= -1; }
    const edge = .84;
    if (ball.v > edge) { ball.v = edge - (ball.v - edge); ball.dv = -Math.abs(ball.dv); }
    if (ball.v < -edge) { ball.v = -edge + (-edge - ball.v); ball.dv = Math.abs(ball.dv); }
  } else if (surface === "klein") {
    while (ball.u >= TAU) { ball.u -= TAU; ball.v = -ball.v; ball.dv *= -1; ball.h *= -1; ball.dh *= -1; }
    while (ball.u < 0) { ball.u += TAU; ball.v = -ball.v; ball.dv *= -1; ball.h *= -1; ball.dh *= -1; }
    ball.v = (ball.v % TAU + TAU) % TAU;
  } else {
    ball.v = (ball.v % TAU + TAU) % TAU;
  }
  ball.u = (ball.u % TAU + TAU) % TAU;
}

function chartDelta(surface: SurfaceId, a: Ball | Target, b: Ball | Target) {
  if (surface === "mobius" || surface === "klein") {
    let best = { du: b.u - a.u, dv: b.v - a.v, score: Infinity };
    for (const turn of [-1, 0, 1]) {
      const candidateU = b.u + turn * TAU;
      const candidateV = Math.abs(turn) % 2 === 1 ? -b.v : b.v;
      let dv = candidateV - a.v;
      if (surface === "klein") dv = shortAngle(dv);
      const du = candidateU - a.u;
      const score = du * du + dv * dv;
      if (score < best.score) best = { du, dv, score };
    }
    return best;
  }
  return { du: shortAngle(b.u - a.u), dv: surface === "torus" ? shortAngle(b.v - a.v) : b.v - a.v, score: 0 };
}

function intrinsicDistance(surface: SurfaceId, a: Ball | Target, b: Ball | Target, terrain: number, hills: Hill[]) {
  const delta = chartDelta(surface, a, b);
  const local = metric(surface, a.u, a.v, terrain, hills);
  return Math.sqrt(Math.max(0, local.E * delta.du * delta.du + 2 * local.F * delta.du * delta.dv + local.G * delta.dv * delta.dv));
}

function initialPoint(surface: SurfaceId, uFraction: number, vFraction: number) {
  const limits = domain(surface);
  return { u: uFraction * TAU, v: limits.minV + vFraction * (limits.maxV - limits.minV) };
}

function makeBall(id: number, point: Target, color: string): Ball {
  return { id, ...point, du: 0, dv: 0, h: BALL_RADIUS, dh: 0, color, sunk: false, trace: [], traceClock: 0 };
}

function worldVelocity(ball: Ball, frame: ReturnType<typeof surfaceFrame>) {
  return add(scale(frame.tangentU, ball.du), scale(frame.tangentV, ball.dv));
}

function coordinateVelocity(vector: Vec3, local: ReturnType<typeof metric>) {
  const covU = dot(local.frame.tangentU, vector);
  const covV = dot(local.frame.tangentV, vector);
  return { du: local.inv00 * covU + local.inv01 * covV, dv: local.inv01 * covU + local.inv11 * covV };
}

function project(point: Vec3, width: number, height: number, camera: Camera) {
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const x = point.x * cy - point.y * sy;
  const orbitDepth = point.x * sy + point.y * cy;
  const y = point.z * cp - orbitDepth * sp;
  const depth = orbitDepth * cp + point.z * sp;
  const perspective = 5.7 / Math.max(2.2, 6.1 + depth);
  const size = Math.min(width, height) * .16 * camera.zoom;
  return { x: width / 2 + x * size * perspective, y: height / 2 - y * size * perspective, depth, perspective, size };
}

function surfaceColor(surface: SurfaceId, row: number, column: number, z: number, depth: number) {
  const palettes: Record<SurfaceId, [number[], number[]]> = {
    torus: [[62, 143, 91], [225, 196, 74]],
    sphere: [[35, 121, 180], [41, 214, 205]],
    mobius: [[232, 164, 48], [227, 73, 56]],
    klein: [[101, 62, 143], [32, 215, 215]],
  };
  const [low, high] = palettes[surface];
  const mix = clamp(.38 + z * .12 + ((row + column) % 2) * .12, .08, .92);
  const shade = clamp(.82 - depth * .035, .55, 1.08);
  const rgb = low.map((value, index) => Math.round((value * (1 - mix) + high[index] * mix) * shade));
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.88)`;
}

function RangeControl({ label, value, min, max, step, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; suffix?: string }) {
  return (
    <label className="manifold-range">
      <span>{label}</span><output>{value.toFixed(step < .01 ? 3 : step < .1 ? 2 : 1)}{suffix}</output>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function ManifoldGolf() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const targetsRef = useRef<Target[]>([]);
  const selectedRef = useRef(0);
  const shotsRef = useRef(0);
  const cameraRef = useRef<Camera>({ yaw: -.72, pitch: .45, zoom: 1, dragging: false, aiming: false, pointerX: 0, pointerY: 0, aimBall: 0 });
  const configRef = useRef<Config>({ surface: "torus", mode: "golf", gravityMode: "geodesic", gravity: 2.4, friction: .34, terrain: .55, power: 2.1, aim: -.42, paused: false, poolCount: 7, hills: createHills(1, "torus") });
  const screenBallsRef = useRef<{ id: number; x: number; y: number }[]>([]);
  const [surface, setSurface] = useState<SurfaceId>("torus");
  const [mode, setMode] = useState<GameMode>("golf");
  const [gravityMode, setGravityMode] = useState<GravityMode>("geodesic");
  const [gravity, setGravity] = useState(2.4);
  const [friction, setFriction] = useState(.34);
  const [terrain, setTerrain] = useState(.55);
  const [power, setPower] = useState(2.1);
  const [aim, setAim] = useState(-.42);
  const [paused, setPaused] = useState(false);
  const [poolCount, setPoolCount] = useState(7);
  const [selected, setSelected] = useState(0);
  const [shots, setShots] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState("Drag from the ball to putt · drag the empty course to orbit");
  const [resetToken, setResetToken] = useState(0);
  const [hillSeed, setHillSeed] = useState(1);

  useEffect(() => {
    configRef.current = { ...configRef.current, surface, mode, gravityMode, gravity, friction, terrain, power, aim, paused, poolCount };
  }, [aim, friction, gravity, gravityMode, mode, paused, poolCount, power, surface, terrain]);

  const setAimValue = (value: number) => { const next = Math.atan2(Math.sin(value), Math.cos(value)); configRef.current.aim = next; setAim(next); };
  const setPowerValue = (value: number) => { const next = clamp(value, .15, 4.8); configRef.current.power = next; setPower(next); };

  const changeSurface = (next: SurfaceId) => {
    configRef.current.surface = next;
    const nextHills = createHills(hillSeed, next);
    configRef.current.hills = nextHills;
    setSurface(next);
    setResetToken((value) => value + 1);
  };

  const changeMode = (next: GameMode) => {
    configRef.current.mode = next;
    setMode(next);
    setResetToken((value) => value + 1);
  };

  const shoot = (ballId = selectedRef.current) => {
    const config = configRef.current;
    const ball = ballsRef.current.find((candidate) => candidate.id === ballId);
    if (!ball || ball.sunk) return;
    const local = metric(config.surface, ball.u, ball.v, config.terrain, config.hills);
    const currentSpeed = length(worldVelocity(ball, local.frame));
    if (currentSpeed > .12) { setMessage("Let the manifold settle before the next shot"); return; }
    const eU = unit(local.frame.tangentU);
    const eV = unit(sub(local.frame.tangentV, scale(eU, dot(local.frame.tangentV, eU))));
    const direction = add(scale(eU, Math.cos(config.aim)), scale(eV, Math.sin(config.aim)));
    const coordinate = coordinateVelocity(scale(direction, config.power), local);
    ball.du = coordinate.du;
    ball.dv = coordinate.dv;
    ball.sunk = false;
    ball.trace = [{ u: ball.u, v: ball.v, h: ball.h }];
    shotsRef.current += 1;
    setShots(shotsRef.current);
    setMessage(config.mode === "golf" ? "Putt in motion · watch both the surface and UV chart" : `Ball ${ball.id + 1} is live`);
  };

  const popSelected = () => {
    const ball = ballsRef.current.find((candidate) => candidate.id === selectedRef.current && !candidate.sunk);
    if (!ball) return;
    configRef.current.gravityMode = "normal";
    setGravityMode("normal");
    ball.dh += Math.sign(ball.h || 1) * 1.75;
    setMessage(SURFACES.find((candidate) => candidate.id === configRef.current.surface)?.orientable ? "Released into the surface-normal field" : "Local normal released · follow it through the orientation flip");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const map = mapRef.current;
    if (!canvas || !map) return;
    const context = canvas.getContext("2d");
    const mapContext = map.getContext("2d");
    if (!context || !mapContext) return;
    const config = configRef.current;
    const start = initialPoint(config.surface, .18, .38);
    const hole = initialPoint(config.surface, .73, .62);
    if (config.mode === "golf") {
      ballsRef.current = [makeBall(0, start, "#f4f0df")];
      targetsRef.current = [hole];
      setRemaining(1);
    } else {
      const rack = initialPoint(config.surface, .63, .52);
      const balls: Ball[] = [makeBall(0, start, BALL_COLORS[0])];
      for (let index = 1; index < config.poolCount; index++) {
        const row = Math.floor(Math.sqrt(index));
        const column = index - row * row;
        const candidate = makeBall(index, { u: rack.u + row * .09, v: rack.v + (column - row / 2) * .11 }, BALL_COLORS[index % BALL_COLORS.length]);
        normalizeBall(config.surface, candidate);
        balls.push(candidate);
      }
      ballsRef.current = balls;
      targetsRef.current = [[.08, .12], [.08, .88], [.92, .12], [.92, .88]].map(([u, v]) => initialPoint(config.surface, u, v));
      setRemaining(Math.max(0, balls.length - 1));
    }
    selectedRef.current = 0;
    setSelected(0);
    shotsRef.current = 0;
    setShots(0);
    setMessage("Drag from the ball to putt · drag the empty course to orbit");

    let width = 0;
    let height = 0;
    let last = performance.now();
    let accumulator = 0;
    let frame = 0;
    let meshKey = "";
    let mesh: { points: Vec3[]; row: number; column: number; z: number }[] = [];

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const buildMesh = () => {
      const active = configRef.current;
      const key = `${active.surface}:${active.terrain.toFixed(3)}:${hillSeed}`;
      if (key === meshKey) return;
      meshKey = key;
      mesh = [];
      const limits = domain(active.surface);
      const uSteps = 42;
      const vSteps = active.surface === "mobius" ? 18 : 24;
      for (let row = 0; row < uSteps; row++) {
        const u0 = row / uSteps * TAU;
        const u1 = (row + 1) / uSteps * TAU;
        for (let column = 0; column < vSteps; column++) {
          const v0 = limits.minV + column / vSteps * (limits.maxV - limits.minV);
          const v1 = limits.minV + (column + 1) / vSteps * (limits.maxV - limits.minV);
          const points = [
            surfacePoint(active.surface, u0, v0, active.terrain, active.hills),
            surfacePoint(active.surface, u1, v0, active.terrain, active.hills),
            surfacePoint(active.surface, u1, v1, active.terrain, active.hills),
            surfacePoint(active.surface, u0, v1, active.terrain, active.hills),
          ];
          mesh.push({ points, row, column, z: points.reduce((sum, point) => sum + point.z, 0) / 4 });
        }
      }
    };

    const acceleration = (ball: Ball) => {
      const active = configRef.current;
      const epsilon = .003;
      const center = metric(active.surface, ball.u, ball.v, active.terrain, active.hills);
      const plusU = metric(active.surface, ball.u + epsilon, ball.v, active.terrain, active.hills);
      const minusU = metric(active.surface, ball.u - epsilon, ball.v, active.terrain, active.hills);
      const plusV = metric(active.surface, ball.u, ball.v + epsilon, active.terrain, active.hills);
      const minusV = metric(active.surface, ball.u, ball.v - epsilon, active.terrain, active.hills);
      const g = [[center.E, center.F], [center.F, center.G]];
      const inverse = [[center.inv00, center.inv01], [center.inv01, center.inv11]];
      const derivative = [
        [[(plusU.E - minusU.E) / (2 * epsilon), (plusU.F - minusU.F) / (2 * epsilon)], [(plusU.F - minusU.F) / (2 * epsilon), (plusU.G - minusU.G) / (2 * epsilon)]],
        [[(plusV.E - minusV.E) / (2 * epsilon), (plusV.F - minusV.F) / (2 * epsilon)], [(plusV.F - minusV.F) / (2 * epsilon), (plusV.G - minusV.G) / (2 * epsilon)]],
      ];
      const velocity = [ball.du, ball.dv];
      const result = [0, 0];
      for (let k = 0; k < 2; k++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        let gamma = 0;
        for (let l = 0; l < 2; l++) gamma += .5 * inverse[k][l] * (derivative[i][j][l] + derivative[j][i][l] - derivative[l][i][j]);
        result[k] -= gamma * velocity[i] * velocity[j];
      }
      if (active.gravityMode === "world") {
        const force = { x: 0, y: 0, z: -active.gravity };
        const covU = dot(center.frame.tangentU, force);
        const covV = dot(center.frame.tangentV, force);
        result[0] += inverse[0][0] * covU + inverse[0][1] * covV;
        result[1] += inverse[1][0] * covU + inverse[1][1] * covV;
      }
      const speedSquared = g[0][0] * ball.du * ball.du + 2 * g[0][1] * ball.du * ball.dv + g[1][1] * ball.dv * ball.dv;
      return { du: clamp(result[0], -30, 30), dv: clamp(result[1], -30, 30), speed: Math.sqrt(Math.max(0, speedSquared)), local: center };
    };

    const resolveCollisions = () => {
      const active = configRef.current;
      const balls = ballsRef.current;
      for (let left = 0; left < balls.length; left++) for (let right = left + 1; right < balls.length; right++) {
        const a = balls[left], b = balls[right];
        if (a.sunk || b.sunk) continue;
        const delta = chartDelta(active.surface, a, b);
        const local = metric(active.surface, a.u, a.v, active.terrain, active.hills);
        const distance = Math.sqrt(Math.max(1e-8, local.E * delta.du * delta.du + 2 * local.F * delta.du * delta.dv + local.G * delta.dv * delta.dv));
        const contact = BALL_RADIUS * 2;
        if (distance >= contact) continue;
        const normalU = delta.du / distance;
        const normalV = delta.dv / distance;
        const velocityA = (local.E * a.du + local.F * a.dv) * normalU + (local.F * a.du + local.G * a.dv) * normalV;
        const velocityB = (local.E * b.du + local.F * b.dv) * normalU + (local.F * b.du + local.G * b.dv) * normalV;
        const relative = velocityA - velocityB;
        if (relative > 0) {
          const impulse = relative * .96;
          a.du -= impulse * normalU; a.dv -= impulse * normalV;
          b.du += impulse * normalU; b.dv += impulse * normalV;
        }
        const correction = (contact - distance) * .51;
        a.u -= normalU * correction; a.v -= normalV * correction;
        b.u += normalU * correction; b.v += normalV * correction;
        normalizeBall(active.surface, a); normalizeBall(active.surface, b);
      }
    };

    const checkTargets = (ball: Ball) => {
      const active = configRef.current;
      const target = targetsRef.current.find((candidate) => intrinsicDistance(active.surface, ball, candidate, active.terrain, active.hills) < BALL_RADIUS * 1.22);
      if (!target || Math.abs(ball.h) > BALL_RADIUS * 1.7) return;
      if (active.mode === "golf") {
        ball.sunk = true; ball.du = 0; ball.dv = 0;
        setRemaining(0);
        setMessage(`Holed in ${Math.max(1, shotsRef.current)} · the geodesic found its mark`);
      } else if (ball.id === 0) {
        const reset = initialPoint(active.surface, .18, .38);
        Object.assign(ball, reset, { du: 0, dv: 0, h: BALL_RADIUS, dh: 0, trace: [] });
        setMessage("Scratch · cue ball returned to the chart");
      } else {
        ball.sunk = true; ball.du = 0; ball.dv = 0;
        setRemaining((value) => Math.max(0, value - 1));
        setMessage(`Ball ${ball.id + 1} left the manifold`);
      }
    };

    const step = (dt: number) => {
      const active = configRef.current;
      for (const ball of ballsRef.current) {
        if (ball.sunk) continue;
        const motion = acceleration(ball);
        ball.du += motion.du * dt;
        ball.dv += motion.dv * dt;
        const damping = Math.exp(-active.friction * dt);
        ball.du *= damping; ball.dv *= damping;
        if (motion.speed > 5.4) { ball.du *= 5.4 / motion.speed; ball.dv *= 5.4 / motion.speed; }
        ball.u += ball.du * dt;
        ball.v += ball.dv * dt;
        if (active.gravityMode === "normal") {
          const side = Math.sign(ball.h || 1);
          ball.dh -= side * active.gravity * dt;
          ball.h += ball.dh * dt;
          if (Math.abs(ball.h) < BALL_RADIUS) { ball.h = side * BALL_RADIUS; ball.dh = Math.abs(ball.dh) > .08 ? -ball.dh * .26 : 0; }
        } else { ball.h = Math.sign(ball.h || 1) * BALL_RADIUS; ball.dh = 0; }
        normalizeBall(active.surface, ball);
        ball.traceClock += dt;
        if (ball.traceClock > .035 && (motion.speed > .025 || Math.abs(ball.dh) > .03)) {
          ball.traceClock = 0;
          ball.trace.push({ u: ball.u, v: ball.v, h: ball.h });
          if (ball.trace.length > 240) ball.trace.shift();
        }
        checkTargets(ball);
      }
      if (active.mode === "pool") resolveCollisions();
    };

    const drawMap = () => {
      const active = configRef.current;
      const limits = domain(active.surface);
      const mapWidth = map.width, mapHeight = map.height;
      const mapPoint = (u: number, v: number) => ({ x: u / TAU * mapWidth, y: mapHeight - (v - limits.minV) / (limits.maxV - limits.minV) * mapHeight });
      mapContext.fillStyle = "#0a1217"; mapContext.fillRect(0, 0, mapWidth, mapHeight);
      mapContext.strokeStyle = "rgba(244,240,223,.13)"; mapContext.lineWidth = 1;
      for (let line = 1; line < 8; line++) { mapContext.beginPath(); mapContext.moveTo(line * mapWidth / 8, 0); mapContext.lineTo(line * mapWidth / 8, mapHeight); mapContext.stroke(); }
      for (let line = 1; line < 4; line++) { mapContext.beginPath(); mapContext.moveTo(0, line * mapHeight / 4); mapContext.lineTo(mapWidth, line * mapHeight / 4); mapContext.stroke(); }
      for (const target of targetsRef.current) { const point = mapPoint(target.u, target.v); mapContext.strokeStyle = "#f2d83d"; mapContext.lineWidth = 2; mapContext.beginPath(); mapContext.arc(point.x, point.y, 5, 0, TAU); mapContext.stroke(); }
      for (const ball of ballsRef.current) {
        if (ball.sunk) continue;
        mapContext.strokeStyle = `${ball.color}88`; mapContext.lineWidth = 1.5; mapContext.beginPath();
        let previous: TracePoint | null = null;
        for (const trace of ball.trace) {
          const point = mapPoint(trace.u, trace.v);
          if (!previous || Math.abs(trace.u - previous.u) > Math.PI || Math.abs(trace.v - previous.v) > (limits.maxV - limits.minV) * .55) mapContext.moveTo(point.x, point.y); else mapContext.lineTo(point.x, point.y);
          previous = trace;
        }
        mapContext.stroke();
        const point = mapPoint(ball.u, ball.v); mapContext.fillStyle = ball.color; mapContext.beginPath(); mapContext.arc(point.x, point.y, ball.id === selectedRef.current ? 5 : 3.5, 0, TAU); mapContext.fill();
      }
      if (active.surface === "mobius" || active.surface === "klein") {
        mapContext.fillStyle = "rgba(244,240,223,.65)"; mapContext.font = "700 9px monospace"; mapContext.fillText("SEAM FLIPS ORIENTATION", 8, 14);
      }
    };

    const draw = (now: number) => {
      const active = configRef.current;
      const elapsed = Math.min(.045, (now - last) / 1000 || .016);
      last = now;
      accumulator += elapsed;
      if (!active.paused) while (accumulator >= FIXED_STEP) { step(FIXED_STEP); accumulator -= FIXED_STEP; }
      else accumulator = 0;
      if (!cameraRef.current.dragging && !cameraRef.current.aiming) cameraRef.current.yaw += elapsed * .035;
      buildMesh();
      context.fillStyle = "#071116"; context.fillRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * .5, height * .45, 0, width * .5, height * .45, Math.max(width, height) * .7);
      glow.addColorStop(0, "rgba(25,75,75,.38)"); glow.addColorStop(1, "rgba(7,17,22,0)"); context.fillStyle = glow; context.fillRect(0, 0, width, height);
      const projectedMesh = mesh.map((cell) => ({ ...cell, screen: cell.points.map((point) => project(point, width, height, cameraRef.current)) }));
      projectedMesh.sort((a, b) => b.screen.reduce((sum, point) => sum + point.depth, 0) - a.screen.reduce((sum, point) => sum + point.depth, 0));
      for (const cell of projectedMesh) {
        const averageDepth = cell.screen.reduce((sum, point) => sum + point.depth, 0) / 4;
        context.beginPath(); cell.screen.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)); context.closePath();
        context.fillStyle = surfaceColor(active.surface, cell.row, cell.column, cell.z, averageDepth); context.fill();
        context.strokeStyle = "rgba(7,17,22,.42)"; context.lineWidth = .7; context.stroke();
      }
      if (active.gravityMode === "normal") {
        context.strokeStyle = "rgba(242,216,61,.6)"; context.lineWidth = 1;
        for (let index = 0; index < 18; index++) {
          const sample = initialPoint(active.surface, (index * .137) % 1, .18 + ((index * .319) % 1) * .64);
          const local = surfaceFrame(active.surface, sample.u, sample.v, active.terrain, active.hills);
          const outer = project(add(local.point, scale(local.normal, .44)), width, height, cameraRef.current);
          const inner = project(add(local.point, scale(local.normal, .09)), width, height, cameraRef.current);
          context.beginPath(); context.moveTo(outer.x, outer.y); context.lineTo(inner.x, inner.y); context.stroke();
        }
      }
      for (const ball of ballsRef.current) {
        if (ball.sunk) continue;
        context.strokeStyle = `${ball.color}99`; context.lineWidth = ball.id === 0 ? 2 : 1.3; context.beginPath();
        let previous: { x: number; y: number } | null = null;
        for (const trace of ball.trace) {
          const local = surfaceFrame(active.surface, trace.u, trace.v, active.terrain, active.hills);
          const point = project(add(local.point, scale(local.normal, trace.h)), width, height, cameraRef.current);
          if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > Math.max(width, height) * .22) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
          previous = point;
        }
        context.stroke();
      }
      for (const target of targetsRef.current) {
        const local = surfaceFrame(active.surface, target.u, target.v, active.terrain, active.hills);
        const point = project(add(local.point, scale(local.normal, .018)), width, height, cameraRef.current);
        const radius = Math.max(5, BALL_RADIUS * point.size * point.perspective * 1.2);
        context.fillStyle = "#071116"; context.strokeStyle = "#f2d83d"; context.lineWidth = 2; context.beginPath(); context.ellipse(point.x, point.y, radius * 1.25, radius * .55, 0, 0, TAU); context.fill(); context.stroke();
      }
      const screenBalls: { id: number; x: number; y: number }[] = [];
      for (const ball of ballsRef.current) {
        if (ball.sunk) continue;
        const local = surfaceFrame(active.surface, ball.u, ball.v, active.terrain, active.hills);
        const world = add(local.point, scale(local.normal, ball.h));
        const point = project(world, width, height, cameraRef.current);
        const radius = clamp(BALL_RADIUS * point.size * point.perspective * 1.25, 5, 15);
        screenBalls.push({ id: ball.id, x: point.x, y: point.y });
        context.fillStyle = ball.color; context.strokeStyle = ball.id === selectedRef.current ? "#f2d83d" : "#071116"; context.lineWidth = ball.id === selectedRef.current ? 3 : 1.5;
        context.beginPath(); context.arc(point.x, point.y, radius, 0, TAU); context.fill(); context.stroke();
        context.fillStyle = "rgba(255,255,255,.6)"; context.beginPath(); context.arc(point.x - radius * .3, point.y - radius * .32, Math.max(1.4, radius * .2), 0, TAU); context.fill();
      }
      screenBallsRef.current = screenBalls;
      const selectedBall = ballsRef.current.find((ball) => ball.id === selectedRef.current && !ball.sunk);
      if (selectedBall && length(worldVelocity(selectedBall, surfaceFrame(active.surface, selectedBall.u, selectedBall.v, active.terrain, active.hills))) < .15) {
        const local = surfaceFrame(active.surface, selectedBall.u, selectedBall.v, active.terrain, active.hills);
        const eU = unit(local.tangentU); const eV = unit(sub(local.tangentV, scale(eU, dot(local.tangentV, eU))));
        const direction = add(scale(eU, Math.cos(active.aim)), scale(eV, Math.sin(active.aim)));
        const startPoint = project(add(local.point, scale(local.normal, selectedBall.h)), width, height, cameraRef.current);
        const endPoint = project(add(add(local.point, scale(local.normal, selectedBall.h)), scale(direction, active.power * .48)), width, height, cameraRef.current);
        context.strokeStyle = "#f2d83d"; context.lineWidth = 2; context.setLineDash([7, 6]); context.beginPath(); context.moveTo(startPoint.x, startPoint.y); context.lineTo(endPoint.x, endPoint.y); context.stroke(); context.setLineDash([]);
      }
      drawMap();
      frame = requestAnimationFrame(draw);
    };

    const pointerDown = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
      const nearest = screenBallsRef.current.map((ball) => ({ ...ball, distance: Math.hypot(ball.x - x, ball.y - y) })).sort((a, b) => a.distance - b.distance)[0];
      cameraRef.current.pointerX = event.clientX; cameraRef.current.pointerY = event.clientY;
      if (nearest && nearest.distance < 28) {
        cameraRef.current.aiming = true; cameraRef.current.aimBall = nearest.id; selectedRef.current = nearest.id; setSelected(nearest.id);
      } else cameraRef.current.dragging = true;
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      const camera = cameraRef.current;
      if (camera.aiming) {
        const bounds = canvas.getBoundingClientRect();
        const ball = screenBallsRef.current.find((candidate) => candidate.id === camera.aimBall);
        if (!ball) return;
        const dx = event.clientX - bounds.left - ball.x, dy = event.clientY - bounds.top - ball.y;
        setAimValue(Math.atan2(-dy, dx) - camera.yaw * .42);
        setPowerValue(Math.hypot(dx, dy) / 46);
      } else if (camera.dragging) {
        camera.yaw += (event.clientX - camera.pointerX) * .009;
        camera.pitch = clamp(camera.pitch + (event.clientY - camera.pointerY) * .007, -.95, .95);
      }
      camera.pointerX = event.clientX; camera.pointerY = event.clientY;
    };
    const pointerUp = () => {
      const camera = cameraRef.current;
      const wasAiming = camera.aiming;
      const ballId = camera.aimBall;
      camera.dragging = false; camera.aiming = false;
      if (wasAiming) shoot(ballId);
    };
    const wheel = (event: WheelEvent) => { event.preventDefault(); cameraRef.current.zoom = clamp(cameraRef.current.zoom * Math.exp(-event.deltaY * .001), .62, 1.75); };
    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("wheel", wheel, { passive: false });
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [hillSeed, resetToken]);

  const gravityNote = gravityMode === "geodesic"
    ? "No external force: the metric alone bends each free path into a geodesic."
    : gravityMode === "world"
      ? "A uniform world-down force is projected into the local tangent plane, so the ball genuinely rolls downhill."
      : SURFACES.find((candidate) => candidate.id === surface)?.orientable
        ? "A normal force cannot steer a constrained putt. Use Pop ball to release it above the surface and watch the field return it."
        : "There is no global ‘above’ on this non-orientable surface. The local normal—and the ball’s signed height—reverses through the seam.";

  return (
    <section className="manifold-lab">
      <div className="manifold-stage">
        <canvas
          ref={canvasRef}
          className="manifold-canvas"
          tabIndex={0}
          aria-label="Interactive manifold golf course. Drag a ball to aim and shoot. Drag empty space to orbit."
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setAimValue(configRef.current.aim - .05);
            else if (event.key === "ArrowRight") setAimValue(configRef.current.aim + .05);
            else if (event.key === "ArrowUp") setPowerValue(configRef.current.power + .1);
            else if (event.key === "ArrowDown") setPowerValue(configRef.current.power - .1);
            else if (event.key === " ") shoot(); else return;
            event.preventDefault();
          }}
        />
        <div className="manifold-stage-readout"><span>{surface.toUpperCase()}</span><span>{mode === "golf" ? `STROKES ${shots}` : `BALLS LEFT ${remaining}`}</span><span>{gravityMode.toUpperCase()}</span></div>
        <p>{message}</p>
      </div>
      <aside className="manifold-controls">
        <div className="manifold-mode-tabs" aria-label="Game mode">
          <button className={mode === "golf" ? "active" : ""} onClick={() => changeMode("golf")}>Golf</button>
          <button className={mode === "pool" ? "active" : ""} onClick={() => changeMode("pool")}>Pool</button>
        </div>
        <div className="manifold-surface-grid" aria-label="Course surface">
          {SURFACES.map((candidate) => <button key={candidate.id} className={surface === candidate.id ? "active" : ""} onClick={() => changeSurface(candidate.id)}>{candidate.label}</button>)}
        </div>
        <div className="manifold-map-wrap"><header><span>Parameter-space map</span><b>U × V</b></header><canvas ref={mapRef} width="320" height="150" aria-label="Live flat parameter-space map of the current course" /></div>
        <div className="manifold-gravity-tabs" aria-label="Gravity model">
          <button className={gravityMode === "geodesic" ? "active" : ""} onClick={() => setGravityMode("geodesic")}>Geodesic</button>
          <button className={gravityMode === "world" ? "active" : ""} onClick={() => setGravityMode("world")}>World ↓</button>
          <button className={gravityMode === "normal" ? "active" : ""} onClick={() => setGravityMode("normal")}>Normal well</button>
        </div>
        <p className="manifold-model-note">{gravityNote}</p>
        <RangeControl label="Aim" value={aim * 180 / Math.PI} min={-180} max={180} step={1} suffix="°" onChange={(value) => setAimValue(value * Math.PI / 180)} />
        <RangeControl label="Putt power" value={power} min={.15} max={4.8} step={.01} onChange={setPowerValue} />
        <RangeControl label="Friction" value={friction} min={.02} max={1.5} step={.01} onChange={setFriction} />
        <RangeControl label="Terrain relief" value={terrain} min={0} max={1.35} step={.01} onChange={setTerrain} />
        {gravityMode !== "geodesic" && <RangeControl label="Field strength" value={gravity} min={0} max={8} step={.05} onChange={setGravity} />}
        {mode === "pool" && <RangeControl label="Pool balls · reset" value={poolCount} min={3} max={10} step={1} onChange={(value) => setPoolCount(Math.round(value))} />}
        <div className="manifold-shot-row"><button onClick={() => shoot()}>{mode === "pool" ? `Putt ball ${selected + 1}` : "Putt"}</button><button onClick={popSelected}>Pop ball</button></div>
        <div className="manifold-transport">
          <button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button>
          <button onClick={() => setResetToken((value) => value + 1)}>Reset course</button>
          <button onClick={() => { const next = hillSeed + 1; setHillSeed(next); configRef.current.hills = createHills(next, configRef.current.surface); setResetToken((value) => value + 1); }}>New terrain</button>
        </div>
        <p className="manifold-source-note">Rebuilt from the 2025 Pygame/OpenGL prototypes: metric-driven motion, seam-safe trails, parameter maps, Gaussian terrain, holes, and camera orbit—now with multiple manifolds and equal-mass pool collisions.</p>
      </aside>
    </section>
  );
}
