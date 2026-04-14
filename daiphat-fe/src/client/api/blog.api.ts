import { apiApp } from "../../api";

export const getPublicBlogs = async () => {
    const response = await apiApp.get("/client/article/list");
    return response.data;
};

export const getPublicBlogDetail = async (slug: string) => {
    const response = await apiApp.get(`/client/article/detail/${slug}`);
    return response.data;
};
