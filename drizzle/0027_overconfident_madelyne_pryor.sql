CREATE TABLE `teamMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`kind` enum('text','job','event') NOT NULL DEFAULT 'text',
	`userId` int,
	`name` varchar(120) NOT NULL,
	`body` varchar(1000) NOT NULL DEFAULT '',
	`photoUrl` varchar(512),
	`jobId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teamMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `teamMessages_team_id` ON `teamMessages` (`teamId`,`id`);