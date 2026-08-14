'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TicketCheckResult } from '@/client/types/lottery';
import {
    getHighestPrizeCode,
    PRIZE_CELEBRATION_META,
    PRIZE_REVEAL_DELAY_MS,
} from './ticketWinCelebration.util';
import { PrizeWinMark } from './PrizeWinMark';

type TicketWinCelebrationProps = {
    checkResult: TicketCheckResult;
};

export const TicketWinCelebration = ({ checkResult }: TicketWinCelebrationProps) => {
    const prizeCode = getHighestPrizeCode(checkResult.matchedPrizes);
    const meta = PRIZE_CELEBRATION_META[prizeCode];
    const isEpic = prizeCode === 'DB';
    const isLarge = prizeCode === 'G1' || prizeCode === 'G2';
    const revealDelay = PRIZE_REVEAL_DELAY_MS[prizeCode];
    const [revealed, setRevealed] = useState(revealDelay === 0);

    useEffect(() => {
        if (revealDelay === 0) {
            setRevealed(true);
            return;
        }
        setRevealed(false);
        const timer = window.setTimeout(() => setRevealed(true), revealDelay);
        return () => window.clearTimeout(timer);
    }, [revealDelay, prizeCode]);

    return (
        <div className="relative z-10 flex min-h-[220px] flex-col gap-3">
            <AnimatePresence mode="wait">
                {!revealed ? (
                    <motion.div
                        key="suspense"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.06 }}
                        transition={{ duration: 0.28 }}
                        className={`rounded-xl border p-6 text-center ${
                            isEpic
                                ? 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50'
                                : 'border-red-100 bg-gradient-to-br from-red-50 via-white to-orange-50'
                        }`}
                    >
                        <PrizeWinMark prizeCode={prizeCode} suspense />
                        <motion.p
                            className="text-[14px] font-black text-slate-800"
                            animate={{ opacity: [0.45, 1, 0.45] }}
                            transition={{ duration: 1.1, repeat: Infinity }}
                        >
                            {isEpic ? 'Khoan đã… tim đang đập mạnh' : 'Khoan đã… có vẻ may mắn rồi'}
                        </motion.p>
                        <p className="mt-1 text-[11px] text-slate-500">Đừng nháy mắt.</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="reveal"
                        className="flex flex-col gap-3"
                        initial={isEpic || isLarge ? { scale: 0.72, opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={isEpic || isLarge ? { scale: [0.72, 1.08, 1], opacity: 1 } : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div
                            className={`relative overflow-hidden rounded-xl border p-4 text-center ${meta.bannerClass} ${
                                isEpic ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''
                            }`}
                        >
                            <PrizeWinMark prizeCode={prizeCode} />

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
                )}
            </AnimatePresence>
        </div>
    );
};
