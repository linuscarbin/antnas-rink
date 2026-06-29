CREATE TABLE `skiDutySchedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`sparjourName` varchar(120),
	`sparjourPhone` varchar(40),
	`sparjourUserId` int,
	`sparjourConflict` boolean NOT NULL DEFAULT false,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skiDutySchedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trackStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dragetAt` timestamp,
	`dragetBy` varchar(120),
	`condition` enum('Mycket bra','Bra','Hyfsat','Dåligt','Ej åkbart'),
	`note` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trackStatus_id` PRIMARY KEY(`id`)
);
