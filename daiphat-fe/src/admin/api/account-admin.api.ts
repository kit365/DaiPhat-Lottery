import { apiApp } from "../../api";
import Cookies from "js-cookie";

const BASE_URL = "/api/v1/admin/account-admin";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

import { mockAdmins } from '../data/users';

export const getAccounts = async (params?: any) => {
    return {
        success: true,
        data: {
            recordList: mockAdmins,
            pagination: {
                totalRecords: mockAdmins.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: mockAdmins.length,
                active: mockAdmins.filter(a => a.status === 'active').length,
                inactive: mockAdmins.filter(a => a.status === 'inactive').length,
            }
        }
    };
};




export const getStaffByTicketService = async (ticketServiceId: string) => {
    const response = await apiApp.get(`${BASE_URL}/staff-by-ticketService`, { ...withAuth(), params: { ticketServiceId } });
    return response.data;
};

export const getAccountById = async (id: string) => {
    const admin = mockAdmins.find(a => a._id === id) || mockAdmins[0];
    return {
        success: true,
        data: admin
    };
};


export const createAccount = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

export const updateAccount = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, data, withAuth());
    return response.data;
};

export const changeAccountPassword = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/change-password/${id}`, data, withAuth());
    return response.data;
};

export const deleteAccount = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/delete/${id}`, withAuth());
    return response.data;
};
