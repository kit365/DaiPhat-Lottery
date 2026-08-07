'use client';

import { motion } from 'framer-motion';

interface FortuneStickCardProps {
  luckyTail: string;
  reveal?: boolean;
  className?: string;
  compact?: boolean;
  /** Larger card for result panel */
  large?: boolean;
}

export function FortuneStickCard({
  luckyTail,
  reveal = true,
  className = '',
  compact = false,
  large = false,
}: FortuneStickCardProps) {
  const widthClass = compact
    ? 'max-w-[170px]'
    : large
      ? 'max-w-[320px] sm:max-w-[360px] lg:max-w-[380px]'
      : 'max-w-[220px]';
  const padClass = compact ? 'px-4 py-5' : large ? 'px-7 py-10 sm:py-12' : 'px-5 py-7';
  const numberClass = compact ? 'text-5xl' : large ? 'text-8xl sm:text-9xl' : 'text-6xl';
  const sealClass = compact ? 'text-2xl' : large ? 'text-4xl sm:text-5xl' : 'text-2xl';
  const labelClass = compact ? 'text-[10px]' : large ? 'text-[13px] sm:text-[14px]' : 'text-[10px]';
  const footerClass = compact ? 'text-[11px]' : large ? 'text-[14px] sm:text-[15px]' : 'text-[11px]';

  return (
    <motion.div
      className={`relative mx-auto w-full ${widthClass} ${className}`}
      initial={reveal ? { opacity: 0.55, y: 18, rotate: -6, scale: 0.94 } : false}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {/* Halo */}
      <div className={`absolute rounded-[40%] bg-amber-400/30 blur-2xl ${large ? '-inset-8' : '-inset-6'}`} />

      <div
        className={`relative overflow-hidden rounded-[22px] border-[3px] border-amber-500 text-center ${padClass}`}
        style={{
          background:
            'linear-gradient(165deg, #FFF6E0 0%, #F2D089 38%, #D4A24A 72%, #A16207 100%)',
          boxShadow:
            '0 18px 40px rgba(120,53,15,0.28), inset 0 2px 6px rgba(255,255,255,0.65), inset 0 -8px 16px rgba(120,53,15,0.22)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-700 via-red-500 to-red-700" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-red-700 via-red-500 to-red-700" />

        <p className={`${labelClass} font-extrabold uppercase tracking-[0.22em] text-amber-950 mb-1`}>
          Đuôi may mắn
        </p>

        <div className={`flex items-center justify-center gap-3 ${large ? 'my-3 gap-4' : 'my-2'}`}>
          <span
            className={`${sealClass} font-serif font-black text-red-900`}
            style={{ writingMode: 'vertical-rl' }}
          >
            吉
          </span>

          <motion.span
            className={`font-black text-[#5C1A0A] leading-none tracking-tight tabular-nums ${numberClass}`}
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
            className={`${sealClass} font-serif font-black text-red-900`}
            style={{ writingMode: 'vertical-rl' }}
          >
            祥
          </span>
        </div>

        <p className={`${footerClass} font-bold text-amber-950/80 tracking-wide`}>Thẻ xăm Đại Phát</p>
      </div>
    </motion.div>
  );
}
