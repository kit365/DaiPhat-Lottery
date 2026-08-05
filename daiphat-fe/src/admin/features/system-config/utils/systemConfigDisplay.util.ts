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

    if (configKey === 'FORTUNE_CAST_COOLDOWN_HOURS') {
        const total = Number.parseInt(String(rawValue ?? '').trim(), 10);
        if (Number.isFinite(total) && total > 0) {
            const hours = Math.floor(total / 60);
            const minutes = total % 60;
            const parts: string[] = [];
            if (hours > 0) parts.push(`${hours} giờ`);
            if (minutes > 0 || hours === 0) parts.push(`${minutes} phút`);
            const summary = parts.join(' ');
            const detail =
                total === 60
                    ? 'Mỗi khung 1 giờ đồng hồ (0h, 1h, 2h, …)'
                    : total === 360
                      ? 'Mỗi khung 6 giờ (0h, 6h, 12h, 18h)'
                      : total === 1440
                        ? 'Mỗi khung 1 ngày (reset 0h)'
                        : `Khung ${summary}, căn từ 0h VN`;
            return {
                summary,
                detailLines: [detail],
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

    if (configKey === 'VENDOR_LATE_RETURN_POLICY') {
        const labels: Record<string, string> = {
            FORFEIT_DEPOSIT: 'Tịch thu tiền cọc',
            FORCE_PURCHASE_ALL: 'Ép mua toàn bộ vé',
        };
        return {
            summary: labels[rawValue] ? `${labels[rawValue]} (${rawValue})` : rawValue,
            isStructured: false,
        };
    }

    return { summary: rawValue, isStructured: false };
};
