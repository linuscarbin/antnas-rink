CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area` enum('hockeyrink','skidspar') NOT NULL,
	`userId` int NOT NULL,
	`responsibleName` varchar(120) NOT NULL,
	`amountOre` int NOT NULL,
	`category` varchar(120),
	`paymentMethod` enum('tankkort_abk','egen') NOT NULL,
	`reimbursed` boolean NOT NULL DEFAULT false,
	`reimbursedAt` timestamp,
	`note` text,
	`receiptUrl` varchar(512),
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
