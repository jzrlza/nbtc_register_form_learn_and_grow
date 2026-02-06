-- Add foreign key column
ALTER TABLE `users`
ADD COLUMN `employee_id` int NULL AFTER `id`;

-- Remove old columns
ALTER TABLE `users`
DROP COLUMN `username`,
DROP COLUMN `password`;
