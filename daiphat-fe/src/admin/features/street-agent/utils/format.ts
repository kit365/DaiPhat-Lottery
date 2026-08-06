export const formatCurrency = (value?: number | null) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("vi-VN").format(value) + " VNĐ";
};

export const formatVnd = (value?: number | null) => {
    if (value == null) return "—";
    return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
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
