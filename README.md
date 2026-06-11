# 扫码投票系统

一个完整的扫码投票系统，支持手机扫码投票、大屏实时展示、后台管理。

## 功能特性

- 📱 **手机投票页面** - 扫码即可投票，适配各种移动设备
- 🖥 **大屏展示页面** - 实时投票结果、排行榜、柱状图、饼图
- 🔧 **后台管理页面** - 活动管理、候选组管理、投票控制、数据导出
- 🔒 **防刷票机制** - UUID + IP 双重验证
- ⚡ **实时推送** - Socket.IO 实时数据更新
- 🐳 **Docker 部署** - 一键部署

## 技术栈

- **前端**: HTML + CSS + JavaScript + Chart.js + Socket.IO Client
- **后端**: Node.js + Express + Socket.IO
- **数据库**: SQLite（可切换 MySQL）
- **部署**: Docker + Nginx

## 快速开始

### 方式一：直接运行

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

访问 http://localhost:3000

### 方式二：Docker 部署

```bash
# 构建并启动
docker-compose up -d
```

访问 http://localhost

## 页面说明

| 页面 | 地址 | 说明 |
|------|------|------|
| 手机投票 | /vote.html | 用户扫码投票页面 |
| 大屏展示 | /screen.html | 实时投票结果大屏 |
| 后台管理 | /admin.html | 管理员后台 |
| 原有页面 | /小组抽签加分小程序.html | 原有功能不受影响 |

## 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`

> ⚠️ 请在生产环境中修改默认密码

## 项目结构

```
├── server.js          # 服务端入口
├── database.js        # 数据库初始化和操作
├── package.json       # 项目依赖
├── Dockerfile         # Docker 镜像配置
├── docker-compose.yml # Docker Compose 编排
├── nginx.conf         # Nginx 配置
├── routes/
│   ├── api.js         # 公开 API 接口
│   └── admin.js       # 管理员 API 接口
├── public/
│   ├── vote.html      # 手机投票页面
│   ├── screen.html    # 大屏展示页面
│   ├── admin.html     # 后台管理页面
│   └── css/
│       └── common.css # 公共样式
└── data/
    └── vote.db        # SQLite 数据库文件
```

## API 接口

### 公开接口 (无需认证)

- `GET /api/activity` - 获取当前活动信息
- `POST /api/vote` - 提交投票
- `GET /api/vote/check/:activityId/:uuid` - 检查投票状态
- `GET /api/results/:activityId` - 获取投票结果
- `GET /api/leaderboard/:activityId` - 获取排行榜
- `GET /api/qrcode/:activityId` - 获取二维码数据

### 管理接口 (需要认证)

- `POST /admin/login` - 管理员登录
- `GET /admin/activities` - 获取活动列表
- `POST /admin/activity` - 创建活动
- `PUT /admin/activity/:id` - 更新活动
- `PUT /admin/activity/:id/status` - 更新活动状态
- `DELETE /admin/activity/:id` - 删除活动
- `POST /admin/activity/:id/group` - 添加候选组
- `PUT /admin/group/:id` - 更新候选组
- `POST /admin/group/:id/image` - 上传组别图片
- `DELETE /admin/activity/:id/votes` - 清空投票数据
- `GET /admin/activity/:id/export` - 导出投票结果
- `GET /admin/stats` - 获取统计数据

## License

MIT
