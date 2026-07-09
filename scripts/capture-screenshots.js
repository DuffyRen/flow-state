'use strict';

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const BASE_URL = 'http://127.0.0.1:4173/code_artifact.html';

async function openFresh(page) {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => typeof window.setWidgetCollapsed === 'function');
    await page.evaluate(() => document.body.classList.add('native-app'));
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const browser = await chromium.launch();
    const page = await browser.newPage({
        viewport: { width: 880, height: 540 },
        deviceScaleFactor: 2
    });

    await openFresh(page);
    await page.locator('#app-scale-root').screenshot({
        path: path.join(OUT_DIR, 'main-expanded.png')
    });

    await page.fill('#task-input', '完成项目文档');
    await page.press('#task-input', 'Enter');
    await page.fill('#task-input', '回复邮件');
    await page.press('#task-input', 'Enter');
    await page.locator('[data-task-item]').first().click();
    await page.locator('#btn-toggle').click();
    await page.locator('#app-scale-root').screenshot({
        path: path.join(OUT_DIR, 'main-with-tasks.png')
    });

    await page.evaluate(() => window.setWidgetCollapsed(true));
    await page.locator('#widget-mini-card').screenshot({
        path: path.join(OUT_DIR, 'widget-collapsed.png')
    });

    await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        window.applySystemTheme?.(true);
    });
    await page.evaluate(() => window.setWidgetCollapsed(false));
    await page.locator('#app-scale-root').screenshot({
        path: path.join(OUT_DIR, 'main-dark.png')
    });

    await browser.close();
    console.log('Screenshots saved to', OUT_DIR);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
