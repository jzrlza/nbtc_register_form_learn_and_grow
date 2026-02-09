-- Add foreign key column
ALTER TABLE `users`
ADD COLUMN `username` varchar(80) NULL AFTER `id`;
