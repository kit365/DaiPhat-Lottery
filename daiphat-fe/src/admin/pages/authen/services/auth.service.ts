import { apiApp } from "../../../../api";
import { LoginFormValues } from "../../../schemas/login.schema";
import { LoginResponse, GetMeResponse, ForgotPasswordRequest, VerifyOtpRequest, ResetPasswordRequest, ChangePasswordRequest, PasswordPolicyResponse, ForgotPasswordResponse, VerifyOtpResponse, RegisterResponse, ResendVerificationResponse, LogoutResponse, VerifyEmailResponse, RegisterRequest, GoogleTokenResponse } from "../types/auth.type";
import { ApiResponse } from "../../../../types/api.type";
import { AUTH_ENDPOINTS, USER_ENDPOINTS } from "./auth.endpoints";

const normalizeAuthResponse = <T extends ApiResponse<any>>(response: T): T => {
    const normalized = response as any;
    normalized.isSuccess = normalized.isSuccess ?? normalized.success;
    normalized.success = normalized.success ?? normalized.isSuccess;

    if (normalized.data) {
        normalized.data.access_token = normalized.data.access_token ?? normalized.data.accessToken;
        normalized.data.expires_in = normalized.data.expires_in ?? normalized.data.expiresIn;
        normalized.data.refresh_token = normalized.data.refresh_token ?? normalized.data.refreshToken;
        normalized.data.token_type = normalized.data.token_type ?? normalized.data.tokenType;
    }

    return normalized;
};

export const authService = {
    login: async (data: LoginFormValues & { rememberMe?: boolean }): Promise<LoginResponse> => {
        const response = await apiApp.post<LoginResponse>(AUTH_ENDPOINTS.login, data, {
            skipGlobalErrorToast: true,
        } as any);
        return normalizeAuthResponse(response.data);
    },

    register: async (data: RegisterRequest): Promise<RegisterResponse> => {
        const response = await apiApp.post<RegisterResponse>(AUTH_ENDPOINTS.register, data);
        return normalizeAuthResponse(response.data);
    },

    resendVerification: async (identifier: string): Promise<ResendVerificationResponse> => {
        const response = await apiApp.post<ResendVerificationResponse>(AUTH_ENDPOINTS.resendVerification, null, {
            params: { email: identifier }
        });
        return normalizeAuthResponse(response.data);
    },

    logout: async (): Promise<LogoutResponse> => {
        const response = await apiApp.post<LogoutResponse>(AUTH_ENDPOINTS.logout);
        return normalizeAuthResponse(response.data);
    },

    changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<void>> => {
        const response = await apiApp.post<ApiResponse<void>>(AUTH_ENDPOINTS.changePassword, data);
        return normalizeAuthResponse(response.data);
    },

    getPasswordPolicy: async (): Promise<PasswordPolicyResponse> => {
        const response = await apiApp.get<PasswordPolicyResponse>(AUTH_ENDPOINTS.passwordPolicy);
        return normalizeAuthResponse(response.data);
    },

    getMe: async (accessToken?: string): Promise<GetMeResponse> => {
        const response = await apiApp.get<GetMeResponse>(USER_ENDPOINTS.currentUser, {
            ...(accessToken
                ? { headers: { Authorization: `Bearer ${accessToken}` }, skipGlobalErrorToast: true }
                : {}),
        } as any);
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
        return normalizeAuthResponse(response.data);
    },

    forgotPasswordRequest: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
        const response = await apiApp.post<ForgotPasswordResponse>(AUTH_ENDPOINTS.forgotPasswordRequest, data);
        return normalizeAuthResponse(response.data);
    },

    verifyResetOtp: async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
        const response = await apiApp.post<VerifyOtpResponse>(AUTH_ENDPOINTS.forgotPasswordVerify, data);
        return normalizeAuthResponse(response.data);
    },

    resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse<any>> => {
        const response = await apiApp.post<ApiResponse<any>>(AUTH_ENDPOINTS.forgotPasswordReset, data);
        return normalizeAuthResponse(response.data);
    },

    exchangeGoogleToken: async (code: string, redirectUri: string, codeVerifier?: string): Promise<GoogleTokenResponse> => {
        const response = await apiApp.post<LoginResponse>(AUTH_ENDPOINTS.google, {
            code,
            redirectUri,
            codeVerifier,
        });

        const normalized = normalizeAuthResponse(response.data);
        return {
            access_token: normalized.data?.access_token ?? "",
            expires_in: normalized.data?.expires_in ?? 0,
            refresh_token: normalized.data?.refresh_token,
            token_type: normalized.data?.token_type ?? "Bearer",
        };
    },
    
    verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
        const response = await apiApp.get<VerifyEmailResponse>(AUTH_ENDPOINTS.verifyEmail, {
            params: { token }
        });
        return normalizeAuthResponse(response.data);
    }
};
