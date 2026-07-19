import React from 'react';
import { TicketSearchMode } from '../../../types/lottery-ticket.type';

export interface AvailableSearchFilters {
    search: string;
    searchMode: TicketSearchMode;
    drawDate: 'today' | 'tomorrow';
    stationId: string;
    minPrice: string;
    maxPrice: string;
}

interface AvailableTicketSearchFormProps {
    filters: AvailableSearchFilters;
    stations: Array<{ id: string | number; name: string }>;
    onChange: (patch: Partial<AvailableSearchFilters>) => void;
}

export const AvailableTicketSearchForm: React.FC<AvailableTicketSearchFormProps> = ({
    filters,
    stations,
    onChange,
}) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex items-center bg-white rounded-xl border border-[#E5E8EB] p-1">
            <input
                type="text"
                value={filters.search}
                onChange={(e) => onChange({ search: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="Tìm số vé (VD: 68, 686868...)"
                className="flex-1 bg-transparent border-none outline-none px-3 text-[14px]"
            />
        </div>
        <select
            value={filters.searchMode}
            onChange={(e) => onChange({ searchMode: e.target.value as TicketSearchMode })}
            className="px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none bg-white"
        >
            <option value="SUFFIX">Theo đuôi số</option>
            <option value="CONTAINS">Chứa dãy số</option>
            <option value="PREFIX">Theo đầu số</option>
            <option value="EXACT">Khớp chính xác</option>
        </select>
        <select
            value={filters.drawDate}
            onChange={(e) => onChange({ drawDate: e.target.value as 'today' | 'tomorrow' })}
            className="px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none bg-white"
        >
            <option value="today">Hôm nay</option>
            <option value="tomorrow">Ngày mai</option>
        </select>
        <select
            value={filters.stationId}
            onChange={(e) => onChange({ stationId: e.target.value })}
            className="px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none bg-white"
        >
            <option value="">Tất cả đài</option>
            {stations.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
        </select>
        <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => onChange({ minPrice: e.target.value })}
            placeholder="Giá tối thiểu"
            className="px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none bg-white"
        />
        <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => onChange({ maxPrice: e.target.value })}
            placeholder="Giá tối đa"
            className="px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none bg-white"
        />
    </div>
);
