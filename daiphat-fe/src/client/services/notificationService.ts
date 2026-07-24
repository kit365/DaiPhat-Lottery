import { apiApp } from "../../api";
import { ApiResponse, PageResponse } from "../../types/api.type";
import {
    NotificationReferenceAvailabilityResponse,
    NotificationResponse,
    NotificationSettingResponse,
    UpsertNotificationSettingRequest,
} from "../../types/notifications.type";

export const getMyNotifications = async (params: {
    page?: number;
    limit?: number;
}): Promise<PageResponse<NotificationResponse>> => {
    const response = await apiApp.get("/notifications/me", { params });
    return response.data.data;
};

export const getMyNotificationSettings = async (): Promise<NotificationSettingResponse[]> => {
    const response = await apiApp.get<ApiResponse<NotificationSettingResponse[]>>(
        "/notifications/settings/me"
    );
    return response.data.data ?? [];
};

export const upsertMyNotificationSetting = async (
    payload: UpsertNotificationSettingRequest
): Promise<ApiResponse<NotificationSettingResponse>> => {
    const response = await apiApp.put<ApiResponse<NotificationSettingResponse>>(
        "/notifications/settings/me",
        payload
    );
    return response.data;
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

export const resolveNotificationReference = async (
    notificationId: number
): Promise<NotificationReferenceAvailabilityResponse> => {
    const response = await apiApp.get<ApiResponse<NotificationReferenceAvailabilityResponse>>(
        `/notifications/${notificationId}/reference`,
        { skipGlobalErrorToast: true } as any
    );
    return (
        response.data.data ?? {
            available: false,
            referenceType: null,
            referenceId: null,
            message:
                response.data.message ||
                "Nội dung tham chiếu không còn khả dụng hoặc đã bị xóa. Thông báo này không còn hiệu lực.",
        }
    );
};
