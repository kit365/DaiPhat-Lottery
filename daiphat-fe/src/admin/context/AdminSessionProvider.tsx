"use client";

import Cookies from "js-cookie";
import { createContext, useContext, useEffect, type ReactNode } from "react";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useAdminMeQuery } from "@/admin/hooks/useAdminMeQuery";
import {
    clearAdminAuthSession,
    syncUserFromMeResponse,
} from "@/admin/lib/adminSession.utils";
import { ROUTES } from "@/admin/constants/routes";
import { STORAGE_KEYS } from "@/constants/storage.constants";
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

/**
 * Single source of truth for admin session bootstrap:
 * - sync cookie token → Zustand when localStorage was cleared
 * - fetch GET /users/me (permissions, profile)
 * - logout + redirect on hard auth failure
 */
export function AdminSessionProvider({ children }: { children: ReactNode }) {
    const router = useAdminRouter();
    const { token, isHydrated, set, logout } = useAuthStore();
    const getMeQuery = useAdminMeQuery();

    useEffect(() => {
        if (!isHydrated) {
            return;
        }

        const cookieToken = Cookies.get(STORAGE_KEYS.TOKEN);
        if (!token && cookieToken) {
            set({ token: cookieToken });
        }
    }, [isHydrated, token, set]);

    useEffect(() => {
        syncUserFromMeResponse(getMeQuery.data, set, logout);
    }, [getMeQuery.data, set, logout]);

    useEffect(() => {
        if (!getMeQuery.isError) {
            return;
        }

        clearAdminAuthSession();
        router.push(ROUTES.ADMIN.AUTH.LOGIN);
    }, [getMeQuery.isError, router]);

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
