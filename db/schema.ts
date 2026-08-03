import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const deqPresets = sqliteTable("deq_presets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stateJson: text("state_json").notNull(),
  stateHash: text("state_hash").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const siteCounters = sqliteTable("site_counters", {
  counterKey: text("counter_key").primaryKey(),
  count: integer("count").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const siteCounterEvents = sqliteTable(
  "site_counter_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    counterKey: text("counter_key").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("site_counter_events_key_created_idx").on(table.counterKey, table.createdAt),
  ],
);

export const fortuneSuggestions = sqliteTable(
  "fortune_suggestions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fortuneText: text("fortune_text").notNull(),
    fortuneHash: text("fortune_hash").notNull().unique(),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("fortune_suggestions_status_created_idx").on(table.status, table.createdAt),
  ],
);
