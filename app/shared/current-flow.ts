export type CurrentBias = "horizontal" | "vertical" | "diagonal";

export type CurrentGrid = {
  columns: number;
  rows: number;
  mask: Float32Array;
  conductivity: Float32Array;
  potential: Float32Array;
  scratch: Float32Array;
  fixed: Int8Array;
};

export type CurrentDiagnostics = {
  rmsResidual: number;
  maxDelta: number;
  sourceCurrent: number;
  sinkCurrent: number;
  imbalance: number;
};

const indexOf = (x: number, y: number, columns: number) => y * columns + x;
const harmonic = (a: number, b: number) => 2 * a * b / Math.max(1e-12, a + b);

export function createCurrentGrid(columns: number, rows: number, bias: CurrentBias): CurrentGrid {
  const size = columns * rows;
  const grid: CurrentGrid = {
    columns,
    rows,
    mask: new Float32Array(size),
    conductivity: new Float32Array(size).fill(1),
    potential: new Float32Array(size),
    scratch: new Float32Array(size),
    fixed: new Int8Array(size),
  };
  resetPotential(grid, bias);
  return grid;
}

export function resetPotential(grid: CurrentGrid, bias: CurrentBias) {
  const { columns, rows, potential, scratch, fixed } = grid;
  fixed.fill(0);
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const index = indexOf(x, y, columns);
    let value = .5;
    if (bias === "horizontal") {
      value = 1 - x / Math.max(1, columns - 1);
      if (x === 0) fixed[index] = 1;
      else if (x === columns - 1) fixed[index] = -1;
    } else if (bias === "vertical") {
      value = 1 - y / Math.max(1, rows - 1);
      if (y === 0) fixed[index] = 1;
      else if (y === rows - 1) fixed[index] = -1;
    } else {
      value = 1 - (x / Math.max(1, columns - 1) + y / Math.max(1, rows - 1)) * .5;
      const electrode = Math.max(3, Math.round(Math.min(columns, rows) * .12));
      if (x + y < electrode) fixed[index] = 1;
      else if ((columns - 1 - x) + (rows - 1 - y) < electrode) fixed[index] = -1;
    }
    potential[index] = fixed[index] === 1 ? 1 : fixed[index] === -1 ? 0 : value;
  }
  scratch.set(potential);
}

export function updateConductivity(grid: CurrentGrid, decades: number) {
  const ratio = Math.pow(10, decades);
  for (let index = 0; index < grid.mask.length; index++) grid.conductivity[index] = Math.pow(ratio, grid.mask[index]);
}

export function iterateCurrent(grid: CurrentGrid, iterations: number, relaxation: number) {
  const { columns, rows, conductivity, fixed } = grid;
  let source = grid.potential;
  let target = grid.scratch;
  let maximumDelta = 0;
  for (let iteration = 0; iteration < iterations; iteration++) {
    maximumDelta = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const index = indexOf(x, y, columns);
      if (fixed[index]) {
        target[index] = fixed[index] === 1 ? 1 : 0;
        continue;
      }
      const sigma = conductivity[index];
      let weighted = 0;
      let weight = 0;
      if (x > 0) { const neighbor = index - 1; const face = harmonic(sigma, conductivity[neighbor]); weighted += face * source[neighbor]; weight += face; }
      if (x + 1 < columns) { const neighbor = index + 1; const face = harmonic(sigma, conductivity[neighbor]); weighted += face * source[neighbor]; weight += face; }
      if (y > 0) { const neighbor = index - columns; const face = harmonic(sigma, conductivity[neighbor]); weighted += face * source[neighbor]; weight += face; }
      if (y + 1 < rows) { const neighbor = index + columns; const face = harmonic(sigma, conductivity[neighbor]); weighted += face * source[neighbor]; weight += face; }
      const next = source[index] + relaxation * (weighted / Math.max(1e-12, weight) - source[index]);
      maximumDelta = Math.max(maximumDelta, Math.abs(next - source[index]));
      target[index] = next;
    }
    const swap = source; source = target; target = swap;
  }
  grid.potential = source;
  grid.scratch = target;
  return maximumDelta;
}

export function currentAt(grid: CurrentGrid, x: number, y: number) {
  const { columns, rows, potential, conductivity } = grid;
  const index = indexOf(x, y, columns);
  const left = indexOf(Math.max(0, x - 1), y, columns);
  const right = indexOf(Math.min(columns - 1, x + 1), y, columns);
  const top = indexOf(x, Math.max(0, y - 1), columns);
  const bottom = indexOf(x, Math.min(rows - 1, y + 1), columns);
  const dx = Math.max(1, Math.min(columns - 1, x + 1) - Math.max(0, x - 1));
  const dy = Math.max(1, Math.min(rows - 1, y + 1) - Math.max(0, y - 1));
  return {
    x: -conductivity[index] * (potential[right] - potential[left]) / dx,
    y: -conductivity[index] * (potential[bottom] - potential[top]) / dy,
  };
}

export function diagnoseCurrent(grid: CurrentGrid, maxDelta: number): CurrentDiagnostics {
  const { columns, rows, potential, conductivity, fixed } = grid;
  let residualSum = 0;
  let samples = 0;
  let sourceCurrent = 0;
  let sinkCurrent = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const index = indexOf(x, y, columns);
    const sigma = conductivity[index];
    let divergence = 0;
    const visit = (neighbor: number) => { divergence += harmonic(sigma, conductivity[neighbor]) * (potential[neighbor] - potential[index]); };
    if (x > 0) visit(index - 1);
    if (x + 1 < columns) visit(index + 1);
    if (y > 0) visit(index - columns);
    if (y + 1 < rows) visit(index + columns);
    if (!fixed[index]) { residualSum += divergence * divergence; samples++; }
    else if (fixed[index] === 1) sourceCurrent += -divergence;
    else sinkCurrent += divergence;
  }
  const scale = Math.max(1e-12, (Math.abs(sourceCurrent) + Math.abs(sinkCurrent)) * .5);
  return {
    rmsResidual: Math.sqrt(residualSum / Math.max(1, samples)),
    maxDelta,
    sourceCurrent,
    sinkCurrent,
    imbalance: Math.abs(sourceCurrent - sinkCurrent) / scale,
  };
}

export function paintMask(grid: CurrentGrid, centerX: number, centerY: number, radius: number, value: number) {
  const minimumX = Math.max(0, Math.floor(centerX - radius));
  const maximumX = Math.min(grid.columns - 1, Math.ceil(centerX + radius));
  const minimumY = Math.max(0, Math.floor(centerY - radius));
  const maximumY = Math.min(grid.rows - 1, Math.ceil(centerY + radius));
  const radiusSquared = radius * radius;
  for (let y = minimumY; y <= maximumY; y++) for (let x = minimumX; x <= maximumX; x++) {
    const dx = x - centerX;
    const dy = y - centerY;
    if (dx * dx + dy * dy <= radiusSquared) grid.mask[indexOf(x, y, grid.columns)] = value;
  }
}
