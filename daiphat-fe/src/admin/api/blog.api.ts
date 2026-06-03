import { apiApp } from '../../api';
import { ApiResponse } from '../config/type';

const BASE_URL = '/blogs';

/** Lấy tất cả bài viết */
import { mockBlogs } from '../data/blogs';

export const getBlogs = async (params?: any): Promise<ApiResponse<any>> => {
    let list = [...mockBlogs];
    
    // 1. Lọc theo từ khóa
    if (params?.keyword) {
        const kw = params.keyword.toLowerCase();
        list = list.filter(b => b.title.toLowerCase().includes(kw));
    }
    
    // 2. Lọc theo trạng thái
    if (params?.status) {
        list = list.filter(b => b.status === params.status);
    }
    
    // 3. Sắp xếp
    if (params?.sort === 'oldest') {
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (params?.sort === 'popular') {
        list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    } else { // latest
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    // 4. Phân trang
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const startIndex = (page - 1) * limit;
    const paginatedList = list.slice(startIndex, startIndex + limit);
    
    return {
        success: true,
        data: {
            recordList: paginatedList,
            pagination: {
                totalRecords: list.length,
                totalPages: Math.ceil(list.length / limit),
                currentPage: page,
                limit: limit
            },
            statusCounts: {
                all: mockBlogs.length,
                published: mockBlogs.filter(b => b.status === 'published').length,
                draft: mockBlogs.filter(b => b.status === 'draft').length,
                archived: mockBlogs.filter(b => b.status === 'archived').length,
            }
        }
    } as any;
};




/** Lấy bài viết theo ID */
export const getBlogById = async (id: string | number): Promise<any> => {
    const blog = mockBlogs.find(b => b._id === id) || mockBlogs[0];
    return {
        success: true,
        data: blog
    };
};


/** Tạo bài viết */
export const createBlog = async (data: any): Promise<any> => {
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

    const payload = {
        title: data.name,
        summary: data.description,
        content: data.content,
        thumbnail: data.avatar,
        categoryId: categoryId,
        status: data.status,
        type: data.type,
        slug: data.slug || generateSlug(data.name || ''),
        tagIds: data.tags || []
    };
    const response = await apiApp.post(BASE_URL, payload);
    return response.data;
};

/** Cập nhật bài viết */
export const updateBlog = async (id: string | number, data: any): Promise<any> => {
    const payload = {
        ...data,
        slug: data.slug || generateSlug(data.name || ''),
    };
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, payload, withAuth());
    return response.data;
};

/** Xóa bài viết */
export const deleteBlog = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/delete/${id}`, {}, withAuth());
    return response.data;
};

/** Khôi phục bài viết */
export const restoreBlog = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

/** Xóa vĩnh viễn bài viết */
export const forceDeleteBlog = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/force-delete/${id}`, withAuth());
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
        'archived': 'ARCHIVED',
    };
    return statusMap[status] || 'DRAFT';
};

/** Lấy toàn bộ tag (không phân trang) */
export const getAllBlogTags = async (): Promise<ApiResponse<any[]>> => {
    const response = await apiApp.get(`${BASE_URL}/tags/all`);
    return response.data;
};

/** Lấy danh sách tag (phân trang) */
export const getBlogTags = async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiApp.get(`${BASE_URL}/tags`, {
        params: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            search: params?.search || ''
        }
    });
    return response.data;
};

/** Tạo tag */
export const createBlogTag = async (data: { name: string; slug?: string }): Promise<any> => {
    const response = await apiApp.post(`${BASE_URL}/tags`, data);
    return response.data;
};

/** Xóa tag */
export const deleteBlogTag = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/tags/${id}`);
    return response.data;
};

/** Cập nhật tag */
export const updateBlogTag = async (id: string | number, data: { name: string; slug?: string }): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/tags/${id}`, data);
    return response.data;
};

const withAuth = () => {
    const token = localStorage.getItem("token") || "";
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
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


