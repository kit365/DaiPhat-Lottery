import { apiApp } from "../../api";

export const getClientBoardingPetDiaries = async (bookingId: string) => {
    const response = await apiApp.get('/client/boarding-pet-diary', {
        params: { bookingId }
    });
    return response.data;
};
