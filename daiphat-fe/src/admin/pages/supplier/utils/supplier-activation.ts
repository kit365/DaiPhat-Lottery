export type SupplierActivationField =
    | 'CONTACT_PHONE'
    | 'ADDRESS'
    | 'PAYMENT_TERM_DAYS'
    | 'DEFAULT_IMPORT_COST';

export const SUPPLIER_FIELD_TO_FORM: Record<SupplierActivationField, string> = {
    CONTACT_PHONE: 'contactPhone',
    ADDRESS: 'address',
    PAYMENT_TERM_DAYS: 'paymentTermDays',
    DEFAULT_IMPORT_COST: 'defaultImportCost',
};

export const ACTIVATION_FIELD_ORDER: SupplierActivationField[] = [
    'CONTACT_PHONE',
    'ADDRESS',
    'PAYMENT_TERM_DAYS',
    'DEFAULT_IMPORT_COST',
];

export const SUPPLIER_ACTIVATION_FIELD_MESSAGES: Record<SupplierActivationField, string> = {
    CONTACT_PHONE: 'Vui lòng nhập số điện thoại để kích hoạt nhà cung cấp.',
    ADDRESS: 'Vui lòng nhập địa chỉ để kích hoạt nhà cung cấp.',
    PAYMENT_TERM_DAYS: 'Vui lòng nhập số ngày thanh toán để kích hoạt nhà cung cấp.',
    DEFAULT_IMPORT_COST: 'Vui lòng nhập giá vốn mặc định để kích hoạt nhà cung cấp.',
};

export const getActivationFieldHelperText = (field: SupplierActivationField) =>
    SUPPLIER_ACTIVATION_FIELD_MESSAGES[field];

export const getMissingSupplierFields = (data: {
    contactPhone?: string;
    address?: string;
    paymentTermDays?: number | null;
    defaultImportCost?: number | null;
}): SupplierActivationField[] => {
    const missing: SupplierActivationField[] = [];

    if (!data.contactPhone?.trim()) {
        missing.push('CONTACT_PHONE');
    }
    if (!data.address?.trim()) {
        missing.push('ADDRESS');
    }
    if (data.paymentTermDays == null || data.paymentTermDays < 0) {
        missing.push('PAYMENT_TERM_DAYS');
    }
    if (data.defaultImportCost == null || data.defaultImportCost <= 0) {
        missing.push('DEFAULT_IMPORT_COST');
    }

    return missing;
};

export const isSupplierActivationReady = (data: Parameters<typeof getMissingSupplierFields>[0]) =>
    getMissingSupplierFields(data).length === 0;

export const isFieldMissing = (
    missingFields: SupplierActivationField[],
    field: SupplierActivationField
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

export const scrollToFirstMissingField = (missing: SupplierActivationField[]) => {
    if (missing.length === 0) {
        return;
    }

    const orderedMissing = ACTIVATION_FIELD_ORDER.filter((field) => missing.includes(field));
    const firstField = orderedMissing[0];
    if (!firstField) {
        return;
    }

    const formField = SUPPLIER_FIELD_TO_FORM[firstField];
    const element = document.querySelector(`[data-activation-field="${formField}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
