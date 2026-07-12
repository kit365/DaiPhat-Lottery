/**
 * Định nghĩa bảng màu cao cấp cho Tab Badges theo thiết kế
 */
export const BADGE_COLOR_PALETTE = {
    all: {
        selected: { bg: '#1C252E', text: '#FFFFFF' },
        unselected: { bg: 'rgba(145, 158, 171, 0.16)', text: '#637381' }
    },
    success: { // ACTIVE, COMPLETED, DELIVERED
        selected: { bg: '#00A76F', text: '#FFFFFF' },
        unselected: { bg: 'rgba(0, 167, 111, 0.16)', text: '#007867' }
    },
    warning: { // PENDING, WAITING
        selected: { bg: '#FFAB00', text: '#1C252E' },
        unselected: { bg: 'rgba(255, 171, 0, 0.16)', text: '#B76E00' }
    },
    error: { // CANCELLED, REJECTED, BANNED, LOCKED, FAILED
        selected: { bg: '#FF5630', text: '#FFFFFF' },
        unselected: { bg: 'rgba(255, 86, 48, 0.16)', text: '#B71D18' }
    },
    info: { // PUBLISHED, SHIPPING, INFO
        selected: { bg: '#00B8D9', text: '#FFFFFF' },
        unselected: { bg: 'rgba(0, 184, 217, 0.16)', text: '#006C9C' }
    },
    neutral: { // DRAFT, ARCHIVED, DELETED
        selected: { bg: '#454F5B', text: '#FFFFFF' },
        unselected: { bg: 'rgba(145, 158, 171, 0.16)', text: '#637381' }
    }
};

export type BadgeColorVariant = keyof typeof BADGE_COLOR_PALETTE;

// Ánh xạ các trạng thái nghiệp vụ sang mã màu tương ứng
export const STATUS_TO_VARIANT_MAP: Record<string, BadgeColorVariant> = {
    // Trạng thái chung & Hệ thống
    all: 'all',
    ALL: 'all',
    
    // Thành công / Hoạt động
    ACTIVE: 'success',
    active: 'success',
    COMPLETED: 'success',
    completed: 'success',
    DELIVERED: 'success',
    delivered: 'success',
    
    // Đang xử lý / Chờ duyệt
    PENDING: 'warning',
    pending: 'warning',
    WAITING: 'warning',
    waiting: 'warning',
    
    // Bị hủy / Khóa / Cấm
    CANCELLED: 'error',
    cancelled: 'error',
    REJECTED: 'error',
    rejected: 'error',
    BANNED: 'error',
    banned: 'error',
    LOCKED: 'error',
    locked: 'error',
    FAILED: 'error',
    failed: 'error',
    
    // Xuất bản / Thông tin
    PUBLISHED: 'info',
    published: 'info',
    SHIPPING: 'info',
    shipping: 'info',
    
    // Bản nháp / Trung tính
    DRAFT: 'neutral',
    draft: 'neutral',
    ARCHIVED: 'neutral',
    archived: 'neutral',
    UNPUBLISHED: 'error',
    unpublished: 'error',
    SCHEDULED: 'info',
    scheduled: 'info',
    DELETED: 'neutral',
    deleted: 'neutral',
};

/**
 * Lấy style (backgroundColor & color) cho Tab Badge dựa trên trạng thái hoặc mã màu
 * @param statusOrVariant Trạng thái nghiệp vụ (ví dụ: 'ACTIVE', 'PENDING') hoặc tên mã màu ('success', 'warning')
 * @param isSelected Trạng thái tab đang được chọn hay không
 */
export const getTabBadgeStyles = (statusOrVariant: string, isSelected: boolean) => {
    const variant = STATUS_TO_VARIANT_MAP[statusOrVariant] || (BADGE_COLOR_PALETTE[statusOrVariant as BadgeColorVariant] ? statusOrVariant as BadgeColorVariant : 'neutral');
    
    const colors = BADGE_COLOR_PALETTE[variant];
    const state = isSelected ? colors.selected : colors.unselected;
    
    return {
        backgroundColor: state.bg,
        color: state.text,
        transition: 'all 0.2s'
    };
};
