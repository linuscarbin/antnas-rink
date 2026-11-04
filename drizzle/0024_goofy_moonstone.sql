CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topic` varchar(40) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` varchar(500) NOT NULL,
	`url` varchar(300),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notifications_user_created` ON `notifications` (`userId`,`createdAt`);