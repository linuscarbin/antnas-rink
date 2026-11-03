CREATE TABLE `dutyAbsences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`memberId` int NOT NULL,
	`message` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dutyAbsences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rinkTeamMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int,
	`name` varchar(120) NOT NULL,
	`phone` varchar(40),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rinkTeamMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rinkTeams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rinkTeams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `dutySchedule` ADD `teamId` int;