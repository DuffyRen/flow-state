# Flow State — Pomodoro Timer

<p align="center">
  <img src="assets/app-icon.png" alt="Flow State App Icon" width="128" height="128">
</p>

<p align="center">
  A lightweight macOS Pomodoro timer with a built-in todo list and desktop widget.<br>
  Native Swift shell + web UI. All data stays on your Mac — no account required.
</p>

<p align="center">
  <a href="README.md">中文文档</a> ·
  <strong>macOS 13+ · Apple Silicon (arm64)</strong>
</p>

---

## Features

- **Pomodoro timer** — Focus, short break, and long break; customizable focus duration
- **Wall-clock timing** — Timestamp-based countdown; stays accurate in widget mode and when backgrounded
- **Today’s todos** — Add, complete, edit, and delete tasks; pin one as your current focus
- **Focus stats** — Daily minutes and session count; browse history
- **Desktop widget** — Collapse to a 72×72 floating mini window with countdown ring and todo progress
- **UI scaling** — Responsive window + 70%–130% zoom in settings (`⌘ +` / `⌘ -` / `⌘ 0`)
- **Dark mode** — Follows macOS system appearance
- **Local-only storage** — Tasks and stats live in WebKit `localStorage`; nothing is uploaded

## Screenshots

| Expanded | With tasks & timer |
|----------|-------------------|
| ![Main view](docs/screenshots/main-expanded.png) | ![Tasks view](docs/screenshots/main-with-tasks.png) |

| Dark mode | Desktop widget |
|-----------|----------------|
| ![Dark mode](docs/screenshots/main-dark.png) | ![Widget](docs/screenshots/widget-collapsed.png) |

## Quick start

### Requirements

- macOS 13.0 or later
- Apple Silicon (arm64)
- [Xcode Command Line Tools](https://developer.apple.com/xcode/resources/) (`swiftc`, `sips`, `iconutil`)
- Node.js 18+ (development and testing only)

### Download a release

Grab the latest **`Flow-State-*-macos-arm64.zip`** from [Releases](https://github.com/DuffyRen/flow-state/releases), unzip, and move **Flow State.app** to Applications.

### Build from source

```bash
git clone https://github.com/DuffyRen/flow-state.git
cd flow-state

./build.sh
open "dist/Flow State.app"
```

Custom output path:

```bash
FLOW_STATE_APP_PATH="$HOME/Desktop/Flow State.app" ./build.sh
```

### Development

```bash
./start.sh
```

If the app is not built yet, `start.sh` runs `build.sh` automatically; otherwise it falls back to opening the HTML page in Safari.

## Project structure

```
flow-state/
├── code_artifact.html    # Main UI (timer + todos + modals)
├── lib/                    # Testable pure logic
├── native/main.swift       # macOS window shell & JS bridge
├── assets/app-icon.png
├── tests/                  # Unit, static, E2E, build checks
├── docs/screenshots/       # README screenshots
├── build.sh
└── test.sh
```

## Development workflow

1. Edit `code_artifact.html` for UI and business logic
2. Edit `native/main.swift` for window behavior and native bridge
3. Extract pure logic into `lib/` and add unit tests
4. Run tests: `npm install && ./test.sh`
5. Build: `./build.sh && open "dist/Flow State.app"`

## Testing

`./test.sh` runs:

| Stage | Coverage |
|-------|----------|
| Unit tests | Task archive, date helpers, wall-clock timer (19 tests) |
| Static checks | Required DOM, script refs, Swift bridge keywords (24 checks) |
| E2E smoke | Playwright: todos, timer, modals, widget (15 tests) |
| Build verify | Swift compile check |

## Shortcuts

| Action | Description |
|--------|-------------|
| `⌘ M` | Collapse / expand desktop widget |
| `⌘ +` / `⌘ -` / `⌘ 0` | Zoom in / out / reset |
| Click a todo | Set as current focus target |
| Click list blank area | Clear selection (free focus) |
| Right-click widget | Quit app |

## Architecture

**Native shell + web business layer**

- **Native** (`native/main.swift`): `NSWindow` + `WKWebView` — window state machine, widget drag, system theme sync, wall-clock timer sync
- **Web** (`code_artifact.html`): Single-page HTML with Tailwind CDN and inline JS
- **Bridge**: JS → Native via `webkit.messageHandlers.flowState`; Native → JS via `evaluateJavaScript`

See [docs/Flow State 技术架构.md](docs/Flow%20State%20技术架构.md) (Chinese) for more detail.

## Privacy

- All tasks, focus stats, and UI settings are stored locally in `localStorage`
- No backend, no account, no cloud sync (Tailwind CSS is loaded from CDN for styling only)
- Uninstalling the app or clearing site data removes local records

## Tech stack

| Layer | Stack |
|-------|-------|
| Native | Swift 5, AppKit, WebKit |
| Frontend | HTML, Tailwind CSS (CDN), Vanilla JS |
| Testing | Node.js test runner, Playwright |
| Build | Single-file `swiftc` compile — no Xcode project required |

## Roadmap

- [x] Desktop widget collapse/expand
- [x] App icon
- [x] Dark mode (system)
- [x] Wall-clock timer accuracy
- [x] Todo editing & selection UX
- [ ] System notifications & sounds
- [ ] Launch at login
- [ ] Optional always-on-top
- [ ] Split HTML into separate CSS/JS modules

## Contributing

Issues and pull requests are welcome. Please run `./test.sh` before submitting.

CI runs on push and PR to `main` (`.github/workflows/test.yml`).

## License

[MIT License](LICENSE)

## Acknowledgements

- [Pomodoro Technique](https://francescocirillo.com/pages/pomodoro-technique)
- [Tailwind CSS](https://tailwindcss.com/)
