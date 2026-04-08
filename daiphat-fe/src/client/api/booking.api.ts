import { apiApp } from "../../api/index";

const API_BOOKING = "/api/v1/client/booking";

export const getAvailableTimeSlots = async (date: string, serviceId?: string, count: number = 1, petIds: string[] = []) => {
    try {
        const response = await apiApp.get(`${API_BOOKING}/time-slots`, {
            params: { date, serviceId, count, petIds: petIds.join(",") }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getBookingConfig = async () => {
    try {
        const response = await apiApp.get(`${API_BOOKING}/config`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const createBooking = async (data: any) => {
    try {
        const response = await apiApp.post(`${API_BOOKING}/bookings`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getMyBookings = async () => {
    try {
        const response = await apiApp.get(`${API_BOOKING}/bookings`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getMyBooking = async (id: string) => {
    try {
        const response = await apiApp.get(`${API_BOOKING}/bookings/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateBooking = async (id: string, data: any) => {
    try {
        const response = await apiApp.patch(`${API_BOOKING}/bookings/${id}`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const exportBookingPdf = async (bookingCode: string, phone: string) => {
    try {
        const response = await apiApp.get(`${API_BOOKING}/export-pdf`, {
            params: { bookingCode, phone },
            responseType: 'blob'
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const cancelBooking = async (id: string, reason?: string) => {
    try {
        const response = await apiApp.patch(`${API_BOOKING}/bookings/${id}/cancel`, { reason });
        return response.data;
    } catch (error) {
        throw error;
    }
};
