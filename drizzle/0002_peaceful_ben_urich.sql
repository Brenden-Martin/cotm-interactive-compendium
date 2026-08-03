CREATE TABLE `fortune_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fortune_text` text NOT NULL,
	`fortune_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fortune_suggestions_fortune_hash_unique` ON `fortune_suggestions` (`fortune_hash`);--> statement-breakpoint
CREATE INDEX `fortune_suggestions_status_created_idx` ON `fortune_suggestions` (`status`,`created_at`);