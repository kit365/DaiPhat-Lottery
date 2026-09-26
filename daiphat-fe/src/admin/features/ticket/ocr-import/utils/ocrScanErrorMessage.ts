/**
 * Turn raw Spring / network OCR failures and English LLM soft-warnings into
 * Admin-facing Vietnamese copy with a clear next action.
 */
export const OCR_SERVICE_UNAVAILABLE_MESSAGE =
    'Dịch vụ nhận diện vé (OCR) hiện đang gián đoạn hoặc chưa sẵn sàng kết nối. Vui lòng thử lại sau giây lát hoặc liên hệ quản trị viên.';

export const OCR_RATE_LIMIT_MESSAGE =
    'Dịch vụ nhận diện vé đang bận xử lý nhiều yêu cầu cùng lúc. Vui lòng đợi khoảng 15–30 giây rồi thực hiện lại.';

export const OCR_TIMEOUT_MESSAGE =
    'Quét OCR mất quá nhiều thời gian (ảnh nhiều vé hoặc xử lý AI chậm). Vui lòng đợi 10–20 giây rồi quét lại từng ảnh, hoặc tách ảnh nhiều vé thành ảnh riêng.';

export const OCR_IMAGE_TOO_HEAVY_MESSAGE =
    'Ảnh quá nặng so với giới hạn tải lên / OCR. Vui lòng chụp gần hơn, ít nền hơn, hoặc giảm độ phân giải rồi quét lại.';

export const OCR_SOFT_FAIL_MESSAGE =
    'Không thể đọc rõ thông tin vé từ ảnh này. Vui lòng kiểm tra lại ảnh (đủ sáng, không bị che) hoặc nhập thông tin thủ công.';

const TICKET_INDEX_RE = /ticket\s*#?\s*(\d+)/i;

const FIELD_HINTS: Array<{ en: RegExp; vi: string }> = [
    { en: /serial/i, vi: 'số seri' },
    { en: /number/i, vi: 'dãy số' },
    { en: /station/i, vi: 'tên đài' },
    { en: /date|draw/i, vi: 'ngày quay' },
    { en: /price|ticket\s*type/i, vi: 'mệnh giá' },
    { en: /batch/i, vi: 'mã lô phát hành' },
];

export const isTechnicalOcrErrorMessage = (message?: string | null): boolean => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
        lower.includes('i/o error') ||
        lower.includes('connection refused') ||
        lower.includes('connect to http') ||
        lower.includes('resourceaccessexception') ||
        lower.includes('localhost:8090') ||
        lower.includes('ticket-vision') ||
        lower.includes('cổng 8090') ||
        lower.includes('8090') ||
        lower.includes('lt_122') ||
        lower.includes('getsockopt') ||
        /status code 502/i.test(message) ||
        /status code 503/i.test(message) ||
        /status code 504/i.test(message) ||
        /failed to fetch/i.test(message) ||
        /network error/i.test(message) ||
        /econnrefused/i.test(message) ||
        /enotfound/i.test(message)
    );
};

export const isOcrTimeoutMessage = (message?: string | null): boolean => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
        lower.includes('timeout of') ||
        lower.includes('timed out') ||
        lower.includes('mất quá nhiều thời gian') ||
        lower.includes('phản hồi quá chậm') ||
        lower.includes('quá thời gian chờ') ||
        /status code 504/i.test(message) ||
        /http 504/i.test(message)
    );
};

/** Proxy used to mislabel OCR deadlines as "cannot connect to API". */
export const isMislabelledProxyTimeoutMessage = (message?: string | null): boolean => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
        lower.includes('không kết nối được máy chủ api') ||
        lower.includes('kiểm tra backend đang chạy')
    );
};

export const isOcrImageTooHeavyMessage = (message?: string | null): boolean => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
        lower.includes('too large') ||
        lower.includes('quá nặng') ||
        lower.includes('vượt quá kích thước') ||
        lower.includes('vượt quá dung lượng') ||
        lower.includes('payload') ||
        lower.includes('itpm') ||
        lower.includes('token budget') ||
        /status code 413/i.test(message) ||
        /http 413/i.test(message)
    );
};

export const isOcrRateLimitMessage = (message?: string | null): boolean => {
    if (!message) return false;
    const lower = message.toLowerCase();
    // Already handled by local OCR fallback — do not treat as transient RPM.
    if (
        lower.includes('hạn mức token') ||
        lower.includes('ocr local') ||
        lower.includes('chuyển sang ocr') ||
        lower.includes('quota/token')
    ) {
        return false;
    }
    return (
        lower.includes('rate limit') ||
        lower.includes('quá tải') ||
        lower.includes('http 429') ||
        lower.includes('otpm')
    );
};

const looksVietnamese = (text: string): boolean =>
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
        text
    ) ||
    /\b(vé|seri|dãy số|nhà đài|chụp|quét lại|thủ công)\b/i.test(text);

const DAY_OF_WEEK_MAP: Record<string, string> = {
    MONDAY: 'Thứ Hai',
    TUESDAY: 'Thứ Ba',
    WEDNESDAY: 'Thứ Tư',
    THURSDAY: 'Thứ Năm',
    FRIDAY: 'Thứ Sáu',
    SATURDAY: 'Thứ Bảy',
    SUNDAY: 'Chủ Nhật',
};

export const formatVietnameseErrorMessage = (message?: string | null): string => {
    if (!message) return '';
    let text = message;
    for (const [enDay, viDay] of Object.entries(DAY_OF_WEEK_MAP)) {
        const regex = new RegExp(`\\b${enDay}\\b`, 'gi');
        text = text.replace(regex, viDay);
    }
    // Replace ISO dates (YYYY-MM-DD) with DD/MM/YYYY
    text = text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1');
    // Replace "ngày OCR" with "ngày"
    text = text.replace(/ngày OCR\s*/gi, 'ngày ');
    // Remove technical rule references
    text = text.replace(/\(rule\s+[^)]+\)/gi, '');
    return text.trim();
};

const localizeEnglishOcrWarning = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed) {
        return OCR_SOFT_FAIL_MESSAGE;
    }
    if (looksVietnamese(trimmed)) {
        return formatVietnameseErrorMessage(trimmed);
    }

    const ticketMatch = TICKET_INDEX_RE.exec(trimmed);
    const ticketLabel = ticketMatch ? `Vé #${ticketMatch[1]}` : 'Một vé trong ảnh';

    let fieldVi: string | null = null;
    for (const hint of FIELD_HINTS) {
        if (hint.en.test(trimmed)) {
            fieldVi = hint.vi;
            break;
        }
    }

    const covered =
        /cover|obscur|overlap|hidden|not clearly|unreadable|blur|glare|cut\s*off/i.test(
            trimmed
        );

    if (covered && fieldVi) {
        return (
            `${ticketLabel}: ${fieldVi} bị che hoặc không rõ. ` +
            'Hãy tách các vé chồng nhau hoặc chụp lại gần hơn, rồi quét lại.'
        );
    }
    if (covered) {
        return (
            `${ticketLabel}: một số thông tin bị che hoặc không rõ. ` +
            'Hãy tách vé / chỉnh góc chụp rồi quét lại.'
        );
    }
    if (/no ticket|not detect|could not find/i.test(trimmed)) {
        return (
            'Không phát hiện được vé trong ảnh. ' +
            'Vui lòng chụp rõ toàn bộ tờ vé (đủ ánh sáng, không bị cắt) rồi quét lại.'
        );
    }
    if (/model|unavailable|not_found|groq/i.test(trimmed)) {
        return (
            'Model AI đọc vé hiện không khả dụng. ' +
            'Vui lòng kiểm tra cấu hình GROQ_VISION_MODEL hoặc thử lại sau.'
        );
    }
    if (/[A-Za-z]{4,}/.test(trimmed)) {
        return (
            `${ticketLabel}: nhận diện chưa đầy đủ. ` +
            'Vui lòng kiểm tra ảnh hoặc nhập thủ công các trường còn thiếu.'
        );
    }
    return formatVietnameseErrorMessage(trimmed);
};

export const isOcrLegacyFallbackMessage = (message?: string | null): boolean => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
        lower.includes('ocr local') ||
        lower.includes('chuyển sang ocr') ||
        lower.includes('legacy') ||
        lower.includes('tạm nghỉ sau khi hết hạn mức') ||
        lower.includes('hạn mức quét ai') ||
        lower.includes('hệ thống dùng ocr') ||
        lower.includes('hệ thống chuyển sang ocr')
    );
};

export const normalizeOcrScanErrorMessage = (message?: string | null): string => {
    if (!message || !message.trim()) {
        return OCR_SOFT_FAIL_MESSAGE;
    }
    const trimmed = message.trim();
    if (isOcrLegacyFallbackMessage(trimmed)) {
        return OCR_SOFT_FAIL_MESSAGE;
    }
    if (isOcrRateLimitMessage(trimmed)) {
        return OCR_RATE_LIMIT_MESSAGE;
    }
    if (isOcrImageTooHeavyMessage(trimmed)) {
        return OCR_IMAGE_TOO_HEAVY_MESSAGE;
    }
    if (isOcrTimeoutMessage(trimmed)) {
        return OCR_TIMEOUT_MESSAGE;
    }
    // Legacy proxy abort used this connection copy for OCR deadlines (504).
    if (isMislabelledProxyTimeoutMessage(trimmed)) {
        return OCR_TIMEOUT_MESSAGE;
    }
    if (isTechnicalOcrErrorMessage(trimmed)) {
        return OCR_SERVICE_UNAVAILABLE_MESSAGE;
    }
    // Generic HTTP errors that are not connectivity — keep soft-fail copy, not "service down".
    if (/status code \d+/i.test(trimmed) || /http \d{3}/i.test(trimmed)) {
        return OCR_SOFT_FAIL_MESSAGE;
    }
    return localizeEnglishOcrWarning(trimmed);
};

export const normalizeOcrWarningList = (warnings?: string[] | null): string[] => {
    if (!warnings?.length) return [];
    const out: string[] = [];
    let sawServiceDown = false;
    let sawRateLimit = false;
    let sawTooHeavy = false;
    let sawTimeout = false;
    for (const warning of warnings) {
        if (!warning?.trim()) continue;
        if (isOcrLegacyFallbackMessage(warning)) {
            continue;
        }
        if (isOcrRateLimitMessage(warning)) {
            sawRateLimit = true;
            continue;
        }
        if (isOcrImageTooHeavyMessage(warning)) {
            sawTooHeavy = true;
            continue;
        }
        if (isOcrTimeoutMessage(warning) || isMislabelledProxyTimeoutMessage(warning)) {
            sawTimeout = true;
            continue;
        }
        if (isTechnicalOcrErrorMessage(warning)) {
            sawServiceDown = true;
            continue;
        }
        const mapped = localizeEnglishOcrWarning(warning.trim());
        if (!out.includes(mapped)) {
            out.push(mapped);
        }
    }
    if (sawRateLimit && !out.includes(OCR_RATE_LIMIT_MESSAGE)) {
        out.unshift(OCR_RATE_LIMIT_MESSAGE);
    }
    if (sawTimeout && !out.includes(OCR_TIMEOUT_MESSAGE)) {
        out.unshift(OCR_TIMEOUT_MESSAGE);
    }
    if (sawTooHeavy && !out.includes(OCR_IMAGE_TOO_HEAVY_MESSAGE)) {
        out.unshift(OCR_IMAGE_TOO_HEAVY_MESSAGE);
    }
    if (sawServiceDown && !out.includes(OCR_SERVICE_UNAVAILABLE_MESSAGE)) {
        out.unshift(OCR_SERVICE_UNAVAILABLE_MESSAGE);
    }
    return out;
};

/** Format multi-warning toast: numbered lines instead of opaque " · " joins. */
export const formatOcrWarningsForToast = (warnings: string[]): string => {
    if (warnings.length === 0) {
        return '';
    }
    if (warnings.length === 1) {
        return warnings[0];
    }
    return warnings.map((warning, index) => `${index + 1}. ${warning}`).join('\n');
};
