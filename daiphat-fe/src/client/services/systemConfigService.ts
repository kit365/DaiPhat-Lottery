import { apiApp } from '../../api';

interface SystemConfigModel {
    configKey: string;
    configValue: string;
}

export const getPublicSystemConfigByKey = async (key: string): Promise<SystemConfigModel | null> => {
    try {
        const response = await apiApp.get(`/public/system-configs/${key}`);
        return response.data.data;
    } catch (error) {
        console.error('Failed to get public system config', error);
        return null;
    }
};
