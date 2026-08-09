"use client";

import { ReactNode, useEffect } from "react";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useAuth } from "../../pages/authen/hooks/useAuth";
import { hasAnyPermission, hasPermission, resolveIsAdmin } from "../../utils/permission.util";
import { toast } from "react-toastify";

interface Props {
    permission?: string;
    permissions?: string[];
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Per-page permission check (needs user.permissions from API).
 * Does not block the admin shell — shows fallback/403 in content area only.
 */
export const PermissionGuard = ({ children, permission, permissions, fallback }: Props) => {
    const { user, logout, token, isHydrated } = useAuthStore();
    const { isUserLoading, isUserError } = useAuth();

    const isWaitingInitialUser = isHydrated && !!token && !user && isUserLoading;

    const roleCode = typeof user?.role === 'string' ? user.role : (user?.role?.code || "");
    const normalizedRole = roleCode.startsWith("ROLE_") ? roleCode : `ROLE_${roleCode}`;
    const isAdmin = resolveIsAdmin(user);
    const isStaff = normalizedRole.includes('STAFF');
    const isOnlyMember = !isAdmin && !isStaff;

    const hasAccess = permissions?.length
        ? hasAnyPermission(user, permissions)
        : hasPermission(user, permission);

    useEffect(() => {
        if (isHydrated && !isWaitingInitialUser && user && !hasAccess) {
            toast.warning("Bạn không có quyền thực hiện hành động này!", {
                toastId: "permission-denied",
            });

            if (isOnlyMember) {
                logout();
            }
        }
    }, [hasAccess, isWaitingInitialUser, isHydrated, user, logout, isOnlyMember, permission, permissions]);

    if (!isHydrated || isWaitingInitialUser) {
        return fallback ?? null;
    }

    if (token && !user && isUserError) {
        return null;
    }

    if (!hasAccess) {
        if (fallback) {
            return <>{fallback}</>;
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
                <h2 className="text-xl font-bold text-red-600 mb-2">403 - Không có quyền truy cập</h2>
                <p className="text-gray-600 mb-4">Tài khoản của bạn không có quyền xem nội dung này.</p>
            </div>
        );
    }

    return <>{children}</>;
};
