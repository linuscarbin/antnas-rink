CREATE TABLE `refuelings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area` enum('hockeyrink','skidspar') NOT NULL,
	`userId` int NOT NULL,
	`responsibleName` varchar(120) NOT NULL,
	`amountOre` int NOT NULL,
	`litresCenti` int,
	`paymentMethod` enum('tankkort_abk','egen') NOT NULL,
	`reimbursed` boolean NOT NULL DEFAULT false,
	`reimbursedAt` timestamp,
	`note` text,
	`receiptUrl` varchar(512),
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refuelings_id` PRIMARY KEY(`id`)
);
