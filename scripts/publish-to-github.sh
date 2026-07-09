#!/bin/bash
# 首次发布到 GitHub：需先完成 gh 登录
#   gh auth login
# 然后执行：
#   ./scripts/publish-to-github.sh

set -euo pipefail

REPO_NAME="${GITHUB_REPO_NAME:-flow-state}"
VISIBILITY="${GITHUB_REPO_VISIBILITY:-public}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

if ! command -v gh >/dev/null 2>&1; then
    echo "未找到 GitHub CLI，请先安装：brew install gh"
    exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
    echo "请先登录 GitHub："
    echo "  gh auth login"
    exit 1
fi

GITHUB_USER="$(gh api user --jq .login)"
REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "→ 将创建仓库：${GITHUB_USER}/${REPO_NAME} (${VISIBILITY})"

if git remote get-url origin >/dev/null 2>&1; then
    echo "→ 已存在 origin 远程，跳过 gh repo create"
else
    gh repo create "$REPO_NAME" \
        --"${VISIBILITY}" \
        --source=. \
        --remote=origin \
        --description "轻量 macOS 桌面番茄钟 + 待办清单，支持桌面小组件" \
        --push
    echo "✓ 已创建并推送：${REMOTE_URL}"
    exit 0
fi

git push -u origin main
echo "✓ 已推送到：${REMOTE_URL}"
