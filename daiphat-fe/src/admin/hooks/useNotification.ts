// Force Vite re-evaluation
// Hook for notifications
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/notification.api";
import { toast } from "react-toastify";

export const useNotifications = () => {
    return useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            const res = await api.getNotifications();
            return res;
        }
    });
};

export const useMarkAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await api.markAsRead(id);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
    });
};

export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await api.markAllAsRead();
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast.success("Đã đánh dấu tất cả là đã đọc");
        }
    });
};

export const useDeleteNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await api.deleteNotification(id);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
    });
};

export const useDeleteAllNotifications = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await api.deleteAllNotifications();
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast.success("Đã xóa tất cả thông báo");
        }
    });
};
export const useArchiveNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await api.archiveNotification(id);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast.success("Đã lưu trữ thông báo");
        }
    });
};

export const useArchiveAllNotifications = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await api.archiveAllNotifications();
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast.success("Đã lưu trữ tất cả thông báo");
        }
    });
};
