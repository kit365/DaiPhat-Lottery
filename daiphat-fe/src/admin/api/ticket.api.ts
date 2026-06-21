import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { ApiResponse } from '../config/type';
import { prefixAdmin } from '../constants/routes';
import { STORAGE_KEYS } from '../../constants/storage.constants';

const BASE_URL = `/lottery-tickets`;

/** Header auth dùng chung */
const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);

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
    const response = await apiApp.get(BASE_URL, { 
        params: {
            page: params?.page || 1,
            size: params?.limit || 10,
            stationId: params?.stationId,
            stationIds: params?.stationIds,
            status: params?.status,
            drawDate: Array.isArray(params?.drawDate) ? params.drawDate.join(',') : params?.drawDate,
            search: params?.search,
            sortBy: params?.sortBy,
            direction: params?.direction
        },
        paramsSerializer: {
            indexes: null,
        },
        ...withAuth() 
    });
    
    const result = response.data?.data;
    
    // Map BE response to match FE expectations
    const recordList = (result?.recordList || []).map((item: any) => ({
        ...item,
        _id: item.id,
        avatar: item.ticketImg,
        status: item.status ? item.status.toLowerCase() : 'draft'
    }));

    return {
        success: true,
        message: response.data?.message || "",
        timestamp: response.data?.timestamp || new Date().toISOString(),
        data: {
            recordList,
            pagination: result?.pagination || {
                totalRecords: recordList.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: result?.pagination?.totalRecords || recordList.length,
                active: recordList.filter((b: any) => b.status === 'active').length,
                inactive: recordList.filter((b: any) => b.status === 'inactive').length,
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
    const response = await apiApp.post(BASE_URL, data, withAuth());
    return response.data;
};

/** Lấy chi tiết vé cho trang Edit */
export const getTicketById = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

/** Cập nhật vé */
export const updateTicket = async (id: string | number, data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, data, withAuth());
    return response.data;
};

/** Xóa vé */
export const deleteTicket = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`, withAuth());
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

import { uploadAdminImage } from './upload.api';

/** Upload ảnh vé số lên Cloudinary qua backend (dùng khi tạo vé, chưa có ticket id) */
export const uploadLotteryTicketAsset = uploadAdminImage;

/** Tải ảnh vé số */
export const uploadTicketImage = async (id: string | number, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiApp.post(`${BASE_URL}/${id}/image`, formData, {
        ...withAuth(),
        headers: {
            ...withAuth().headers,
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};


/** Tải ảnh sê-ri vé số */
export const uploadTicketSerialImage = async (id: string | number, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiApp.post(`/lottery-ticket-serials/${id}/image`, formData, {
        ...withAuth(),
        headers: {
            ...withAuth().headers,
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};
