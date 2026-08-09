import { apiApp } from '../../api';

interface SystemConfigModel {
    configKey: string;
    configValue: string;
}

type ApiBody<T> = {
    success?: boolean;
    isSuccess?: boolean;
    data?: T;
};

export const getPublicSystemConfigByKey = async (key: string): Promise<SystemConfigModel | null> => {
    try {
        const response = await apiApp.get(`/public/system-configs/${key}`);
        const body = response.data as ApiBody<SystemConfigModel>;
        if (body?.success === false || body?.isSuccess === false) {
            return null;
        }
        return body?.data ?? null;
    } catch (error) {
        console.error('Failed to get public system config', error);
        return null;
    }
};

/** Fetch multiple public config keys in one HTTP request. */
export const getPublicSystemConfigsByKeys = async (
    keys: readonly string[],
): Promise<Record<string, SystemConfigModel | null>> => {
    const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
    if (uniqueKeys.length === 0) {
        return {};
    }

    try {
        const response = await apiApp.get('/public/system-configs/batch', {
            params: { keys: uniqueKeys.join(',') },
        });
        const body = response.data as ApiBody<Record<string, SystemConfigModel>>;
        if (body?.success === false || body?.isSuccess === false) {
            return Object.fromEntries(uniqueKeys.map((key) => [key, null]));
        }

        const data = body?.data ?? {};
        return Object.fromEntries(
            uniqueKeys.map((key) => [key, data[key] ?? null]),
        );
    } catch (error) {
        console.warn('Batch public config failed, falling back to per-key requests', error);
        const entries = await Promise.all(
            uniqueKeys.map(async (key) => [key, await getPublicSystemConfigByKey(key)] as const),
        );
        return Object.fromEntries(entries);
    }
};
