import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { ApiResponse } from '../config/type';
import { prefixAdmin } from '../constants/routes';

const BASE_URL = `/api/v1/${prefixAdmin}/ticket`;

/** Header auth dùng chung */
const withAuth = () => {
    const token = Cookies.get("tokenAdmin");

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

import { mockTickets } from '../data/tickets';
import { mockCategories } from '../data/categories';
import { mockProviders } from '../data/providers';

export const getTickets = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: mockTickets,
            pagination: {
                totalRecords: mockTickets.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: mockTickets.length,
                active: mockTickets.filter(p => p.status === 'active').length,
                inactive: mockTickets.filter(p => p.status === 'inactive').length,
            }
        }
    } as any;
};

export const getCreateTicketData = async (): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            categoryTree: mockCategories.map(c => ({ id: c._id, label: c.name, value: c._id })),
            attributes: [
                { _id: "A1", name: "Kỳ mở thưởng" },
                { _id: "A2", name: "Loại vé" }
            ],
            providers: mockProviders
        }
    } as any;
};

/** Tạo vé mới */
export const createTicket = async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

/** Lấy chi tiết vé cho trang Edit */
export const getTicketById = async (id: string | number): Promise<ApiResponse<any>> => {
    const ticket = mockTickets.find(p => p._id === id) || mockTickets[0];
    return {
        success: true,
        data: ticket
    } as any;
};

/** Cập nhật vé */
export const updateTicket = async (id: string | number, data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, data, withAuth());
    return response.data;
};

/** Xóa vé */
export const deleteTicket = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/delete/${id}`, {}, withAuth());
    return response.data;
};

/** Khôi phục vé */
export const restoreTicket = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

/** Xóa vĩnh viễn vé */
export const forceDeleteTicket = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.delete(`${BASE_URL}/force-delete/${id}`, withAuth());
    return response.data;
};

/** Lấy danh sách vé hết hạn */
export const getExpiredTickets = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: [],
            pagination: {
                totalRecords: 0,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            }
        }
    } as any;
};

/** Quét vé hết hạn thủ công */
export const scanExpiredTickets = async (): Promise<ApiResponse<any>> => {
    return {
        success: true,
        message: "Quét vé số hết hạn thành công!"
    } as any;
};
