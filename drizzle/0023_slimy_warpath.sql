CREATE TABLE `sponsors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`logoUrl` varchar(500),
	`text` varchar(300),
	`url` varchar(500),
	`tier` enum('huvud','sponsor') NOT NULL DEFAULT 'sponsor',
	`area` enum('alla','hockeyrink','skidspar') NOT NULL DEFAULT 'alla',
	`active` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sponsors_id` PRIMARY KEY(`id`)
);
