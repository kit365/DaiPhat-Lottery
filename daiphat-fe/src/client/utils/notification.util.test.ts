import { describe, expect, it } from 'vitest';
import { getNotificationPath } from './notification.util';
import { NOTIFICATION_REFERENCE_TYPE } from '../../types/notifications.type';

describe('notification.util — refund request deep link', () => {
    it('routes REFUND_REQUEST notifications to refund detail using referenceId', () => {
        const path = getNotificationPath({
            notificationId: 1,
            title: 'Yêu cầu hoàn tiền đã được gửi',
            content: '…',
            read: false,
            type: 'ORDER',
            channel: 'IN_APP',
            referenceType: NOTIFICATION_REFERENCE_TYPE.REFUND_REQUEST,
            referenceId: '100',
            createdAt: new Date().toISOString(),
        } as any);

        expect(path).toBe('/profile/refunds/100');
    });

    it('does not invent a path when referenceId is missing', () => {
        const path = getNotificationPath({
            notificationId: 2,
            title: 'Yêu cầu hoàn tiền đã được gửi',
            content: '…',
            read: false,
            type: 'ORDER',
            channel: 'IN_APP',
            referenceType: NOTIFICATION_REFERENCE_TYPE.REFUND_REQUEST,
            referenceId: null,
            createdAt: new Date().toISOString(),
        } as any);

        expect(path).toBeNull();
    });
});
