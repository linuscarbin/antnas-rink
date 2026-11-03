-- "Ena änden" tas bort: befintliga sådana bokningar räknas som en halva.
UPDATE `bookings` SET `zone` = 'half rink' WHERE `zone` = 'one end';--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `zone` enum('full rink','half rink') NOT NULL;