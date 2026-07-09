/**
 * Flow State 待办与日期相关纯逻辑（浏览器 + Node 共用）
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.FlowTasks = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const STORAGE_KEYS = {
        TASKS: 'flowTasksClean',
        HISTORY: 'flowTaskHistory',
        LAST_DATE: 'flowTasksLastDate',
        MIGRATED: 'flowTasksHistoryMigratedV1'
    };

    function getLocalDateStr(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatRelativeDate(dateStr, referenceDate = new Date()) {
        if (!dateStr) return '';
        const today = getLocalDateStr(referenceDate);
        if (dateStr === today) return '今天';

        const yesterday = new Date(referenceDate);
        yesterday.setDate(yesterday.getDate() - 1);
        if (dateStr === getLocalDateStr(yesterday)) return '昨天';

        const [year, month, day] = dateStr.split('-').map(Number);
        const currentYear = referenceDate.getFullYear();
        if (year === currentYear) return `${month}月${day}日`;
        return `${year}年${month}月${day}日`;
    }

    function getTaskCompletedDate(task, today = getLocalDateStr()) {
        return task.completedDate || task.createdDate || today;
    }

    function shouldArchiveCompletedTask(task, today = getLocalDateStr()) {
        if (!task.completed) return false;
        return getTaskCompletedDate(task, today) < today;
    }

    function buildHistoryEntry(task, today = getLocalDateStr()) {
        const createdDate = task.createdDate || today;
        return {
            id: task.id,
            text: task.text,
            createdDate,
            completedDate: getTaskCompletedDate(task, today),
            archivedAt: Date.now()
        };
    }

    function buildActiveTaskFromHistory(item, today = getLocalDateStr()) {
        return {
            id: item.id,
            text: item.text,
            completed: true,
            createdDate: item.createdDate || today,
            completedDate: item.completedDate || today
        };
    }

    function normalizeTask(task, today, fallbackCreatedDate) {
        return {
            ...task,
            createdDate: task.createdDate || fallbackCreatedDate || today,
            completedDate: task.completed ? getTaskCompletedDate(task, today) : null
        };
    }

    function partitionTasksForArchive(tasks, today, fallbackCreatedDate = today) {
        const archived = [];
        const remaining = [];

        tasks.forEach(task => {
            const normalized = normalizeTask(task, today, fallbackCreatedDate);
            if (shouldArchiveCompletedTask(normalized, today)) {
                archived.push(buildHistoryEntry(normalized, today));
            } else {
                remaining.push(normalized);
            }
        });

        return { archived, remaining };
    }

    function restoreTodayCompletedFromHistory(taskHistory, tasks, today = getLocalDateStr()) {
        const restored = [];
        const keptHistory = [];
        const existingIds = new Set(tasks.map(task => task.id));

        taskHistory.forEach(item => {
            const completedDate = item.completedDate || item.createdDate || today;
            if (completedDate === today && !existingIds.has(item.id)) {
                restored.push(buildActiveTaskFromHistory(item, today));
                existingIds.add(item.id);
            } else {
                keptHistory.push(item);
            }
        });

        return { restored, keptHistory, tasks: [...restored, ...tasks] };
    }

    function migrateTasksWithDates(tasks, fallbackDate) {
        let changed = false;
        const migrated = tasks.map(task => {
            if (!task.createdDate) {
                changed = true;
                return { ...task, createdDate: fallbackDate };
            }
            return task;
        });
        return { tasks: migrated, changed };
    }

    return {
        STORAGE_KEYS,
        getLocalDateStr,
        escapeHtml,
        formatRelativeDate,
        getTaskCompletedDate,
        shouldArchiveCompletedTask,
        buildHistoryEntry,
        buildActiveTaskFromHistory,
        normalizeTask,
        partitionTasksForArchive,
        restoreTodayCompletedFromHistory,
        migrateTasksWithDates
    };
}));
