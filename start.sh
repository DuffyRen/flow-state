#!/bin/bash
# Flow State 桌面番茄钟启动脚本（原生 Apple Silicon，无需 Rosetta）

APP_PATH="${FLOW_STATE_APP_PATH:-$(cd "$(dirname "$0")" && pwd)/dist/Flow State.app}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
NATIVE_BIN="$APP_PATH/Contents/MacOS/FlowState"
SOURCE_SWIFT="$PROJECT_DIR/native/main.swift"

rebuild_native_app() {
    "$PROJECT_DIR/build.sh"
}

if [ ! -x "$NATIVE_BIN" ]; then
    rebuild_native_app || true
fi

if [ -x "$NATIVE_BIN" ]; then
    exec "$NATIVE_BIN"
fi

# 兜底：用系统自带 Safari 打开，不依赖 Rosetta
HTML_FILE="$PROJECT_DIR/code_artifact.html"
if [ -f "$HTML_FILE" ]; then
    open -a Safari "$HTML_FILE"
    exit 0
fi

osascript -e 'display alert "无法启动 Flow State" message "找不到原生程序或页面文件，请确认 Flow State.app 与 xinliu 文件夹在桌面。" as critical'
exit 1
