ALTER TABLE `rinkTeams` ADD `area` enum('hockeyrink','skidspar') DEFAULT 'hockeyrink' NOT NULL;--> statement-breakpoint
ALTER TABLE `skiDutySchedule` ADD `teamId` int;