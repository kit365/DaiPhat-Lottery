"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/admin/features/hr/services/shiftService";

export const useShifts = (params?: any) => {
    return useQuery({
        queryKey: ["shifts", params],
        queryFn: () => api.getShifts(params),
    });
};

export const useShiftDetail = (id: string) => {
    return useQuery({
        queryKey: ["shift", id],
        queryFn: () => api.getShiftDetail(id),
        enabled: !!id,
    });
};

export const useCreateShift = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.createShift,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shifts"] });
        },
    });
};

export const useUpdateShift = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            api.updateShift(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shifts"] });
        },
    });
};

export const useDeleteShift = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.deleteShift,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shifts"] });
        },
    });
};




