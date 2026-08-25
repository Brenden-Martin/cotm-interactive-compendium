export type CollisionMode = "parity" | "all" | "cycle";
export type CellState = { color: number; ready: boolean };
export type SpawnRule = { dx: number; dy: number; action: number };
export type StepResult = { cells: Map<string, CellState>; births: number; deaths: number; collisions: number };

export const EMPTY_RULE = -1;
export const ANNIHILATE_RULE = -2;

export const cellKey = (x: number, y: number) => `${x},${y}`;

export function parseCellKey(key: string) {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

export function ruleFromGrid(grid: number[], size = 5): SpawnRule[] {
  const center = Math.floor(size / 2);
  const rules: SpawnRule[] = [];
  for (let index = 0; index < grid.length; index++) {
    const action = grid[index];
    if (action === EMPTY_RULE) continue;
    rules.push({ dx: index % size - center, dy: Math.floor(index / size) - center, action });
  }
  return rules;
}

export function stepAutomaton(
  current: Map<string, CellState>,
  rules: SpawnRule[],
  columns: number,
  rows: number,
  collisionMode: CollisionMode,
  colorCount: number,
): StepResult {
  const claims = new Map<string, { base?: CellState; colors: number[]; annihilate: boolean }>();
  for (const [key, cell] of current) claims.set(key, { base: { ...cell, ready: false }, colors: [], annihilate: false });

  for (const [key, cell] of current) {
    if (!cell.ready) continue;
    const { x, y } = parseCellKey(key);
    for (const rule of rules) {
      const nextX = x + rule.dx;
      const nextY = y + rule.dy;
      if (nextX < 0 || nextY < 0 || nextX >= columns || nextY >= rows) continue;
      const targetKey = cellKey(nextX, nextY);
      const target = claims.get(targetKey) ?? { colors: [], annihilate: false };
      if (rule.action === ANNIHILATE_RULE) target.annihilate = true;
      else target.colors.push(((rule.action % colorCount) + colorCount) % colorCount);
      claims.set(targetKey, target);
    }
  }

  const cells = new Map<string, CellState>();
  let births = 0;
  let deaths = 0;
  let collisions = 0;
  for (const [key, claim] of claims) {
    const contributors = (claim.base ? 1 : 0) + claim.colors.length;
    if (claim.annihilate) {
      if (claim.base) deaths++;
      continue;
    }
    if (contributors > 1) collisions++;
    let survives = false;
    if (collisionMode === "parity") survives = contributors % 2 === 1;
    else if (collisionMode === "all") survives = contributors === 1;
    else survives = contributors > 0;
    if (!survives) {
      if (claim.base) deaths++;
      continue;
    }
    const mixedColor = !claim.base && claim.colors.length === 1
      ? claim.colors[0]
      : claim.colors.reduce((sum, color) => sum + color + 1, claim.base?.color ?? 0) % Math.max(1, colorCount);
    const color = collisionMode === "cycle" ? mixedColor : (claim.base?.color ?? claim.colors.at(-1) ?? 0);
    const ready = !claim.base || (collisionMode === "cycle" && claim.colors.length > 0 && color !== claim.base.color);
    if (!claim.base) births++;
    cells.set(key, { color, ready });
  }
  return { cells, births, deaths, collisions };
}

export function presetRule(name: "sierpinski" | "celtic", colorMode = false, colors = 5) {
  const grid = new Array<number>(25).fill(EMPTY_RULE);
  const set = (dx: number, dy: number, action: number) => { grid[(dy + 2) * 5 + dx + 2] = action; };
  if (name === "sierpinski") {
    set(-1, 1, colorMode ? 1 % colors : 0);
    set(1, 1, colorMode ? 3 % colors : 0);
  } else {
    set(0, -1, colorMode ? 1 % colors : 0);
    set(-1, 0, colorMode ? 2 % colors : 0);
    set(1, 0, colorMode ? 3 % colors : 0);
    set(0, 1, colorMode ? 4 % colors : 0);
  }
  return grid;
}

export function symmetricSeeds(pattern: "single" | "pair" | "fourfold" | "ring", columns: number, rows: number, color = 0) {
  const seeds = new Map<string, CellState>();
  const centerX = Math.floor(columns / 2);
  const centerY = Math.floor(rows / 2);
  const add = (x: number, y: number, offset = 0) => seeds.set(cellKey(x, y), { color: color + offset, ready: true });
  if (pattern === "single") add(centerX, Math.max(3, Math.floor(rows * .09)));
  if (pattern === "pair") { add(centerX - 8, centerY); add(centerX + 8, centerY, 1); }
  if (pattern === "fourfold") { add(centerX - 7, centerY - 7); add(centerX + 7, centerY - 7, 1); add(centerX - 7, centerY + 7, 2); add(centerX + 7, centerY + 7, 3); }
  if (pattern === "ring") for (let point = 0; point < 12; point++) { const angle = point / 12 * Math.PI * 2; add(Math.round(centerX + Math.cos(angle) * 13), Math.round(centerY + Math.sin(angle) * 13), point); }
  return seeds;
}
