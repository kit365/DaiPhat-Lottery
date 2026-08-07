"use client";

import { ReactNode, useEffect } from "react";
import { Navigate, useLocation, Outlet } from "@/components/router-compat";
import { useAuthStore } from "../../../stores/useAuthStore";
import { USER_ROLES } from "../../../constants/role.constants";
import { toast } from "react-toastify";

interface Props {
    children?: ReactNode;
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
        return normalized === USER_ROLES.MEMBER || normalized === USER_ROLES.STREET_AGENT;
    };

    const isRestrictedRole = 
        checkIsRestricted(user?.role);

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
        return <>{children || <Outlet />}</>;
    }

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.ADMIN.AUTH.LOGIN} state={{ from: location }} replace />;
    }
    
    if (isRestrictedRole) {
        return <Navigate to={ROUTES.ADMIN.AUTH.LOGIN} replace />;
    }

    // DP-32 Setup Enforcement: Force redirect to setup-profile if not completed
    // Only redirect when fields are explicitly false (not undefined = still loading from API)
    const isSetupIncomplete = user && (user.hasPassword === false || user.agreedToTerms === false);
    const isSetupPath = location.pathname.includes(ROUTES.ADMIN.AUTH.SETUP_PROFILE);

    // FIX: Only redirect if we HAVE user info but it's incomplete. 
    // Prevents loops when user is null (e.g., during refresh or BE failure).
    if (isSetupIncomplete && !isSetupPath) {
        return <Navigate to={ROUTES.ADMIN.AUTH.SETUP_PROFILE} state={{ from: location }} replace />;
    }

    // DP-32 Setup Protection: Prevent re-entry if already complete
    const isSetupComplete = user?.hasPassword && user?.agreedToTerms;
    if (user && isSetupComplete && isSetupPath) {
        return <Navigate to={ROUTES.ADMIN.DASHBOARD.ROOT} replace />;
    }

    return <>{children || <Outlet />}</>;
};
