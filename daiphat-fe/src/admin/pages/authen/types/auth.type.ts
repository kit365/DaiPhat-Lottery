import { User } from "../../../../types/user.type";

export interface AuthApiResponse<T> {
    code: string;
    isSuccess: boolean;
    success?: boolean; // Optional, mapping to backend field if exists
    message: string;
    data?: T;
}

export interface LoginResponse extends AuthApiResponse<{
    access_token: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    user: User;
}> {}

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

export interface RegisterResponse extends AuthApiResponse<User> {}
export interface LogoutResponse extends AuthApiResponse<void> {}
export interface VerifyEmailResponse extends AuthApiResponse<any> {}
export interface SetupProfileResponse extends AuthApiResponse<User | any> {}
