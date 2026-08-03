import { env } from "cloudflare:workers";

const schemaSql = `
  CREATE TABLE IF NOT EXISTS fortune_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fortune_text TEXT NOT NULL,
    fortune_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const indexSql =
  "CREATE INDEX IF NOT EXISTS fortune_suggestions_status_created_idx ON fortune_suggestions(status, created_at DESC)";

async function database() {
  const db = env.DB;
  if (!db) throw new Error("The fortune suggestion box is unavailable.");
  await db.batch([db.prepare(schemaSql), db.prepare(indexSql)]);
  return db;
}

export async function saveFortuneSuggestion(fortuneText: string, fortuneHash: string) {
  const db = await database();
  const existing = await db.prepare(
    "SELECT id, created_at FROM fortune_suggestions WHERE fortune_hash = ?"
  ).bind(fortuneHash).first<{ id: number; created_at: string }>();

  if (existing) {
    return { id: existing.id, createdAt: existing.created_at, duplicate: true };
  }

  await db.prepare(
    "INSERT OR IGNORE INTO fortune_suggestions (fortune_text, fortune_hash) VALUES (?, ?)"
  ).bind(fortuneText, fortuneHash).run();

  const saved = await db.prepare(
    "SELECT id, created_at FROM fortune_suggestions WHERE fortune_hash = ?"
  ).bind(fortuneHash).first<{ id: number; created_at: string }>();
  if (!saved) throw new Error("The fortune suggestion could not be saved.");
  return { id: saved.id, createdAt: saved.created_at, duplicate: false };
}
