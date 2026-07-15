import React from 'react';
import { TicketDrawResultStatus } from '../../../types/lottery-ticket.type';

export interface PurchasedSearchFilters {
    status: '' | TicketDrawResultStatus;
    fromDate: string;
    toDate: string;
    ticketNumber: string;
}

interface PurchasedTicketLookupFormProps {
    filters: PurchasedSearchFilters;
    onChange: (patch: Partial<PurchasedSearchFilters>) => void;
}

export const PurchasedTicketLookupForm: React.FC<PurchasedTicketLookupFormProps> = ({
    filters,
    onChange,
}) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as PurchasedSearchFilters['status'] })}
            className="px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none bg-white"
        >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING_DRAW">Chờ xổ</option>
            <option value="WON">Trúng thưởng</option>
            <option value="LOST">Không trúng</option>
        </select>
        <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => onChange({ fromDate: e.target.value })}
            className="px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none bg-white"
        />
        <input
            type="date"
            value={filters.toDate}
            onChange={(e) => onChange({ toDate: e.target.value })}
            className="px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none bg-white"
        />
        <input
            type="text"
            value={filters.ticketNumber}
            onChange={(e) => onChange({ ticketNumber: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            placeholder="Số vé"
            className="px-3 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none bg-white"
        />
    </div>
);
