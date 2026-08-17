import confetti, { type Options as ConfettiOptions } from 'canvas-confetti';
import { PRIZE_REVEAL_DELAY_MS, type WinPrizeCode } from './ticketWinCelebration.util';

type EffectController = {
    stop: () => void;
};

type StopBag = {
    timeout: (fn: () => void, ms: number) => void;
    interval: (fn: () => void, ms: number) => void;
    rafUntil: (fn: () => void, durationMs: number) => void;
    stop: () => void;
};

const fire = (options: ConfettiOptions) =>
    confetti({
        disableForReducedMotion: true,
        zIndex: 100001,
        ...options,
    });

const createStopBag = (): StopBag => {
    const stops: Array<() => void> = [];

    return {
        timeout: (fn, ms) => {
            const id = window.setTimeout(fn, ms);
            stops.push(() => window.clearTimeout(id));
        },
        interval: (fn, ms) => {
            const id = window.setInterval(fn, ms);
            stops.push(() => window.clearInterval(id));
        },
        rafUntil: (fn, durationMs) => {
            const end = Date.now() + durationMs;
            let frameId = 0;
            const tick = () => {
                if (Date.now() > end) return;
                fn();
                frameId = window.requestAnimationFrame(tick);
            };
            frameId = window.requestAnimationFrame(tick);
            stops.push(() => window.cancelAnimationFrame(frameId));
        },
        stop: () => {
            stops.forEach((s) => s());
            confetti.reset();
        },
    };
};

const sideCannons = (colors: string[], particleCount = 8) => {
    fire({ particleCount, angle: 60, spread: 70, origin: { x: 0, y: 0.72 }, colors, startVelocity: 55 });
    fire({ particleCount, angle: 120, spread: 70, origin: { x: 1, y: 0.72 }, colors, startVelocity: 55 });
};

const randomFirework = (colors: string[], intensity: number) => {
    fire({
        particleCount: Math.round(80 * intensity),
        spread: 100 + Math.random() * 50,
        startVelocity: 48 + Math.random() * 28,
        origin: { x: 0.12 + Math.random() * 0.76, y: 0.12 + Math.random() * 0.42 },
        colors,
        scalar: 1 + Math.random() * 0.45,
        ticks: 240,
        gravity: 0.85,
    });
};

const chargeSpark = (colors: string[], intensity = 1) => {
    fire({
        particleCount: Math.round(4 * intensity),
        spread: 36,
        startVelocity: 10 + intensity * 6,
        origin: { x: 0.5, y: 0.58 },
        gravity: 0.35,
        ticks: 90,
        scalar: 0.55 + intensity * 0.15,
        colors,
        drift: (Math.random() - 0.5) * 0.6,
    });
};

const megaBoom = (colors: string[], power = 1) => {
    const n = (count: number) => Math.round(count * power);
    fire({
        particleCount: n(260),
        spread: 170,
        startVelocity: 78,
        origin: { x: 0.5, y: 0.58 },
        colors,
        scalar: 1.4,
        ticks: 280,
        shapes: ['star', 'circle'],
    });
    fire({
        particleCount: n(180),
        spread: 100,
        startVelocity: 64,
        origin: { x: 0.18, y: 0.52 },
        colors,
        scalar: 1.15,
    });
    fire({
        particleCount: n(180),
        spread: 100,
        startVelocity: 64,
        origin: { x: 0.82, y: 0.52 },
        colors,
        scalar: 1.15,
    });
    fire({
        particleCount: n(140),
        spread: 360,
        startVelocity: 42,
        origin: { x: 0.5, y: 0.32 },
        colors,
        scalar: 1.05,
        gravity: 0.7,
    });
    sideCannons(colors, n(24));
};

const goldRain = (colors: string[]) => {
    fire({
        particleCount: 22,
        startVelocity: 28,
        spread: 180,
        origin: { x: Math.random(), y: -0.04 },
        gravity: 1.15,
        colors,
        scalar: 1.15,
        ticks: 260,
    });
};

const PRIZE_EFFECT_RUNNERS: Record<WinPrizeCode, () => EffectController> = {
    DB: () => {
        const colors = ['#FFD700', '#F59E0B', '#ee1314', '#FFF7ED', '#FFFFFF', '#FBBF24'];
        const bag = createStopBag();
        const boomAt = PRIZE_REVEAL_DELAY_MS.DB;
        let chargeLevel = 0.85;

        bag.interval(() => {
            if (chargeLevel > 0) chargeSpark(colors, chargeLevel);
        }, 120);
        bag.timeout(() => {
            chargeLevel = 1.9;
        }, 750);
        bag.timeout(() => {
            chargeLevel = 0;
        }, boomAt);

        bag.timeout(() => megaBoom(colors, 1.15), boomAt);
        bag.timeout(() => megaBoom(colors, 1.35), boomAt + 280);
        bag.timeout(() => megaBoom(colors, 1), boomAt + 620);

        bag.timeout(() => {
            bag.interval(() => randomFirework(colors, 1.7), 520);
            bag.interval(() => goldRain(colors), 180);
            bag.rafUntil(() => sideCannons(colors, 8), 9000);
        }, boomAt);

        return { stop: bag.stop };
    },

    G1: () => {
        const colors = ['#ee1314', '#F59E0B', '#FCA5A5', '#FFFFFF', '#FFD700'];
        const bag = createStopBag();
        const boomAt = PRIZE_REVEAL_DELAY_MS.G1;
        let charging = true;

        bag.interval(() => {
            if (charging) chargeSpark(colors, 0.95);
        }, 150);
        bag.timeout(() => {
            charging = false;
        }, boomAt);
        bag.timeout(() => megaBoom(colors, 0.95), boomAt);
        bag.timeout(() => megaBoom(colors, 0.8), boomAt + 240);
        bag.timeout(() => {
            bag.interval(() => randomFirework(colors, 1.35), 700);
            bag.rafUntil(() => sideCannons(colors, 6), 6500);
        }, boomAt);

        return { stop: bag.stop };
    },

    G2: () => {
        const colors = ['#F97316', '#FBBF24', '#FDE68A', '#FFFFFF', '#ee1314'];
        const bag = createStopBag();
        const boomAt = PRIZE_REVEAL_DELAY_MS.G2;
        let charging = true;

        bag.interval(() => {
            if (charging) chargeSpark(colors, 0.7);
        }, 170);
        bag.timeout(() => {
            charging = false;
        }, boomAt);
        bag.timeout(() => megaBoom(colors, 0.72), boomAt);
        bag.timeout(() => {
            bag.interval(() => randomFirework(colors, 1.1), 900);
            bag.rafUntil(() => sideCannons(colors, 4), 4500);
        }, boomAt);

        return { stop: bag.stop };
    },

    G3: () => {
        const colors = ['#10B981', '#34D399', '#A7F3D0', '#FFFFFF'];
        const bag = createStopBag();
        bag.timeout(() => {
            fire({ particleCount: 140, spread: 110, startVelocity: 58, origin: { y: 0.42 }, colors, scalar: 1.1 });
            sideCannons(colors, 8);
            bag.interval(() => randomFirework(colors, 0.95), 1100);
        }, PRIZE_REVEAL_DELAY_MS.G3);
        return { stop: bag.stop };
    },

    G4: () => {
        const colors = ['#3B82F6', '#60A5FA', '#BFDBFE', '#FFFFFF'];
        const bag = createStopBag();
        bag.timeout(() => {
            fire({ particleCount: 120, spread: 100, startVelocity: 54, origin: { y: 0.5 }, colors });
            bag.interval(() => randomFirework(colors, 0.85), 1300);
        }, PRIZE_REVEAL_DELAY_MS.G4);
        return { stop: bag.stop };
    },

    G5: () => {
        const colors = ['#8B5CF6', '#A78BFA', '#DDD6FE', '#FFFFFF'];
        const bag = createStopBag();
        fire({ particleCount: 100, spread: 92, startVelocity: 50, origin: { y: 0.54 }, colors });
        bag.interval(() => randomFirework(colors, 0.7), 1500);
        return { stop: bag.stop };
    },

    G6: () => {
        const colors = ['#06B6D4', '#22D3EE', '#A5F3FC', '#FFFFFF'];
        const bag = createStopBag();
        fire({ particleCount: 85, spread: 84, startVelocity: 46, origin: { y: 0.56 }, colors });
        bag.interval(() => randomFirework(colors, 0.6), 1700);
        return { stop: bag.stop };
    },

    G7: () => {
        const colors = ['#EC4899', '#F472B6', '#FBCFE8', '#FFFFFF'];
        const bag = createStopBag();
        fire({ particleCount: 70, spread: 76, startVelocity: 42, origin: { y: 0.58 }, colors, scalar: 0.95 });
        bag.interval(() => randomFirework(colors, 0.5), 1900);
        return { stop: bag.stop };
    },

    G8: () => {
        const colors = ['#84CC16', '#A3E635', '#D9F99D', '#FFFFFF'];
        const bag = createStopBag();
        fire({ particleCount: 55, spread: 70, startVelocity: 38, origin: { y: 0.6 }, colors, scalar: 0.9 });
        bag.interval(() => randomFirework(colors, 0.42), 2200);
        return { stop: bag.stop };
    },
};

export const startPrizeScreenEffect = (prizeCode: WinPrizeCode): EffectController => {
    const runner = PRIZE_EFFECT_RUNNERS[prizeCode] ?? PRIZE_EFFECT_RUNNERS.G8;
    return runner();
};
