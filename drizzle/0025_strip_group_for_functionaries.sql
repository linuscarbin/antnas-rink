-- Functionaries and admins don't need "Ett gäng är på väg" by default.
UPDATE `pushSubscriptions` SET `topics` = REPLACE(`topics`, ',group,', ',')
WHERE `userId` IN (SELECT `userId` FROM `rinkTeamMembers` WHERE `userId` IS NOT NULL)
   OR `userId` IN (SELECT `id` FROM `users` WHERE `role` = 'admin');
--> statement-breakpoint
UPDATE `pushSubscriptions` SET `topics` = '' WHERE `topics` = ',';
--> statement-breakpoint
-- New "Rinken är plogad" topic: on for everyone else who follows the rink.
UPDATE `pushSubscriptions` SET `topics` = CONCAT(`topics`, 'rink_plogad,')
WHERE `topics` LIKE '%,rink_spolad,%' AND `topics` NOT LIKE '%,rink_plogad,%'
  AND (`userId` IS NULL OR (
    `userId` NOT IN (SELECT `userId` FROM `rinkTeamMembers` WHERE `userId` IS NOT NULL)
    AND `userId` NOT IN (SELECT `id` FROM `users` WHERE `role` = 'admin')
  ));
