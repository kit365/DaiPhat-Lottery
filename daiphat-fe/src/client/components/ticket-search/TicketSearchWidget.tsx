import React from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { useStationsToday, useStationsTomorrow } from '../../../admin/pages/provider/hooks/useProvider';
import { useLotteryTicketSearch } from '../../hooks/useLotteryTicketSearch';
import { addPublicTicketToCart } from '../../utils/ticketCart.util';
import { PublicLotteryTicket, TicketSearchMode } from '../../../types/lottery-ticket.type';

export const TicketSearchWidget: React.FC = () => {
    const [search, setSearch] = React.useState('');
    const [searchMode, setSearchMode] = React.useState<TicketSearchMode>('SUFFIX');
    const [selectedDate, setSelectedDate] = React.useState<'today' | 'tomorrow'>('today');
    const [stationId, setStationId] = React.useState<string>('');

    const { data: stationsToday } = useStationsToday();
    const { data: stationsTomorrow } = useStationsTomorrow();
    const stations = selectedDate === 'today' ? stationsToday : stationsTomorrow;

    const { data, isLoading, isFetching } = useLotteryTicketSearch(
        {
            page: 1,
            size: 5,
            stationId: stationId || undefined,
            drawDate: selectedDate,
            search: search.trim() || undefined,
            searchMode,
        },
        { enabled: search.trim().length >= 2 || !!stationId }
    );

    const tickets = data?.data?.recordList ?? [];
    const dateLabel = selectedDate === 'today'
        ? `Hôm nay, ${dayjs().format('DD/MM/YYYY')}`
        : `Ngày mai, ${dayjs().add(1, 'day').format('DD/MM/YYYY')}`;

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
            </div>

            <div className="p-5 space-y-4">
                <form onSubmit={handleSearch} className="flex items-center bg-[#F4F6F8] rounded-full border border-[#E5E8EB] p-1">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Tìm số (VD: 68, 686868...)"
                        className="flex-1 bg-transparent border-none outline-none px-3 text-[13px] text-[#212B36]"
                    />
                    <button type="submit" className="px-4 py-1.5 bg-[#FFF4F4] text-[#ee1314] font-bold text-[13px] rounded-full">
                        Tìm
                    </button>
                </form>

                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value as 'today' | 'tomorrow')}
                        className="px-3 py-2 border border-[#E5E8EB] rounded-xl text-[13px] outline-none"
                    >
                        <option value="today">Hôm nay</option>
                        <option value="tomorrow">Ngày mai</option>
                    </select>
                    <select
                        value={stationId}
                        onChange={(e) => setStationId(e.target.value)}
                        className="px-3 py-2 border border-[#E5E8EB] rounded-xl text-[13px] outline-none"
                    >
                        <option value="">Tất cả đài</option>
                        {(stations || []).map((s: any) => (
                            <option key={s.id || s._id} value={String(s.id || s._id)}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <select
                    value={searchMode}
                    onChange={(e) => setSearchMode(e.target.value as TicketSearchMode)}
                    className="w-full px-3 py-2 border border-[#E5E8EB] rounded-xl text-[13px] outline-none"
                >
                    <option value="SUFFIX">Tìm theo đuôi số</option>
                    <option value="CONTAINS">Chứa dãy số</option>
                    <option value="PREFIX">Tìm theo đầu số</option>
                    <option value="EXACT">Khớp chính xác</option>
                </select>

                <div className="space-y-2 min-h-[80px]">
                    {(isLoading || isFetching) && (
                        <p className="text-[13px] text-[#637381] text-center py-4">Đang tìm vé...</p>
                    )}
                    {!isLoading && search.trim().length >= 2 && tickets.length === 0 && (
                        <p className="text-[13px] text-[#637381] text-center py-4">Không tìm thấy vé phù hợp</p>
                    )}
                    {search.trim().length < 2 && !stationId && (
                        <p className="text-[12px] text-[#919EAB] text-center py-2">Nhập ít nhất 2 số hoặc chọn đài</p>
                    )}
                    {tickets.map((ticket: PublicLotteryTicket) => (
                        <div key={ticket.id} className="flex items-center justify-between p-3 bg-[#FAFBFC] rounded-xl border border-[#E5E8EB]">
                            <div>
                                <div className="text-[14px] font-black text-[#ee1314] tracking-wider">{ticket.numbers}</div>
                                <div className="text-[11px] text-[#637381]">
                                    {ticket.stationName} • {(ticket.priceSnapshot ?? 10000).toLocaleString('vi-VN')}đ
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => addPublicTicketToCart({
                                    ticket,
                                    stationName: ticket.stationName || 'Vé số',
                                    dateLabel,
                                })}
                                className="px-3 py-1.5 bg-[#ee1314] text-white text-[12px] font-bold rounded-lg"
                            >
                                + Giỏ
                            </button>
                        </div>
                    ))}
                </div>

                <Link
                    to={`/ticket-search?tab=available&search=${encodeURIComponent(search)}&drawDate=${selectedDate}${stationId ? `&stationId=${stationId}` : ''}`}
                    className="block text-center text-[13px] font-bold text-[#ee1314] hover:underline"
                >
                    Xem tất cả kết quả →
                </Link>
            </div>
        </div>
    );
};
