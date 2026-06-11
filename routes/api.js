const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database');

// Get current active activity
router.get('/activity', async (req, res) => {
  try {
    const activity = await get(
      'SELECT * FROM activities WHERE status != "ended" ORDER BY id DESC LIMIT 1'
    );
    if (!activity) {
      return res.json({ code: 404, message: '暂无活动' });
    }
    const groups = await all(
      'SELECT * FROM groups WHERE activity_id = ? ORDER BY sort_order ASC',
      [activity.id]
    );
    res.json({ code: 0, data: { activity, groups } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Get activity status
router.get('/activity/:id/status', async (req, res) => {
  try {
    const activity = await get('SELECT status FROM activities WHERE id = ?', [req.params.id]);
    if (!activity) return res.json({ code: 404, message: '活动不存在' });
    res.json({ code: 0, data: { status: activity.status } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Check if voter has already voted
router.get('/vote/check/:activityId/:uuid', async (req, res) => {
  try {
    const { activityId, uuid } = req.params;
    const vote = await get(
      'SELECT id, group_id FROM votes WHERE activity_id = ? AND voter_uuid = ?',
      [activityId, uuid]
    );
    if (vote) {
      const group = await get('SELECT name FROM groups WHERE id = ?', [vote.group_id]);
      res.json({ code: 0, data: { voted: true, groupName: group ? group.name : '' } });
    } else {
      res.json({ code: 0, data: { voted: false } });
    }
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Submit vote
router.post('/vote', async (req, res) => {
  try {
    const { activityId, groupId, voterUuid } = req.body;
    if (!activityId || !groupId || !voterUuid) {
      return res.json({ code: 400, message: '参数不完整' });
    }

    // Check activity status
    const activity = await get('SELECT status FROM activities WHERE id = ?', [activityId]);
    if (!activity) return res.json({ code: 404, message: '活动不存在' });
    if (activity.status !== 'voting') {
      return res.json({ code: 403, message: '当前不在投票阶段' });
    }

    // Check if already voted
    const existing = await get(
      'SELECT id FROM votes WHERE activity_id = ? AND voter_uuid = ?',
      [activityId, voterUuid]
    );
    if (existing) {
      return res.json({ code: 403, message: '您已经投过票' });
    }

    // Check group exists
    const group = await get('SELECT id FROM groups WHERE id = ? AND activity_id = ?', [groupId, activityId]);
    if (!group) return res.json({ code: 404, message: '候选组不存在' });

    // Record vote
    const voterIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    await run(
      'INSERT INTO votes (activity_id, group_id, voter_uuid, voter_ip, user_agent) VALUES (?, ?, ?, ?, ?)',
      [activityId, groupId, voterUuid, voterIp, userAgent]
    );

    // Get updated results and broadcast
    const results = await getVoteResults(activityId);
    if (req.io) {
      req.io.emit('voteUpdate', results);
    }

    res.json({ code: 0, message: '投票成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Get vote results
router.get('/results/:activityId', async (req, res) => {
  try {
    const results = await getVoteResults(req.params.activityId);
    res.json({ code: 0, data: results });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Get leaderboard
router.get('/leaderboard/:activityId', async (req, res) => {
  try {
    const results = await getVoteResults(req.params.activityId);
    res.json({ code: 0, data: results.leaderboard });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Generate QR code data
router.get('/qrcode/:activityId', async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const voteUrl = `${protocol}://${host}/vote.html?activity=${req.params.activityId}`;
    res.json({ code: 0, data: { url: voteUrl } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Log page access
router.post('/log/access', async (req, res) => {
  try {
    const { page, voterUuid } = req.body;
    const voterIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    await run(
      'INSERT INTO access_logs (page, voter_uuid, voter_ip, user_agent) VALUES (?, ?, ?, ?)',
      [page || '', voterUuid || '', voterIp, userAgent]
    );
    res.json({ code: 0 });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// Helper: get vote results for an activity
async function getVoteResults(activityId) {
  const activity = await get('SELECT * FROM activities WHERE id = ?', [activityId]);
  const groups = await all('SELECT * FROM groups WHERE activity_id = ? ORDER BY sort_order ASC', [activityId]);
  const totalVotes = await get('SELECT COUNT(*) as count FROM votes WHERE activity_id = ?', [activityId]);
  const totalVoters = totalVotes.count;

  const leaderboard = [];
  for (const group of groups) {
    const voteCount = await get(
      'SELECT COUNT(*) as count FROM votes WHERE activity_id = ? AND group_id = ?',
      [activityId, group.id]
    );
    leaderboard.push({
      id: group.id,
      name: group.name,
      description: group.description,
      image: group.image,
      votes: voteCount.count,
      percentage: totalVoters > 0 ? ((voteCount.count / totalVoters) * 100).toFixed(1) : '0.0'
    });
  }

  // Sort by votes descending
  leaderboard.sort((a, b) => b.votes - a.votes);
  leaderboard.forEach((item, index) => { item.rank = index + 1; });

  return {
    activity: { id: activity.id, name: activity.name, description: activity.description, status: activity.status },
    totalVoters,
    leaderboard
  };
}

module.exports = router;
