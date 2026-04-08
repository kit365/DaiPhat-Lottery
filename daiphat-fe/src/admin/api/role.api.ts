import { apiApp } from "../../api";
import Cookies from "js-cookie";

const BASE_URL = "/api/v1/admin/role";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getRoles = async (params?: any) => {
    return {
        success: true,
        data: [
            { _id: "R1", name: "Admin", slug: "admin", createdAt: new Date().toISOString() },
            { _id: "R2", name: "Staff", slug: "staff", createdAt: new Date().toISOString() }
        ]
    };
};


export const getRoleById = async (id: string) => {
    const response = await apiApp.get(`${BASE_URL}/detail/${id}`, withAuth());
    return response.data;
};

export const createRole = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

export const updateRole = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, data, withAuth());
    return response.data;
};

export const deleteRole = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/delete/${id}`, withAuth());
    return response.data;
};
