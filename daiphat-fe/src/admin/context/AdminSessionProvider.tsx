"use client";

import Cookies from "js-cookie";
import { createContext, useContext, useEffect, type ReactNode } from "react";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useAdminMeQuery } from "@/admin/hooks/useAdminMeQuery";
import { ROUTES } from "@/admin/constants/routes";
import { STORAGE_KEYS } from "@/constants/storage.constants";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useAuthStore } from "@/stores/useAuthStore";
import { User } from "@/types/user.type";

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
 * Bootstraps admin auth once for the shell:
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
        if (!getMeQuery.data) {
            return;
        }

        const isSuccess = getMeQuery.data.isSuccess ?? getMeQuery.data.success;
        if (isSuccess && getMeQuery.data.data) {
            const userData = getMeQuery.data.data as User;
            const currentUser = useAuthStore.getState().user;

            if (JSON.stringify(currentUser) !== JSON.stringify(userData)) {
                set({ user: userData });
            }
            return;
        }

        if (!isSuccess) {
            logout();
        }
    }, [getMeQuery.data, set, logout]);

    useEffect(() => {
        if (!getMeQuery.isError) {
            return;
        }

        logout();
        Cookies.remove(STORAGE_KEYS.TOKEN, { path: "/" });
        Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: "/" });
        router.push(ROUTES.ADMIN.AUTH.LOGIN);
    }, [getMeQuery.isError, logout, router]);

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

export const adminMeQueryKey = (token: string | null) => [QUERY_KEYS.AUTH_ME, token] as const;
