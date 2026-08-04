"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettingGeneral, updateSettingGeneral } from "../../../api/setting.api";
import { toast } from "react-toastify";

export const useSettingGeneral = () => {
    return useQuery({
        queryKey: ["setting-general"],
        queryFn: async () => {
            const res = await getSettingGeneral();
            return res.data;
        }
    });
};

export const useUpdateSettingGeneral = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => updateSettingGeneral(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["setting-general"] });
            toast.success("Cập nhật cài đặt thành công!");
        },
        onError: () => {
            toast.error("Cập nhật cài đặt thất bại!");
        }
    });
};




