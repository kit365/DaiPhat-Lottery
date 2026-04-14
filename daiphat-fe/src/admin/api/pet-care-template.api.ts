import { apiApp } from "../../api";
import Cookies from "js-cookie";

export interface FoodTemplate {
    _id: string;
    name: string;
    group: string;
    userTicketType: "dog" | "cat" | "all";
    provider?: string;
    ageGroup?: "puppy" | "adult" | "senior" | "all";
    description?: string;
    isActive: boolean;
}

export interface ExerciseTemplate {
    _id: string;
    name: string;
    userTicketType: "dog" | "cat" | "all";
    durationMinutes: number;
    intensity: "low" | "medium" | "high";
    description?: string;
    isActive: boolean;
}

const BASE = "/admin/userTicket-care-template";

const withAuth = () => {
    const token = Cookies.get("tokenAdmin");
    return { headers: { Authorization: `Bearer ${token}` } };
};

// ─── Food ─────────────────────────────────────────────────────────────────────

export const getFoodTemplates = async (params?: { userTicketType?: string; group?: string }) => {
    const res = await apiApp.get(`${BASE}/food`, { ...withAuth(), params });
    return res.data;
};

export const createFoodTemplate = async (body: Partial<FoodTemplate>) => {
    const res = await apiApp.post(`${BASE}/food`, body, withAuth());
    return res.data;
};

export const updateFoodTemplate = async (id: string, body: Partial<FoodTemplate>) => {
    const res = await apiApp.patch(`${BASE}/food/${id}`, body, withAuth());
    return res.data;
};

export const deleteFoodTemplate = async (id: string) => {
    const res = await apiApp.delete(`${BASE}/food/${id}`, withAuth());
    return res.data;
};

// ─── Exercise ─────────────────────────────────────────────────────────────────

export const getExerciseTemplates = async (params?: { userTicketType?: string; intensity?: string }) => {
    const res = await apiApp.get(`${BASE}/exercise`, { ...withAuth(), params });
    return res.data;
};

export const createExerciseTemplate = async (body: Partial<ExerciseTemplate>) => {
    const res = await apiApp.post(`${BASE}/exercise`, body, withAuth());
    return res.data;
};

export const updateExerciseTemplate = async (id: string, body: Partial<ExerciseTemplate>) => {
    const res = await apiApp.patch(`${BASE}/exercise/${id}`, body, withAuth());
    return res.data;
};

export const deleteExerciseTemplate = async (id: string) => {
    const res = await apiApp.delete(`${BASE}/exercise/${id}`, withAuth());
    return res.data;
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

export const seedUserTicketCareTemplates = async () => {
    const res = await apiApp.post(`${BASE}/seed`, {}, withAuth());
    return res.data;
};
