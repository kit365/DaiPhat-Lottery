export interface User {
    id: string;
    fullName: string;
    email: string;
    avatar?: string;
    permissions?: string[];
    roles?: any[];
}

export interface LoginResponse {
    code: number;
    message: string;
    data?: {
        id: string;
        fullName: string;
        email: string;
        token: string;
        avatar?: string;
        permissions: string[];
        roles?: any[];
    };
}

export interface GetMeResponse {
    code: number;
    message: string;
    data?: User;
}
