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

export const XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const exportPrizeClaimSubmission = async (submissionId: number): Promise<void> => {
    const response = await apiApp.get(`${PCS_BASE}/${submissionId}/export`, {
        ...withAuthHeaders(),
        responseType: 'blob',
        skipGlobalErrorToast: true,
    });

    const disposition = String(response.headers?.['content-disposition'] ?? '');
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const fileName = match
        ? decodeURIComponent(match[1])
        : `phieu-nop-${submissionId}.xlsx`;

    const url = URL.createObjectURL(new Blob([response.data], { type: XLSX_MIME }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const prizeClaimSubmissionApi = {
    // ─── List & Detail ────────────────────────────────────────────────────

    list: async (params?: { supplierId?: number; status?: string; search?: string }) => {
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

    listEligibleTickets: async (params?: {
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

    createDraft: async () => {
        const response = await apiApp.post<ApiResponse<PrizeClaimSubmissionResponse>>(
            `${PCS_BASE}/drafts`,
            {},
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

    recordLineOutcome: async (
        submissionId: number,
        lineId: number,
        body: { outcome: string; reason?: string; note?: string; outcomeEvidenceUrl?: string }
    ) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PCS_BASE}/${submissionId}/lines/${lineId}/record-outcome`,
            body,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    startInspection: async (submissionId: number) => {
        const response = await apiApp.post<ApiResponse<PrizeClaimSubmissionResponse>>(
            `${PCS_BASE}/${submissionId}/start-inspection`,
            {},
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    confirmInspection: async (
        submissionId: number,
        body: { deliveryMode: 'RETAILER_DELIVERS' | 'SUPPLIER_COLLECTS' }
    ) => {
        const response = await apiApp.post<ApiResponse<PrizeClaimSubmissionResponse>>(
            `${PCS_BASE}/${submissionId}/confirm-inspection`,
            body,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    confirmHandover: async (
        submissionId: number,
        body: {
            handoverEvidenceUrl: string;
            handoverReceiptUrl?: string;
            supplierReference?: string;
            note?: string;
        }
    ) => {
        const response = await apiApp.post<ApiResponse<PrizeClaimSubmissionResponse>>(
            `${PCS_BASE}/${submissionId}/confirm-handover`,
            body,
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    cancel: async (
        submissionId: number,
        data?: { cancelReason?: string }
    ) => {
        const response = await apiApp.post<ApiResponse<void>>(
            `${PCS_BASE}/${submissionId}/cancel`,
            data ?? {},
            { ...withAuthHeaders() }
        );
        return response.data;
    },

    updateActualReceivedAmount: async (
        submissionId: number,
        data: { actualReceivedAmount: number | null; actualReceivedEvidenceUrl?: string | null }
    ) => {
        const response = await apiApp.patch<ApiResponse<PrizeClaimSubmissionResponse>>(
            `${PCS_BASE}/${submissionId}/actual-received`,
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
