CREATE TABLE `admin` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`salt` text NOT NULL,
	`hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`source_url` text NOT NULL,
	`updated_at` integer NOT NULL,
	`attempted_at` integer NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`key` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_throttle` (
	`id` integer PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`until` integer NOT NULL
);
