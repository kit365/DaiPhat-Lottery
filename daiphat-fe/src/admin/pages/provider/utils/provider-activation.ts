export type ProviderActivationField =
    | 'PRICE'
    | 'COMMISSION_RATE'
    | 'REGION'
    | 'PROVINCE'
    | 'DRAW_SCHEDULE'
    | 'DRAW_TIME';

export const PROVIDER_FIELD_TO_FORM: Record<ProviderActivationField, string> = {
    PRICE: 'price',
    COMMISSION_RATE: 'commissionRate',
    REGION: 'region',
    PROVINCE: 'province',
    DRAW_SCHEDULE: 'drawDays',
    DRAW_TIME: 'drawTime',
};

export const ACTIVATION_FIELD_ORDER: ProviderActivationField[] = [
    'PRICE',
    'COMMISSION_RATE',
    'REGION',
    'PROVINCE',
    'DRAW_SCHEDULE',
    'DRAW_TIME',
];

export const PROVIDER_ACTIVATION_FIELD_LABELS: Record<ProviderActivationField, string> = {
    PRICE: 'Giá vé',
    COMMISSION_RATE: 'Tỷ lệ hoa hồng',
    REGION: 'Vùng miền',
    PROVINCE: 'Tỉnh/Thành phố',
    DRAW_SCHEDULE: 'Lịch quay',
    DRAW_TIME: 'Giờ quay',
};

export const PROVIDER_ACTIVATION_FIELD_MESSAGES: Record<ProviderActivationField, string> = {
    PRICE: 'Vui lòng nhập giá vé hợp lệ (> 0) để kích hoạt nhà đài.',
    COMMISSION_RATE: 'Vui lòng nhập tỷ lệ hoa hồng hợp lệ (từ 0 đến 1) để kích hoạt nhà đài.',
    REGION: 'Vui lòng chọn vùng miền để kích hoạt nhà đài.',
    PROVINCE: 'Vui lòng chọn tỉnh/thành phố để kích hoạt nhà đài.',
    DRAW_SCHEDULE: 'Vui lòng chọn lịch quay để kích hoạt nhà đài.',
    DRAW_TIME: 'Vui lòng chọn giờ quay để kích hoạt nhà đài.',
};

export const getActivationFieldHelperText = (field: ProviderActivationField) =>
    PROVIDER_ACTIVATION_FIELD_MESSAGES[field];

export const getMissingProviderFields = (data: {
    price?: number | null;
    commissionRate?: number | null;
    region?: string | null;
    province?: string | null;
    drawDays?: string[] | null;
    drawTime?: string | null;
}): ProviderActivationField[] => {
    const missing: ProviderActivationField[] = [];

    if (data.price == null || Number(data.price) <= 0) {
        missing.push('PRICE');
    }
    if (
        data.commissionRate == null
        || Number.isNaN(Number(data.commissionRate))
        || Number(data.commissionRate) < 0
        || Number(data.commissionRate) > 1
    ) {
        missing.push('COMMISSION_RATE');
    }
    if (!data.region?.trim()) {
        missing.push('REGION');
    }
    if (!data.province?.trim()) {
        missing.push('PROVINCE');
    }
    if (!Array.isArray(data.drawDays) || data.drawDays.length === 0) {
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

export const buildActivationIncompleteToast = (missing: ProviderActivationField[]) => {
    const labels = ACTIVATION_FIELD_ORDER.filter((field) => missing.includes(field)).map(
        (field) => PROVIDER_ACTIVATION_FIELD_LABELS[field]
    );
    if (labels.length === 0) {
        return 'Vui lòng hoàn tất thông tin bắt buộc trước khi kích hoạt nhà đài.';
    }
    return `Nhà đài chưa đủ thông tin để kích hoạt. Vui lòng bổ sung: ${labels.join(', ')}.`;
};

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
