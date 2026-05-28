const pool = require('../config/database.js');
const { broadcast } = require('./websocketService.js');
const { buildFilteredQuery, buildFilteredQueryUsers, parsePosts, parseUsers } = require('./queries.js');

let lastData = {};

async function startPolling() {
  const tables = {
    posts: { builder: buildFilteredQuery, parser: parsePosts, defaultArgs: { limit: 100 } },
    users: { builder: buildFilteredQueryUsers, parser: parseUsers, defaultArgs: {} }
  };

  for (const [table, config] of Object.entries(tables)) {
    try {
      const { sql, params } = config.builder(config.defaultArgs);
      const [rows] = await pool.query(sql, params);
      lastData[table] = JSON.stringify(rows);
    } catch (err) {
      lastData[table] = '[]';
    }
  }

  console.log('🔄 Real-time polling started (every 2s)');

  setInterval(async () => {
    for (const [table, config] of Object.entries(tables)) {
      try {
        const { sql, params } = config.builder(config.defaultArgs);
        const [rows] = await pool.query(sql, params);
        const currentData = JSON.stringify(rows);

        if (currentData !== lastData[table]) {
          console.log(`📝 Change detected in ${table}`);

          broadcast({
            type: `${table}_updated`,
            data: config.parser(rows)
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