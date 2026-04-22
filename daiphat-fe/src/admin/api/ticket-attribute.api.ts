import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { ApiResponse } from '../config/type';
import { prefixAdmin } from '../constants/routes';

const BASE_URL = `/${prefixAdmin}/ticket/attribute`;

/** Header auth dùng chung */
const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getTicketAttributes = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: [
                { _id: "A1", name: "Kỳ mở thưởng", slug: "ky-mo-thuong", type: "text", createdAt: new Date().toISOString() },
                { _id: "A2", name: "Đài quay số", slug: "dai-quay-so", type: "text", createdAt: new Date().toISOString() },
                { _id: "A3", name: "Loại vé", slug: "loai-ve", type: "text", createdAt: new Date().toISOString() }
            ],
            pagination: {
                totalRecords: 3,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            }
        }
    } as any;
};


/** Lấy chi tiết thông số */
export const getTicketAttributeDetail = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(`${BASE_URL}/detail/${id}`, withAuth());
    return response.data;
};

/** Tạo thông số mới */
export const createTicketAttribute = async (data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

/** Cập nhật thông số */
export const updateTicketAttribute = async (id: string | number, data: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, data, withAuth());
    return response.data;
};

/** Xóa thông số (mềm) */
export const deleteTicketAttribute = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/delete/${id}`, {}, withAuth());
    return response.data;
};

/** Khôi phục thông số */
export const restoreTicketAttribute = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

/** Xóa vĩnh viễn thông số */
export const forceDeleteTicketAttribute = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.delete(`${BASE_URL}/force-delete/${id}`, withAuth());
    return response.data;
};
