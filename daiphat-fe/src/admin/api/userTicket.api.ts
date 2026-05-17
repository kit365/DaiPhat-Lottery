import { apiApp } from "../../api";
import Cookies from "js-cookie";
import { STORAGE_KEYS } from "../../constants/storage.constants";

const BASE_URL = "/admin/userTicket";

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getUserTickets = async (params?: any) => {
    const list = [
        { _id: "P1", name: "Vé kiến thiết", type: "cat", ticketSubtype: "Đài 1", quantity: 10, age: 0, gender: "none", ownerName: "Nguyễn Văn A", avatar: "" },
        { _id: "P2", name: "Vé Vietlott", type: "dog", ticketSubtype: "Mega 6/45", quantity: 5, age: 0, gender: "none", ownerName: "Trần Thị B", avatar: "" }
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



export const getUserTicketById = async (id: string) => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

export const createUserTicket = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

export const updateUserTicket = async (id: string, data: any) => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, data, withAuth());
    return response.data;
};

export const deleteUserTicket = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};
