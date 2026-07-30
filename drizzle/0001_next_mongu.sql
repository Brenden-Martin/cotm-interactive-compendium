CREATE TABLE `site_counter_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`counter_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_counter_events_key_created_idx` ON `site_counter_events` (`counter_key`,`created_at`);--> statement-breakpoint
CREATE TABLE `site_counters` (
	`counter_key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
