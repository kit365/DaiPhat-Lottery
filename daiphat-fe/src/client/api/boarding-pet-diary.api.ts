import { apiApp } from "../../api";

export const getClientBoardingPetDiaries = async (bookingId: string) => {
    const response = await apiApp.get('/api/v1/client/boarding-pet-diary', {
        params: { bookingId }
    });
    return response.data;
};
