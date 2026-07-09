'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const projectRoot = path.resolve(__dirname, '../..');
const htmlPath = path.join(projectRoot, 'code_artifact.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const REQUIRED_IDS = [
    'native-titlebar',
    'widget-mini',
    'app-scale-root',
    'app-main',
    'timer-progress',
    'time-display',
    'btn-toggle',
    'task-form',
    'task-list',
    'settings-modal',
    'history-modal',
    'history-tab-stats',
    'history-tab-tasks',
    'history-panel-stats',
    'history-panel-tasks'
];

const REQUIRED_SCRIPTS = [
    'lib/flow-tasks.js',
    'lib/flow-timer.js'
];

const REQUIRED_BRIDGE = [
    'webkit.messageHandlers.flowState',
    'applySystemTheme',
    'setWidgetCollapsed'
];

let failed = 0;

function check(name, condition, detail) {
    if (!condition) {
        console.error(`✗ ${name}: ${detail}`);
        failed += 1;
        return;
    }
    console.log(`✓ ${name}`);
}

for (const id of REQUIRED_IDS) {
    const pattern = new RegExp(`id=["']${id}["']`);
    check(`DOM #${id}`, pattern.test(html), '缺少必需元素');
}

for (const src of REQUIRED_SCRIPTS) {
    check(`script ${src}`, html.includes(`src="${src}"`), '缺少脚本引用');
}

for (const token of REQUIRED_BRIDGE) {
    check(`bridge ${token}`, html.includes(token), '缺少原生桥接逻辑');
}

const libFiles = ['flow-tasks.js', 'flow-timer.js'];
for (const file of libFiles) {
    const libPath = path.join(projectRoot, 'lib', file);
    check(`lib/${file}`, fs.existsSync(libPath), '文件不存在');
}

const swiftPath = path.join(projectRoot, 'native/main.swift');
const swift = fs.readFileSync(swiftPath, 'utf8');
check('Swift flowState handler', swift.includes('name: "flowState"'), '缺少消息处理器');
check('Swift 暗黑模式同步', swift.includes('applySystemTheme'), '缺少主题注入');

if (failed > 0) {
    process.exit(1);
}

console.log(`\n静态检查通过（${REQUIRED_IDS.length + REQUIRED_SCRIPTS.length + REQUIRED_BRIDGE.length + libFiles.length + 2} 项）`);
