import { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermission';

interface Props {
    permission?: string;
    anyOf?: string[];
    allOf?: string[];
    children: ReactNode;
    fallback?: ReactNode;
}

export const CanAccess = ({ permission, anyOf, allOf, children, fallback = null }: Props) => {
    const { can, canAny, canAll } = usePermissions();

    const allowed = permission
        ? can(permission)
        : anyOf
          ? canAny(anyOf)
          : allOf
            ? canAll(allOf)
            : true;

    if (!allowed) return <>{fallback}</>;
    return <>{children}</>;
};
