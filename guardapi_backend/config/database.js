const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'testdb_realtime_table',
  port: process.env.DB_PORT || 3307,
  waitForConnections: true,
  connectionLimit: 10
});

/**
 * FOR TESTING
 */
/*
const mockData = {
  users: [
    { id: 1, username: 'jd', employee_id: 69, type:1, two_factor_secret: null, is_2fa_enabled: 0, created_at: "", is_deleted: 0}
  ]
};
const pool = mockData;
*/

module.exports = pool;