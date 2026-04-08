import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
    getOrders,
    getOrderDetail,
    updateOrderStatus,
    createOrder,
    updateOrder
} from "../../../api/order.api";

export const useOrders = (params?: any) => {
    return useQuery<any>({
        queryKey: ["orders", params],
        queryFn: () => getOrders(params),
        placeholderData: keepPreviousData,
    });
};

export const useOrderDetail = (id: string) => {
    return useQuery<any>({
        queryKey: ["order", id],
        queryFn: () => getOrderDetail(id),
        enabled: !!id,
    });
};

export const useUpdateOrderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => updateOrderStatus(id, status),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["order", variables.id] });
        },
    });
};

export const useCreateOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => createOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
    });
};

export const useUpdateOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateOrder(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["order", variables.id] });
        },
    });
};
