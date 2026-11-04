ALTER TABLE `users` MODIFY COLUMN `email` varchar(320);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordSet` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `accountTokenHash` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `accountTokenExpiresAt` timestamp;