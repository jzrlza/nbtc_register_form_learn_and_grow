const { Router } = require('express');
const pool = require('../config/database.js');
const os = require('os');

const router = Router();

// GET /api
router.get('/', (req, res) => {
  res.json({
    message: 'NBTC API Server',
    version: '1.0.0',
    endpoints: [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/me',
      '/api/users',
      '/api/health'
    ]
  });
});

// GET /api/health
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message
    });
  }
});

module.exports = router;