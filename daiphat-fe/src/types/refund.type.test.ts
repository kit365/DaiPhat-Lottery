import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { OrderStatus } from './order.type';
import {
    canShowRefundRequest,
    computeRefundSecondsLeft,
    formatRefundCountdown,
    isRefundWindowOpen,
    resolveRefundAmount,
    calculateOrderRefundAmount,
} from './refund.type';

describe('refund.type — Cancel Order & Refund helpers', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-12T10:00:00+07:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('computeRefundSecondsLeft / countdown', () => {
        it('computes remaining seconds from refundDeadlineAt', () => {
            const seconds = computeRefundSecondsLeft('2026-07-12T10:05:00+07:00');
            expect(seconds).toBe(300);
        });

        it('returns 0 when deadline has passed', () => {
            const seconds = computeRefundSecondsLeft('2026-07-12T09:59:00+07:00');
            expect(seconds).toBe(0);
        });

        it('falls back to paymentSuccessAt + graceMinutes', () => {
            const seconds = computeRefundSecondsLeft(
                null,
                '2026-07-12T09:40:00+07:00',
                30
            );
            expect(seconds).toBe(600);
        });

        it('formats countdown as MM phút SS giây', () => {
            expect(formatRefundCountdown(125)).toBe('02 phút 05 giây');
            expect(formatRefundCountdown(0)).toBe('00 phút 00 giây');
        });
    });

    describe('isRefundWindowOpen / canShowRefundRequest', () => {
        it('marks window open when remaining seconds > 0', () => {
            expect(
                isRefundWindowOpen({
                    refundDeadlineAt: '2026-07-12T10:10:00+07:00',
                })
            ).toBe(true);
        });

        it('hides refund UI when a pending refund already exists', () => {
            expect(
                canShowRefundRequest(
                    {
                        status: OrderStatus.PAID,
                        refundEligible: true,
                        refundRemainingSeconds: 100,
                    },
                    true
                )
            ).toBe(false);
        });

        it('shows refund UI for eligible PAID order', () => {
            expect(
                canShowRefundRequest({
                    status: OrderStatus.PAID,
                    refundEligible: true,
                })
            ).toBe(true);
        });

        it('hides refund UI for COMPLETED order', () => {
            expect(
                canShowRefundRequest({
                    status: OrderStatus.COMPLETED,
                    refundEligible: true,
                })
            ).toBe(false);
        });
    });

    describe('refund amount resolution', () => {
        it('prefers eligibility totalRefundAmount', () => {
            expect(
                resolveRefundAmount({ totalRefundAmount: 35000 }, { totalAmount: 20000 })
            ).toBe(35000);
        });

        it('sums order detail line amounts when eligibility missing', () => {
            expect(
                calculateOrderRefundAmount({
                    totalAmount: 99999,
                    orderDetails: [
                        { price: 10000, quantity: 2 },
                        { price: 5000, quantity: 1 },
                    ],
                })
            ).toBe(25000);
        });
    });
});
