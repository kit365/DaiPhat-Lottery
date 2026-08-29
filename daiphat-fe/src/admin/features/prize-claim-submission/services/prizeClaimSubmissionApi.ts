import { apiApp } from '@/api';
import { withAuthHeaders } from '@/api/authHeaders';
import type { ApiResponse } from '@/types/api.type';
import type {
    PrizeClaimSubmissionResponse,
    PrizeClaimSubmissionLineResponse,
    PrizeClaimEligibleTicketResponse,
    CommitmentVoucherResponse,
    PayoutFundPreviewResponse,
    PayoutInstallmentResponse,
} from '@/types/prize-payout.type';

const PCS_BASE = '/prize-claim-submissions';

export const prizeClaimSubmissionApi = {
    // ─── List & Detail ────────────────────────────────────────────────────

    list: async (params?: { supplierId?: number; status?: string }) => {
        const response = await apiApp.get<ApiResponse<PrizeClaimSubmissionResponse[]>>(
            PCS_BASE,
            { params, ...withAuthHeaders() }
        );
        return response.data;
    },

    getById: async (id: number) => {
        const response = await apiApp.get<ApiResponse<PrizeClaimSubmissionResponse>>(
            `${PCS_BASE}/${id}`,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    getLines: async (submissionId: number) => {
        const response = await apiApp.get<ApiResponse<PrizeClaimSubmissionLineResponse[]>>(
            `${PCS_BASE}/${submissionId}/lines`,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    listEligibleTickets: async (params: {
        supplierId: number;
        periodFrom?: string;
        periodTo?: string;
    }) => {
        const response = await apiApp.get<ApiResponse<PrizeClaimEligibleTicketResponse[]>>(
            `${PCS_BASE}/eligible-tickets`,
            { params, ...withAuthHeaders() }
        );
        return response.data;
    },

    // ─── Draft Operations ─────────────────────────────────────────────────

    createDraft: async (supplierId: number) => {
        const response = await apiApp.post<ApiResponse<PrizeClaimSubmissionResponse>>(
            `${PCS_BASE}/drafts`,
            { supplierId },
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    addLine: async (submissionId: number, serialId: number) => {
        const response = await apiApp.post<ApiResponse<PrizeClaimSubmissionLineResponse>>(
            `${PCS_BASE}/${submissionId}/lines`,
            { serialId },
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    addLines: async (submissionId: number, serialIds: number[]) => {
        const response = await apiApp.post<ApiResponse<PrizeClaimSubmissionLineResponse[]>>(
            `${PCS_BASE}/${submissionId}/lines/bulk`,
            { serialIds },
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    removeLine: async (submissionId: number, lineId: number) => {
        const response = await apiApp.delete<ApiResponse<void>>(
            `${PCS_BASE}/${submissionId}/lines/${lineId}`,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    rejectLine: async (
        submissionId: number,
        data: { lineId: number; rejectionType: 'RETRYABLE' | 'FINAL'; reason: string; note?: string }
    ) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PCS_BASE}/${submissionId}/reject-line`,
            data,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    submit: async (submissionId: number, submittedBy: string) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PCS_BASE}/${submissionId}/submit`,
            { submittedBy },
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    confirm: async (
        submissionId: number,
        data: {
            confirmedBy: string;
            confirmationReference: string;
            confirmationEvidenceUrl: string;
        }
    ) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PCS_BASE}/${submissionId}/confirm`,
            data,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    markPaymentPending: async (submissionId: number) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PCS_BASE}/${submissionId}/mark-payment-pending`,
            {},
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    complete: async (
        submissionId: number,
        data: {
            completedBy: string;
            paidAmount: number;
            paymentEvidenceUrls: string[];
            paymentNote?: string;
        }
    ) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PCS_BASE}/${submissionId}/complete`,
            data,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    cancel: async (
        submissionId: number,
        data: {
            cancelReason?: string;
            cancelledBy: string;
            approvedBy?: string;
        }
    ) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PCS_BASE}/${submissionId}/cancel`,
            data,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    settleOutstanding: async (
        submissionId: number,
        data: { additionalAmount: number; evidence?: string; settledBy: string }
    ) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PCS_BASE}/${submissionId}/settle-outstanding`,
            data,
            { ...withAuthHeaders() }
        );
        return response.data;
    },
};

// ─── Partial Payout API ───────────────────────────────────────────────────────

const PAYOUT_BASE = '/prize-payout-requests';

export const prizePayoutPartialApi = {
    fundPreview: async (agencyId: string, amount: number) => {
        const response = await apiApp.get<ApiResponse<PayoutFundPreviewResponse>>(
            `${PAYOUT_BASE}/fund-preview`,
            {
                params: { agencyId, amount },
                ...withAuthHeaders(),
            }
        );
        return response.data;
    },

    payout: async (requestId: number, data: { method: string; paidBy: string }) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PAYOUT_BASE}/${requestId}/payout`,
            data,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    payoutPartial: async (
        requestId: number,
        data: { availableAmount: number; note?: string; paidBy: string; method: string }
    ) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PAYOUT_BASE}/${requestId}/payout-partial`,
            data,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    payFinalInstallment: async (
        requestId: number,
        data: {
            amount: number;
            evidence?: string;
            paidBy: string;
            method: string;
        }
    ) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PAYOUT_BASE}/${requestId}/pay-final-installment`,
            data,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    writeOffRemaining: async (requestId: number, data: { reason: string; approvedBy: string }) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PAYOUT_BASE}/${requestId}/write-off-remaining`,
            data,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    getCommitmentVoucher: async (requestId: number) => {
        const response = await apiApp.get<ApiResponse<CommitmentVoucherResponse>>(
            `${PAYOUT_BASE}/${requestId}/commitment-voucher`,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    getInstallments: async (requestId: number) => {
        const response = await apiApp.get<ApiResponse<PayoutInstallmentResponse[]>>(
            `${PAYOUT_BASE}/${requestId}/installments`,
            { ...withAuthHeaders() }
        );
        return response.data;
    },
};
