export const DRAW_RESULT_STATUS_LABELS: Record<string, string> = {
    pending: 'Chờ lấy',
    drawing: 'Đang cập nhật',
    waiting_for_audit: 'Chờ duyệt',
    completed: 'Hoàn tất',
    failed: 'Thất bại',
};

export const getDrawResultStatusLabel = (status?: string) => {
    const key = String(status || '').toLowerCase();
    return DRAW_RESULT_STATUS_LABELS[key] || status || '—';
};

export const getDrawResultStatusBadgeClass = (status?: string) => {
    switch (String(status || '').toLowerCase()) {
        case 'pending':
            return 'admin-status-badge--draft';
        case 'drawing':
            return 'admin-status-badge--active';
        case 'waiting_for_audit':
            return 'admin-status-badge--pending';
        case 'completed':
            return 'admin-status-badge--success';
        case 'failed':
            return 'admin-status-badge--inactive';
        default:
            return 'admin-status-badge--draft';
    }
};
