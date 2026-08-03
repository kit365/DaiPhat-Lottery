import { ConfigDataType } from '../types/system-config';

export interface CommissionTier {
    upTo: number | null;
    rate: number;
}

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

const formatRatePercent = (rate: number) => {
    const percent = rate * 100;
    const text = Number.isInteger(percent)
        ? String(percent)
        : percent.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
    return `${text}%`;
};

export const parseCommissionTiers = (raw: string): CommissionTier[] | null => {
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return null;
        }
        return parsed.map((item) => ({
            upTo: item?.upTo == null ? null : Number(item.upTo),
            rate: Number(item.rate),
        }));
    } catch {
        return null;
    }
};

/** Human-readable lines for prize payout commission tiers. */
export const formatCommissionTiersLines = (raw: string): string[] | null => {
    const tiers = parseCommissionTiers(raw);
    if (!tiers) {
        return null;
    }

    return tiers.map((tier, index) => {
        const rateLabel = formatRatePercent(tier.rate);
        if (tier.upTo == null) {
            return `Trên mức trên → ${rateLabel}`;
        }
        if (index === 0) {
            return `Đến ${formatVnd(tier.upTo)} → ${rateLabel}`;
        }
        const prev = tiers[index - 1]?.upTo;
        if (prev != null) {
            return `Từ trên ${formatVnd(prev)} đến ${formatVnd(tier.upTo)} → ${rateLabel}`;
        }
        return `Đến ${formatVnd(tier.upTo)} → ${rateLabel}`;
    });
};

export const formatCommissionTiersSummary = (raw: string): string | null => {
    const lines = formatCommissionTiersLines(raw);
    if (!lines?.length) {
        return null;
    }
    return lines.join(' · ');
};

export const formatSystemConfigDisplayValue = (
    configKey: string,
    rawValue: string,
    dataType: ConfigDataType
): { summary: string; detailLines?: string[]; isStructured: boolean } => {
    if (configKey === 'PRIZE_PAYOUT_COMMISSION_TIERS') {
        const lines = formatCommissionTiersLines(rawValue);
        if (lines) {
            return {
                summary: `${lines.length} bậc hoa hồng`,
                detailLines: lines,
                isStructured: true,
            };
        }
    }

    if (dataType === ConfigDataType.JSON) {
        try {
            const pretty = JSON.stringify(JSON.parse(rawValue), null, 2);
            return { summary: pretty, isStructured: false };
        } catch {
            return { summary: rawValue, isStructured: false };
        }
    }

    if (dataType === ConfigDataType.DECIMAL && /^-?\d+(\.\d+)?$/.test(rawValue.trim())) {
        const num = Number(rawValue);
        // Rates stored as 0.10 often mean 10%
        if (num > 0 && num < 1) {
            return {
                summary: `${(num * 100).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}% (${rawValue})`,
                isStructured: false,
            };
        }
    }

    return { summary: rawValue, isStructured: false };
};
