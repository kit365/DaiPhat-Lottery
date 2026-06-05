import { apiApp } from "../../api";
import { ApiResponse, PageResponse, BaseQueryParams } from "../config/type";
import { User } from "../../types/user.type";

const BASE_URL = "/users";

const normalizeUser = (user: any): User => ({
    ...user,
    phone: user?.phoneNumber || user?.phone,
    fullName: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || user?.email,
    avatar: user?.avatarUrl || user?.avatar,
    status: user?.status ? user.status.toUpperCase() : 'PENDING'
});

const normalizeAccountPayload = (data: any) => {
    const { roles, ...payload } = data || {};
    const roleCode = payload.roleCode || (Array.isArray(roles) ? roles[0] : roles);

    return {
        ...payload,
        ...(roleCode ? { roleCode } : {})
    };
};

export const getAccounts = async (params?: BaseQueryParams): Promise<ApiResponse<PageResponse<User>>> => {
    const response = await apiApp.get(BASE_URL, { params });
    const result = response.data?.data;
    
    // Map records to match FE expectations (fullName, rolesName, avatar, status)
    const recordList = (result?.recordList || []).map((user: User) => ({
        ...normalizeUser(user),
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
            ...normalizeUser(user),
        }
    };
};

export const createAccount = async (data: any): Promise<ApiResponse<User>> => {
    const response = await apiApp.post(BASE_URL, normalizeAccountPayload(data));
    return response.data;
};

export const updateAccount = async (id: string, data: any): Promise<ApiResponse<void>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, normalizeAccountPayload(data));
    return response.data;
};

export const initiateAccountPasswordReset = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.post(`/auth/${id}/reset-password/initiate`);
    return response.data;
};

export const confirmAccountPasswordReset = async (id: string, otp: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.post(`/auth/${id}/reset-password/confirm`, { otp });
    return response.data;
};

export const changeAccountPassword = initiateAccountPasswordReset;

export const uploadAccountAvatar = async (id: string, file: File): Promise<ApiResponse<User>> => {
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

export const deleteAccountAvatar = async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiApp.delete<ApiResponse<User>>(`${BASE_URL}/${id}/avatar`);
    return {
        ...response.data,
        data: normalizeUser(response.data?.data)
    };
};

export const deleteAccount = async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};
