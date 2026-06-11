const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'vote.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// Promisify db methods
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDatabase() {
  // Enable WAL mode for better concurrent read performance
  await run('PRAGMA journal_mode=WAL');
  await run('PRAGMA foreign_keys=ON');

  // Activity table
  await run(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','voting','paused','ended')),
      max_votes_per_user INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      updated_at DATETIME DEFAULT (datetime('now','localtime'))
    )
  `);

  // Candidate groups table
  await run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    )
  `);

  // Vote records table
  await run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      voter_uuid TEXT NOT NULL,
      voter_ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for fast lookups
  await run(`CREATE INDEX IF NOT EXISTS idx_votes_activity ON votes(activity_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_votes_uuid ON votes(voter_uuid, activity_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_votes_group ON votes(group_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_groups_activity ON groups(activity_id)`);

  // Admin table
  await run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    )
  `);

  // System config table
  await run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT (datetime('now','localtime'))
    )
  `);

  // Access log table
  await run(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT NOT NULL,
      voter_uuid TEXT DEFAULT '',
      voter_ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    )
  `);

  // Insert default admin if not exists
  const admin = await get('SELECT id FROM admins WHERE username = ?', ['admin']);
  if (!admin) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    await run('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', hash]);
  }

  // Insert default config
  const configs = [
    ['system_name', '扫码投票系统'],
    ['allow_vote', 'true']
  ];
  for (const [key, value] of configs) {
    const existing = await get('SELECT key FROM config WHERE key = ?', [key]);
    if (!existing) {
      await run('INSERT INTO config (key, value) VALUES (?, ?)', [key, value]);
    }
  }

  // Insert a default activity if none exists
  const activity = await get('SELECT id FROM activities LIMIT 1');
  if (!activity) {
    const result = await run(
      'INSERT INTO activities (name, description, status) VALUES (?, ?, ?)',
      ['示例投票活动', '这是一个示例投票活动，可在后台管理页面修改', 'pending']
    );
    const activityId = result.lastID;
    const defaultGroups = [
      ['社区画像组', '专注于社区调研与画像分析', 1],
      ['智慧门禁组', '打造智能化门禁管理系统', 2],
      ['智能服务组', '提供智能化服务解决方案', 3],
      ['信息归仓组', '负责信息整理与数据归档', 4]
    ];
    for (const [name, desc, order] of defaultGroups) {
      await run(
        'INSERT INTO groups (activity_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
        [activityId, name, desc, order]
      );
    }
  }

  console.log('数据库初始化完成');
}

module.exports = { db, run, get, all, initDatabase };
