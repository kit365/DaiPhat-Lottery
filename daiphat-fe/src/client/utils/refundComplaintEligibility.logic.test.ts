import { describe, expect, it } from 'vitest';
import { RefundRequestStatus } from '../../types/refund.type';
import {
    REFUND_COMPLAINT_CATEGORY_PAID_ISSUE,
    REFUND_COMPLAINT_CATEGORY_SLOW_PROCESSING,
    resolveRefundComplaintEligibility,
} from './refundComplaintEligibility.logic';

const NOW = new Date('2026-07-17T12:00:00').getTime();

describe('resolveRefundComplaintEligibility', () => {
    it('allows slow processing complaint after wait hours', () => {
        const result = resolveRefundComplaintEligibility(
            {
                status: RefundRequestStatus.READY_TO_PAY,
                updatedAt: '2026-07-15T10:00:00',
            },
            {},
            NOW
        );

        expect(result.eligible).toBe(true);
        expect(result.categoryCode).toBe(REFUND_COMPLAINT_CATEGORY_SLOW_PROCESSING);
    });

    it('rejects slow processing complaint before wait hours', () => {
        const result = resolveRefundComplaintEligibility(
            {
                status: RefundRequestStatus.WAITING_FOR_INFO,
                updatedAt: '2026-07-17T08:00:00',
            },
            {},
            NOW
        );

        expect(result.eligible).toBe(false);
        expect(result.reasonCode).toBe('too_early');
    });

    it('allows paid issue complaint within grace days', () => {
        const result = resolveRefundComplaintEligibility(
            {
                status: RefundRequestStatus.PAID,
                updatedAt: '2026-07-15T10:00:00',
            },
            {},
            NOW
        );

        expect(result.eligible).toBe(true);
        expect(result.categoryCode).toBe(REFUND_COMPLAINT_CATEGORY_PAID_ISSUE);
    });

    it('rejects paid issue complaint after grace days', () => {
        const result = resolveRefundComplaintEligibility(
            {
                status: RefundRequestStatus.PAID,
                updatedAt: '2026-07-08T10:00:00',
            },
            {},
            NOW
        );

        expect(result.eligible).toBe(false);
        expect(result.reasonCode).toBe('window_expired');
    });

    it('rejects manual resolution complaints', () => {
        const result = resolveRefundComplaintEligibility(
            {
                status: RefundRequestStatus.MANUAL_RESOLUTION,
                updatedAt: '2026-07-16T10:00:00',
            },
            {},
            NOW
        );

        expect(result.eligible).toBe(false);
        expect(result.reasonCode).toBe('status_invalid');
    });
});
