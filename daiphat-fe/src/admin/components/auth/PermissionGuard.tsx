import { ReactNode, useEffect } from "react";
import { useAuthStore } from "../../../stores/useAuthStore";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ROUTES } from "../../constants/routes";
import { useGetMe } from "../../pages/authen/hooks/use-get-me";

interface Props {
    permission?: string;
    children: ReactNode;
    fallback?: ReactNode;
}

export const PermissionGuard = ({ children, permission, fallback }: Props) => {
    const { user, logout, token } = useAuthStore();
    const { isLoading } = useGetMe();

    // Chờ quá trình fetch HOÀN TOÀN TẮT (với điều kiện CÓ TOKEN, CHƯA CÓ USER)
    const isFetchingUser = isLoading && !!token && !user;

    // Tạm thời cho qua theo chỉ đạo của sếp: "tạm chưa phân theo permission là đc"
    const hasPermission = true;

    useEffect(() => {
        if (!isFetchingUser && !hasPermission) {
            toast.error("Bạn không có quyền thực hiện hành động này!", {
                toastId: "permission-denied"
            });
            logout();
        }
    }, [hasPermission, isFetchingUser, permission, logout]);

    if (isFetchingUser) {
        return fallback || <div>Đang kiểm tra quyền truy cập...</div>;
    }

    if (!hasPermission) {
        return <Navigate to={ROUTES.ADMIN.AUTH.LOGIN} replace />;
    }

    return <>{children}</>;
};
