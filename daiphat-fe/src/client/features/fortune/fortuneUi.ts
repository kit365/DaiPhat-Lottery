export const ELEMENT_UI: Record<string, { label: string; emoji: string }> = {
  METAL: { label: 'Kim', emoji: '🪙' },
  WOOD: { label: 'Mộc', emoji: '🌳' },
  WATER: { label: 'Thủy', emoji: '💧' },
  FIRE: { label: 'Hỏa', emoji: '🔥' },
  EARTH: { label: 'Thổ', emoji: '⛰️' },
};

export function elementUi(value?: string | null) {
  if (!value) return { label: '—', emoji: '✨' };
  return ELEMENT_UI[value] || { label: value, emoji: '✨' };
}

export function msUntilNextLocalMidnight(from = new Date()): number {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - from.getTime());
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export type JarSceneMode = 'idle' | 'shaking' | 'ejecting' | 'settled';

export type FortuneAnimPhase =
  | 'idle'
  | 'shaking'
  | 'ejecting'
  | 'revealing'
  | 'result'
  | 'error';

export const SHAKE_DURATION_MS = 1800;
export const EJECT_DURATION_MS = 1100;
/** Kept for types/compat; reveal is folded into result (no blank mid-frame). */
export const REVEAL_DURATION_MS = 0;
