import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { apiApp } from "../../../../api";

const BASE_URL = "/api/v1/admin/ticketServiceOrder-config";

export const useTicketServiceOrderConfig = () => {
    return useQuery({
        queryKey: ["ticketServiceOrderConfig"],
        queryFn: async () => {
            const response = await apiApp.get(BASE_URL);
            return response.data.data;
        }
    });
};

export const useUpdateTicketServiceOrderConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await apiApp.patch(BASE_URL, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrderConfig"] });
            toast.success("Cập nhật cấu hình đơn thành công!");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Lỗi khi cập nhật cấu hình");
        }
    });
};




