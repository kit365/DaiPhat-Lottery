import { apiApp } from "../../../../api";
import { ApiResponse, PageResponse } from "../../../config/type";
import { User } from "../../../../types/user.type";
import { UserQueryParams, CreateUserRequest, UpdateUserRequest } from "../types/user.types";

const BASE_URL = "/users";

const normalizeUser = (user: any): User => ({
    ...user,
    phone: user?.phoneNumber || user?.phone,
    fullName: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || user?.email,
    avatar: user?.avatarUrl || user?.avatar,
    status: user?.status ? user.status.toUpperCase() : 'PENDING'
});

const normalizeAccountPayload = (data: CreateUserRequest | UpdateUserRequest) => {
    const { roles, ...payload } = data || {};
    const roleCode = payload.roleCode || (Array.isArray(roles) ? roles[0] : roles);

    return {
        ...payload,
        ...(roleCode ? { roleCode } : {})
    };
};

export const getUsers = async (params?: UserQueryParams): Promise<ApiResponse<PageResponse<User>>> => {
    const response = await apiApp.get(BASE_URL, {
        params,
        paramsSerializer: { indexes: null },
    });
    const result = response.data?.data;
    
    const recordList = (result?.recordList || []).map((user: Partial<User>) => ({
        ...normalizeUser(user) as User,
        rolesName: user.role ? [user.role.name] : [],
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
                all: statusCounts.all ?? result?.pagination?.totalRecords ?? recordList.length,
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
        data: (response.data?.data || []).map((user: Partial<User>) => normalizeUser(user))
    };
};

export const getUserById = async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiApp.get(`${BASE_URL}/${id}`);
    const user = response.data?.data || response.data;
    return {
        success: true,
        message: response.data?.message || "",
        timestamp: response.data?.timestamp || new Date().toISOString(),
        data: normalizeUser(user) as User
    };
};

export const createUser = async (data: CreateUserRequest): Promise<ApiResponse<User>> => {
    const response = await apiApp.post(BASE_URL, normalizeAccountPayload(data));
    return response.data;
};

export const updateUser = async (id: string, data: UpdateUserRequest): Promise<ApiResponse<void>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, normalizeAccountPayload(data));
    return response.data;
};

export const initiateUserPasswordReset = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.post(`/auth/${id}/reset-password/initiate`);
    return response.data;
};

export const confirmUserPasswordReset = async (id: string, otp: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.post(`/auth/${id}/reset-password/confirm`, { otp });
    return response.data;
};

export const changeUserPassword = initiateUserPasswordReset;

export const uploadUserAvatar = async (id: string, file: File): Promise<ApiResponse<User>> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiApp.post<ApiResponse<User>>(`${BASE_URL}/${id}/avatar`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return {
        ...response.data,
        data: normalizeUser(response.data?.data)
    };
};

export const deleteUserAvatar = async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiApp.delete<ApiResponse<User>>(`${BASE_URL}/${id}/avatar`);
    return {
        ...response.data,
        data: normalizeUser(response.data?.data)
    };
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

export const searchCustomers = async (params: { q: string; limit?: number }): Promise<ApiResponse<User[]>> => {
    const response = await apiApp.get(`${BASE_URL}/customers/search`, {
        params: { q: params.q, limit: params.limit ?? 10 }
    });
    const result = response.data?.data || [];
    return {
        success: true,
        message: response.data?.message || '',
        timestamp: response.data?.timestamp || new Date().toISOString(),
        data: result.map((user: Partial<User>) => normalizeUser(user))
    };
};
