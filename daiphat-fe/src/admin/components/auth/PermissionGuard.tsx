import { ReactNode, useEffect } from "react";
import { useAuthStore } from "../../../stores/useAuthStore";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "react-toastify";
import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../pages/authen/hooks/useAuth";
import { USER_ROLES } from "../../../constants/role.constants";

interface Props {
    permission?: string;
    children: ReactNode;
    fallback?: ReactNode;
}

export const PermissionGuard = ({ children, permission, fallback }: Props) => {
    const { user, logout, token, isHydrated } = useAuthStore();
    const { isUserLoading: isLoading, isFetching } = useAuth();

    // 1. Nếu CHƯA HYDRATE xong thì tuyệt đối không được làm gì, cứ đứng đợi
    const isReady = isHydrated;
    
    // 2. Nếu đã Hydrate (có token) nhưng đang đợi fetch thông tin user mới
    // Phải chờ cả isLoading (lần đầu) và isFetching (mọi lần reload) để đảm bảo có data mới nhất
    const isFetchingUser = isReady && !!token && (isLoading || isFetching);

    const roleCode = user?.role?.code || "";
    const isAdmin = roleCode === USER_ROLES.ADMIN;
    const isStaff = roleCode.includes('STAFF');
    const isOnlyMember = !isAdmin && !isStaff;

    const hasPermission = isAdmin || !permission || user?.permissions?.includes(permission);

    useEffect(() => {
        // CHỈ xử lý khi hệ thống đã Hydrate xong, KHÔNG đang fetch dở, và QUAN TRỌNG: Đã có thông tin User
        if (isReady && !isFetchingUser && user) {
            
            if (!hasPermission) {
                toast.warning("Bạn không có quyền thực hiện hành động này!", {
                    toastId: "permission-denied"
                });

                // Nếu là Member (người lạ) thì sút văng ra ngoài (Logout)
                if (isOnlyMember) {
                    logout();
                }
            }
        }
    }, [hasPermission, isFetchingUser, isReady, token, user, logout, isOnlyMember]);

    // Trạng thái chờ: Đang hydrate hoặc đang fetch thông tin user
    if (!isReady || isFetchingUser) {
        return fallback || (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                Đang kiểm tra quyền truy cập...
            </div>
        );
    }

    if (!hasPermission) {
        // Nếu là Staff/Admin mà chỉ thiếu quyền con -> Đẩy về Dashboard chứ ko sút Logout
        if (!isOnlyMember && user) {
            return <Navigate to={ROUTES.ADMIN.DASHBOARD.ROOT} replace />;
        }
        return <Navigate to={ROUTES.ADMIN.AUTH.LOGIN} replace />;
    }

    return <>{children || <Outlet />}</>;
};
