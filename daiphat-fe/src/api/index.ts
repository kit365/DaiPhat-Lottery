import axios from "axios"
import { useAuthStore } from "../stores/useAuthStore"

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"

const apiApp = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json"
    }
})

apiApp.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export { apiApp }