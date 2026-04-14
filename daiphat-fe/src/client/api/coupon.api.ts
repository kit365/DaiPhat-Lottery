import { apiApp } from "../../api/index";

export const getClientCoupons = async () => {
    try {
        const response = await apiApp.get("/client/coupon/list");
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const checkCoupon = async (data: { code: string, orderValue: number }) => {
    try {
        const response = await apiApp.post("/client/coupon/check", data);
        return response.data;
    } catch (error) {
        throw error;
    }
};
