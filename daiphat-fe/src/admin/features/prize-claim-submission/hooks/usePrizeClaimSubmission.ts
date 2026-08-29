import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { prizeClaimSubmissionApi, prizePayoutPartialApi } from '../services/prizeClaimSubmissionApi';

const getErrorMessage = (error: unknown, fallback: string) => {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return err?.response?.data?.message || err?.message || fallback;
};

// ─── PrizeClaimSubmission hooks ────────────────────────────────────────────────

export const usePrizeClaimSubmissions = (params?: { supplierId?: number; status?: string }) => {
    return useQuery({
        queryKey: ['prize-claim-submissions', params],
        queryFn: () => prizeClaimSubmissionApi.list(params),
    });
};

export const usePrizeClaimSubmissionDetail = (id: number) => {
    return useQuery({
        queryKey: ['prize-claim-submissions', id],
        queryFn: () => prizeClaimSubmissionApi.getById(id),
        enabled: !!id,
    });
};

export const usePrizeClaimSubmissionLines = (submissionId: number) => {
    return useQuery({
        queryKey: ['prize-claim-submission-lines', submissionId],
        queryFn: () => prizeClaimSubmissionApi.getLines(submissionId),
        enabled: !!submissionId,
    });
};

export const useEligiblePrizeClaimTickets = (
    params: { supplierId: number; periodFrom?: string; periodTo?: string },
    enabled: boolean
) => {
    return useQuery({
        queryKey: ['prize-claim-eligible-tickets', params],
        queryFn: () => prizeClaimSubmissionApi.listEligibleTickets(params),
        enabled: enabled && !!params.supplierId,
    });
};

export const useCreatePrizeClaimDraft = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ supplierId }: { supplierId: number }) =>
            prizeClaimSubmissionApi.createDraft(supplierId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions'] });
            toast.success('Đã tạo phiếu nộp mới');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useAddPrizeClaimLine = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ submissionId, serialId }: { submissionId: number; serialId: number }) =>
            prizeClaimSubmissionApi.addLine(submissionId, serialId),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submission-lines', vars.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['prize-claim-eligible-tickets'] });
            toast.success('Đã thêm vé vào phiếu');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Không thể thêm vé')),
    });
};

export const useAddPrizeClaimLines = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ submissionId, serialIds }: { submissionId: number; serialIds: number[] }) =>
            prizeClaimSubmissionApi.addLines(submissionId, serialIds),
        onSuccess: (res, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submission-lines', vars.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['prize-claim-eligible-tickets'] });
            const count = res?.data?.length ?? vars.serialIds.length;
            toast.success(`Đã thêm ${count} vé vào phiếu`);
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Không thể thêm vé')),
    });
};

export const useRemovePrizeClaimLine = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ submissionId, lineId }: { submissionId: number; lineId: number }) =>
            prizeClaimSubmissionApi.removeLine(submissionId, lineId),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submission-lines', vars.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['prize-claim-eligible-tickets'] });
            toast.success('Đã xóa vé khỏi phiếu');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Không thể xóa vé')),
    });
};

export const useRejectPrizeClaimLine = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            submissionId,
            data,
        }: {
            submissionId: number;
            data: { lineId: number; rejectionType: 'RETRYABLE' | 'FINAL'; reason: string; note?: string };
        }) => prizeClaimSubmissionApi.rejectLine(submissionId, data),
        // note: rejectionType điều khiển RETRYABLE vs FINAL logic; reason là PrizeClaimRejectionReason enum
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submission-lines', vars.submissionId] });
            toast.success('Đã từ chối vé');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Không thể từ chối vé')),
    });
};

export const useSubmitPrizeClaim = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ submissionId, submittedBy }: { submissionId: number; submittedBy: string }) =>
            prizeClaimSubmissionApi.submit(submissionId, submittedBy),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            toast.success('Đã gửi phiếu nộp');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useConfirmPrizeClaim = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            submissionId,
            data,
        }: {
            submissionId: number;
            data: { confirmedBy: string; confirmationReference: string; confirmationEvidenceUrl: string };
        }) => prizeClaimSubmissionApi.confirm(submissionId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            toast.success('Đã xác nhận từ nhà đài');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useMarkPaymentPending = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (submissionId: number) => prizeClaimSubmissionApi.markPaymentPending(submissionId),
        onSuccess: (_, submissionId) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', submissionId] });
            toast.success('Đã chuyển sang chờ thanh toán');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useCompletePrizeClaim = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            submissionId,
            data,
        }: {
            submissionId: number;
            data: {
                completedBy: string;
                paidAmount: number;
                paymentEvidenceUrls: string[];
                paymentNote?: string;
            };
        }) => prizeClaimSubmissionApi.complete(submissionId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            toast.success('Đã hoàn thành phiếu nộp');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useCancelPrizeClaim = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            submissionId,
            data,
        }: {
            submissionId: number;
            data: { cancelReason?: string; cancelledBy: string; approvedBy?: string };
        }) => prizeClaimSubmissionApi.cancel(submissionId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            toast.success('Đã hủy phiếu nộp');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useSettleOutstanding = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            submissionId,
            data,
        }: {
            submissionId: number;
            data: { additionalAmount: number; evidence?: string; settledBy: string };
        }) => prizeClaimSubmissionApi.settleOutstanding(submissionId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            toast.success('Đã ghi nhận thanh toán công nợ');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

// ─── Partial Payout hooks ──────────────────────────────────────────────────────

export const usePayoutFundPreview = (agencyId: string, amount: number, enabled: boolean) => {
    return useQuery({
        queryKey: ['payout-fund-preview', agencyId, amount],
        queryFn: () => prizePayoutPartialApi.fundPreview(agencyId, amount),
        enabled: enabled && !!agencyId,
    });
};

export const usePayout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            requestId,
            data,
        }: {
            requestId: number;
            data: { method: string; paidBy: string };
        }) => prizePayoutPartialApi.payout(requestId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['staff-prize-payouts', vars.requestId] });
            toast.success('Đã trả thưởng thành công');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const usePayoutPartial = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            requestId,
            data,
        }: {
            requestId: number;
            data: { availableAmount: number; note?: string; paidBy: string; method: string };
        }) => prizePayoutPartialApi.payoutPartial(requestId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['staff-prize-payouts', vars.requestId] });
            toast.success('Đã trả một phần — phiếu cam kết đã được tạo');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const usePayFinalInstallment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            requestId,
            data,
        }: {
            requestId: number;
            data: { amount: number; evidence?: string; paidBy: string; method: string };
        }) => prizePayoutPartialApi.payFinalInstallment(requestId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['staff-prize-payouts', vars.requestId] });
            toast.success('Đã trả đợt cuối');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useWriteOffRemaining = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            requestId,
            data,
        }: {
            requestId: number;
            data: { reason: string; approvedBy: string };
        }) => prizePayoutPartialApi.writeOffRemaining(requestId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['staff-prize-payouts', vars.requestId] });
            toast.success('Đã xóa bỏ nghĩa vụ còn lại');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useCommitmentVoucher = (requestId: number) => {
    return useQuery({
        queryKey: ['commitment-voucher', requestId],
        queryFn: () => prizePayoutPartialApi.getCommitmentVoucher(requestId),
        enabled: !!requestId,
    });
};

export const usePayoutInstallments = (requestId: number) => {
    return useQuery({
        queryKey: ['payout-installments', requestId],
        queryFn: () => prizePayoutPartialApi.getInstallments(requestId),
        enabled: !!requestId,
    });
};
