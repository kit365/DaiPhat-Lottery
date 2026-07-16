import { apiApp } from '../../../../api';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import { BlogTagResponse, CreateBlogTagRequest, UpdateBlogTagRequest, BlogTagQueryParams } from '../types/blog-tag.type';

const BASE_URL = '/blogs/tags';


/** Lấy danh sách tag (có phân trang) */
export const getBlogTags = async (params?: BlogTagQueryParams): Promise<ApiResponse<PageResponse<BlogTagResponse>>> => {
    const response = await apiApp.get(BASE_URL, {
        params: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            keyword: params?.keyword || ''
        }
    });

    // Map id to _id for table rendering compatibility if needed
    if (response.data && response.data.data && response.data.data.recordList) {
        response.data.data.recordList = response.data.data.recordList.map((item: Partial<BlogTagResponse>) => ({
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
export const createBlogTag = async (data: CreateBlogTagRequest): Promise<ApiResponse<BlogTagResponse>> => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

/** Cập nhật tag */
export const updateBlogTag = async (id: string | number, data: UpdateBlogTagRequest): Promise<ApiResponse<BlogTagResponse>> => {
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data);
    return response.data;
};

/** Xóa tag */
export const deleteBlogTag = async (id: string | number): Promise<ApiResponse<void>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};
