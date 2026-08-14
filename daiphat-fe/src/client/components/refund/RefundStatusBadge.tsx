import React from 'react';
import { RefundRequestStatus } from '../../../types/refund.type';

export const REFUND_STATUS_MAP: Record<RefundRequestStatus, { label: string; bg: string; text: string }> = {
    [RefundRequestStatus.WAITING_FOR_INFO]: { label: 'Chờ thông tin STK', bg: 'bg-[#FFF9F3]', text: 'text-[#B76E00]' },
    [RefundRequestStatus.APPROVED]: { label: 'Đã duyệt', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
    [RefundRequestStatus.READY_TO_PAY]: { label: 'Chờ chuyển khoản', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
    [RefundRequestStatus.TRANSFERRED]: { label: 'Đã chuyển khoản', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [RefundRequestStatus.PAID]: { label: 'Đã chuyển khoản', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [RefundRequestStatus.MANUAL_RESOLUTION]: { label: 'Cần xử lý thủ công', bg: 'bg-[#FFF5F5]', text: 'text-[#C62828]' },
};

interface RefundStatusBadgeProps {
    status: RefundRequestStatus;
    className?: string;
}

export const RefundStatusBadge: React.FC<RefundStatusBadgeProps> = ({ status, className = '' }) => {
    const config = REFUND_STATUS_MAP[status] || { label: status, bg: 'bg-[#F4F6F8]', text: 'text-[#637381]' };

    return (
        <span className={`status-badge inline-flex items-center justify-center ${config.bg} ${config.text} h-6 px-2.5 rounded-md text-[12px] font-medium leading-none ${className}`}>
            {config.label}
        </span>
    );
};
