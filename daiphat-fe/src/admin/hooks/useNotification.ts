// Force Vite re-evaluation
// Hook for notifications
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/notification.api";
import { toast } from "react-toastify";
import { QUERY_KEYS } from "../../constants/queryKeys";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 5;
const ADMIN_NOTIFICATION_REFETCH_INTERVAL_MS = 5_000;

export const useNotifications = (params?: api.GetNotificationsParams) => {
    const limit = params?.limit ?? DEFAULT_LIMIT;

    const query = useInfiniteQuery({
        queryKey: [QUERY_KEYS.ADMIN_NOTIFICATIONS, limit],
        queryFn: ({ pageParam = DEFAULT_PAGE }) => api.getNotifications({ ...params, page: pageParam, limit }),
        initialPageParam: DEFAULT_PAGE,
        refetchInterval: ADMIN_NOTIFICATION_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination?.isLast) {
                return undefined;
            }
            return (lastPage.pagination?.currentPage ?? DEFAULT_PAGE) + 1;
        },
    });

    const pages = query.data?.pages ?? [];
    const notifications = pages.flatMap((page) => page.data ?? []);
    const firstPage = pages[0];
    const counts = firstPage?.statusCounts ?? {};

    return {
        ...query,
        data: {
            success: true,
            data: notifications,
            pagination: firstPage?.pagination,
            statusCounts: counts,
        },
        notifications,
        totalCount: Number(counts.all ?? 0),
        unreadCount: Number(counts.unread ?? 0),
    };
};

export const useMarkAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await api.markAsRead(id);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_NOTIFICATIONS] });
        }
    });
};

export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await api.markAllAsRead();
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_NOTIFICATIONS] });
            toast.success("Đã đánh dấu tất cả là đã đọc");
        }
    });
};

export const useDeleteNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await api.deleteNotification(id);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_NOTIFICATIONS] });
            toast.success("Đã xóa thông báo đã đọc");
        }
    });
};

export const useDeleteAllNotifications = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await api.deleteAllNotifications();
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_NOTIFICATIONS] });
            toast.success("Đã xóa tất cả thông báo đã đọc");
        }
    });
};
export const useArchiveNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await api.archiveNotification(id);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_NOTIFICATIONS] });
            toast.success("Đã lưu trữ thông báo");
        }
    });
};

export const useArchiveAllNotifications = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await api.archiveAllNotifications();
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_NOTIFICATIONS] });
            toast.success("Đã lưu trữ tất cả thông báo");
        }
    });
};
