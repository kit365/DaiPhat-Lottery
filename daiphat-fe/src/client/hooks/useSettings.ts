import { useQuery } from "@tanstack/react-query";
import { getGeneralSettings } from "../api/setting.api";

export const useSettingGeneral = () => {
    return useQuery({
        queryKey: ["client-settings-general"],
        enabled: false, retry: false, queryFn: async () => {
            const res = await getGeneralSettings();
            return res.data;
        },
        enabled: false, // Tạm ngắt API client để tránh spam lỗi console
        retry: false
    });
};
