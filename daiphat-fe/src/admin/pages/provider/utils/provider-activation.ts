export type ProviderActivationField =
    | 'NAME'
    | 'PRICE'
    | 'COMMISSION_RATE'
    | 'REGION'
    | 'PROVINCE'
    | 'DRAW_SCHEDULE'
    | 'DRAW_TIME';

export const PROVIDER_FIELD_TO_FORM: Record<ProviderActivationField, string> = {
    NAME: 'name',
    PRICE: 'price',
    COMMISSION_RATE: 'commissionRate',
    REGION: 'region',
    PROVINCE: 'province',
    DRAW_SCHEDULE: 'drawDays',
    DRAW_TIME: 'drawTime',
};

export const ACTIVATION_FIELD_ORDER: ProviderActivationField[] = [
    'NAME',
    'PRICE',
    'COMMISSION_RATE',
    'REGION',
    'PROVINCE',
    'DRAW_SCHEDULE',
    'DRAW_TIME',
];

export const PROVIDER_ACTIVATION_FIELD_MESSAGES: Record<ProviderActivationField, string> = {
    NAME: 'Vui lòng nhập tên nhà đài.',
    PRICE: 'Vui lòng nhập giá vé.',
    COMMISSION_RATE: 'Vui lòng nhập tỷ lệ hoa hồng.',
    REGION: 'Vui lòng chọn vùng miền.',
    PROVINCE: 'Vui lòng chọn tỉnh / thành phố.',
    DRAW_SCHEDULE: 'Vui lòng chọn lịch quay.',
    DRAW_TIME: 'Vui lòng chọn giờ quay.',
};

export const getActivationFieldHelperText = (field: ProviderActivationField) =>
    PROVIDER_ACTIVATION_FIELD_MESSAGES[field];

export const getMissingProviderFields = (data: {
    name?: string;
    price?: number | null;
    commissionRate?: number | null;
    region?: string;
    province?: string;
    drawDays?: string[];
    drawTime?: string;
}): ProviderActivationField[] => {
    const missing: ProviderActivationField[] = [];

    if (!data.name?.trim()) {
        missing.push('NAME');
    }
    if (data.price == null || data.price <= 0) {
        missing.push('PRICE');
    }
    if (data.commissionRate == null || data.commissionRate < 0 || data.commissionRate > 1) {
        missing.push('COMMISSION_RATE');
    }
    if (!data.region?.trim()) {
        missing.push('REGION');
    }
    if (!data.province?.trim()) {
        missing.push('PROVINCE');
    }
    if (!data.drawDays || data.drawDays.length === 0) {
        missing.push('DRAW_SCHEDULE');
    }
    if (!data.drawTime?.trim()) {
        missing.push('DRAW_TIME');
    }

    return missing;
};

export const isProviderActivationReady = (data: Parameters<typeof getMissingProviderFields>[0]) =>
    getMissingProviderFields(data).length === 0;

export const isFieldMissing = (
    missingFields: ProviderActivationField[],
    field: ProviderActivationField
) => missingFields.includes(field);

export const missingFieldInputSx = (isMissing: boolean) =>
    isMissing
        ? {
            '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'warning.main',
                borderWidth: 2,
            },
            '& .MuiFormHelperText-root': {
                color: 'warning.main',
            },
        }
        : {};

export const scrollToFirstMissingField = (missing: ProviderActivationField[]) => {
    if (missing.length === 0) {
        return;
    }

    const orderedMissing = ACTIVATION_FIELD_ORDER.filter((field) => missing.includes(field));
    const firstField = orderedMissing[0];
    if (!firstField) {
        return;
    }

    const formField = PROVIDER_FIELD_TO_FORM[firstField];
    const element = document.querySelector(`[data-activation-field="${formField}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

export const getProviderActiveBadge = (isActive?: boolean) =>
    isActive
        ? {
            label: 'Đang hoạt động',
            bg: 'var(--palette-info-lighter)',
            text: 'var(--palette-info-dark)',
        }
        : {
            label: 'Ngừng hoạt động',
            bg: 'var(--palette-error-lighter)',
            text: 'var(--palette-error-dark)',
        };
