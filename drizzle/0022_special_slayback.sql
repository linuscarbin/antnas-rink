CREATE TABLE `eventResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`answer` enum('yes','maybe','no') NOT NULL,
	`comment` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`area` enum('hockeyrink','skidspar','alla') NOT NULL DEFAULT 'hockeyrink',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`location` varchar(160),
	`description` text,
	`audience` enum('all','functionaries') NOT NULL DEFAULT 'all',
	`createdByUserId` int NOT NULL,
	`createdByName` varchar(120) NOT NULL,
	`status` enum('active','cancelled') NOT NULL DEFAULT 'active',
	`announced` boolean NOT NULL DEFAULT false,
	`reminderSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
