import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { ApiResponse } from '../config/type';

const BASE_URL = '/admin/ticketService';

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

import { mockTicketServices } from '../data/services';

export const getTicketServices = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: mockTicketServices,
            pagination: {
                totalRecords: mockTicketServices.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            }
        }
    } as any;
};



export const getTicketServiceById = async (id: string | number): Promise<any> => {
    const ticketService = mockTicketServices.find(s => s._id === id) || mockTicketServices[0];
    return {
        success: true,
        data: ticketService
    };
};


export const createTicketService = async (data: any): Promise<any> => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

export const updateTicketService = async (id: string | number, data: any): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, data, withAuth());
    return response.data;
};

export const deleteTicketService = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/delete/${id}`, withAuth());
    return response.data;
};

export const restoreTicketService = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

export const forceDeleteTicketService = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/force-delete/${id}`, withAuth());
    return response.data;
};

// Deprecated object export for backward compatibility if needed, 
// but we'll move towards direct function imports.
export const ticketServiceApi = {
    ticketServiceList: getTicketServices,
    ticketServiceDetail: getTicketServiceById,
    ticketServiceCreate: createTicketService,
    ticketServiceEdit: updateTicketService,
    ticketServiceDelete: deleteTicketService,
};
