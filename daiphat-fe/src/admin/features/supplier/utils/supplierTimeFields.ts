const drawTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const formatSupplierTime = (value?: string | null): string => {
    if (!value) {
        return '—';
    }
    const trimmed = value.trim();
    return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
};
