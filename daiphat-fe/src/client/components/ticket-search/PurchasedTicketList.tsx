import React from 'react';
import dayjs from 'dayjs';
import { PurchasedTicket } from '../../../types/lottery-ticket.type';
import { TicketResultBadge } from './TicketResultBadge';

interface PurchasedTicketListProps {
    tickets: PurchasedTicket[];
    isLoading: boolean;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const PurchasedTicketList: React.FC<PurchasedTicketListProps> = ({
    tickets,
    isLoading,
    page,
    totalPages,
    onPageChange,
}) => {
    if (isLoading) {
        return <div className="py-12 text-center text-[#637381]">Đang tải vé đã mua...</div>;
    }

    if (tickets.length === 0) {
        return (
            <div className="py-12 text-center text-[#637381]">
                <p className="font-medium">Không có vé phù hợp</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {tickets.map((ticket) => (
                <div
                    key={`${ticket.orderId}-${ticket.ticketId}-${ticket.serialNumber}`}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white border border-[#E5E8EB] rounded-2xl"
                >
                    <div>
                        <div className="text-[14px] font-bold text-[#212B36]">{ticket.stationName}</div>
                        <div className="text-[18px] font-black text-[#ee1314] tracking-wider mt-1">{ticket.numbers}</div>
                        <div className="text-[12px] text-[#637381] mt-1">
                            Mã đơn: {ticket.orderCode} • Xổ: {dayjs(ticket.drawDate).format('DD/MM/YYYY')}
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-[14px] font-bold text-[#212B36]">
                            {ticket.price.toLocaleString('vi-VN')}đ
                        </div>
                        <TicketResultBadge
                            status={ticket.drawResultStatus}
                            prizeDisplayName={ticket.matchedPrizeDisplayName}
                        />
                    </div>
                </div>
            ))}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                        className="px-3 py-1.5 border border-[#E5E8EB] rounded-lg text-[13px] disabled:opacity-40"
                    >
                        Trước
                    </button>
                    <span className="text-[13px] text-[#637381]">Trang {page} / {totalPages}</span>
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                        className="px-3 py-1.5 border border-[#E5E8EB] rounded-lg text-[13px] disabled:opacity-40"
                    >
                        Sau
                    </button>
                </div>
            )}
        </div>
    );
};
