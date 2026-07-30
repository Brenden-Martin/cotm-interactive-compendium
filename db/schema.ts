import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const deqPresets = sqliteTable("deq_presets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stateJson: text("state_json").notNull(),
  stateHash: text("state_hash").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
