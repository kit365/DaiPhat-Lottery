import { apiApp } from '../../../../api';
import { ApiResponse, PageResponse } from '../../../../types/api.type';
import { BlogPostResponse, CreateBlogPostRequest, UpdateBlogPostRequest, BlogQueryParams,  } from '../types/blog.type';

const BASE_URL = '/blogs';

/** Map sort option FE → params BE */
const mapSortParams = (sort?: string): { sortBy: string; direction: string } => {
    switch (sort) {
        case 'oldest': return { sortBy: 'createdAt', direction: 'asc' };
        case 'popular': return { sortBy: 'viewCount', direction: 'desc' };
        default: return { sortBy: 'createdAt', direction: 'desc' }; // 'latest'
    }
};

/** Lấy danh sách bài viết (gọi API thật) */
export const getBlogs = async (params?: BlogQueryParams): Promise<ApiResponse<PageResponse<BlogPostResponse>>> => {
    const { sortBy, direction } = mapSortParams(params?.sort);

    const response = await apiApp.get(BASE_URL, {
        params: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            q: params?.keyword || undefined,
            status: params?.status || undefined,
            tagId: params?.tagId || undefined,
            categoryId: params?.categoryId || undefined,
            type: params?.type || undefined,
            sortBy,
            direction,
            includeDeleted: params?.is_trash ? true : undefined,
        },
        paramsSerializer: { indexes: null }
    });
    return response.data;
};




/** Lấy chi tiết bài viết theo ID (dành cho admin) */
export const getBlogById = async (id: string | number): Promise<ApiResponse<BlogPostResponse>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    return response.data;
};


/** Tạo bài viết */
export const createBlog = async (data: CreateBlogPostRequest): Promise<ApiResponse<BlogPostResponse>> => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

/** Cập nhật bài viết */
export const updateBlog = async (id: string | number, data: UpdateBlogPostRequest): Promise<ApiResponse<BlogPostResponse>> => {
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, data);
    return response.data;
};

/** Xóa bài viết */
export const deleteBlog = async (id: string | number): Promise<ApiResponse<void>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};
// --- Helper functions ---

/** Generate slug từ title */

/** Map status từ BE (lowercase) sang FE (uppercase) */
export const mapStatusToFrontend = (status: string): string => {
    const statusMap: Record<string, string> = {
        'draft': 'DRAFT',
        'published': 'PUBLISHED',
        'unpublished': 'UNPUBLISHED',
        'scheduled': 'SCHEDULED',
    };
    return statusMap[status] || 'DRAFT';
};


export const uploadBlogImage = async (file: File, folder: 'blog-content' | 'category' = 'blog-content'): Promise<ApiResponse<{ publicId: string; url: string }>> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiApp.post<ApiResponse<{ publicId: string; url: string }>>(`${BASE_URL}/upload`, formData, {
        params: { folder },
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
};

export interface BlogTypeOption {
    code: string;
    name: string;
    value: string;
    label: string;
}

export const getBlogTypes = async (): Promise<BlogTypeOption[]> => {
    const response = await apiApp.get(`${BASE_URL}/types`);
    const types = response.data?.data || [];
    return types.map((t: { code: string; name: string }) => {
        const code = (t.code || "").toLowerCase();
        return {
            code,
            name: t.name,
            value: code,
            label: t.name,
        };
    });
};

export interface BlogStatusOption {
    code: string;
    name: string;
    value: string;
    label: string;
}

export const getBlogStatuses = async (): Promise<BlogStatusOption[]> => {
    const response = await apiApp.get(`${BASE_URL}/statuses`);
    const statuses = response.data?.data || [];
    return statuses.map((s: { code: string; name: string }) => {
        const code = (s.code || "").toLowerCase();
        return {
            code,
            name: s.name,
            value: code,
            label: s.name,
        };
    });
};
