import { ReactNode, useEffect } from "react";
import { useAuthStore } from "../../../stores/useAuthStore";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "react-toastify";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../pages/authen/hooks/useAuth";
import { hasAnyPermission, hasPermission, resolveIsAdmin } from "../../utils/permission.util";

interface Props {
    permission?: string;
    permissions?: string[];
    children: ReactNode;
    fallback?: ReactNode;
}

export const PermissionGuard = ({ children, permission, permissions, fallback }: Props) => {
    const { logout, token, isHydrated } = useAuthStore();
    const { user, isUserLoading: isLoading, isFetching, isUserPending, isUserError } = useAuth();

    const isReady = isHydrated;
    const isFetchingUser =
        isReady &&
        !!token &&
        !isUserError &&
        (isUserPending || isLoading || isFetching);

    const roleCode = typeof user?.role === 'string' ? user.role : (user?.role?.code || "");
    const normalizedRole = roleCode.startsWith("ROLE_") ? roleCode : `ROLE_${roleCode}`;
    const isAdmin = resolveIsAdmin(user);
    const isStaff = normalizedRole.includes('STAFF');
    const isOnlyMember = !isAdmin && !isStaff;

    const hasAccess = permissions?.length
        ? hasAnyPermission(user, permissions)
        : hasPermission(user, permission);

    useEffect(() => {
        // CHỈ xử lý khi hệ thống đã Hydrate xong, KHÔNG đang fetch dở, và QUAN TRỌNG: Đã có thông tin User
        if (isReady && !isFetchingUser && user) {
            
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
    }, [hasAccess, isFetchingUser, isReady, token, user, logout, isOnlyMember, permission, permissions]);

    // Trạng thái chờ: Đang hydrate hoặc đang fetch thông tin user
    if (!isReady || isFetchingUser) {
        return fallback || (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                Đang kiểm tra quyền truy cập...
            </div>
        );
    }

    if (!hasAccess) {
        // Nếu là Staff/Admin mà chỉ thiếu quyền con -> Đẩy về Dashboard chứ ko sút Logout
        if (!isOnlyMember && user) {
            return <Navigate to={ROUTES.ADMIN.DASHBOARD.ROOT} replace />;
        }
        if (token && !isUserError) {
            return fallback || (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    Đang kiểm tra quyền truy cập...
                </div>
            );
        }
        return <Navigate to={ROUTES.ADMIN.AUTH.LOGIN} replace />;
    }

    return <>{children || <Outlet />}</>;
};
