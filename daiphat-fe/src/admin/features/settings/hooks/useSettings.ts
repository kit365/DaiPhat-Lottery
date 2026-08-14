"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getSettingShipping, updateSettingShipping,
    getSettingPayment, updateSettingPayment,
    getSettingLoginSocial, updateSettingLoginSocial,
    getSettingPoint, updateSettingPoint,
} from "@/admin/features/settings/services/legacySettingService";
import { toast } from "react-toastify";
import { ConfigType } from "../../../features/system-config/types/system-config";
import { SYSTEM_CONFIG_KEYS } from "../../../features/system-config/hooks/useSystemConfig";
import { getSystemConfigs } from "../../../features/system-config/services/systemConfigService";
import { SettingGeneralFormValues, SettingPageFormValues } from "@/admin/features/settings/schemas/setting.schema";
import {
    fetchGeneralSettings,
    saveGeneralSettings,
} from "../services/generalSettingService";
import {
    parsePageJson,
    saveStaticPage,
    StaticPageConfigKey,
} from "../services/staticPageService";

/** Hook quản lý trang tĩnh / chính sách — một lần tải toàn bộ STATIC_PAGE, đổi tab không fetch lại. */
export const useSettingPage = (configKey: StaticPageConfigKey) => {
    return useQuery({
        queryKey: SYSTEM_CONFIG_KEYS.list(ConfigType.STATIC_PAGE),
        queryFn: () => getSystemConfigs(ConfigType.STATIC_PAGE),
        select: (response) => {
            const config = (response.data ?? []).find((item) => item.configKey === configKey);
            return config ? parsePageJson(config.configValue) : undefined;
        },
        staleTime: 60_000,
    });
};

export const useUpdateSettingPage = (configKey: StaticPageConfigKey) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: SettingPageFormValues) => saveStaticPage(configKey, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SYSTEM_CONFIG_KEYS.all });
            toast.success("Cập nhật trang thành công");
        },
        onError: (error: unknown) => {
            const message =
                error instanceof Error ? error.message : "Cập nhật trang thất bại";
            toast.error(message);
        }
    });
};


/** Hook quản lý cài đặt chung — system_config GENERAL_SETTING */
export const useSettingGeneral = () => {
    return useQuery({
        queryKey: [...SYSTEM_CONFIG_KEYS.list(ConfigType.GENERAL_SETTING), 'general-form'],
        queryFn: fetchGeneralSettings,
        select: (data) => data.form,
    });
};

export const useUpdateSettingGeneral = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (form: SettingGeneralFormValues) => {
            const fresh = await fetchGeneralSettings();
            await saveGeneralSettings(form, fresh.configs);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SYSTEM_CONFIG_KEYS.all });
            queryClient.invalidateQueries({ queryKey: ["public-system-config"] });
            queryClient.invalidateQueries({ queryKey: ["public-system-config-batch"] });
            toast.success("Cập nhật cài đặt thành công");
        },
        onError: (error: unknown) => {
            const message =
                error instanceof Error ? error.message : "Cập nhật cài đặt thất bại";
            toast.error(message);
        }
    });
};

/** Hook quản lý cài đặt vận chuyển */
export const useSettingShipping = () => {
    return useQuery({
        queryKey: ["settingShipping"],
        queryFn: getSettingShipping,
        select: (data) => data.data,
    });
};

export const useUpdateSettingShipping = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSettingShipping,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settingShipping"] });
            toast.success("Cập nhật cài đặt vận chuyển thành công");
        },
    });
};

/** Hook quản lý cài đặt thanh toán */
export const useSettingPayment = () => {
    return useQuery({
        queryKey: ["settingPayment"],
        queryFn: getSettingPayment,
        select: (data) => data.data,
    });
};

export const useUpdateSettingPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSettingPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settingPayment"] });
            toast.success("Cập nhật cài đặt thanh toán thành công");
        },
    });
};

/** Hook quản lý cài đặt MXH */
export const useSettingLoginSocial = () => {
    return useQuery({
        queryKey: ["settingLoginSocial"],
        queryFn: getSettingLoginSocial,
        select: (data) => data.data,
    });
};

export const useUpdateSettingLoginSocial = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSettingLoginSocial,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settingLoginSocial"] });
            toast.success("Cập nhật cấu hình MXH thành công");
        },
    });
};

/** Hook quản lý cài đặt Tích điểm */
export const useSettingPoint = () => {
    return useQuery({
        queryKey: ["settingPoint"],
        queryFn: getSettingPoint,
        select: (data) => data.data,
    });
};

export const useUpdateSettingPoint = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSettingPoint,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settingPoint"] });
            toast.success("Cập nhật cấu hình tích điểm thành công");
        },
    });
};
