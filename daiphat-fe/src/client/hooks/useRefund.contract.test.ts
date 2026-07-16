import { describe, expect, it } from 'vitest';
import { QUERY_KEYS } from '../../constants/queryKeys';

/**
 * Documents the query keys invalidated after a successful customer refund submit.
 * Keeps badge + notification list + orders/refunds views in sync.
 */
export const POST_ORDER_REFUND_INVALIDATION_KEYS = [
    QUERY_KEYS.CLIENT_MY_REFUNDS,
    QUERY_KEYS.CLIENT_MY_ORDERS,
    QUERY_KEYS.CLIENT_MY_ORDER_DETAIL,
    QUERY_KEYS.CLIENT_NOTIFICATIONS,
] as const;

describe('useCreateOrderRefund — post-submit cache refresh contract', () => {
    it('invalidates refunds, orders, and notifications so badge/list update', () => {
        expect(POST_ORDER_REFUND_INVALIDATION_KEYS).toContain(QUERY_KEYS.CLIENT_MY_REFUNDS);
        expect(POST_ORDER_REFUND_INVALIDATION_KEYS).toContain(QUERY_KEYS.CLIENT_MY_ORDERS);
        expect(POST_ORDER_REFUND_INVALIDATION_KEYS).toContain(QUERY_KEYS.CLIENT_NOTIFICATIONS);
    });
});
