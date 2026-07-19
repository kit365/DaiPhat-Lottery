import React from 'react';
import dayjs from 'dayjs';
import { PublicLotteryTicket } from '../../../types/lottery-ticket.type';
import { addPublicTicketToCart } from '../../utils/ticketCart.util';

interface AvailableTicketListProps {
    tickets: PublicLotteryTicket[];
    isLoading: boolean;
    drawDate: 'today' | 'tomorrow';
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const AvailableTicketList: React.FC<AvailableTicketListProps> = ({
    tickets,
    isLoading,
    drawDate,
    page,
    totalPages,
    onPageChange,
}) => {
    const dateLabel = drawDate === 'today'
        ? `Hôm nay, ${dayjs().format('DD/MM/YYYY')}`
        : `Ngày mai, ${dayjs().add(1, 'day').format('DD/MM/YYYY')}`;

    if (isLoading) {
        return <div className="py-12 text-center text-[#637381]">Đang tải vé số...</div>;
    }

    if (tickets.length === 0) {
        return (
            <div className="py-12 text-center text-[#637381]">
                <p className="font-medium">Không tìm thấy vé phù hợp</p>
                <p className="text-[13px] mt-1">Thử đổi đài, ngày xổ hoặc dãy số khác</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 bg-white border border-[#E5E8EB] rounded-2xl hover:border-[#ee1314]/30 transition-colors">
                        <div>
                            <div className="text-[18px] font-black text-[#ee1314] tracking-wider">{ticket.numbers}</div>
                            <div className="text-[13px] text-[#637381] mt-1">{ticket.stationName}</div>
                            <div className="text-[12px] text-[#919EAB]">
                                Còn {ticket.quantity ?? 0} vé • {(ticket.priceSnapshot ?? 10000).toLocaleString('vi-VN')}đ
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => addPublicTicketToCart({
                                ticket,
                                stationName: ticket.stationName || 'Vé số',
                                dateLabel,
                            })}
                            className="px-4 py-2 bg-[#ee1314] text-white text-[13px] font-bold rounded-xl"
                        >
                            Thêm giỏ
                        </button>
                    </div>
                ))}
            </div>

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
