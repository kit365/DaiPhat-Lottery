import { User } from "../../../../types/user.type";
import { ApiResponse } from "../../../../types/api.type";

export interface LoginResponse extends ApiResponse<{
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    user: User;
}> {}

export interface GetMeResponse extends ApiResponse<User> {}

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

export interface PasswordPolicyResponse extends ApiResponse<PasswordPolicy> {}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ForgotPasswordResponse extends ApiResponse<{
    email: string;
    expiresIn: number;
    retryAfter: number;
}> {}

export interface VerifyOtpRequest {
    email: string;
    otp: string;
}

export interface VerifyOtpResponse extends ApiResponse<{
    resetToken: string;
}> {}

export interface ResetPasswordRequest {
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
}

export interface RegisterResponse extends ApiResponse<User> {}
export interface LogoutResponse extends ApiResponse<void> {}
export interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    token_type: string;
    id_token?: string;
}

export interface SetupProfileResponse extends ApiResponse<User> {}

export interface RegisterRequest {
    username: string;
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    agreedToTerms: boolean;
}
