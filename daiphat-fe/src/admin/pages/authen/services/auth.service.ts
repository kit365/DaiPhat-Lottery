import { apiApp } from "../../../../api";
import { LoginFormValues } from "../../../schemas/login.schema";
import { LoginResponse, GetMeResponse } from "../types/auth.type";

const API_AUTH = "/auth";

export const authService = {
    login: async (data: LoginFormValues): Promise<LoginResponse> => {
        const response = await apiApp.post<LoginResponse>(`${API_AUTH}/login`, data);
        return response.data;
    },

    logout: async (): Promise<{ code: number; message: string }> => {
        const response = await apiApp.post<{ code: number; message: string }>(`${API_AUTH}/logout`);
        return response.data;
    },

    getPasswordPolicy: async (): Promise<{ data: any }> => {
        const response = await apiApp.get<{ data: any }>(`${API_AUTH}/password-policy`);
        return response.data;
    },

    getMe: async (): Promise<GetMeResponse> => {
        const response = await apiApp.get<GetMeResponse>("/users/me");
        return response.data;
    }
};
