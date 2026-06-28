CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookedByName` varchar(120),
	`title` varchar(160) NOT NULL,
	`zone` enum('full rink','one end','half rink') NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`note` text,
	`status` enum('active','cancelled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`authorName` varchar(120) NOT NULL,
	`content` text NOT NULL,
	`deleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`role` varchar(120) NOT NULL,
	`phone` varchar(40),
	`email` varchar(320),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dutySchedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`plogjourName` varchar(120),
	`plogjourPhone` varchar(40),
	`plogjourUserId` int,
	`plogjourConflict` boolean NOT NULL DEFAULT false,
	`spoljourName` varchar(120),
	`spoljourPhone` varchar(40),
	`spoljourUserId` int,
	`spoljourConflict` boolean NOT NULL DEFAULT false,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dutySchedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rinkStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plogadAt` timestamp,
	`plogadBy` varchar(120),
	`spoladAt` timestamp,
	`spoladBy` varchar(120),
	`note` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rinkStatus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `systemSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(80) NOT NULL,
	`settingValue` text,
	`scheduleCronTaskUid` varchar(65),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `systemSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemSettings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(40);