-- Add foreign key column
ALTER TABLE `users`
ADD COLUMN `password` varchar(255) NULL DEFAULT NULL AFTER `username`;

-- Remove old columns
--ALTER TABLE `users`
--DROP COLUMN `username`,
--DROP COLUMN `password`;
