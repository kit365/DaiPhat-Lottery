import { apiApp } from '../../api';

const BASE_URL = `/api/v1/client/product`;

/** Lấy danh sách sản phẩm */
export const getProducts = async (params: any = {}) => {
    const response = await apiApp.get(`${BASE_URL}`, { params });
    return response.data;
};

/** Lấy danh sách danh mục */
export const getCategories = async () => {
    const response = await apiApp.get(`${BASE_URL}/categories`);
    return response.data;
};

/** Lấy danh sách thương hiệu */
export const getBrands = async () => {
    const response = await apiApp.get(`${BASE_URL}/brands`);
    return response.data;
};

/** Lấy gợi ý tìm kiếm */
export const getSuggestions = async (keyword: string) => {
    const response = await apiApp.get(`${BASE_URL}/search/suggestions`, { params: { keyword } });
    return response.data;
};

/** Lấy chi tiết sản phẩm theo slug */
export const getProductBySlug = async (slug: string) => {
    const response = await apiApp.get(`${BASE_URL}/detail/${slug}`);
    return response.data;
};
