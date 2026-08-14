'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TicketCheckResult } from '@/client/types/lottery';
import {
    getHighestPrizeCode,
    PRIZE_CELEBRATION_META,
} from './ticketWinCelebration.util';

type TicketWinCelebrationProps = {
    checkResult: TicketCheckResult;
};

export const TicketWinCelebration = ({ checkResult }: TicketWinCelebrationProps) => {
    const prizeCode = getHighestPrizeCode(checkResult.matchedPrizes);
    const meta = PRIZE_CELEBRATION_META[prizeCode];
    const isEpic = prizeCode === 'DB';
    const isLarge = prizeCode === 'G1' || prizeCode === 'G2';

    return (
        <motion.div
            className="relative z-10 flex flex-col gap-3"
            initial={isEpic ? { scale: 0.9, opacity: 0 } : { opacity: 0, y: 8 }}
            animate={isEpic ? { scale: 1, opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
        >
            <div
                className={`relative overflow-hidden rounded-xl border p-4 text-center ${meta.bannerClass} ${
                    isEpic ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''
                }`}
            >
                <motion.span
                    className="relative z-10 mb-1 block text-[28px]"
                    animate={
                        isEpic || isLarge
                            ? { scale: [1, 1.18, 1], rotate: [0, -6, 6, 0] }
                            : { y: [0, -5, 0] }
                    }
                    transition={{
                        duration: isEpic ? 1.1 : 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    {meta.emoji}
                </motion.span>

                <h4 className={`relative z-10 text-[14px] font-black ${meta.titleClass}`}>
                    {meta.title}
                </h4>
                <p className={`relative z-10 mt-1 text-[11px] ${meta.subtitleClass}`}>
                    {meta.subtitle}
                </p>

                {isEpic && (
                    <motion.div
                        className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-amber-300/70"
                        animate={{ opacity: [0.35, 0.95, 0.35] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                    />
                )}
            </div>

            <div className="flex max-h-[160px] flex-col gap-2 overflow-y-auto pr-1">
                {checkResult.matchedPrizes.map((prize, idx) => (
                    <motion.div
                        key={`${prize.prizeCode}-${prize.winningNumber}-${idx}`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${meta.prizeCardClass}`}
                    >
                        <div>
                            <div className="text-[12.5px] font-bold text-slate-800">
                                {prize.prizeDisplayName}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                                Số trúng:{' '}
                                <span className="font-bold text-[#ee1314]">{prize.winningNumber}</span>
                            </div>
                        </div>
                        <div className="text-[13px] font-extrabold text-[#ee1314]">
                            {(prize.prizeValue || 0).toLocaleString('vi-VN')}đ
                        </div>
                    </motion.div>
                ))}
            </div>

            {checkResult.matchedPrizes.length > 1 && (
                <div className="flex items-center justify-between rounded-xl border border-[#ee1314]/10 bg-gradient-to-r from-[#ee1314]/5 to-[#ee1314]/10 p-4">
                    <span className="text-[12px] font-bold text-slate-700">Tổng giải thưởng:</span>
                    <span className="text-[14.5px] font-black text-[#ee1314]">
                        {(checkResult.totalWinningAmount || 0).toLocaleString('vi-VN')}đ
                    </span>
                </div>
            )}
        </motion.div>
    );
};
