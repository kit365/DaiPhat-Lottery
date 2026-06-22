import { apiApp } from '../../api';
import { ApiResponse, PageResponse } from '../../types/api.type';
import {
    CreateSupportTicketRequest,
    GetMyTicketsParams,
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

    getById: async (id: number): Promise<ApiResponse<SupportTicketResponse>> => {
        const response = await apiApp.get(`${BASE_URL}/${id}`);
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
};
