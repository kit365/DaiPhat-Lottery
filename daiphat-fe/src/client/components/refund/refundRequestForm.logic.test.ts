import { describe, expect, it } from 'vitest';
import {
    REFUND_REASON_SUGGESTIONS,
    applyRefundReasonSuggestion,
    canOpenRefundRequestDetailFromNotification,
    isRefundSubmitBlocked,
    resolveRefundBlockedMessage,
    validateRefundSubmitFields,
} from './refundRequestForm.logic';

describe('RefundRequestModal form logic', () => {
    describe('open dialog prerequisites — required fields', () => {
        it('requires refund reason', () => {
            const result = validateRefundSubmitFields({
                refundReason: '   ',
                bankAccountId: 1,
            });
            expect(result).toEqual({
                ok: false,
                message: 'Vui lòng nhập lý do hủy đơn',
            });
        });

        it('requires bank account', () => {
            const result = validateRefundSubmitFields({
                refundReason: 'Đặt nhầm đơn',
                bankAccountId: '',
            });
            expect(result).toEqual({
                ok: false,
                message: 'Vui lòng chọn tài khoản ngân hàng nhận hoàn',
            });
        });

        it('passes when reason and bank account are present', () => {
            expect(
                validateRefundSubmitFields({
                    refundReason: 'Đặt nhầm đơn',
                    bankAccountId: 12,
                })
            ).toEqual({ ok: true });
        });
    });

    describe('Quick Suggestion', () => {
        it('exposes the expected suggestion list', () => {
            expect(REFUND_REASON_SUGGESTIONS).toContain('Đặt nhầm đơn');
            expect(REFUND_REASON_SUGGESTIONS).toContain('Khác');
            expect(REFUND_REASON_SUGGESTIONS.length).toBeGreaterThanOrEqual(5);
        });

        it('applies a concrete suggestion into the reason field', () => {
            expect(applyRefundReasonSuggestion('Đặt nhầm đơn')).toEqual({
                refundReason: 'Đặt nhầm đơn',
                selectedSuggestion: 'Đặt nhầm đơn',
            });
        });

        it('clears reason when choosing Khác so user can type custom text', () => {
            expect(applyRefundReasonSuggestion('Khác')).toEqual({
                refundReason: '',
                selectedSuggestion: 'Khác',
            });
        });
    });

    describe('disabled states — daily limit / period expired / countdown', () => {
        it('blocks submit when countdown expired', () => {
            expect(
                isRefundSubmitBlocked({
                    isExpired: true,
                    eligibility: { eligible: true },
                })
            ).toBe(true);
        });

        it('blocks submit when daily limit reached', () => {
            expect(
                isRefundSubmitBlocked({
                    isExpired: false,
                    eligibility: {
                        eligible: false,
                        dailyLimitReached: true,
                        reason: 'Vượt quá số lần hoàn tiền trong ngày',
                    },
                })
            ).toBe(true);

            expect(
                resolveRefundBlockedMessage({
                    isExpired: false,
                    eligibility: {
                        eligible: false,
                        dailyLimitReached: true,
                    },
                })
            ).toContain('giới hạn');
        });

        it('blocks submit when refund period expired', () => {
            expect(
                isRefundSubmitBlocked({
                    isExpired: false,
                    eligibility: {
                        eligible: false,
                        refundPeriodExpired: true,
                    },
                })
            ).toBe(true);

            expect(
                resolveRefundBlockedMessage({
                    isExpired: false,
                    eligibility: {
                        eligible: false,
                        refundPeriodExpired: true,
                    },
                })
            ).toContain('thời hạn');
        });

        it('allows submit when eligibility is open and countdown active', () => {
            expect(
                isRefundSubmitBlocked({
                    isExpired: false,
                    isLoadingEligibility: false,
                    isEligibilityError: false,
                    eligibility: { eligible: true },
                })
            ).toBe(false);
        });
    });

    describe('duplicate / notification deep-link', () => {
        it('blocks opening refund detail for non-refund notifications', () => {
            expect(
                canOpenRefundRequestDetailFromNotification({
                    referenceType: 'ORDER',
                    referenceId: '1',
                })
            ).toEqual({ canOpen: false });
        });

        it('opens refund detail from REFUND_REQUEST notification reference', () => {
            expect(
                canOpenRefundRequestDetailFromNotification({
                    referenceType: 'REFUND_REQUEST',
                    referenceId: '42',
                })
            ).toEqual({ canOpen: true, refundRequestId: 42 });
        });
    });

    describe('success and error messaging helpers', () => {
        it('uses eligibility reason when window is closed', () => {
            expect(
                resolveRefundBlockedMessage({
                    isExpired: true,
                    eligibility: {
                        eligible: false,
                        reason: 'Đã hết thời gian hủy đơn.',
                    },
                })
            ).toBe('Đã hết thời gian hủy đơn.');
        });
    });
});
