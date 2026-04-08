import { LoginFormValues } from "../schemas/login.schema";
import { apiApp } from "../../api";

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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const login = async (data: LoginFormValues): Promise<LoginResponse> => {
    await delay(500);
    return {
        code: 200,
        message: "Đăng nhập thành công (Mock Mode)",
        data: {
            id: "ADMIN001",
            fullName: "Admin Mockup",
            email: data.usernameOrEmail,
            token: "mock-token-" + Date.now(),
            avatar: "https://i.pravatar.cc/150?u=admin",
            permissions: ["all"],
            roles: [{ name: "admin" }]
        }
    };
};

export const getMe = async (): Promise<LoginResponse> => {
    await delay(300);
    return {
        code: 200,
        message: "Lấy thông tin thành công (Mock Mode)",
        data: {
            id: "ADMIN001",
            fullName: "Admin Mockup",
            email: "admin@mockup.com",
            token: "mock-token-active",
            avatar: "https://i.pravatar.cc/150?u=admin",
            permissions: ["all"],
            roles: [{ name: "admin" }]
        }
    };
};

export const logout = async (): Promise<{ code: number; message: string }> => {
    await delay(300);
    return {
        code: 200,
        message: "Đăng xuất thành công (Mock Mode)"
    };
};

