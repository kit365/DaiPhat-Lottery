import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    hasAllPermissions,
    hasAnyPermission,
    hasPermission,
    resolveIsAdmin,
} from '../utils/permission.util';

export const usePermissions = () => {
    const user = useAuthStore((state) => state.user);

    const isAdmin = useMemo(() => resolveIsAdmin(user), [user]);

    const can = useCallback(
        (permission?: string) => hasPermission(user, permission),
        [user]
    );

    const canAny = useCallback(
        (permissions: string[]) => hasAnyPermission(user, permissions),
        [user]
    );

    const canAll = useCallback(
        (permissions: string[]) => hasAllPermissions(user, permissions),
        [user]
    );

    return { user, isAdmin, can, canAny, canAll };
};
