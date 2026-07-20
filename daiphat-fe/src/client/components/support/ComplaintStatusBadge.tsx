import React from 'react';
import { TicketStatus } from '../../../types/support.type';

export const COMPLAINT_STATUS_MAP: Record<TicketStatus, { label: string; bg: string; text: string }> = {
    [TicketStatus.OPEN]: { label: 'Mới tạo', bg: 'bg-[#FFF9F3]', text: 'text-[#FFB020]' },
    [TicketStatus.IN_PROGRESS]: { label: 'Đang xử lý', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
    [TicketStatus.WAITING_FOR_CUSTOMER]: { label: 'Chờ phản hồi', bg: 'bg-[#FFF4F4]', text: 'text-[#ee1314]' },
    [TicketStatus.RESOLVED]: { label: 'Đã giải quyết', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [TicketStatus.REJECTED]: { label: 'Đã từ chối', bg: 'bg-[#FFF0F0]', text: 'text-[#B71D18]' },
    [TicketStatus.CLOSED]: { label: 'Đã đóng', bg: 'bg-[#F4F6F8]', text: 'text-[#919EAB]' },
};

interface ComplaintStatusBadgeProps {
    status: TicketStatus;
    className?: string;
}

export const ComplaintStatusBadge: React.FC<ComplaintStatusBadgeProps> = ({ status, className = '' }) => {
    const config = COMPLAINT_STATUS_MAP[status] || {
        label: status,
        bg: 'bg-[#F4F6F8]',
        text: 'text-[#637381]',
    };

    return (
        <span
            className={`inline-block ${config.bg} ${config.text} px-2.5 py-1 rounded-md text-[12px] font-medium ${className}`}
        >
            {config.label}
        </span>
    );
};
