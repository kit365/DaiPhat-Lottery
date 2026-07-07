import { apiApp } from "../../api";
import { ApiResponse, PaginatedResponse } from "../config/type";
import { RoleResponse, PermissionResponse, CreateRoleRequest, UpdateRoleRequest } from "../../types/role.type";

const BASE_URL = "/permissions/roles";

export const getRoles = async (params?: any): Promise<ApiResponse<PaginatedResponse<RoleResponse>>> => {
    const response = await apiApp.get(BASE_URL, { params });
    // Map id to _id for table rendering compatibility if needed
    if (response.data && response.data.data && response.data.data.recordList) {
        response.data.data.recordList = response.data.data.recordList.map((item: any) => ({
            ...item,
            _id: item.id
        }));
    }
    return response.data;
};

export const getPermissions = async (): Promise<ApiResponse<PermissionResponse[]>> => {
    const response = await apiApp.get("/permissions");
    return response.data;
};

export const updateRolePermissions = async (roleId: string | number, permissionCodes: string[]): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch(`${BASE_URL}/${roleId}`, permissionCodes);
    return response.data;
};

export const deleteRole = async (id: string | number): Promise<ApiResponse<any>> => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};

export const getRoleById = async (id: string | number): Promise<ApiResponse<RoleResponse>> => {
    const response = await apiApp.get(BASE_URL);
    const roles = response.data?.data || [];
    const role = Array.isArray(roles) ? roles.find((item: any) => String(item.id || item._id) === String(id)) : null;
    return { ...response.data, data: role || null };
};

export const createRole = async (data: CreateRoleRequest): Promise<ApiResponse<RoleResponse>> => {
    // console.warn("createRole not implemented", data);
    const response = await apiApp.post(BASE_URL, data);
    return response.data;
};

export const updateRole = async (id: string | number, data: UpdateRoleRequest): Promise<ApiResponse<RoleResponse>> => {
    // console.warn("updateRole not implemented", id, data);
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const reorderPermissions = async (positionMap: Record<string, number>): Promise<ApiResponse<any>> => {
    const response = await apiApp.patch('/permissions/reorder', positionMap);
    return response.data;
};
