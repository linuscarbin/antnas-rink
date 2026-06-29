CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`category` varchar(120),
	`fileUrl` varchar(512) NOT NULL,
	`fileName` varchar(255),
	`uploadedByName` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bilbingoOccasions` ADD `leadName` varchar(120);--> statement-breakpoint
ALTER TABLE `bilbingoOccasions` ADD `leadPhone` varchar(40);