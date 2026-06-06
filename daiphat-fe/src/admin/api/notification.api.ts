import { apiApp } from '../../api';

const BASE_URL = '/notifications/admin/me';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 5;

export interface AdminNotificationItem {
    _id: string;
    title: string;
    content: string;
    status: 'read' | 'unread';
    type: string;
    createdAt: string;
    referenceId?: string | null;
    referenceType?: string | null;
}

export interface GetNotificationsParams {
    page?: number;
    limit?: number;
}

export interface AdminNotificationsPageResponse {
    success: boolean;
    data: AdminNotificationItem[];
    pagination: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        limit: number;
        isFirst: boolean;
        isLast: boolean;
    };
    statusCounts?: Record<string, number>;
}

export const getNotifications = async (params: GetNotificationsParams = {}): Promise<AdminNotificationsPageResponse> => {
    const response = await apiApp.get(BASE_URL, {
        params: {
            page: params.page ?? DEFAULT_PAGE,
            limit: params.limit ?? DEFAULT_LIMIT,
        }
    });

    const pageResponse = response.data.data;
    const recordList = pageResponse?.recordList || [];

    const mappedData = recordList.map((item: any) => ({
        _id: String(item.notificationId),
        title: item.title,
        content: item.content,
        status: item.isRead ? 'read' : 'unread',
        type: item.type ? String(item.type).toLowerCase() : 'system',
        createdAt: item.createdAt,
        referenceId: item.referenceId,
        referenceType: item.referenceType,
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

export const archiveNotification = async (id: string) => {
    return { success: true };
};

export const archiveAllNotifications = async () => {
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
