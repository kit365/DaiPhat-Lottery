import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { CategoryNode } from '../components/ui/CategoryTreeSelect';
import { ApiResponse } from '../config/type';

const BASE_URL = '/admin/ticketService/categories';

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getCategories = async (params?: any): Promise<ApiResponse<any>> => {
    return {
        success: true,
        data: {
            recordList: [
                { _id: "SC1", name: "Spa & Grooming", slug: "spa-grooming", status: "active", createdAt: new Date().toISOString() },
                { _id: "SC2", name: "Thú y", slug: "thu-y", status: "active", createdAt: new Date().toISOString() }
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
            { id: "SC1", label: "Spa & Grooming", value: "SC1", children: [] },
            { id: "SC2", label: "Thú y", value: "SC2", children: [] }
        ]
    } as any;
};


export const createCategory = async (data: any): Promise<any> => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

export const getCategoryById = async (id: string | number): Promise<any> => {
    const response = await apiApp.get(`${BASE_URL}/detail/${id}`, withAuth());
    return response.data;
};

export const updateCategory = async (id: string | number, data: any): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, data, withAuth());
    return response.data;
};

export const deleteCategory = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/delete/${id}`, withAuth());
    return response.data;
};

export const restoreCategory = async (id: string | number): Promise<any> => {
    const response = await apiApp.patch(`${BASE_URL}/restore/${id}`, {}, withAuth());
    return response.data;
};

export const forceDeleteCategory = async (id: string | number): Promise<any> => {
    const response = await apiApp.delete(`${BASE_URL}/force-delete/${id}`, withAuth());
    return response.data;
};
