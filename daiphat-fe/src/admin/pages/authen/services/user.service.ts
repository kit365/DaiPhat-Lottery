import { apiApp } from "../../../../api";
import { GetMeResponse, SetupProfileResponse } from "../types/auth.type";

export const userService = {
    getMe: async (): Promise<GetMeResponse> => {
        const response = await apiApp.get<GetMeResponse>("/users/me");
        return response.data;
    },
    setupProfile: async (data: any): Promise<SetupProfileResponse> => {
        const response = await apiApp.post<SetupProfileResponse>("/users/setup-profile", data);
        return response.data;
    },
};
