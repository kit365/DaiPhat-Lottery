import { UserStatus } from '@/types/user.type';

export const getUserStatusBadgeModifier = (status?: string | null): string => {
    switch (status) {
        case UserStatus.ACTIVE:
            return 'admin-status-badge--success';
        case UserStatus.PENDING:
            return 'admin-status-badge--pending';
        case UserStatus.LOCKED:
        case UserStatus.BANNED:
            return 'admin-status-badge--inactive';
        case UserStatus.DELETED:
            return 'admin-status-badge--draft';
        default:
            return 'admin-status-badge--draft';
    }
};
