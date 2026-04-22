import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { mockTicketServiceOrders } from '../data/ticketServiceOrders';

const BASE_URL = '/admin/ticketServiceOrder/ticketServiceOrders';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};


export const getTicketServiceOrders = async (params?: any) => {
    return {
        success: true,
        data: {
            recordList: mockTicketServiceOrders,
            pagination: {
                totalRecords: mockTicketServiceOrders.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: mockTicketServiceOrders.length,
                pending: mockTicketServiceOrders.filter(b => b.ticketServiceOrderStatus === 'pending').length,
                confirmed: mockTicketServiceOrders.filter(b => b.ticketServiceOrderStatus === 'confirmed').length,
                "in-progress": mockTicketServiceOrders.filter(b => b.ticketServiceOrderStatus === 'in-progress').length,
                completed: mockTicketServiceOrders.filter(b => b.ticketServiceOrderStatus === 'completed').length,
                cancelled: mockTicketServiceOrders.filter(b => b.ticketServiceOrderStatus === 'cancelled').length,
                request_cancel: mockTicketServiceOrders.filter(b => b.ticketServiceOrderStatus === 'request_cancel').length,
            }
        }
    };
};

export const getTicketServiceOrderDetail = async (id: string) => {
    const ticketServiceOrder = mockTicketServiceOrders.find(b => b._id === id) || mockTicketServiceOrders[0];
    return {
        success: true,
        data: ticketServiceOrder
    };
};

export const getStaffTasks = async () => {
    return {
        success: true,
        data: mockTicketServiceOrders.filter(b => b.ticketServiceOrderStatus === 'in-progress')
    };
};


export const getStaffTicketServiceOrderDetail = async (id: string) => {
    const response = await apiApp.get(`${BASE_URL}/staff-detail/${id}`, withAuth());
    return response.data;
};

export const createTicketServiceOrder = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

export const updateTicketServiceOrderStatus = async (id: string, status: string, ticketId?: string, reason?: string) => {
    const endpointMapping: Record<string, string> = {
        'confirmed': 'confirm',
        'cancelled': 'cancel',
        'completed': 'complete',
        'returned': 'check-in',
    };
    const endpoint = endpointMapping[status];
    if (!endpoint) throw new Error("Invalid status update");
    const response = await apiApp.patch(`${BASE_URL}/${id}/${endpoint}`, { userTicketId: ticketId, reason }, withAuth());
    return response.data;
};

export const checkInTicketServiceOrder = async (id: string) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/check-in`, {}, withAuth());
    return response.data;
};

export const checkoutTicketServiceOrder = async (id: string) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/check-out`, {}, withAuth());
    return response.data;
};

export const confirmTicketServiceOrder = (id: string) => updateTicketServiceOrderStatus(id, 'confirmed');
export const cancelTicketServiceOrder = (id: string, reason?: string) => {
    return apiApp.patch(`${BASE_URL}/${id}/cancel`, { reason }, withAuth());
};
export const completeTicketServiceOrder = (id: string) => updateTicketServiceOrderStatus(id, 'completed');

export const assignStaffToTicketServiceOrder = async (ticketServiceOrderId: string, data: { staffId?: string, staffIds?: string[] }) => {
    const response = await apiApp.patch(`${BASE_URL}/${ticketServiceOrderId}/assign-staff`, data, withAuth());
    return response.data;
};

export const startTicketServiceOrder = async (id: string, ticketId?: string) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/start`, { userTicketId: ticketId }, withAuth());
    return response.data;
};

export const rescheduleTicketServiceOrder = async (id: string, data: { start: string, end: string, staffId?: string, staffIds?: string[] }) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/reschedule`, data, withAuth());
    return response.data;
};

export const extendTicketServiceOrder = async (id: string, minutes: number) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/extend`, { minutes }, withAuth());
    return response.data;
};

export const updateTicketServiceOrder = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/update`, data, withAuth());
    return response.data;
};

export const getAvailableSlots = async (params: { date: string, ticketServiceId: string, departmentId?: string }) => {
    const response = await apiApp.get(`${BASE_URL}/available-slots`, { ...withAuth(), params });
    return response.data;
};
export const getRecommendedStaff = async (id: string) => {
    const response = await apiApp.get(`${BASE_URL}/${id}/recommend-staff`, withAuth());
    return response.data;
};
export const exportStaffSchedule = async (date: string) => {
    const response = await apiApp.get(`${BASE_URL}/export-staff-schedule`, {
        ...withAuth(),
        params: { date },
        responseType: 'blob'
    });
    return response.data;
};

export const autoAssignTicketServiceOrders = async (ticketServiceOrderId: string) => {
    const response = await apiApp.post(`${BASE_URL}/auto-assign`, { ticketServiceOrderId }, withAuth());
    return response.data;
};

export const suggestSmartAssignment = async (data: { date: string, startTime: string, endTime: string, ticketServiceId: string, ticketIds: string[], staffIds?: string[] }) => {
    const { ticketIds, ...rest } = data;
    const transformedData = { ...rest, userTicketIds: ticketIds };
    const response = await apiApp.post(`${BASE_URL}/suggest-assignment`, transformedData, withAuth());
    return response.data;
};

export const applyOptimization = async (id: string, data: { targetTicketId: string, newStaffId: string, notificationId?: string }) => {
    const { targetTicketId, ...rest } = data;
    const transformedData = { ...rest, userTicketId: targetTicketId };
    const response = await apiApp.patch(`${BASE_URL}/${id}/apply-optimization`, transformedData, withAuth());
    return response.data;
};

export const reassignTicketStaff = async (id: string, data: { ticketId: string, staffId: string }) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/reassign-ticket-staff`, data, withAuth());
    return response.data;
};