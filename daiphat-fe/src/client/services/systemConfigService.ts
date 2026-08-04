import { apiApp } from '../../api';

interface SystemConfigModel {
    configKey: string;
    configValue: string;
}

export const getPublicSystemConfigByKey = async (key: string): Promise<SystemConfigModel | null> => {
    try {
        const response = await apiApp.get(`/public/system-configs/${key}`);
        const body = response.data;
        if (body?.success === false || body?.isSuccess === false) {
            return null;
        }
        // React Query forbids undefined; missing/error payloads must be null.
        return body?.data ?? null;
    } catch (error) {
        console.error('Failed to get public system config', error);
        return null;
    }
};
