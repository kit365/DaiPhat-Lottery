import { apiApp } from '../../api';
import { ApiResponse, PageResponse } from '../../types/api.type';
import {
    CreateSupportTicketCommentRequest,
    CreateSupportTicketRequest,
    GetMyTicketsParams,
    OrderComplaintEligibilityResponse,
    SupportTicketCommentResponse,
    SupportTicketResponse,
    SupportTicketSummaryResponse,
    TicketCategoryResponse,
    UpdateSupportTicketRequest,
} from '../../types/support.type';

const BASE_URL = '/tickets';
const CATEGORY_URL = '/ticket-categories';

const buildMultipartBody = (data: CreateSupportTicketRequest | UpdateSupportTicketRequest, file?: File | null) => {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (file) {
        formData.append('file', file);
    }
    return formData;
};

const multipartHeaders = {
    headers: { 'Content-Type': 'multipart/form-data' },
};

export const supportTicketService = {
    getCategories: async (): Promise<ApiResponse<TicketCategoryResponse[]>> => {
        const response = await apiApp.get(CATEGORY_URL);
        return response.data;
    },

    getOrderComplaintEligibility: async (
        orderId: string
    ): Promise<ApiResponse<OrderComplaintEligibilityResponse>> => {
        const response = await apiApp.get(`${BASE_URL}/orders/${orderId}/complaint-eligibility`);
        return response.data;
    },

    create: async (
        data: CreateSupportTicketRequest,
        file?: File | null
    ): Promise<ApiResponse<SupportTicketResponse>> => {
        const response = await apiApp.post(
            BASE_URL,
            buildMultipartBody(data, file),
            multipartHeaders
        );
        return response.data;
    },

    getMyTickets: async (
        params: GetMyTicketsParams
    ): Promise<ApiResponse<PageResponse<SupportTicketSummaryResponse>>> => {
        const response = await apiApp.get(`${BASE_URL}/my`, { params });
        return response.data;
    },

    getMyActiveCount: async (): Promise<ApiResponse<number>> => {
        const response = await apiApp.get(`${BASE_URL}/my/active-count`);
        return response.data;
    },

    getById: async (id: number): Promise<ApiResponse<SupportTicketResponse>> => {
        const response = await apiApp.get(`${BASE_URL}/${id}`, {
            skipGlobalErrorToast: true,
        } as any);
        return response.data;
    },

    update: async (
        id: number,
        data: UpdateSupportTicketRequest,
        file?: File | null
    ): Promise<ApiResponse<SupportTicketResponse>> => {
        const response = await apiApp.patch(
            `${BASE_URL}/${id}`,
            buildMultipartBody(data, file),
            multipartHeaders
        );
        return response.data;
    },

    close: async (id: number): Promise<ApiResponse<SupportTicketResponse>> => {
        const response = await apiApp.patch(`${BASE_URL}/${id}/close`);
        return response.data;
    },

    submitResolutionFeedback: async (
        id: number,
        satisfied: boolean
    ): Promise<ApiResponse<SupportTicketResponse>> => {
        const response = await apiApp.put(`${BASE_URL}/${id}/resolution-feedback`, { satisfied });
        return response.data;
    },

    getComments: async (id: number): Promise<ApiResponse<SupportTicketCommentResponse[]>> => {
        const response = await apiApp.get(`${BASE_URL}/${id}/comments`);
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
        const response = await apiApp.post(`${BASE_URL}/${id}/comments`, formData, multipartHeaders);
        return response.data;
    },
};
