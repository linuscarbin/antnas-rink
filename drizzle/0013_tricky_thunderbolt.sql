ALTER TABLE `guides` MODIFY COLUMN `area` enum('publik','alla','hockeyrink','skidspar') NOT NULL DEFAULT 'alla';--> statement-breakpoint
ALTER TABLE `rinkStatus` ADD `photoUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `rinkStatus` ADD `photoAt` timestamp;--> statement-breakpoint
ALTER TABLE `rinkStatus` ADD `photoBy` varchar(120);--> statement-breakpoint
ALTER TABLE `trackStatus` ADD `photoUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `trackStatus` ADD `photoAt` timestamp;--> statement-breakpoint
ALTER TABLE `trackStatus` ADD `photoBy` varchar(120);