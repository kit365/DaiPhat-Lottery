import { apiApp } from "../../api";

export interface Pet {
    _id: string;
    name: string;
    type: "dog" | "cat";
    breed?: string;
    weight?: number;
    age?: number;
    color?: string;
    gender?: "male" | "female";
    notes?: string;
    avatar?: string;
    healthStatus?: "accepted" | "rejected";
    status: string;
}

export interface PetPayload {
    name: string;
    type: "dog" | "cat";
    breed?: string;
    weight?: number;
    age?: number;
    color?: string;
    gender?: "male" | "female";
    healthStatus?: "accepted" | "rejected";
    notes?: string;
    avatar?: string;
}

export const getMyPets = async () => {
    const response = await apiApp.get("/client/pet/my-pets");
    return response.data;
};

export const getPetDetail = async (id: string) => {
    const response = await apiApp.get(`/client/pet/my-pets/${id}`);
    return response.data;
};

export const createMyPet = async (data: PetPayload) => {
    const response = await apiApp.post("/client/pet/my-pets", data);
    return response.data;
};

export const updateMyPet = async (id: string, data: Partial<PetPayload>) => {
    const response = await apiApp.patch(`/client/pet/my-pets/${id}`, data);
    return response.data;
};

export const deletePet = async (id: string) => {
    const response = await apiApp.delete(`/client/pet/my-pets/${id}`);
    return response.data;
};
