"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { ConfigType } from "../../../features/system-config/types/system-config";
import { SYSTEM_CONFIG_KEYS } from "../../../features/system-config/hooks/useSystemConfig";
import { SettingGeneralFormValues } from "@/admin/features/settings/schemas/setting.schema";
import {
    fetchGeneralSettings,
    saveGeneralSettings,
} from "../services/generalSettingService";

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
            toast.success("Cập nhật cài đặt thành công!");
        },
        onError: (error: unknown) => {
            const message =
                error instanceof Error ? error.message : "Cập nhật cài đặt thất bại!";
            toast.error(message);
        },
    });
};
