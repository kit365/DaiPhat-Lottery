import { apiApp } from "../../api";

const API_TICKET_SUBTYPE = "/admin/ticketSubtype";

export const getTicketSubtypes = async (params?: any) => {
    const list = [
        { _id: "BR1", name: "Poodle", type: "dog" },
        { _id: "BR2", name: "Corgi", type: "dog" },
        { _id: "BR3", name: "Mèo Anh Lông Ngắn", type: "cat" },
        { _id: "BR4", name: "Golden Retriever", type: "dog" }
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

export const createTicketSubtype = async (data: { name: string, type: string }) => {
    const response = await apiApp.post(`${API_TICKET_SUBTYPE}/create`, data);
    return response.data;
};

export const updateTicketSubtype = async (id: string, data: any) => {
    const response = await apiApp.patch(`${API_TICKET_SUBTYPE}/${id}`, data);
    return response.data;
};

export const deleteTicketSubtype = async (id: string) => {
    const response = await apiApp.delete(`${API_TICKET_SUBTYPE}/${id}`);
    return response.data;
};
