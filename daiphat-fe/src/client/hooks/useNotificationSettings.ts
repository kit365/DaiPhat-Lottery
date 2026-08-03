"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getMyNotificationSettings,
    upsertMyNotificationSetting,
} from "../services/notificationService";
import { UpsertNotificationSettingRequest } from "../../types/notifications.type";
import { AppToast as toast } from "../../utils/toast.util";
import { QUERY_KEYS } from "../../constants/queryKeys";

const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error.message || fallback;

export const useMyNotificationSettings = (enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_NOTIFICATION_SETTINGS],
        queryFn: getMyNotificationSettings,
        enabled,
    });
};

export const useUpsertMyNotificationSetting = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpsertNotificationSettingRequest) =>
            upsertMyNotificationSetting(payload),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || "Cập nhật cài đặt thông báo thành công");
                queryClient.invalidateQueries({
                    queryKey: [QUERY_KEYS.CLIENT_NOTIFICATION_SETTINGS],
                });
            } else {
                toast.error(response.message || "Có lỗi xảy ra");
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, "Không thể cập nhật cài đặt thông báo"));
        },
    });
};
