import type { OrderRefundEligibilityResponse } from '../../../types/refund.type';

/** Quick suggestions shown in the Cancel Order & Refund dialog. */
export const REFUND_REASON_SUGGESTIONS = [
    'Đặt nhầm đơn',
    'Tôi không còn nhu cầu mua vé',
    'Thông tin đơn hàng không chính xác',
    'Đơn hàng bị trùng',
    'Sự cố thanh toán',
    'Muốn đổi vé số khác',
    'Khác',
] as const;

export type RefundReasonSuggestion = (typeof REFUND_REASON_SUGGESTIONS)[number];

export type RefundFormValidationResult =
    | { ok: true }
    | { ok: false; message: string };

export function validateRefundSubmitFields(input: {
    refundReason: string;
    bankAccountId: number | '' | null | undefined;
}): RefundFormValidationResult {
    if (!input.refundReason?.trim()) {
        return { ok: false, message: 'Vui lòng nhập lý do hủy đơn' };
    }
    if (!input.bankAccountId) {
        return { ok: false, message: 'Vui lòng chọn tài khoản ngân hàng nhận hoàn' };
    }
    return { ok: true };
}

export function isRefundSubmitBlocked(input: {
    isExpired: boolean;
    isLoadingEligibility?: boolean;
    isEligibilityError?: boolean;
    eligibility?: Pick<
        OrderRefundEligibilityResponse,
        'eligible' | 'dailyLimitReached' | 'refundPeriodExpired' | 'reason'
    > | null;
}): boolean {
    if (input.isExpired) return true;
    if (input.isLoadingEligibility) return true;
    if (input.isEligibilityError) return true;
    if (input.eligibility?.eligible === false) return true;
    return false;
}

export function resolveRefundBlockedMessage(input: {
    isExpired: boolean;
    isEligibilityError?: boolean;
    eligibility?: Pick<
        OrderRefundEligibilityResponse,
        'eligible' | 'dailyLimitReached' | 'refundPeriodExpired' | 'reason'
    > | null;
}): string | null {
    if (input.isEligibilityError) {
        return 'Không kiểm tra được điều kiện hoàn tiền. Vui lòng thử lại.';
    }
    if (input.eligibility?.dailyLimitReached) {
        return 'Bạn đã đạt giới hạn số lần gửi yêu cầu hoàn tiền trong ngày.';
    }
    if (input.eligibility?.refundPeriodExpired) {
        return 'Đã quá thời hạn gửi yêu cầu hoàn tiền cho đơn hàng này.';
    }
    if (input.isExpired || input.eligibility?.eligible === false) {
        return input.eligibility?.reason
            || 'Đơn hàng không đủ điều kiện hủy và hoàn tiền.';
    }
    return null;
}

/** Apply a quick suggestion into the reason field. */
export function applyRefundReasonSuggestion(
    suggestion: string,
    options?: { otherPlaceholder?: string }
): { refundReason: string; selectedSuggestion: string } {
    if (suggestion === 'Khác') {
        return {
            refundReason: options?.otherPlaceholder ?? '',
            selectedSuggestion: suggestion,
        };
    }
    return {
        refundReason: suggestion,
        selectedSuggestion: suggestion,
    };
}

export function canOpenRefundRequestDetailFromNotification(notification: {
    referenceType?: string | null;
    referenceId?: string | null;
}): { canOpen: boolean; refundRequestId?: number } {
    if (notification.referenceType !== 'REFUND_REQUEST') {
        return { canOpen: false };
    }
    const id = Number(notification.referenceId);
    if (!Number.isFinite(id) || id <= 0) {
        return { canOpen: false };
    }
    return { canOpen: true, refundRequestId: id };
}
