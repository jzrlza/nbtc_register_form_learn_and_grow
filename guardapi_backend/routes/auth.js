const express = require('express');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const pool = require('../config/database.js');
const axios = require('axios');
const router = express.Router();
const SimpleRotatingLogger = require('../SimpleRotatingLogger');
const requireAuth = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const SPEAKEASY_SECRET_STR = process.env.TWOFACTOR_SPEAKEASY_SECRET_STR;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

//session age 7 days
//remembered_devices age 90 days

const fs = require('fs');
const path = require('path');
const logDir = process.env.LOG_PATH || path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = new SimpleRotatingLogger(logDir, 'backend-auth.js-access.log', {
  maxSize: 10 * 1024 * 1024,
  maxFiles: 5,
  compress: true,
  level: 'info'
});

const logFile = (req) => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
};

// ─── Helpers ──────────────────────────────────────────
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
}

function getDeviceFingerprint(req) {
  const ua = req.headers['user-agent'] || '';
  const lang = req.headers['accept-language'] || '';
  return crypto.createHash('sha256').update(`${ua}|${lang}`).digest('hex').substring(0, 16);
}

async function getCityFromIp(ip) {
  if (ip === '127.0.0.1' || ip === '::1') {
    return 'Local Network';
  }
  try {
    const res = await axios.get(`https://ipapi.co/${ip}/json/`);
    return res.data.city || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// ─── Login ────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    logFile(req);
    const { username, password } = req.body;

    const [users] = await pool.execute(
      'SELECT id, username, password, is_2fa_enabled, two_factor_secret, is_deleted, created_at, type FROM users WHERE username = ? AND is_deleted = 0',
      [username]
    ); //password is null when type = 1

    if (users.length <= 0) {
      return res.status(401).json({ success: false, error: 'ขออภัย ไม่พบ Username ในฐานข้อมูล' });
    }

    const user = users[0];
    const userType = parseInt(user.type);

    // Fix corrupted state
    if (user.is_2fa_enabled == 1 && user.two_factor_secret == null) {
      await pool.execute('UPDATE users SET is_2fa_enabled = 0 WHERE id = ?', [user.id]);
      user.is_2fa_enabled = 0;
    }

    const has2FA = user.is_2fa_enabled == 1;
    const fullyMade2FA = has2FA && user.two_factor_secret != null;
    const AD_API_URL = process.env.AD_API_URL;
    const AD_API_KEY = process.env.AD_API_KEY;
    let userAD;

    // ─── Initial Admin Bypass ──────────────────────────
    if (userType <= 0) {
      const sessionToken = generateToken();
      await pool.execute(
        `INSERT INTO sessions (user_id, token, is_2fa_verified, device_fingerprint, ip_address, city, expires_at)
         VALUES (?, ?, 1, 'admin', ?, 'Local', DATE_ADD(NOW(), INTERVAL 7 DAY))`,
        [user.id, sessionToken, getClientIp(req)]
      );

      return res.json({
        success: true,
        token: sessionToken,
        user: { id: user.id, username: user.username, type: user.type, code: 200, CN: "coreadmin", email: "core" },
        requires2FA: false
      });
    } else if (userType == 1) {
      //AD user, no need for internal password
      // ─── AD Authentication ─────────────────────────────
      if (!AD_API_URL || !AD_API_KEY) {
        return res.status(500).json({ success: false, error: 'Server configuration error' });
      }

      try {
        const tokenResponse = await axios.post(`${AD_API_URL}/token`, { api_key: AD_API_KEY });
        if (!tokenResponse.data.access_token) {
          return res.status(500).json({ success: false, error: 'การเชื่อมระบบ AD api_key ผิดพลาดในหลังบ้าน' });
        }

        const userResponse = await axios.post(`${AD_API_URL}/user-info`, {
          username, password,
          token: tokenResponse.data.access_token,
          api_key: AD_API_KEY
        });

        if (!userResponse.data) {
          return res.status(401).json({ success: false, error: 'ชื่อหรือรหัสผ่านผิดพลาด' });
        }

        // Create user if first time
        const [existing] = await pool.execute(
          'SELECT id FROM users WHERE username = ? AND is_deleted = 0',
          [username]
        );

        if (existing.length === 0) {
          await pool.execute(
            'INSERT INTO users (username, type, is_2fa_enabled) VALUES (?, 1, 1)',
            [username]
          );
        }

        userAD = userResponse.data;
        /*
         looks like this
          {
          "code": 200,
          "CN": "",
          "email": ""
          }
        */
      } catch {
        return res.status(401).json({ success: false, error: 'ชื่อหรือรหัสผ่านผิดพลาด' });
      }
    } else if (userType == 2) {
      //internal user admin, need password
      //return userAD object that simulates real AD one if password match
      userAD = {
          "code": 200,
          "CN": "",
          "email": "" //TBA
      }
    } else {
      //normal users, limited access when use
      //return userAD object that simulates real AD one if password match
      userAD = {
          "code": 200,
          "CN": "",
          "email": "" //TBA
      }
    }

    // ─── Device ────────────────────────────────────────
    const fingerprint = getDeviceFingerprint(req);
    const trustToken = req.body.trustToken || null;

    // ─── Check Trusted Device ──────────────────────────
    if (trustToken && fullyMade2FA) {
      const [devices] = await pool.execute(
        `SELECT * FROM trusted_devices 
         WHERE user_id = ? AND trust_token_hash = ? AND device_fingerprint = ? 
         AND is_revoked = 0 AND expires_at > NOW()`,
        [user.id, trustToken, fingerprint]
      );

      if (devices.length > 0) {
        const sessionToken = generateToken();
        await pool.execute(
          `INSERT INTO sessions (user_id, token, is_2fa_verified, device_fingerprint, expires_at)
           VALUES (?, ?, 1, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
          [user.id, sessionToken, fingerprint]
        );

        // Create JWT with user data (readable by frontend)
        const userToken = jwt.sign(
          { id: user.id, username: user.username, type: user.type },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({
          success: true,
          token: sessionToken,
          userToken: userToken,
          user: { id: user.id, username: user.username, type: user.type, ...userAD },
          requires2FA: false,
          message: 'Welcome back! (trusted device)'
        });
      }
    }

    // ─── 2FA Enabled → Require Code ────────────────────
    if (fullyMade2FA) {
      const tempToken = generateToken();
      await pool.execute(
        `INSERT INTO sessions (user_id, token, is_2fa_verified, device_fingerprint, expires_at)
         VALUES (?, ?, 0, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
        [user.id, tempToken, fingerprint]
      );

      return res.json({
        requires2FA: true,
        token: tempToken,
        userId: user.id,
        userAD: userAD
      });
    }

    // ─── No 2FA → Prompt Setup ─────────────────────────
    const tempToken = generateToken();
    await pool.execute(
      `INSERT INTO sessions (user_id, token, is_2fa_verified, device_fingerprint, expires_at)
       VALUES (?, ?, 0, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
      [user.id, tempToken, fingerprint]
    );

    return res.json({
      requires2FA: false,
      requiresSetup: true,
      token: tempToken,
      userId: user.id,
      username: user.username,
      userAD: userAD
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Verify 2FA ───────────────────────────────────────
router.post('/verify-2fa', async (req, res) => {
  try {
    logFile(req);
    const { token, code, rememberDevice } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'No session token provided' });
    }

    const [sessions] = await pool.execute(
      `SELECT s.*, u.two_factor_secret, u.username, u.type, u.is_2fa_enabled
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.token = ? AND s.is_2fa_verified = 0 AND s.expires_at > NOW()`,
      [token]
    );

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    const session = sessions[0];

    if (!session.two_factor_secret) {
      return res.status(400).json({ error: '2FA ยังไม่ได้ตั้งค่า กรุณากดตั้งค่า 2FA ก่อน' });
    }

    const verified = speakeasy.totp.verify({
      secret: session.two_factor_secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'รหัส 2FA code ผิด' });
    }

    // Enable 2FA if first-time setup
    if (!session.is_2fa_enabled) {
      await pool.execute('UPDATE users SET is_2fa_enabled = 1 WHERE id = ?', [session.user_id]);
    }

    // Upgrade session
    await pool.execute(
      'UPDATE sessions SET is_2fa_verified = 1, expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE id = ?',
      [session.id]
    );

    let newTrustToken = null;

    if (rememberDevice) {
      const trustToken = generateToken();
      const fingerprint = session.device_fingerprint;
      const city = session.city;

      const [existing] = await pool.execute(
        'SELECT * FROM trusted_devices WHERE user_id = ? AND device_fingerprint = ? AND is_revoked = 0 AND expires_at > NOW()',
        [session.user_id, fingerprint]
      );

      if (existing.length <= 0) {
        await pool.execute(
          `INSERT INTO trusted_devices 
           (user_id, trust_token_hash, device_fingerprint, expires_at)
           VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 90 DAY))`,
          [session.user_id, trustToken, fingerprint]
        );
      } else {
        await pool.execute(
          `UPDATE trusted_devices SET 
           trust_token_hash = ?, expires_at = DATE_ADD(NOW(), INTERVAL 90 DAY)
           WHERE user_id = ? AND device_fingerprint = ?`,
          [trustToken, session.user_id, fingerprint]
        );
      }

      newTrustToken = trustToken;
    }

    // Session already has username and type from the JOIN — no second query needed
    const userToken = jwt.sign(
      { id: session.user_id, username: session.username, type: session.type },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: token,
      userToken: userToken,
      trustToken: newTrustToken,
      user: {
        id: session.user_id,
        username: session.username,
        type: session.type,
        is_2fa_enabled: true
      },
      message: '2FA verified' + (rememberDevice ? ' — Device remembered' : '')
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Setup 2FA ────────────────────────────────────────
router.post('/setup-2fa', async (req, res) => {
  try {
    logFile(req);
    const { userId, username, token } = req.body;

    // Verify the session token is valid
    const [sessions] = await pool.execute(
      'SELECT * FROM sessions WHERE token = ? AND user_id = ? AND expires_at > NOW()',
      [token, userId]
    );

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    const secret = speakeasy.generateSecret({
      name: `${SPEAKEASY_SECRET_STR} : ${username}`
    });

    await pool.execute(
      'UPDATE users SET two_factor_secret = ?, is_2fa_enabled = 0 WHERE id = ?',
      [secret.base32, userId]
    );

    QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) {
        return res.status(500).json({ error: 'QR generation failed' });
      }
      res.json({
        success: true,
        secret: secret.base32,
        qrCode: data_url
      });
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Logout ───────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      await pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
    }
    res.json({ message: 'Logged out' });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Check Auth Status ────────────────────────────────
// Protected route
router.get('/me', requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user,
    session: req.session
  });
});

module.exports = router;