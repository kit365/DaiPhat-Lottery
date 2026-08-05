'use client';

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { JarSceneMode } from '../fortuneUi';

type StickConfig = {
  id: number;
  leftPct: number;
  height: number;
  tilt: number;
  z: number;
  delay: number;
  isWinner?: boolean;
};

const BASE_STICKS: Omit<StickConfig, 'isWinner'>[] = [
  { id: 0, leftPct: 8, height: 72, tilt: -18, z: 2, delay: 0.02 },
  { id: 1, leftPct: 14, height: 86, tilt: -14, z: 3, delay: 0.05 },
  { id: 2, leftPct: 20, height: 78, tilt: -11, z: 4, delay: 0.08 },
  { id: 3, leftPct: 26, height: 94, tilt: -8, z: 5, delay: 0.03 },
  { id: 4, leftPct: 32, height: 82, tilt: -5, z: 6, delay: 0.11 },
  { id: 5, leftPct: 37, height: 100, tilt: -3, z: 7, delay: 0.01 },
  { id: 6, leftPct: 42, height: 88, tilt: -1, z: 8, delay: 0.07 },
  { id: 7, leftPct: 47, height: 108, tilt: 0, z: 12, delay: 0 },
  { id: 8, leftPct: 52, height: 90, tilt: 2, z: 9, delay: 0.09 },
  { id: 9, leftPct: 57, height: 98, tilt: 4, z: 8, delay: 0.04 },
  { id: 10, leftPct: 62, height: 84, tilt: 6, z: 7, delay: 0.12 },
  { id: 11, leftPct: 67, height: 96, tilt: 9, z: 6, delay: 0.06 },
  { id: 12, leftPct: 72, height: 80, tilt: 12, z: 5, delay: 0.1 },
  { id: 13, leftPct: 77, height: 92, tilt: 14, z: 4, delay: 0.03 },
  { id: 14, leftPct: 82, height: 76, tilt: 16, z: 3, delay: 0.08 },
  { id: 15, leftPct: 87, height: 88, tilt: 18, z: 2, delay: 0.05 },
  { id: 16, leftPct: 17, height: 70, tilt: -16, z: 1, delay: 0.14 },
  { id: 17, leftPct: 55, height: 74, tilt: 3, z: 1, delay: 0.13 },
  { id: 18, leftPct: 70, height: 68, tilt: 10, z: 1, delay: 0.15 },
];

const WINNER_ID = 7;

export interface FortuneJarSceneProps {
  mode: JarSceneMode;
  winningTail?: string | null;
  onEjectComplete?: () => void;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

function Stick({
  stick,
  mode,
  winningTail,
}: {
  stick: StickConfig;
  mode: JarSceneMode;
  winningTail?: string | null;
}) {
  const isWinner = Boolean(stick.isWinner);
  const shaking = mode === 'shaking';
  const ejecting = mode === 'ejecting' && isWinner;
  const hideWinnerInMouth = (mode === 'ejecting' || mode === 'settled') && isWinner;

  if (hideWinnerInMouth && !ejecting) {
    return null;
  }

  const idleY: number[] = [0, -4, 0];
  const shakeY: number[] = [0, -32 - (stick.id % 7) * 2, 6, -48 - (stick.id % 5) * 3, 0];

  return (
    <motion.div
      className="absolute bottom-[38%] origin-bottom"
      style={{
        left: `${stick.leftPct}%`,
        zIndex: ejecting ? 50 : stick.z,
        width: isWinner ? 15 : 11,
      }}
      initial={false}
      animate={
        ejecting
          ? {
              y: [0, -160, -70, 150],
              x: [0, 24, 70, 96],
              rotate: [stick.tilt, -35, 40, 95],
              scale: [1, 1.25, 1.3, 1.1],
              opacity: [1, 1, 1, 0],
            }
          : shaking
            ? {
                y: shakeY,
                rotate: [stick.tilt, stick.tilt - 10, stick.tilt + 12, stick.tilt],
              }
            : {
                y: idleY,
                rotate: stick.tilt,
                x: 0,
                scale: 1,
                opacity: 1,
              }
      }
      transition={
        ejecting
          ? { duration: 1.1, times: [0, 0.25, 0.5, 1], ease: [0.2, 0.85, 0.25, 1] }
          : shaking
            ? {
                duration: 0.38 + stick.delay,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: stick.delay,
              }
            : { duration: 2.8 + stick.delay * 4, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <div
        className={`relative mx-auto rounded-t-md border-t-[3px] shadow-md ${
          isWinner
            ? 'border-red-600 bg-gradient-to-b from-[#FFF6E0] via-[#F0C87A] to-[#BE8742]'
            : 'border-red-700/90 bg-gradient-to-b from-[#FFF1D6] via-[#E2AF72] to-[#9A6328]'
        }`}
        style={{
          height: stick.height,
          width: '100%',
          boxShadow: isWinner
            ? '0 4px 14px rgba(180,83,9,0.45), inset 0 1px 2px rgba(255,255,255,0.5)'
            : 'inset 0 1px 1px rgba(255,255,255,0.35)',
        }}
      >
        <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-700" />
        {isWinner && ejecting && (
          <span
            className="absolute inset-x-0 top-5 text-center text-[9px] font-black text-red-800"
            style={{ writingMode: 'vertical-rl' }}
          >
            吉
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function FortuneJarScene({
  mode,
  winningTail,
  onEjectComplete,
  onClick,
  className = '',
  compact = false,
}: FortuneJarSceneProps) {
  const sticks = useMemo<StickConfig[]>(
    () =>
      BASE_STICKS.map((s) => ({
        ...s,
        isWinner: s.id === WINNER_ID,
      })),
    []
  );

  useEffect(() => {
    if (mode !== 'ejecting' || !onEjectComplete) return;
    const t = window.setTimeout(() => onEjectComplete(), 1100);
    return () => window.clearTimeout(t);
  }, [mode, onEjectComplete]);

  const shaking = mode === 'shaking';
  const interactive = Boolean(onClick) && mode === 'idle';

  return (
    <div className={`relative w-full mx-auto ${compact ? 'max-w-[260px]' : 'max-w-[360px]'} ${className}`}>
      <motion.button
        type="button"
        onClick={interactive ? onClick : undefined}
        disabled={!interactive}
        whileHover={interactive ? { scale: 1.02, y: -2 } : undefined}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        className="relative w-full aspect-[4/5] bg-transparent border-0 p-0 disabled:cursor-default cursor-pointer select-none"
        aria-label="Ống quẻ tài lộc"
      >
        {/* Glow */}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 h-52 rounded-full bg-amber-400/35 blur-3xl" />

        {/* Sticks cluster (clipped by jar mouth visually via layering) */}
        <div className="absolute inset-x-[14%] top-[6%] bottom-[38%] overflow-visible">
          {sticks.map((stick) => (
            <Stick key={stick.id} stick={stick} mode={mode} winningTail={winningTail} />
          ))}
        </div>

        {/* Jar body */}
        <motion.div
          animate={
            shaking
              ? { rotate: [-10, 12, -14, 14, -8, 8, 0], x: [-8, 10, -12, 10, 0] }
              : mode === 'ejecting'
                ? { rotate: [0, -6, 3, 0], x: 0 }
                : { rotate: 0, x: 0 }
          }
          transition={
            shaking
              ? { duration: 0.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.5 }
          }
          className="absolute left-1/2 bottom-[7%] z-20 w-[78%] -translate-x-1/2 h-[56%] rounded-b-[2.4rem] rounded-t-2xl overflow-hidden border border-amber-300/45"
          style={{
            background:
              'linear-gradient(145deg, #9B1C1F 0%, #D4252A 42%, #6B1012 100%)',
            boxShadow:
              '0 28px 56px rgba(80,10,10,0.55), inset 0 3px 14px rgba(255,255,255,0.3), inset 0 -14px 24px rgba(0,0,0,0.45)',
          }}
        >
          {/* Top rim */}
          <div className="absolute -top-0.5 left-[-4%] right-[-4%] h-4.5 z-30 bg-gradient-to-r from-amber-500 via-yellow-100 to-amber-500 shadow-md" />

          {/* Inner mouth dark */}
          <div className="absolute top-3.5 left-[10%] right-[10%] h-6 rounded-b-full bg-black/35 blur-[1px]" />

          {/* Medallion */}
          <div className="absolute inset-x-0 top-[27%] flex justify-center">
            <div className="w-[45%] aspect-square rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-700 p-[3px] shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-[#7A1416] to-[#4A0C0E] flex flex-col items-center justify-center border border-amber-400/50 text-amber-200">
                <span className="text-[9px] font-bold tracking-[0.16em] uppercase text-amber-300/90">
                  Đại Phát
                </span>
                <span className="text-[30px] font-serif font-black text-amber-200 leading-none my-0.5 drop-shadow">
                  福
                </span>
                <span className="text-[8px] font-bold tracking-wider uppercase text-amber-400/90">
                  Quẻ tài lộc
                </span>
              </div>
            </div>
          </div>

          {/* Bottom rim */}
          <div className="absolute -bottom-0.5 left-[-4%] right-[-4%] h-4.5 bg-gradient-to-r from-amber-500 via-yellow-100 to-amber-500 rounded-b-3xl" />
        </motion.div>

        {/* Ground shadow */}
        <div className="absolute left-1/2 bottom-[2%] h-4 w-[62%] -translate-x-1/2 rounded-full bg-black/40 blur-md" />

        {/* Ejected stick lands in front — fades in as flying stick fades out */}
        {(mode === 'ejecting' || mode === 'settled') && (
          <motion.div
            className="pointer-events-none absolute z-50"
            style={{ left: '56%', bottom: '0%', width: 28 }}
            initial={{ opacity: 0, y: -80, rotate: -20, scale: 0.9 }}
            animate={
              mode === 'ejecting'
                ? { opacity: [0, 0, 0.2, 1], y: [-80, -80, 20, 0], rotate: [-20, -20, 70, 88], scale: [0.9, 0.9, 1.15, 1] }
                : { opacity: 1, y: 0, rotate: 88, scale: 1 }
            }
            transition={{ duration: mode === 'ejecting' ? 1.1 : 0.2, times: mode === 'ejecting' ? [0, 0.45, 0.72, 1] : undefined, ease: 'easeOut' }}
          >
            <div
              className="h-40 w-[16px] rounded-md bg-gradient-to-b from-[#FFF6E0] via-[#F0C87A] to-[#A16207] border-t-4 border-red-600 shadow-2xl flex flex-col items-center pt-2"
              style={{
                boxShadow: '0 16px 32px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.55)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-red-700 mb-1" />
              <span
                className="text-[12px] font-black text-red-900 tracking-tighter"
                style={{ writingMode: 'vertical-rl' }}
              >
                吉
              </span>
              {winningTail && (
                <motion.span
                  className="mt-auto mb-3 text-[15px] font-black text-[#7C2D12]"
                  style={{ writingMode: 'vertical-rl' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: mode === 'ejecting' ? 0.85 : 0 }}
                >
                  {winningTail}
                </motion.span>
              )}
            </div>
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}
