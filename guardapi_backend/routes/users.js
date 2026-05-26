const { Router } = require('express');
const pool = require('../config/database.js');
const requireAuth = require('../middleware/auth');

const router = Router();

// GET /api/users
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query('UPDATE users SET ? WHERE id = ?', [req.body, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;