const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { run, get, all } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'vote-system-secret-key-2024';

// File upload config
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `group_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// No auth middleware - access is hidden via UI only

// Admin login (kept for compatibility)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ code: 400, message: '请输入用户名和密码' });
    const admin = await get('SELECT * FROM admins WHERE username = ?', [username]);
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ code: 0, data: { token, username: admin.username } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Get all activities
router.get('/activities', async (req, res) => {
  try {
    const activities = await all('SELECT * FROM activities ORDER BY id DESC');
    for (const act of activities) {
      const voteCount = await get('SELECT COUNT(*) as count FROM votes WHERE activity_id = ?', [act.id]);
      const groupCount = await get('SELECT COUNT(*) as count FROM groups WHERE activity_id = ?', [act.id]);
      act.voteCount = voteCount.count;
      act.groupCount = groupCount.count;
    }
    res.json({ code: 0, data: activities });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Create activity
router.post('/activity', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.json({ code: 400, message: '请输入活动名称' });
    const result = await run(
      'INSERT INTO activities (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    res.json({ code: 0, data: { id: result.lastID } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Update activity
router.put('/activity/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    await run(
      `UPDATE activities SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = datetime('now','localtime') WHERE id = ?`,
      [name, description, req.params.id]
    );
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Delete activity
router.delete('/activity/:id', async (req, res) => {
  try {
    await run('DELETE FROM activities WHERE id = ?', [req.params.id]);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Update activity status (start/pause/end)
router.put('/activity/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'voting', 'paused', 'ended'].includes(status)) {
      return res.json({ code: 400, message: '无效的状态' });
    }
    await run(
      `UPDATE activities SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      [status, req.params.id]
    );
    // Broadcast status change
    if (req.io) {
      const activity = await get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
      req.io.emit('statusChange', { activityId: parseInt(req.params.id), status, activity });
    }
    res.json({ code: 0, message: '状态已更新' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Get groups for an activity
router.get('/activity/:id/groups', async (req, res) => {
  try {
    const groups = await all(
      'SELECT * FROM groups WHERE activity_id = ? ORDER BY sort_order ASC',
      [req.params.id]
    );
    res.json({ code: 0, data: groups });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Add group
router.post('/activity/:id/group', async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    if (!name) return res.json({ code: 400, message: '请输入组名' });
    const maxOrder = await get(
      'SELECT MAX(sort_order) as max_order FROM groups WHERE activity_id = ?',
      [req.params.id]
    );
    const order = sort_order !== undefined ? sort_order : (maxOrder?.max_order || 0) + 1;
    const result = await run(
      'INSERT INTO groups (activity_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
      [req.params.id, name, description || '', order]
    );
    res.json({ code: 0, data: { id: result.lastID } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Update group
router.put('/group/:id', async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    await run(
      'UPDATE groups SET name = COALESCE(?, name), description = COALESCE(?, description), sort_order = COALESCE(?, sort_order) WHERE id = ?',
      [name, description, sort_order, req.params.id]
    );
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Delete group
router.delete('/group/:id', async (req, res) => {
  try {
    const group = await get('SELECT image FROM groups WHERE id = ?', [req.params.id]);
    if (group && group.image) {
      const imgPath = path.join(uploadDir, path.basename(group.image));
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await run('DELETE FROM groups WHERE id = ?', [req.params.id]);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Upload group image
router.post('/group/:id/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.json({ code: 400, message: '请选择图片' });
    const imageUrl = `/uploads/${req.file.filename}`;
    // Delete old image
    const old = await get('SELECT image FROM groups WHERE id = ?', [req.params.id]);
    if (old && old.image) {
      const oldPath = path.join(uploadDir, path.basename(old.image));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await run('UPDATE groups SET image = ? WHERE id = ?', [imageUrl, req.params.id]);
    res.json({ code: 0, data: { image: imageUrl } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Clear votes for an activity
router.delete('/activity/:id/votes', async (req, res) => {
  try {
    const result = await run('DELETE FROM votes WHERE activity_id = ?', [req.params.id]);
    if (req.io) {
      req.io.emit('voteReset', { activityId: parseInt(req.params.id) });
    }
    res.json({ code: 0, message: `已清空 ${result.changes} 条投票记录` });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Export vote results as JSON
router.get('/activity/:id/export', async (req, res) => {
  try {
    const activity = await get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    const groups = await all('SELECT * FROM groups WHERE activity_id = ? ORDER BY sort_order', [req.params.id]);
    const votes = await all(
      `SELECT v.*, g.name as group_name FROM votes v
       LEFT JOIN groups g ON v.group_id = g.id
       WHERE v.activity_id = ? ORDER BY v.created_at`,
      [req.params.id]
    );
    const results = [];
    for (const group of groups) {
      const count = await get(
        'SELECT COUNT(*) as count FROM votes WHERE group_id = ?', [group.id]
      );
      results.push({ ...group, votes: count.count });
    }
    results.sort((a, b) => b.votes - a.votes);
    res.json({ code: 0, data: { activity, results, voteDetails: votes } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalActivities = await get('SELECT COUNT(*) as count FROM activities');
    const totalVotes = await get('SELECT COUNT(*) as count FROM votes');
    const totalGroups = await get('SELECT COUNT(*) as count FROM groups');
    const recentVotes = await all(
      `SELECT v.*, g.name as group_name, a.name as activity_name
       FROM votes v
       LEFT JOIN groups g ON v.group_id = g.id
       LEFT JOIN activities a ON v.activity_id = a.id
       ORDER BY v.created_at DESC LIMIT 20`
    );
    res.json({
      code: 0,
      data: {
        totalActivities: totalActivities.count,
        totalVotes: totalVotes.count,
        totalGroups: totalGroups.count,
        recentVotes
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Change admin password
router.put('/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const admin = await get('SELECT * FROM admins WHERE id = ?', [req.adminId]);
    if (!bcrypt.compareSync(oldPassword, admin.password)) {
      return res.json({ code: 400, message: '原密码错误' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    await run('UPDATE admins SET password = ? WHERE id = ?', [hash, req.adminId]);
    res.json({ code: 0, message: '密码修改成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;
