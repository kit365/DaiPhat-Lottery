import Cookies from "js-cookie";
import { apiApp } from "../../api/index";

const BASE_URL = "/api/v1/admin/shifts";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
    };
};

export const getShifts = async (params?: any) => {
    const list = [
        { _id: "SH1", name: "Ca sáng", startTime: "08:00", endTime: "12:00" },
        { _id: "SH2", name: "Ca chiều", startTime: "13:00", endTime: "17:00" },
        { _id: "SH3", name: "Ca tối", startTime: "18:00", endTime: "22:00" }
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

export const getShiftDetail = async (id: string) => {
    return {
        success: true,
        data: { _id: id, name: "Ca sáng", startTime: "08:00", endTime: "12:00" }
    };
};


export const createShift = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}`, data, withAuth());
    return response.data;
};

export const updateShift = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}`, data, withAuth());
    return response.data;
};

export const deleteShift = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};
