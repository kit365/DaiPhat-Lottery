import { apiApp } from '../../../../api';
import type {
    AdminNotificationsPageResponse,
    GetNotificationsParams,
} from '../types/notification.type';

const BASE_URL = '/notifications/admin/me';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 5;

export const getNotifications = async (
    params: GetNotificationsParams = {}
): Promise<AdminNotificationsPageResponse> => {
    const response = await apiApp.get(BASE_URL, {
        params: {
            page: params.page ?? DEFAULT_PAGE,
            limit: params.limit ?? DEFAULT_LIMIT,
        },
    });

    const pageResponse = response.data.data;
    const recordList = pageResponse?.recordList || [];

    const mappedData = recordList.map((item: Record<string, unknown>) => ({
        _id: String(item.notificationId),
        title: item.title as string,
        content: item.content as string,
        status: item.isRead ? ('read' as const) : ('unread' as const),
        type: item.type ? String(item.type).toLowerCase() : 'system',
        createdAt: item.createdAt as string,
        referenceId: (item.referenceId as string | null | undefined) ?? null,
        referenceType: (item.referenceType as string | null | undefined) ?? null,
    }));

    return {
        success: true,
        data: mappedData,
        pagination: pageResponse?.pagination,
        statusCounts: pageResponse?.statusCounts,
    };
};

export const markAsRead = async (id: string) => {
    await apiApp.patch(`/notifications/${id}/read`);
    return { success: true };
};

export const markAllAsRead = async () => {
    await apiApp.patch('/notifications/read-all');
    return { success: true };
};

export const deleteNotification = async (id: string) => {
    await apiApp.delete(`/notifications/${id}`);
    return { success: true };
};

export const deleteAllNotifications = async () => {
    await apiApp.delete('/notifications/read-all');
    return { success: true };
};
