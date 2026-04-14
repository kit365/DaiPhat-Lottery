import { apiApp } from "../../api";

export const getReviewsByProduct = async (productId: string) => {
    const response = await apiApp.get(`/client/review/${productId}`);
    return response.data;
};

export const createReview = async (data: any) => {
    const response = await apiApp.post("/client/review/create", data);
    return response.data;
};

export const updateReview = async (id: string, data: any) => {
    const response = await apiApp.patch(`/client/review/update/${id}`, data);
    return response.data;
};

export const getMyReviews = async () => {
    const response = await apiApp.get("/client/review/my-reviews");
    return response.data;
};
