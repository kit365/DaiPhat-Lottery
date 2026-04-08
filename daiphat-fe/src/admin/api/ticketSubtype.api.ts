import axios from "axios";

const API_URL = "http://localhost:3000/api/v1/admin/ticketSubtype";

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
    const response = await axios.post(`${API_URL}/create`, data, {
        withCredentials: true
    });
    return response.data;
};

export const updateTicketSubtype = async (id: string, data: any) => {
    const response = await axios.patch(`${API_URL}/${id}`, data, {
        withCredentials: true
    });
    return response.data;
};

export const deleteTicketSubtype = async (id: string) => {
    const response = await axios.delete(`${API_URL}/${id}`, {
        withCredentials: true
    });
    return response.data;
};
