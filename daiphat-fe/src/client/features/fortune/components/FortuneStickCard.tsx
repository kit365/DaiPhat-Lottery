'use client';

import { motion } from 'framer-motion';

interface FortuneStickCardProps {
  luckyTail: string;
  reveal?: boolean;
  className?: string;
}

export function FortuneStickCard({ luckyTail, reveal = true, className = '' }: FortuneStickCardProps) {
  return (
    <motion.div
      className={`relative mx-auto w-full max-w-[220px] ${className}`}
      initial={reveal ? { opacity: 0.55, y: 18, rotate: -6, scale: 0.94 } : false}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {/* Halo */}
      <div className="absolute -inset-6 rounded-[40%] bg-amber-400/30 blur-2xl" />

      <div
        className="relative overflow-hidden rounded-[22px] border-[3px] border-amber-500 px-5 py-7 text-center"
        style={{
          background:
            'linear-gradient(165deg, #FFF6E0 0%, #F2D089 38%, #D4A24A 72%, #A16207 100%)',
          boxShadow:
            '0 18px 40px rgba(120,53,15,0.28), inset 0 2px 6px rgba(255,255,255,0.65), inset 0 -8px 16px rgba(120,53,15,0.22)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-700 via-red-500 to-red-700" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-red-700 via-red-500 to-red-700" />

        <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-amber-950 mb-1">
          Đuôi may mắn
        </p>

        <div className="flex items-center justify-center gap-3 my-2">
          <span
            className="text-2xl font-serif font-black text-red-900"
            style={{ writingMode: 'vertical-rl' }}
          >
            吉
          </span>

          <motion.span
            className="text-6xl font-black text-[#5C1A0A] leading-none tracking-tight tabular-nums"
            style={{
              textShadow:
                '0 1px 0 rgba(255,255,255,0.7), 0 2px 0 rgba(120,53,15,0.35), 0 8px 18px rgba(0,0,0,0.15)',
            }}
            initial={reveal ? { scale: 0.85, opacity: 0.7 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 16 }}
          >
            {luckyTail}
          </motion.span>

          <span
            className="text-2xl font-serif font-black text-red-900"
            style={{ writingMode: 'vertical-rl' }}
          >
            祥
          </span>
        </div>

        <p className="text-[11px] font-bold text-amber-950/80 tracking-wide">Thẻ xăm Đại Phát</p>
      </div>
    </motion.div>
  );
}
