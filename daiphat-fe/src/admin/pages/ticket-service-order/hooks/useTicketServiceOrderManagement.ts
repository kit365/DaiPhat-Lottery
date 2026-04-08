import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
    getTicketServiceOrders,
    getTicketServiceOrderDetail,
    createTicketServiceOrder as apiCreateTicketServiceOrder,
    updateTicketServiceOrderStatus,
    assignStaffToTicketServiceOrder,
    startTicketServiceOrder,
    rescheduleTicketServiceOrder,
    extendTicketServiceOrder,
    getAvailableSlots,
    getRecommendedStaff,
    getStaffTasks,
    getStaffTicketServiceOrderDetail,
    updateTicketServiceOrder,
    autoAssignTicketServiceOrders,
    reassignTicketStaff,
    applyOptimization as apiApplyOptimization,
    suggestSmartAssignment as apiSuggestSmartAssignment
} from "../../../api/ticketServiceOrder.api";

export const useAvailableSlots = (params: { date: string, ticketServiceId: string, departmentId?: string }) => {
    return useQuery({
        queryKey: ["available-slots", params],
        queryFn: () => getAvailableSlots(params),
        enabled: !!params.date && !!params.ticketServiceId,
    });
};

export const useTicketServiceOrders = (params?: any) => {
    return useQuery<any>({
        queryKey: ["ticketServiceOrders", params],
        queryFn: () => getTicketServiceOrders(params),
        placeholderData: keepPreviousData,
    });
};

export const useTicketServiceOrderDetail = (id: string) => {
    return useQuery<any>({
        queryKey: ["ticketServiceOrder", id],
        queryFn: () => getTicketServiceOrderDetail(id),
        enabled: !!id,
    });
};

export const useCreateTicketServiceOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => apiCreateTicketServiceOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrders"] });
        },
    });
};

export const useUpdateTicketServiceOrderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, ticketId, reason }: { id: string; status: string; ticketId?: string; reason?: string }) =>
            updateTicketServiceOrderStatus(id, status, ticketId, reason),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrders"] });
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrder", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["staff-tasks"] });
        },
    });
};

export const useAssignStaff = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ticketServiceOrderId, ...data }: { ticketServiceOrderId: string; staffId?: string; staffIds?: string[] }) =>
            assignStaffToTicketServiceOrder(ticketServiceOrderId, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrders"] });
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrder", variables.ticketServiceOrderId] });
        },
    });
};


export const useStartTicketServiceOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ticketId }: { id: string; ticketId?: string }) => startTicketServiceOrder(id, ticketId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrder", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrders"] });
            queryClient.invalidateQueries({ queryKey: ["staff-tasks"] });
        },
    });
};

export const useRescheduleTicketServiceOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => rescheduleTicketServiceOrder(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrder", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrders"] });
        },
    });
};

export const useExtendTicketServiceOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, minutes }: { id: string; minutes: number }) => extendTicketServiceOrder(id, minutes),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrder", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrders"] });
            queryClient.invalidateQueries({ queryKey: ["staff-tasks"] });
        },
    });
};

export const useRecommendedStaff = (id: string, options?: any) => {
    return useQuery<any>({
        queryKey: ["recommended-staff", id],
        queryFn: () => getRecommendedStaff(id),
        enabled: !!id,
        ...options,
    });
};

export const useStaffTasks = (params?: any) => {
    return useQuery<any>({
        queryKey: ["staff-tasks", params],
        queryFn: () => getStaffTasks(params),
        placeholderData: keepPreviousData,
    });
};

export const useStaffTicketServiceOrderDetail = (id: string) => {
    return useQuery<any>({
        queryKey: ["staff-ticketServiceOrder-detail", id],
        queryFn: () => getStaffTicketServiceOrderDetail(id),
        enabled: !!id,
    });
};

export const useUpdateTicketServiceOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateTicketServiceOrder(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrder", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrders"] });
        },
    });
};
export const useAutoAssignTicketServiceOrders = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (ticketServiceOrderId: string) => autoAssignTicketServiceOrders(ticketServiceOrderId),
        onSuccess: (_data, ticketServiceOrderId) => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrders"] });
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrder", ticketServiceOrderId] });
        },
    });
};

export const useSuggestAssignment = () => {
    return useMutation({
        mutationFn: (data: { date: string, startTime: string, endTime: string, ticketServiceId: string, ticketIds: string[], staffIds?: string[], ticketServiceOrderId?: string }) =>
            apiSuggestSmartAssignment(data),
    });
};

export const useApplyOptimization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => apiApplyOptimization(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrder", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrders"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
};

export const useReassignTicketStaff = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { ticketId: string, staffId: string } }) => reassignTicketStaff(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrder", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["ticketServiceOrders"] });
        },
    });
};




