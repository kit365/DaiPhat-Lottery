export const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Hoạt động',
    INACTIVE: 'Ngưng hoạt động',
    PENDING: 'Chờ xử lý',
};

export const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'ACTIVE', label: STATUS_LABELS.ACTIVE },
    { value: 'INACTIVE', label: STATUS_LABELS.INACTIVE },
    { value: 'PENDING', label: STATUS_LABELS.PENDING },
];

export const CONFIDENCE_TIER_LABELS: Record<string, string> = {
    NEW: 'Mới',
    DEVELOPING: 'Đang phát triển',
    ESTABLISHED: 'Ổn định',
    TRUSTED: 'Tin cậy',
};

export const LUCKY_PATTERN_TYPE_LABELS: Record<string, string> = {
    EXACT: 'Số khớp chính xác',
    DIGIT_MATCH: 'Khớp theo cụm số',
};

export const LUCKY_MATCH_POSITION_LABELS: Record<string, string> = {
    PREFIX: 'Đầu số',
    SUFFIX: 'Cuối số',
    ANYWHERE: 'Bất kỳ vị trí',
};

export const BLOCKED_REASON_LABELS: Record<string, string> = {
    LUCKY_PATTERN: 'Số đẹp — cần override',
    COUNTER_RESERVE: 'Chừa cho quầy',
    DRAW_TIME_PASSED: 'Đã qua giờ xổ — không còn vé để bàn giao',
    DATE_NOT_SCHEDULED: 'Ngày này không có đài xổ',
    NO_ELIGIBLE_INVENTORY: 'Không còn vé hợp lệ trong kho',
    DAILY_CAP_EXHAUSTED: 'Hạn mức giao vé trong ngày đã dùng hết',
};

export const ALLOCATION_BATCH_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Nháp',
    CONFIRMED: 'Đã bàn giao',
    RETURN_OPEN: 'Đang trả vé',
    SETTLED: 'Đã quyết toán',
    LATE_SETTLED: 'Quyết toán muộn',
    CANCELLED: 'Đã hủy',
    EXPIRED: 'Hết hạn giữ chỗ',
};

export const ALLOCATION_BATCH_STATUS_FILTER_OPTIONS = [
    { value: 'DRAFT', label: ALLOCATION_BATCH_STATUS_LABELS.DRAFT },
    { value: 'CONFIRMED', label: ALLOCATION_BATCH_STATUS_LABELS.CONFIRMED },
    { value: 'RETURN_OPEN', label: ALLOCATION_BATCH_STATUS_LABELS.RETURN_OPEN },
    { value: 'SETTLED', label: ALLOCATION_BATCH_STATUS_LABELS.SETTLED },
    { value: 'EXPIRED', label: ALLOCATION_BATCH_STATUS_LABELS.EXPIRED },
    { value: 'CANCELLED', label: ALLOCATION_BATCH_STATUS_LABELS.CANCELLED },
    { value: 'LATE_SETTLED', label: ALLOCATION_BATCH_STATUS_LABELS.LATE_SETTLED },
];
