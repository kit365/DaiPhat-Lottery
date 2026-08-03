export enum ConfigType {
    ORDER_SETTING = 'ORDER_SETTING',
    PAYMENT_SETTING = 'PAYMENT_SETTING',
    TICKET_IMPORT = 'TICKET_IMPORT',
    REFUND_SETTING = 'REFUND_SETTING',
    COMPLAINT_SETTING = 'COMPLAINT_SETTING',
    PAYOUT_SETTING = 'PAYOUT_SETTING',
}

export enum ConfigDataType {
    INT = 'INT',
    TIME = 'TIME',
    BOOLEAN = 'BOOLEAN',
    DECIMAL = 'DECIMAL',
    JSON = 'JSON',
}

export const CONFIG_TYPE_LABELS: Record<ConfigType, string> = {
    [ConfigType.ORDER_SETTING]: 'Cấu hình đơn hàng',
    [ConfigType.PAYMENT_SETTING]: 'Cấu hình thanh toán',
    [ConfigType.TICKET_IMPORT]: 'Cấu hình nhập vé',
    [ConfigType.REFUND_SETTING]: 'Cấu hình hoàn tiền',
    [ConfigType.COMPLAINT_SETTING]: 'Cấu hình khiếu nại',
    [ConfigType.PAYOUT_SETTING]: 'Cấu hình trả thưởng',
};

export const CONFIG_DATA_TYPE_LABELS: Record<ConfigDataType, string> = {
    [ConfigDataType.INT]: 'Số nguyên',
    [ConfigDataType.TIME]: 'Thời gian (HH:mm)',
    [ConfigDataType.BOOLEAN]: 'Boolean (true/false)',
    [ConfigDataType.DECIMAL]: 'Số thập phân',
    [ConfigDataType.JSON]: 'Danh sách mức',
};

export interface SystemConfigValidationRules {
    min?: number | string;
    max?: number | string;
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
