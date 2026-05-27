const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const pool = require('../config/database.js');
const requireAuth = require('../middleware/auth');
const { POSTS_QUERY, buildFilteredQuery, parsePost, parsePosts } = require('../services/queries.js');

const router = Router();

const IMAGES_DIR = path.join(__dirname, '..', 'images');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => {
    // Use the filename from the frontend (already renamed)
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Only images allowed'));
  }
});

// ─── GET /api/posts/export (MUST be before /:id) ──────
router.get('/export', requireAuth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }

    const { sql, params } = buildFilteredQuery({
      dateFrom: `${dateFrom} 00:00:00`,
      dateTo: `${dateTo} 23:59:59`
    });

    const [rows] = await pool.query(sql, params);
    const posts = parsePosts(rows);

    // Build XLSX
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Posts');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Message', key: 'text_message', width: 50 },
      { header: 'Images', key: 'images', width: 40 },
      { header: 'Created', key: 'created_at', width: 22 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    posts.forEach(p => {
      sheet.addRow({
        id: p.id,
        username: p.username,
        text_message: p.text_message || '',
        images: (p.filenames || []).join(', '),
        created_at: new Date(p.created_at).toLocaleString(),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=posts_${dateFrom}_to_${dateTo}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts
router.get('/', requireAuth, async (req, res) => {
  try {
    const { username, dateFrom, dateTo } = req.query;
    const { sql, params } = buildFilteredQuery({
      username: username || null,
      dateFrom: dateFrom ? `${dateFrom} 00:00:00` : null,
      dateTo: dateTo ? `${dateTo} 23:59:59` : null,
      limit: 100
    });

    const [rows] = await pool.query(sql, params);
    res.json(parsePosts(rows));
  } catch (err) {
    console.error('GET /posts:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts
router.post('/', requireAuth, upload.array('images', 3), async (req, res) => {
  try {
    const { text_message } = req.body;
    const files = req.files || [];
    const filenames = files.map(f => f.filename).join(',') || null;

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, text_message, filenames) VALUES (?, ?, ?)',
      [req.user.id, text_message || null, filenames]
    );

    const [rows] = await pool.query(
      POSTS_QUERY + ' AND p.id = ?',
      [result.insertId]
    );

    broadcastIfNeeded(req);
    res.status(201).json(parsePost(rows[0]));
  } catch (err) {
    console.error('POST /posts:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const [rows] = await pool.query(
      POSTS_QUERY + ' AND p.id = ?',
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(parsePost(rows[0]));
  } catch (err) {
    console.error('GET /posts/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/posts/:id
router.put('/:id', requireAuth, upload.array('images', 3), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const [existing] = await pool.query(
      POSTS_QUERY + ' AND p.id = ? AND p.user_id = ?',
      [id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Post not found' });

    const { text_message } = req.body;
    const files = req.files || [];
    const newFilenames = files.map(f => f.filename);
    const oldFilenames = existing[0].filenames ? existing[0].filenames.split(',') : [];
    const allFilenames = [...oldFilenames, ...newFilenames].join(',') || null;

    await pool.query(
      'UPDATE posts SET text_message = ?, filenames = ? WHERE id = ?',
      [text_message !== undefined ? text_message : existing[0].text_message, allFilenames, id]
    );

    const [rows] = await pool.query(
      POSTS_QUERY + ' AND p.id = ?',
      [id]
    );

    res.json(parsePost(rows[0]));
  } catch (err) {
    console.error('PUT /posts/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const [result] = await pool.query(
      'UPDATE posts SET is_deleted = 1 WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Post not found' });

    broadcastIfNeeded(req);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('DELETE /posts/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function broadcastIfNeeded(req) {
  try {
    const wss = req.app.get('wss');
    if (!wss) return;

    const { sql, params } = buildFilteredQuery({ limit: 100 });
    const [rows] = await pool.query(sql, params);

    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'posts_updated', data: parsePosts(rows) }));
      }
    });
  } catch (err) {
    console.error('Broadcast error:', err.message);
  }
}

module.exports = router;