CREATE TABLE `bilbingoOccasions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`season` int NOT NULL,
	`occasionDate` timestamp NOT NULL,
	`location` varchar(200),
	`targetCount` int NOT NULL DEFAULT 20,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bilbingoOccasions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bingoAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`occasionId` int NOT NULL,
	`familyId` int NOT NULL,
	`locked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bingoAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `families` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`parentName` varchar(160) NOT NULL,
	`phone` varchar(40),
	`email` varchar(320),
	`activeCount` int NOT NULL DEFAULT 1,
	`unavailable` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `families_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`shareToken` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_shareToken_unique` UNIQUE(`shareToken`)
);
