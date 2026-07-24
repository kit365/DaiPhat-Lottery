import React from 'react';
import { TicketSearchMode } from '../../../types/lottery-ticket.type';
import {
    defaultSellableDrawDate,
    maxSellableDrawDate,
    minSellableDrawDate,
    resolveSellableDrawDateParam,
} from '../../utils/sellableDrawDate.util';

export interface AvailableSearchFilters {
    search: string;
    searchMode: TicketSearchMode;
    drawDate: string;
    stationId: string;
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
    <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#637381]">Chọn đài</span>
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
            </label>

            <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#637381]">Ngày quay</span>
                <input
                    type="date"
                    value={filters.drawDate}
                    min={minSellableDrawDate()}
                    max={maxSellableDrawDate()}
                    onChange={(e) =>
                        onChange({
                            drawDate: resolveSellableDrawDateParam(
                                e.target.value || defaultSellableDrawDate()
                            ),
                        })
                    }
                    className="px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none bg-white"
                />
            </label>

            <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#637381]">Kiểu tìm</span>
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
            </label>
        </div>

        <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#637381]">
                Dãy số mong muốn (2–6 số cuối)
            </span>
            <input
                type="text"
                inputMode="numeric"
                value={filters.search}
                onChange={(e) => onChange({ search: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="VD: 68, 868, 686868..."
                className="w-full px-4 py-3 border border-[#E5E8EB] rounded-xl text-[15px] outline-none bg-white tracking-wider"
            />
            {filters.search.length > 0 && filters.search.length < 2 && (
                <span className="text-[12px] text-[#ee1314]">Nhập ít nhất 2 chữ số</span>
            )}
        </label>
    </div>
);
