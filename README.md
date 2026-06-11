# 小组抽签加分 & 投票系统

支持随机点名加分、手机扫码投票、大屏实时展示、后台管理的一体化系统。

## 功能特性

- 🎯 **随机点名** - 首页支持小组随机点名、+1 加分、排行榜
- 🗳️ **扫码投票** - 手机扫码即可投票，适配各种移动设备
- 🖥️ **大屏展示** - 实时投票结果、排行榜、柱状图、饼图
- ⚙️ **后台管理** - 活动管理、候选组管理、投票控制、数据导出（入口隐藏在投票页右下角）
- 🔒 **防刷票** - UUID + IP 双重验证
- ⚡ **实时推送** - Socket.IO 实时数据更新
- 🐳 **一键部署** - Docker + Nginx，提供部署脚本

## 技术栈

- **前端**: HTML + CSS + JavaScript + Chart.js + Socket.IO Client
- **后端**: Node.js + Express + Socket.IO
- **数据库**: SQLite
- **部署**: Docker + Nginx

## 页面说明

| 页面 | 地址 | 说明 |
|------|------|------|
| 首页（点名） | `/` | 随机点名加分，点击「进入投票」跳转 |
| 投票页面 | `/vote.html` | 手机扫码投票，右下角 ⚙ 隐藏入口进入后台 |
| 大屏展示 | `/screen.html` | 实时投票结果大屏，按 F 全屏 |
| 后台管理 | `/admin.html` | 活动/候选组/投票控制管理（无密码，通过隐藏入口访问） |

> 后台管理入口不直接暴露，需从投票页面右下角的齿轮图标（⚙）进入。

## 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 克隆代码
git clone <仓库地址>
cd toupiao

# 2. 一键部署
chmod +x deploy.sh
./deploy.sh
```

部署完成后访问 `http://你的服务器IP`。

如需配置域名，修改 `nginx.conf` 中的 `server_name`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 改为你的域名
    ...
}
```

然后重新部署：

```bash
docker compose down
docker compose up -d
```

### 方式二：直接运行

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

访问 `http://localhost:3000`

## 服务器部署步骤

### 1. 准备环境

确保服务器已安装：
- Docker
- Docker Compose

### 2. 上传代码

```bash
# 方式 A：Git 拉取
git clone <仓库地址>
cd toupiao

# 方式 B：直接上传项目文件夹到服务器
```

### 3. 部署启动

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
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 5. 访问系统

- 首页：`http://服务器IP/`
- 投票：`http://服务器IP/vote.html`
- 大屏：`http://服务器IP/screen.html`
- 后台：从投票页右下角 ⚙ 进入

## 使用流程

1. 访问首页 `/`，使用点名功能
2. 点击「进入投票」跳转到投票页面
3. 投票页右下角点击 ⚙ 进入后台管理
4. 在后台创建活动 → 添加候选组 → 开始投票
5. 生成二维码，扫码投票
6. 大屏 `/screen.html` 实时展示投票结果

## 项目结构

```
├── server.js            # 服务端入口
├── database.js          # 数据库初始化
├── package.json         # 项目依赖
├── Dockerfile           # Docker 镜像配置
├── docker-compose.yml   # Docker Compose 编排
├── nginx.conf           # Nginx 反向代理配置
├── deploy.sh            # 一键部署脚本
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
