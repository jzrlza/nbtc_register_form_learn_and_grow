INSERT INTO users (employee_id, is_2fa_enabled, is_deleted) VALUES (??, 1, 0);

UPDATE users SET is_2fa_enabled = 1, two_factor_secret = NULL WHERE employee_id = ??;