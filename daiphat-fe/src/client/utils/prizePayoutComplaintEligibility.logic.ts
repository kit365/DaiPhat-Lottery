import { PrizePayoutRequestStatus } from '../../types/prize-payout.type';

export const PRIZE_PAYOUT_COMPLAINT_CATEGORY_SLOW_PROCESSING = 'PRIZE_PAYOUT_SLOW_PROCESSING';
export const PRIZE_PAYOUT_COMPLAINT_CATEGORY_PAID_ISSUE = 'PRIZE_PAYOUT_PAID_ISSUE';

export const DEFAULT_PRIZE_PAYOUT_COMPLAINT_WAIT_HOURS = 48;
export const DEFAULT_PRIZE_PAYOUT_COMPLAINT_GRACE_DAYS = 15;

const SLOW_PROCESSING_STATUSES = new Set<PrizePayoutRequestStatus>([
    PrizePayoutRequestStatus.PENDING,
    PrizePayoutRequestStatus.APPROVED,
]);

export type PrizePayoutComplaintEligibilityCode =
    | 'eligible'
    | 'too_early'
    | 'status_invalid'
    | 'window_expired'
    | 'not_eligible';

export interface PrizePayoutComplaintEligibilityInput {
    status: PrizePayoutRequestStatus;
    updatedAt?: string | null;
    completedAt?: string | null;
}

export interface PrizePayoutComplaintEligibilityConfig {
    waitHours?: number;
    graceDays?: number;
}

export interface PrizePayoutComplaintEligibilityResult {
    eligible: boolean;
    categoryCode?: string;
    reasonCode: PrizePayoutComplaintEligibilityCode;
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

export function resolvePrizePayoutComplaintEligibility(
    payout: PrizePayoutComplaintEligibilityInput,
    config: PrizePayoutComplaintEligibilityConfig = {},
    nowMs: number = Date.now()
): PrizePayoutComplaintEligibilityResult {
    const waitHours = config.waitHours ?? DEFAULT_PRIZE_PAYOUT_COMPLAINT_WAIT_HOURS;
    const graceDays = config.graceDays ?? DEFAULT_PRIZE_PAYOUT_COMPLAINT_GRACE_DAYS;
    const updatedAt = payout.updatedAt;

    if (SLOW_PROCESSING_STATUSES.has(payout.status)) {
        if (!updatedAt) {
            return {
                eligible: false,
                reasonCode: 'too_early',
                message: `Yêu cầu trả thưởng vẫn trong thời gian cam kết xử lý (${waitHours} giờ). Vui lòng chờ trong khi chúng tôi xử lý yêu cầu của bạn.`,
            };
        }

        const elapsedHours = hoursSince(updatedAt, nowMs);
        if (elapsedHours < waitHours) {
            return {
                eligible: false,
                reasonCode: 'too_early',
                message: `Yêu cầu trả thưởng vẫn trong thời gian cam kết xử lý (${waitHours} giờ). Vui lòng chờ trong khi chúng tôi xử lý yêu cầu của bạn.`,
            };
        }

        return {
            eligible: true,
            categoryCode: PRIZE_PAYOUT_COMPLAINT_CATEGORY_SLOW_PROCESSING,
            reasonCode: 'eligible',
            message: '',
        };
    }

    if (payout.status === PrizePayoutRequestStatus.COMPLETED) {
        const anchor = payout.completedAt || payout.updatedAt;
        if (anchor && daysSince(anchor, nowMs) > graceDays) {
            return {
                eligible: false,
                reasonCode: 'window_expired',
                message: `Yêu cầu trả thưởng này đã hết thời hạn khiếu nại (hết hạn sau ${graceDays} ngày).`,
            };
        }

        return {
            eligible: true,
            categoryCode: PRIZE_PAYOUT_COMPLAINT_CATEGORY_PAID_ISSUE,
            reasonCode: 'eligible',
            message: '',
        };
    }

    if (payout.status === PrizePayoutRequestStatus.MANUAL_RESOLUTION) {
        return {
            eligible: false,
            reasonCode: 'status_invalid',
            message: 'Yêu cầu trả thưởng này cần xử lý thủ công. Vui lòng mang CCCD đến quầy hỗ trợ hoặc liên hệ CSKH.',
        };
    }

    return {
        eligible: false,
        reasonCode: 'not_eligible',
        message: 'Hiện tại bạn chưa thể gửi khiếu nại cho yêu cầu trả thưởng này.',
    };
}
