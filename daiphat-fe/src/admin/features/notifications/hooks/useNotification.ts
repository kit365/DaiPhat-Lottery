"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    deleteAllNotifications,
    deleteNotification,
    getNotifications,
    markAllAsRead,
    markAsRead,
} from '../services/notificationService';
import type { GetNotificationsParams } from '../types/notification.type';
import { QUERY_KEYS } from '../constants/queryKeys';
import { AppToast as toast } from '../../../../utils/toast.util';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 5;
const ADMIN_NOTIFICATION_REFETCH_INTERVAL_MS = 5_000;

export const useNotifications = (params?: GetNotificationsParams) => {
    const limit = params?.limit ?? DEFAULT_LIMIT;

    const query = useInfiniteQuery({
        queryKey: [QUERY_KEYS.NOTIFICATIONS, limit],
        queryFn: ({ pageParam = DEFAULT_PAGE }) =>
            getNotifications({ ...params, page: pageParam, limit }),
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
        mutationFn: (id: string) => markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        },
    });
};

export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
            toast.success('Đã đánh dấu tất cả là đã đọc');
        },
    });
};

export const useDeleteNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteNotification(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
            toast.success('Đã xóa thông báo đã đọc');
        },
    });
};

export const useDeleteAllNotifications = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => deleteAllNotifications(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
            toast.success('Đã xóa tất cả thông báo đã đọc');
        },
    });
};
