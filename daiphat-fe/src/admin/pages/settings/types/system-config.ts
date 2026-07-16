export enum ConfigType {
    ORDER_SETTING = 'ORDER_SETTING',
    TICKET_IMPORT = 'TICKET_IMPORT',
    REFUND_SETTING = 'REFUND_SETTING',
}

export enum ConfigDataType {
    INT = 'INT',
    TIME = 'TIME',
    BOOLEAN = 'BOOLEAN',
}

export const CONFIG_TYPE_LABELS: Record<ConfigType, string> = {
    [ConfigType.ORDER_SETTING]: 'Cấu hình đơn hàng',
    [ConfigType.TICKET_IMPORT]: 'Cấu hình nhập vé',
    [ConfigType.REFUND_SETTING]: 'Cấu hình hoàn tiền',
};

export const CONFIG_DATA_TYPE_LABELS: Record<ConfigDataType, string> = {
    [ConfigDataType.INT]: 'Số nguyên',
    [ConfigDataType.TIME]: 'Thời gian (HH:mm)',
    [ConfigDataType.BOOLEAN]: 'Boolean (true/false)',
};

export interface SystemConfigResponse {
    id: number;
    configKey: string;
    configValue: string;
    configType: ConfigType;
    dataType: ConfigDataType;
    description: string;
    updatedAt: string;
    updatedBy: string;
}

export interface UpdateSystemConfigRequest {
    configValue: string;
    description: string;
}
