import AppKit
import WebKit

private enum WindowConfig {
    static let designWidth: CGFloat = 880
    static let designHeight: CGFloat = 540
    static let titlebarHeight: CGFloat = 28
    static let horizontalPadding: CGFloat = 14
    static let bottomPadding: CGFloat = 20
    static let contentWidth: CGFloat = 760
    static var defaultWidth: CGFloat {
        contentWidth + horizontalPadding * 2
    }
    static var defaultHeight: CGFloat {
        contentWidth * designHeight / designWidth + titlebarHeight + bottomPadding
    }
    static let minContentWidth: CGFloat = 520
    static var minWidth: CGFloat {
        minContentWidth + horizontalPadding * 2
    }
    static var minHeight: CGFloat {
        minContentWidth * designHeight / designWidth + titlebarHeight + bottomPadding
    }
    static let collapsedWidth: CGFloat = 72
    static let collapsedHeight: CGFloat = 72
    static let collapsedFrameKey = "FlowStateCollapsedFrame"
}

final class FlowStateApp: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler, NSWindowDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var isCollapsed = false
    private var isApplyingWidgetState = false
    private var collapsedDragMonitor: Any?
    private var collapsedSyncTimer: Timer?
    private var dragStartMouseLocation: NSPoint = .zero
    private var dragStartWindowOrigin: NSPoint = .zero
    private var didDragMiniWidget = false
    private var themeObserver: NSObjectProtocol?
    private var appActiveObserver: NSObjectProtocol?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)

        UserDefaults.standard.removeObject(forKey: "FlowStateExpandedFrame")

        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "flowState")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground")

        let contentRect = defaultExpandedFrame()

        window = NSWindow(
            contentRect: contentRect,
            styleMask: expandedStyleMask,
            backing: .buffered,
            defer: false
        )
        configureWindow()
        window.title = "Flow State 番茄钟"
        window.delegate = self
        window.minSize = NSSize(width: WindowConfig.minWidth, height: WindowConfig.minHeight)
        window.contentView = webView
        window.center()
        syncWindowAppearance()
        registerThemeObserver()
        registerAppActiveObserver()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        guard let bundleURL = Bundle.main.resourceURL,
              let htmlURL = resolveHTMLURL() else {
            showError("应用资源缺失，请在项目目录运行 ./build.sh 重新构建。")
            return
        }

        webView.loadFileURL(htmlURL, allowingReadAccessTo: bundleURL)
    }

    func applicationWillTerminate(_ notification: Notification) {
        disableCollapsedDragMonitor()
        stopCollapsedSyncTimer()
        if let themeObserver {
            DistributedNotificationCenter.default().removeObserver(themeObserver)
        }
        if let appActiveObserver {
            NotificationCenter.default.removeObserver(appActiveObserver)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "flowState",
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else {
            return
        }

        switch action {
        case "collapse":
            applyCollapsedState(true, animated: true)
        case "expand":
            applyCollapsedState(false, animated: true)
        case "toggle":
            applyCollapsedState(!isCollapsed, animated: true)
        case "quit":
            quitApplication()
        default:
            break
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript(
            "document.body.classList.add('native-app'); window.dispatchEvent(new Event('resize'));",
            completionHandler: nil
        )
        syncWebAppearance()
        if isCollapsed {
            notifyWebViewCollapsed(true)
        }
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if isCollapsed {
            persistCollapsedFrame()
        }
        disableCollapsedDragMonitor()
        return true
    }

    func windowDidMove(_ notification: Notification) {
        guard !isApplyingWidgetState, isCollapsed else { return }
        persistCollapsedFrame()
    }

    func windowDidBecomeKey(_ notification: Notification) {
        syncTimerClock()
    }

    func windowDidBecomeMain(_ notification: Notification) {
        syncTimerClock()
    }

    private var expandedStyleMask: NSWindow.StyleMask {
        [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView]
    }

    private var tomatoBackgroundColor: NSColor {
        NSColor(red: 1.0, green: 0.965, blue: 0.96, alpha: 1)
    }

    private var darkBackgroundColor: NSColor {
        NSColor(red: 0.071, green: 0.078, blue: 0.102, alpha: 1)
    }

    private var isDarkAppearance: Bool {
        let appearance = window?.effectiveAppearance ?? NSApp.effectiveAppearance
        let best = appearance.bestMatch(from: [.darkAqua, .aqua])
        return best == .darkAqua
    }

    private func registerAppActiveObserver() {
        appActiveObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.syncTimerClock()
        }
    }

    private func syncTimerClock() {
        webView?.evaluateJavaScript(
            "window.syncTimerFromClock && window.syncTimerFromClock();",
            completionHandler: nil
        )
    }

    private func startCollapsedSyncTimer() {
        stopCollapsedSyncTimer()
        collapsedSyncTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.syncTimerClock()
        }
    }

    private func stopCollapsedSyncTimer() {
        collapsedSyncTimer?.invalidate()
        collapsedSyncTimer = nil
    }

    private func registerThemeObserver() {
        themeObserver = DistributedNotificationCenter.default().addObserver(
            forName: Notification.Name("AppleInterfaceThemeChangedNotification"),
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.syncWindowAppearance()
        }
    }

    private func syncWindowAppearance() {
        guard let window else { return }
        window.appearance = nil
        if isCollapsed {
            window.backgroundColor = .clear
            window.isOpaque = false
        } else {
            window.backgroundColor = isDarkAppearance ? darkBackgroundColor : tomatoBackgroundColor
            window.isOpaque = true
        }
        syncWebAppearance()
    }

    private func syncWebAppearance() {
        guard let webView else { return }
        let isDark = isDarkAppearance
        let js = "window.applySystemTheme && window.applySystemTheme(\(isDark ? "true" : "false"));"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    private func configureWindow() {
        window.level = .normal
        window.collectionBehavior = [.canJoinAllSpaces]
        window.isReleasedWhenClosed = false
        applyNativeExpandedTitlebar()
    }

    private func applyNativeExpandedTitlebar() {
        window.appearance = nil
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.isMovableByWindowBackground = true
        if #available(macOS 11.0, *) {
            window.titlebarSeparatorStyle = .none
        }
    }

    private func applyCollapsedState(_ collapsed: Bool, animated: Bool) {
        guard !isApplyingWidgetState else { return }
        if collapsed == isCollapsed { return }

        isApplyingWidgetState = true

        if collapsed {
            isCollapsed = true

            window.styleMask = [.borderless, .resizable]
            window.isMovableByWindowBackground = true
            window.backgroundColor = .clear
            window.isOpaque = false
            window.hasShadow = false
            window.minSize = NSSize(width: WindowConfig.collapsedWidth, height: WindowConfig.collapsedHeight)
            window.maxSize = window.minSize
            applyTransparentChrome()

            let target = restoredCollapsedFrame() ?? Self.defaultCollapsedFrame(for: screenForFrame(window.frame))
            window.setFrame(target, display: true, animate: animated)
            persistCollapsedFrame()
            notifyWebViewCollapsed(true)
            enableCollapsedDragMonitor()
            startCollapsedSyncTimer()
            syncTimerClock()
        } else {
            disableCollapsedDragMonitor()
            stopCollapsedSyncTimer()
            isCollapsed = false

            window.styleMask = expandedStyleMask
            window.isMovableByWindowBackground = true
            window.isOpaque = true
            window.hasShadow = true
            window.minSize = NSSize(width: WindowConfig.minWidth, height: WindowConfig.minHeight)
            window.maxSize = NSSize(width: 10000, height: 10000)
            applyNativeExpandedTitlebar()
            applyExpandedChrome()
            syncWindowAppearance()

            let target = expandedFrameNearMini()
            window.setFrame(target, display: true, animate: animated)
            notifyWebViewCollapsed(false)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + (animated ? 0.22 : 0.05)) {
            self.isApplyingWidgetState = false
        }
    }

    private func applyTransparentChrome() {
        window.contentView?.wantsLayer = true
        window.contentView?.layer?.cornerRadius = 0
        window.contentView?.layer?.masksToBounds = false
        window.contentView?.layer?.backgroundColor = NSColor.clear.cgColor

        webView.wantsLayer = true
        webView.layer?.backgroundColor = NSColor.clear.cgColor
        webView.layer?.cornerRadius = 0
        webView.layer?.masksToBounds = false
        webView.setValue(false, forKey: "drawsBackground")
    }

    private func applyExpandedChrome() {
        window.contentView?.wantsLayer = true
        window.contentView?.layer?.cornerRadius = 0
        window.contentView?.layer?.masksToBounds = false
        window.contentView?.layer?.backgroundColor = nil

        webView.wantsLayer = true
        webView.layer?.backgroundColor = nil
        webView.layer?.cornerRadius = 0
        webView.layer?.masksToBounds = false
    }

    private func enableCollapsedDragMonitor() {
        disableCollapsedDragMonitor()
        collapsedDragMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .leftMouseDragged, .leftMouseUp, .rightMouseDown]) { [weak self] event in
            guard let self, self.isCollapsed, event.window == self.window else {
                return event
            }

            switch event.type {
            case .rightMouseDown:
                self.showCollapsedContextMenu(for: event)
                return nil
            case .leftMouseDown:
                self.dragStartMouseLocation = NSEvent.mouseLocation
                self.dragStartWindowOrigin = self.window.frame.origin
                self.didDragMiniWidget = false
            case .leftMouseDragged:
                let current = NSEvent.mouseLocation
                let dx = current.x - self.dragStartMouseLocation.x
                let dy = current.y - self.dragStartMouseLocation.y
                if abs(dx) > 3 || abs(dy) > 3 {
                    self.didDragMiniWidget = true
                }
                var frame = self.window.frame
                frame.origin.x = self.dragStartWindowOrigin.x + dx
                frame.origin.y = self.dragStartWindowOrigin.y + dy
                self.isApplyingWidgetState = true
                self.window.setFrame(self.clampFrameToVisibleScreen(frame), display: true)
                self.isApplyingWidgetState = false
            case .leftMouseUp:
                if self.didDragMiniWidget {
                    self.persistCollapsedFrame()
                } else {
                    self.applyCollapsedState(false, animated: true)
                }
            default:
                break
            }
            return event
        }
    }

    private func disableCollapsedDragMonitor() {
        if let collapsedDragMonitor {
            NSEvent.removeMonitor(collapsedDragMonitor)
            self.collapsedDragMonitor = nil
        }
    }

    private func showCollapsedContextMenu(for event: NSEvent) {
        let menu = NSMenu()
        let expandItem = NSMenuItem(title: "展开面板", action: #selector(expandFromMenu(_:)), keyEquivalent: "")
        expandItem.target = self
        menu.addItem(expandItem)
        menu.addItem(NSMenuItem.separator())
        let quitItem = NSMenuItem(title: "退出 Flow State", action: #selector(quitFromMenu(_:)), keyEquivalent: "")
        quitItem.target = self
        menu.addItem(quitItem)
        NSMenu.popUpContextMenu(menu, with: event, for: window.contentView!)
    }

    @objc private func expandFromMenu(_ sender: Any?) {
        applyCollapsedState(false, animated: true)
    }

    @objc private func quitFromMenu(_ sender: Any?) {
        quitApplication()
    }

    private func quitApplication() {
        if isCollapsed {
            persistCollapsedFrame()
        }
        disableCollapsedDragMonitor()
        NSApp.terminate(nil)
    }

    private func defaultExpandedFrame() -> NSRect {
        let screen = NSScreen.main?.visibleFrame ?? .zero
        var frame = NSRect(x: 0, y: 0, width: WindowConfig.defaultWidth, height: WindowConfig.defaultHeight)
        frame.origin.x = screen.midX - frame.width / 2
        frame.origin.y = screen.midY - frame.height / 2
        return clampFrameToVisibleScreen(frame)
    }

    private static func defaultCollapsedFrame(for screen: NSScreen? = nil) -> NSRect {
        let targetScreen = screen ?? NSScreen.main ?? NSScreen.screens[0]
        let visible = targetScreen.visibleFrame
        let margin: CGFloat = 20
        return NSRect(
            x: visible.maxX - WindowConfig.collapsedWidth - margin,
            y: visible.minY + margin,
            width: WindowConfig.collapsedWidth,
            height: WindowConfig.collapsedHeight
        )
    }

    private func expandedFrameNearMini() -> NSRect {
        let mini = window.frame
        let frame = NSRect(
            x: mini.origin.x - 180,
            y: mini.origin.y - 60,
            width: WindowConfig.defaultWidth,
            height: WindowConfig.defaultHeight
        )
        return clampFrameToVisibleScreen(frame)
    }

    private func screenForFrame(_ frame: NSRect) -> NSScreen {
        NSScreen.screens.first(where: { $0.frame.intersects(frame) }) ?? NSScreen.main ?? NSScreen.screens[0]
    }

    private func notifyWebViewCollapsed(_ collapsed: Bool) {
        let js = "window.setWidgetCollapsed && window.setWidgetCollapsed(\(collapsed ? "true" : "false"));"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    private func restoredCollapsedFrame() -> NSRect? {
        guard let value = UserDefaults.standard.string(forKey: WindowConfig.collapsedFrameKey) else {
            return nil
        }
        let frame = NSRectFromString(value)
        guard abs(frame.width - WindowConfig.collapsedWidth) < 2,
              abs(frame.height - WindowConfig.collapsedHeight) < 2 else {
            return nil
        }
        return clampFrameToVisibleScreen(frame)
    }

    private func clampFrameToVisibleScreen(_ frame: NSRect) -> NSRect {
        let screen = screenForFrame(frame)
        let visible = screen.visibleFrame
        var result = frame
        result.origin.x = min(max(result.origin.x, visible.minX), visible.maxX - result.width)
        result.origin.y = min(max(result.origin.y, visible.minY), visible.maxY - result.height)
        return result
    }

    private func persistCollapsedFrame() {
        guard let window, isCollapsed else { return }
        let frame = clampFrameToVisibleScreen(window.frame)
        UserDefaults.standard.set(NSStringFromRect(frame), forKey: WindowConfig.collapsedFrameKey)
    }

    private func resolveHTMLURL() -> URL? {
        guard let resourceURL = Bundle.main.resourceURL else { return nil }
        let htmlURL = resourceURL.appendingPathComponent("code_artifact.html")
        guard FileManager.default.fileExists(atPath: htmlURL.path) else { return nil }
        return htmlURL
    }

    private func showError(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "无法启动 Flow State"
        alert.informativeText = message
        alert.alertStyle = .critical
        alert.runModal()
        NSApp.terminate(nil)
    }
}

let app = NSApplication.shared
let delegate = FlowStateApp()
app.delegate = delegate
app.run()
