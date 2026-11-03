CREATE TABLE `checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area` enum('hockeyrink','skidspar') NOT NULL,
	`displayName` varchar(40),
	`people` int NOT NULL DEFAULT 1,
	`arriveAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`ownerKey` varchar(64) NOT NULL,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checkins_id` PRIMARY KEY(`id`)
);
