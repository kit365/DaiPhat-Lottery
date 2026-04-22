import { apiApp } from "../../api";
import Cookies from "js-cookie";
import { STORAGE_KEYS } from "../../constants/storage.constants";

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getBoardingUserTicketDiaries = async (params: { ticketServiceOrderId?: string; userTicketId?: string; date?: string }) => {
    return apiApp.get('/admin/boarding-userTicket-diary', { ...withAuth(), params });
};

export const upsertBoardingUserTicketDiary = async (payload: any) => {
    return apiApp.post('/admin/boarding-userTicket-diary/upsert', payload, withAuth());
};
