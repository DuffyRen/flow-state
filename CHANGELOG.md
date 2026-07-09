# Changelog

All notable changes to Flow State are documented in this file.

## [1.1.0] - 2026-07-09

### Added
- Wall-clock timer (`timerEndsAt`) for accurate countdown in widget and background modes
- Native 1s sync timer when collapsed as desktop widget
- Todo editing (pencil icon), click blank area to clear selection
- Dark mode following macOS system appearance
- Custom app icon (tomato + checkmark)
- Automated test suite: unit, static, E2E, and Swift build verification
- GitHub Actions CI on macOS
- English README and screenshots

### Changed
- Increased window canvas height (500 → 540) and bottom padding for better spacing
- Build output defaults to `dist/Flow State.app` (portable for open source)
- Progress ring draws clockwise from 12 o'clock

### Fixed
- Task complete/delete not working when item was selected as focus target
- `window.syncTimerFromClock` infinite recursion breaking native timer sync
- Timer drift when WebKit throttled `setInterval` in widget mode

## [1.0.0] - 2026-07-08

### Added
- Initial release: Pomodoro timer, today's todos, focus stats, history
- Desktop widget mode (72×72) with drag support
- Native macOS app shell (Swift + WKWebView)
- UI zoom 70%–130%, responsive window scaling
- Local `localStorage` persistence

[1.1.0]: https://github.com/DuffyRen/flow-state/releases/tag/v1.1.0
[1.0.0]: https://github.com/DuffyRen/flow-state/releases/tag/v1.0.0
