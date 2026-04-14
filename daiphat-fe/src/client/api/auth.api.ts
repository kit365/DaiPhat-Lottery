import { apiApp } from "../../api";
import { ClientAuthResponse, LoginPayload, RegisterPayload } from "../types/auth.types";

const AUTH_ENDPOINT = "/auth";

export const clientAuthApi = {
  login: async (payload: LoginPayload): Promise<ClientAuthResponse> => {
    const response = await apiApp.post<ClientAuthResponse>(`${AUTH_ENDPOINT}/login`, payload);
    return response.data;
  },
  register: async (payload: RegisterPayload): Promise<ClientAuthResponse> => {
    const response = await apiApp.post<ClientAuthResponse>(`${AUTH_ENDPOINT}/register`, payload);
    return response.data;
  },
};
