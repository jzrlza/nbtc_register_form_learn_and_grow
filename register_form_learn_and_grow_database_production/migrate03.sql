ALTER TABLE `employee`
ADD COLUMN `is_register_one` tinyint(1) NULL COMMENT '0=Not Reister , 1=Register' AFTER `is_register`;

DROP TABLE IF EXISTS `register_one`;
CREATE TABLE `register_one`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_id` smallint NULL DEFAULT NULL,
  `phone_number` varchar(20) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `is_attend` tinyint(1) NULL DEFAULT NULL,
  `take_van_id` tinyint(1) NULL DEFAULT NULL,
  `van_round_id` tinyint(1) NULL DEFAULT NULL,
  `take_food` varchar(60) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
  `sys_datetime` datetime NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Dynamic;