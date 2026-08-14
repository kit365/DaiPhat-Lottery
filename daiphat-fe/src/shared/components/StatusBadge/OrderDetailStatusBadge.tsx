"use client";

import React from 'react';

import { resolveOrderDetailStatusBadge } from '@/types/order.type';

import { StatusBadge } from './StatusBadge';

export type OrderDetailStatusBadgeProps = {
    status?: string | null;
    className?: string;
};

export const OrderDetailStatusBadge: React.FC<OrderDetailStatusBadgeProps> = ({ status, className }) => {
    const tone = resolveOrderDetailStatusBadge(status);
    return (
        <StatusBadge label={tone.label} color={tone.color} bg={tone.bgcolor} className={className} />
    );
};
