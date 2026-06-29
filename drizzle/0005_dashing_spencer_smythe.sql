CREATE TABLE `efforts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('plogad','spolad','draget') NOT NULL,
	`userId` int,
	`byName` varchar(120) NOT NULL,
	`helpers` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `efforts_id` PRIMARY KEY(`id`)
);
