'use strict';

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: 'tests/e2e',
    timeout: 30_000,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [['list']],
    use: {
        baseURL: 'http://127.0.0.1:4173',
        viewport: { width: 880, height: 540 },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai'
    },
    webServer: {
        command: 'node tests/e2e/serve.js',
        url: 'http://127.0.0.1:4173/code_artifact.html',
        reuseExistingServer: !process.env.CI,
        timeout: 15_000
    }
});
