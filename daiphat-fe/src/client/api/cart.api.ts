import { apiApp } from "../../api/index";

const API_CART = "/api/v1/client/cart";

export const getCartDetails = async (cartItems: any[], userAddress?: any) => {
    try {
        const response = await apiApp.post(`${API_CART}/list`, {
            cart: cartItems,
            userAddress: userAddress
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
