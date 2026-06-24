import { apiApp } from '../../api';
import { ApiResponse } from '../config/type';
import { prefixAdmin } from '../constants/routes';
import { SystemConfigResponse, UpdateSystemConfigRequest } from '../pages/settings/types/system-config';

const BASE_URL = `/${prefixAdmin}/system-configs`;

export const getSystemConfigs = async (
    configType?: string
): Promise<ApiResponse<SystemConfigResponse[]>> => {
    const response = await apiApp.get(BASE_URL, {
        params: configType ? { configType } : undefined,
    });
    return response.data;
};

export const updateSystemConfig = async (
    id: number,
    data: UpdateSystemConfigRequest
): Promise<ApiResponse<SystemConfigResponse>> => {
    const response = await apiApp.put(`${BASE_URL}/${id}`, data);
    return response.data;
};
