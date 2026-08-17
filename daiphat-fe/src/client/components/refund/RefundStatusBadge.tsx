import React from 'react';
import { RefundRequestStatus } from '../../../types/refund.type';
import { StatusBadge } from '@/shared/components/StatusBadge';

export const REFUND_STATUS_MAP: Record<RefundRequestStatus, { label: string; color: string; bg: string }> = {
    [RefundRequestStatus.WAITING_FOR_INFO]: { label: 'Chờ thông tin STK', color: '#B76E00', bg: '#FFF9F3' },
    [RefundRequestStatus.APPROVED]: { label: 'Đã duyệt', color: '#2065D1', bg: '#F0F5FF' },
    [RefundRequestStatus.READY_TO_PAY]: { label: 'Chờ chuyển khoản', color: '#2065D1', bg: '#F0F5FF' },
    [RefundRequestStatus.TRANSFERRED]: { label: 'Đã chuyển khoản', color: '#118D57', bg: '#E4F8ED' },
    [RefundRequestStatus.PAID]: { label: 'Đã chuyển khoản', color: '#118D57', bg: '#E4F8ED' },
    [RefundRequestStatus.MANUAL_RESOLUTION]: { label: 'Cần xử lý thủ công', color: '#C62828', bg: '#FFF5F5' },
};

interface RefundStatusBadgeProps {
    status: RefundRequestStatus;
    className?: string;
}

export const RefundStatusBadge: React.FC<RefundStatusBadgeProps> = ({ status, className = '' }) => {
    const config = REFUND_STATUS_MAP[status] || { label: status, color: '#637381', bg: '#F4F6F8' };

    return (
        <StatusBadge
            label={config.label}
            color={config.color}
            bg={config.bg}
            className={className}
        />
    );
};
