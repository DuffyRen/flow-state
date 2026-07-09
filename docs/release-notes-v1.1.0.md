## Flow State v1.1.0

轻量 macOS 桌面番茄钟 + 待办清单，支持缩为桌面小组件。

A lightweight macOS Pomodoro timer with todos and a collapsible desktop widget.

### 下载 / Download

| 文件 | 说明 |
|------|------|
| **Flow-State-v1.1.0-macos-arm64.zip** | 解压后将 `Flow State.app` 拖入「应用程序」 |

**要求 / Requirements:** macOS 13+ · Apple Silicon (arm64)

> 首次打开若被 Gatekeeper 拦截：右键 App →「打开」→ 确认。
> If blocked by Gatekeeper: right-click the app → Open → confirm.

### 本版本亮点 / Highlights

- 墙钟计时，小组件模式下倒计时准确
- 深色模式跟随系统
- 待办可编辑，支持选中为专注目标
- 新应用图标
- 完整自动化测试与 CI

### 从源码构建 / Build from source

```bash
git clone https://github.com/DuffyRen/flow-state.git
cd flow-state
./build.sh
open "dist/Flow State.app"
```

完整更新日志见 [CHANGELOG.md](https://github.com/DuffyRen/flow-state/blob/main/CHANGELOG.md)。

See [README.en.md](https://github.com/DuffyRen/flow-state/blob/main/README.en.md) for English documentation.
