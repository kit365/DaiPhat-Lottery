export enum ConfigType {
    GENERAL_SETTING = 'GENERAL_SETTING',
    STATIC_PAGE = 'STATIC_PAGE',
    ORDER_SETTING = 'ORDER_SETTING',
    PAYMENT_SETTING = 'PAYMENT_SETTING',
    TICKET_IMPORT = 'TICKET_IMPORT',
    TICKET_RETURN = 'TICKET_RETURN',
    SETTLEMENT_SETTING = 'SETTLEMENT_SETTING',
    VENDOR_SETTING = 'VENDOR_SETTING',
    REFUND_SETTING = 'REFUND_SETTING',
    COMPLAINT_SETTING = 'COMPLAINT_SETTING',
    PAYOUT_SETTING = 'PAYOUT_SETTING',
    FORTUNE_SETTING = 'FORTUNE_SETTING',
}

export enum ConfigDataType {
    INT = 'INT',
    TIME = 'TIME',
    BOOLEAN = 'BOOLEAN',
    DECIMAL = 'DECIMAL',
    STRING = 'STRING',
    JSON = 'JSON',
}

export const CONFIG_TYPE_LABELS: Record<ConfigType, string> = {
    [ConfigType.GENERAL_SETTING]: 'Cài đặt chung',
    [ConfigType.STATIC_PAGE]: 'Trang tĩnh / Chính sách',
    [ConfigType.ORDER_SETTING]: 'Cấu hình đơn hàng',
    [ConfigType.PAYMENT_SETTING]: 'Cấu hình thanh toán',
    [ConfigType.TICKET_IMPORT]: 'Cấu hình nhập vé',
    [ConfigType.TICKET_RETURN]: 'Cấu hình trả vé',
    [ConfigType.SETTLEMENT_SETTING]: 'Cấu hình đối soát',
    [ConfigType.VENDOR_SETTING]: 'Cấu hình người bán vé số',
    [ConfigType.REFUND_SETTING]: 'Cấu hình hoàn tiền',
    [ConfigType.COMPLAINT_SETTING]: 'Cấu hình khiếu nại',
    [ConfigType.PAYOUT_SETTING]: 'Cấu hình trả thưởng',
    [ConfigType.FORTUNE_SETTING]: 'Cấu hình gieo quẻ',
};

export const CONFIG_DATA_TYPE_LABELS: Record<ConfigDataType, string> = {
    [ConfigDataType.INT]: 'Số nguyên',
    [ConfigDataType.TIME]: 'Thời gian (HH:mm, ví dụ 17:00)',
    [ConfigDataType.BOOLEAN]: 'Boolean (true/false)',
    [ConfigDataType.DECIMAL]: 'Số thập phân',
    [ConfigDataType.STRING]: 'Chuỗi',
    [ConfigDataType.JSON]: 'Danh sách mức',
};

export interface SystemConfigValidationRules {
    min?: number | string;
    max?: number | string;
    allowEmpty?: boolean;
    maxLength?: number;
    allowedValues?: string[];
}

export interface SystemConfigResponse {
    id: number;
    configKey: string;
    configValue: string;
    configType: ConfigType;
    dataType: ConfigDataType;
    description: string;
    configName: string;
    unit?: string | null;
    validationRules?: string | null;
    isEditable: boolean;
    updatedAt: string;
    updatedBy: string;
}

export interface UpdateSystemConfigRequest {
    configName?: string;
    configValue: string;
    description: string;
}

export const parseValidationRules = (raw?: string | null): SystemConfigValidationRules | null => {
    if (!raw?.trim()) return null;
    try {
        return JSON.parse(raw) as SystemConfigValidationRules;
    } catch {
        return null;
    }
};
