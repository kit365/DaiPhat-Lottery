import { apiApp } from "../../../../api";
import { LoginFormValues } from "../../../schemas/login.schema";
import { LoginResponse, GetMeResponse, ForgotPasswordRequest, VerifyOtpRequest, ResetPasswordRequest } from "../types/auth.type";

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

    getPasswordPolicy: async (): Promise<PasswordPolicyResponse> => {
        const response = await apiApp.get<PasswordPolicyResponse>(`${API_AUTH}/password-policy`);
        return response.data;
    },

    getMe: async (): Promise<GetMeResponse> => {
        const response = await apiApp.get<GetMeResponse>("/users/me");
        return response.data;
    },

    forgotPasswordRequest: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
        const response = await apiApp.post<ForgotPasswordResponse>(`${API_AUTH}/forgot-password/request`, data);
        return response.data;
    },

    verifyResetOtp: async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
        const response = await apiApp.post<VerifyOtpResponse>(`${API_AUTH}/forgot-password/verify`, data);
        return response.data;
    },

    resetPassword: async (data: ResetPasswordRequest): Promise<AuthApiResponse<any>> => {
        const response = await apiApp.post<AuthApiResponse<any>>(`${API_AUTH}/forgot-password/reset`, data);
        return response.data;
    }
};
