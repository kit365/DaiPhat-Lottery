"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { useStationsByDrawDate } from '../../../admin/features/station/hooks/useStation';
import { useLotteryTicketSearch } from '../../hooks/useLotteryTicketSearch';
import { useCartStore } from '../../../stores/useCartStore';
import {
    addPublicTicketToCart,
    filterSellableTickets,
    getCartQtyForTicket,
    getTicketStock,
    isTicketAtCartLimit,
} from '../../utils/ticketCart.util';
import { PublicLotteryTicket } from '../../../types/lottery-ticket.type';
import {
    defaultSellableDrawDate,
    maxSellableDrawDate,
    minSellableDrawDate,
    resolveSellableDrawDateParam,
} from '../../utils/sellableDrawDate.util';

export const TicketSearchWidget: React.FC = () => {
    const [search, setSearch] = React.useState('');
    const [selectedDate, setSelectedDate] = React.useState(defaultSellableDrawDate);
    const [stationId, setStationId] = React.useState<string>('');

    React.useEffect(() => {
        const next = resolveSellableDrawDateParam(selectedDate);
        if (next !== selectedDate) setSelectedDate(next);
    }, [selectedDate]);

    const { data: stations } = useStationsByDrawDate(selectedDate);

    const canSearch = search.trim().length >= 2 || !!stationId;
    const { data, isLoading, isFetching } = useLotteryTicketSearch(
        {
            page: 1,
            size: 5,
            stationId: stationId || undefined,
            drawDate: selectedDate,
            search: search.trim() || undefined,
            searchMode: 'SUFFIX',
        },
        { enabled: canSearch }
    );

    // Subscribe để nút thêm giỏ cập nhật ngay khi giỏ thay đổi
    useCartStore((s) => s.items);

    const tickets = filterSellableTickets(data?.data?.recordList ?? []);
    const dateLabel = dayjs(selectedDate).format('DD/MM/YYYY');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
    };

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[16px] font-bold text-[#333333] flex items-center gap-2">
                    <Search size={18} className="text-[#ee1314]" />
                    Tra cứu & tìm vé
                </h3>
                <p className="text-[12px] text-[#637381] mt-1">Tìm theo đài, ngày quay và đuôi số</p>
            </div>

            <div className="p-5 space-y-4">
                <form onSubmit={handleSearch} className="flex items-center bg-[#F4F6F8] rounded-full border border-[#E5E8EB] p-1">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={search}
                        onChange={(e) => setSearch(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Đuôi số (VD: 68, 686868)"
                        className="flex-1 bg-transparent border-none outline-none px-3 text-[13px] text-[#212B36]"
                    />
                    <button type="submit" className="px-4 py-1.5 bg-[#FFF4F4] text-[#ee1314] font-bold text-[13px] rounded-full">
                        Tìm
                    </button>
                </form>

                <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-[#637381]">Ngày quay</span>
                        <input
                            type="date"
                            value={selectedDate}
                            min={minSellableDrawDate()}
                            max={maxSellableDrawDate()}
                            onChange={(e) =>
                                setSelectedDate(
                                    resolveSellableDrawDateParam(
                                        e.target.value || defaultSellableDrawDate()
                                    )
                                )
                            }
                            className="px-3 py-2 border border-[#E5E8EB] rounded-xl text-[13px] outline-none"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-[#637381]">Chọn đài</span>
                        <select
                            value={stationId}
                            onChange={(e) => setStationId(e.target.value)}
                            className="px-3 py-2 border border-[#E5E8EB] rounded-xl text-[13px] outline-none"
                        >
                            <option value="">Tất cả đài</option>
                            {(stations || []).map((s: { id?: string | number; _id?: string | number; name?: string }) => (
                                <option key={String(s.id || s._id || '')} value={String(s.id || s._id || '')}>{s.name || ''}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="space-y-2 min-h-[80px]">
                    {(isLoading || isFetching) && canSearch && (
                        <p className="text-[13px] text-[#637381] text-center py-4">Đang tìm vé...</p>
                    )}
                    {!isLoading && canSearch && search.trim().length >= 2 && tickets.length === 0 && (
                        <p className="text-[13px] text-[#637381] text-center py-4">Không tìm thấy vé phù hợp</p>
                    )}
                    {!canSearch && (
                        <p className="text-[12px] text-[#919EAB] text-center py-2">Nhập ít nhất 2 số hoặc chọn đài</p>
                    )}
                    {tickets.map((ticket: PublicLotteryTicket) => {
                        const stock = getTicketStock(ticket);
                        const cartQty = getCartQtyForTicket(ticket.id);
                        const atLimit = isTicketAtCartLimit(ticket);

                        return (
                            <div key={ticket.id} className="flex items-center justify-between p-3 bg-[#FAFBFC] rounded-xl border border-[#E5E8EB]">
                                <div>
                                    <div className="text-[14px] font-black text-[#ee1314] tracking-wider">{ticket.numbers}</div>
                                    <div className="text-[11px] text-[#637381]">
                                        {ticket.stationName} • Còn {stock} vé
                                        {cartQty > 0 ? ` (đã chọn ${cartQty})` : ''}
                                        {' • '}
                                        {(ticket.priceSnapshot ?? 10000).toLocaleString('vi-VN')}đ
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    title={atLimit ? 'Đã đủ số lượng trong giỏ' : 'Thêm giỏ hàng'}
                                    aria-label={atLimit ? 'Đã đủ số lượng trong giỏ' : 'Thêm giỏ hàng'}
                                    disabled={atLimit}
                                    onClick={() => {
                                        if (atLimit) return;
                                        addPublicTicketToCart({
                                            ticket,
                                            stationName: ticket.stationName || 'Vé số',
                                            dateLabel,
                                        });
                                    }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                                        atLimit
                                            ? 'bg-[#C4CDD5] text-white cursor-not-allowed'
                                            : 'bg-[#ee1314] hover:bg-[#d61011] text-white shadow-sm active:scale-95'
                                    }`}
                                >
                                    <i className="fa-solid fa-cart-plus text-[14px]"></i>
                                </button>
                            </div>
                        );
                    })}
                </div>

                <Link
                    to={`/ticket-search?tab=available&search=${encodeURIComponent(search)}&searchMode=SUFFIX&drawDate=${selectedDate}${stationId ? `&stationId=${stationId}` : ''}`}
                    className="block text-center text-[13px] font-bold text-[#ee1314] hover:underline"
                >
                    Xem tất cả kết quả →
                </Link>
            </div>
        </div>
    );
};
