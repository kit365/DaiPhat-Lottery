"use client";

interface AdminStatusBadgeProps {
    label: string;
    modifier?: string;
    className?: string;
}

export const AdminStatusBadge = ({ label, modifier, className }: AdminStatusBadgeProps) => (
    <span className={['admin-status-badge', modifier, className].filter(Boolean).join(' ')}>
        {label}
    </span>
);
