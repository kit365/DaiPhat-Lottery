import { ConfigDataType, SystemConfigResponse } from '../types/system-config';

type VendorConfidenceDisplay = {
    label: string;
    description: string;
};

/** Operator-facing names for the non-confidence vendor policy settings. */
export const VENDOR_SETTING_DISPLAY: Record<string, VendorConfidenceDisplay> = {
    STREET_AGENT_COUNTER_RESERVE_PER_STATION: {
        label: 'Số vé giữ lại cho quầy mỗi đài',
        description: 'Số vé thường tối thiểu cần giữ lại để quầy tiếp tục bán.',
    },
    STREET_AGENT_COUNTER_RESERVE_PERCENT_PER_STATION: {
        label: 'Tỷ lệ vé giữ lại cho quầy',
        description: 'Tỷ lệ vé thường tối thiểu cần giữ lại cho quầy trên mỗi đài.',
    },
    VENDOR_COMMISSION_RATE: {
        label: 'Tỷ lệ hoa hồng người bán vé số',
        description: 'Tỷ lệ chênh lệch giữa giá khách trả và giá người bán vé số nhận.',
    },
    VENDOR_DEFAULT_CONTRACT_MAX_DAILY_CAP: {
        label: 'Hạn mức hợp đồng mặc định',
        description: 'Hạn mức vé/ngày điền sẵn khi tạo hồ sơ người bán vé số.',
    },
    VENDOR_DEFAULT_UNIT_PRICE: {
        label: 'Giá bán cho người bán vé số',
        description: 'Giá áp dụng cho người bán vé số; hệ thống tự tính từ mệnh giá và hoa hồng.',
    },
    VENDOR_DEPOSIT_RATE: {
        label: 'Tỷ lệ tiền cọc',
        description: 'Tỷ lệ tiền cọc tính trên giá trị vé giao cho người bán vé số.',
    },
    VENDOR_LATE_RETURN_POLICY: {
        label: 'Cách xử lý khi trả vé trễ',
        description: 'Quy tắc áp dụng khi người bán vé số trả vé sau giờ chốt.',
    },
};

/**
 * Configuration keys are intentionally kept in English in the API/database.
 * This dictionary is the operator-facing vocabulary for the vendor settings
 * screen; operators should not need to know the confidence engine's enum names.
 */
export const VENDOR_CONFIDENCE_DISPLAY: Record<string, VendorConfidenceDisplay> = {
    VENDOR_CONFIDENCE_NEW_CAP_PERCENT: {
        label: 'Tỷ lệ hạn mức cho mức Mới',
        description: 'Phần trăm hạn mức được phép giao khi người bán mới bắt đầu.',
    },
    VENDOR_CONFIDENCE_DEVELOPING_CAP_PERCENT: {
        label: 'Tỷ lệ hạn mức cho mức Đang phát triển',
        description: 'Phần trăm hạn mức được phép giao khi người bán đã có tiến bộ.',
    },
    VENDOR_CONFIDENCE_ESTABLISHED_CAP_PERCENT: {
        label: 'Tỷ lệ hạn mức cho mức Ổn định',
        description: 'Phần trăm hạn mức được phép giao khi người bán đã hoạt động ổn định.',
    },
    VENDOR_CONFIDENCE_TRUSTED_CAP_PERCENT: {
        label: 'Tỷ lệ hạn mức cho mức Tin cậy',
        description: 'Phần trăm hạn mức được phép giao khi người bán đạt mức tin cậy cao.',
    },
    VENDOR_CONFIDENCE_DEVELOPING_MIN_SCORE: {
        label: 'Điểm để đạt mức Đang phát triển',
        description: 'Điểm tin cậy tối thiểu để chuyển từ Mới sang Đang phát triển.',
    },
    VENDOR_CONFIDENCE_ESTABLISHED_MIN_SCORE: {
        label: 'Điểm để đạt mức Ổn định',
        description: 'Điểm tin cậy tối thiểu để chuyển sang mức Ổn định.',
    },
    VENDOR_CONFIDENCE_TRUSTED_MIN_SCORE: {
        label: 'Điểm để đạt mức Tin cậy',
        description: 'Điểm tin cậy tối thiểu để chuyển sang mức Tin cậy.',
    },
    VENDOR_CONFIDENCE_DEVELOPING_MIN_BATCHES: {
        label: 'Số phiếu tối thiểu để đạt mức Đang phát triển',
        description: 'Số phiếu đã quyết toán tối thiểu để mở mức Đang phát triển.',
    },
    VENDOR_CONFIDENCE_ESTABLISHED_MIN_BATCHES: {
        label: 'Số phiếu tối thiểu để đạt mức Ổn định',
        description: 'Số phiếu đã quyết toán tối thiểu để mở mức Ổn định.',
    },
    VENDOR_CONFIDENCE_TRUSTED_MIN_BATCHES: {
        label: 'Số phiếu tối thiểu để đạt mức Tin cậy',
        description: 'Số phiếu đã quyết toán tối thiểu để mở mức Tin cậy.',
    },
    VENDOR_CONFIDENCE_ON_TIME_WEIGHT: {
        label: 'Tỷ trọng trả vé đúng hạn',
        description: 'Mức ảnh hưởng của việc trả vé đúng hạn trong điểm tin cậy.',
    },
    VENDOR_CONFIDENCE_SELL_THROUGH_WEIGHT: {
        label: 'Tỷ trọng bán được vé',
        description: 'Mức ảnh hưởng của tỷ lệ vé bán được trong điểm tin cậy.',
    },
    VENDOR_CONFIDENCE_EXPERIENCE_WEIGHT: {
        label: 'Tỷ trọng kinh nghiệm',
        description: 'Mức ảnh hưởng của số phiếu đã quyết toán trong điểm tin cậy.',
    },
    VENDOR_CONFIDENCE_EXPERIENCE_WINDOW: {
        label: 'Số phiếu dùng để tính điểm',
        description: 'Hệ thống dùng số phiếu đã quyết toán gần nhất để tính điểm tin cậy.',
    },
};

export const getVendorConfidenceDisplay = (
    config: SystemConfigResponse
): VendorConfidenceDisplay => {
    return (
        VENDOR_CONFIDENCE_DISPLAY[config.configKey] || {
            label: VENDOR_SETTING_DISPLAY[config.configKey]?.label || config.configName || config.configKey,
            description: VENDOR_SETTING_DISPLAY[config.configKey]?.description || config.description,
        }
    );
};

const formatPercent = (value: number) => {
    const percent = value * 100;
    return `${percent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
};

/** Formats values for the operator view, not for persistence/API payloads. */
export const formatVendorConfigValue = (config: SystemConfigResponse): string => {
    const raw = config.configValue?.trim() || '';

    if (config.configKey === 'VENDOR_LATE_RETURN_POLICY') {
        const labels: Record<string, string> = {
            FORFEIT_DEPOSIT: 'Giữ lại tiền cọc',
            FORCE_PURCHASE_ALL: 'Tính mua toàn bộ vé',
        };
        return labels[raw] || raw;
    }

    const numeric = Number(raw);
    const isRatio =
        config.dataType === ConfigDataType.DECIMAL &&
        Number.isFinite(numeric) &&
        numeric >= 0 &&
        numeric <= 1 &&
        (config.unit === '%' ||
            config.configKey.endsWith('_WEIGHT') ||
            config.configKey.endsWith('_CAP_PERCENT'));

    if (isRatio) {
        return formatPercent(numeric);
    }

    const displayUnit = config.unit === 'batch' ? 'phiếu' : config.unit;
    return `${raw} ${displayUnit || ''}`.trim();
};
