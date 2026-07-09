'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    getLocalDateStr,
    escapeHtml,
    formatRelativeDate,
    shouldArchiveCompletedTask,
    buildHistoryEntry,
    partitionTasksForArchive,
    restoreTodayCompletedFromHistory,
    migrateTasksWithDates
} = require('../../lib/flow-tasks.js');

const ref = new Date('2026-07-08T12:00:00');
const today = '2026-07-08';
const yesterday = '2026-07-07';

describe('getLocalDateStr', () => {
    it('按本地日期格式化', () => {
        assert.equal(getLocalDateStr(ref), today);
    });
});

describe('escapeHtml', () => {
    it('转义危险字符', () => {
        assert.equal(escapeHtml('<script>"\'&</script>'), '&lt;script&gt;&quot;&#39;&amp;&lt;/script&gt;');
    });
});

describe('formatRelativeDate', () => {
    it('今天 / 昨天 / 同年 / 跨年', () => {
        assert.equal(formatRelativeDate(today, ref), '今天');
        assert.equal(formatRelativeDate(yesterday, ref), '昨天');
        assert.equal(formatRelativeDate('2026-03-15', ref), '3月15日');
        assert.equal(formatRelativeDate('2025-12-01', ref), '2025年12月1日');
    });
});

describe('shouldArchiveCompletedTask', () => {
    it('未完成不归档', () => {
        assert.equal(shouldArchiveCompletedTask({ completed: false }, today), false);
    });

    it('今日完成不归档', () => {
        assert.equal(
            shouldArchiveCompletedTask({ completed: true, completedDate: today }, today),
            false
        );
    });

    it('往日完成应归档', () => {
        assert.equal(
            shouldArchiveCompletedTask({ completed: true, completedDate: yesterday }, today),
            true
        );
    });
});

describe('partitionTasksForArchive', () => {
    it('分离今日完成与往日完成、保留未完成', () => {
        const tasks = [
            { id: '1', text: '今日完成', completed: true, completedDate: today },
            { id: '2', text: '昨日完成', completed: true, completedDate: yesterday },
            { id: '3', text: '未完成', completed: false, createdDate: yesterday }
        ];

        const { archived, remaining } = partitionTasksForArchive(tasks, today);

        assert.equal(archived.length, 1);
        assert.equal(archived[0].id, '2');
        assert.equal(remaining.length, 2);
        assert.deepEqual(remaining.map(t => t.id), ['1', '3']);
    });
});

describe('restoreTodayCompletedFromHistory', () => {
    it('把历史中今日完成项恢复到今日列表', () => {
        const taskHistory = [
            { id: 'a', text: '今日归档误删', completedDate: today, createdDate: today },
            { id: 'b', text: '昨日任务', completedDate: yesterday, createdDate: yesterday }
        ];
        const tasks = [];

        const result = restoreTodayCompletedFromHistory(taskHistory, tasks, today);

        assert.equal(result.restored.length, 1);
        assert.equal(result.restored[0].id, 'a');
        assert.equal(result.keptHistory.length, 1);
        assert.equal(result.tasks.length, 1);
        assert.equal(result.tasks[0].completed, true);
    });

    it('不重复恢复已存在的任务', () => {
        const taskHistory = [{ id: 'a', text: '已有', completedDate: today }];
        const tasks = [{ id: 'a', text: '已有', completed: true, completedDate: today }];

        const result = restoreTodayCompletedFromHistory(taskHistory, tasks, today);

        assert.equal(result.restored.length, 0);
        assert.equal(result.tasks.length, 1);
    });
});

describe('migrateTasksWithDates', () => {
    it('为缺少 createdDate 的任务补日期', () => {
        const { tasks, changed } = migrateTasksWithDates(
            [{ id: '1', text: '旧数据' }],
            yesterday
        );

        assert.equal(changed, true);
        assert.equal(tasks[0].createdDate, yesterday);
    });
});

describe('buildHistoryEntry', () => {
    it('生成带归档时间戳的历史记录', () => {
        const entry = buildHistoryEntry(
            { id: 'x', text: '任务', completed: true, completedDate: yesterday, createdDate: yesterday },
            today
        );

        assert.equal(entry.id, 'x');
        assert.equal(entry.completedDate, yesterday);
        assert.equal(typeof entry.archivedAt, 'number');
    });
});
