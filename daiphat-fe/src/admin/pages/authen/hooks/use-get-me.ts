import { useQuery } from "@tanstack/react-query";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { useEffect } from "react";

export const useGetMe = () => {
    const { token, set, logout } = useAuthStore();

    const query = useQuery({
        queryKey: ["admin-me", token],
        queryFn: authService.getMe,
        enabled: !!token,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    useEffect(() => {
        if (query.data) {
            if (query.data.code === 200 && query.data.data) {
                set({ user: query.data.data });
            } else if (query.data.code === 401) {
                logout();
            }
        }
    }, [query.data, set, logout]);

    return query;
};
