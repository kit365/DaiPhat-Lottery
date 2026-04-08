import { useQuery } from "@tanstack/react-query";
import { getMe } from "../../../api/auth.api";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { useEffect } from "react";

export const useGetMe = () => {
    const { login, logout, token } = useAuthStore();

    const query = useQuery({
        queryKey: ["admin-me"],
        queryFn: getMe,
        enabled: !!token,
        retry: false
    });

    useEffect(() => {
        if (query.data) {
            if (query.data.code === 200 && query.data.data) {
                const { token: newToken, ...userInfo } = query.data.data;
                login(userInfo, newToken || token || "");
            } else if (query.data.code === 401) {
                logout();
            }
        }
    }, [query.data, login, logout, token]);

    useEffect(() => {
        if (query.isError) {
            logout();
        }
    }, [query.isError, logout]);

    return query;
};




