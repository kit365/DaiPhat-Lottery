import React from 'react';
import { RefundRequestStatus } from '../../../types/refund.type';

export const REFUND_STATUS_MAP: Record<RefundRequestStatus, { label: string; bg: string; text: string }> = {
    [RefundRequestStatus.PENDING]: { label: 'Chờ duyệt', bg: 'bg-[#FFF9F3]', text: 'text-[#FFB020]' },
    [RefundRequestStatus.APPROVED]: { label: 'Đã duyệt', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
    [RefundRequestStatus.REJECTED]: { label: 'Từ chối', bg: 'bg-[#FFF4F4]', text: 'text-[#ee1314]' },
    [RefundRequestStatus.TRANSFERRED]: { label: 'Đã chuyển khoản', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [RefundRequestStatus.CANCELLED]: { label: 'Đã hủy', bg: 'bg-[#F4F6F8]', text: 'text-[#919EAB]' }
};

interface RefundStatusBadgeProps {
    status: RefundRequestStatus;
    className?: string;
}

export const RefundStatusBadge: React.FC<RefundStatusBadgeProps> = ({ status, className = '' }) => {
    const config = REFUND_STATUS_MAP[status] || { label: status, bg: 'bg-[#F4F6F8]', text: 'text-[#637381]' };

    return (
        <span className={`inline-block ${config.bg} ${config.text} px-2.5 py-1 rounded-md text-[12px] font-medium ${className}`}>
            {config.label}
        </span>
    );
};
