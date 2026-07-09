# Flow State 测试用例文档

> 版本：2026-07-08  
> 项目：`~/Desktop/xinliu`  
> 运行方式：`./test.sh`（或 `npm test`）

---

## 1. 测试体系概览

| 层级 | 文件 | 用例数 | 工具 | 目的 |
|------|------|--------|------|------|
| 单元测试 | `tests/unit/flow-tasks.test.js` | 11 | Node.js 内置 `node:test` | 待办归档、日期逻辑 |
| 单元测试 | `tests/unit/flow-timer.test.js` | 6 | Node.js 内置 `node:test` | 计时器、缩放逻辑 |
| 静态检查 | `tests/static/check-html.js` | 24 | Node.js 脚本 | DOM / 脚本 / 桥接完整性 |
| E2E 冒烟 | `tests/e2e/smoke.spec.js` | 10 | Playwright + Chromium | 浏览器真实交互 |
| 构建验证 | `tests/build/verify-swift.sh` | 1 | `swiftc` | 原生壳编译通过 |
| **合计** | | **52** | | |

执行顺序（`test.sh`）：

```
单元测试 → 静态检查 → E2E 冒烟 → Swift 编译验证
```

---

## 2. 单元测试 — 待办逻辑（`flow-tasks.test.js`）

被测模块：`lib/flow-tasks.js`

| # | 用例组 | 用例名 | 输入 / 前置条件 | 期望结果 |
|---|--------|--------|-----------------|----------|
| 1 | `getLocalDateStr` | 按本地日期格式化 | `2026-07-08T12:00:00` | 返回 `"2026-07-08"` |
| 2 | `escapeHtml` | 转义危险字符 | `<script>"'&</script>` | 全部 HTML 特殊字符被转义 |
| 3 | `formatRelativeDate` | 今天 / 昨天 / 同年 / 跨年 | 参考日 `2026-07-08` | 今天→`今天`；昨天→`昨天`；`2026-03-15`→`3月15日`；`2025-12-01`→`2025年12月1日` |
| 4 | `shouldArchiveCompletedTask` | 未完成不归档 | `completed: false` | `false` |
| 5 | `shouldArchiveCompletedTask` | 今日完成不归档 | 今日完成 | `false` |
| 6 | `shouldArchiveCompletedTask` | 往日完成应归档 | 昨日完成 | `true` |
| 7 | `partitionTasksForArchive` | 分离今日完成与往日完成、保留未完成 | 3 条混合任务 | 归档 1 条（昨日完成）；保留 2 条（今日完成 + 未完成） |
| 8 | `restoreTodayCompletedFromHistory` | 把历史中今日完成项恢复到今日列表 | 历史含今日/昨日各 1 条 | 恢复 1 条到今日列表；历史保留 1 条 |
| 9 | `restoreTodayCompletedFromHistory` | 不重复恢复已存在的任务 | 今日列表已有同 id 任务 | `restored.length === 0` |
| 10 | `migrateTasksWithDates` | 为缺少 createdDate 的任务补日期 | 无 `createdDate` 的旧任务 | `changed === true`，补全日期 |
| 11 | `buildHistoryEntry` | 生成带归档时间戳的历史记录 | 已完成任务 | 含 `id`、`completedDate`、`archivedAt`（数字时间戳） |

---

## 3. 单元测试 — 计时器逻辑（`flow-timer.test.js`）

被测模块：`lib/flow-timer.js`

| # | 用例组 | 用例名 | 输入 | 期望结果 |
|---|--------|--------|------|----------|
| 1 | `clampZoom` | 限制在 70% ~ 130% | `0.5` / `1.0` / `2.0` | `0.7` / `1.0` / `1.3` |
| 2 | `formatTimeDisplay` | 格式化为 MM:SS | `1500` / `61` / `0` 秒 | `25:00` / `01:01` / `00:00` |
| 3 | `calcProgressOffset` | 满进度时 offset 为 0 | `timeLeft === totalTime` | `0` |
| 4 | `calcProgressOffset` | 过半时 offset 约为周长一半 | `750/1500`，周长 `100` | `50` |
| 5 | `calcProgressOffset` | 时间为 0 时 offset 等于周长 | `timeLeft = 0` | 等于周长 |
| 6 | `buildModes` | 按自定义专注时长生成模式 | `focusMinutes = 30` | 专注 `1800s`，短休 `300s`，长休 `900s` |

---

## 4. 静态检查（`check-html.js`）

不启动浏览器，直接扫描源码文件，共 **24 项**。

### 4.1 必需 DOM 元素（15 项）

| # | 元素 ID | 用途 |
|---|---------|------|
| 1 | `native-titlebar` | 原生标题栏拖拽区 |
| 2 | `widget-mini` | 桌面小组件 |
| 3 | `app-scale-root` | 界面缩放根节点 |
| 4 | `app-main` | 主内容区 |
| 5 | `timer-progress` | 大圆环进度 |
| 6 | `time-display` | 倒计时显示 |
| 7 | `btn-toggle` | 开始/暂停按钮 |
| 8 | `task-form` | 待办输入表单 |
| 9 | `task-list` | 待办列表 |
| 10 | `settings-modal` | 设置弹窗 |
| 11 | `history-modal` | 历史弹窗 |
| 12 | `history-tab-stats` | 历史-专注统计标签 |
| 13 | `history-tab-tasks` | 历史-已完成待办标签 |
| 14 | `history-panel-stats` | 专注统计面板 |
| 15 | `history-panel-tasks` | 已完成待办面板 |

### 4.2 脚本引用（2 项）

| # | 检查项 |
|---|--------|
| 1 | HTML 引用 `lib/flow-tasks.js` |
| 2 | HTML 引用 `lib/flow-timer.js` |

### 4.3 原生桥接关键字（3 项）

| # | 检查项 | 说明 |
|---|--------|------|
| 1 | `webkit.messageHandlers.flowState` | JS → Native 消息通道 |
| 2 | `applySystemTheme` | 暗黑模式注入 |
| 3 | `setWidgetCollapsed` | 小组件缩展状态 |

### 4.4 文件与 Swift 检查（4 项）

| # | 检查项 |
|---|--------|
| 1 | `lib/flow-tasks.js` 文件存在 |
| 2 | `lib/flow-timer.js` 文件存在 |
| 3 | `native/main.swift` 含 `flowState` 消息处理器 |
| 4 | `native/main.swift` 含 `applySystemTheme` 主题注入 |

---

## 5. E2E 冒烟测试（`smoke.spec.js`）

- **环境**：Playwright + Chromium，本地静态服务器 `tests/e2e/serve.js`（`http://127.0.0.1:4173`）
- **视口**：880 × 500
- **前置**：每个用例前清空 `localStorage` 并等待 `setWidgetCollapsed` 可用

| # | 用例名 | 操作步骤 | 断言 |
|---|--------|----------|------|
| 1 | 初始界面显示专注模式与空待办 | 打开页面 | 倒计时 `25:00`；状态 `准备开始`；待办 `0/0`；空状态可见；专注按钮高亮 |
| 2 | 可添加、完成并删除待办 | 输入待办回车 → 点完成圈 → 点删除 | 文本出现；计数 `0/1` → `1/1` → `0/0`；空状态恢复 |
| 3 | 可切换计时模式并显示对应时长 | 点短休 → 长休 → 专注 | 显示 `05:00` / `15:00` / `25:00`；短休状态 `休息一下` |
| 4 | 可开始与暂停计时 | 点开始 → 点暂停 | 暂停图标可见 + `正在专注...`；播放图标可见 + `已暂停` |
| 5 | 重置按钮恢复当前模式默认时长 | 切短休 → 开始计时 1s → 点重置 | 时间回到 `05:00`；状态 `休息一下` |
| 6 | 设置弹窗可修改专注时长 | 打开设置 → 改 30 分钟 → 保存 | 弹窗关闭；倒计时变为 `30:00` |
| 7 | 历史弹窗可切换专注统计与已完成待办 | 打开历史 → 切已完成 → 切回统计 | 两个面板正确显隐 |
| 8 | 小组件缩回态可展开并同步迷你倒计时 | `setWidgetCollapsed(true)` → `false` | body 有/无 `widget-collapsed`；迷你倒计时同步 `25:00` |
| 9 | **选中为专注目标后仍可点击完成** | 添加待办 → 点击选中 → 点完成圈 | 左侧显示任务名；完成后计数 `1/1`；专注文本恢复 `未选择任务 (自由专注)` |
| 10 | 界面缩放滑块更新百分比标签 | 打开设置 → 滑块调到 110% | 标签显示 `110%` |

> 用例 9 覆盖 bug：选中专注任务后点完成不生效（`setActiveTask(null)` 抛错导致 `saveTasks` 未执行）。

---

## 6. 构建验证（`verify-swift.sh`）

| # | 用例名 | 操作 | 断言 |
|---|--------|------|------|
| 1 | Swift 编译通过 | `swiftc` 编译 `native/main.swift` 到临时目录 | 产物可执行；架构为 `arm64`；不写入桌面 App |

---

## 7. 当前未覆盖范围（已知缺口）

供 review 时参考，以下场景**尚未**纳入自动化：

| 场景 | 原因 / 建议 |
|------|-------------|
| 原生窗口缩展、拖拽、红绿灯关闭 | 需 WKWebView 环境，Playwright 无法模拟 |
| 暗黑模式跟随系统 | 需 mock `AppleInterfaceThemeChangedNotification` |
| 跨天待办归档（真实日期推进） | 可用 `Date` mock 补充单元测试 |
| 番茄钟倒计时归零、通知弹出 | 需 fake timer 或长时间等待 |
| 专注完成后的统计数据累加 | 可补充 E2E：模拟计时结束 |
| 历史弹窗数据渲染（有数据时） | 可补充带 localStorage fixture 的 E2E |
| `build.sh` 完整构建 + App 包结构 | 可补充集成脚本检查 `.app` 资源 |

---

## 8. 文件索引

```
xinliu/
├── test.sh                          # 一键运行全部测试
├── playwright.config.js             # Playwright 配置
├── package.json                     # npm test / test:e2e
├── lib/
│   ├── flow-tasks.js                # 待办纯逻辑（单元测试 + 页面共用）
│   └── flow-timer.js                # 计时器纯逻辑
└── tests/
    ├── unit/
    │   ├── flow-tasks.test.js       # 11 用例
    │   └── flow-timer.test.js       # 6 用例
    ├── static/
    │   └── check-html.js            # 24 项检查
    ├── e2e/
    │   ├── serve.js                 # 本地静态服务器
    │   └── smoke.spec.js            # 10 用例
    └── build/
        └── verify-swift.sh          # 1 项编译验证
```

---

## 9. 快速命令

```bash
# 全部测试
./test.sh

# 仅单元测试
node --test tests/unit/*.test.js

# 仅 E2E
npm run test:e2e

# 单条 E2E（示例）
npx playwright test -g "选中为专注目标"
```
