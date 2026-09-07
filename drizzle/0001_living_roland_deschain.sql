CREATE TABLE `login_throttle_bucket` (
	`bucket` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`until` integer NOT NULL
);
