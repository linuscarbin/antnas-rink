CREATE TABLE `guides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`area` enum('alla','hockeyrink','skidspar') NOT NULL DEFAULT 'alla',
	`body` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`updatedByName` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guides_id` PRIMARY KEY(`id`)
);
