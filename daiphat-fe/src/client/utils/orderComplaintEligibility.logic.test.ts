import { describe, expect, it } from 'vitest';
import { ORDER_COMPLAINT_CATEGORY_CODES } from '../../types/support.type';

describe('order complaint category contracts', () => {
    it('exposes the order complaint category codes used by backend', () => {
        expect(ORDER_COMPLAINT_CATEGORY_CODES.PAYMENT_SYNC_ERROR).toBe('PAYMENT_SYNC_ERROR');
        expect(ORDER_COMPLAINT_CATEGORY_CODES.ORDER_PREPARATION_DELAY).toBe('ORDER_PREPARATION_DELAY');
        expect(ORDER_COMPLAINT_CATEGORY_CODES.ORDER_PICKUP_ISSUE).toBe('ORDER_PICKUP_ISSUE');
        expect(ORDER_COMPLAINT_CATEGORY_CODES.ORDER_SERVICE_QUALITY).toBe('ORDER_SERVICE_QUALITY');
        expect(ORDER_COMPLAINT_CATEGORY_CODES.ORDER_CANCELLED_OUT_OF_STOCK).toBe('ORDER_CANCELLED_OUT_OF_STOCK');
    });
});
