import { apiApp } from "../../api";

export const getReviewsByProduct = async (productId: string) => {
    const response = await apiApp.get(`/api/v1/client/review/${productId}`);
    return response.data;
};

export const createReview = async (data: any) => {
    const response = await apiApp.post("/api/v1/client/review/create", data);
    return response.data;
};

export const updateReview = async (id: string, data: any) => {
    const response = await apiApp.patch(`/api/v1/client/review/update/${id}`, data);
    return response.data;
};

export const getMyReviews = async () => {
    const response = await apiApp.get("/api/v1/client/review/my-reviews");
    return response.data;
};
