const pool = require('../config/database.js');

async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [sessions] = await pool.execute(
      `SELECT s.*, u.username, u.type, u.is_2fa_enabled 
       FROM sessions s JOIN users u ON s.user_id = u.id 
       WHERE s.token = ? AND s.is_2fa_verified = 1 AND s.expires_at > NOW()`,
      [token]
    );

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Session expired' });
    }

    req.user = {
      id: sessions[0].user_id,
      username: sessions[0].username,
      type: sessions[0].type,
      is_2fa_enabled: sessions[0].is_2fa_enabled
    };

    req.session = {
      city: sessions[0].city,
      deviceFingerprint: sessions[0].device_fingerprint,
      createdAt: sessions[0].created_at
    };

    next();
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

module.exports = requireAuth;