CREATE TABLE `catches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`x` real DEFAULT 0.5 NOT NULL,
	`y` real DEFAULT 0.45 NOT NULL,
	`source` text NOT NULL,
	`image` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_catches_owner_created` ON `catches` (`owner`,`created`);