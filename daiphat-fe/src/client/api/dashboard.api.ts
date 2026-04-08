import { apiApp } from "../../api/index";

const API_DASHBOARD = "/api/v1/client/dashboard";

export const editProfile = async (data: any) => {
    try {
        const response = await apiApp.patch(`${API_DASHBOARD}/profile/edit`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getAddresses = async () => {
    try {
        const response = await apiApp.get(`${API_DASHBOARD}/address`);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const createAddress = async (data: any) => {
    try {
        const response = await apiApp.post(`${API_DASHBOARD}/address/create`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getAddressDetail = async (id: string) => {
    try {
        const response = await apiApp.get(`${API_DASHBOARD}/address/detail/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const updateAddress = async (id: string, data: any) => {
    try {
        const response = await apiApp.patch(`${API_DASHBOARD}/address/edit/${id}`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const deleteAddress = async (id: string) => {
    try {
        const response = await apiApp.delete(`${API_DASHBOARD}/address/delete/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const changeDefaultAddress = async (id: string) => {
    try {
        const response = await apiApp.patch(`${API_DASHBOARD}/address/change-default/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const changePassword = async (data: any) => {
    try {
        const response = await apiApp.patch(`${API_DASHBOARD}/change-password`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const changeAvatar = async (data: any) => {
    try {
        const response = await apiApp.patch(`${API_DASHBOARD}/profile/change-avatar`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getOrderList = async () => {
    try {
        const response = await apiApp.get(`${API_DASHBOARD}/order/list`);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getOrderDetail = async (id: string) => {
    try {
        const response = await apiApp.get(`${API_DASHBOARD}/order/detail/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getBoardingBookingList = async () => {
    try {
        const response = await apiApp.get("/api/v1/client/boarding/boarding-bookings");
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getBoardingBookingDetail = async (id: string) => {
    try {
        const response = await apiApp.get(`/api/v1/client/boarding/boarding-bookings/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};
export const checkBoardingPaymentStatus = async (id: string) => {
    try {
        const response = await apiApp.get(`/api/v1/client/boarding/boarding-bookings/${id}/check-payment`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getDashboardOverview = async () => {
    try {
        const response = await apiApp.get(`${API_DASHBOARD}/overview`);
        return response.data;
    } catch (error) {
        throw error;
    }
};
