import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../stores/useAuthStore";
import { USER_ROLES } from "../../../constants/role.constants";
import { toast } from "react-toastify";

interface Props {
    children: ReactNode;
}

import { ROUTES } from "../../constants/routes";

export const AuthGuard = ({ children }: Props) => {
    const { token, isHydrated, user, logout } = useAuthStore();
    const location = useLocation();
    
    const isAuthenticated = !!token;

    // DP-32 Middleware: Reject MEMBER roles from Admin area
    const checkIsRestricted = (r: any) => {
        if (!r) return false;
        const code = typeof r === 'string' ? r : (r.code || "");
        const normalized = code.startsWith("ROLE_") ? code : `ROLE_${code}`;
        return normalized === USER_ROLES.MEMBER;
    };

    const isRestrictedRole = 
        checkIsRestricted(user?.role) || 
        user?.roles?.some(role => checkIsRestricted(role));

    // HOOKS PHẢI ĐẶT TRƯỚC BẤT KỲ LỆNH RETURN NÀO
    useEffect(() => {
        if (isRestrictedRole) {
            toast.error("Bạn không có quyền truy cập vùng quản trị!", {
                toastId: "auth-denied"
            });
            logout();
        }
    }, [isRestrictedRole, logout]);

    if (!isHydrated) {
        return null; // Or a loading spinner
    }

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.ADMIN.AUTH.LOGIN} state={{ from: location }} replace />;
    }
    
    if (isRestrictedRole) {
        return <Navigate to={ROUTES.ADMIN.AUTH.LOGIN} replace />;
    }

    return <>{children}</>;
};
