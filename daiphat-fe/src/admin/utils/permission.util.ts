import { User } from '../../types/user.type';
import { USER_ROLES } from '../../constants/role.constants';

export const resolveRoleCode = (user: User | null | undefined): string => {
    if (!user?.role) return '';
    const raw = typeof user.role === 'string' ? user.role : user.role.code || '';
    return raw.startsWith('ROLE_') ? raw : `ROLE_${raw}`;
};

export const resolveIsAdmin = (user: User | null | undefined): boolean => {
    if (!user) return false;

    const normalizedRole = resolveRoleCode(user);
    if (normalizedRole === USER_ROLES.ADMIN || normalizedRole === 'ROLE_SUPER_ADMIN') {
        return true;
    }

    return (
        user.rolesName?.includes('ROLE_ADMIN') === true ||
        user.rolesName?.includes('ROLE_SUPER_ADMIN') === true
    );
};

export const hasPermission = (
    user: User | null | undefined,
    permission?: string
): boolean => {
    if (!permission) return true;
    if (resolveIsAdmin(user)) return true;
    return user?.permissions?.includes(permission) ?? false;
};

export const hasAnyPermission = (
    user: User | null | undefined,
    permissions: string[]
): boolean => permissions.some((permission) => hasPermission(user, permission));

export const hasAllPermissions = (
    user: User | null | undefined,
    permissions: string[]
): boolean => permissions.every((permission) => hasPermission(user, permission));
