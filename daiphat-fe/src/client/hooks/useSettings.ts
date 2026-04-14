import { useQuery } from "@tanstack/react-query";
import { getGeneralSettings } from "../api/setting.api";

export const useSettingGeneral = () => {
    return useQuery({
        queryKey: ["client-settings-general"],
        queryFn: async () => {
            const res = await getGeneralSettings();
            return res.data;
        },
        enabled: true,
        retry: 1
    });
};
