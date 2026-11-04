CREATE TABLE `dutyJobResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`answer` enum('yes','no') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dutyJobResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dutyJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area` enum('hockeyrink','skidspar') NOT NULL,
	`kind` enum('plog','spol','plog_spol','spar','annat') NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`note` varchar(300),
	`teamId` int,
	`createdByUserId` int NOT NULL,
	`createdByName` varchar(120) NOT NULL,
	`status` enum('open','done','cancelled') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dutyJobs_id` PRIMARY KEY(`id`)
);
