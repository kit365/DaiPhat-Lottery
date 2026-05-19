import { apiApp } from "../../../../api";
import { LoginFormValues } from "../../../schemas/login.schema";
import { LoginResponse, GetMeResponse, ForgotPasswordRequest, VerifyOtpRequest, ResetPasswordRequest, PasswordPolicyResponse, ForgotPasswordResponse, VerifyOtpResponse, RegisterResponse, LogoutResponse, VerifyEmailResponse, RegisterRequest, GoogleTokenResponse } from "../types/auth.type";
import { ApiResponse } from "../../../../types/api.type";

const API_AUTH = "/auth";

export const authService = {
    login: async (data: LoginFormValues & { rememberMe?: boolean }): Promise<LoginResponse> => {
        const response = await apiApp.post<LoginResponse>(`${API_AUTH}/login`, data);
        return response.data;
    },

    register: async (data: RegisterRequest): Promise<RegisterResponse> => {
        const response = await apiApp.post<RegisterResponse>(`${API_AUTH}/register`, data);
        return response.data;
    },

    logout: async (): Promise<LogoutResponse> => {
        const response = await apiApp.post<LogoutResponse>(`${API_AUTH}/logout`);
        return response.data;
    },

    getPasswordPolicy: async (): Promise<PasswordPolicyResponse> => {
        const response = await apiApp.get<PasswordPolicyResponse>(`${API_AUTH}/password-policy`);
        return response.data;
    },

    getMe: async (): Promise<GetMeResponse> => {
        const response = await apiApp.get<GetMeResponse>("/users/me");
        const user = response.data?.data || response.data;
        if (response.data && user) {
            response.data.data = {
                ...user,
                phone: user.phoneNumber || user.phone,
                fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email,
                avatar: user.avatarUrl || user.avatar,
                status: user.status ? user.status.toUpperCase() : 'PENDING'
            };
        }
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

    resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse<any>> => {
        const response = await apiApp.post<ApiResponse<any>>(`${API_AUTH}/forgot-password/reset`, data);
        return response.data;
    },

    exchangeGoogleToken: async (code: string, redirectUri: string, codeVerifier?: string): Promise<GoogleTokenResponse> => {
        const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL;
        const realm = import.meta.env.VITE_KEYCLOAK_REALM;
        const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
        const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

        const body = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            code,
            redirect_uri: redirectUri,
            ...(codeVerifier && { code_verifier: codeVerifier }),
        });

        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw error;
        }

        return response.json();
    },
    
    verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
        const response = await apiApp.get<VerifyEmailResponse>(`${API_AUTH}/verify-email`, {
            params: { token }
        });
        return response.data;
    },

    acceptInvite: async (token: string): Promise<ApiResponse<any>> => {
        const response = await apiApp.post<ApiResponse<any>>(`${API_AUTH}/invites/accept`, { token });
        return response.data;
    }
};
