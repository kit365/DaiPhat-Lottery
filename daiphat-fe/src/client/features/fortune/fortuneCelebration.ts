import confetti, { type Options as ConfettiOptions } from 'canvas-confetti';

type Origin = { x: number; y: number };

type EffectController = {
  stop: () => void;
};

const GOLD_RED = ['#FFD700', '#F59E0B', '#ee1314', '#FFF7ED', '#FBBF24', '#FFFFFF'];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const fire = (options: ConfettiOptions) =>
  confetti({
    disableForReducedMotion: true,
    zIndex: 80,
    ...options,
  });

export function originFromElement(el: HTMLElement | null, mouthY = 0.32): Origin {
  if (!el) return { x: 0.5, y: 0.42 };
  const rect = el.getBoundingClientRect();
  return {
    x: (rect.left + rect.width * 0.5) / window.innerWidth,
    y: (rect.top + rect.height * mouthY) / window.innerHeight,
  };
}

/** Gold dust rising from the jar mouth while shaking. */
export function startFortuneShakeSparkles(getOrigin: () => Origin): EffectController {
  if (prefersReducedMotion()) return { stop: () => undefined };

  const tick = () => {
    const origin = getOrigin();
    fire({
      particleCount: 5,
      spread: 46,
      startVelocity: 18,
      gravity: 0.85,
      ticks: 90,
      scalar: 0.55,
      origin,
      colors: GOLD_RED,
      shapes: ['circle'],
    });
  };

  tick();
  const id = window.setInterval(tick, 160);
  return {
    stop: () => window.clearInterval(id),
  };
}

/** Burst when the winning stick flies out. */
export function fireFortuneEjectBurst(origin: Origin) {
  if (prefersReducedMotion()) return;
  fire({
    particleCount: 70,
    spread: 78,
    startVelocity: 36,
    origin,
    colors: GOLD_RED,
    scalar: 0.85,
  });
  fire({
    particleCount: 28,
    spread: 50,
    startVelocity: 22,
    gravity: 0.7,
    origin: { x: origin.x, y: origin.y - 0.04 },
    colors: ['#FFD700', '#FFF7ED'],
    shapes: ['star', 'circle'],
    scalar: 0.7,
  });
}

/** Short gold/red fireworks when a fresh cast result appears. */
export function startFortuneResultFireworks(): EffectController {
  if (prefersReducedMotion()) return { stop: () => undefined };

  const stops: Array<() => void> = [];

  fire({
    particleCount: 120,
    spread: 100,
    startVelocity: 48,
    origin: { y: 0.58 },
    colors: GOLD_RED,
  });
  fire({ particleCount: 8, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: GOLD_RED });
  fire({ particleCount: 8, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: GOLD_RED });

  const burstId = window.setInterval(() => {
    fire({
      particleCount: 42,
      spread: 80 + Math.random() * 30,
      startVelocity: 32 + Math.random() * 14,
      origin: { x: 0.18 + Math.random() * 0.64, y: 0.18 + Math.random() * 0.32 },
      colors: GOLD_RED,
      scalar: 0.85 + Math.random() * 0.25,
    });
  }, 420);

  const endId = window.setTimeout(() => {
    window.clearInterval(burstId);
  }, 2400);

  stops.push(() => window.clearInterval(burstId), () => window.clearTimeout(endId));

  return {
    stop: () => {
      stops.forEach((stop) => stop());
      confetti.reset();
    },
  };
}

export function rattleDevice(pattern: number | number[] = [35, 25, 35, 25, 70]) {
  if (typeof navigator === 'undefined' || prefersReducedMotion()) return;
  navigator.vibrate?.(pattern);
}
