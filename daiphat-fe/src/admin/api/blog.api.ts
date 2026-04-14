import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { ApiResponse } from '../config/type';

const BASE_URL = '/admin/article';

/** Header auth dùng chung */
const withAuth = () => {
    const token = Cookies.get("tokenAdmin");

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

/** Lấy tất cả bài viết */
import { mockBlogs } from '../data/blogs';

export const getBlogs = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: mockBlogs,
            pagination: {
                totalRecords: mockBlogs.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: mockBlogs.length,
                published: mockBlogs.filter(b => b.status === 'published').length,
                draft: mockBlogs.filter(b => b.status === 'draft').length,
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
    // Data đã được format đúng từ FE (BlogCreatePage)
    // Chỉ cần đảm bảo slug
    const payload = {
        ...data,
        slug: data.slug || generateSlug(data.name || ''),
        // category và status đã được xử lý ở form/hook
    };
    const response = await apiApp.post(BASE_URL, payload, withAuth());
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
