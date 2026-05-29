const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { initWebSocket } = require('./services/websocketService.js');
const { startPolling } = require('./services/pollService.js');
const cleanupService = require('./services/cleanupService.js');
const pool = require('./config/database.js');
const os = require('os');
const path = require('path');
const cookieParser = require('cookie-parser');

// Import routes
const authRoutes = require('./routes/auth.js');
const usersRoutes = require('./routes/users.js');
const indexRoutes = require('./routes/index.js');
const postsRoutes = require('./routes/posts');

const IMAGES_DIR = path.join(__dirname, 'images');

// Helper function for displaying URLs (development only)
function getDisplayUrls(port) {
  if (process.env.NODE_ENV === 'production') {
    const publicUrl = process.env.PUBLIC_URL || `https://${process.env.SERVER_HOST || 'localhost'}`;
    return { public: `${publicUrl}:${port}` };
  }
  
  // Development: show available network interfaces
  const nets = os.networkInterfaces();
  const urls = { local: `http://localhost:${port}` };
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        if (!urls.network) urls.network = [];
        urls.network.push(`http://${net.address}:${port}`);
      }
    }
  }
  
  return urls;
}

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
initWebSocket(server);

// Middleware
app.use(cors({
  origin: true,          // Reflects request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/images', express.static(IMAGES_DIR));
app.use(cookieParser());

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api', indexRoutes);

// Run cleanup manually
app.post('/api/admin/cleanup', async (req, res) => {
  const stats = await cleanupService.cleanup();
  res.json(stats);
});

// Set time in seconds (for testing)
app.put('/api/admin/cleanup/seconds', (req, res) => {
  const { seconds } = req.body;
  cleanupService.setSeconds(seconds || 30);
  res.json({ 
    message: `Delete after ${seconds} seconds`,
    config: cleanupService.getConfig() 
  });
});

// Set time in minutes
app.put('/api/admin/cleanup/minutes', (req, res) => {
  const { minutes } = req.body;
  cleanupService.setMinutes(minutes || 5);
  res.json({ 
    message: `Delete after ${minutes} minutes`,
    config: cleanupService.getConfig() 
  });
});

// Set time in hours
app.put('/api/admin/cleanup/hours', (req, res) => {
  const { hours } = req.body;
  cleanupService.setHours(hours || 1);
  res.json({ 
    message: `Delete after ${hours} hours`,
    config: cleanupService.getConfig() 
  });
});

// Set time in days
app.put('/api/admin/cleanup/days', (req, res) => {
  const { days } = req.body;
  cleanupService.setDays(days || 365);
  res.json({ 
    message: `Delete after ${days} days`,
    config: cleanupService.getConfig() 
  });
});

// Universal setter
app.put('/api/admin/cleanup/config', (req, res) => {
  const { value, unit } = req.body;
  cleanupService.setTime(value, unit);
  res.json({ 
    message: `Delete after ${value} ${unit}`,
    config: cleanupService.getConfig() 
  });
});

// Get current config
app.get('/api/admin/cleanup/config', (req, res) => {
  res.json(cleanupService.getConfig());
});

// Start server - FIXED: Always bind to 0.0.0.0 in production
const SERVER_HOST = process.env.NODE_ENV === 'production' 
  ? '0.0.0.0'  // Listen on all interfaces when behind reverse proxy/DNS
  : (process.env.SERVER_HOST || 'localhost');

const SERVER_PORT = process.env.SERVER_PORT || 3000;

server.listen(SERVER_PORT, SERVER_HOST, async () => {
  const urls = getDisplayUrls(SERVER_PORT);
  
  console.log(`\n🔐 Auth server running on:`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`   Public:  ${urls.public}`);
    console.log(`   Bind:    ${SERVER_HOST}:${SERVER_PORT}`);
    console.log(`   Mode:    PRODUCTION (DNS ready)`);
  } else {
    console.log(`   Local:   ${urls.local}`);
    if (urls.network && urls.network.length) {
      console.log(`   Network:`);
      urls.network.forEach(url => console.log(`            ${url}`));
    } else {
      console.log(`   Network: (no external interfaces found)`);
    }
    console.log(`   Mode:    DEVELOPMENT`);
  }
  
  console.log('📡 WebSocket ready');
  
  // Test database connection
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Production: Exiting due to database connection failure');
      process.exit(1);
    }
  }
  
  // Start real-time polling
  // ******modify additional tables in services/pollService.js
  await startPolling();
  await cleanupService.start();
});