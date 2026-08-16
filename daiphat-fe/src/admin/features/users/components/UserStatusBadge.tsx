"use client";

import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import { STATUS_LABELS } from '@/types/user.type';
import { getUserStatusBadgeModifier } from '../utils/userStatusBadge.util';

type UserStatusBadgeProps = {
    status?: string | null;
    className?: string;
};

export const UserStatusBadge = ({ status, className }: UserStatusBadgeProps) => {
    const normalized = status || '';
    const label = STATUS_LABELS[normalized] || normalized || '—';

    return (
        <AdminStatusBadge
            label={label}
            modifier={getUserStatusBadgeModifier(normalized)}
            className={className}
        />
    );
};
