CREATE TABLE `deq_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`state_json` text NOT NULL,
	`state_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deq_presets_state_hash_unique` ON `deq_presets` (`state_hash`);