import React from 'react';
import { TicketDrawResultStatus } from '../../../types/lottery-ticket.type';

const STATUS_CONFIG: Record<TicketDrawResultStatus, { label: string; className: string }> = {
    PENDING_DRAW: {
        label: 'Chờ xổ',
        className: 'bg-slate-100 text-slate-600',
    },
    WON: {
        label: 'Trúng thưởng',
        className: 'bg-[#FFF4F4] text-[#ee1314]',
    },
    LOST: {
        label: 'Không trúng',
        className: 'bg-slate-100 text-slate-500',
    },
};

interface TicketResultBadgeProps {
    status: TicketDrawResultStatus;
    prizeDisplayName?: string;
}

export const TicketResultBadge: React.FC<TicketResultBadgeProps> = ({ status, prizeDisplayName }) => {
    const config = STATUS_CONFIG[status];

    return (
        <div className="flex flex-col items-end gap-1">
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${config.className}`}>
                {config.label}
            </span>
            {status === 'WON' && prizeDisplayName && (
                <span className="text-[11px] text-[#637381]">
                    {prizeDisplayName}
                </span>
            )}
        </div>
    );
};
