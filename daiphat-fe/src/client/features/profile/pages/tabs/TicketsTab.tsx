"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from 'react';
import { scrollToTop } from '../../../../../utils/scroll.util';
import {
    formatVietnameseDateTime,
    formatVietnameseDrawDate,
    normalizeDrawDateIso,
} from '../../../../utils/vietnameseDate.util';
import { todayIsoVn } from '../../../../utils/sellableDrawDate.util';
import { ClientDatePicker } from '../../../../components/ui/ClientDatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { Pagination } from '../../../../components/common/Pagination';
import { useStationsByDrawDate } from '@/client/hooks/useStationSchedule';
import { usePurchasedTicketLookup } from '../../../../hooks/usePurchasedTicketLookup';
import { normalizePagination } from '../../../../utils/pagination.util';
import {
    PurchasedTicket,
    TicketDrawResultStatus,
} from '../../../../../types/lottery-ticket.type';
import {
    canRequestPrizePayout,
    getPrizePayoutIneligibilityMessage,
    resolveTicketPayoutDisplay,
    resolveTicketPossessionDisplay,
    SERIAL_PAYOUT_STATE_LABELS,
} from '../../../../../types/prize-payout.type';
import { PrizePayoutRequestModal } from '../../../../components/prize-payout/PrizePayoutRequestModal';
import { AdminKpiCard, AdminKpiCardsGrid } from '@/admin/components/ui/AdminKpiCard';
import { LuckyNumber } from '../../../../components/ui/LuckyNumber';
import { MaskedIcon } from '../../../../components/ui/MaskedIcon';
import { AppToast as toast } from '../../../../../utils/toast.util';
import { ROUTES } from '@/admin/constants/routes';
import {
    TICKET_NUMBERS_LABEL,
    TICKET_SERIAL_PREFIX,
    TICKET_WIN_AMOUNT_LABEL,
} from '@/constants/ticketDisplay.constants';

type StatusTab = 'Tất cả' | 'Chờ quay số' | 'Trúng thưởng' | 'Không trúng';
type WonRedeemSubFilter = 'ALL' | 'UNREDEEMED' | 'REDEEMED';
type UnredeemedClaimFilter = 'ONLINE' | 'COUNTER';

const STATUS_TAB_TO_API: Record<StatusTab, TicketDrawResultStatus | undefined> = {
    'Tất cả': undefined,
    'Chờ quay số': 'PENDING_DRAW',
    'Trúng thưởng': 'WON',
    'Không trúng': 'LOST',
};

const WON_REDEEM_SUB_FILTERS: { key: WonRedeemSubFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả trúng' },
    { key: 'UNREDEEMED', label: 'Chưa đổi thưởng' },
    { key: 'REDEEMED', label: 'Đã đổi thưởng' },
];

const UNREDEEMED_CLAIM_FILTERS: { key: UnredeemedClaimFilter; label: string }[] = [
    { key: 'ONLINE', label: 'Trực tuyến' },
    { key: 'COUNTER', label: 'Tại quầy' },
];

const ISSUER_LOCKED_SORT_SCORE = 1_000_000;
const UNREDEEMED_FETCH_SIZE = 500;

const STATUS_UI: Record<
    TicketDrawResultStatus,
    { label: string; color: string; bgColor: string; badgeClass: string; gradient: string }
> = {
    PENDING_DRAW: {
        label: 'Chờ quay số',
        color: '#D97706',
        bgColor: '#FFFBEB',
        badgeClass: 'bg-amber-50 text-amber-600 border-amber-200/80',
        gradient: 'from-amber-500 to-orange-500',
    },
    WON: {
        label: 'Trúng thưởng',
        color: '#D97706',
        bgColor: '#FFFBEB',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
        gradient: 'from-amber-500 via-amber-600 to-orange-600',
    },
    LOST: {
        label: 'Không trúng',
        color: '#EF4444',
        bgColor: '#FEF2F2',
        badgeClass: 'bg-rose-50 text-rose-500 border-rose-200/80',
        gradient: 'from-rose-500 to-red-600',
    },
};

const formatMoney = (value?: number) =>
    value == null ? '—' : `${Number(value).toLocaleString('vi-VN')}đ`;

const CLIENT_NAVBAR_ICONS =
    'https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/icons/navbar';

const kpiNavbarIcon = (file: string) => (
    <MaskedIcon src={`${CLIENT_NAVBAR_ICONS}/${file}`} size={24} />
);

const renderTicketNumbersOnly = (
    numbers: string,
    numbersClassName: string
) => <LuckyNumber value={numbers} ticket className={numbersClassName} />;

const renderTicketNumbersWithSerial = (
    ticket: PurchasedTicket,
    numbersClassName: string,
    serialClassName = 'text-[11px] text-slate-400 font-semibold tracking-tight',
    centered = false
) => (
    <div className={`flex flex-col gap-0.5 ${centered ? 'items-center text-center' : ''}`}>
        <LuckyNumber value={ticket.numbers} ticket className={numbersClassName} />
        {ticket.serialNumber && (
            <span className={serialClassName}>
                {TICKET_SERIAL_PREFIX}: {ticket.serialNumber}
            </span>
        )}
    </div>
);

type PurchasedTicketGroup = {
    key: string;
    numbers: string;
    stationName?: string;
    drawDate: string;
    price: number;
    serials: PurchasedTicket[];
    wonAmount: number;
    wonSerialCount: number;
};

const normalizeTicketNumbers = (value?: string) => (value || '').replace(/\D/g, '');

/** Gộp theo đài + ngày quay + vé số — BE trả từng serial là một order detail. */
const buildTicketGroupKey = (ticket: PurchasedTicket) =>
    [
        normalizeDrawDateIso(ticket.drawDate),
        normalizeStationName(ticket.stationName),
        normalizeTicketNumbers(ticket.numbers),
    ].join('|');

const buildTicketGroups = (tickets: PurchasedTicket[]): PurchasedTicketGroup[] => {
    const map = new Map<string, PurchasedTicket[]>();
    tickets.forEach((ticket) => {
        const key = buildTicketGroupKey(ticket);
        const list = map.get(key) ?? [];
        list.push(ticket);
        map.set(key, list);
    });

    return Array.from(map.entries()).map(([key, serials]) => {
        const sortedSerials = [...serials].sort((a, b) =>
            (a.serialNumber || a.numbers).localeCompare(b.serialNumber || b.numbers, 'vi')
        );
        const first = sortedSerials[0];
        const wonAmount = sortedSerials.reduce(
            (acc, item) => acc + (item.drawResultStatus === 'WON' ? item.prizeAmount || 0 : 0),
            0
        );
        const wonSerialCount = sortedSerials.filter((item) => item.drawResultStatus === 'WON').length;

        return {
            key,
            numbers: first.numbers,
            stationName: first.stationName,
            drawDate: first.drawDate,
            price: first.price,
            serials: sortedSerials,
            wonAmount,
            wonSerialCount,
        };
    });
};

const SERIAL_ACTION_CHIP =
    'inline-flex items-center justify-center min-w-[124px] h-9 px-3 rounded-xl text-[12.5px] font-extrabold whitespace-nowrap no-underline box-border';

const SERIAL_DETAIL_BTN =
    'inline-flex items-center justify-center min-w-[88px] h-9 px-4 rounded-xl text-[12.5px] font-bold whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer';

const serialPayoutChipLabel = (
    payoutDisplay: ReturnType<typeof resolveTicketPayoutDisplay>,
): string => {
    if (!payoutDisplay) return 'Đã đổi thưởng';
    if (payoutDisplay.status === 'COMPLETED') return 'Đã đổi thưởng';
    if (payoutDisplay.status === 'PENDING') return 'Đang xử lý';
    if (payoutDisplay.status === 'IN_PERSON_ONLY' || payoutDisplay.status === 'MANUAL_RESOLUTION') {
        return 'Đổi tại đại lý';
    }
    if (payoutDisplay.status === 'REJECTED') return 'Bị từ chối';
    if (payoutDisplay.status === 'CANCELLED') return 'Đã hủy';
    return payoutDisplay.label;
};

const getSerialRowPrizeOrStatus = (ticket: PurchasedTicket) => {
    const ui = STATUS_UI[ticket.drawResultStatus] ?? STATUS_UI.PENDING_DRAW;

    if (ticket.drawResultStatus === 'WON' && ticket.matchedPrizeDisplayName) {
        return (
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-black bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-amber-950 border border-amber-300/60 uppercase tracking-wide whitespace-nowrap">
                <i className="fa-solid fa-star text-[10px]"></i>
                {ticket.matchedPrizeDisplayName}
            </div>
        );
    }

    if (ticket.drawResultStatus === 'PENDING_DRAW') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-amber-50 text-amber-600 border border-amber-200/80 whitespace-nowrap">
                {ui.label}
            </span>
        );
    }

    return (
        <span className="inline-flex px-3 py-1.5 rounded-full text-[12px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
            {ui.label}
        </span>
    );
};
const getGroupStatusBadge = (group: PurchasedTicketGroup) => {
    if (group.wonSerialCount > 0) {
        return (
            <div className="px-3 py-1 rounded-full text-[12px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs whitespace-nowrap">
                {group.wonSerialCount} trúng / {group.serials.length} vé
            </div>
        );
    }

    const allLost = group.serials.every((item) => item.drawResultStatus === 'LOST');
    if (allLost) {
        return (
            <div className="px-3 py-1 rounded-full text-[12px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shadow-xs whitespace-nowrap">
                Không trúng
            </div>
        );
    }

    const pendingCount = group.serials.filter((item) => item.drawResultStatus === 'PENDING_DRAW').length;
    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200/80 shadow-xs whitespace-nowrap">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Chờ quay ({pendingCount}/{group.serials.length})
        </div>
    );
};

/** Always "Thứ 2, dd/mm/yyyy" — never English Monday from dayjs `dddd`. */
const formatDrawDate = formatVietnameseDrawDate;

const MS_PER_DAY = 86_400_000;

/** Calendar days from today (VN) until a draw-date deadline (today = 0). */
function calendarDaysUntilDeadline(deadline?: string | null): number | null {
    const iso = normalizeDrawDateIso(deadline);
    if (!iso) return null;
    const todayMs = Date.parse(`${todayIsoVn()}T00:00:00+07:00`);
    const deadlineMs = Date.parse(`${iso}T00:00:00+07:00`);
    if (!Number.isFinite(todayMs) || !Number.isFinite(deadlineMs)) return null;
    return Math.round((deadlineMs - todayMs) / MS_PER_DAY);
}

function resolveIssuerDaysRemaining(ticket: PurchasedTicket): number | null {
    if (ticket.daysRemainingToIssuer != null) return ticket.daysRemainingToIssuer;
    return calendarDaysUntilDeadline(ticket.issuerRedemptionDeadline);
}

function formatDaysRemainingLabel(days: number, channel: 'online' | 'counter'): string {
    const suffix = channel === 'online' ? 'đổi trực tuyến' : 'đổi tại quầy';
    if (days === 0) return `Hết hạn ${suffix} trong hôm nay`;
    if (days === 1) return `Còn 1 ngày ${suffix}`;
    return `Còn ${days} ngày ${suffix}`;
}

/**
 * WITHIN: "Còn X ngày đổi trực tuyến" + date.
 * URGENT: "Còn X ngày đổi tại quầy" + date (no "Hết hạn trực tuyến / Hạn chính thức").
 * LOCKED: fully expired.
 */
function resolveCustomerRedemptionRemaining(ticket: PurchasedTicket): {
    primary: string;
    secondary: string;
    tone: 'ok' | 'soon' | 'expired';
} | null {
    if (!ticket.customerRedemptionDeadline && !ticket.issuerRedemptionDeadline) return null;

    const issuerUntil = ticket.issuerRedemptionDeadline
        ? formatDrawDate(ticket.issuerRedemptionDeadline)
        : null;
    const issuerDays = resolveIssuerDaysRemaining(ticket);

    if (ticket.redemptionZone === 'PAST_ISSUER_LOCKED') {
        return {
            primary: 'Hết hạn trả thưởng',
            secondary: issuerUntil ?? '',
            tone: 'expired',
        };
    }

    const customerDays = calendarDaysUntilDeadline(ticket.customerRedemptionDeadline);
    const expiredOnline = ticket.redemptionZone === 'PAST_CUSTOMER_URGENT'
        || (customerDays != null && customerDays < 0);

    if (expiredOnline) {
        if (issuerDays != null && issuerDays >= 0) {
            return {
                primary: formatDaysRemainingLabel(issuerDays, 'counter'),
                secondary: issuerUntil ?? '',
                tone: issuerDays <= 3 ? 'soon' : 'ok',
            };
        }
        return {
            primary: 'Hết hạn trả thưởng',
            secondary: issuerUntil ?? '',
            tone: 'expired',
        };
    }

    const until = ticket.customerRedemptionDeadline
        ? formatDrawDate(ticket.customerRedemptionDeadline)
        : '';
    if (customerDays != null) {
        return {
            primary: formatDaysRemainingLabel(customerDays, 'online'),
            secondary: until,
            tone: customerDays <= 7 ? 'soon' : 'ok',
        };
    }
    return { primary: until, secondary: '', tone: 'ok' };
}

function isWithinCustomerWindow(ticket: PurchasedTicket) {
    return ticket.redemptionZone == null || ticket.redemptionZone === 'WITHIN_CUSTOMER';
}

/** Vé còn hạn khách và đi kênh online (kể cả đang chờ duyệt). */
function isOnlineUnredeemedClaim(ticket: PurchasedTicket) {
    if (ticket.drawResultStatus !== 'WON') return false;
    if (!isWithinCustomerWindow(ticket)) return false;
    return ticket.canClaimOnline === true || ticket.claimChannel === 'ONLINE';
}

function isCounterUnredeemedClaim(ticket: PurchasedTicket) {
    return ticket.drawResultStatus === 'WON' && !isOnlineUnredeemedClaim(ticket);
}

function isPrizeRedeemed(ticket: PurchasedTicket) {
    return ticket.payoutState === 'PAID_OUT' || ticket.activePayoutStatus === 'COMPLETED';
}

/**
 * List order for winning tickets:
 *  0  still unredeemed, within 7 days of customer deadline (soonest first)
 * 50  hết hạn đổi online — still counter-eligible (least overdue / nearest date first)
 * 100 still unredeemed, more than 7 days left
 * 200 hết hạn trả thưởng (issuer locked) — always last among unredeemed
 * 300 already redeemed
 */
function redemptionListRank(ticket: PurchasedTicket) {
    if (ticket.drawResultStatus === 'PENDING_DRAW') return 150;
    if (ticket.drawResultStatus === 'LOST') return 350;
    if (ticket.drawResultStatus !== 'WON') return 400;
    if (isPrizeRedeemed(ticket)) return 300;
    if (ticket.redemptionZone === 'PAST_ISSUER_LOCKED') return 200;
    const days = calendarDaysUntilDeadline(ticket.customerRedemptionDeadline);
    const expiredOnline = ticket.redemptionZone === 'PAST_CUSTOMER_URGENT'
        || (days != null && days < 0);
    if (expiredOnline) return 50;
    if (days != null && days <= 7) return 0;
    return 100;
}

function dateSortValue(iso?: string | null) {
    if (!iso) return ISSUER_LOCKED_SORT_SCORE;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : ISSUER_LOCKED_SORT_SCORE;
}

function redemptionListTieBreak(ticket: PurchasedTicket) {
    const customerDays = calendarDaysUntilDeadline(ticket.customerRedemptionDeadline);
    const issuerDays = resolveIssuerDaysRemaining(ticket);
    const rank = redemptionListRank(ticket);
    if (rank === 50) {
        // Urgent: soonest issuer deadline first.
        return issuerDays == null ? ISSUER_LOCKED_SORT_SCORE : issuerDays;
    }
    if (rank === 0 || rank === 100) {
        return customerDays == null ? ISSUER_LOCKED_SORT_SCORE - 1 : customerDays;
    }
    if (rank === 200) {
        return issuerDays == null ? 0 : issuerDays;
    }
    if (rank === 150) {
        return dateSortValue(normalizeDrawDateIso(ticket.drawDate));
    }
    return -dateSortValue(ticket.purchasedAt);
}

function compareRedemptionUrgency(a: PurchasedTicket, b: PurchasedTicket) {
    const byRank = redemptionListRank(a) - redemptionListRank(b);
    if (byRank !== 0) return byRank;
    const byTie = redemptionListTieBreak(a) - redemptionListTieBreak(b);
    if (byTie !== 0) return byTie;
    return (a.serialNumber || a.numbers).localeCompare(b.serialNumber || b.numbers, 'vi');
}

function sortGroupsByRedemptionUrgency(groups: PurchasedTicketGroup[]) {
    return groups
        .map((group) => ({
            ...group,
            serials: [...group.serials].sort(compareRedemptionUrgency),
        }))
        .sort((left, right) => {
            const leftHead = left.serials[0];
            const rightHead = right.serials[0];
            if (!leftHead || !rightHead) return 0;
            return compareRedemptionUrgency(leftHead, rightHead);
        });
}

const REMAINING_TONE_CLASS: Record<'ok' | 'soon' | 'expired', string> = {
    ok: 'text-slate-900',
    soon: 'text-amber-700',
    expired: 'text-rose-600',
};

const ticketKey = (ticket: PurchasedTicket) =>
    `${ticket.orderId}-${ticket.ticketId}-${ticket.serialNumber || ticket.numbers}`;

const normalizeStationName = (value?: string) =>
    (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

export const TicketsTab = () => {
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState<StatusTab>('Tất cả');
    const [wonRedeemFilter, setWonRedeemFilter] = useState<WonRedeemSubFilter>('ALL');
    const [unredeemedClaimFilter, setUnredeemedClaimFilter] = useState<UnredeemedClaimFilter>('ONLINE');
    const [searchCode, setSearchCode] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [fromDateOpen, setFromDateOpen] = useState(false);
    const [toDateOpen, setToDateOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<PurchasedTicket | null>(null);
    const [payoutModalOpen, setPayoutModalOpen] = useState(false);
    const [payoutTicket, setPayoutTicket] = useState<PurchasedTicket | null>(null);
    const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

    const todayIso = todayIsoVn();
    const pageSize = 10;
    const apiStatus = STATUS_TAB_TO_API[activeTab];
    const clientUnredeemedView = activeTab === 'Trúng thưởng' && wonRedeemFilter === 'UNREDEEMED';
    const clientUrgencySortView = activeTab === 'Tất cả'
        || (activeTab === 'Trúng thưởng' && wonRedeemFilter !== 'REDEEMED');
    const redeemedParam =
        activeTab === 'Trúng thưởng' && wonRedeemFilter !== 'ALL'
            ? wonRedeemFilter === 'REDEEMED'
            : undefined;
    const hasInvalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);

    const { data, isLoading, isFetching, isError, error, refetch } = usePurchasedTicketLookup({
        page: clientUrgencySortView ? 1 : page,
        size: clientUrgencySortView ? UNREDEEMED_FETCH_SIZE : pageSize,
        status: apiStatus,
        redeemed: redeemedParam,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        ticketNumber: searchCode.trim() || undefined,
        sortBy: 'createdAt',
        direction: 'desc',
    }, {
        enabled: !hasInvalidDateRange,
    });

    const tickets = (data?.data?.recordList ?? []) as PurchasedTicket[];
    const ticketGroups = useMemo(() => {
        const source = clientUnredeemedView
            ? tickets.filter((ticket) =>
                unredeemedClaimFilter === 'ONLINE'
                    ? isOnlineUnredeemedClaim(ticket)
                    : isCounterUnredeemedClaim(ticket)
            )
            : tickets;
        const groups = buildTicketGroups(source);
        return clientUrgencySortView ? sortGroupsByRedemptionUrgency(groups) : groups;
    }, [tickets, clientUnredeemedView, clientUrgencySortView, unredeemedClaimFilter]);

    const pagedTicketGroups = useMemo(() => {
        if (!clientUrgencySortView) return ticketGroups;
        const from = (page - 1) * pageSize;
        return ticketGroups.slice(from, from + pageSize);
    }, [ticketGroups, clientUrgencySortView, page, pageSize]);

    const pagination = normalizePagination(data?.data?.pagination, page, pageSize);
    const totalPages = clientUrgencySortView
        ? Math.max(1, Math.ceil(ticketGroups.length / pageSize))
        : pagination.totalPages;
    const totalRecords = clientUrgencySortView ? ticketGroups.length : pagination.totalRecords;

    useEffect(() => {
        setExpandedGroupKeys(new Set(pagedTicketGroups.map((group) => group.key)));
    }, [pagedTicketGroups]);

    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [page, totalPages]);

    const ticketTabs: StatusTab[] = ['Tất cả', 'Chờ quay số', 'Trúng thưởng', 'Không trúng'];

    // Calculators for top metrics summary
    const pendingCount = tickets.filter(t => t.drawResultStatus === 'PENDING_DRAW').length;
    const totalWonAmount = tickets.reduce((acc, t) => acc + (t.drawResultStatus === 'WON' ? (t.prizeAmount || 0) : 0), 0);

    const openDetail = (ticket: PurchasedTicket) => setSelectedTicket(ticket);
    const closeDetail = () => setSelectedTicket(null);

    const toggleGroup = (groupKey: string) => {
        setExpandedGroupKeys((prev) => {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            return next;
        });
    };

    const openPayoutForTicket = (ticket: PurchasedTicket, event?: React.MouseEvent) => {
        event?.stopPropagation();
        setPayoutTicket(ticket);
        setPayoutModalOpen(true);
    };

    useEffect(() => {
        scrollToTop();
    }, [selectedTicket]);

    const selectedTicketDrawDateIso = useMemo(
        () => normalizeDrawDateIso(selectedTicket?.drawDate),
        [selectedTicket?.drawDate]
    );
    const { data: drawDateStations } = useStationsByDrawDate(selectedTicketDrawDateIso || undefined);
    const matchedStationForSelectedTicket = useMemo(() => {
        if (!selectedTicket?.stationName) return null;
        const stations = drawDateStations || [];
        const wanted = normalizeStationName(selectedTicket.stationName);
        return stations.find((station) => normalizeStationName(station.name) === wanted) || null;
    }, [drawDateStations, selectedTicket?.stationName]);

    const copyOrderCode = async (code?: string) => {
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            toast.success('Đã sao chép mã giao dịch');
        } catch {
            toast.error('Không thể sao chép mã giao dịch');
        }
    };

    // DETAIL VIEW (Vé chi tiết dạng cuống xé kỹ thuật số sang trọng)
    if (selectedTicket) {
        const ui = STATUS_UI[selectedTicket.drawResultStatus] ?? STATUS_UI.PENDING_DRAW;
        const isWon = selectedTicket.drawResultStatus === 'WON';
        const isEligibleForPayout = canRequestPrizePayout(selectedTicket);
        const ineligibilityReason = !isEligibleForPayout ? getPrizePayoutIneligibilityMessage(selectedTicket) : null;
        const redemptionRemaining = isWon ? resolveCustomerRedemptionRemaining(selectedTicket) : null;
        const drawDateIso = selectedTicketDrawDateIso;
        const matchedStationId = matchedStationForSelectedTicket?.id ?? matchedStationForSelectedTicket?._id;
        const resultLookupUrl = (() => {
            const params = new URLSearchParams();
            if (drawDateIso) params.set('drawDate', drawDateIso);
            if (matchedStationId != null) params.set('stationId', String(matchedStationId));
            if (selectedTicket.numbers) params.set('search', selectedTicket.numbers.replace(/\D/g, ''));
            const query = params.toString();
            return query ? `/?${query}` : '/';
        })();
        const rebuyUrl = (() => {
            const params = new URLSearchParams();
            if (drawDateIso) params.set('drawDate', drawDateIso);
            if (matchedStationId != null) params.set('stationId', String(matchedStationId));
            if (selectedTicket.numbers) params.set('ticketNumber', selectedTicket.numbers.replace(/\D/g, ''));
            if (selectedTicket.ticketId) params.set('ticketId', String(selectedTicket.ticketId));
            const query = params.toString();
            return query ? `${ROUTES.PUBLIC.TICKETS}?${query}` : ROUTES.PUBLIC.TICKETS;
        })();

        return (
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6 w-full font-['Public_Sans',sans-serif] pb-24 md:pb-0"
            >
                {/* Quay lại button */}
                <button
                    type="button"
                    onClick={closeDetail}
                    className="hidden md:flex items-center gap-2 text-[#ee1314] font-bold text-[14px] hover:translate-x-[-3px] transition-transform w-max bg-transparent border-none cursor-pointer outline-none"
                >
                    <i className="fa-solid fa-arrow-left-long text-[14px]"></i>
                    Quay lại danh sách vé
                </button>

                {/* Main Ticket Stub Card */}
                <div className="relative bg-white border border-slate-200/90 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.05)] overflow-hidden">
                    {/* Top Decorative Header Strip */}
                    <div className={`h-3 bg-gradient-to-r ${isWon ? 'from-amber-400 via-amber-500 to-orange-500' : selectedTicket.drawResultStatus === 'PENDING_DRAW' ? 'from-amber-400 via-orange-500 to-amber-500' : 'from-slate-300 to-slate-400'}`}></div>

                    <div className="p-6 md:p-8 flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-center pb-6 border-b border-dashed border-slate-200">
                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                <h3 className="text-[18px] md:text-[20px] font-black text-slate-900 m-0 tracking-tight mb-1.5">
                                    {selectedTicket.stationName || 'Vé số Đại Phát'}
                                </h3>
                                <div className="mb-1.5">{getSerialRowPrizeOrStatus(selectedTicket)}</div>
                                <p className="text-[12px] md:text-[13px] text-slate-500 m-0 font-medium">
                                    Ngày mở thưởng:{' '}
                                    <span className="text-slate-800 font-bold">
                                        {formatDrawDate(selectedTicket.drawDate)}
                                    </span>
                                </p>
                            </div>

                            <div className="flex flex-col items-center text-center px-2">
                                {renderTicketNumbersWithSerial(
                                    selectedTicket,
                                    `text-[22px] md:text-[28px] font-black tracking-tight ${isWon ? 'text-amber-950' : 'text-slate-900'}`,
                                    'text-[11px] md:text-[12px] text-slate-500 font-bold break-all',
                                    true
                                )}
                            </div>

                            <div className="flex flex-col items-center md:items-end text-center md:text-right">
                                <span className="text-[18px] md:text-[20px] font-extrabold text-slate-900 tabular-nums">
                                    {formatMoney(selectedTicket.price)}
                                </span>
                            </div>
                        </div>

                        {/* Perforated Cutout Separator (Ticket Stub Notch Effect) */}
                        <div className="relative my-2">
                            <div className="absolute -left-8 -top-3 w-6 h-6 rounded-full bg-[#F8F9FA] border-r border-slate-300"></div>
                            <div className="absolute -right-8 -top-3 w-6 h-6 rounded-full bg-[#F8F9FA] border-l border-slate-300"></div>
                            <div className="border-t-2 border-dashed border-slate-200"></div>
                        </div>

                        {/* Result & verification section */}
                        <div className="grid grid-cols-1 gap-6">
                            {/* Detailed Info Grid */}
                            <div className="flex flex-col gap-3.5">
                                <h4 className="text-slate-900 font-extrabold text-[15px] uppercase tracking-wider flex items-center gap-2 mb-1">
                                    <i className="fa-solid fa-circle-info text-red-600"></i> Thông tin chi tiết vé
                                </h4>

                                <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 flex flex-col gap-3">
                                    <div className="flex items-center justify-between text-[14px]">
                                        <span className="text-slate-500 font-medium">Thời gian mua vé</span>
                                        <span className="text-slate-900 font-bold">{formatVietnameseDateTime(selectedTicket.purchasedAt)}</span>
                                    </div>
                                    <div className="h-[1px] bg-slate-200/60"></div>

                                    <div className="flex items-center justify-between text-[14px]">
                                        <span className="text-slate-500 font-medium">Ngày mở thưởng</span>
                                        <span className="text-slate-900 font-bold">{formatDrawDate(selectedTicket.drawDate)}</span>
                                    </div>
                                    <div className="h-[1px] bg-slate-200/60"></div>

                                    <div className="flex items-center justify-between text-[14px]">
                                        <span className="text-slate-500 font-medium">Kết quả đối chiếu</span>
                                        <span className="font-extrabold text-[15px]" style={{ color: ui.color }}>
                                            {ui.label}
                                        </span>
                                    </div>

                                    {isWon && selectedTicket.prizeAmount != null && (
                                        <>
                                            <div className="h-[1px] bg-slate-200/60"></div>
                                            <div className="flex items-center justify-between text-[14px]">
                                                <span className="text-slate-500 font-medium">Tổng tiền trúng thưởng</span>
                                                <span className="text-amber-600 font-black text-[17px]">
                                                    {formatMoney(selectedTicket.prizeAmount)}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {redemptionRemaining && (
                                        <>
                                            <div className="h-[1px] bg-slate-200/60"></div>
                                            <div className="flex items-start justify-between gap-3 text-[14px]">
                                                <span className="text-slate-500 font-medium">Thời gian còn lại đổi thưởng</span>
                                                <span className={`font-bold text-right ${REMAINING_TONE_CLASS[redemptionRemaining.tone]}`}>
                                                    {redemptionRemaining.primary}
                                                    {redemptionRemaining.secondary ? (
                                                        <span className="block text-[12px] font-semibold text-slate-500 mt-0.5">
                                                            {redemptionRemaining.secondary}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {isWon && selectedTicket.payoutState && (
                                        <>
                                            <div className="h-[1px] bg-slate-200/60"></div>
                                            <div className="flex items-center justify-between text-[14px]">
                                                <span className="text-slate-500 font-medium">Trạng thái trả thưởng</span>
                                                <span className="text-slate-900 font-bold">
                                                    {SERIAL_PAYOUT_STATE_LABELS[selectedTicket.payoutState]}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {(() => {
                                        const possession = resolveTicketPossessionDisplay(selectedTicket);
                                        if (!possession) return null;
                                        return (
                                            <>
                                                <div className="h-[1px] bg-slate-200/60"></div>
                                                <div className="flex items-start justify-between gap-3 text-[14px]">
                                                    <span className="text-slate-500 font-medium shrink-0">Tình trạng nhận vé</span>
                                                    <div className="flex flex-col items-end gap-1 text-right">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12.5px] font-bold border ${possession.className}`}
                                                        >
                                                            <i className={`${possession.icon} text-[11px]`}></i>
                                                            {possession.label}
                                                        </span>
                                                        {possession.status === 'PICKED_UP'
                                                        && (selectedTicket.handedOverAt || selectedTicket.actualPickedUpAt) ? (
                                                            <span className="text-[12px] text-slate-500 font-medium">
                                                                Lấy lúc {formatVietnameseDateTime(
                                                                    selectedTicket.handedOverAt
                                                                        ?? selectedTicket.actualPickedUpAt!
                                                                )}
                                                            </span>
                                                        ) : possession.status === 'REJECTED' && selectedTicket.rejectedAt ? (
                                                            <span className="text-[12px] text-slate-500 font-medium">
                                                                Từ chối lúc {formatVietnameseDateTime(selectedTicket.rejectedAt)}
                                                            </span>
                                                        ) : possession.hint ? (
                                                            <span className="text-[12px] text-slate-500 font-medium max-w-[220px]">
                                                                {possession.hint}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}

                                    <div className="h-[1px] bg-slate-200/60"></div>
                                    <div className="flex items-center justify-between text-[14px]">
                                        <span className="text-slate-500 font-medium">Mã đơn hàng (Order ID)</span>
                                        <button
                                            type="button"
                                            onClick={() => copyOrderCode(selectedTicket.orderCode)}
                                            className="flex items-center gap-2 text-slate-800 font-bold hover:text-red-600 transition-colors bg-transparent border-none cursor-pointer"
                                        >
                                            <span>{selectedTicket.orderCode}</span>
                                            <i className="fa-regular fa-copy text-slate-400 hover:text-red-600"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Prize payout action box for winning tickets */}
                        {isWon && (() => {
                            const payoutDisplay = resolveTicketPayoutDisplay(selectedTicket);
                            const isPayoutCompleted = payoutDisplay?.status === 'COMPLETED';
                            const isPayoutInProgress = payoutDisplay?.status === 'PENDING';
                            const payoutRequestHref = selectedTicket.activePayoutRequestId
                                ? `/profile/prize-payouts/${selectedTicket.activePayoutRequestId}`
                                : null;

                                const remainingBannerLine = redemptionRemaining
                                ? redemptionRemaining.tone === 'expired'
                                    ? redemptionRemaining.primary
                                    : `${redemptionRemaining.primary}${redemptionRemaining.secondary ? ` (${redemptionRemaining.secondary.toLowerCase()})` : ''}.`
                                : null;
                            const congratulationCopy = isEligibleForPayout
                                ? `Bạn có thể gửi yêu cầu trả thưởng trực tuyến. Tiền sẽ được chuyển sau khi nhân viên duyệt.${remainingBannerLine ? ` ${remainingBannerLine}` : ''}`
                                : isPayoutCompleted
                                    ? 'Yêu cầu trả thưởng đã được duyệt và hoàn tất.'
                                    : isPayoutInProgress
                                        ? 'Yêu cầu trả thưởng của bạn đang được xử lý.'
                                        : selectedTicket.claimChannel === 'IN_PERSON' || selectedTicket.canClaimOnline === false
                                            ? 'Vé này cần mang đến đại lý để đổi thưởng trực tiếp.'
                                            : 'Tiền thưởng sẽ được chuyển tới tài khoản ngân hàng của bạn sau khi yêu cầu được duyệt.';

                            return (
                            <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 rounded-2xl p-5 border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md">
                                        <i className="fa-solid fa-gift text-[18px]"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-amber-950 font-black text-[16px] mb-0.5">Chúc mừng bạn đã trúng thưởng!</h4>
                                        <p className="text-slate-600 text-[13px] m-0">
                                            {congratulationCopy}
                                        </p>
                                    </div>
                                </div>

                                {isEligibleForPayout ? (
                                    <button
                                        type="button"
                                        onClick={() => setPayoutModalOpen(true)}
                                        className="w-full md:w-auto min-w-[200px] justify-center px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white font-black rounded-xl text-[14px] shadow-md shadow-amber-500/20 hover:shadow-lg hover:brightness-105 transition-all cursor-pointer whitespace-nowrap"
                                    >
                                        🏆 Yêu cầu trả thưởng ngay
                                    </button>
                                ) : isPayoutInProgress && payoutRequestHref ? (
                                    <Link
                                        href={payoutRequestHref}
                                        className="inline-flex items-center justify-center w-full md:w-auto min-w-[200px] px-6 py-3 bg-violet-50 text-violet-700 font-black rounded-xl text-[14px] border border-violet-200 no-underline whitespace-nowrap"
                                    >
                                        Đang xử lý
                                    </Link>
                                ) : isPayoutCompleted ? (
                                    <div className="flex flex-col items-stretch md:items-end gap-1.5 w-full md:w-auto min-w-[200px]">
                                        <span className="inline-flex items-center justify-center px-6 py-3 bg-emerald-50 text-emerald-700 font-black rounded-xl text-[14px] border border-emerald-200 whitespace-nowrap">
                                            Đã đổi thưởng
                                        </span>
                                        {payoutRequestHref ? (
                                            <Link
                                                href={payoutRequestHref}
                                                className="text-emerald-700 font-bold text-[13px] hover:underline no-underline text-center md:text-right"
                                            >
                                                Xem yêu cầu đã hoàn tất →
                                            </Link>
                                        ) : null}
                                    </div>
                                ) : ineligibilityReason ? (
                                    <span className="text-[12px] text-slate-500 font-medium md:text-right max-w-[240px]">
                                        {ineligibilityReason}
                                    </span>
                                ) : null}
                            </div>
                            );
                        })()}

                        {/* Action buttons footer */}
                        <div className="flex items-center justify-between pt-2">
                            <Link
                                href={resultLookupUrl}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[13.5px] transition-colors no-underline flex items-center gap-2"
                            >
                                <i className="fa-solid fa-calendar-days"></i> Xem kết quả kỳ quay
                            </Link>

                            <Link
                                href={rebuyUrl}
                                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-xl text-[14px] shadow-md shadow-red-600/20 hover:brightness-110 transition-all cursor-pointer flex items-center gap-2 no-underline"
                            >
                                <i className="fa-solid fa-cart-plus"></i> Mua lại bộ số này
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Modal Trả thưởng */}
                {selectedTicket && (
                    <PrizePayoutRequestModal
                        isOpen={payoutModalOpen}
                        onClose={() => setPayoutModalOpen(false)}
                        ticket={selectedTicket}
                    />
                )}
            </motion.div>
        );
    }

    // MAIN TICKETS LIST VIEW
    return (
        <div className="flex flex-col gap-6 font-['Public_Sans',sans-serif]">
            <AdminKpiCardsGrid columns={{ xs: 1, sm: 2, md: 3 }} sx={{ mb: 0 }}>
                <AdminKpiCard
                    label="Tổng số vé đã mua"
                    value={`${totalRecords.toLocaleString('vi-VN')} vé`}
                    icon={kpiNavbarIcon('ic-invoice.svg')}
                    tone="rose"
                />
                <AdminKpiCard
                    label="Đang chờ quay số"
                    value={`${pendingCount.toLocaleString('vi-VN')} vé`}
                    icon={kpiNavbarIcon('ic-dashboard.svg')}
                    tone="amber"
                />
                <AdminKpiCard
                    label={TICKET_WIN_AMOUNT_LABEL}
                    value={totalWonAmount > 0 ? formatMoney(totalWonAmount) : '0đ'}
                    valueSize="compact"
                    icon={<i className="fa-solid fa-trophy text-[22px]" />}
                    tone="green"
                />
            </AdminKpiCardsGrid>

            {/* Filter Tabs & Search Header Container */}
            <div className="bg-white border border-slate-200/90 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="flex flex-col gap-3 p-4 md:p-5 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-[12px] font-black text-slate-500 uppercase tracking-wider">
                            Trạng thái vé
                        </span>
                    </div>
                    {/* Status Tabs with Motion Pill */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto no-scrollbar pb-1 lg:pb-0">
                        {ticketTabs.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setWonRedeemFilter('ALL');
                                        setPage(1);
                                    }}
                                    className={`relative px-4 py-2.5 text-[13.5px] font-extrabold whitespace-nowrap rounded-xl transition-all duration-200 cursor-pointer ${
                                        isActive
                                            ? 'text-white shadow-md shadow-red-600/20'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-bold'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTicketTab"
                                            className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                        />
                                    )}
                                    <span className="relative z-10">{tab}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-end gap-3 px-4 md:px-5 py-3.5 border-b border-slate-100 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:max-w-[460px]">
                        <ClientDatePicker
                            label="Từ ngày"
                            value={fromDate}
                            maxDate={toDate || todayIso}
                            allowClear
                            open={fromDateOpen}
                            onOpenChange={setFromDateOpen}
                            onOpen={() => setToDateOpen(false)}
                            onChange={(ymd) => {
                                setFromDate(ymd);
                                setPage(1);
                            }}
                            className="w-full"
                        />
                        <ClientDatePicker
                            label="Đến ngày"
                            value={toDate}
                            minDate={fromDate || undefined}
                            maxDate={todayIso}
                            allowClear
                            open={toDateOpen}
                            onOpenChange={setToDateOpen}
                            onOpen={() => setFromDateOpen(false)}
                            onChange={(ymd) => {
                                setToDate(ymd);
                                setPage(1);
                            }}
                            className="w-full"
                        />
                    </div>

                    {/* Search Code / Numbers */}
                    <div className="relative min-w-[240px] w-full lg:flex-1">
                        <input
                            type="text"
                            value={searchCode}
                            onChange={(e) => {
                                setSearchCode(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Tìm mã vé / bộ số..."
                            className="h-[42px] w-full pl-10 pr-9 border border-slate-200 bg-white rounded-xl text-[13.5px] outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-semibold placeholder:font-normal text-slate-800 shadow-xs"
                        />
                        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]"></i>
                        {searchCode && (
                            <button
                                type="button"
                                onClick={() => setSearchCode('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                            >
                                <i className="fa-solid fa-xmark text-[13px]"></i>
                            </button>
                        )}
                    </div>
                    {(fromDate || toDate) && (
                        <button
                            type="button"
                            onClick={() => {
                                setFromDate('');
                                setToDate('');
                                setPage(1);
                            }}
                            className="h-[42px] px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                        >
                            Xóa khoảng ngày
                        </button>
                    )}
                </div>

                {hasInvalidDateRange && (
                    <div className="px-4 md:px-5 py-2 border-b border-red-100 bg-red-50 text-red-600 text-[13px] font-semibold">
                        Khoảng ngày không hợp lệ: "Từ ngày" phải nhỏ hơn hoặc bằng "Đến ngày".
                    </div>
                )}

                {activeTab === 'Trúng thưởng' && (
                    <div className="flex flex-col gap-2 px-4 md:px-5 py-3 border-b border-slate-100 bg-amber-50/45">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <span className="text-[12px] font-black text-amber-800/80 uppercase tracking-wide whitespace-nowrap mr-1">
                                Lọc đổi thưởng:
                            </span>
                            {WON_REDEEM_SUB_FILTERS.map((item) => {
                                const isActive = wonRedeemFilter === item.key;
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => {
                                            setWonRedeemFilter(item.key);
                                            if (item.key === 'UNREDEEMED') {
                                                setUnredeemedClaimFilter('ONLINE');
                                            }
                                            setPage(1);
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                                            isActive
                                                ? item.key === 'REDEEMED'
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                    : item.key === 'UNREDEEMED'
                                                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                                        : 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                        {wonRedeemFilter === 'UNREDEEMED' && (
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide whitespace-nowrap mr-1">
                                    Kênh:
                                </span>
                                {UNREDEEMED_CLAIM_FILTERS.map((item) => {
                                    const isActive = unredeemedClaimFilter === item.key;
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => {
                                                setUnredeemedClaimFilter(item.key);
                                                setPage(1);
                                            }}
                                            className={`px-3 py-1 rounded-full text-[12px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                                                isActive
                                                    ? item.key === 'ONLINE'
                                                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                                        : 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                                    : 'bg-white/80 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Tickets List Container */}
                <div className="flex flex-col divide-y divide-slate-100">
                    {isError ? (
                        <div className="py-16 text-center text-slate-500">
                            <i className="fa-solid fa-triangle-exclamation text-[36px] text-red-500 mb-3 block"></i>
                            <p className="font-extrabold text-red-600 text-[16px]">Không tải được danh sách vé</p>
                            <p className="text-[13px] mt-1 text-slate-500">
                                {(error as { response?: { data?: { message?: string } } })?.response?.data?.message
                                    || 'Vui lòng thử lại sau.'}
                            </p>
                            <button
                                type="button"
                                onClick={() => refetch()}
                                className="inline-flex mt-4 px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl text-[14px] border-none cursor-pointer shadow-xs hover:bg-red-700 transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : (isLoading || isFetching) && tickets.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-3">
                            <i className="fa-solid fa-circle-notch fa-spin text-[32px] text-red-600"></i>
                            <span>Đang tải danh sách vé số...</span>
                        </div>
                    ) : (clientUnredeemedView ? ticketGroups.length === 0 : tickets.length === 0) ? (
                        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[28px] mb-4">
                                <i className="fa-solid fa-ticket-simple"></i>
                            </div>
                            <p className="font-extrabold text-[16px] text-slate-800 m-0">
                                {clientUnredeemedView
                                    ? unredeemedClaimFilter === 'ONLINE'
                                        ? 'Không có vé đổi thưởng trực tuyến'
                                        : 'Không có vé đổi thưởng tại quầy'
                                    : 'Chưa tìm thấy vé số nào'}
                            </p>
                            <p className="text-[13px] mt-1 text-slate-400">
                                {clientUnredeemedView
                                    ? unredeemedClaimFilter === 'ONLINE'
                                        ? 'Vé còn hạn đổi trực tuyến sẽ hiện ở đây, sắp theo hạn gần nhất.'
                                        : 'Vé cần mang ra đại lý (kể cả đã hết hạn trực tuyến) sẽ hiện ở đây.'
                                    : 'Vé bạn mua hoặc tìm kiếm sẽ xuất hiện tại đây.'}
                            </p>
                            {!clientUnredeemedView && (
                            <Link
                                href={ROUTES.PUBLIC.TICKETS}
                                className="inline-flex mt-4 px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold rounded-xl text-[14px] no-underline shadow-md shadow-red-600/20 hover:brightness-110 transition-all"
                            >
                                Mua vé ngay
                            </Link>
                            )}
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {pagedTicketGroups.map((group, index) => {
                                const isExpanded = expandedGroupKeys.has(group.key);
                                const hasWonSerial = group.wonSerialCount > 0;

                                return (
                                    <motion.div
                                        key={group.key}
                                        layout
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                        className="relative border-b border-slate-100 last:border-0"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(group.key)}
                                            className="relative w-full p-4 md:p-5 hover:bg-slate-50/80 transition-all duration-200 cursor-pointer group flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6 bg-transparent border-none text-left"
                                        >
                                            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F8F9FA] border-r border-slate-200 hidden md:block z-10"></div>
                                            <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F8F9FA] border-l border-slate-200 hidden md:block z-10"></div>

                                            <div className="flex md:hidden items-start justify-between w-full gap-3">
                                                <div className="flex flex-col min-w-0">
                                                    <h4 className="text-[15px] font-black text-slate-900 mb-0.5">
                                                        {group.stationName || 'Vé số'}
                                                    </h4>
                                                    <p className="text-[12px] text-slate-400 font-medium">
                                                        Ngày mở thưởng: {formatDrawDate(group.drawDate)}
                                                    </p>
                                                </div>
                                                {getGroupStatusBadge(group)}
                                            </div>

                                            <div className="hidden md:flex flex-col min-w-[180px]">
                                                <h4 className="text-[15.5px] font-black text-slate-900 mb-0.5 group-hover:text-red-600 transition-colors tracking-tight">
                                                    {group.stationName || 'Vé số'}
                                                </h4>
                                                <p className="text-[12px] text-slate-500 font-medium m-0">
                                                    Ngày mở thưởng:{' '}
                                                    <span className="font-bold text-slate-700">
                                                        {formatDrawDate(group.drawDate)}
                                                    </span>
                                                </p>
                                            </div>

                                            <div className="hidden md:flex flex-col flex-1 min-w-[140px]">
                                                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                                    {TICKET_NUMBERS_LABEL}
                                                </span>
                                                {renderTicketNumbersOnly(
                                                    group.numbers,
                                                    `text-[16px] font-black tracking-wider ${hasWonSerial ? 'text-amber-950' : 'text-slate-900'}`
                                                )}
                                            </div>

                                            <div className="hidden md:flex flex-col w-[88px] shrink-0">
                                                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                                    Số lượng
                                                </span>
                                                <span className="text-[15px] font-extrabold text-slate-900">
                                                    {group.serials.length} vé
                                                </span>
                                            </div>

                                            <div className="hidden md:flex flex-col w-[110px] shrink-0">
                                                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                                    Giá vé
                                                </span>
                                                <span className="text-[15px] font-extrabold text-slate-900">
                                                    {formatMoney(group.price)}
                                                </span>
                                            </div>

                                            <div className="hidden md:flex flex-col w-[120px] shrink-0">
                                                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                                    {TICKET_WIN_AMOUNT_LABEL}
                                                </span>
                                                <span
                                                    className={`text-[15px] font-extrabold ${
                                                        group.wonAmount > 0 ? 'text-amber-600' : 'text-slate-400'
                                                    }`}
                                                >
                                                    {group.wonAmount > 0 ? formatMoney(group.wonAmount) : '—'}
                                                </span>
                                            </div>

                                            <div className="hidden md:flex flex-col items-end min-w-[160px] shrink-0">
                                                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                                    Trạng thái
                                                </span>
                                                {getGroupStatusBadge(group)}
                                            </div>

                                            <div className="flex md:hidden flex-col gap-3 bg-slate-50/90 rounded-2xl p-3.5 w-full border border-slate-200/80">
                                                <div className="flex justify-between items-start gap-3 border-b border-slate-200/60 pb-2">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                            {TICKET_NUMBERS_LABEL}
                                                        </span>
                                                        {renderTicketNumbersOnly(
                                                            group.numbers,
                                                            `text-[14px] font-black ${hasWonSerial ? 'text-amber-950' : 'text-slate-900'}`
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                            Số lượng
                                                        </span>
                                                        <span className="text-[14px] font-extrabold text-slate-900">
                                                            {group.serials.length} vé
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                        {TICKET_WIN_AMOUNT_LABEL}
                                                    </span>
                                                    <span
                                                        className={`text-[14px] font-extrabold ${
                                                            group.wonAmount > 0 ? 'text-amber-600' : 'text-slate-400'
                                                        }`}
                                                    >
                                                        {group.wonAmount > 0 ? formatMoney(group.wonAmount) : '—'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex md:hidden items-center justify-between w-full pt-1 text-[12px] font-bold text-slate-500">
                                                <span>{isExpanded ? 'Thu gọn serial' : 'Xem danh sách serial'}</span>
                                                <i
                                                    className={`fa-solid fa-chevron-down text-[12px] transition-transform duration-200 ${
                                                        isExpanded ? 'rotate-180 text-red-600' : ''
                                                    }`}
                                                ></i>
                                            </div>

                                            <div className="hidden md:flex items-center justify-center text-slate-300 group-hover:text-red-600 transition-all shrink-0 pl-1">
                                                <i
                                                    className={`fa-solid fa-chevron-down text-[13px] transition-transform duration-200 ${
                                                        isExpanded ? 'rotate-180 text-red-600' : ''
                                                    }`}
                                                ></i>
                                            </div>
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-4 md:px-5 pb-4 md:pb-5 pt-0">
                                                        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3 md:p-4 flex flex-col gap-2">
                                                            {group.serials.map((serial) => {
                                                                const isWon = serial.drawResultStatus === 'WON';
                                                                const canRedeem = canRequestPrizePayout(serial);
                                                                const payoutDisplay = isWon
                                                                    ? resolveTicketPayoutDisplay(serial)
                                                                    : null;

                                                                return (
                                                                    <div
                                                                        key={ticketKey(serial)}
                                                                        className="grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(120px,0.8fr)_minmax(110px,0.7fr)_minmax(228px,auto)] gap-3 md:gap-4 md:items-center rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-xs"
                                                                    >
                                                                        <div className="min-w-0 flex flex-col gap-0.5 justify-center">
                                                                            <span className="text-[13px] font-bold text-red-600 font-mono tracking-tight break-all">
                                                                                {TICKET_SERIAL_PREFIX}:{' '}
                                                                                {serial.serialNumber || serial.numbers}
                                                                            </span>
                                                                            {isWon && (() => {
                                                                                const remaining = resolveCustomerRedemptionRemaining(serial);
                                                                                if (!remaining) return null;
                                                                                return (
                                                                                    <span className={`text-[11px] font-semibold ${REMAINING_TONE_CLASS[remaining.tone]}`}>
                                                                                        {remaining.primary}
                                                                                        {remaining.secondary ? ` · ${remaining.secondary}` : ''}
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>

                                                                        <div className="flex items-center md:justify-center">
                                                                            {getSerialRowPrizeOrStatus(serial)}
                                                                        </div>

                                                                        <div
                                                                            className={`flex items-center md:justify-center text-[14px] font-extrabold tabular-nums ${
                                                                                isWon && serial.prizeAmount != null
                                                                                    ? 'text-amber-600'
                                                                                    : 'text-slate-400'
                                                                            }`}
                                                                        >
                                                                            {isWon && serial.prizeAmount != null
                                                                                ? formatMoney(serial.prizeAmount)
                                                                                : '—'}
                                                                        </div>

                                                                        <div className="flex items-center justify-start md:justify-end gap-2 shrink-0 w-full">
                                                                            {canRedeem ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(event) =>
                                                                                        openPayoutForTicket(serial, event)
                                                                                    }
                                                                                    className={`${SERIAL_ACTION_CHIP} bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-sm hover:brightness-105 transition-all cursor-pointer border-none`}
                                                                                >
                                                                                    Đổi thưởng
                                                                                </button>
                                                                            ) : isWon ? (
                                                                                serial.activePayoutRequestId && (
                                                                                    payoutDisplay?.status === 'PENDING'
                                                                                    || payoutDisplay?.status === 'COMPLETED'
                                                                                ) ? (
                                                                                    <Link
                                                                                        href={`/profile/prize-payouts/${serial.activePayoutRequestId}`}
                                                                                        onClick={(event) => event.stopPropagation()}
                                                                                        className={`${SERIAL_ACTION_CHIP} border ${
                                                                                            payoutDisplay?.status === 'COMPLETED'
                                                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                                : 'bg-violet-50 text-violet-700 border-violet-200'
                                                                                        }`}
                                                                                    >
                                                                                        {serialPayoutChipLabel(payoutDisplay)}
                                                                                    </Link>
                                                                                ) : (
                                                                                    <span
                                                                                        className={`${SERIAL_ACTION_CHIP} border ${
                                                                                            payoutDisplay?.className
                                                                                            ?? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                        }`}
                                                                                    >
                                                                                        {serialPayoutChipLabel(payoutDisplay)}
                                                                                    </span>
                                                                                )
                                                                            ) : (
                                                                                <span
                                                                                    className={`${SERIAL_ACTION_CHIP} invisible pointer-events-none`}
                                                                                    aria-hidden
                                                                                />
                                                                            )}
                                                                            <button
                                                                                type="button"
                                                                                onClick={(event) => {
                                                                                    event.stopPropagation();
                                                                                    openDetail(serial);
                                                                                }}
                                                                                className={SERIAL_DETAIL_BTN}
                                                                            >
                                                                                Chi tiết
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100">
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                            totalRecords={totalRecords}
                            limit={pageSize}
                        />
                    </div>
                )}
            </div>

            {payoutTicket && (
                <PrizePayoutRequestModal
                    isOpen={payoutModalOpen}
                    onClose={() => {
                        setPayoutModalOpen(false);
                        setPayoutTicket(null);
                    }}
                    ticket={payoutTicket}
                />
            )}
        </div>
    );
};
