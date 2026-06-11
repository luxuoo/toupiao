#!/bin/bash
# 投票系统一键部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

echo "=========================================="
echo "  投票系统部署脚本"
echo "=========================================="

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: 未安装Docker，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "错误: 未安装Docker Compose，请先安装Docker Compose"
    exit 1
fi

# 停止旧容器
echo "[1/4] 停止旧容器..."
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true

# 构建镜像
echo "[2/4] 构建Docker镜像..."
docker compose build --no-cache 2>/dev/null || docker-compose build --no-cache

# 启动服务
echo "[3/4] 启动服务..."
docker compose up -d 2>/dev/null || docker-compose up -d

# 等待服务启动
echo "[4/4] 等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo ""
echo "服务状态:"
docker compose ps 2>/dev/null || docker-compose ps
echo ""
echo "访问地址:"
echo "  首页(点名): http://localhost:7070/"
echo "  投票页面:   http://localhost:7070/vote.html"
echo "  大屏展示:   http://localhost:7070/screen.html"
echo "  后台管理:   http://localhost:7070/admin.html"
echo ""
echo "如需配置域名，请修改 nginx.conf 中的 server_name"
echo "=========================================="
