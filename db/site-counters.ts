import { env } from "cloudflare:workers";

const YOU_ARE_HERE_KEY = "you_are_here";

const countersSchemaSql = `
  CREATE TABLE IF NOT EXISTS site_counters (
    counter_key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const eventsSchemaSql = `
  CREATE TABLE IF NOT EXISTS site_counter_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    counter_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const eventsIndexSql =
  "CREATE INDEX IF NOT EXISTS site_counter_events_key_created_idx ON site_counter_events(counter_key, created_at)";

async function database() {
  const db = env.DB;
  if (!db) throw new Error("The site counter is unavailable.");
  await db.batch([
    db.prepare(countersSchemaSql),
    db.prepare(eventsSchemaSql),
    db.prepare(eventsIndexSql),
  ]);
  return db;
}

export async function getYouAreHereCount() {
  const db = await database();
  const row = await db.prepare(
    "SELECT count FROM site_counters WHERE counter_key = ?"
  ).bind(YOU_ARE_HERE_KEY).first<{ count: number }>();
  return row?.count ?? 0;
}

export async function incrementYouAreHereCount() {
  const db = await database();
  await db.batch([
    db.prepare(`
      INSERT INTO site_counters (counter_key, count, updated_at)
      VALUES (?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(counter_key) DO UPDATE SET
        count = site_counters.count + 1,
        updated_at = CURRENT_TIMESTAMP
    `).bind(YOU_ARE_HERE_KEY),
    db.prepare(
      "INSERT INTO site_counter_events (counter_key) VALUES (?)"
    ).bind(YOU_ARE_HERE_KEY),
  ]);
  const row = await db.prepare(
    "SELECT count FROM site_counters WHERE counter_key = ?"
  ).bind(YOU_ARE_HERE_KEY).first<{ count: number }>();
  if (!row) throw new Error("The site counter could not be updated.");
  return row.count;
}
