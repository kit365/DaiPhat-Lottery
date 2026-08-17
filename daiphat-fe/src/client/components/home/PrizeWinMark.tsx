'use client';

import {
    Award,
    Coins,
    Crown,
    Gem,
    HeartPulse,
    Medal,
    ScanLine,
    Sparkles,
    Star,
    Ticket,
    Trophy,
    type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PRIZE_CELEBRATION_META, type WinPrizeCode } from './ticketWinCelebration.util';

const PRIZE_ICONS: Record<WinPrizeCode, LucideIcon> = {
    DB: Crown,
    G1: Trophy,
    G2: Medal,
    G3: Award,
    G4: Star,
    G5: Sparkles,
    G6: Gem,
    G7: Ticket,
    G8: Coins,
};

type PrizeWinMarkProps = {
    prizeCode: WinPrizeCode;
    suspense?: boolean;
};

export function PrizeWinMark({ prizeCode, suspense = false }: PrizeWinMarkProps) {
    const meta = PRIZE_CELEBRATION_META[prizeCode];
    const Icon = PRIZE_ICONS[prizeCode];
    const epic = prizeCode === 'DB' || prizeCode === 'G1';

    if (suspense) {
        const PulseIcon = prizeCode === 'DB' ? HeartPulse : ScanLine;
        return (
            <div className="relative mx-auto mb-3 h-[72px] w-[72px]">
                {[0, 1, 2].map((i) => (
                    <motion.span
                        key={i}
                        className={`absolute inset-0 rounded-full border ${meta.ringClass}`}
                        initial={{ scale: 0.55, opacity: 0.55 }}
                        animate={{ scale: 1.55, opacity: 0 }}
                        transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.45, ease: 'easeOut' }}
                    />
                ))}
                <div
                    className="absolute inset-3 flex items-center justify-center rounded-full shadow-inner"
                    style={{ background: `linear-gradient(160deg, ${meta.sealFrom}, ${meta.sealTo})` }}
                >
                    <motion.div
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <PulseIcon className="h-7 w-7 text-white" strokeWidth={2.25} />
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative mx-auto mb-2 h-[76px] w-[76px]">
            <motion.div
                className="absolute -inset-2 rounded-full bg-white/40 blur-md"
                animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.92, 1.06, 0.92] }}
                transition={{ duration: epic ? 1.2 : 1.8, repeat: Infinity }}
            />
            <motion.div
                className={`absolute inset-0 rounded-full border-[1.5px] border-dashed ${meta.ringClass}`}
                animate={{ rotate: 360 }}
                transition={{ duration: epic ? 7 : 12, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
                className={`absolute inset-[7px] rounded-full border ${meta.ringClass} opacity-50`}
                animate={{ rotate: -360 }}
                transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            />
            <div
                className="absolute inset-[14px] flex items-center justify-center rounded-full shadow-[0_8px_18px_rgba(0,0,0,0.18)]"
                style={{ background: `linear-gradient(165deg, ${meta.sealFrom}, ${meta.sealTo})` }}
            >
                <motion.div
                    animate={epic ? { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] } : { y: [0, -2, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <Icon className={`h-6 w-6 ${meta.iconClass}`} strokeWidth={2.2} />
                </motion.div>
            </div>
            <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 6.5, repeat: Infinity, ease: 'linear' }}
            >
                <Star className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 text-amber-400" fill="currentColor" strokeWidth={0} />
                <Star className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 text-amber-300" fill="currentColor" strokeWidth={0} />
                <Star className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 text-amber-500" fill="currentColor" strokeWidth={0} />
            </motion.div>
        </div>
    );
}
