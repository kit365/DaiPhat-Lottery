"use client";

import { useMemo } from 'react';
import { useSystemConfigs } from '../../../system-config/hooks/useSystemConfig';
import { ConfigType } from '../../../system-config/types/system-config';

const DEFAULT_MAX_COUNT = 5;
const DEFAULT_MAX_SIZE_MB = 5;

const parseClampedInt = (raw: string | undefined, fallback: number, min: number, max: number) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.trunc(value)));
};

export const useImportBatchTicketListImageLimits = () => {
    const query = useSystemConfigs(ConfigType.TICKET_IMPORT);

    return useMemo(() => {
        const configs = query.data?.data ?? [];
        const byKey = Object.fromEntries(configs.map((item) => [item.configKey, item.configValue]));

        return {
            maxCount: parseClampedInt(
                byKey.IMPORT_BATCH_TICKET_LIST_IMAGE_MAX_COUNT,
                DEFAULT_MAX_COUNT,
                1,
                20
            ),
            maxSizeMb: parseClampedInt(
                byKey.IMPORT_BATCH_TICKET_LIST_IMAGE_MAX_SIZE_MB,
                DEFAULT_MAX_SIZE_MB,
                1,
                10
            ),
            isLoading: query.isLoading,
        };
    }, [query.data?.data, query.isLoading]);
};
