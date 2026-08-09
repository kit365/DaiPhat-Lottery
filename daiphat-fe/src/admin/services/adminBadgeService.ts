import { apiApp } from "@/api";

export type AdminDashboardBadgeCounts = {
    refundPending: number | null;
    prizePayoutPending: number | null;
    supportTicketOpen: number | null;
    returnBatchPending: number | null;
    ordersPreparing: number | null;
    chatAttention: number | null;
    notificationUnread: number | null;
};

const EMPTY_BADGES: AdminDashboardBadgeCounts = {
    refundPending: null,
    prizePayoutPending: null,
    supportTicketOpen: null,
    returnBatchPending: null,
    ordersPreparing: null,
    chatAttention: null,
    notificationUnread: null,
};

const toCount = (value: unknown): number | null => {
    if (value === null || value === undefined) {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
};

export const getAdminDashboardBadges = async (): Promise<AdminDashboardBadgeCounts> => {
    try {
        const response = await apiApp.get("/staff/admin-badges", {
            skipGlobalErrorToast: true,
        });
        const data = response.data?.data ?? response.data;

        return {
            refundPending: toCount(data?.refundPending),
            prizePayoutPending: toCount(data?.prizePayoutPending),
            supportTicketOpen: toCount(data?.supportTicketOpen),
            returnBatchPending: toCount(data?.returnBatchPending),
            ordersPreparing: toCount(data?.ordersPreparing),
            chatAttention: toCount(data?.chatAttention),
            notificationUnread: toCount(data?.notificationUnread),
        };
    } catch {
        return EMPTY_BADGES;
    }
};
