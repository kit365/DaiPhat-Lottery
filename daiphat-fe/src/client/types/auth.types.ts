import { User } from "../../types/user.type";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface ClientAuthResponse {
  code?: string;
  isSuccess?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    access_token?: string;
    expires_in?: number;
    user?: User;
  };
}
