const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { initWebSocket } = require('./services/websocketService.js');
const { startPolling } = require('./services/pollService.js');
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

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
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


// Start server
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || 3000;

server.listen(SERVER_PORT, SERVER_HOST, async () => {
  console.log(`\n🔐 Auth server running on:`);
  console.log(`   Local:   http://localhost:${SERVER_PORT}`);
  console.log(`   Network: http://${getLocalIp()}:${SERVER_PORT}`);
  console.log('📡 WebSocket ready');
  
  // Test database connection
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
  
  // Start real-time polling
  // ******modify additional tables in services/pollService.js
  await startPolling();
});