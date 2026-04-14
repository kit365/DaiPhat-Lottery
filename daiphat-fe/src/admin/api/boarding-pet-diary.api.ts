import { apiApp } from "../../api";
import Cookies from "js-cookie";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
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
