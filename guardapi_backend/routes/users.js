const { Router } = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database.js');
const requireAuth = require('../middleware/auth');

const router = Router();

// GET /api/users
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, type, is_2fa_enabled, created_at FROM users WHERE is_deleted = 0 ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, type, is_2fa_enabled, created_at FROM users WHERE id = ? AND is_deleted = 0',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users (add)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { username, password, type, is_2fa_enabled } = req.body;

    if (type < 2) {
        return res.status(400).json({ error: 'AD Admin cannot be added directly' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check duplicate
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? AND is_deleted = 0',
      [username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const userType = type || 3;

    const [result] = await pool.query(
      'INSERT INTO users (username, password, type, is_2fa_enabled) VALUES (?, ?, ?, ?)',
      [username, hash, userType, is_2fa_enabled]
    );

    res.status(201).json({
      id: result.insertId,
      username,
      type: userType,
      message: 'User created'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id (edit)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { username, password, type, is_2fa_enabled } = req.body;
    const id = parseInt(req.params.id);

    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    // Check exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });

    // Update type if provided
    if (type !== undefined) {
      if (type < 2) {
        return res.status(400).json({ error: 'AD Admin cannot be editted directly' });
      }
      await pool.query('UPDATE users SET type = ? WHERE id = ?', [type, id]);
    }

    // Update username if provided
    if (username) {
      await pool.query('UPDATE users SET username = ? WHERE id = ?', [username, id]);
    }

    // Update password if provided
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, id]);
    }

    if (is_2fa_enabled !== undefined) {
      if (is_2fa_enabled) {
        await pool.query('UPDATE users SET is_2fa_enabled = ? WHERE id = ?', [is_2fa_enabled, id]);
      }
    }

    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id (soft delete)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    // Check exists
    const [existing] = await pool.query(
      'SELECT id, type FROM users WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });

    if (existing[0].type < 2) {
      return res.status(400).json({ error: 'AD Admin cannot be deleted directly' });
    }

    const [result] = await pool.query(
      'UPDATE users SET is_deleted = 1 WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;