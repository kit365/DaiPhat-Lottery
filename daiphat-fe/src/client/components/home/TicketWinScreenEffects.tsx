'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    type WinPrizeCode,
    PRIZE_CELEBRATION_META,
} from './ticketWinCelebration.util';
import { startPrizeScreenEffect } from './ticketWinConfetti';

type TicketWinScreenEffectsProps = {
    active: boolean;
    prizeCode: WinPrizeCode;
};

const PrizeGlowOverlay = ({ prizeCode }: { prizeCode: WinPrizeCode }) => {
    const meta = PRIZE_CELEBRATION_META[prizeCode];
    const isEpic = prizeCode === 'DB' || prizeCode === 'G1';

    return (
        <motion.div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${meta.glowClass}`}
            animate={{ opacity: isEpic ? [0.45, 0.85, 0.45] : [0.3, 0.55, 0.3] }}
            transition={{ duration: isEpic ? 1.8 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
    );
};

export const TicketWinScreenEffects = ({ active, prizeCode }: TicketWinScreenEffectsProps) => {
    useEffect(() => {
        if (!active) {
            return;
        }

        const controller = startPrizeScreenEffect(prizeCode);
        return () => controller.stop();
    }, [active, prizeCode]);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <AnimatePresence>
            {active && (
                <motion.div
                    key={`win-fx-${prizeCode}`}
                    className="pointer-events-none fixed inset-0 z-[100000] overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    aria-hidden
                >
                    <PrizeGlowOverlay prizeCode={prizeCode} />
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
