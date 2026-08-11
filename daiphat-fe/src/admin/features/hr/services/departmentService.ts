import { apiApp } from '@/api';

const BASE_URL = '/admin/departments';

const MOCK_DEPARTMENTS = [
    { _id: 'D1', name: 'Bán vé', description: 'Quầy bán vé trực tiếp' },
    { _id: 'D2', name: 'Kho vé', description: 'Nhập kho, kiểm kê vé' },
    { _id: 'D3', name: 'Hỗ trợ KH', description: 'Chăm sóc khách hàng' },
];

export const getDepartments = async (params?: { page?: number; limit?: number }) => ({
    success: true,
    data: {
        recordList: MOCK_DEPARTMENTS,
        pagination: {
            totalRecords: MOCK_DEPARTMENTS.length,
            totalPages: 1,
            currentPage: params?.page || 1,
            limit: params?.limit || 10,
        },
    },
});

export const getDepartmentDetail = async (id: string) => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    return response.data;
};

export const createDepartment = async (data: Record<string, unknown>) => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateDepartment = async (id: string, data: Record<string, unknown>) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const deleteDepartment = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};
