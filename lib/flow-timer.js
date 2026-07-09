/**
 * Flow State 计时器与缩放相关纯逻辑
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.FlowTimer = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const MODES = {
        pomodoro: { time: 25 * 60, color: '#f43f5e' },
        shortBreak: { time: 5 * 60, color: '#3b82f6' },
        longBreak: { time: 15 * 60, color: '#8b5cf6' }
    };

    const TIMER_RING_RADIUS = 140;
    const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RING_RADIUS;

    function clampZoom(value) {
        return Math.min(1.3, Math.max(0.7, value));
    }

    function formatTimeDisplay(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function calcProgressOffset(timeLeft, totalTime, circumference = TIMER_CIRCUMFERENCE) {
        if (totalTime <= 0) return circumference;
        const progress = timeLeft / totalTime;
        return circumference * (1 - progress);
    }

    function createTimerEndAt(timeLeftSeconds, nowMs = Date.now()) {
        return nowMs + timeLeftSeconds * 1000;
    }

    function calcTimeLeftFromEnd(endAtMs, nowMs = Date.now()) {
        if (!endAtMs) return null;
        return Math.max(0, Math.ceil((endAtMs - nowMs) / 1000));
    }

    function buildModes(focusMinutes = 25) {
        return {
            pomodoro: { time: focusMinutes * 60, color: MODES.pomodoro.color },
            shortBreak: { ...MODES.shortBreak },
            longBreak: { ...MODES.longBreak }
        };
    }

    return {
        MODES,
        TIMER_RING_RADIUS,
        TIMER_CIRCUMFERENCE,
        clampZoom,
        formatTimeDisplay,
        calcProgressOffset,
        createTimerEndAt,
        calcTimeLeftFromEnd,
        buildModes
    };
}));
