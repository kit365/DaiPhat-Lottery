import axios from "axios";

const API_URL = "http://localhost:3000/api/v1/client/breed";

export const getBreeds = async (type?: string, unique: boolean = false) => {
    const response = await axios.get(API_URL, {
        params: { type, unique },
        withCredentials: true
    });
    return response.data;
};

export const createBreed = async (data: { name: string, type: string }) => {
    const response = await axios.post(`${API_URL}/create`, data, {
        withCredentials: true
    });
    return response.data;
};
