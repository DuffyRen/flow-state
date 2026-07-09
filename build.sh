#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="${FLOW_STATE_APP_PATH:-$PROJECT_DIR/dist/Flow State.app}"
HTML_SRC="$PROJECT_DIR/code_artifact.html"
HTML_DST="$APP_PATH/Contents/Resources/code_artifact.html"
NATIVE_BIN="$APP_PATH/Contents/MacOS/FlowState"
SOURCE_SWIFT="$PROJECT_DIR/native/main.swift"
ICON_SRC="$PROJECT_DIR/assets/app-icon.png"
ICONSET="$PROJECT_DIR/assets/AppIcon.iconset"
ICNS_DST="$APP_PATH/Contents/Resources/AppIcon.icns"
INFO_SRC="$PROJECT_DIR/native/Info.plist"
INFO_DST="$APP_PATH/Contents/Info.plist"

echo "→ 同步 Info.plist"
cp "$INFO_SRC" "$INFO_DST"

echo "→ 同步页面到 App 资源目录"
mkdir -p "$(dirname "$APP_PATH")" "$APP_PATH/Contents/MacOS" "$APP_PATH/Contents/Resources" "$APP_PATH/Contents/Resources/lib"
cp "$HTML_SRC" "$HTML_DST"
cp -R "$PROJECT_DIR/lib/." "$APP_PATH/Contents/Resources/lib/"

if [ -f "$ICON_SRC" ]; then
    echo "→ 生成应用图标 AppIcon.icns"
    rm -rf "$ICONSET"
    mkdir -p "$ICONSET"
    sips -z 16 16     "$ICON_SRC" --out "$ICONSET/icon_16x16.png"      >/dev/null
    sips -z 32 32     "$ICON_SRC" --out "$ICONSET/icon_16x16@2x.png"   >/dev/null
    sips -z 32 32     "$ICON_SRC" --out "$ICONSET/icon_32x32.png"      >/dev/null
    sips -z 64 64     "$ICON_SRC" --out "$ICONSET/icon_32x32@2x.png"   >/dev/null
    sips -z 128 128   "$ICON_SRC" --out "$ICONSET/icon_128x128.png"    >/dev/null
    sips -z 256 256   "$ICON_SRC" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
    sips -z 256 256   "$ICON_SRC" --out "$ICONSET/icon_256x256.png"    >/dev/null
    sips -z 512 512   "$ICON_SRC" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
    sips -z 512 512   "$ICON_SRC" --out "$ICONSET/icon_512x512.png"    >/dev/null
    sips -z 1024 1024 "$ICON_SRC" --out "$ICONSET/icon_512x512@2x.png" >/dev/null
    iconutil -c icns "$ICONSET" -o "$ICNS_DST"
    cp "$ICON_SRC" "$APP_PATH/Contents/Resources/app-icon.png"
fi

echo "→ 编译原生桌面程序 (arm64)"
swiftc -O -target arm64-apple-macos13.0 \
    -o "$NATIVE_BIN" "$SOURCE_SWIFT" \
    -framework AppKit -framework WebKit
chmod +x "$NATIVE_BIN"

# 刷新 Finder 图标缓存
touch "$APP_PATH"

echo "✓ 构建完成：$APP_PATH"
echo "  双击桌面 Flow State.app 即可运行"
