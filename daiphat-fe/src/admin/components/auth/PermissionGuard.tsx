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
    const { user, logout, token, isHydrated } = useAuthStore();
    const { isUserLoading: isLoading, isFetching } = useAuth();

    // 1. Nếu CHƯA HYDRATE xong thì tuyệt đối không được làm gì, cứ đứng đợi
    const isReady = isHydrated;
    
    // 2. Nếu đã Hydrate (có token) nhưng đang đợi fetch thông tin user mới
    // Phải chờ cả isLoading (lần đầu) và isFetching (mọi lần reload) để đảm bảo có data mới nhất
    const isFetchingUser = isReady && !!token && (isLoading || isFetching);

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
        return <Navigate to={ROUTES.ADMIN.AUTH.LOGIN} replace />;
    }

    return <>{children || <Outlet />}</>;
};
