import { apiApp } from '../../api';
import { ApiResponse, PaginatedResponse } from '../config/type';
import { BlogPostResponse, CreateBlogPostRequest, UpdateBlogPostRequest } from '../../types/blog.type';

const BASE_URL = '/blogs';

/** Map sort option FE → params BE */
const mapSortParams = (sort?: string): { sortBy: string; direction: string } => {
    switch (sort) {
        case 'oldest':  return { sortBy: 'createdAt', direction: 'asc' };
        case 'popular': return { sortBy: 'viewCount',  direction: 'desc' };
        default:        return { sortBy: 'createdAt', direction: 'desc' }; // 'latest'
    }
};

/** Lấy danh sách bài viết (gọi API thật) */
export const getBlogs = async (params?: any): Promise<ApiResponse<PaginatedResponse<BlogPostResponse>>> => {
    const { sortBy, direction } = mapSortParams(params?.sort);

    const response = await apiApp.get(BASE_URL, {
        params: {
            page:           params?.page    || 1,
            limit:          params?.limit   || 10,
            q:              params?.keyword || undefined,
            status:         params?.status  || undefined,
            tagId:          params?.tagId   || undefined,
            categoryId:     params?.categoryId || undefined,
            type:           params?.type    || undefined,
            sortBy,
            direction,
            includeDeleted: params?.is_trash ? true : undefined,
        }
    });
    return response.data;
};




/** Lấy chi tiết bài viết theo ID (dành cho admin) */
export const getBlogById = async (id: string | number): Promise<ApiResponse<BlogPostResponse>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    return response.data;
};


/** Tạo bài viết */
export const createBlog = async (data: any): Promise<ApiResponse<BlogPostResponse>> => {
    // Map data từ FE sang BE format (CreateBlogPostRequest)
    let categoryArray = data.category;
    if (typeof categoryArray === 'string') {
        try {
            categoryArray = JSON.parse(categoryArray);
        } catch (e) {
            categoryArray = [];
        }
    }
    const categoryId = Array.isArray(categoryArray) && categoryArray.length > 0 ? Number(categoryArray[0]) : null;

    const payload: CreateBlogPostRequest = {
        title: data.name || data.title,
        summary: data.description || data.summary,
        content: data.content,
        thumbnail: data.avatar || data.thumbnail,
        categoryId: categoryId,
        status: data.status,
        type: data.type,
        slug: data.slug || generateSlug(data.name || data.title || ''),
        tagIds: data.tags || data.tagIds || [],
        scheduledAt: data.scheduledAt || null,
    };
    const response = await apiApp.post(BASE_URL, payload);
    return response.data;
};

/** Cập nhật bài viết */
export const updateBlog = async (id: string | number, data: any): Promise<ApiResponse<BlogPostResponse>> => {
    const payload: UpdateBlogPostRequest = {
        title: data.title || data.name,
        slug: data.slug || generateSlug(data.title || data.name || ''),
        summary: data.summary || data.description,
        content: data.content,
        thumbnail: data.thumbnail || data.avatar,
        categoryId: data.categoryId,
        status: data.status,
        type: data.type,
        tagIds: data.tagIds || data.tags,
        scheduledAt: data.scheduledAt,
    };
    if (!payload.slug) {
        delete payload.slug;
    }
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, payload);
    return response.data;
};

/** Xóa bài viết */
export const deleteBlog = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};
// --- Helper functions ---

/** Generate slug từ title */
const generateSlug = (title: string): string => {
    return title
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
    return types.map((t: any) => {
        const code = t.code || t.value || "";
        const name = t.name || t.label || code;
        return {
            code,
            name,
            value: code,
            label: name,
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
    return statuses.map((s: any) => {
        const code = s.code || s.value || "";
        const name = s.name || s.label || code;
        return {
            code,
            name,
            value: code,
            label: name,
        };
    });
};
