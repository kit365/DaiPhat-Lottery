import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { CategoryNode } from '../components/ui/CategoryTreeSelect';
import { ApiResponse } from '../config/type';

const BASE_URL = '/api/v1/admin/ticket/category';

/** Header auth dùng chung cho ticket-categories */
const withAuth = () => {
    const token = Cookies.get("tokenAdmin");

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

import { mockCategories } from '../data/categories';

export const getTicketCategories = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: mockCategories,
            pagination: {
                totalRecords: mockCategories.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            }
        }
    } as any;
};


export const getNestedTicketCategories = async (): Promise<ApiResponse<CategoryNode[]>> => {
    return {
        success: true,
        data: mockCategories.map(c => ({
            id: c._id,
            label: c.name,
            value: c._id,
            children: []
        }))
    } as any;
};


/** Tạo Miền/Tỉnh thành */
export const createTicketCategory = async (data: any): Promise<any> => {
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

/** Chi tiết Miền/Tỉnh thành */
export const getTicketCategoryById = async (id: string | number): Promise<any> => {
    const category = mockCategories.find(c => c._id === id) || mockCategories[0];
    return {
        success: true,
        data: category
    };
};


/** Cập nhật Miền/Tỉnh thành */
export const updateTicketCategory = async (id: string | number, data: any): Promise<any> => {
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

/** Xóa Miền/Tỉnh thành */
export const deleteTicketCategory = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/delete/${id}`, {}, withAuth());
    return response.data;
};

/** Khôi phục Miền/Tỉnh thành */
export const restoreTicketCategory = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

/** Xóa vĩnh viễn Miền/Tỉnh thành */
export const forceDeleteTicketCategory = async (id: string | number): Promise<any> => {
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
