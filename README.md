# 小组抽签加分 & 投票系统

支持随机点名加分、手机扫码投票、大屏实时展示、后台管理的一体化系统。

## 功能特性

- 🎯 **随机点名** - 首页支持小组随机点名、+1 加分、排行榜
- 🗳️ **扫码投票** - 手机扫码即可投票，适配各种移动设备
- 🖥️ **大屏展示** - 实时投票结果、排行榜、柱状图、饼图
- ⚙️ **后台管理** - 活动管理、候选组管理、投票控制、数据导出（入口隐藏在点名首页右下角）
- 🔒 **防刷票** - UUID + IP 双重验证
- ⚡ **实时推送** - Socket.IO 实时数据更新
- 🐳 **多种部署** - 支持宝塔面板、Docker、直接运行

## 技术栈

- **前端**: HTML + CSS + JavaScript + Chart.js + Socket.IO Client
- **后端**: Node.js + Express + Socket.IO
- **数据库**: SQLite（使用 Node.js 内置 `node:sqlite` 模块，无额外依赖）
- **部署**: 宝塔面板 / Docker + Nginx

## 环境要求

- **Node.js >= 22.5**（需要内置的 `node:sqlite` 模块）

## 页面说明

| 页面 | 地址 | 说明 |
|------|------|------|
| 首页（点名） | `/` | 随机点名加分，右下角 ⚙ 隐藏入口进入后台 |
| 投票页面 | `/vote.html` | 手机扫码投票 |
| 大屏展示 | `/screen.html` | 实时投票结果大屏，按 F 全屏 |
| 后台管理 | `/admin.html` | 活动/候选组/投票控制管理 |

> 后台管理入口不直接暴露，需从点名首页右下角的齿轮图标（⚙）进入。

## 快速开始（本地开发）

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

访问 `http://localhost:3000`（本地开发无 Nginx，直接用 3000 端口）

---

## 部署方案一：宝塔面板（推荐）

### 1. 安装 Node.js

宝塔面板 → **软件商店** → 搜索 **Node.js版本管理器** → 安装 → 安装 **Node.js 22.x** 或更高版本。

### 2. 上传代码

在宝塔文件管理中创建目录：

```
/www/wwwroot/vote-system/
```

上传项目文件（`node_modules`、`data`、`.git` 不用传）。

或用 Git 拉取：

```bash
cd /www/wwwroot/
git clone https://你的仓库地址.git vote-system
```

### 3. 安装依赖并启动

```bash
cd /www/wwwroot/vote-system
npm install --production
npm install -g pm2
pm2 start server.js --name vote-system
pm2 save
pm2 startup
```

### 4. 配置 Nginx 反向代理

宝塔面板 → **网站** → **添加站点**（填域名或 IP，PHP 选纯静态）→ 站点设置 → **反向代理** → 添加：

- 代理名称：`vote`
- 目标URL：`http://127.0.0.1:3000`

然后点 **配置文件**，替换为：

```nginx
server {
    listen 7070;
    listen [::]:7070;
    server_name 你的域名或IP;

    #WEBSOCKET-SUPPORT START
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    #WEBSOCKET-SUPPORT END

    location ^~ / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }

    # 禁止访问敏感文件和目录
    location ~* /(\.git|\.svn|node_modules|data)/ {
        return 404;
    }

    access_log /www/wwwlogs/vote-system.log;
    error_log /www/wwwlogs/vote-system.error.log;
}
```

> **说明**：Nginx 对外监听 **7070** 端口，Node.js 内部跑 **3000** 端口（不对外暴露），Nginx 负责转发请求和 WebSocket 支持。

### 5. 访问

| 页面 | 地址 |
|------|------|
| 点名首页 | `http://你的域名:7070/` |
| 投票页面 | `http://你的域名:7070/vote.html` |
| 大屏展示 | `http://你的域名:7070/screen.html` |
| 后台管理 | `http://你的域名:7070/admin.html` |

---

## 部署方案二：Docker

### 1. 准备环境

确保服务器已安装 Docker 和 Docker Compose。

### 2. 上传代码

```bash
git clone <仓库地址>
cd toupiao
```

### 3. 一键部署

```bash
chmod +x deploy.sh
./deploy.sh
```

或手动执行：

```bash
docker compose up -d
```

### 4. 验证服务

```bash
docker compose ps       # 查看容器状态
docker compose logs -f  # 查看日志
```

### 5. 配置域名（可选）

修改 `nginx.conf` 中的 `server_name`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 改为你的域名
    ...
}
```

重新部署：

```bash
docker compose down
docker compose up -d
```

---

## 代码更新方案

### 方案 A：Git 更新（推荐）

SSH 进入服务器执行：

```bash
cd /www/wwwroot/vote-system
git pull origin master
npm install --production
pm2 restart vote-system
```

**一键更新脚本**：在服务器创建 `update.sh`：

```bash
#!/bin/bash
cd /www/wwwroot/vote-system
echo ">>> 拉取最新代码..."
git pull origin master
echo ">>> 安装依赖..."
npm install --production
echo ">>> 重启服务..."
pm2 restart vote-system
echo ">>> 更新完成！"
```

以后更新只需：

```bash
bash /www/wwwroot/vote-system/update.sh
```

### 方案 B：手动上传更新

1. 本地改好代码
2. 用宝塔文件管理器或 SFTP 上传修改过的文件到 `/www/wwwroot/vote-system/`
3. SSH 重启服务：`pm2 restart vote-system`

### 方案 C：Docker 更新

```bash
cd /www/wwwroot/vote-system
git pull origin master
docker compose down
docker compose up -d --build
```

> ⚠️ **注意**：更新代码时不要覆盖 `data/vote.db` 和 `public/uploads/`，否则投票数据和上传的图片会丢失。

---

## 使用流程

1. 访问首页 `/`，使用点名功能
2. 首页右下角点击 ⚙ 进入后台管理
3. 在后台创建活动 → 添加候选组 → 开始投票
4. 生成二维码，扫码投票
5. 大屏 `/screen.html` 实时展示投票结果

## PM2 常用命令

```bash
pm2 list              # 查看所有进程状态
pm2 logs vote-system  # 查看日志
pm2 restart vote-system  # 重启
pm2 stop vote-system     # 停止
pm2 delete vote-system   # 删除进程
```

## 项目结构

```
├── server.js            # 服务端入口
├── database.js          # 数据库初始化（使用 Node.js 内置 node:sqlite）
├── package.json         # 项目依赖
├── Dockerfile           # Docker 镜像配置
├── docker-compose.yml   # Docker Compose 编排
├── nginx.conf           # Nginx 反向代理配置
├── deploy.sh            # 一键部署脚本
├── update.sh            # 一键更新脚本
├── routes/
│   ├── api.js           # 公开 API（投票、结果等）
│   └── admin.js         # 管理 API（活动、候选组管理）
├── public/
│   ├── index.html       # 首页（点名加分）
│   ├── vote.html        # 投票页面
│   ├── screen.html      # 大屏展示
│   ├── admin.html       # 后台管理
│   ├── uploads/         # 上传的图片
│   └── css/
│       └── common.css   # 公共样式
└── data/
    └── vote.db          # SQLite 数据库
```

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/activity` | 获取当前活动及候选组 |
| POST | `/api/vote` | 提交投票 |
| GET | `/api/vote/check/:activityId/:uuid` | 检查投票状态 |
| GET | `/api/results/:activityId` | 获取投票结果 |
| GET | `/api/leaderboard/:activityId` | 获取排行榜 |
| GET | `/api/qrcode/:activityId` | 获取投票链接 |

### 管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/activities` | 获取活动列表 |
| POST | `/admin/activity` | 创建活动 |
| PUT | `/admin/activity/:id` | 更新活动 |
| DELETE | `/admin/activity/:id` | 删除活动 |
| PUT | `/admin/activity/:id/status` | 更新活动状态 |
| GET | `/admin/activity/:id/groups` | 获取候选组列表 |
| POST | `/admin/activity/:id/group` | 添加候选组 |
| PUT | `/admin/group/:id` | 更新候选组 |
| DELETE | `/admin/group/:id` | 删除候选组 |
| POST | `/admin/group/:id/image` | 上传组别图片 |
| DELETE | `/admin/activity/:id/votes` | 清空投票数据 |
| GET | `/admin/activity/:id/export` | 导出投票数据 |
| GET | `/admin/stats` | 获取统计数据 |

## License

MIT
