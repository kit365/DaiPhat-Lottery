"use client";

import React from 'react';

import { getOrderStatusBadge } from './orderStatusBadge';
import { StatusBadge } from './StatusBadge';

export type OrderStatusBadgeProps = {
    status?: string | null;
    className?: string;
};

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className }) => {
    const tone = getOrderStatusBadge(status);
    return <StatusBadge label={tone.label} color={tone.color} bg={tone.bg} className={className} />;
};
