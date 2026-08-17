import { apiApp } from '@/api';
import type {
    LoginResponse,
    ForgotPasswordRequest,
    VerifyOtpRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    PasswordPolicyResponse,
    ForgotPasswordResponse,
    VerifyOtpResponse,
    RegisterResponse,
    ResendVerificationResponse,
    LogoutResponse,
    VerifyEmailResponse,
    RegisterRequest,
    GoogleTokenResponse,
    LoginRequest,
} from '../types/auth.type';
import type { ApiResponse } from '@/types/api.type';
import { AUTH_ENDPOINTS } from './auth.endpoints';
import { normalizeApiResponse } from '../utils/normalizeAuthResponse';

export const authService = {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await apiApp.post<LoginResponse>(AUTH_ENDPOINTS.login, data, {
            skipGlobalErrorToast: true,
        });
        return normalizeApiResponse(response.data);
    },

    register: async (data: RegisterRequest): Promise<RegisterResponse> => {
        const response = await apiApp.post<RegisterResponse>(AUTH_ENDPOINTS.register, data);
        return normalizeApiResponse(response.data);
    },

    resendVerification: async (identifier: string): Promise<ResendVerificationResponse> => {
        const response = await apiApp.post<ResendVerificationResponse>(AUTH_ENDPOINTS.resendVerification, null, {
            params: { email: identifier },
        });
        return normalizeApiResponse(response.data);
    },

    logout: async (): Promise<LogoutResponse> => {
        const response = await apiApp.post<LogoutResponse>(AUTH_ENDPOINTS.logout);
        return normalizeApiResponse(response.data);
    },

    changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<void>> => {
        const response = await apiApp.post<ApiResponse<void>>(AUTH_ENDPOINTS.changePassword, data);
        return normalizeApiResponse(response.data);
    },

    getPasswordPolicy: async (): Promise<PasswordPolicyResponse> => {
        const response = await apiApp.get<PasswordPolicyResponse>(AUTH_ENDPOINTS.passwordPolicy);
        return normalizeApiResponse(response.data);
    },

    forgotPasswordRequest: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
        const response = await apiApp.post<ForgotPasswordResponse>(AUTH_ENDPOINTS.forgotPasswordRequest, data);
        return normalizeApiResponse(response.data);
    },

    verifyResetOtp: async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
        const response = await apiApp.post<VerifyOtpResponse>(AUTH_ENDPOINTS.forgotPasswordVerify, data);
        return normalizeApiResponse(response.data);
    },

    resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse<unknown>> => {
        const response = await apiApp.post<ApiResponse<unknown>>(AUTH_ENDPOINTS.forgotPasswordReset, data);
        return normalizeApiResponse(response.data);
    },

    exchangeGoogleToken: async (
        code: string,
        redirectUri: string,
        codeVerifier?: string,
    ): Promise<GoogleTokenResponse> => {
        const response = await apiApp.post<LoginResponse>(AUTH_ENDPOINTS.google, {
            code,
            redirectUri,
            codeVerifier,
        });

        const normalized = normalizeApiResponse(response.data);
        return {
            access_token: normalized.data?.access_token ?? '',
            expires_in: normalized.data?.expires_in ?? 0,
            refresh_token: normalized.data?.refresh_token,
            token_type: normalized.data?.token_type ?? 'Bearer',
        };
    },

    verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
        const response = await apiApp.get<VerifyEmailResponse>(AUTH_ENDPOINTS.verifyEmail, {
            params: { token },
        });
        return normalizeApiResponse(response.data);
    },
};
