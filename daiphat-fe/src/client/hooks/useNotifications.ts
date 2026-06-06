import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { useAuthStore } from "../../stores/useAuthStore";
import {
    getMyNotifications,
    markAllMyNotificationsAsRead,
    markMyNotificationAsRead
} from "../services/notificationService";

const DEFAULT_LIMIT = 4;

export const useNotifications = (limit: number = DEFAULT_LIMIT) => {
    const token = useAuthStore((state) => state.token);

    const query = useInfiniteQuery({
        queryKey: [QUERY_KEYS.CLIENT_NOTIFICATIONS, token, limit],
        queryFn: ({ pageParam = 1 }) => getMyNotifications({ page: pageParam, limit }),
        initialPageParam: 1,
        enabled: !!token,
        staleTime: 0,
        gcTime: 1000 * 60 * 5,
        retry: false,
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination.isLast) {
                return undefined;
            }
            return lastPage.pagination.currentPage + 1;
        },
    });

    const pages = query.data?.pages ?? [];
    const notifications = pages.flatMap((page) => page.recordList ?? []);
    const firstPage = pages[0];
    const counts = firstPage?.statusCounts ?? {};
    const unreadCount = Number(counts.unread ?? 0);
    const totalCount = Number(counts.all ?? 0);
    const authCount = Number(counts.auth ?? 0);
    const blogCount = Number(counts.blog ?? 0);
    const systemCount = Number(counts.system ?? 0);
    const remainingCount = Math.max(totalCount - notifications.length, 0);

    return {
        ...query,
        notifications,
        unreadCount,
        totalCount,
        authCount,
        blogCount,
        systemCount,
        remainingCount,
    };
};

export const useMarkMyNotificationAsRead = () => {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    return useMutation({
        mutationFn: (notificationId: number) => markMyNotificationAsRead(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_NOTIFICATIONS, token] });
        },
    });
};

export const useMarkAllMyNotificationsAsRead = () => {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    return useMutation({
        mutationFn: () => markAllMyNotificationsAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_NOTIFICATIONS, token] });
        },
    });
};
