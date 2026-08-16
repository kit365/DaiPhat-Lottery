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

/**
 * Compact KPI amount: 1.000 → `1k`, 10.763.500 → `10.764k` (làm tròn, không lẻ).
 * Values under 1.000 stay as-is (no suffix).
 */
export const formatKpiAmount = (value?: number | string | null): string => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return '—';
    }

    if (Math.abs(numeric) < 1000) {
        return numeric.toLocaleString('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: VND_MAX_FRACTION_DIGITS,
        });
    }

    const inK = Math.round(numeric / 1000);
    return `${inK.toLocaleString('vi-VN')}k`;
};
