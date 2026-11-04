-- Team chat notifications on for everyone who already gets job notifications.
UPDATE `pushSubscriptions` SET `topics` = CONCAT(`topics`, 'duty_chat,')
WHERE `topics` LIKE '%,duty_jobs,%' AND `topics` NOT LIKE '%,duty_chat,%';
