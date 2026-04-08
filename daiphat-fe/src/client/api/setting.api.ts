import { apiApp } from '../../api';

const BASE_URL = '/api/v1/client/setting';


/** Lấy thông tin trang tĩnh theo key */
export const getClientPage = async (key: string): Promise<any> => {
    const response = await apiApp.get(`${BASE_URL}/page/${key}`);
    return response.data;
};

/** Lấy thông tin cài đặt chung */
export const getGeneralSettings = async (): Promise<any> => {
    const response = await apiApp.get(`${BASE_URL}/general`);
    return response.data;
};
