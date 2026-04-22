import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { ApiResponse } from '../config/type';

const BASE_URL = '/admin/provider';

/** Header auth dùng chung */
const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

/** Lấy tất cả nhà đài/công ty xổ số */
import { mockProviders } from '../data/providers';

export const getProviders = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: mockProviders,
            pagination: {
                totalRecords: mockProviders.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: mockProviders.length,
                active: mockProviders.filter(b => b.status === 'active').length,
                inactive: mockProviders.filter(b => b.status === 'inactive').length,
            }
        }
    } as any;
};

/** Lấy nhà đài theo ID */
export const getProviderById = async (id: string | number): Promise<any> => {
    const provider = mockProviders.find(b => b._id === id) || mockProviders[0];
    return {
        success: true,
        data: provider
    };
};

/** Tạo nhà đài mới */
export const createProvider = async (data: any): Promise<any> => {
    const payload = {
        name: data.name,
        slug: data.slug || generateSlug(data.name),
        description: data.description || '',
        avatar: data.avatar || '',
        status: data.status || 'active',
    };
    const response = await apiApp.post(BASE_URL, payload, withAuth());
    return response.data;
};

/** Cập nhật nhà đài */
export const updateProvider = async (id: string | number, data: any): Promise<any> => {
    const payload = {
        name: data.name,
        slug: data.slug || generateSlug(data.name),
        description: data.description || '',
        avatar: data.avatar || '',
        status: data.status || 'active',
    };
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, payload, withAuth());
    return response.data;
};

/** Xóa nhà đài */
export const deleteProvider = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/delete/${id}`, {}, withAuth());
    return response.data;
};

/** Khôi phục nhà đài */
export const restoreProvider = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

/** Xóa vĩnh viễn nhà đài */
export const forceDeleteProvider = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/force-delete/${id}`, withAuth());
    return response.data;
};

// --- Helper functions ---

/** Generate slug từ name */
const generateSlug = (name: string): string => {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
};
