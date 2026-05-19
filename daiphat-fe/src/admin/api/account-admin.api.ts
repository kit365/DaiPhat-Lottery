import { apiApp } from "../../api";
import { ApiResponse, PageResponse, BaseQueryParams } from "../config/type";
import { User } from "../../types/user.type";

const BASE_URL = "/users";

export const getAccounts = async (params?: BaseQueryParams): Promise<ApiResponse<PageResponse<User>>> => {
    const response = await apiApp.get(BASE_URL, { params });
    const result = response.data?.data;
    
    // Map records to match FE expectations (fullName, rolesName, avatar, status)
    const recordList = (result?.recordList || []).map((user: User) => ({
        ...user,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        rolesName: user.role ? [user.role.name] : [],
        avatar: user.avatarUrl,
        status: user.status ? user.status.toUpperCase() : 'PENDING'
    }));

    const statusCounts = result?.statusCounts || {};
    
    return {
        success: true,
        message: response.data?.message || "",
        timestamp: response.data?.timestamp || new Date().toISOString(),
        data: {
            recordList,
            pagination: result?.pagination || {
                totalRecords: recordList.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: result?.pagination?.totalRecords || recordList.length,
                ACTIVE: statusCounts.ACTIVE || statusCounts.active || 0,
                INACTIVE: statusCounts.INACTIVE || statusCounts.inactive || 0,
                PENDING: statusCounts.PENDING || statusCounts.pending || 0,
                BANNED: statusCounts.BANNED || statusCounts.banned || 0,
                LOCKED: statusCounts.LOCKED || statusCounts.locked || 0,
            }
        }
    };
};

export const getStaffByTicketService = async (ticketServiceId: string): Promise<ApiResponse<User[]>> => {
    const response = await apiApp.get(BASE_URL, { params: { ticketServiceId } });
    return {
        ...response.data,
        data: (response.data?.data || []).map((user: any) => ({
            ...user,
            status: user.status ? user.status.toUpperCase() : 'PENDING'
        }))
    };
};

export const getAccountById = async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    const user = response.data?.data || response.data;
    return {
        success: true,
        message: response.data?.message || "",
        timestamp: response.data?.timestamp || new Date().toISOString(),
        data: {
            ...user,
            status: user.status ? user.status.toUpperCase() : 'PENDING'
        }
    };
};

export const createAccount = async (data: any): Promise<ApiResponse<User>> => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateAccount = async (id: string, data: any): Promise<ApiResponse<User>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const changeAccountPassword = async (id: string, data: any): Promise<ApiResponse<void>> => {
    const response = await apiApp.put(`${BASE_URL}/change-password/${id}`, data);
    return response.data;
};

export const deleteAccount = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};
