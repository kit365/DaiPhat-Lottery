import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../../../api/department.api";

export const useDepartments = (params?: any) => {
    return useQuery({
        queryKey: ["departments", params],
        queryFn: () => api.getDepartments(params),
    });
};

export const useDepartmentDetail = (id?: string) => {
    return useQuery({
        queryKey: ["department", id],
        queryFn: () => api.getDepartmentDetail(id!),
        enabled: !!id,
        select: (res: any) => res.data,
    });
};

export const useCreateDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.createDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
        },
    });
};

export const useUpdateDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            api.updateDepartment(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            queryClient.invalidateQueries({ queryKey: ["department"] });
        },
    });
};

export const useDeleteDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.deleteDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
        },
    });
};




