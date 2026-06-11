const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { initDatabase, db } = require('./database');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Serve existing static HTML files from root
app.use(express.static(__dirname));

// Attach io to request for real-time push
app.use((req, res, next) => {
  req.io = io;
  req.db = db;
  next();
});

// Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Socket.IO connection handling
let onlineCount = 0;
io.on('connection', (socket) => {
  onlineCount++;
  io.emit('onlineCount', onlineCount);

  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    io.emit('onlineCount', onlineCount);
  });
});

// Expose io for routes
app.set('io', io);

// Initialize database and start server
initDatabase().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ========================================`);
    console.log(`    投票系统已启动`);
    console.log(`    本地访问: http://localhost:${PORT}`);
    console.log(`    投票页面: http://localhost:${PORT}/vote.html`);
    console.log(`    大屏展示: http://localhost:${PORT}/screen.html`);
    console.log(`    后台管理: http://localhost:${PORT}/admin.html`);
    console.log(`  ========================================\n`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});

module.exports = { app, server, io };
