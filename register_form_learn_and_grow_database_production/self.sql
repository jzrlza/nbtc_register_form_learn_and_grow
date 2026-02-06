SELECT id, dept_name FROM dept;

SELECT id, emp_name FROM employee WHERE dept_id = 7 OR dept_id = 18;


UPDATE users SET is_2fa_enabled = 1, two_factor_secret = NULL WHERE employee_id = x;


INSERT INTO users (employee_id, is_2fa_enabled, is_deleted) VALUES (x, 1, 0);

x