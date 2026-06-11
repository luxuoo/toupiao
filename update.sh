#!/bin/bash
# 一键更新脚本 - 用于宝塔面板部署后更新代码

set -e

cd "$(dirname "$0")"

echo ">>> 拉取最新代码..."
git pull origin master

echo ">>> 安装依赖..."
npm install --production

echo ">>> 重启服务..."
pm2 restart vote-system

echo ">>> 更新完成！"
