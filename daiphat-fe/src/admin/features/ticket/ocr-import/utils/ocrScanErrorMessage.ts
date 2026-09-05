/**
 * Turn raw Spring / network OCR failures into Admin-facing Vietnamese copy.
 * BE should already return ErrorCode messages; this covers older responses and soft warnings.
 */
export const OCR_SERVICE_UNAVAILABLE_MESSAGE =
    'Dịch vụ quét vé OCR hiện không khả dụng. Vui lòng khởi động ticket-vision (cổng 8090), rồi thử lại.';

export const OCR_RATE_LIMIT_MESSAGE =
    'Dịch vụ AI đọc vé đang quá tải (giới hạn tốc độ Groq). Vui lòng đợi khoảng 15–30 giây rồi quét lại ảnh.';

export const isTechnicalOcrErrorMessage = (message?: string | null): boolean => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
        lower.includes('i/o error') ||
        lower.includes('connection refused') ||
        lower.includes('connect to http') ||
        lower.includes('resourceaccessexception') ||
        lower.includes('localhost:8090') ||
        lower.includes('getsockopt') ||
        /status code 503/i.test(message) ||
        /failed to fetch/i.test(message) ||
        /network error/i.test(message)
    );
};

export const isOcrRateLimitMessage = (message?: string | null): boolean => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
        lower.includes('rate limit') ||
        lower.includes('quá tải') ||
        lower.includes('http 429') ||
        lower.includes('otpm')
    );
};

export const normalizeOcrScanErrorMessage = (message?: string | null): string => {
    if (!message || !message.trim()) {
        return 'Không thể đọc rõ thông tin vé từ ảnh này. Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công.';
    }
    const trimmed = message.trim();
    if (isOcrRateLimitMessage(trimmed)) {
        return OCR_RATE_LIMIT_MESSAGE;
    }
    if (isTechnicalOcrErrorMessage(trimmed) || /status code \d+/i.test(trimmed)) {
        return OCR_SERVICE_UNAVAILABLE_MESSAGE;
    }
    return trimmed;
};

export const normalizeOcrWarningList = (warnings?: string[] | null): string[] => {
    if (!warnings?.length) return [];
    const out: string[] = [];
    let sawServiceDown = false;
    let sawRateLimit = false;
    for (const warning of warnings) {
        if (!warning?.trim()) continue;
        if (isOcrRateLimitMessage(warning)) {
            sawRateLimit = true;
            continue;
        }
        if (isTechnicalOcrErrorMessage(warning)) {
            sawServiceDown = true;
            continue;
        }
        if (!out.includes(warning.trim())) {
            out.push(warning.trim());
        }
    }
    if (sawRateLimit && !out.includes(OCR_RATE_LIMIT_MESSAGE)) {
        out.unshift(OCR_RATE_LIMIT_MESSAGE);
    }
    if (sawServiceDown && !out.includes(OCR_SERVICE_UNAVAILABLE_MESSAGE)) {
        out.unshift(OCR_SERVICE_UNAVAILABLE_MESSAGE);
    }
    return out;
};
