"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuthStore } from "../../../stores/useAuthStore";
import { USER_ROLES } from "../../../constants/role.constants";
import { toast } from "react-toastify";
import { ROUTES } from "../../constants/routes";
import { SpinnerLoading } from "../ui/SpinnerLoading";

interface Props {
    children?: ReactNode;
}

function isRestrictedAdminRole(role: unknown): boolean {
    if (!role) return false;
    const code = typeof role === "string" ? role : (role as { code?: string }).code || "";
    const normalized = code.startsWith("ROLE_") ? code : `ROLE_${code}`;
    return normalized === USER_ROLES.MEMBER || normalized === USER_ROLES.STREET_AGENT;
}

/**
 * Client-side auth rules that middleware cannot handle (needs user from API):
 * setup-profile, restricted roles. Token gate is handled by middleware.ts.
 */
export const AuthGuard = ({ children }: Props) => {
    const router = useAdminRouter();
    const pathname = usePathname() ?? "";
    const { token, isHydrated, user, logout } = useAuthStore();

    const isRestrictedRole = isRestrictedAdminRole(user?.role);
    const isSetupIncomplete = user && (user.hasPassword === false || user.agreedToTerms === false);
    const isSetupPath = pathname.includes(ROUTES.ADMIN.AUTH.SETUP_PROFILE);
    const isSetupComplete = user?.hasPassword && user?.agreedToTerms;

    useEffect(() => {
        if (isRestrictedRole) {
            toast.error("Bạn không có quyền truy cập vùng quản trị!", {
                toastId: "auth-denied",
            });
            logout();
        }
    }, [isRestrictedRole, logout]);

    useEffect(() => {
        if (!isHydrated) return;

        if (!token || isRestrictedRole) {
            router.replace(ROUTES.ADMIN.AUTH.LOGIN);
            return;
        }

        if (isSetupIncomplete && !isSetupPath) {
            router.replace(ROUTES.ADMIN.AUTH.SETUP_PROFILE);
            return;
        }

        if (user && isSetupComplete && isSetupPath) {
            router.replace(ROUTES.ADMIN.DASHBOARD.ROOT);
        }
    }, [
        isHydrated,
        token,
        isRestrictedRole,
        isSetupIncomplete,
        isSetupPath,
        isSetupComplete,
        user,
        router,
    ]);

    const sessionFallback = (
        <SpinnerLoading message="Đang xác thực phiên đăng nhập..." minHeight={360} />
    );

    if (!isHydrated) {
        return sessionFallback;
    }

    if (!token || isRestrictedRole) {
        return sessionFallback;
    }

    if (isSetupIncomplete && !isSetupPath) {
        return sessionFallback;
    }

    if (user && isSetupComplete && isSetupPath) {
        return sessionFallback;
    }

    return <>{children}</>;
};
