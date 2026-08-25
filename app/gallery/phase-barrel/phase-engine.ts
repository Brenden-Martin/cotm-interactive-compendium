export const TAU = Math.PI * 2;

export type PhaseStep = { phase: number; crossings: number };

export function integratePhase(phase: number, frequency: number, dt: number): PhaseStep {
  const cycles = phase / TAU + Math.max(0, frequency) * Math.max(0, dt);
  const crossings = Math.max(0, Math.floor(cycles));
  return { phase: ((cycles % 1) + 1) % 1 * TAU, crossings };
}

export function gaussianPulse(ageSeconds: number, widthSeconds: number) {
  if (ageSeconds < 0) return 0;
  const width = Math.max(.004, widthSeconds);
  return Math.exp(-.5 * (ageSeconds / width) ** 2);
}

export function coincidenceSignal(hits: Array<{ time: number; gain: number }>, now: number, width: number) {
  return hits.reduce((sum, hit) => sum + hit.gain * gaussianPulse(now - hit.time, width), 0);
}

export function effectiveFrequency(base: number, subdivision: number, acceleration: number, elapsed: number) {
  return Math.max(.01, base * subdivision + acceleration * elapsed);
}
