const pool = require('../config/database.js');
const { broadcast } = require('./websocketService.js');
const { POSTS_QUERY, buildFilteredQuery, parsePosts } = require('./queries.js');

let lastData = {};

async function startPolling() {
  const tables = ['posts'];

  for (const table of tables) {
    try {
      const { sql, params } = buildFilteredQuery({ limit: 100 });
      const [rows] = await pool.query(sql, params);
      lastData[table] = JSON.stringify(rows);
    } catch (err) {
      lastData[table] = '[]';
    }
  }

  console.log('🔄 Real-time polling started (every 2s)');

  setInterval(async () => {
    for (const table of tables) {
      try {
        const { sql, params } = buildFilteredQuery({ limit: 100 });
        const [rows] = await pool.query(sql, params);
        const currentData = JSON.stringify(rows);

        if (currentData !== lastData[table]) {
          console.log(`📝 Change detected in ${table}`);

          broadcast({
            type: `${table}_updated`,
            data: parsePosts(rows)
          });

          lastData[table] = currentData;
        }
      } catch (err) {
        console.error(`Poll error (${table}):`, err.message);
      }
    }
  }, 2000);
}

module.exports = { startPolling };