import { ConfigDataType, ConfigType } from '../types/system-config';

export const getConfigTypeBadgeClass = (type: ConfigType) => {
    switch (type) {
        case ConfigType.GENERAL_SETTING:
        case ConfigType.STATIC_PAGE:
            return 'admin-status-badge--draft';
        case ConfigType.ORDER_SETTING:
        case ConfigType.VENDOR_SETTING:
            return 'admin-status-badge--active';
        case ConfigType.PAYMENT_SETTING:
        case ConfigType.PAYOUT_SETTING:
            return 'admin-status-badge--success';
        case ConfigType.TICKET_IMPORT:
        case ConfigType.TICKET_RETURN:
        case ConfigType.REFUND_SETTING:
            return 'admin-status-badge--pending';
        case ConfigType.COMPLAINT_SETTING:
        case ConfigType.FORTUNE_SETTING:
            return 'admin-status-badge--inactive';
        default:
            return 'admin-status-badge--draft';
    }
};

export const getConfigDataTypeBadgeClass = (dataType: ConfigDataType) => {
    switch (dataType) {
        case ConfigDataType.BOOLEAN:
            return 'admin-status-badge--active';
        case ConfigDataType.TIME:
            return 'admin-status-badge--pending';
        case ConfigDataType.JSON:
            return 'admin-status-badge--success';
        default:
            return 'admin-status-badge--draft';
    }
};

export const isBooleanConfigOn = (rawValue?: string | null) => {
    const value = String(rawValue ?? '').trim().toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
};
