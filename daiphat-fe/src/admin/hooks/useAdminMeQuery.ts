"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from '@/shared/auth/services/user.service';
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useAuthStore } from "@/stores/useAuthStore";

/** Shared /users/me query for the entire admin shell. */
export function useAdminMeQuery() {
    const token = useAuthStore((state) => state.token);

    return useQuery({
        queryKey: [QUERY_KEYS.AUTH_ME, token],
        queryFn: userService.getMe,
        enabled: Boolean(token),
        retry: false,
        staleTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
    });
}
