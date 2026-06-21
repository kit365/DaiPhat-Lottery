import { apiApp } from "../../api";
import { ApiResponse, PageResponse, BaseQueryParams } from "../config/type";
import { User } from "../../types/user.type";

const BASE_URL = "/users";

export const getUsers = async (params?: BaseQueryParams): Promise<ApiResponse<PageResponse<User>>> => {
    const response = await apiApp.get(BASE_URL, { params });
    const result = response.data?.data;
    
    // Map records to match FE expectations (fullName, avatar, status)
    const recordList = (result?.recordList || []).map((user: any) => ({
        ...user,
        phone: user.phoneNumber || user.phone,
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email,
        avatar: user.avatarUrl || user.avatar,
        status: user.status ? user.status.toUpperCase() : 'PENDING'
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
                all: rawCounts.all ?? result?.pagination?.totalRecords ?? recordList.length,
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
            phone: user.phoneNumber || user.phone,
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email,
            avatar: user.avatarUrl || user.avatar,
            status: user.status ? user.status.toUpperCase() : 'PENDING'
        }
    };
};

export const createUser = async (data: any): Promise<ApiResponse<User>> => {
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateUser = async (id: string, data: any): Promise<ApiResponse<void>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const initiateResetPassword = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.post(`/auth/${id}/reset-password/initiate`);
    return response.data;
};

export const changeUserPassword = initiateResetPassword;

export const confirmResetPassword = async (id: string, otp: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.post(`/auth/${id}/reset-password/confirm`, { otp });
    return response.data;
};

export const deleteUser = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};

export interface UserStatusOption {
    code: string;
    name: string;
    value: string;
    label: string;
}

export const getStatuses = async (): Promise<UserStatusOption[]> => {
    const response = await apiApp.get(`${BASE_URL}/statuses`);
    const statuses = response.data?.data || [];
    return statuses.map((status: string | { code?: string; name?: string; label?: string; value?: string }) => {
        if (typeof status === "string") {
            return {
                code: status,
                name: status,
                value: status,
                label: status,
            };
        }

        const code = status.code || status.value || "";
        const name = status.name || status.label || code;
        return {
            code,
            name,
            value: code,
            label: name,
        };
    });
};

export const inviteStaff = async (id: string, data: { roleCode: string }): Promise<ApiResponse<void>> => {
    const response = await apiApp.post(`${BASE_URL}/${id}/invite-staff`, data);
    return response.data;
};

export const searchCustomers = async (params: { q: string; limit?: number }): Promise<ApiResponse<User[]>> => {
    const response = await apiApp.get(`${BASE_URL}/customers/search`, {
        params: { q: params.q, limit: params.limit ?? 10 }
    });
    const result = response.data?.data || [];
    return {
        success: true,
        message: response.data?.message || '',
        timestamp: response.data?.timestamp || new Date().toISOString(),
        data: result.map((user: any) => ({
            ...user,
            phone: user.phoneNumber || user.phone,
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email,
            avatar: user.avatarUrl || user.avatar,
            status: user.status ? user.status.toUpperCase() : 'PENDING'
        }))
    };
};
