import { apiApp } from '../../api';
import { ApiResponse, PaginatedResponse } from '../config/type';
import { BlogTagResponse, CreateBlogTagRequest, UpdateBlogTagRequest } from '../../types/blogTag.type';

const BASE_URL = '/blogs/tags';

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

/** Lấy danh sách tag (có phân trang) */
export const getBlogTags = async (params?: any): Promise<ApiResponse<PaginatedResponse<BlogTagResponse>>> => {
    const response = await apiApp.get(BASE_URL, { 
        params: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            search: params?.search || params?.keyword || ''
        }
    });
    
    // Map id to _id for table rendering compatibility if needed
    if (response.data && response.data.data && response.data.data.recordList) {
        response.data.data.recordList = response.data.data.recordList.map((item: any) => ({
            ...item,
            _id: item.id
        }));
    }
    return response.data;
};

/** Lấy tất cả tag không phân trang */
export const getAllBlogTags = async (): Promise<ApiResponse<BlogTagResponse[]>> => {
    // Backend API must support returning all without pagination, 
    // maybe limit=1000 or a specific endpoint. 
    // Here we pass limit=1000 for now.
    const response = await apiApp.get(BASE_URL, { params: { limit: 1000 } });
    
    if (response.data && response.data.data && response.data.data.recordList) {
        return {
            ...response.data,
            data: response.data.data.recordList
        };
    }
    return response.data;
};

/** Tạo tag mới */
export const createBlogTag = async (data: any): Promise<ApiResponse<BlogTagResponse>> => {
    const payload: CreateBlogTagRequest = {
        name: data.name,
        slug: data.slug?.trim() || generateSlug(data.name || '')
    };
    const response = await apiApp.post(BASE_URL, payload);
    return response.data;
};

/** Cập nhật tag */
export const updateBlogTag = async (id: string | number, data: any): Promise<ApiResponse<BlogTagResponse>> => {
    const payload: UpdateBlogTagRequest = {
        name: data.name,
        slug: data.slug?.trim() || generateSlug(data.name || '')
    };
    const response = await apiApp.patch(`${BASE_URL}/${id}`, payload);
    return response.data;
};

/** Xóa tag */
export const deleteBlogTag = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};
