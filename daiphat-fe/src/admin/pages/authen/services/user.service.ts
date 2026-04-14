import { apiApp } from "../../../../api";
import { GetMeResponse } from "../types/auth.type";

export const userService = {
    getMe: async (): Promise<GetMeResponse> => {
        const response = await apiApp.get<GetMeResponse>("/users/me");
        return response.data;
    },
};
