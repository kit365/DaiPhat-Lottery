import React from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { PublicLotteryTicket } from '../../../types/lottery-ticket.type';
import { useCartStore } from '../../../stores/useCartStore';
import {
    addPublicTicketToCart,
    filterSellableTickets,
    getCartQtyForTicket,
    getTicketStock,
    isTicketAtCartLimit,
} from '../../utils/ticketCart.util';

interface AvailableTicketListProps {
    tickets: PublicLotteryTicket[];
    isLoading: boolean;
    drawDate: string;
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
    const navigate = useNavigate();
    // Subscribe để nút thêm giỏ cập nhật ngay khi giỏ thay đổi
    useCartStore((s) => s.items);

    const dateLabel = dayjs(drawDate).isValid()
        ? dayjs(drawDate).format('DD/MM/YYYY')
        : drawDate;

    const sellableTickets = filterSellableTickets(tickets);

    const handleAddToCart = (ticket: PublicLotteryTicket) => {
        if (isTicketAtCartLimit(ticket)) return;
        addPublicTicketToCart({
            ticket,
            stationName: ticket.stationName || 'Vé số',
            dateLabel,
        });
    };

    const handleBuyNow = (ticket: PublicLotteryTicket) => {
        const stock = getTicketStock(ticket);
        if (stock <= 0) return;

        // Mua ngay: thanh toán riêng 1 vé, không đụng giỏ hàng hiện có.
        useCartStore.getState().startBuyNow([
            {
                id: String(ticket.id),
                province: ticket.stationName || 'Vé số',
                date: dateLabel,
                time: '',
                kyHieu: ticket.serialNumber || 'VE',
                numbers: ticket.numbers,
                price: ticket.priceSnapshot ?? 10000,
                quantity: 1,
                color: '#f59e0b',
                maxStock: stock,
            },
        ]);
        navigate('/checkout');
    };

    if (isLoading) {
        return <div className="py-12 text-center text-[#637381]">Đang tải vé số...</div>;
    }

    if (sellableTickets.length === 0) {
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
                {sellableTickets.map((ticket) => {
                    const stock = getTicketStock(ticket);
                    const cartQty = getCartQtyForTicket(ticket.id);
                    const atLimit = isTicketAtCartLimit(ticket);

                    return (
                        <div
                            key={ticket.id}
                            className="flex items-center justify-between p-4 bg-white border border-[#E5E8EB] rounded-2xl hover:border-[#ee1314]/30 transition-colors"
                        >
                            <div>
                                <div className="text-[18px] font-black text-[#ee1314] tracking-wider">{ticket.numbers}</div>
                                <div className="text-[13px] text-[#637381] mt-1">{ticket.stationName}</div>
                                <div className="text-[12px] text-[#919EAB]">
                                    {dateLabel} • Còn {stock} vé
                                    {cartQty > 0 ? ` (đã chọn ${cartQty})` : ''}
                                    {' • '}
                                    {(ticket.priceSnapshot ?? 10000).toLocaleString('vi-VN')}đ
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    title={atLimit ? 'Đã đủ số lượng trong giỏ' : 'Thêm giỏ hàng'}
                                    aria-label={atLimit ? 'Đã đủ số lượng trong giỏ' : 'Thêm giỏ hàng'}
                                    disabled={atLimit}
                                    onClick={() => handleAddToCart(ticket)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                        atLimit
                                            ? 'bg-[#C4CDD5] text-white cursor-not-allowed'
                                            : 'bg-white border border-[#ee1314] text-[#ee1314] hover:bg-red-50 shadow-sm active:scale-95'
                                    }`}
                                >
                                    <i className="fa-solid fa-cart-plus text-[17px]"></i>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBuyNow(ticket)}
                                    className="h-10 px-3.5 rounded-full bg-[#ee1314] hover:bg-[#d61011] text-white text-[13px] font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-colors"
                                >
                                    <i className="fa-solid fa-bolt text-[12px]"></i>
                                    Mua ngay
                                </button>
                            </div>
                        </div>
                    );
                })}
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
