import { apiApp } from "../../api";
import Cookies from "js-cookie";

const BASE_URL = "/api/v1/admin/account-user";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

import { mockUsers } from '../data/users';

export const getUsers = async (params?: any) => {
    return {
        success: true,
        data: {
            recordList: mockUsers,
            pagination: {
                totalRecords: mockUsers.length,
                totalPages: 1,
                currentPage: params?.page || 1,
                limit: params?.limit || 10
            },
            statusCounts: {
                all: mockUsers.length,
                active: mockUsers.filter(u => u.status === 'active').length,
                inactive: mockUsers.filter(u => u.status === 'inactive').length,
            }
        }
    };
};




export const getUserById = async (id: string) => {
    const userItem = mockUsers.find(u => u._id === id) || mockUsers[0];
    return {
        success: true,
        data: userItem
    };
};


export const createUser = async (data: any) => {
    const response = await apiApp.post(`${BASE_URL}/create`, data, withAuth());
    return response.data;
};

export const updateUser = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/edit/${id}`, data, withAuth());
    return response.data;
};

export const changeUserPassword = async (id: string, data: any) => {
    const response = await apiApp.patch(`${BASE_URL}/change-password/${id}`, data, withAuth());
    return response.data;
};

export const deleteUser = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/delete/${id}`, withAuth());
    return response.data;
};
export const getUserAddresses = async (userId: string) => {
    const response = await apiApp.get(`${BASE_URL}/address/${userId}`, withAuth());
    return response.data;
};

export const deleteUserAddress = async (id: string) => {
    const response = await apiApp.delete(`${BASE_URL}/address/delete/${id}`, withAuth());
    return response.data;
};

export const setUserAddressDefault = async (id: string) => {
    const response = await apiApp.patch(`${BASE_URL}/address/set-default/${id}`, {}, withAuth());
    return response.data;
};
