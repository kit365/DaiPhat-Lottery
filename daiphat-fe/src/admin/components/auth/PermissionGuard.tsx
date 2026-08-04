"use client";

import { ReactNode, useEffect } from "react";
import { useAuthStore } from "../../../stores/useAuthStore";
import { Navigate, Outlet, useLocation } from "@/components/router-compat";
import { toast } from "react-toastify";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../pages/authen/hooks/useAuth";
import { hasAnyPermission, hasPermission, resolveIsAdmin } from "../../utils/permission.util";
import LoadingScreen from "../ui/LoadingScreen";

interface Props {
    permission?: string;
    permissions?: string[];
    children: ReactNode;
    fallback?: ReactNode;
}

export const PermissionGuard = ({ children, permission, permissions, fallback }: Props) => {
    const { user, logout, token, isHydrated } = useAuthStore();
    const { isUserLoading: isLoading } = useAuth();
    const location = useLocation();

    // 1. Chỉ chờ khi CHƯA HYDRATE xong hoặc (có token nhưng CHƯA lấy được user lần đầu)
    const isReady = isHydrated;
    const isWaitingInitialUser = isReady && !!token && !user;

    const roleCode = typeof user?.role === 'string' ? user.role : (user?.role?.code || "");
    const normalizedRole = roleCode.startsWith("ROLE_") ? roleCode : `ROLE_${roleCode}`;
    const isAdmin = resolveIsAdmin(user);
    const isStaff = normalizedRole.includes('STAFF');
    const isOnlyMember = !isAdmin && !isStaff;

    const hasAccess = permissions?.length
        ? hasAnyPermission(user, permissions)
        : hasPermission(user, permission);

    useEffect(() => {
        // CHỈ xử lý khi hệ thống đã Hydrate xong và đã có thông tin User
        if (isReady && !isWaitingInitialUser && user) {
            
            if (!hasAccess) {
                toast.warning("Bạn không có quyền thực hiện hành động này!", {
                    toastId: "permission-denied"
                });

                // Nếu là Member (người lạ) thì sút văng ra ngoài (Logout)
                if (isOnlyMember) {
                    logout();
                }
            }
        }
    }, [hasAccess, isWaitingInitialUser, isReady, token, user, logout, isOnlyMember, permission, permissions]);

    // Trạng thái chờ ban đầu: Đang hydrate hoặc chờ lấy thông tin user lần đầu
    if (!isReady || isWaitingInitialUser) {
        return fallback || <LoadingScreen />;
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

    return <>{children || <Outlet />}</>;
};
