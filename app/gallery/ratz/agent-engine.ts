export type Vector = { x: number; y: number };

export type TelegraphGate = {
  active: boolean;
  remaining: number;
};

export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export const exponentialInterval = (mean: number) =>
  Math.max(.025, -Math.log(Math.max(1e-7, 1 - Math.random())) * Math.max(.025, mean));

export const normalSample = () => {
  const u = Math.max(1e-7, Math.random());
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
};

export function tickGate(gate: TelegraphGate, deltaSeconds: number, activeMean: number, restingMean: number) {
  gate.remaining -= deltaSeconds;
  if (gate.remaining <= 0) {
    gate.active = !gate.active;
    gate.remaining = exponentialInterval(gate.active ? activeMean : restingMean);
  }
  return gate.active;
}

export function shapedSpeed(forceMagnitude: number, restingSpeed: number, maximumSpeed: number, gain: number, exponent: number) {
  const shaped = 1 - Math.exp(-Math.pow(Math.max(0, forceMagnitude) * gain, exponent));
  return restingSpeed + (maximumSpeed - restingSpeed) * clamp(shaped, 0, 1);
}

export function unit(vector: Vector): Vector {
  const magnitude = Math.hypot(vector.x, vector.y);
  return magnitude > 1e-8 ? { x: vector.x / magnitude, y: vector.y / magnitude } : { x: 0, y: 0 };
}

export function wrappedDelta(from: number, to: number, extent: number) {
  let delta = to - from;
  if (delta > extent / 2) delta -= extent;
  else if (delta < -extent / 2) delta += extent;
  return delta;
}

export function wrapCoordinate(value: number, extent: number) {
  return ((value % extent) + extent) % extent;
}

export function wrapAgent(agent: { x: number; y: number }, width: number, height: number) {
  agent.x = wrapCoordinate(agent.x, width);
  agent.y = wrapCoordinate(agent.y, height);
}
