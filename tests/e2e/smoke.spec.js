'use strict';

const { test, expect } = require('@playwright/test');

async function openFreshApp(page) {
    await page.goto('/code_artifact.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => typeof window.setWidgetCollapsed === 'function');
    await expect(page.locator('#time-display')).toHaveText('25:00');
}

test.describe('Flow State 冒烟测试', () => {
    test.beforeEach(async ({ page }) => {
        await openFreshApp(page);
    });

    test('初始界面显示专注模式与空待办', async ({ page }) => {
        await expect(page.locator('#time-display')).toHaveText('25:00');
        await expect(page.locator('#status-text')).toHaveText('准备开始');
        await expect(page.locator('#task-count')).toHaveText('0/0');
        await expect(page.locator('#empty-state')).toBeVisible();
        await expect(page.locator('#btn-pomodoro')).toContainClass('text-brand-600');
    });

    test('可添加、完成并删除待办', async ({ page }) => {
        await page.fill('#task-input', '写 E2E 测试');
        await page.press('#task-input', 'Enter');

        const taskItem = page.locator('[data-task-item]').first();
        await expect(taskItem).toContainText('写 E2E 测试');
        await expect(page.locator('#task-count')).toHaveText('0/1');
        await expect(page.locator('#empty-state')).toBeHidden();

        await taskItem.locator('[data-action="toggle"]').click();
        await expect(page.locator('#task-count')).toHaveText('1/1');

        await taskItem.locator('[data-action="delete"]').click();
        await expect(page.locator('[data-task-item]')).toHaveCount(0);
        await expect(page.locator('#task-count')).toHaveText('0/0');
    });

    test('可切换计时模式并显示对应时长', async ({ page }) => {
        await page.locator('#btn-shortBreak').click();
        await expect(page.locator('#time-display')).toHaveText('05:00');
        await expect(page.locator('#status-text')).toHaveText('休息一下');

        await page.locator('#btn-longBreak').click();
        await expect(page.locator('#time-display')).toHaveText('15:00');

        await page.locator('#btn-pomodoro').click();
        await expect(page.locator('#time-display')).toHaveText('25:00');
    });

    test('可开始与暂停计时', async ({ page }) => {
        await page.locator('#btn-toggle').click();
        await expect(page.locator('#icon-pause')).toBeVisible();
        await expect(page.locator('#status-text')).toHaveText('正在专注...');

        await page.locator('#btn-toggle').click();
        await expect(page.locator('#icon-play')).toBeVisible();
        await expect(page.locator('#status-text')).toHaveText('已暂停');
    });

    test('重置按钮恢复当前模式默认时长', async ({ page }) => {
        await page.locator('#btn-shortBreak').click();
        await page.locator('#btn-toggle').click();
        await expect.poll(async () => {
            await page.evaluate(() => window.syncTimerFromClock?.());
            return page.locator('#time-display').textContent();
        }).not.toBe('05:00');

        await page.locator('button[title="重置"]').click();
        await expect(page.locator('#time-display')).toHaveText('05:00');
        await expect(page.locator('#status-text')).toHaveText('休息一下');
    });

    test('设置弹窗可修改专注时长', async ({ page }) => {
        await page.locator('button[title="设置"]').click();
        await expect(page.locator('#settings-modal')).toHaveClass(/flex/, { timeout: 3000 });

        await page.fill('#input-focus-time', '30');
        await page.getByRole('button', { name: '保存设置' }).click();

        await expect(page.locator('#settings-modal')).toHaveClass(/hidden/);
        await expect(page.locator('#time-display')).toHaveText('30:00');
    });

    test('历史弹窗可切换专注统计与已完成待办', async ({ page }) => {
        await page.locator('button[title="查看历史记录（专注统计 / 已完成待办）"]').click();
        await expect(page.locator('#history-modal')).toHaveClass(/flex/, { timeout: 3000 });
        await expect(page.locator('#history-panel-stats')).toBeVisible();
        await expect(page.locator('#history-panel-tasks')).toHaveClass(/hidden/);

        await page.locator('#history-tab-tasks').click();
        await expect(page.locator('#history-panel-stats')).toHaveClass(/hidden/);
        await expect(page.locator('#history-panel-tasks')).toBeVisible();

        await page.locator('#history-tab-stats').click();
        await expect(page.locator('#history-panel-stats')).toBeVisible();
    });

    test('小组件缩回态可展开并同步迷你倒计时', async ({ page }) => {
        await page.evaluate(() => window.setWidgetCollapsed(true));
        await expect(page.locator('body')).toHaveClass(/widget-collapsed/);
        await expect(page.locator('#widget-mini')).toBeVisible();
        await expect(page.locator('#mini-time-display')).toHaveText('25:00');

        await page.evaluate(() => window.setWidgetCollapsed(false));
        await expect(page.locator('body')).not.toHaveClass(/widget-collapsed/);
        await expect(page.locator('#app-main')).toBeVisible();
    });

    test('选中为专注目标后仍可点击完成', async ({ page }) => {
        await page.fill('#task-input', '短期测试任务');
        await page.press('#task-input', 'Enter');

        const taskItem = page.locator('[data-task-item]').first();
        await taskItem.locator('[data-action="select"]').click();
        await expect(page.locator('#current-focus-text')).toHaveText('短期测试任务');

        await taskItem.locator('[data-action="toggle"]').click();
        await expect(page.locator('#task-count')).toHaveText('1/1');
        await expect(page.locator('#current-focus-text')).toHaveText('未选择任务 (自由专注)');
    });

    test('选中为专注目标后仍可删除', async ({ page }) => {
        await page.fill('#task-input', '待删除任务');
        await page.press('#task-input', 'Enter');

        const taskItem = page.locator('[data-task-item]').first();
        await taskItem.locator('[data-action="select"]').click();
        await expect(page.locator('#current-focus-text')).toHaveText('待删除任务');

        await taskItem.locator('[data-action="delete"]').click();
        await expect(page.locator('[data-task-item]')).toHaveCount(0);
        await expect(page.locator('#task-count')).toHaveText('0/0');
        await expect(page.locator('#current-focus-text')).toHaveText('未选择任务 (自由专注)');
    });

    test('原生模式下选中态按钮可点击', async ({ page }) => {
        await page.evaluate(() => document.body.classList.add('native-app'));
        await page.fill('#task-input', '原生模式任务');
        await page.press('#task-input', 'Enter');

        const taskItem = page.locator('[data-task-item]').first();
        await taskItem.locator('[data-action="select"]').click();
        await expect(page.locator('#current-focus-text')).toHaveText('原生模式任务');

        await taskItem.locator('[data-action="toggle"]').click();
        await expect(page.locator('#task-count')).toHaveText('1/1');

        await page.fill('#task-input', '第二条任务');
        await page.press('#task-input', 'Enter');
        const secondItem = page.locator('[data-task-item]').first();
        await secondItem.locator('[data-action="select"]').click();
        await secondItem.locator('[data-action="delete"]').click();
        await expect(page.locator('#task-count')).toHaveText('1/1');
    });

    test('可编辑未完成待办', async ({ page }) => {
        await page.fill('#task-input', '原始任务名');
        await page.press('#task-input', 'Enter');

        const taskItem = page.locator('[data-task-item]').first();
        await taskItem.locator('[data-action="edit"]').click();
        const editor = taskItem.locator('[data-edit-input]');
        await expect(editor).toBeVisible();
        await editor.fill('更新后的任务名');
        await editor.press('Enter');

        await expect(taskItem).toContainText('更新后的任务名');
        await expect(taskItem.locator('[data-edit-input]')).toHaveCount(0);
    });

    test('选中为专注目标后编辑会同步左侧标题', async ({ page }) => {
        await page.fill('#task-input', '数据更新');
        await page.press('#task-input', 'Enter');

        const taskItem = page.locator('[data-task-item]').first();
        await taskItem.locator('[data-action="select"]').click();
        await expect(page.locator('#current-focus-text')).toHaveText('数据更新');

        await taskItem.locator('[data-action="edit"]').click();
        await taskItem.locator('[data-edit-input]').fill('数据更新 v2');
        await taskItem.locator('[data-edit-input]').press('Enter');

        await expect(page.locator('#current-focus-text')).toHaveText('数据更新 v2');
    });

    test('点击任务列表空白处取消选中', async ({ page }) => {
        await page.fill('#task-input', '临时任务');
        await page.press('#task-input', 'Enter');

        const taskItem = page.locator('[data-task-item]').first();
        await taskItem.locator('[data-action="select"]').click();
        await expect(page.locator('#current-focus-text')).toHaveText('临时任务');
        await expect(taskItem).toHaveClass(/border-brand-400/);

        const taskListBox = await page.locator('#task-list').boundingBox();
        await page.mouse.click(taskListBox.x + taskListBox.width / 2, taskListBox.y + taskListBox.height - 8);
        await expect(page.locator('#current-focus-text')).toHaveText('未选择任务 (自由专注)');
        await expect(taskItem).not.toHaveClass(/border-brand-400/);
    });

    test('界面缩放滑块更新百分比标签', async ({ page }) => {
        await page.locator('button[title="设置"]').click();
        await expect(page.locator('#settings-modal')).toHaveClass(/flex/, { timeout: 3000 });
        await page.locator('#input-ui-zoom').evaluate((el) => {
            el.value = '110';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await expect(page.locator('#zoom-label')).toHaveText('110%');
    });
});
