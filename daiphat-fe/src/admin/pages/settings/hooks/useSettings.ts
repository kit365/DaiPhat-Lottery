import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getSettingGeneral, updateSettingGeneral,
    getSettingShipping, updateSettingShipping,
    getSettingPayment, updateSettingPayment,
    getSettingLoginSocial, updateSettingLoginSocial,
    getSettingAppPassword, updateSettingAppPassword,
    getSettingPoint, updateSettingPoint,
    getSettingPage, updateSettingPage
} from "../../../api/setting.api";
import { toast } from "react-toastify";

/** Hook quản lý trang tĩnh */
export const useSettingPage = (key: string) => {
    return useQuery({
        queryKey: ["settingPage", key],
        queryFn: () => getSettingPage(key),
        select: (data) => data.data,
    });
};

export const useUpdateSettingPage = (key: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Record<string, unknown>) => updateSettingPage(key, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settingPage", key] });
            toast.success("Cập nhật trang thành công");
        },
        onError: () => {
            toast.error("Cập nhật trang thất bại");
        }
    });
};


/** Hook quản lý cài đặt chung */
export const useSettingGeneral = () => {
    return useQuery({
        queryKey: ["settingGeneral"],
        queryFn: getSettingGeneral,
        select: (data) => data.data,
    });
};

export const useUpdateSettingGeneral = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSettingGeneral,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settingGeneral"] });
            toast.success("Cập nhật cài đặt thành công");
        },
        onError: () => {
            toast.error("Cập nhật cài đặt thất bại");
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

/** Hook quản lý cài đặt App Password */
export const useSettingAppPassword = () => {
    return useQuery({
        queryKey: ["settingAppPassword"],
        queryFn: getSettingAppPassword,
        select: (data) => data.data,
    });
};

export const useUpdateSettingAppPassword = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSettingAppPassword,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settingAppPassword"] });
            toast.success("Cập nhật mật khẩu ứng dụng thành công");
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
