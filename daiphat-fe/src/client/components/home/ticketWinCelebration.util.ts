import { TicketMatchedPrize } from '@/client/types/lottery';

export const WIN_PRIZE_CODES = ['DB', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'] as const;
export type WinPrizeCode = (typeof WIN_PRIZE_CODES)[number];

export const PRIZE_RANK: Record<WinPrizeCode, number> = {
    DB: 8,
    G1: 7,
    G2: 6,
    G3: 5,
    G4: 4,
    G5: 3,
    G6: 2,
    G7: 1,
    G8: 0,
};

const normalizePrizeCode = (code?: string): WinPrizeCode | null => {
    const upper = code?.toUpperCase();
    if (!upper || !(upper in PRIZE_RANK)) {
        return null;
    }
    return upper as WinPrizeCode;
};

export const getHighestPrizeCode = (prizes: TicketMatchedPrize[]): WinPrizeCode => {
    if (prizes.length === 0) {
        return 'G8';
    }

    return prizes.reduce<WinPrizeCode>((best, prize) => {
        const code = normalizePrizeCode(prize.prizeCode);
        if (!code) return best;
        return PRIZE_RANK[code] > PRIZE_RANK[best] ? code : best;
    }, 'G8');
};

/** Delay before the big reveal / fireworks boom. Higher prizes wait longer. */
export const PRIZE_REVEAL_DELAY_MS: Record<WinPrizeCode, number> = {
    DB: 2000,
    G1: 1300,
    G2: 650,
    G3: 220,
    G4: 120,
    G5: 0,
    G6: 0,
    G7: 0,
    G8: 0,
};

export type PrizeCelebrationMeta = {
    title: string;
    subtitle: string;
    bannerClass: string;
    titleClass: string;
    subtitleClass: string;
    prizeCardClass: string;
    glowClass: string;
    sealFrom: string;
    sealTo: string;
    ringClass: string;
    iconClass: string;
};

export const PRIZE_CELEBRATION_META: Record<WinPrizeCode, PrizeCelebrationMeta> = {
    DB: {
        title: 'Giải Đặc Biệt',
        subtitle: 'Bạn vừa trúng giải cao nhất.',
        bannerClass:
            'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100 border-amber-300 shadow-[0_0_48px_rgba(245,158,11,0.45)]',
        titleClass: 'text-amber-900',
        subtitleClass: 'text-amber-700',
        prizeCardClass: 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50',
        glowClass: 'from-amber-400/25 via-yellow-300/10 to-transparent',
        sealFrom: '#FDE68A',
        sealTo: '#B45309',
        ringClass: 'border-amber-400',
        iconClass: 'text-white',
    },
    G1: {
        title: 'Giải Nhất',
        subtitle: 'Một phần thưởng cực lớn đang chờ bạn.',
        bannerClass:
            'bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 border-red-300 shadow-[0_0_36px_rgba(238,19,20,0.28)]',
        titleClass: 'text-[#b91c1c]',
        subtitleClass: 'text-red-600',
        prizeCardClass: 'border-red-100 bg-gradient-to-r from-red-50/80 to-orange-50/80',
        glowClass: 'from-[#ee1314]/20 via-rose-300/10 to-transparent',
        sealFrom: '#FCA5A5',
        sealTo: '#ee1314',
        ringClass: 'border-red-400',
        iconClass: 'text-white',
    },
    G2: {
        title: 'Giải Nhì',
        subtitle: 'Phần thưởng ấn tượng, chúc mừng bạn.',
        bannerClass:
            'bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 border-orange-200 shadow-[0_0_28px_rgba(249,115,22,0.22)]',
        titleClass: 'text-orange-900',
        subtitleClass: 'text-orange-700',
        prizeCardClass: 'border-orange-100 bg-gradient-to-r from-orange-50/70 to-amber-50/70',
        glowClass: 'from-orange-400/18 via-amber-200/10 to-transparent',
        sealFrom: '#FDBA74',
        sealTo: '#C2410C',
        ringClass: 'border-orange-400',
        iconClass: 'text-white',
    },
    G3: {
        title: 'Giải Ba',
        subtitle: 'Bạn đã trúng giải lớn.',
        bannerClass:
            'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.2)]',
        titleClass: 'text-emerald-900',
        subtitleClass: 'text-emerald-700',
        prizeCardClass: 'border-emerald-100 bg-emerald-50/60',
        glowClass: 'from-emerald-400/18 via-teal-200/10 to-transparent',
        sealFrom: '#6EE7B7',
        sealTo: '#047857',
        ringClass: 'border-emerald-400',
        iconClass: 'text-white',
    },
    G4: {
        title: 'Giải Tư',
        subtitle: 'Một chiến thắng đáng tự hào.',
        bannerClass:
            'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200 shadow-[0_0_22px_rgba(59,130,246,0.18)]',
        titleClass: 'text-sky-900',
        subtitleClass: 'text-sky-700',
        prizeCardClass: 'border-sky-100 bg-sky-50/60',
        glowClass: 'from-sky-400/16 via-blue-200/10 to-transparent',
        sealFrom: '#7DD3FC',
        sealTo: '#0369A1',
        ringClass: 'border-sky-400',
        iconClass: 'text-white',
    },
    G5: {
        title: 'Giải Năm',
        subtitle: 'Phần thưởng xứng đáng với vé của bạn.',
        bannerClass:
            'bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 shadow-[0_0_20px_rgba(139,92,246,0.18)]',
        titleClass: 'text-violet-900',
        subtitleClass: 'text-violet-700',
        prizeCardClass: 'border-violet-100 bg-violet-50/60',
        glowClass: 'from-violet-400/16 via-purple-200/10 to-transparent',
        sealFrom: '#C4B5FD',
        sealTo: '#6D28D9',
        ringClass: 'border-violet-400',
        iconClass: 'text-white',
    },
    G6: {
        title: 'Giải Sáu',
        subtitle: 'Niềm vui nhỏ nhưng thật ngọt ngào.',
        bannerClass:
            'bg-gradient-to-r from-cyan-50 to-teal-50 border-cyan-200 shadow-[0_0_18px_rgba(6,182,212,0.16)]',
        titleClass: 'text-cyan-900',
        subtitleClass: 'text-cyan-700',
        prizeCardClass: 'border-cyan-100 bg-cyan-50/60',
        glowClass: 'from-cyan-400/14 via-teal-200/8 to-transparent',
        sealFrom: '#67E8F9',
        sealTo: '#0E7490',
        ringClass: 'border-cyan-400',
        iconClass: 'text-white',
    },
    G7: {
        title: 'Giải Bảy',
        subtitle: 'May mắn đã mỉm cười với bạn.',
        bannerClass:
            'bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.14)]',
        titleClass: 'text-pink-900',
        subtitleClass: 'text-pink-700',
        prizeCardClass: 'border-pink-100 bg-pink-50/60',
        glowClass: 'from-pink-400/14 via-rose-200/8 to-transparent',
        sealFrom: '#F9A8D4',
        sealTo: '#BE185D',
        ringClass: 'border-pink-400',
        iconClass: 'text-white',
    },
    G8: {
        title: 'Giải Tám',
        subtitle: 'Dù là giải nhỏ, vẫn là niềm vui.',
        bannerClass:
            'bg-gradient-to-r from-lime-50 to-green-50 border-lime-200 shadow-[0_0_14px_rgba(132,204,22,0.14)]',
        titleClass: 'text-lime-900',
        subtitleClass: 'text-lime-700',
        prizeCardClass: 'border-lime-100 bg-lime-50/60',
        glowClass: 'from-lime-400/12 via-green-200/8 to-transparent',
        sealFrom: '#BEF264',
        sealTo: '#4D7C0F',
        ringClass: 'border-lime-500',
        iconClass: 'text-white',
    },
};

/** @deprecated dùng getHighestPrizeCode + PRIZE_CELEBRATION_META */
export type WinCelebrationTier = 'jackpot' | 'major' | 'mid' | 'minor' | 'consolation';

/** @deprecated */
export const getWinCelebrationTier = (prizes: TicketMatchedPrize[]): WinCelebrationTier => {
    const code = getHighestPrizeCode(prizes);
    if (code === 'DB') return 'jackpot';
    if (code === 'G1' || code === 'G2') return 'major';
    if (code === 'G3' || code === 'G4') return 'mid';
    if (code === 'G5' || code === 'G6') return 'minor';
    return 'consolation';
};
