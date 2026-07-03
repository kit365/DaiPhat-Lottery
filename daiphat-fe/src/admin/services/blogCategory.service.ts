import { apiApp } from '../../api';
import { CategoryNode } from '../components/ui/CategoryTreeSelect';
import { ApiResponse, PaginatedResponse } from '../config/type';
import { BlogCategoryResponse, CreateBlogCategoryRequest, UpdateBlogCategoryRequest } from '../../types/blogCategory.type';

const BASE_URL = '/blogs/categories';

const generateSlug = (value: string): string => {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

/** Danh sách (flat) */
export const getCategories = async (params?: any): Promise<ApiResponse<PaginatedResponse<BlogCategoryResponse>>> => {
    const response = await apiApp.get(BASE_URL, { 
        params: { 
            page: params?.page || 1, 
            limit: params?.limit || 10, 
            search: params?.search || params?.keyword || '', 
            isTrash: params?.isTrash || params?.is_trash || false,
            status: params?.status || undefined
        } 
    });
    
    // Map id to _id for table rendering compatibility
    if (response.data && response.data.data && response.data.data.recordList) {
        response.data.data.recordList = response.data.data.recordList.map((item: any) => ({
            ...item,
            _id: item.id
        }));
    }
    return response.data;
};

/** Danh sách phân cấp */
export const getNestedCategories = async (): Promise<ApiResponse<CategoryNode[]>> => {
    const response = await apiApp.get(`${BASE_URL}/nested`);
    return response.data;
};

/** Tạo danh mục */
export const createCategory = async (data: any): Promise<ApiResponse<BlogCategoryResponse>> => {
    const payload: CreateBlogCategoryRequest = {
        name: data.name,
        slug: data.slug?.trim() || generateSlug(data.name || ''),
        parentId: data.parent || null,
        description: data.description || '',
        displayOrder: data.displayOrder || undefined,
        status: data.status,
        avatar: data.avatar || null,
    };
    const response = await apiApp.post(BASE_URL, payload);
    return response.data;
};

/** Chi tiết danh mục */
export const getCategoryById = async (id: string | number): Promise<ApiResponse<BlogCategoryResponse>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    
    // Map response data for frontend form values compatibility
    if (response.data && response.data.data) {
        const item = response.data.data;
        response.data.data = {
            ...item,
            _id: item.id,
            parent: item.parentId || ''
        };
    }
    return response.data;
};

/** Cập nhật danh mục */
export const updateCategory = async (id: string | number, data: any): Promise<ApiResponse<BlogCategoryResponse>> => {
    const payload: UpdateBlogCategoryRequest = {
        name: data.name,
        slug: generateSlug(data.name || ''),
        parentId: data.parent || null,
        description: data.description || '',
        displayOrder: data.displayOrder || undefined,
        status: data.status,
        avatar: data.avatar || null,
    };
    const response = await apiApp.patch(`${BASE_URL}/${id}`, payload);
    return response.data;
};

/** Xóa */
export const deleteCategory = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};

/** Khôi phục */
export const restoreCategory = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/restore`);
    return response.data;
};

/** Xóa vĩnh viễn */
export const forceDeleteCategory = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}/force`);
    return response.data;
};

export interface CategoryStatusOption {
    code: string;
    name: string;
    value: string;
    label: string;
}

export const getCategoryStatuses = async (): Promise<CategoryStatusOption[]> => {
    const response = await apiApp.get(`${BASE_URL}/statuses`);
    const statuses = response.data?.data || [];
    return statuses.map((status: any) => {
        const code = status.code || status.value || "";
        const name = status.name || status.label || code;
        return {
            code,
            name,
            value: code,
            label: name,
        };
    });
};
