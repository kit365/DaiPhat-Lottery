import Cookies from 'js-cookie';
import { apiApp } from '../../api';
import { STORAGE_KEYS } from '../../constants/storage.constants';
import { ApiResponse, PageResponse } from '../../types/api.type';
import {
    CreateSupportTicketCommentRequest,
    GetStaffTicketsParams,
    ResolveSupportTicketRequest,
    SupportTicketCommentResponse,
    SupportTicketResponse,
    SupportTicketStaffSummaryResponse,
    TicketCategoryResponse,
} from '../../types/support.type';

const STAFF_BASE = '/staff/tickets';
const TICKET_BASE = '/tickets';
const CATEGORY_URL = '/ticket-categories';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const supportTicketAdminApi = {
    getStaffTickets: async (
        params: GetStaffTicketsParams
    ): Promise<ApiResponse<PageResponse<SupportTicketStaffSummaryResponse>>> => {
        const response = await apiApp.get(STAFF_BASE, { ...withAuth(), params });
        return response.data;
    },

    assignTicket: async (id: number): Promise<ApiResponse<SupportTicketResponse>> => {
        const response = await apiApp.put(`${STAFF_BASE}/${id}/assign`, {}, withAuth());
        return response.data;
    },

    resolveTicket: async (
        id: number,
        data: ResolveSupportTicketRequest
    ): Promise<ApiResponse<SupportTicketResponse>> => {
        const response = await apiApp.put(`${STAFF_BASE}/${id}/resolve`, data, withAuth());
        return response.data;
    },

    getTicketById: async (id: number): Promise<ApiResponse<SupportTicketResponse>> => {
        const response = await apiApp.get(`${TICKET_BASE}/${id}`, withAuth());
        return response.data;
    },

    getComments: async (id: number): Promise<ApiResponse<SupportTicketCommentResponse[]>> => {
        const response = await apiApp.get(`${TICKET_BASE}/${id}/comments`, withAuth());
        return response.data;
    },

    addComment: async (
        id: number,
        data: CreateSupportTicketCommentRequest,
        file?: File | null
    ): Promise<ApiResponse<SupportTicketCommentResponse>> => {
        const formData = new FormData();
        formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
        if (file) {
            formData.append('file', file);
        }
        const token = Cookies.get(STORAGE_KEYS.TOKEN);
        const response = await apiApp.post(`${TICKET_BASE}/${id}/comments`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getCategories: async (): Promise<ApiResponse<TicketCategoryResponse[]>> => {
        const response = await apiApp.get(CATEGORY_URL, withAuth());
        return response.data;
    },
};
