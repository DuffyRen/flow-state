#!/bin/bash
# 可选：使用新版 Python 安装 pywebview 原生窗口（需要 Homebrew Python 等较新环境）
# 若安装失败，直接双击桌面「Flow State 番茄钟」即可，会自动用 Chrome 独立窗口打开。

set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
echo "安装完成。可运行 ./start.sh 或双击桌面 Flow State 番茄钟.app"
