import { RefundRequestStatus } from '../../types/refund.type';

export const REFUND_COMPLAINT_CATEGORY_SLOW_PROCESSING = 'REFUND_SLOW_PROCESSING';
export const REFUND_COMPLAINT_CATEGORY_PAID_ISSUE = 'REFUND_PAID_ISSUE';

export const DEFAULT_REFUND_COMPLAINT_WAIT_HOURS = 48;
export const DEFAULT_REFUND_COMPLAINT_GRACE_DAYS = 7;

const SLOW_PROCESSING_STATUSES = new Set<RefundRequestStatus>([
    RefundRequestStatus.WAITING_FOR_INFO,
    RefundRequestStatus.READY_TO_PAY,
]);

export type RefundComplaintEligibilityCode =
    | 'eligible'
    | 'too_early'
    | 'status_invalid'
    | 'window_expired'
    | 'not_eligible';

export interface RefundComplaintEligibilityInput {
    status: RefundRequestStatus;
    updatedAt?: string | null;
}

export interface RefundComplaintEligibilityConfig {
    waitHours?: number;
    graceDays?: number;
}

export interface RefundComplaintEligibilityResult {
    eligible: boolean;
    categoryCode?: string;
    reasonCode: RefundComplaintEligibilityCode;
    message: string;
}

function hoursSince(isoDate: string, nowMs: number): number {
    const updatedMs = new Date(isoDate).getTime();
    if (Number.isNaN(updatedMs)) {
        return 0;
    }
    return Math.floor((nowMs - updatedMs) / 3_600_000);
}

function daysSince(isoDate: string, nowMs: number): number {
    const updatedMs = new Date(isoDate).getTime();
    if (Number.isNaN(updatedMs)) {
        return 0;
    }
    return Math.floor((nowMs - updatedMs) / 86_400_000);
}

export function resolveRefundComplaintEligibility(
    refund: RefundComplaintEligibilityInput,
    config: RefundComplaintEligibilityConfig = {},
    nowMs: number = Date.now()
): RefundComplaintEligibilityResult {
    const waitHours = config.waitHours ?? DEFAULT_REFUND_COMPLAINT_WAIT_HOURS;
    const graceDays = config.graceDays ?? DEFAULT_REFUND_COMPLAINT_GRACE_DAYS;
    const updatedAt = refund.updatedAt;

    if (SLOW_PROCESSING_STATUSES.has(refund.status)) {
        if (!updatedAt) {
            return {
                eligible: false,
                reasonCode: 'too_early',
                message: `Yêu cầu hoàn tiền vẫn trong thời gian cam kết xử lý (${waitHours} giờ). Vui lòng chờ trong khi chúng tôi xử lý yêu cầu của bạn.`,
            };
        }

        const elapsedHours = hoursSince(updatedAt, nowMs);
        if (elapsedHours < waitHours) {
            return {
                eligible: false,
                reasonCode: 'too_early',
                message: `Yêu cầu hoàn tiền vẫn trong thời gian cam kết xử lý (${waitHours} giờ). Vui lòng chờ trong khi chúng tôi xử lý yêu cầu của bạn.`,
            };
        }

        return {
            eligible: true,
            categoryCode: REFUND_COMPLAINT_CATEGORY_SLOW_PROCESSING,
            reasonCode: 'eligible',
            message: '',
        };
    }

    if (refund.status === RefundRequestStatus.PAID) {
        if (updatedAt && daysSince(updatedAt, nowMs) > graceDays) {
            return {
                eligible: false,
                reasonCode: 'window_expired',
                message: `Yêu cầu hoàn tiền này đã hết thời hạn khiếu nại (hết hạn sau ${graceDays} ngày).`,
            };
        }

        return {
            eligible: true,
            categoryCode: REFUND_COMPLAINT_CATEGORY_PAID_ISSUE,
            reasonCode: 'eligible',
            message: '',
        };
    }

    if (refund.status === RefundRequestStatus.MANUAL_RESOLUTION) {
        return {
            eligible: false,
            reasonCode: 'status_invalid',
            message: 'Yêu cầu hoàn tiền này cần xử lý thủ công. Vui lòng mang CCCD đến quầy hỗ trợ hoặc liên hệ CSKH.',
        };
    }

    return {
        eligible: false,
        reasonCode: 'not_eligible',
        message: 'Hiện tại bạn chưa thể gửi khiếu nại cho yêu cầu hoàn tiền này.',
    };
}
