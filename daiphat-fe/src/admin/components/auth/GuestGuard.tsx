"use client";

import { ReactNode } from "react";
import { Navigate } from "@/components/router-compat";
import { useAuthStore } from "../../../stores/useAuthStore";

interface Props {
    children: ReactNode;
}

import { ROUTES } from "../../constants/routes";

export const GuestGuard = ({ children }: Props) => {
    const { token, isHydrated } = useAuthStore();
    
    const isAuthenticated = !!token;

    if (!isHydrated) {
        return null;
    }

    if (isAuthenticated) {
        return <Navigate to={ROUTES.ADMIN.DASHBOARD.ROOT} replace />;
    }

    return <>{children}</>;
};
