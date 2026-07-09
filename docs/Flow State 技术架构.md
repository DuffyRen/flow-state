# Flow State 番茄钟 — 技术架构文档

> 文档版本：2026-07-08  
> 项目路径：`~/Desktop/xinliu`  
> 运行产物：`~/Desktop/Flow State.app`

---

## 1. 架构总览

采用 **「原生壳 + Web 业务层」** 混合架构：

```
┌─────────────────────────────────────────────────────────┐
│                    macOS 系统层                          │
│  NSApplication → NSWindow → WKWebView                   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              原生层 (native/main.swift)                   │
│  • 窗口状态机（展开 / 缩回）                              │
│  • 小组件拖拽事件监听                                     │
│  • 系统深浅色外观同步                                     │
│  • WKScriptMessageHandler 桥接                           │
└──────────────────────────┬──────────────────────────────┘
                           │ postMessage / evaluateJS
┌──────────────────────────▼──────────────────────────────┐
│           业务层 (code_artifact.html)                      │
│  • UI 渲染（Tailwind + 内联 CSS/JS）                       │
│  • 番茄钟引擎 / 待办管理 / 专注统计                        │
│  • localStorage 本地持久化                                 │
└─────────────────────────────────────────────────────────┘
```

| 维度 | 选型 | 说明 |
|------|------|------|
| 平台 | macOS 13+ (arm64) | 原生编译，无 Rosetta |
| 原生框架 | AppKit + WebKit | 单文件 Swift，无 Xcode 工程 |
| 业务 UI | 单页 HTML | 约 1500 行，CSS/JS 内联 |
| 样式 | Tailwind CDN + 自定义 CSS | 运行时从 CDN 加载 |
| 数据 | WebKit localStorage | 纯本地，无后端 |
| 分发 | `.app` Bundle | 构建到桌面 `Flow State.app` |

---

## 2. 项目结构

```
xinliu/
├── code_artifact.html      # 核心业务：番茄钟 + 待办 + 弹窗 + 全部 JS 逻辑
├── native/
│   ├── main.swift          # 原生窗口壳、桥接、小组件模式
│   └── Info.plist          # Bundle 元信息
├── assets/
│   └── app-icon.png        # 应用图标源图
├── docs/
│   └── Flow State 技术架构.md  # 本文档
├── build.sh                # 一键构建（主路径）
├── start.sh                # 命令行启动
├── mac.py                  # 遗留方案：pywebview（非主路径）
├── requirements.txt
└── README.md
```

**运行时 Bundle 结构：**

```
~/Desktop/Flow State.app/
├── Contents/
│   ├── Info.plist
│   ├── MacOS/FlowState          # swiftc 编译产物
│   └── Resources/
│       ├── code_artifact.html   # 从源码同步
│       ├── AppIcon.icns
│       └── app-icon.png
```

---

## 3. 构建与发布流程

```
开发者 → ./build.sh
    ├── 同步 Info.plist
    ├── 复制 code_artifact.html → App Resources
    ├── sips + iconutil 生成 AppIcon.icns
    └── swiftc -O -target arm64-apple-macos13.0
        → ~/Desktop/Flow State.app
```

| 步骤 | 动作 | 输出 |
|------|------|------|
| 同步配置 | `cp native/Info.plist` | Bundle 元数据 |
| 同步页面 | `cp code_artifact.html` | Web 业务资源 |
| 生成图标 | `sips` + `iconutil` | `AppIcon.icns` |
| 编译原生 | `swiftc` + AppKit + WebKit | `FlowState` 可执行文件 |

**特点：** 无 Xcode 工程、无 npm、无 CI；改 HTML 或 Swift 后执行 `./build.sh` 即可。

---

## 4. 原生层架构（native/main.swift）

### 4.1 核心类与职责

```
FlowStateApp
├── NSApplicationDelegate    应用生命周期
├── WKNavigationDelegate     页面加载完成回调
├── WKScriptMessageHandler   JS → Native 消息
└── NSWindowDelegate         窗口关闭、移动
```

### 4.2 窗口状态机

应用存在两种互斥窗口态：

**展开态 (Expanded)**
- `styleMask`: titled + closable + miniaturizable + resizable + fullSizeContentView
- 默认尺寸：788 × 470
- 透明标题栏融合、可拖拽移动
- 红绿灯关闭 = 退出应用

**缩回态 (Collapsed)**
- `styleMask`: borderless
- 固定尺寸：72 × 72
- 透明背景、原生 NSEvent 拖拽
- 单击展开、右键菜单（展开/退出）

### 4.3 窗口尺寸设计稿

| 参数 | 值 | 含义 |
|------|-----|------|
| 设计画布 | 880 × 500 px | `#app-scale-root` 逻辑尺寸 |
| 内容区宽度 | 760 px | 缩放基准 |
| 水平边距 | 14 px × 2 | 左右留白 |
| 标题栏高度 | 28 px | 原生拖拽区（左留 78px 给红绿灯） |
| 底部边距 | 10 px | 底部留白 |
| **展开默认** | **788 × 470** | 760 内容 + 边距 + 标题栏 |
| **缩回尺寸** | **72 × 72** | 桌面小组件 |

### 4.4 持久化（原生 UserDefaults）

| Key | 存储内容 | 说明 |
|-----|----------|------|
| `FlowStateCollapsedFrame` | 小组件窗口坐标 | 记住缩回位置 |
| ~~`FlowStateExpandedFrame`~~ | 已移除 | 每次展开默认居中 788×470 |

### 4.5 JS ↔ Native 桥接

**通道名：** `flowState`（`WKUserContentController`）

| 方向 | 机制 | 用途 |
|------|------|------|
| Web → Native | `webkit.messageHandlers.flowState.postMessage({ action })` | 缩展、退出 |
| Native → Web | `webView.evaluateJavaScript(...)` | 注入类、同步主题、切换缩回态 |

**Action 协议：**

| action | Native 行为 |
|--------|-------------|
| `collapse` | 切换为 72×72 无边框小组件 |
| `expand` | 恢复展开窗口 |
| `toggle` | 切换两种状态 |
| `quit` | 退出应用 |

**Native → Web 回调：**

| 函数 | 触发时机 |
|------|----------|
| `setWidgetCollapsed(bool)` | 缩展状态变化 |
| `applySystemTheme(bool)` | 系统深浅色切换 |

### 4.6 小组件模式交互（原生 NSEvent 监听）

| 操作 | 行为 |
|------|------|
| 左键拖拽 | 移动窗口，持久化位置 |
| 左键单击 | 展开面板 |
| 右键 | 弹出菜单：展开 / 退出 |

### 4.7 暗黑模式同步

```
系统外观变化 (AppleInterfaceThemeChangedNotification)
    → syncWindowAppearance()
        → 更新 NSWindow.backgroundColor
        → syncWebAppearance() → applySystemTheme(isDark)
```

- `Info.plist` 中 `NSRequiresAquaSystemAppearance = false`，允许跟随系统
- 缩回态强制透明背景，避免黑框

---

## 5. Web 业务层架构（code_artifact.html）

### 5.1 UI 层级结构

```
<body>
├── #native-titlebar          原生标题栏拖拽区（28px）
├── #widget-mini              缩回态小组件（72×72 内容）
└── #app-viewport             展开态视口
    └── #app-scale-root       设计画布 880×500，CSS transform 等比缩放
        ├── #app-main         主界面（左 32% 番茄钟 + 右 68% 待办）
        ├── #settings-modal   设置弹窗（absolute，随画布缩放）
        └── #history-modal    历史弹窗（absolute，随画布缩放）
```

### 5.2 响应式缩放机制

```javascript
finalScale = Math.min(availableWidth / 880, availableHeight / 500) × userZoom
scaleRoot.style.transform = `scale(${finalScale})`
```

| 因素 | 处理 |
|------|------|
| 窗口 resize | `resize` 事件触发 `applyViewportScale()` |
| 用户缩放 | 设置中 70%~130%，存 `flowUiZoom` |
| 原生边距 | 扣除 titlebar 28px、左右 14px、底部 10px |
| 快捷键 | `⌘+` / `⌘-` / `⌘0` / `⌘M` |

### 5.3 窗口拖拽（展开态）

通过 `-webkit-app-region` 实现：

| 区域 | drag / no-drag |
|------|----------------|
| `#native-titlebar`、`.window-drag` | drag |
| 按钮、输入框、任务列表、弹窗 | no-drag |

### 5.4 功能模块

| 模块 | 功能 |
|------|------|
| 番茄钟 | 专注/短休/长休、SVG 圆环进度、系统通知 |
| 待办 | 今日列表、跨天归档、历史已完成 |
| 统计 | 今日分钟/次数、周/月/年汇总 |
| 设置 | 专注时长、界面缩放 |

### 5.5 待办数据生命周期

| 状态 | 今日列表 | 历史记录 |
|------|---------|---------|
| 今天完成 | ✅ 保留（带删除线） | ❌ |
| 今天未完成 | ✅ 保留 | ❌ |
| 往日未完成 | ✅ 保留（带日期标签） | ❌ |
| 往日已完成 | ❌ | ✅ 自动归档 |

**归档时机：** 应用启动时检测日期变化，执行 `rolloverTasksIfNeeded()`。

---

## 6. 数据层设计

### 6.1 localStorage 键表

| Key | 类型 | 内容 |
|-----|------|------|
| `flowTasksClean` | `Task[]` | 当前活跃待办 |
| `flowTaskHistory` | `HistoryEntry[]` | 已完成历史 |
| `flowTasksLastDate` | `string` | 上次打开日期（跨天归档） |
| `flowAllStats` | `{ [date]: Stats }` | 每日专注统计 |
| `flowCustomFocusTime` | `number` | 自定义专注分钟数 |
| `flowUiZoom` | `number` | 界面缩放比例 |
| `flowTasksHistoryMigratedV1` | flag | 一次性迁移标记 |

### 6.2 数据结构

```typescript
interface Task {
  id: string
  text: string
  completed: boolean
  createdDate: string      // YYYY-MM-DD
  completedDate?: string
}

interface HistoryEntry {
  id: string
  text: string
  createdDate: string
  completedDate: string
  archivedAt: number
}

interface DailyStats {
  focusMinutes: number
  focusCount: number
}
```

### 6.3 存储特点与风险

| 优点 | 风险 |
|------|------|
| 零后端、零配置 | 清除 WebKit 数据会丢失 |
| 实现简单 | 无跨设备同步 |
| WebKit 沙箱隔离 | 无结构化查询/备份机制 |
| | 单文件 HTML，数据逻辑与 UI 耦合 |

---

## 7. 外部依赖

| 依赖 | 来源 | 影响 |
|------|------|------|
| Tailwind CSS | `cdn.tailwindcss.com` | **需联网**首次加载样式 |
| Inter 字体 | Google Fonts CDN | **需联网**加载字体 |
| AppKit / WebKit | macOS 系统框架 | 离线可用 |

---

## 8. 遗留 / 备选方案

| 方案 | 文件 | 状态 |
|------|------|------|
| **主方案** | Swift + WKWebView | ✅ 当前使用 |
| 备选 1 | `mac.py` (pywebview) | 遗留，有 Rosetta 兼容问题 |
| 备选 2 | Chrome 直接打开 HTML | 早期验证用 |

---

## 9. 关键技术决策

| 决策 | 理由 | 代价 |
|------|------|------|
| 单 HTML 文件承载全部业务 | 快速迭代、构建简单 | 可维护性下降 |
| WKWebView 而非 SwiftUI | UI 已由 Web 实现，壳极薄 | 原生感依赖 CSS 调优 |
| localStorage 而非 Core Data | 零迁移成本 | 数据能力弱 |
| 设计稿 + CSS scale 缩放 | 一套 UI 适配多窗口尺寸 | 弹窗需放在 scale 容器内 |
| 小组件拖拽用 NSEvent | WKWebView 缩回态难处理鼠标 | 原生代码增加 |
| 跟随系统暗黑模式 | 用户体验一致 | 大量 CSS override |

---

## 10. 已知限制

1. **单文件巨石**：`code_artifact.html` 约 1500 行，CSS/JS/HTML 未拆分
2. **CDN 依赖**：Tailwind、Google Fonts 需网络
3. **无自动化测试**：计时器、归档逻辑、桥接协议均无测试
4. **无数据导出/备份**：localStorage 无 UI 导出
5. **仅 arm64**：`build.sh` 硬编码 `-target arm64-apple-macos13.0`
6. **展开窗口位置**：不记忆上次位置，每次展开居中/靠近小组件
7. **关闭按钮**：红绿灯关闭 = 退出应用

---

## 11. 建议演进路线

**P0 稳定性**
- 拆分 HTML → CSS/JS 模块
- Tailwind 本地化构建
- 数据备份/导出

**P1 工程化**
- Xcode 工程 / Swift Package
- 单元测试（归档逻辑、计时器）
- Universal Binary (intel + arm)

**P2 产品化**
- iCloud / 文件同步
- Menu Bar 模式
- 系统通知 + 声音
- 开机自启 / 置顶开关

---

## 12. 一句话总结

**Flow State 是一个以 Swift + WKWebView 为壳、单页 HTML 为业务核心的 macOS 桌面番茄钟应用，通过原生窗口状态机实现「展开面板 / 桌面小组件」双模式，业务数据全部存于 WebKit localStorage，构建链路极简（`build.sh` → 桌面 `.app`），适合快速迭代，但工程化与数据层仍有较大提升空间。**
