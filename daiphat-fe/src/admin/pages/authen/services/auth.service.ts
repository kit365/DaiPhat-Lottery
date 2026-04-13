import { apiApp } from "../../../../api";
import { LoginFormValues } from "../../../schemas/login.schema";
import { LoginResponse, GetMeResponse } from "../types/auth.type";

export const authService = {
    login: async (data: LoginFormValues): Promise<LoginResponse> => {
        const response = await apiApp.post<LoginResponse>("/api/v1/auth/login", data);
        return response.data;
    },

    getMe: async (): Promise<GetMeResponse> => {
        const response = await apiApp.get<GetMeResponse>("/api/v1/auth/me");
        return response.data;
    },

    logout: async (): Promise<{ code: number; message: string }> => {
        const response = await apiApp.post<{ code: number; message: string }>("/api/v1/auth/logout");
        return response.data;
    }
};
