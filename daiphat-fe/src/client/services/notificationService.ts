import { apiApp } from "../../api";
import { NotificationResponse } from "../../types/notifications.type";

export interface NotificationPageResponse {
    recordList: NotificationResponse[];
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

export const getMyNotifications = async (params: {
    page?: number;
    limit?: number;
}): Promise<NotificationPageResponse> => {
    const response = await apiApp.get("/notifications/me", { params });
    return response.data.data;
};
