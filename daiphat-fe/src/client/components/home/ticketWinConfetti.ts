import confetti, { type Options as ConfettiOptions } from 'canvas-confetti';
import type { WinPrizeCode } from './ticketWinCelebration.util';

type EffectController = {
    stop: () => void;
};

const fire = (options: ConfettiOptions) =>
    confetti({
        disableForReducedMotion: true,
        zIndex: 100001,
        ...options,
    });

const burst = (options: ConfettiOptions) => fire({ startVelocity: 42, spread: 72, ticks: 220, ...options });

const sideCannons = (colors: string[], particleCount = 4) => {
    fire({ particleCount, angle: 60, spread: 58, origin: { x: 0, y: 0.72 }, colors });
    fire({ particleCount, angle: 120, spread: 58, origin: { x: 1, y: 0.72 }, colors });
};

const randomFirework = (colors: string[], intensity: number) => {
    burst({
        particleCount: Math.round(55 * intensity),
        spread: 95 + Math.random() * 30,
        startVelocity: 38 + Math.random() * 18,
        origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.45 },
        colors,
        scalar: 0.9 + Math.random() * 0.35,
    });
};

const loop = (callback: () => void, intervalMs: number): (() => void) => {
    const id = window.setInterval(callback, intervalMs);
    return () => window.clearInterval(id);
};

const rafLoop = (callback: () => void, durationMs: number): (() => void) => {
    const end = Date.now() + durationMs;
    let frameId = 0;

    const tick = () => {
        if (Date.now() > end) return;
        callback();
        frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
};

const PRIZE_EFFECT_RUNNERS: Record<WinPrizeCode, () => EffectController> = {
    DB: () => {
        const colors = ['#FFD700', '#F59E0B', '#ee1314', '#FFF7ED', '#FFFFFF'];
        const stops: Array<() => void> = [];

        burst({ particleCount: 180, spread: 120, startVelocity: 58, origin: { y: 0.55 }, colors });
        sideCannons(colors, 6);

        stops.push(
            rafLoop(() => sideCannons(colors, 3), 7000),
            loop(() => randomFirework(colors, 1.4), 900),
            loop(() => {
                fire({
                    particleCount: 14,
                    startVelocity: 24,
                    spread: 180,
                    origin: { x: Math.random(), y: -0.05 },
                    gravity: 1.1,
                    colors,
                    scalar: 1.1,
                });
            }, 280)
        );

        return {
            stop: () => {
                stops.forEach((stop) => stop());
                confetti.reset();
            },
        };
    },

    G1: () => {
        const colors = ['#ee1314', '#F59E0B', '#FCA5A5', '#FFFFFF'];
        const stops: Array<() => void> = [];

        burst({ particleCount: 140, spread: 110, origin: { y: 0.58 }, colors });
        sideCannons(colors, 5);
        stops.push(
            loop(() => randomFirework(colors, 1.1), 1100),
            rafLoop(() => sideCannons(colors, 2), 5000)
        );

        return { stop: () => { stops.forEach((s) => s()); confetti.reset(); } };
    },

    G2: () => {
        const colors = ['#F97316', '#FBBF24', '#FDE68A', '#FFFFFF'];
        const stops: Array<() => void> = [];

        burst({ particleCount: 110, spread: 100, origin: { x: 0.35, y: 0.6 }, colors });
        const secondBurstTimer = window.setTimeout(
            () => burst({ particleCount: 90, spread: 95, origin: { x: 0.65, y: 0.6 }, colors }),
            180
        );
        stops.push(() => window.clearTimeout(secondBurstTimer));
        stops.push(loop(() => randomFirework(colors, 0.9), 1300));

        return { stop: () => { stops.forEach((s) => s()); confetti.reset(); } };
    },

    G3: () => {
        const colors = ['#10B981', '#34D399', '#A7F3D0', '#ECFDF5'];
        burst({ particleCount: 95, spread: 88, origin: { y: 0.35 }, colors });
        const stop = loop(() => {
            fire({
                particleCount: 10,
                angle: 90,
                spread: 55,
                origin: { x: Math.random(), y: 0 },
                colors,
                gravity: 0.9,
            });
        }, 420);

        return { stop: () => { stop(); confetti.reset(); } };
    },

    G4: () => {
        const colors = ['#3B82F6', '#60A5FA', '#BFDBFE', '#EFF6FF'];
        burst({ particleCount: 80, spread: 82, origin: { y: 0.52 }, colors, shapes: ['circle', 'square'] });
        const stop = loop(() => randomFirework(colors, 0.75), 1500);
        return { stop: () => { stop(); confetti.reset(); } };
    },

    G5: () => {
        const colors = ['#8B5CF6', '#A78BFA', '#DDD6FE', '#F5F3FF'];
        burst({ particleCount: 70, spread: 78, origin: { y: 0.55 }, colors });
        const stop = loop(() => {
            fire({ particleCount: 18, spread: 64, origin: { x: 0.5, y: 0.62 }, colors, scalar: 0.85 });
        }, 1600);
        return { stop: () => { stop(); confetti.reset(); } };
    },

    G6: () => {
        const colors = ['#06B6D4', '#22D3EE', '#A5F3FC', '#ECFEFF'];
        burst({ particleCount: 58, spread: 72, origin: { y: 0.58 }, colors });
        const stop = loop(() => {
            fire({ particleCount: 12, spread: 50, origin: { x: Math.random(), y: 0.7 }, colors });
        }, 1800);
        return { stop: () => { stop(); confetti.reset(); } };
    },

    G7: () => {
        const colors = ['#EC4899', '#F472B6', '#FBCFE8', '#FDF2F8'];
        burst({ particleCount: 45, spread: 66, origin: { y: 0.6 }, colors, scalar: 0.8 });
        const stop = loop(() => {
            fire({ particleCount: 8, spread: 42, origin: { x: 0.5, y: 0.65 }, colors, ticks: 160 });
        }, 2000);
        return { stop: () => { stop(); confetti.reset(); } };
    },

    G8: () => {
        const colors = ['#84CC16', '#A3E635', '#D9F99D', '#F7FEE7'];
        burst({ particleCount: 36, spread: 58, origin: { y: 0.62 }, colors, scalar: 0.75 });
        const stop = loop(() => {
            fire({ particleCount: 6, spread: 36, origin: { x: 0.5, y: 0.68 }, colors, ticks: 140 });
        }, 2400);
        return { stop: () => { stop(); confetti.reset(); } };
    },
};

export const startPrizeScreenEffect = (prizeCode: WinPrizeCode): EffectController => {
    const runner = PRIZE_EFFECT_RUNNERS[prizeCode] ?? PRIZE_EFFECT_RUNNERS.G8;
    return runner();
};
