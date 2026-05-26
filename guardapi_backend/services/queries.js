const POSTS_QUERY = `
  SELECT p.id, p.user_id, p.text_message, p.filenames, p.created_at, u.username
  FROM posts p JOIN users u ON p.user_id = u.id
  WHERE p.is_deleted = 0
`;

function buildFilteredQuery(filters = {}) {
  const { username, dateFrom, dateTo, limit } = filters;
  let sql = POSTS_QUERY;
  const params = [];

  if (username) {
    sql += ' AND u.username LIKE ?';
    params.push(`%${username}%`);
  }

  if (dateFrom) {
    sql += ' AND p.created_at >= ?';
    params.push(dateFrom);
  }

  if (dateTo) {
    sql += ' AND p.created_at <= ?';
    params.push(dateTo);
  }

  sql += ' ORDER BY p.created_at DESC';

  if (!dateFrom && !dateTo && limit) {
    sql += ' LIMIT ?';
    params.push(limit);
  }

  return { sql, params };
}

function parsePost(row) {
  if (!row) return null;
  return {
    ...row,
    filenames: row.filenames ? row.filenames.split(',') : []
  };
}

function parsePosts(rows) {
  return rows.map(parsePost);
}

module.exports = { POSTS_QUERY, buildFilteredQuery, parsePost, parsePosts };