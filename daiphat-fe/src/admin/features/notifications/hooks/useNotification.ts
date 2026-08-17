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
import { QUERY_KEYS as ADMIN_QUERY_KEYS } from '@/admin/constants/queryKeys';
import { AppToast as toast } from '../../../../utils/toast.util';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { hasPermission } from '../../../utils/permission.util';
import { PERMISSIONS } from '../../../constants/permission.constants';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 5;

type UseNotificationsOptions = GetNotificationsParams & {
    enabled?: boolean;
};

export const useNotifications = (params?: UseNotificationsOptions) => {
    const token = useAuthStore((s) => s.token);
    const user = useAuthStore((s) => s.user);
    const canView =
        Boolean(token) && Boolean(user) && hasPermission(user, PERMISSIONS.NOTIFICATION.VIEW);
    const limit = params?.limit ?? DEFAULT_LIMIT;
    const enabled = (params?.enabled ?? true) && canView;

    const query = useInfiniteQuery({
        queryKey: [QUERY_KEYS.NOTIFICATIONS, limit],
        queryFn: ({ pageParam = DEFAULT_PAGE }) =>
            getNotifications({ ...params, page: pageParam, limit }),
        initialPageParam: DEFAULT_PAGE,
        enabled,
        refetchOnWindowFocus: enabled,
        retry: false,
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
            queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.ADMIN_BADGES] });
        },
    });
};

export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
            queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.ADMIN_BADGES] });
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
            queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.ADMIN_BADGES] });
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
            queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEYS.ADMIN_BADGES] });
            toast.success('Đã xóa tất cả thông báo đã đọc');
        },
    });
};
