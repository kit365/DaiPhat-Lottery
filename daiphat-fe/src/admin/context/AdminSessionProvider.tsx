"use client";

import { isAxiosError } from "axios";
import { createContext, useContext, useEffect, type ReactNode } from "react";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useAdminMeQuery } from "@/admin/hooks/useAdminMeQuery";
import {
    clearAdminAuthSession,
    syncUserFromMeResponse,
} from "@/admin/lib/adminSession.utils";
import { ROUTES } from "@/admin/constants/routes";
import { hydrateAccessTokenFromCookie } from "@/api/authHeaders";
import { useAuthStore } from "@/stores/useAuthStore";

type AdminSessionContextValue = {
    isUserLoading: boolean;
    isUserError: boolean;
};

const AdminSessionContext = createContext<AdminSessionContextValue>({
    isUserLoading: false,
    isUserError: false,
});

export const useAdminSession = () => useContext(AdminSessionContext);

const isHardAuthFailure = (error: unknown): boolean => {
    if (!isAxiosError(error)) {
        return false;
    }

    const status = error.response?.status;
    return status === 401 || status === 403;
};

/**
 * Cookie `token` → Zustand RAM, rồi GET /users/me.
 */
export function AdminSessionProvider({ children }: { children: ReactNode }) {
    const router = useAdminRouter();
    const { token, isHydrated, set, logout } = useAuthStore();
    const getMeQuery = useAdminMeQuery();

    useEffect(() => {
        if (!isHydrated) {
            return;
        }
        hydrateAccessTokenFromCookie();
    }, [isHydrated, token]);

    useEffect(() => {
        syncUserFromMeResponse(getMeQuery.data, set, logout);
    }, [getMeQuery.data, set, logout]);

    useEffect(() => {
        if (!getMeQuery.isError || !isHardAuthFailure(getMeQuery.error)) {
            return;
        }

        clearAdminAuthSession();
        router.push(ROUTES.ADMIN.AUTH.LOGIN);
    }, [getMeQuery.isError, getMeQuery.error, router]);

    return (
        <AdminSessionContext.Provider
            value={{
                isUserLoading: getMeQuery.isLoading,
                isUserError: getMeQuery.isError,
            }}
        >
            {children}
        </AdminSessionContext.Provider>
    );
}
