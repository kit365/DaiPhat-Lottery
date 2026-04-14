import { apiApp } from "../../api";
import Cookies from "js-cookie";

const BASE_URL = "/admin/boarding-config";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getBoardingConfig = async () => {
    const response = await apiApp.get(BASE_URL, withAuth());
    return response.data;
};

export const updateBoardingConfig = async (data: any) => {
    const response = await apiApp.patch(BASE_URL, data, withAuth());
    return response.data;
};
