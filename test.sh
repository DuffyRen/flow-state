#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "══════════════════════════════════════"
echo " Flow State 自动化测试"
echo "══════════════════════════════════════"
echo ""

echo "→ [1/4] 单元测试"
node --test tests/unit/*.test.js
echo ""

echo "→ [2/4] 静态检查"
node tests/static/check-html.js
echo ""

echo "→ [3/4] E2E 冒烟测试"
if [ ! -d node_modules/@playwright/test ]; then
    echo "  安装 Playwright 依赖..."
    npm install --no-fund --no-audit
fi
npx playwright install chromium
npx playwright test
echo ""

echo "→ [4/4] 构建验证"
bash tests/build/verify-swift.sh
echo ""

echo "══════════════════════════════════════"
echo " ✓ 全部测试通过"
echo "══════════════════════════════════════"
