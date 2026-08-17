'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    type WinPrizeCode,
    PRIZE_CELEBRATION_META,
    PRIZE_REVEAL_DELAY_MS,
} from './ticketWinCelebration.util';
import { startPrizeScreenEffect } from './ticketWinConfetti';

type TicketWinScreenEffectsProps = {
    active: boolean;
    prizeCode: WinPrizeCode;
};

const PrizeGlowOverlay = ({ prizeCode, revealed }: { prizeCode: WinPrizeCode; revealed: boolean }) => {
    const meta = PRIZE_CELEBRATION_META[prizeCode];
    const isEpic = prizeCode === 'DB' || prizeCode === 'G1';

    return (
        <motion.div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${meta.glowClass}`}
            animate={{
                opacity: revealed
                    ? isEpic
                        ? [0.55, 0.95, 0.55]
                        : [0.32, 0.6, 0.32]
                    : [0.12, 0.28, 0.12],
            }}
            transition={{ duration: revealed && isEpic ? 1.4 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
    );
};

export const TicketWinScreenEffects = ({ active, prizeCode }: TicketWinScreenEffectsProps) => {
    const revealDelay = PRIZE_REVEAL_DELAY_MS[prizeCode];
    const [flash, setFlash] = useState(false);
    const [revealed, setRevealed] = useState(revealDelay === 0);

    useEffect(() => {
        if (!active) {
            setFlash(false);
            setRevealed(revealDelay === 0);
            return;
        }

        const controller = startPrizeScreenEffect(prizeCode);
        setRevealed(revealDelay === 0);
        const revealTimer =
            revealDelay > 0 ? window.setTimeout(() => setRevealed(true), revealDelay) : undefined;
        const flashTimer =
            revealDelay > 0
                ? window.setTimeout(() => {
                      setFlash(true);
                      window.setTimeout(() => setFlash(false), 420);
                  }, revealDelay)
                : undefined;

        return () => {
            controller.stop();
            if (revealTimer) window.clearTimeout(revealTimer);
            if (flashTimer) window.clearTimeout(flashTimer);
        };
    }, [active, prizeCode, revealDelay]);

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
                    <PrizeGlowOverlay prizeCode={prizeCode} revealed={revealed} />
                    <AnimatePresence>
                        {flash && (
                            <motion.div
                                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,248,220,0.95),rgba(255,255,255,0.55)_42%,transparent_72%)]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18 }}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
