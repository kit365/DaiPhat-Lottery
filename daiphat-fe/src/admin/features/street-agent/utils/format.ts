export const formatCurrency = (value?: number | null) => {
    if (value == null) return "—";
    return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
};

export const formatVnd = (value?: number | null) => {
    if (value == null) return "—";
    return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
};

/**
 * Operator-facing unit for vendor allocation limits. The API still exposes
 * legacy `*DailyCap` keys, but the rule limits one open handover only.
 */
export const formatVendorHandoverLimit = (value?: number | null) => {
    if (value == null) return "—";
    return `${new Intl.NumberFormat("vi-VN").format(value)} vé/phiếu`;
};

export const formatConfidencePoints = (score?: number | null, tier?: string | null) => {
    if (score == null && !tier) return "—";
    const points =
        score == null
            ? null
            : score <= 1
              ? Math.round(score * 100)
              : Math.round(score);
    const pointsLabel = points == null ? "—" : `${points} điểm`;
    return tier ? `${pointsLabel} · ${tier}` : pointsLabel;
};

export const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
};

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

const todayInVietnam = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: VIETNAM_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? "";

    return `${get("year")}-${get("month")}-${get("day")}`;
};

export type StreetAgentPendingNotice = {
    message: string;
    actionLabel: string;
};

/**
 * Converts the most common PENDING state into operator-facing copy.
 * The server remains the source of truth for eligibility; this only explains
 * the already returned profile data and never changes allocation behaviour.
 */
export const getStreetAgentPendingNotice = (profile?: {
    contractDocumentUrl?: string | null;
    contractCode?: string | null;
    contractStartDate?: string | null;
    contractEndDate?: string | null;
    contractMaxDailyCap?: number | null;
} | null): StreetAgentPendingNotice => {
    if (!profile?.contractDocumentUrl) {
        return {
            message: "Hồ sơ chưa có bản hợp đồng đã ký. Hãy hoàn thiện và tải bản ký lên để tiếp tục.",
            actionLabel: "Hoàn thiện hợp đồng",
        };
    }

    const today = todayInVietnam();
    if (profile.contractStartDate && profile.contractStartDate > today) {
        return {
            message: `Bản ký đã được lưu. Hợp đồng bắt đầu có hiệu lực từ ngày ${formatDate(profile.contractStartDate)}; hồ sơ sẽ nhận vé từ ngày này.`,
            actionLabel: "Xem / điều chỉnh hồ sơ",
        };
    }

    if (profile.contractEndDate && profile.contractEndDate < today) {
        return {
            message: `Hợp đồng đã hết hiệu lực từ ngày ${formatDate(profile.contractEndDate)}. Hãy cập nhật thời hạn và tải lại bản ký mới.`,
            actionLabel: "Xem / điều chỉnh hồ sơ",
        };
    }

    if (
        !profile.contractCode ||
        !profile.contractStartDate ||
        !profile.contractEndDate ||
        !profile.contractMaxDailyCap ||
        profile.contractMaxDailyCap <= 0
    ) {
        return {
            message: "Hồ sơ đã có bản ký nhưng còn thiếu thông tin hợp đồng cần thiết để nhận vé.",
            actionLabel: "Xem / điều chỉnh hồ sơ",
        };
    }

    return {
        message: "Bản ký đã được lưu. Hồ sơ đang chờ hệ thống hoàn tất kiểm tra điều kiện nhận vé.",
        actionLabel: "Xem / điều chỉnh hồ sơ",
    };
};

export const formatCommission = (value?: number | null) => {
    if (value == null) return "—";
    return `${(value * 100).toFixed(2)}%`;
};

export const formatPercent = (value?: number | null, fractionDigits = 0) => {
    if (value == null) return "—";
    return `${Number(value).toFixed(fractionDigits)}%`;
};

export const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(date);
};

export const formatCountdown = (expiresAt?: string | null, nowMs = Date.now()) => {
    if (!expiresAt) return "—";
    const expiresMs = new Date(expiresAt).getTime();
    if (Number.isNaN(expiresMs)) return "—";
    const remainingSec = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
    const minutes = Math.floor(remainingSec / 60);
    const seconds = remainingSec % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
