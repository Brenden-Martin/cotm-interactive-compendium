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

const promotionSchemaSql = `
  CREATE TABLE IF NOT EXISTS fortune_promotion_batches (
    batch_key TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const CURRENT_OWNER_BATCH = {
  key: "owner-batch-2026-08-05",
  submittedThrough: "2026-08-06 01:05:38",
};

const CURRENT_FORMATTING_BATCH = "fortune-formatting-2026-08-05";

async function database() {
  const db = env.DB;
  if (!db) throw new Error("The fortune suggestion box is unavailable.");
  await db.batch([db.prepare(schemaSql), db.prepare(indexSql), db.prepare(promotionSchemaSql)]);
  await db.batch([
    db.prepare(`
      UPDATE fortune_suggestions
      SET status = 'approved'
      WHERE status = 'pending'
        AND created_at <= ?
        AND NOT EXISTS (
          SELECT 1 FROM fortune_promotion_batches WHERE batch_key = ?
        )
    `).bind(CURRENT_OWNER_BATCH.submittedThrough, CURRENT_OWNER_BATCH.key),
    db.prepare(
      "INSERT OR IGNORE INTO fortune_promotion_batches (batch_key) VALUES (?)"
    ).bind(CURRENT_OWNER_BATCH.key),
  ]);
  await db.batch([
    db.prepare(`
      UPDATE fortune_suggestions
      SET status = 'rejected'
      WHERE fortune_text = ?
        AND NOT EXISTS (
          SELECT 1 FROM fortune_promotion_batches WHERE batch_key = ?
        )
    `).bind("You're only ever a candlestick away from buckmisterfullerin", CURRENT_FORMATTING_BATCH),
    db.prepare(`
      UPDATE fortune_suggestions
      SET fortune_text = ?
      WHERE fortune_text = ?
        AND NOT EXISTS (
          SELECT 1 FROM fortune_promotion_batches WHERE batch_key = ?
        )
    `).bind(
      "My Mother Told Me\nI Would Be Writing Haiku\nI Guess She Was Right",
      "My Mother Told Me I Would Be Writing Haiku I Guess She Was Right",
      CURRENT_FORMATTING_BATCH,
    ),
    db.prepare(`
      UPDATE fortune_suggestions
      SET fortune_text = ?
      WHERE fortune_text = ?
        AND NOT EXISTS (
          SELECT 1 FROM fortune_promotion_batches WHERE batch_key = ?
        )
    `).bind(
      "Of making books, there is no end\nAnd much study is wearisome to the flesh",
      "Of making books, there is no end And much study is wearisome to the flesh",
      CURRENT_FORMATTING_BATCH,
    ),
    db.prepare(`
      UPDATE fortune_suggestions
      SET fortune_text = ?
      WHERE fortune_text = ?
        AND NOT EXISTS (
          SELECT 1 FROM fortune_promotion_batches WHERE batch_key = ?
        )
    `).bind(
      "I must not fear\nFear is the mindkiller\nFear is the little death that brings total obliteration",
      "I must not fear Fear is the mindkiller Fear is the little death that brings total obliteration",
      CURRENT_FORMATTING_BATCH,
    ),
    db.prepare(
      "INSERT OR IGNORE INTO fortune_promotion_batches (batch_key) VALUES (?)"
    ).bind(CURRENT_FORMATTING_BATCH),
  ]);
  return db;
}

export async function listApprovedFortunes() {
  const db = await database();
  const result = await db.prepare(
    "SELECT fortune_text FROM fortune_suggestions WHERE status = 'approved' ORDER BY id ASC LIMIT 512"
  ).all<{ fortune_text: string }>();
  return result.results.map((row) => row.fortune_text);
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
