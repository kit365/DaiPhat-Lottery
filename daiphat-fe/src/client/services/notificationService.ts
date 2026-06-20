import { apiApp } from "../../api";
import { PageResponse } from "../../types/api.type";
import { NotificationResponse } from "../../types/notifications.type";

export const getMyNotifications = async (params: {
    page?: number;
    limit?: number;
}): Promise<PageResponse<NotificationResponse>> => {
    const response = await apiApp.get("/notifications/me", { params });
    return response.data.data;
};

export const markMyNotificationAsRead = async (notificationId: number): Promise<void> => {
    await apiApp.patch(`/notifications/${notificationId}/read`);
};

export const markAllMyNotificationsAsRead = async (): Promise<void> => {
    await apiApp.patch("/notifications/read-all");
};

export const deleteAllMyReadNotifications = async (): Promise<void> => {
    await apiApp.delete("/notifications/read-all");
};
