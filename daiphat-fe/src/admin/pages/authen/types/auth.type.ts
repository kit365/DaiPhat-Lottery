import { User } from "../../../../types/user.type";

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

export interface GetMeResponse {
    code: string;
    isSuccess: boolean;
    message: string;
    data?: User;
}

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

export interface PasswordPolicyResponse {
    code: string;
    isSuccess: boolean;
    message: string;
    data: PasswordPolicy;
}
