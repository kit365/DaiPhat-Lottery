import { SystemConfigResponse } from '../types/system-config';
import { getVendorConfidenceDisplay } from './vendorConfidenceDisplay';

const TIMING_KEYS = ['VENDOR_RETURN_CUTOFF', 'VENDOR_DRAFT_RESERVATION_TTL_MINUTES'];

export type VendorConfigSection = {
    title: string;
    showBulkConfidence?: boolean;
    items: SystemConfigResponse[];
};

const GROUPS: {
    title: string;
    showBulkConfidence?: boolean;
    match: (config: SystemConfigResponse) => boolean;
    keyOrder?: string[];
}[] = [
    {
        title: 'Thời gian vận hành',
        match: (config) => TIMING_KEYS.includes(config.configKey),
        keyOrder: TIMING_KEYS,
    },
    {
        title: 'Chính sách áp dụng',
        match: (config) =>
            !TIMING_KEYS.includes(config.configKey) && !config.configKey.startsWith('VENDOR_CONFIDENCE_'),
    },
    {
        title: 'Chính sách điểm tin cậy',
        showBulkConfidence: true,
        match: (config) => config.configKey.startsWith('VENDOR_CONFIDENCE_'),
    },
];

const withOperatorLabels = (config: SystemConfigResponse): SystemConfigResponse => {
    const display = getVendorConfidenceDisplay(config);
    return {
        ...config,
        configName: display.label,
        description: display.description,
    };
};

const sortByKeyOrder = (items: SystemConfigResponse[], keyOrder?: string[]) => {
    if (!keyOrder?.length) return items;
    const rank = new Map(keyOrder.map((key, index) => [key, index]));
    return [...items].sort((a, b) => (rank.get(a.configKey) ?? 999) - (rank.get(b.configKey) ?? 999));
};

export const buildVendorConfigSections = (configs: SystemConfigResponse[]): VendorConfigSection[] =>
    GROUPS.map((group) => ({
        title: group.title,
        showBulkConfidence: group.showBulkConfidence,
        items: sortByKeyOrder(configs.filter(group.match), group.keyOrder).map(withOperatorLabels),
    })).filter((section) => section.items.length > 0);
