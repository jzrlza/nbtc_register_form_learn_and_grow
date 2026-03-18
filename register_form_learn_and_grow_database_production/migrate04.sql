ALTER TABLE `employee`
DROP COLUMN `is_register_one`;

ALTER TABLE `employee`
DROP COLUMN `is_register`;


#INSERT INTO `register_one` (emp_id, phone_number, is_attend, take_van_id, van_round_id, take_food) VALUES (random_int_from_1_to_2077, random_string_as_tel_number, 0_or_1, 1_to_4 [or null if is_attend = 0], 1_to_3 [or null if either [is_attend = 0] or [take_van_id = 3 to 4] ], 1_to_2 [or null if is_attend = 0 or take_van_id = 3 to 4 ]);