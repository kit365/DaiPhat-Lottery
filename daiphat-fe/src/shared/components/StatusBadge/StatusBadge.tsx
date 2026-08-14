"use client";

import React from 'react';

export type StatusBadgeProps = {
    label: string;
    color: string;
    bg: string;
    className?: string;
};

/** Soft chip used for order / ticket status on both admin and client. */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, color, bg, className = '' }) => (
    <span
        className={`inline-flex items-center justify-center h-6 px-2 rounded-[6px] text-[11px] font-bold leading-none whitespace-nowrap status-badge ${className}`}
        style={{ color, backgroundColor: bg }}
    >
        {label}
    </span>
);
