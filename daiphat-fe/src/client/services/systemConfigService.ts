import type { AxiosError } from 'axios';
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

const PUBLIC_CONFIG_REQUEST = { skipGlobalErrorToast: true } as const;

const emptyConfigMap = (keys: readonly string[]) =>
    Object.fromEntries(keys.map((key) => [key, null]));

export const getPublicSystemConfigByKey = async (key: string): Promise<SystemConfigModel | null> => {
    try {
        const response = await apiApp.get(`/public/system-configs/${key}`, PUBLIC_CONFIG_REQUEST);
        const body = response.data as ApiBody<SystemConfigModel>;
        if (body?.success === false || body?.isSuccess === false) {
            return null;
        }
        return body?.data ?? null;
    } catch {
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
            ...PUBLIC_CONFIG_REQUEST,
            params: { keys: uniqueKeys.join(',') },
        });
        const body = response.data as ApiBody<Record<string, SystemConfigModel>>;
        if (body?.success === false || body?.isSuccess === false) {
            return emptyConfigMap(uniqueKeys);
        }

        const data = body?.data ?? {};
        return Object.fromEntries(
            uniqueKeys.map((key) => [key, data[key] ?? null]),
        );
    } catch (error) {
        const status = (error as AxiosError)?.response?.status;
        // Old BE without batch endpoint — try per-key once.
        if (status === 404) {
            const entries = await Promise.all(
                uniqueKeys.map(async (key) => [key, await getPublicSystemConfigByKey(key)] as const),
            );
            return Object.fromEntries(entries);
        }

        return emptyConfigMap(uniqueKeys);
    }
};
