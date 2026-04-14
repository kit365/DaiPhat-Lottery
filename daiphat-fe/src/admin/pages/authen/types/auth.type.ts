import { User } from "../../../../types/user.type";

export interface AuthApiResponse<T> {
    code: string;
    isSuccess: boolean;
    success?: boolean;
    message: string;
    data?: T;
}

export interface LoginResponse {
    code: string;
    isSuccess: boolean;
    success: boolean;
    message: string;
    data?: {
        access_token: string;
        expires_in?: number;
        // refresh_token được BE set vào HttpOnly Cookie, không có trong JSON body
        token_type?: string;
        scope?: string;
        user: User;
    };
}

export interface GetMeResponse extends AuthApiResponse<User> {}

export interface PasswordRequirement {
    id: string;
    description: string;
    regex: string;
}

export interface PasswordPolicy {
    requirements: PasswordRequirement[];
    minLength: number;
    maxLength: number;
}

export interface PasswordPolicyResponse extends AuthApiResponse<PasswordPolicy> {}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ForgotPasswordResponse extends AuthApiResponse<{
    email: string;
    expiresIn: number;
    retryAfter: number;
}> {}

export interface VerifyOtpRequest {
    email: string;
    otp: string;
}

export interface VerifyOtpResponse extends AuthApiResponse<{
    resetToken: string;
}> {}

export interface ResetPasswordRequest {
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
}
