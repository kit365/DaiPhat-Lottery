const VND_MAX_FRACTION_DIGITS = 3;

/** Standard admin currency display: `10.000đ` */
export const formatVnd = (value?: number | string | null): string => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return '—';
    }

    return `${numeric.toLocaleString('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: VND_MAX_FRACTION_DIGITS,
    })}\u00A0đ`;
};
