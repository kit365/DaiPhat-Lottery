import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../../../api/work-schedule.api";

export const useSchedules = (params?: any) => {
    return useQuery({
        queryKey: ["schedules", params],
        queryFn: () => api.getSchedules(params),
    });
};

export const useCalendarData = (month: number, year: number, departmentId?: string) => {
    return useQuery({
        queryKey: ["calendar", month, year, departmentId],
        queryFn: () => api.getCalendarData(month, year, departmentId),
        enabled: !!month && !!year,
    });
};

export const useCreateSchedule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.createSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
        },
    });
};

export const useBulkCreateSchedules = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.bulkCreateSchedules,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
        },
    });
};

export const useBulkDeleteSchedules = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.bulkDeleteSchedules,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
        },
    });
};

export const useUpdateSchedule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            api.updateSchedule(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
        },
    });
};

export const useCheckIn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.checkInSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
            queryClient.invalidateQueries({ queryKey: ["staff-schedules"] });
        },
    });
};

export const useCheckOut = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.checkOutSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
            queryClient.invalidateQueries({ queryKey: ["staff-schedules"] });
        },
    });
};

export const useDeleteSchedule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.deleteSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
            queryClient.invalidateQueries({ queryKey: ["calendar"] });
        },
    });
};




