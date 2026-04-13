import Cookies from "js-cookie";
import { apiApp } from "../../api/index";

const BASE_URL = "/api/v1/admin/departments";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
    };
};

export const getDepartments = async (params?: any) => {
    const list = [
        { _id: "D1", name: "Cửa hàng", description: "Bán lẻ phụ kiện, thức ăn" },
        { _id: "D2", name: "Dịch vụ Spa", description: "Cắt tỉa, tắm rửa" },
        { _id: "D3", name: "Phòng khám", description: "Thú y, tiêm phòng" }
    ];
    return {
        success: true,
        data: {
            recordList: list,
            pagination: {
                totalRecords: list.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            }
        }
    };
};



export const getDepartmentDetail = async (id: string) => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

export const createDepartment = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}`, data, withAuth());
    return response.data;
};

export const updateDepartment = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data, withAuth());
    return response.data;
};

export const deleteDepartment = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};
