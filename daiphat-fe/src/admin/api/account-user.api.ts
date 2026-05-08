import { apiApp } from "../../api";
import { ApiResponse, PageResponse, BaseQueryParams } from "../config/type";
import { User } from "../../types/user.type";

const BASE_URL = "/users";

export const getUsers = async (params?: BaseQueryParams): Promise<ApiResponse<PageResponse<User>>> => {
    const response = await apiApp.get(BASE_URL, { params });
    const result = response.data?.data;
    
    // Map records to match FE expectations (fullName, avatar)
    const recordList = (result?.recordList || []).map((user: User) => ({
        ...user,
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email,
        avatar: user.avatarUrl || user.avatar
    }));

    const rawCounts = result?.statusCounts || {};
    
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
                ACTIVE: rawCounts.ACTIVE || rawCounts.active || 0,
                INACTIVE: rawCounts.INACTIVE || rawCounts.inactive || 0,
                PENDING: rawCounts.PENDING || rawCounts.pending || 0,
                BANNED: rawCounts.BANNED || rawCounts.banned || 0,
                LOCKED: rawCounts.LOCKED || rawCounts.locked || 0,
            }
        }
    };
};

export const getUserById = async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    const user = response.data?.data || response.data;
    return {
        success: true,
        message: response.data?.message || "",
        timestamp: response.data?.timestamp || new Date().toISOString(),
        data: {
            ...user,
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email,
            avatar: user.avatarUrl || user.avatar
        }
    };
};

export const createUser = async (data: any): Promise<ApiResponse<User>> => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateUser = async (id: string, data: any): Promise<ApiResponse<User>> => {
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const changeUserPassword = async (id: string, data: any): Promise<ApiResponse<void>> => {
    const response = await apiApp.patch(`${BASE_URL}/change-password/${id}`, data);
    return response.data;
};

export const deleteUser = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};

export const getUserAddresses = async (userId: string): Promise<ApiResponse<any[]>> => {
    const response = await apiApp.get(`${BASE_URL}/address/${userId}`);
    return response.data;
};

export const deleteUserAddress = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.delete(`${BASE_URL}/address/delete/${id}`);
    return response.data;
};

export const setUserAddressDefault = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.patch(`${BASE_URL}/address/set-default/${id}`, {});
    return response.data;
};

export const getStatuses = async (): Promise<string[]> => {
    const response = await apiApp.get(`${BASE_URL}/statuses`);
    return response.data?.data || [];
};
