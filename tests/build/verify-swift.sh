#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="/tmp/flow-state-build-test-$$"
SOURCE="$PROJECT_DIR/native/main.swift"

echo "→ Swift 编译检查（不写入桌面 App）"
swiftc -O -target arm64-apple-macos13.0 \
    -o "$OUT" "$SOURCE" \
    -framework AppKit -framework WebKit

test -x "$OUT"
file "$OUT" | grep -q 'arm64'
rm -f "$OUT"
echo "✓ Swift 编译通过"
