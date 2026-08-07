import { ROUTES } from '../../../constants/routes';
import type { AdminNotificationItem } from '../types/notification.type';

type NotificationNavInput = Pick<
    AdminNotificationItem,
    'type' | 'referenceId' | 'referenceType'
>;

export const getAdminNotificationPath = (
    notification: NotificationNavInput
): string | null => {
    const referenceId = notification.referenceId?.trim();
    const referenceType = notification.referenceType?.trim().toUpperCase();

    if (!referenceId || !referenceType) {
        return null;
    }

    switch (referenceType) {
        case 'BLOG_POST':
            return `${ROUTES.ADMIN.BLOGS.DETAIL}${referenceId}`;
        case 'ORDER':
            if (/^\d+$/.test(referenceId)) {
                return `${ROUTES.ADMIN.REFUNDS.DETAIL}${referenceId}`;
            }
            return `${ROUTES.ADMIN.ORDERS.DETAIL}${referenceId}`;
        case 'REFUND':
        case 'REFUND_REQUEST':
            return `${ROUTES.ADMIN.REFUNDS.DETAIL}${referenceId}`;
        default:
            return null;
    }
};

export const getAdminNotificationCategoryLabel = (
    notification: NotificationNavInput
): string => {
    switch (notification.type?.trim().toLowerCase()) {
        case 'blog':
            return 'Bài viết';
        case 'order':
            return 'Đơn hàng';
        case 'ticketserviceorder':
            return 'Dịch vụ';
        case 'boarding':
            return 'Khách sạn';
        case 'overrun':
        case 'system':
            return 'Hệ thống';
        default:
            return 'Thông báo';
    }
};

export const getAdminNotificationIcon = (notification: NotificationNavInput): string => {
    switch (notification.type?.trim().toLowerCase()) {
        case 'blog':
            return 'solar:document-text-bold-duotone';
        case 'order':
            return 'solar:cart-large-2-bold-duotone';
        case 'ticketserviceorder':
            return 'solar:calendar-mark-bold-duotone';
        case 'boarding':
            return 'solar:home-bold-duotone';
        case 'overrun':
        case 'system':
            return 'solar:danger-bold-duotone';
        default:
            return 'solar:bell-bold-duotone';
    }
};

export const getAdminNotificationAccentColor = (
    notification: NotificationNavInput
): string => {
    switch (notification.type?.trim().toLowerCase()) {
        case 'blog':
            return '#7A0916';
        case 'order':
            return '#FF3030';
        case 'boarding':
            return '#FFAB00';
        case 'overrun':
        case 'system':
            return '#FF5630';
        default:
            return '#00B8D9';
    }
};

export const getAdminNotificationAccentBackground = (
    notification: NotificationNavInput
): string => {
    switch (notification.type?.trim().toLowerCase()) {
        case 'blog':
            return 'rgba(122, 9, 22, 0.12)';
        case 'order':
            return 'rgba(255, 48, 48, 0.12)';
        case 'ticketserviceorder':
            return 'rgba(0, 184, 217, 0.12)';
        case 'boarding':
            return 'rgba(255, 171, 0, 0.12)';
        case 'overrun':
        case 'system':
            return 'rgba(255, 86, 48, 0.12)';
        default:
            return 'rgba(145, 158, 171, 0.12)';
    }
};
