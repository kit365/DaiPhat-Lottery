import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { Pagination } from '../../../../components/common/Pagination';
import { usePurchasedTicketLookup } from '../../../../hooks/usePurchasedTicketLookup';
import {
    PurchasedTicket,
    TicketDrawResultStatus,
} from '../../../../../types/lottery-ticket.type';
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
    { label: string; color: string; bgColor: string; badgeClass: string }
> = {
    PENDING_DRAW: {
        label: 'Chờ quay số',
        color: '#FFB020',
        bgColor: '#FFF9F3',
        badgeClass: 'bg-[#FFF9F3] text-[#FFB020]',
    },
    WON: {
        label: 'Trúng thưởng',
        color: '#1CD162',
        bgColor: '#F4FBFA',
        badgeClass: 'bg-[#E4F8ED] text-[#1CD162]',
    },
    LOST: {
        label: 'Không trúng',
        color: '#ee1314',
        bgColor: '#FFF4F4',
        badgeClass: 'bg-[#FFF4F4] text-[#ee1314]',
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

/** Hiển thị số vé dạng từng cặp 2 chữ số nếu đủ chẵn, ngược lại tách từng ký tự. */
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
    const pagination = data?.data?.pagination;
    const totalPages = pagination?.totalPages ?? 1;
    const totalRecords = pagination?.totalElements ?? tickets.length;

    const ticketTabs: StatusTab[] = ['Tất cả', 'Chờ quay số', 'Trúng thưởng', 'Không trúng'];

    const openDetail = (ticket: PurchasedTicket) => setSelectedTicket(ticket);
    const closeDetail = () => setSelectedTicket(null);

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
            return (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[12px] font-extrabold bg-[#FFF9F3] text-[#FFB020] border border-[#FFB020]/25 shadow-xs">
                    {ui.label} <i className="fa-solid fa-clock text-[10px]"></i>
                </div>
            );
        }
        if (ticket.drawResultStatus === 'WON') {
            return (
                <div className="flex flex-col items-start md:items-end gap-1.5">
                    <div className="px-3 py-1 rounded-xl text-[12px] font-black bg-[#E4F8ED] text-[#1CD162] border border-[#1CD162]/30 flex items-center gap-1.5 shadow-xs">
                        <i className="fa-solid fa-circle-check text-[11px]"></i> {ui.label}
                    </div>
                    {ticket.matchedPrizeDisplayName && (
                        <div className="px-3.5 py-1.5 rounded-xl text-[13.5px] font-black bg-gradient-to-r from-[#1CD162] to-[#10B981] text-white shadow-sm shadow-[#1CD162]/25 flex items-center gap-1.5 uppercase tracking-wide">
                            <i className="fa-solid fa-trophy text-[12px] text-amber-300"></i>
                            {ticket.matchedPrizeDisplayName}
                        </div>
                    )}
                </div>
            );
        }
        return (
            <div className="px-3 py-1 rounded-xl text-[12px] font-extrabold bg-[#FFF4F4] text-[#ee1314] border border-[#ee1314]/20 shadow-xs">
                {ui.label}
            </div>
        );
    };

    if (selectedTicket) {
        const ui = STATUS_UI[selectedTicket.drawResultStatus] ?? STATUS_UI.PENDING_DRAW;
        const numberParts = splitTicketNumbers(selectedTicket.numbers);
        const isWon = selectedTicket.drawResultStatus === 'WON';

        return (
            <div className="flex flex-col gap-6 w-full font-client-main pb-24 md:pb-0">
                <button
                    type="button"
                    onClick={closeDetail}
                    className="hidden md:flex items-center gap-2 text-[#ee1314] font-bold text-[14px] hover:underline w-max bg-transparent border-none cursor-pointer outline-none"
                >
                    <i className="fa-solid fa-chevron-left text-[12px]"></i>
                    Quay lại danh sách vé
                </button>

                <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4 md:p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-5 md:gap-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 md:gap-6">
                        <div className="flex items-center gap-4 md:gap-5">
                            <div
                                className="w-14 h-14 md:w-16 md:h-16 rounded-[14px] md:rounded-[16px] flex items-center justify-center shrink-0"
                                style={{ backgroundColor: ui.bgColor, color: ui.color }}
                            >
                                <i className="fa-solid fa-ticket-simple text-[24px] md:text-[28px]"></i>
                            </div>
                            <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <h3 className="text-[16px] md:text-[18px] font-black text-[#212B36] m-0">
                                        {selectedTicket.stationName || 'Vé số'}
                                    </h3>
                                    <div className={`px-2 py-0.5 rounded text-[10px] md:text-[11px] font-bold ${ui.badgeClass}`}>
                                        {ui.label}
                                    </div>
                                </div>
                                <p className="text-[12px] md:text-[13px] text-[#637381] mb-0.5">
                                    Ngày mở thưởng: {formatDrawDate(selectedTicket.drawDate)}
                                </p>
                                <p className="text-[12px] md:text-[13px] text-[#637381] m-0">
                                    Kỳ vé: {formatShortDate(selectedTicket.drawDate)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between w-full md:w-auto md:justify-end md:gap-16 bg-[#F8F9FA] md:bg-transparent p-3 md:p-0 rounded-xl">
                            <div className="flex flex-col">
                                <span className="text-[11px] md:text-[13px] text-[#637381] mb-1">Mã vé</span>
                                <span className="text-[16px] md:text-[20px] font-black" style={{ color: ui.color }}>
                                    {selectedTicket.serialNumber || selectedTicket.numbers}
                                </span>
                            </div>
                            <div className="flex flex-col items-end md:items-start">
                                <span className="text-[11px] md:text-[13px] text-[#637381] mb-1">Giá vé</span>
                                <span className="text-[16px] md:text-[18px] font-bold text-[#212B36]">
                                    {formatMoney(selectedTicket.price)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-[#E5E8EB] pt-5">
                        <span className="text-[13px] text-[#637381] block mb-3 font-medium">Bộ số đã chọn</span>
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            {numberParts.length > 0 ? (
                                numberParts.map((num, i) => (
                                    <div
                                        key={`${num}-${i}`}
                                        className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-[#F4F6F8] border border-[#E5E8EB] shadow-[0_2px_4px_rgb(0,0,0,0.02)] flex items-center justify-center text-[16px] md:text-[20px] font-black text-[#212B36]"
                                    >
                                        {num}
                                    </div>
                                ))
                            ) : (
                                <span className="text-[18px] font-black tracking-wider text-[#ee1314]">
                                    {selectedTicket.numbers}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4 md:p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 md:gap-6">
                    <div className="flex items-center gap-4 md:gap-5 w-full md:w-auto">
                        <div
                            className="w-[44px] h-[44px] md:w-[50px] md:h-[50px] rounded-full text-white flex items-center justify-center shrink-0"
                            style={{ backgroundColor: ui.color }}
                        >
                            <i className={`fa-solid ${isWon ? 'fa-trophy' : selectedTicket.drawResultStatus === 'PENDING_DRAW' ? 'fa-clock' : 'fa-xmark'} text-[20px] md:text-[22px]`}></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[12px] md:text-[13px] text-[#637381] mb-0.5">Kết quả đối chiếu</span>
                            <span className="text-[16px] md:text-[18px] font-bold" style={{ color: ui.color }}>
                                {ui.label}
                            </span>
                        </div>
                    </div>

                    {isWon && (
                        <div className="flex items-center justify-between w-full md:w-auto md:justify-end md:gap-16 bg-[#F4FBFA] md:bg-transparent p-3 md:p-0 rounded-xl border border-[#E4F8ED] md:border-none">
                            <div className="flex flex-col">
                                <span className="text-[11px] md:text-[13px] text-[#637381] mb-1">Giải trúng</span>
                                <span className="text-[14px] md:text-[16px] font-bold text-[#212B36]">
                                    {selectedTicket.matchedPrizeDisplayName || selectedTicket.matchedPrizeCode || '—'}
                                </span>
                            </div>
                        </div>
                    )}

                    <Link
                        to="/lich-mo-thuong"
                        className="w-full md:w-auto px-5 py-2.5 bg-white border border-[#ee1314] text-[#ee1314] font-bold rounded-xl text-[14px] hover:bg-[#FFF4F4] transition-colors cursor-pointer text-center no-underline"
                    >
                        Xem kết quả kỳ quay
                    </Link>
                </div>

                <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4 md:p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
                    <h4 className="text-[#ee1314] font-bold text-[14px] uppercase mb-6 tracking-wide">THÔNG TIN VÉ</h4>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between py-3 border-b border-dashed border-[#E5E8EB]">
                            <span className="text-[#637381] text-[14px]">Ngày mua</span>
                            <span className="text-[#212B36] font-medium text-[14px]">
                                {formatDateTime(selectedTicket.purchasedAt)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-dashed border-[#E5E8EB]">
                            <span className="text-[#637381] text-[14px]">Kỳ vé</span>
                            <span className="text-[#212B36] font-medium text-[14px]">
                                {formatShortDate(selectedTicket.drawDate)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-dashed border-[#E5E8EB]">
                            <span className="text-[#637381] text-[14px]">Trạng thái</span>
                            <div className={`px-3 py-1 rounded-md text-[13px] font-bold ${ui.badgeClass}`}>
                                {ui.label}
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-dashed border-[#E5E8EB]">
                            <span className="text-[#637381] text-[14px]">Giá vé</span>
                            <span className="text-[#212B36] font-medium text-[14px]">
                                {formatMoney(selectedTicket.price)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-dashed border-[#E5E8EB] last:border-0">
                            <span className="text-[#637381] text-[14px]">Mã giao dịch (Order ID)</span>
                            <button
                                type="button"
                                onClick={() => copyOrderCode(selectedTicket.orderCode)}
                                className="flex items-center gap-2 text-[#212B36] font-medium text-[14px] bg-transparent border-none cursor-pointer"
                            >
                                {selectedTicket.orderCode}
                                <i className="fa-regular fa-copy text-[#919EAB] hover:text-[#212B36] transition-colors" title="Sao chép"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {isWon && (
                    <div className="bg-[#FFF4F4] rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border border-[#ee1314]/10 mb-6 md:mb-0">
                        <div className="flex items-start md:items-center gap-3">
                            <i className="fa-solid fa-circle-info text-[#ee1314] text-[18px] md:text-[20px] mt-0.5 md:mt-0"></i>
                            <span className="text-[#454F5B] text-[13px] md:text-[14px] leading-relaxed">
                                Tiền thưởng sẽ được cộng vào số dư tài khoản của bạn.
                            </span>
                        </div>
                    </div>
                )}

                <div className="hidden md:flex justify-end gap-4 mt-2">
                    <Link
                        to={`/buy-ticket?ticketId=${selectedTicket.ticketId}`}
                        className="px-6 py-2.5 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] shadow-sm hover:bg-[#c80f11] transition-colors cursor-pointer flex items-center gap-2 no-underline"
                    >
                        <i className="fa-solid fa-cart-plus"></i>
                        Mua lại bộ số này
                    </Link>
                </div>

                <div className="md:hidden fixed bottom-[70px] lg:bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E8EB] flex gap-3 z-30 shadow-[0_-4px_20px_rgb(0,0,0,0.05)]">
                    <button
                        type="button"
                        onClick={closeDetail}
                        className="flex-1 py-3 bg-[#F4F6F8] text-[#212B36] font-bold rounded-xl text-[14px] transition-colors cursor-pointer text-center"
                    >
                        Quay lại
                    </button>
                    <Link
                        to={`/buy-ticket?ticketId=${selectedTicket.ticketId}`}
                        className="flex-[2] py-3 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] shadow-sm transition-colors cursor-pointer text-center flex items-center justify-center gap-2 no-underline"
                    >
                        <i className="fa-solid fa-cart-plus text-[16px]"></i>
                        Mua lại
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white border border-[#E5E8EB] rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 md:p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]/60">
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto scrollbar-hide pb-2 lg:pb-0">
                        {ticketTabs.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => {
                                    setActiveTab(tab);
                                    setPage(1);
                                }}
                                className={`px-4 py-2.5 text-[13.5px] font-extrabold whitespace-nowrap rounded-xl transition-all duration-200 cursor-pointer ${
                                    activeTab === tab
                                        ? 'text-[#ee1314] bg-white shadow-xs border border-[#ee1314]/20'
                                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/70 font-semibold'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto scrollbar-hide pb-2 lg:pb-0">
                        <div className="relative min-w-[220px] flex-1 lg:flex-none">
                            <input
                                type="text"
                                value={searchCode}
                                onChange={(e) => {
                                    setSearchCode(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Tìm mã vé / dãy số..."
                                className="w-full pl-9 pr-3.5 py-2.5 border border-[#E2E8F0] bg-white rounded-xl text-[13.5px] outline-none focus:border-[#ee1314] focus:ring-2 focus:ring-[#ee1314]/10 transition-all font-medium placeholder:font-normal text-[#0F172A] shadow-xs"
                            />
                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[13px]"></i>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col divide-y divide-[#F1F5F9]">
                    {isError ? (
                        <div className="py-16 text-center text-[#64748B]">
                            <p className="font-bold text-[#ee1314] text-[15px]">Không tải được danh sách vé</p>
                            <p className="text-[13px] mt-1">
                                {(error as { response?: { data?: { message?: string } } })?.response?.data?.message
                                    || 'Vui lòng thử lại sau.'}
                            </p>
                            <button
                                type="button"
                                onClick={() => refetch()}
                                className="inline-flex mt-4 px-5 py-2.5 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] border-none cursor-pointer shadow-xs hover:bg-[#c80f11] transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : (isLoading || isFetching) && tickets.length === 0 ? (
                        <div className="py-16 text-center text-[#64748B] font-medium">Đang tải danh sách vé...</div>
                    ) : tickets.length === 0 ? (
                        <div className="py-16 text-center text-[#64748B]">
                            <i className="fa-solid fa-ticket-simple text-[32px] text-[#CBD5E1] mb-3 block"></i>
                            <p className="font-extrabold text-[15px] text-[#0F172A]">Chưa có vé nào</p>
                            <p className="text-[13px] mt-1 text-[#64748B]">Vé bạn mua sẽ hiển thị tại đây.</p>
                            <Link
                                to="/buy-ticket"
                                className="inline-flex mt-4 px-5 py-2.5 bg-[#ee1314] text-white font-extrabold rounded-xl text-[14px] no-underline shadow-xs hover:bg-[#c80f11] transition-colors"
                            >
                                Mua vé ngay
                            </Link>
                        </div>
                    ) : (
                        tickets.map((ticket) => {
                            const ui = STATUS_UI[ticket.drawResultStatus] ?? STATUS_UI.PENDING_DRAW;
                            const numberParts = splitTicketNumbers(ticket.numbers);

                            return (
                                <div
                                    key={ticketKey(ticket)}
                                    onClick={() => openDetail(ticket)}
                                    className="flex flex-col md:flex-row items-stretch md:items-center p-4 md:p-5 gap-4 md:gap-6 hover:bg-[#F8FAFC] transition-all duration-150 cursor-pointer group"
                                >
                                    <div className="flex md:hidden items-start justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs"
                                                style={{ backgroundColor: ui.bgColor, color: ui.color, borderColor: `${ui.color}35` }}
                                            >
                                                <i className="fa-solid fa-ticket-simple text-[18px]"></i>
                                            </div>
                                            <div className="flex flex-col">
                                                <h4 className="text-[14.5px] font-extrabold text-[#0F172A] mb-0.5">
                                                    {ticket.stationName || 'Vé số'}
                                                </h4>
                                                <p className="text-[11.5px] text-[#64748B]">
                                                    Kỳ vé: {formatShortDate(ticket.drawDate)}
                                                </p>
                                            </div>
                                        </div>
                                        <div>{getStatusBadge(ticket)}</div>
                                    </div>

                                    <div className="hidden md:flex items-center gap-4 min-w-[220px]">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-transform group-hover:scale-105"
                                            style={{ backgroundColor: ui.bgColor, color: ui.color, borderColor: `${ui.color}35` }}
                                        >
                                            <i className="fa-solid fa-ticket-simple text-[20px]"></i>
                                        </div>
                                        <div className="flex flex-col">
                                            <h4 className="text-[15px] font-extrabold text-[#0F172A] mb-0.5 group-hover:text-[#ee1314] transition-colors">
                                                {ticket.stationName || 'Vé số'}
                                            </h4>
                                            <p className="text-[12px] text-[#64748B] font-medium">
                                                Ngày mở thưởng: {formatShortDate(ticket.drawDate)}
                                            </p>
                                            <p className="text-[12px] text-[#94A3B8]">
                                                Kỳ vé: {formatShortDate(ticket.drawDate)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex flex-col w-[160px]">
                                        <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Mã vé</span>
                                        <span className="text-[14.5px] font-black tracking-tight" style={{ color: ui.color }}>
                                            {ticket.serialNumber || ticket.numbers}
                                        </span>
                                    </div>

                                    <div className="hidden md:flex flex-col flex-1">
                                        <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Số vé</span>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {numberParts.length > 0 ? (
                                                numberParts.map((num, i) => (
                                                    <div
                                                        key={`${num}-${i}`}
                                                        className="w-8 h-8 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs flex items-center justify-center text-[13px] font-black text-[#0F172A]"
                                                    >
                                                        {num}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-[15px] font-black tracking-wider text-[#0F172A]">
                                                    {ticket.numbers}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="hidden md:flex flex-col w-[100px] shrink-0">
                                        <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Giá vé</span>
                                        <span className="text-[14.5px] font-extrabold text-[#0F172A]">
                                            {formatMoney(ticket.price)}
                                        </span>
                                    </div>

                                    <div className="hidden md:flex flex-col items-start md:items-end min-w-[150px] shrink-0">
                                        <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Trạng thái</span>
                                        {getStatusBadge(ticket)}
                                    </div>

                                    <div className="flex md:hidden flex-col gap-3 bg-[#F8FAFC] rounded-2xl p-3.5 w-full border border-[#E2E8F0]">
                                        <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2.5">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">
                                                    Mã vé
                                                </span>
                                                <span className="text-[13.5px] font-black" style={{ color: ui.color }}>
                                                    {ticket.serialNumber || ticket.numbers}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">
                                                    Giá vé
                                                </span>
                                                <span className="text-[13.5px] font-extrabold text-[#0F172A]">
                                                    {formatMoney(ticket.price)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">
                                                Bộ số
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {numberParts.map((num, i) => (
                                                    <div
                                                        key={`${num}-${i}`}
                                                        className="w-8 h-8 rounded-full bg-white shadow-xs border border-[#E2E8F0] flex items-center justify-center text-[12.5px] font-black text-[#0F172A]"
                                                    >
                                                        {num}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex items-center justify-center text-[#94A3B8] group-hover:text-[#ee1314] transition-colors shrink-0 pl-1">
                                        <i className="fa-solid fa-chevron-right text-[13px]"></i>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {totalPages > 1 && (
                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        totalRecords={totalRecords}
                        limit={pageSize}
                    />
                )}
            </div>
        </div>
    );
};
