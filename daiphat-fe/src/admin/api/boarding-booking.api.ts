import { apiApp } from "../../api";
import Cookies from "js-cookie";

const BASE_URL = "/api/v1/admin/boarding-ticketServiceOrder";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getBusyUserTicketIdsForRange = async (params: { userId: string; checkInDate: string; checkOutDate: string }) => {
    const response = await apiApp.get(`${BASE_URL}/busy-userTickets`, { ...withAuth(), params });
    return response.data;
};

export const getBoardingTicketServiceOrders = async (params?: any) => {
    const response = await apiApp.get(BASE_URL, { ...withAuth(), params });
    return response.data;
};

export const createBoardingTicketServiceOrder = async (payload: any) => {
    const response = await apiApp.post(`${BASE_URL}/create`, payload, withAuth());
    return response.data;
};

export const batchCreateBoardingTicketServiceOrder = async (payload: any) => {
    const response = await apiApp.post(`${BASE_URL}/batch-create`, payload, withAuth());
    return response.data;
};

export const getBoardingTicketServiceOrderDetail = async (id: string) => {
    const response = await apiApp.get(`${BASE_URL}/${id}`, withAuth());
    return response.data;
};

export const getBoardingHotelStaffs = async (date?: string) => {
    const response = await apiApp.get(`${BASE_URL}/hotel-staffs`, {
        ...withAuth(),
        params: date ? { date } : undefined,
    });
    return response.data;
};

export const updateBoardingTicketServiceOrderStatus = async (id: string, boardingStatus: string) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/status`, { boardingStatus }, withAuth());
    return response.data;
};

export const updateBoardingPaymentStatus = async (id: string, paymentStatus: string) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/payment-status`, { paymentStatus }, withAuth());
    return response.data;
};

export const updateBoardingTicketServiceOrderDetail = async (id: string, data: any) => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, data, withAuth());
    return response.data;
};

export interface BoardingProofMediaItem {
    url: string;
    kind?: "image" | "video";
}

export interface BoardingFeedingItem {
    _id?: string;
    time?: string;
    food?: string;
    amount?: string;
    note?: string;
    proofMedia?: BoardingProofMediaItem[];
    staffId?: string | { _id?: string; fullName?: string } | null;
    staffName?: string;
    status?: "pending" | "done" | "skipped";
    userTicketType?: "dog" | "cat" | "all";
    userTicketId?: string;
    userTicketName?: string;
    doneAt?: string | null;
}

export interface BoardingExerciseItem {
    _id?: string;
    time?: string;
    activity?: string;
    durationMinutes?: number;
    note?: string;
    proofMedia?: BoardingProofMediaItem[];
    staffId?: string | { _id?: string; fullName?: string } | null;
    staffName?: string;
    status?: "pending" | "done" | "skipped";
    userTicketType?: "dog" | "cat" | "all";
    userTicketId?: string;
    userTicketName?: string;
    doneAt?: string | null;
}

export interface BoardingBelongingItem {
    _id?: string;
    name: string;
    description?: string;
    quantity?: number;
    status: "received" | "returned";
    images?: string[];
    receivedAt?: string;
    returnedAt?: string;
}

export const updateBoardingCareSchedule = async (
    id: string,
    payload: {
        feedingSchedule?: BoardingFeedingItem[];
        exerciseSchedule?: BoardingExerciseItem[];
        belongings?: BoardingBelongingItem[];
        careDate?: string;
        resetTemplate?: boolean;
    }
) => {
    const response = await apiApp.patch(`${BASE_URL}/${id}/care-schedule`, payload, withAuth());
    return response.data;
};

export const checkBoardingAvailability = async (checkInDate: string, checkOutDate: string) => {
    const response = await apiApp.get(`${BASE_URL}/availability`, {
        params: { checkInDate, checkOutDate },
        ...withAuth()
    });
    return response.data;
};
