import { apiApp } from "../../api";

const BASE_URL = "/permissions/roles";

export const getRoles = async () => {
    const response = await apiApp.get(BASE_URL);
    return response.data;
};

export const getPermissions = async () => {
    const response = await apiApp.get("/permissions");
    return response.data;
};

export const updateRolePermissions = async (roleId: string, permissionCodes: string[]) => {
    // Path simplified to /permissions/roles/{roleId}
    const response = await apiApp.patch(`${BASE_URL}/${roleId}`, permissionCodes);
    return response.data;
};

// ... giữ lại các hàm khác nếu cần, hoặc refactor theo API mới
export const deleteRole = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`);
    return response.data;
};

// Placeholder exports to fix Frontend crash - To be implemented when needed
export const getRoleById = async (id: string) => {
    console.warn("getRoleById not implemented", id);
    return { data: null };
};

export const createRole = async (data: any) => {
    console.warn("createRole not implemented", data);
    return { data: null };
};

export const updateRole = async (id: string, data: any) => {
    console.warn("updateRole not implemented", id, data);
    return { data: null };
};

export const reorderPermissions = async (positionMap: Record<string, number>) => {
    const response = await apiApp.patch('/permissions/reorder', positionMap);
    return response.data;
};
