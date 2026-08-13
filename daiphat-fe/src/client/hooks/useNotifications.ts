"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { useAuthStore } from "../../stores/useAuthStore";
import {
    deleteAllMyReadNotifications,
    getMyNotifications,
    markAllMyNotificationsAsRead,
    markMyNotificationAsRead
} from "../services/notificationService";
import { normalizePagination } from "../utils/pagination.util";

const NOTIFICATION_PAGE_SIZE = 10;
const CLIENT_NOTIFICATION_REFETCH_INTERVAL_MS = 30_000;

export const clientNotificationsQueryKey = (token: string | null | undefined) =>
    [QUERY_KEYS.CLIENT_NOTIFICATIONS, token] as const;

const useClientNotificationsQuery = (options?: { enablePolling?: boolean }) => {
    const token = useAuthStore((state) => state.token);
    const enablePolling = options?.enablePolling ?? true;

    return useInfiniteQuery({
        queryKey: clientNotificationsQueryKey(token),
        queryFn: ({ pageParam = 1 }) =>
            getMyNotifications({ page: pageParam, limit: NOTIFICATION_PAGE_SIZE }),
        initialPageParam: 1,
        enabled: !!token,
        staleTime: 15_000,
        gcTime: 1000 * 60 * 5,
        retry: false,
        refetchInterval: (query) => {
            if (!enablePolling || query.state.error) {
                return false;
            }
            return CLIENT_NOTIFICATION_REFETCH_INTERVAL_MS;
        },
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => {
            const pagination = normalizePagination(lastPage.pagination);
            if (pagination.isLast || pagination.currentPage >= pagination.totalPages) {
                return undefined;
            }
            return pagination.currentPage + 1;
        },
    });
};

const mapNotificationQueryResult = (query: ReturnType<typeof useClientNotificationsQuery>) => {
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

/** Danh sách thông báo (dropdown / tab profile). */
export const useNotifications = (options?: { enablePolling?: boolean }) =>
    mapNotificationQueryResult(useClientNotificationsQuery(options));

/** Chỉ lấy số chưa đọc — dùng chung cache, không tạo query key riêng. */
export const useNotificationUnreadCount = (options?: { enablePolling?: boolean }) => {
    const { unreadCount, isLoading, isFetching, isError } = useNotifications(options);
    return { unreadCount, isLoading, isFetching, isError };
};

export const useMarkMyNotificationAsRead = () => {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    return useMutation({
        mutationFn: (notificationId: number) => markMyNotificationAsRead(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientNotificationsQueryKey(token) });
        },
    });
};

export const useMarkAllMyNotificationsAsRead = () => {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    return useMutation({
        mutationFn: () => markAllMyNotificationsAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientNotificationsQueryKey(token) });
        },
    });
};

export const useDeleteAllMyReadNotifications = () => {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    return useMutation({
        mutationFn: () => deleteAllMyReadNotifications(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientNotificationsQueryKey(token) });
        },
    });
};
