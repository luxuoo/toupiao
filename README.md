# 小组抽签加分 & 投票系统

支持随机点名加分、手机扫码投票、大屏实时展示、后台管理的一体化系统。适用于课堂互动、会议评选、活动投票等场景。

## 功能特性

- **随机点名** - 首页支持小组随机点名、+1 加分、排行榜
- **扫码投票** - 手机扫码即可投票，适配各种移动设备
- **大屏展示** - 实时投票结果、排行榜、柱状图、投票二维码
- **后台管理** - 活动管理、候选组管理、投票控制、数据导出
- **防刷票** - UUID + IP 双重验证
- **实时推送** - Socket.IO 实时数据更新，投票后大屏即时刷新

## 实现原理

### 系统架构

```
+------------------+     +------------------+     +------------------+
|   讲师电脑       |     |   大屏投影        |     |   观众手机        |
|   index.html     |     |   screen.html    |     |   vote.html      |
|   (点名/后台入口) |     |   (实时结果+二维码)|     |   (扫码投票)      |
+--------+---------+     +--------+---------+     +--------+---------+
         |                         |                         |
         +------------+------------+------------+------------+
                      |                         |
                +-----v-----+            +-----v-----+
                |   Nginx   |            | Socket.IO |
                |  :7070    |            |  WebSocket|
                +-----+-----+            +-----+-----+
                      |                         |
                +-----v-------------------------v-----+
                |          Node.js + Express           |
                |            :3000 (内部)              |
                +-----+-------------------------+-----+
                      |                         |
                +-----v-----+            +-----v-----+
                |   SQLite  |            |  静态文件  |
                |  vote.db  |            |  public/  |
                +-----------+            +-----------+
```

### 工作流程

```
1. 讲师打开首页 (index.html)
   └── 点击「投票大屏入口」→ 新窗口打开大屏 (screen.html)

2. 讲师进入后台管理 (首页右下角隐藏齿轮入口)
   ├── 创建投票活动
   ├── 添加候选组（组名、描述、图片）
   └── 点击「开始投票」

3. 大屏 (screen.html) 投影给观众看
   ├── 实时显示排行榜和柱状图
   ├── 右下角显示投票二维码
   └── 顶部显示投票控制按钮（开始/暂停/结束）

4. 观众手机扫码
   └── 打开投票页面 (vote.html)
       ├── 查看候选组列表
       └── 点击「投票」提交

5. 投票数据实时推送
   └── 所有连接的客户端即时更新（大屏、其他手机）
```

### 核心技术说明

**前后端通信**

- 页面加载时通过 HTTP RESTful API 获取活动数据和投票结果
- 投票提交后，服务端通过 Socket.IO 广播 `voteUpdate` 事件，所有在线客户端即时刷新
- 活动状态变更（开始/暂停/结束）通过 `statusChange` 事件推送

**防刷票机制**

- 浏览器首次访问时生成 UUID，存入 localStorage，后续投票携带此标识
- 服务端记录每次投票的 UUID + IP + User-Agent
- 同一 UUID 对同一活动只能投一次

**二维码生成**

- 二维码 URL 由浏览器端根据当前域名和端口直接生成（`location.protocol + location.host`）
- 不依赖服务端生成 URL，确保在任何部署环境下都指向正确的地址

**数据库**

- 使用 Node.js 内置的 `node:sqlite` 模块（需 Node.js >= 22.5）
- 无需安装任何原生依赖，开箱即用
- 数据库文件存储在 `data/vote.db`，支持 WAL 模式提升并发读性能

**大屏实时更新**

- 大屏页面通过 Socket.IO 保持长连接
- 每次有新投票时，服务端推送完整的投票结果数据
- 大屏接收后即时更新排行榜顺序、柱状图、投票数
- 排名变化时显示升降箭头，票数更新时卡片闪烁提示

## 技术栈

- **前端**: HTML + CSS + JavaScript + Chart.js（图表）+ QRCode.js（二维码）+ Socket.IO Client
- **后端**: Node.js + Express + Socket.IO
- **数据库**: SQLite（Node.js 内置 `node:sqlite` 模块）
- **反向代理**: Nginx（WebSocket 支持）
- **进程管理**: PM2
- **部署**: 宝塔面板 / Docker

## 环境要求

- **Node.js >= 22.5**（需要内置的 `node:sqlite` 模块）

## 页面说明

| 页面 | 地址 | 说明 |
|------|------|------|
| 点名首页 | `/` | 随机点名加分，右下角隐藏齿轮进入后台，「投票大屏入口」打开大屏 |
| 投票页面 | `/vote.html` | 手机端投票页面，通过大屏二维码扫码进入 |
| 大屏展示 | `/screen.html` | 投影大屏：实时排行榜 + 柱状图 + 投票二维码 + 投票控制 |
| 后台管理 | `/admin.html` | 活动管理、候选组管理、投票控制、数据导出 |

> 后台管理入口不直接暴露，需从点名首页右下角的齿轮图标进入。

## 使用流程

1. 打开首页 `/`，点击「投票大屏入口」打开大屏页面，投影到大屏幕
2. 首页右下角点击齿轮进入后台管理
3. 在后台创建投票活动，添加候选组（组名、描述，可选上传图片）
4. 在后台或大屏顶部点击「开始投票」
5. 观众用手机扫描大屏右下角的二维码，进入投票页面投票
6. 大屏实时显示投票结果，投票结束后可在后台导出数据

---

## 快速开始（本地开发）

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

访问 `http://localhost:3000`

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

    #WebSocket 支持
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

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
    listen 7070;
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

## 代码更新

### 方案 A：Git 更新（推荐）

SSH 进入服务器执行：

```bash
cd /www/wwwroot/vote-system
git pull origin master
npm install --production
pm2 restart vote-system
```

**一键更新脚本**（项目自带 `update.sh`）：

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

> **注意**：更新代码时不要覆盖 `data/vote.db` 和 `public/uploads/`，否则投票数据和上传的图片会丢失。

---

## PM2 常用命令

```bash
pm2 list                 # 查看所有进程状态
pm2 logs vote-system     # 查看日志
pm2 restart vote-system  # 重启
pm2 stop vote-system     # 停止
pm2 delete vote-system   # 删除进程
```

## 项目结构

```
├── server.js            # 服务端入口，Express + Socket.IO 初始化
├── database.js          # 数据库初始化，SQLite 建表和默认数据
├── package.json         # 项目依赖
├── Dockerfile           # Docker 镜像配置
├── docker-compose.yml   # Docker Compose 编排（Nginx + Node.js）
├── nginx.conf           # Nginx 反向代理配置（WebSocket 支持）
├── deploy.sh            # 一键部署脚本
├── update.sh            # 一键更新脚本
├── routes/
│   ├── api.js           # 公开 API：投票、结果查询、排行榜
│   └── admin.js         # 管理 API：活动/候选组 CRUD、投票控制
├── public/
│   ├── index.html       # 点名首页：随机点名、加分、排行榜
│   ├── vote.html        # 投票页面：手机端投票界面
│   ├── screen.html      # 大屏展示：实时结果、图表、二维码、投票控制
│   ├── admin.html       # 后台管理：活动管理、投票控制、数据导出
│   ├── lib/             # 第三方 JS 库（Chart.js、QRCode.js）
│   ├── uploads/         # 上传的候选组图片
│   └── css/
│       └── common.css   # 公共样式重置
└── data/
    └── vote.db          # SQLite 数据库文件
```

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `activities` | 投票活动：名称、描述、状态（pending/voting/paused/ended） |
| `groups` | 候选组：所属活动、组名、描述、图片、排序 |
| `votes` | 投票记录：活动、候选组、投票者 UUID、IP、时间 |
| `admins` | 管理员账号：用户名、密码（bcrypt 加密） |
| `config` | 系统配置：键值对存储 |
| `access_logs` | 访问日志：页面、IP、时间 |

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/activity` | 获取当前活动及候选组 |
| POST | `/api/vote` | 提交投票 |
| GET | `/api/vote/check/:activityId/:uuid` | 检查投票状态 |
| GET | `/api/results/:activityId` | 获取投票结果 |
| GET | `/api/leaderboard/:activityId` | 获取排行榜 |

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
