import { describe, expect, it } from 'vitest';
import { PrizePayoutRequestStatus } from '../../types/prize-payout.type';
import {
    PRIZE_PAYOUT_COMPLAINT_CATEGORY_PAID_ISSUE,
    PRIZE_PAYOUT_COMPLAINT_CATEGORY_SLOW_PROCESSING,
    resolvePrizePayoutComplaintEligibility,
} from './prizePayoutComplaintEligibility.logic';

const now = Date.parse('2026-08-02T12:00:00+07:00');

describe('resolvePrizePayoutComplaintEligibility', () => {
    it('allows PENDING after wait hours', () => {
        const result = resolvePrizePayoutComplaintEligibility(
            {
                status: PrizePayoutRequestStatus.PENDING,
                updatedAt: '2026-07-31T11:00:00+07:00',
            },
            {},
            now
        );
        expect(result.eligible).toBe(true);
        expect(result.categoryCode).toBe(PRIZE_PAYOUT_COMPLAINT_CATEGORY_SLOW_PROCESSING);
    });

    it('blocks PENDING before wait hours', () => {
        const result = resolvePrizePayoutComplaintEligibility(
            {
                status: PrizePayoutRequestStatus.PENDING,
                updatedAt: '2026-08-02T10:00:00+07:00',
            },
            {},
            now
        );
        expect(result.eligible).toBe(false);
        expect(result.reasonCode).toBe('too_early');
    });

    it('allows COMPLETED within grace using completedAt', () => {
        const result = resolvePrizePayoutComplaintEligibility(
            {
                status: PrizePayoutRequestStatus.COMPLETED,
                updatedAt: '2026-07-20T12:00:00+07:00',
                completedAt: '2026-08-01T12:00:00+07:00',
            },
            {},
            now
        );
        expect(result.eligible).toBe(true);
        expect(result.categoryCode).toBe(PRIZE_PAYOUT_COMPLAINT_CATEGORY_PAID_ISSUE);
    });

    it('blocks COMPLETED past grace from completedAt', () => {
        const result = resolvePrizePayoutComplaintEligibility(
            {
                status: PrizePayoutRequestStatus.COMPLETED,
                completedAt: '2026-07-10T12:00:00+07:00',
            },
            {},
            now
        );
        expect(result.eligible).toBe(false);
        expect(result.reasonCode).toBe('window_expired');
    });

    it('allows COMPLETED within configured 15-day grace', () => {
        const result = resolvePrizePayoutComplaintEligibility(
            {
                status: PrizePayoutRequestStatus.COMPLETED,
                completedAt: '2026-07-20T12:00:00+07:00',
            },
            { graceDays: 15 },
            now
        );
        expect(result.eligible).toBe(true);
        expect(result.categoryCode).toBe(PRIZE_PAYOUT_COMPLAINT_CATEGORY_PAID_ISSUE);
    });

    it('blocks MANUAL_RESOLUTION', () => {
        const result = resolvePrizePayoutComplaintEligibility(
            { status: PrizePayoutRequestStatus.MANUAL_RESOLUTION },
            {},
            now
        );
        expect(result.eligible).toBe(false);
        expect(result.reasonCode).toBe('status_invalid');
    });
});
