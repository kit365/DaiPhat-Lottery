import React, { useEffect, useState } from 'react';
import { scrollToTop } from '../../../../../utils/scroll.util';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { Pagination } from '../../../../components/common/Pagination';
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
import { AppToast as toast } from '../../../../../utils/toast.util';

type StatusTab = 'Tất cả' | 'Chờ quay số' | 'Trúng thưởng' | 'Không trúng';

const STATUS_TAB_TO_API: Record<StatusTab, TicketDrawResultStatus | undefined> = {
    'Tất cả': undefined,
    'Chờ quay số': 'PENDING_DRAW',
    'Trúng thưởng': 'WON',
    'Không trúng': 'LOST',
};

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

const formatDrawDate = (value?: string) =>
    value ? dayjs(value).locale('vi').format('dddd, DD/MM/YYYY').replace(/^./, (c) => c.toUpperCase()) : '—';

const formatShortDate = (value?: string) =>
    value ? dayjs(value).format('DD/MM/YYYY') : '—';

const formatDateTime = (value?: string) =>
    value ? dayjs(value).format('DD/MM/YYYY - HH:mm:ss') : '—';

/** Tách số vé thành từng cặp 2 chữ số nếu đủ chẵn (VD: 68 11 00), ngược lại tách từng ký tự. */
const splitTicketNumbers = (numbers?: string): string[] => {
    const digits = (numbers || '').replace(/\D/g, '');
    if (!digits) return [];
    if (digits.length % 2 === 0 && digits.length >= 2 && digits.length <= 12) {
        const pairs: string[] = [];
        for (let i = 0; i < digits.length; i += 2) {
            pairs.push(digits.slice(i, i + 2));
        }
        return pairs;
    }
    return digits.split('');
};

const ticketKey = (ticket: PurchasedTicket) =>
    `${ticket.orderId}-${ticket.ticketId}-${ticket.serialNumber || ticket.numbers}`;

export const TicketsTab = () => {
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState<StatusTab>('Tất cả');
    const [searchCode, setSearchCode] = useState('');
    const [selectedTicket, setSelectedTicket] = useState<PurchasedTicket | null>(null);
    const [payoutModalOpen, setPayoutModalOpen] = useState(false);

    const pageSize = 10;
    const apiStatus = STATUS_TAB_TO_API[activeTab];

    const { data, isLoading, isFetching, isError, error, refetch } = usePurchasedTicketLookup({
        page,
        size: pageSize,
        status: apiStatus,
        ticketNumber: searchCode.trim() || undefined,
        sortBy: 'createdAt',
        direction: 'desc',
    });

    const tickets = (data?.data?.recordList ?? []) as PurchasedTicket[];
    const pagination = normalizePagination(data?.data?.pagination, page, pageSize);
    const totalPages = pagination.totalPages;
    const totalRecords = pagination.totalRecords;

    const ticketTabs: StatusTab[] = ['Tất cả', 'Chờ quay số', 'Trúng thưởng', 'Không trúng'];

    // Calculators for top metrics summary
    const pendingCount = tickets.filter(t => t.drawResultStatus === 'PENDING_DRAW').length;
    const wonCount = tickets.filter(t => t.drawResultStatus === 'WON').length;
    const totalWonAmount = tickets.reduce((acc, t) => acc + (t.drawResultStatus === 'WON' ? (t.prizeAmount || 0) : 0), 0);

    const openDetail = (ticket: PurchasedTicket) => setSelectedTicket(ticket);
    const closeDetail = () => setSelectedTicket(null);

    useEffect(() => {
        scrollToTop();
    }, [selectedTicket]);

    const copyOrderCode = async (code?: string) => {
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            toast.success('Đã sao chép mã giao dịch');
        } catch {
            toast.error('Không thể sao chép mã giao dịch');
        }
    };

    const getStatusBadge = (ticket: PurchasedTicket) => {
        const ui = STATUS_UI[ticket.drawResultStatus] ?? STATUS_UI.PENDING_DRAW;

        if (ticket.drawResultStatus === 'PENDING_DRAW') {
            const possession = resolveTicketPossessionDisplay(ticket);
            return (
                <div className="flex flex-col items-start md:items-end gap-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200/80 shadow-xs">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        {ui.label}
                        <i className="fa-solid fa-clock text-[10px] ml-0.5"></i>
                    </div>
                    {possession && (
                        <div
                            className={`px-2.5 py-1 rounded-lg text-[11.5px] font-bold border flex items-center gap-1.5 ${possession.className}`}
                        >
                            <i className={`${possession.icon} text-[10px]`}></i>
                            {possession.label}
                        </div>
                    )}
                </div>
            );
        }

        if (ticket.drawResultStatus === 'WON') {
            const payoutDisplay = resolveTicketPayoutDisplay(ticket);
            return (
                <div className="flex flex-col items-start md:items-end gap-1.5">
                    <div className="px-3 py-1 rounded-full text-[12px] font-black bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-xs flex items-center gap-1.5">
                        <i className="fa-solid fa-trophy text-[11px] text-amber-200 animate-bounce"></i>
                        {ui.label}
                    </div>
                    {ticket.matchedPrizeDisplayName && (
                        <div className="px-3 py-1 rounded-xl text-[12.5px] font-black bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-amber-950 shadow-sm border border-amber-300/60 flex items-center gap-1.5 uppercase tracking-wide">
                            <i className="fa-solid fa-star text-[11px]"></i>
                            {ticket.matchedPrizeDisplayName}
                        </div>
                    )}
                    {payoutDisplay && (
                        <div
                            className={`px-2.5 py-1 rounded-lg text-[11.5px] font-bold border flex items-center gap-1.5 ${payoutDisplay.className}`}
                        >
                            <i className={`${payoutDisplay.icon} text-[10px]`}></i>
                            {payoutDisplay.label}
                        </div>
                    )}
                    {(() => {
                        const possession = resolveTicketPossessionDisplay(ticket);
                        if (!possession) return null;
                        return (
                            <div
                                className={`px-2.5 py-1 rounded-lg text-[11.5px] font-bold border flex items-center gap-1.5 ${possession.className}`}
                            >
                                <i className={`${possession.icon} text-[10px]`}></i>
                                {possession.label}
                            </div>
                        );
                    })()}
                </div>
            );
        }

        const possession = resolveTicketPossessionDisplay(ticket);
        return (
            <div className="flex flex-col items-start md:items-end gap-1.5">
                <div className="px-3 py-1 rounded-full text-[12px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shadow-xs">
                    {ui.label}
                </div>
                {possession && (
                    <div
                        className={`px-2.5 py-1 rounded-lg text-[11.5px] font-bold border flex items-center gap-1.5 ${possession.className}`}
                    >
                        <i className={`${possession.icon} text-[10px]`}></i>
                        {possession.label}
                    </div>
                )}
            </div>
        );
    };

    // DETAIL VIEW (Vé chi tiết dạng cuống xé kỹ thuật số sang trọng)
    if (selectedTicket) {
        const ui = STATUS_UI[selectedTicket.drawResultStatus] ?? STATUS_UI.PENDING_DRAW;
        const numberParts = splitTicketNumbers(selectedTicket.numbers);
        const isWon = selectedTicket.drawResultStatus === 'WON';
        const isEligibleForPayout = canRequestPrizePayout(selectedTicket);
        const ineligibilityReason = !isEligibleForPayout ? getPrizePayoutIneligibilityMessage(selectedTicket) : null;

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
                        {/* Header Row */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-dashed border-slate-200">
                            <div className="flex items-center gap-4 md:gap-5">
                                <div
                                    className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                                        isWon
                                            ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white'
                                            : selectedTicket.drawResultStatus === 'PENDING_DRAW'
                                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                            : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600'
                                    }`}
                                >
                                    <i className={`fa-solid ${isWon ? 'fa-trophy' : selectedTicket.drawResultStatus === 'PENDING_DRAW' ? 'fa-ticket-simple' : 'fa-ticket'} text-[30px] md:text-[36px]`}></i>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h3 className="text-[20px] md:text-[24px] font-black text-slate-900 m-0 tracking-tight">
                                            {selectedTicket.stationName || 'Vé số Đại Phát'}
                                        </h3>
                                        {getStatusBadge(selectedTicket)}
                                    </div>
                                    <p className="text-[13px] md:text-[14px] text-slate-500 mb-0.5 font-medium">
                                        📅 Ngày mở thưởng: <span className="text-slate-800 font-bold">{formatDrawDate(selectedTicket.drawDate)}</span>
                                    </p>
                                    <p className="text-[13px] text-slate-400 m-0">
                                        Kỳ mở thưởng: <span className="font-bold text-slate-600">{formatShortDate(selectedTicket.drawDate)}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-6 bg-slate-50 md:bg-slate-50/80 p-4 md:px-6 md:py-3.5 rounded-2xl border border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Mã serial vé</span>
                                    <span className="text-[18px] md:text-[22px] font-black tracking-tight text-red-600">
                                        {selectedTicket.serialNumber || selectedTicket.numbers}
                                    </span>
                                </div>
                                <div className="h-8 w-[1px] bg-slate-200"></div>
                                <div className="flex flex-col items-end md:items-start">
                                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Giá vé</span>
                                    <span className="text-[16px] md:text-[18px] font-extrabold text-slate-900">
                                        {formatMoney(selectedTicket.price)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3D Glossy Numbers Display Section */}
                        <div className="flex flex-col gap-3">
                            <span className="text-[13px] text-slate-500 font-bold uppercase tracking-wider">Bộ số dự thưởng</span>
                            <div className="flex items-center gap-2.5 md:gap-4 flex-wrap bg-slate-50/80 p-4 md:p-6 rounded-2xl border border-slate-200/60 shadow-inner">
                                {numberParts.length > 0 ? (
                                    numberParts.map((num, i) => (
                                        <motion.div
                                            key={`${num}-${i}`}
                                            whileHover={{ scale: 1.1, y: -2 }}
                                            className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-[18px] md:text-[24px] font-black tracking-tight ${
                                                isWon
                                                    ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-[0_6px_16px_rgba(245,158,11,0.4),inset_0_2px_4px_rgba(255,255,255,0.9)] border-2 border-amber-300'
                                                    : 'bg-gradient-to-b from-white via-slate-100 to-slate-200 text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_2px_3px_rgba(255,255,255,1)] border border-slate-300/80'
                                            }`}
                                        >
                                            {num}
                                        </motion.div>
                                    ))
                                ) : (
                                    <span className="text-[24px] font-black tracking-wider text-red-600">
                                        {selectedTicket.numbers}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Perforated Cutout Separator (Ticket Stub Notch Effect) */}
                        <div className="relative my-2">
                            <div className="absolute -left-8 -top-3 w-6 h-6 rounded-full bg-[#F8F9FA] border-r border-slate-300"></div>
                            <div className="absolute -right-8 -top-3 w-6 h-6 rounded-full bg-[#F8F9FA] border-l border-slate-300"></div>
                            <div className="border-t-2 border-dashed border-slate-200"></div>
                        </div>

                        {/* Result & verification section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Detailed Info Grid */}
                            <div className="lg:col-span-2 flex flex-col gap-3.5">
                                <h4 className="text-slate-900 font-extrabold text-[15px] uppercase tracking-wider flex items-center gap-2 mb-1">
                                    <i className="fa-solid fa-circle-info text-red-600"></i> Thông tin chi tiết vé
                                </h4>

                                <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 flex flex-col gap-3">
                                    <div className="flex items-center justify-between text-[14px]">
                                        <span className="text-slate-500 font-medium">Thời gian mua vé</span>
                                        <span className="text-slate-900 font-bold">{formatDateTime(selectedTicket.purchasedAt)}</span>
                                    </div>
                                    <div className="h-[1px] bg-slate-200/60"></div>

                                    <div className="flex items-center justify-between text-[14px]">
                                        <span className="text-slate-500 font-medium">Kỳ vé số</span>
                                        <span className="text-slate-900 font-bold">{formatShortDate(selectedTicket.drawDate)}</span>
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
                                                        {selectedTicket.actualPickedUpAt ? (
                                                            <span className="text-[12px] text-slate-500 font-medium">
                                                                Lấy lúc {formatDateTime(selectedTicket.actualPickedUpAt)}
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

                            {/* Digital Verification QR Code Card */}
                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 rounded-2xl p-5 text-white flex flex-col items-center justify-center text-center shadow-lg border border-slate-700">
                                <span className="text-[11px] uppercase tracking-widest text-slate-400 font-extrabold mb-3">
                                    Xác thực vé điện tử
                                </span>
                                <div className="bg-white p-3 rounded-xl shadow-inner mb-3">
                                    <QRCode
                                        value={String(selectedTicket.orderCode || selectedTicket.ticketId || 'DAIPHAT-LOTTERY')}
                                        size={120}
                                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                    />
                                </div>
                                <span className="text-[12px] font-mono text-slate-300 font-bold tracking-wider">
                                    {selectedTicket.orderCode || 'VERIFIED'}
                                </span>
                            </div>
                        </div>

                        {/* Prize payout action box for winning tickets */}
                        {isWon && (() => {
                            const payoutDisplay = resolveTicketPayoutDisplay(selectedTicket);
                            return (
                            <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 rounded-2xl p-5 border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md">
                                        <i className="fa-solid fa-gift text-[18px]"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-amber-950 font-black text-[16px] mb-0.5">Chúc mừng bạn đã trúng thưởng!</h4>
                                        <p className="text-slate-600 text-[13px] m-0">
                                            {isEligibleForPayout
                                                ? 'Bạn có thể gửi yêu cầu trả thưởng online. Tiền sẽ được chuyển sau khi nhân viên duyệt.'
                                                : selectedTicket.claimChannel === 'IN_PERSON' || selectedTicket.canClaimOnline === false
                                                    ? 'Vé này cần mang đến đại lý để đổi thưởng trực tiếp.'
                                                    : 'Tiền thưởng sẽ được chuyển tới tài khoản ngân hàng của bạn sau khi yêu cầu được duyệt.'}
                                        </p>
                                    </div>
                                </div>

                                {isEligibleForPayout ? (
                                    <button
                                        type="button"
                                        onClick={() => setPayoutModalOpen(true)}
                                        className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white font-black rounded-xl text-[14px] shadow-md shadow-amber-500/20 hover:shadow-lg hover:brightness-105 transition-all cursor-pointer whitespace-nowrap"
                                    >
                                        🏆 Yêu cầu trả thưởng ngay
                                    </button>
                                ) : selectedTicket.activePayoutRequestId ? (
                                    <Link
                                        to={`/profile/prize-payouts/${selectedTicket.activePayoutRequestId}`}
                                        className="text-amber-700 font-bold text-[14px] hover:underline no-underline"
                                    >
                                        Xem yêu cầu đang xử lý →
                                    </Link>
                                ) : (
                                    <div className="flex flex-col items-start md:items-end gap-1">
                                        {payoutDisplay && (
                                            <div
                                                className={`px-3 py-1.5 rounded-xl text-[12.5px] font-bold border flex items-center gap-1.5 ${payoutDisplay.className}`}
                                            >
                                                <i className={`${payoutDisplay.icon} text-[12px]`}></i>
                                                {payoutDisplay.label}
                                            </div>
                                        )}
                                        {ineligibilityReason && (
                                            <span className="text-[12px] text-slate-500 font-medium">
                                                {ineligibilityReason}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            );
                        })()}

                        {/* Action buttons footer */}
                        <div className="flex items-center justify-between pt-2">
                            <Link
                                to="/lich-mo-thuong"
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[13.5px] transition-colors no-underline flex items-center gap-2"
                            >
                                <i className="fa-solid fa-calendar-days"></i> Xem kết quả kỳ quay
                            </Link>

                            <Link
                                to={`/buy-ticket?ticketId=${selectedTicket.ticketId}`}
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
            {/* Top Metrics Dashboard Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Tickets Card */}
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 shadow-xs">
                        <i className="fa-solid fa-ticket-simple text-[22px]"></i>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Tổng số vé đã mua</span>
                        <span className="text-[22px] font-black text-slate-900">{totalRecords} <span className="text-[13px] font-semibold text-slate-500">vé</span></span>
                    </div>
                </div>

                {/* Pending Draw Card */}
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-amber-200/80 shadow-[0_4px_20px_rgba(245,158,11,0.04)] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 shadow-xs relative">
                        <i className="fa-solid fa-clock text-[22px]"></i>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-amber-700/80 uppercase tracking-wider">Đang chờ quay số</span>
                        <span className="text-[22px] font-black text-amber-600">{pendingCount} <span className="text-[13px] font-semibold text-amber-700/70">vé</span></span>
                    </div>
                </div>

                {/* Won Tickets Card */}
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.08)] flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
                        <i className="fa-solid fa-trophy text-[22px]"></i>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-amber-900 uppercase tracking-wider">Vé trúng thưởng</span>
                        <span className="text-[22px] font-black text-amber-700 leading-tight">
                            {wonCount}{' '}
                            <span className="text-[13px] font-semibold text-slate-600">vé</span>
                            {totalWonAmount > 0 && (
                                <span className="text-[13px] font-black text-amber-800 ml-1">
                                    ({formatMoney(totalWonAmount)})
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search Header Container */}
            <div className="bg-white border border-slate-200/90 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4 p-4 md:p-5 border-b border-slate-100 bg-slate-50/60">
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

                    {/* Search Code / Numbers */}
                    <div className="relative min-w-[240px] w-full lg:w-auto">
                        <input
                            type="text"
                            value={searchCode}
                            onChange={(e) => {
                                setSearchCode(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Tìm mã vé / bộ số..."
                            className="w-full pl-10 pr-9 py-2.5 border border-slate-200 bg-white rounded-xl text-[13.5px] outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-semibold placeholder:font-normal text-slate-800 shadow-xs"
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
                </div>

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
                    ) : tickets.length === 0 ? (
                        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[28px] mb-4">
                                <i className="fa-solid fa-ticket-simple"></i>
                            </div>
                            <p className="font-extrabold text-[16px] text-slate-800 m-0">Chưa tìm thấy vé số nào</p>
                            <p className="text-[13px] mt-1 text-slate-400">Vé bạn mua hoặc tìm kiếm sẽ xuất hiện tại đây.</p>
                            <Link
                                to="/buy-ticket"
                                className="inline-flex mt-4 px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold rounded-xl text-[14px] no-underline shadow-md shadow-red-600/20 hover:brightness-110 transition-all"
                            >
                                Mua vé ngay
                            </Link>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {tickets.map((ticket, index) => {
                                const ui = STATUS_UI[ticket.drawResultStatus] ?? STATUS_UI.PENDING_DRAW;
                                const numberParts = splitTicketNumbers(ticket.numbers);
                                const isWon = ticket.drawResultStatus === 'WON';

                                return (
                                    <motion.div
                                        key={ticketKey(ticket)}
                                        layout
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        whileHover={{ y: -2 }}
                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                        onClick={() => openDetail(ticket)}
                                        className="relative p-4 md:p-5 hover:bg-slate-50/80 transition-all duration-200 cursor-pointer group flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6 border-b border-slate-100 last:border-0"
                                    >
                                        {/* Left & Right Notch Effect for ticket stub feel */}
                                        <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F8F9FA] border-r border-slate-200 hidden md:block z-10"></div>
                                        <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F8F9FA] border-l border-slate-200 hidden md:block z-10"></div>

                                        {/* Mobile Top Header */}
                                        <div className="flex md:hidden items-start justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
                                                        isWon
                                                            ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white border-amber-300'
                                                            : 'bg-amber-50 text-amber-600 border-amber-200'
                                                    }`}
                                                >
                                                    <i className={`fa-solid ${isWon ? 'fa-trophy' : 'fa-ticket-simple'} text-[18px]`}></i>
                                                </div>
                                                <div className="flex flex-col">
                                                    <h4 className="text-[15px] font-black text-slate-900 mb-0.5">
                                                        {ticket.stationName || 'Vé số'}
                                                    </h4>
                                                    <p className="text-[12px] text-slate-400 font-medium">
                                                        Kỳ vé: {formatShortDate(ticket.drawDate)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>{getStatusBadge(ticket)}</div>
                                        </div>

                                        {/* Desktop Station Header */}
                                        <div className="hidden md:flex items-center gap-4 min-w-[220px]">
                                            <div
                                                className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-transform group-hover:scale-105 ${
                                                    isWon
                                                        ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white border-amber-300/60 shadow-amber-500/20'
                                                        : ticket.drawResultStatus === 'PENDING_DRAW'
                                                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white border-amber-300/50'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}
                                            >
                                                <i className={`fa-solid ${isWon ? 'fa-trophy text-amber-100' : 'fa-ticket-simple'} text-[22px]`}></i>
                                            </div>
                                            <div className="flex flex-col">
                                                <h4 className="text-[15.5px] font-black text-slate-900 mb-0.5 group-hover:text-red-600 transition-colors tracking-tight">
                                                    {ticket.stationName || 'Vé số'}
                                                </h4>
                                                <p className="text-[12px] text-slate-500 font-medium">
                                                    Ngày mở thưởng: <span className="font-bold text-slate-700">{formatShortDate(ticket.drawDate)}</span>
                                                </p>
                                                <p className="text-[11.5px] text-slate-400">
                                                    Kỳ vé: {formatShortDate(ticket.drawDate)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Serial Number */}
                                        <div className="hidden md:flex flex-col w-[160px]">
                                            <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                                Mã vé
                                            </span>
                                            <span className="text-[15px] font-black tracking-tight text-red-600">
                                                {ticket.serialNumber || ticket.numbers}
                                            </span>
                                        </div>

                                        {/* 3D Glossy Lottery Ball Numbers */}
                                        <div className="hidden md:flex flex-col flex-1">
                                            <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                                Bộ số
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {numberParts.length > 0 ? (
                                                    numberParts.map((num, i) => (
                                                        <div
                                                            key={`${num}-${i}`}
                                                            className={`w-9 h-9 rounded-full flex items-center justify-center text-[13.5px] font-black tracking-tight transition-transform group-hover:scale-105 ${
                                                                isWon
                                                                    ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-[0_3px_8px_rgba(245,158,11,0.35),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-amber-300'
                                                                    : 'bg-gradient-to-b from-white via-slate-100 to-slate-200 text-slate-900 shadow-[0_3px_6px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,1)] border border-slate-300/80'
                                                            }`}
                                                        >
                                                            {num}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-[16px] font-black tracking-wider text-slate-900">
                                                        {ticket.numbers}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="hidden md:flex flex-col w-[110px] shrink-0">
                                            <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                                Giá vé
                                            </span>
                                            <span className="text-[15px] font-extrabold text-slate-900">
                                                {formatMoney(ticket.price)}
                                            </span>
                                        </div>

                                        {/* Status Badge Desktop */}
                                        <div className="hidden md:flex flex-col items-end min-w-[160px] shrink-0">
                                            <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                                Trạng thái
                                            </span>
                                            {getStatusBadge(ticket)}
                                        </div>

                                        {/* Mobile Details Container */}
                                        <div className="flex md:hidden flex-col gap-3 bg-slate-50/90 rounded-2xl p-3.5 w-full border border-slate-200/80">
                                            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                        Mã vé
                                                    </span>
                                                    <span className="text-[14px] font-black text-red-600">
                                                        {ticket.serialNumber || ticket.numbers}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                        Giá vé
                                                    </span>
                                                    <span className="text-[14px] font-extrabold text-slate-900">
                                                        {formatMoney(ticket.price)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                    Bộ số
                                                </span>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {numberParts.map((num, i) => (
                                                        <div
                                                            key={`${num}-${i}`}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black ${
                                                                isWon
                                                                    ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-xs border border-amber-300'
                                                                    : 'bg-white shadow-xs border border-slate-200 text-slate-900'
                                                            }`}
                                                        >
                                                            {num}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Arrow indicator */}
                                        <div className="hidden md:flex items-center justify-center text-slate-300 group-hover:text-red-600 group-hover:translate-x-1 transition-all shrink-0 pl-1">
                                            <i className="fa-solid fa-chevron-right text-[13px]"></i>
                                        </div>
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
        </div>
    );
};
