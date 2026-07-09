'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    clampZoom,
    formatTimeDisplay,
    calcProgressOffset,
    createTimerEndAt,
    calcTimeLeftFromEnd,
    buildModes,
    TIMER_CIRCUMFERENCE
} = require('../../lib/flow-timer.js');

describe('clampZoom', () => {
    it('限制在 70% ~ 130%', () => {
        assert.equal(clampZoom(0.5), 0.7);
        assert.equal(clampZoom(1.0), 1.0);
        assert.equal(clampZoom(2.0), 1.3);
    });
});

describe('formatTimeDisplay', () => {
    it('格式化为 MM:SS', () => {
        assert.equal(formatTimeDisplay(25 * 60), '25:00');
        assert.equal(formatTimeDisplay(61), '01:01');
        assert.equal(formatTimeDisplay(0), '00:00');
    });
});

describe('calcProgressOffset', () => {
    it('满进度时 offset 为 0', () => {
        assert.equal(calcProgressOffset(1500, 1500, TIMER_CIRCUMFERENCE), 0);
    });

    it('过半时 offset 约为周长一半', () => {
        const offset = calcProgressOffset(750, 1500, 100);
        assert.equal(offset, 50);
    });

    it('时间为 0 时 offset 等于周长', () => {
        assert.equal(calcProgressOffset(0, 1500, 100), 100);
    });
});

describe('calcTimeLeftFromEnd', () => {
    it('按结束时间戳计算剩余秒数', () => {
        const endAt = createTimerEndAt(300, 1_000);
        assert.equal(calcTimeLeftFromEnd(endAt, 1_000), 300);
        assert.equal(calcTimeLeftFromEnd(endAt, 61_000), 240);
        assert.equal(calcTimeLeftFromEnd(endAt, 301_000), 0);
        assert.equal(calcTimeLeftFromEnd(endAt, 400_000), 0);
    });

    it('无结束时间返回 null', () => {
        assert.equal(calcTimeLeftFromEnd(null, 1_000), null);
    });
});

describe('buildModes', () => {
    it('按自定义专注时长生成模式', () => {
        const modes = buildModes(30);
        assert.equal(modes.pomodoro.time, 30 * 60);
        assert.equal(modes.shortBreak.time, 5 * 60);
        assert.equal(modes.longBreak.time, 15 * 60);
    });
});
