import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { CategoryNode } from '../components/ui/CategoryTreeSelect';
import { ApiResponse } from '../config/type';

const BASE_URL = '/admin/article/category';

/** Header auth dùng chung cho blog-categories */
const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

/** Danh sách (flat) */
export const getCategories = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: [
                { _id: "BC1", name: "Chăm sóc thú cưng", slug: "cham-soc-thu-cung", status: "active", createdAt: new Date().toISOString() },
                { _id: "BC2", name: "Tin tức", slug: "tin-tuc", status: "active", createdAt: new Date().toISOString() }
            ],
            pagination: {
                totalRecords: 2,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            }
        }
    } as any;
};


export const getNestedCategories = async (): Promise<ApiResponse<CategoryNode[]>> => {
    return {
        success: true,
        data: [
            { id: "BC1", label: "Chăm sóc thú cưng", value: "BC1", children: [] },
            { id: "BC2", label: "Tin tức", value: "BC2", children: [] }
        ]
    } as any;
};


/** Tạo danh mục */
export const createCategory = async (data: any): Promise<any> => {
    // Map data từ FE sang BE format
    const payload = {
        name: data.name,
        slug: data.slug || generateSlug(data.name),
        parent: data.parent || '',
        description: data.description || '',
        avatar: data.avatar || '',
        status: data.status || 'active',
    };
    const response = await apiApp.post(`${BASE_URL}/create`, payload, withAuth());
    return response.data;
};

/** Chi tiết */
export const getCategoryById = async (id: string | number): Promise<any> => {
    const response = await apiApp.get(`${BASE_URL}/detail/${id}`, withAuth());
    return response.data;
};

/** Cập nhật danh mục */
export const updateCategory = async (id: string | number, data: any): Promise<any> => {
    // Map data từ FE sang BE format
    const payload = {
        name: data.name,
        slug: data.slug || generateSlug(data.name),
        parent: data.parent || '',
        description: data.description || '',
        avatar: data.avatar || '',
        status: data.status || 'active',
    };
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, payload, withAuth());
    return response.data;
};

/** Xóa */
export const deleteCategory = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/delete/${id}`, {}, withAuth());
    return response.data;
};

/** Khôi phục */
export const restoreCategory = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

/** Xóa vĩnh viễn */
export const forceDeleteCategory = async (id: string | number): Promise<any> => {
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
