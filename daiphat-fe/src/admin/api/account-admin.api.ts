import { apiApp } from "../../api";

const BASE_URL = "/users";

export const getAccounts = async (params?: any) => {
    const response = await apiApp.get(BASE_URL, { params });
    // Nếu BE trả về list trực tiếp, ta map lại cho đúng cấu trúc FE mong đợi
    const users = response.data?.data || response.data || [];
    return {
        success: true,
        data: {
            recordList: users,
            pagination: {
                totalRecords: users.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: users.length,
                active: users.filter((u: any) => u.status === 'active').length,
                inactive: users.filter((u: any) => u.status === 'inactive').length,
            }
        }
    };
};

export const getStaffByTicketService = async (ticketServiceId: string) => {
    // Tạm thời BE chưa có endpoint này, ta gọi chung list users hoặc xử lý sau nếu sếp cần
    const response = await apiApp.get(BASE_URL, { params: { ticketServiceId } });
    return response.data;
};

export const getAccountById = async (id: string) => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    return {
        success: true,
        data: response.data?.data || response.data
    };
};

export const createAccount = async (data: any) => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateAccount = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const changeAccountPassword = async (id: string, data: any) => {
    // Giả định backend có endpoint change-password cho user
    const response = await apiApp.patch(`${BASE_URL}/change-password/${id}`, data);
    return response.data;
};

export const deleteAccount = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};
