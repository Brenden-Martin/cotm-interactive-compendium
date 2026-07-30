import { env } from "cloudflare:workers";

export type StoredDeqPreset = {
  id: number;
  config: {
    k: number[];
    exponent: number[];
    dt: number;
    decay: number;
    noise: number;
  };
  createdAt: string;
};

const schemaSql = `
  CREATE TABLE IF NOT EXISTS deq_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_json TEXT NOT NULL,
    state_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const indexSql = "CREATE INDEX IF NOT EXISTS deq_presets_created_at_idx ON deq_presets(created_at DESC)";

async function database() {
  const db = env.DB;
  if (!db) throw new Error("The shared preset bank is unavailable.");
  await db.batch([db.prepare(schemaSql), db.prepare(indexSql)]);
  return db;
}

export async function listDeqPresets(): Promise<StoredDeqPreset[]> {
  const db = await database();
  const result = await db.prepare(
    "SELECT id, state_json, created_at FROM deq_presets ORDER BY id ASC LIMIT 256"
  ).all<{ id: number; state_json: string; created_at: string }>();
  return result.results.flatMap((row) => {
    try {
      return [{ id: row.id, config: JSON.parse(row.state_json), createdAt: row.created_at }];
    } catch {
      return [];
    }
  });
}

export async function saveDeqPreset(stateJson: string, stateHash: string) {
  const db = await database();
  await db.prepare(
    "INSERT OR IGNORE INTO deq_presets (state_json, state_hash) VALUES (?, ?)"
  ).bind(stateJson, stateHash).run();
  const row = await db.prepare(
    "SELECT id, state_json, created_at FROM deq_presets WHERE state_hash = ?"
  ).bind(stateHash).first<{ id: number; state_json: string; created_at: string }>();
  if (!row) throw new Error("The preset could not be saved.");
  return { id: row.id, config: JSON.parse(row.state_json), createdAt: row.created_at };
}
