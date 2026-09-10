import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { prizeClaimSubmissionApi, prizePayoutPartialApi, exportPrizeClaimSubmission } from '../services/prizeClaimSubmissionApi';
import type { PrizeClaimSubmissionStatus } from '@/types/prize-payout.type';
import { invalidateAdminBadges } from '@/admin/context/AdminBadgeCountsProvider';

const getErrorMessage = (error: unknown, fallback: string) => {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return err?.response?.data?.message || err?.message || fallback;
};

// ─── PrizeClaimSubmission hooks ────────────────────────────────────────────────

export const usePrizeClaimSubmissions = (
    params?: { supplierId?: number; status?: string; search?: string },
    options?: object
) => {
    return useQuery({
        queryKey: ['prize-claim-submissions', params],
        queryFn: () => prizeClaimSubmissionApi.list(params),
        ...options,
    });
};

interface IPrizeClaimSubmissionFilters {
    search?: string;
    statuses: PrizeClaimSubmissionStatus[];
}

export const usePrizeClaimSubmissionList = () => {
    const [filters, setFilters] = useState<IPrizeClaimSubmissionFilters>({
        search: '',
        statuses: [],
    });

    const queryParams = useMemo(
        () => ({
            search: filters.search || undefined,
            status: filters.statuses.length > 0 ? filters.statuses.join(',') : undefined,
        }),
        [filters]
    );

    const { data, isLoading, error } = usePrizeClaimSubmissions(queryParams, {
        placeholderData: keepPreviousData,
    });

    const submissions = data?.data ?? [];

    const setSearchFilter = (search: string) => {
        setFilters((prev) => ({ ...prev, search }));
    };

    const setStatusFilter = (statuses: PrizeClaimSubmissionStatus[]) => {
        setFilters((prev) => ({ ...prev, statuses }));
    };

    const clearFilters = () => {
        setFilters({ search: '', statuses: [] });
    };

    return {
        submissions,
        isLoading,
        error,
        filters,
        setSearchFilter,
        setStatusFilter,
        clearFilters,
    };
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
    params: { periodFrom?: string; periodTo?: string },
    enabled: boolean
) => {
    return useQuery({
        queryKey: ['prize-claim-eligible-tickets', params],
        queryFn: () => prizeClaimSubmissionApi.listEligibleTickets(params),
        enabled,
    });
};

export const useCreatePrizeClaimDraft = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => prizeClaimSubmissionApi.createDraft(),
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

export const useRecordLineOutcome = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            submissionId,
            lineId,
            data,
        }: {
            submissionId: number;
            lineId: number;
            data: { outcome: string; reason?: string; note?: string; outcomeEvidenceUrl?: string };
        }) => prizeClaimSubmissionApi.recordLineOutcome(submissionId, lineId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submission-lines', vars.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            invalidateAdminBadges(queryClient);
            toast.success('Đã ghi nhận kết quả vé');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Không thể ghi nhận kết quả')),
    });
};

export const useStartPrizeClaimInspection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (submissionId: number) => prizeClaimSubmissionApi.startInspection(submissionId),
        onSuccess: (_, submissionId) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', submissionId] });
            toast.success('Đã bắt đầu kiểm tra');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Không thể bắt đầu kiểm tra')),
    });
};

export const useConfirmPrizeClaimInspection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            submissionId,
            data,
        }: {
            submissionId: number;
            data: { deliveryMode: 'RETAILER_DELIVERS' | 'SUPPLIER_COLLECTS' };
        }) => prizeClaimSubmissionApi.confirmInspection(submissionId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submission-lines', vars.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            toast.success('Đã xác nhận kiểm tra xong');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Không thể xác nhận kiểm tra')),
    });
};

export const useConfirmPrizeClaimHandover = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            submissionId,
            data,
        }: {
            submissionId: number;
            data: {
                handoverEvidenceUrl: string;
                handoverReceiptUrl?: string;
                supplierReference?: string;
                note?: string;
            };
        }) => prizeClaimSubmissionApi.confirmHandover(submissionId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submission-lines', vars.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            invalidateAdminBadges(queryClient);
            toast.success('Đã xác nhận bàn giao');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Không thể xác nhận bàn giao')),
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
            data?: { cancelReason?: string };
        }) => prizeClaimSubmissionApi.cancel(submissionId, data),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            toast.success('Đã hủy phiếu nộp');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Lỗi kết nối')),
    });
};

export const useUpdatePrizeClaimActualReceived = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            submissionId,
            actualReceivedAmount,
            actualReceivedEvidenceUrl,
        }: {
            submissionId: number;
            actualReceivedAmount: number | null;
            actualReceivedEvidenceUrl?: string | null;
        }) => prizeClaimSubmissionApi.updateActualReceivedAmount(submissionId, {
            actualReceivedAmount,
            actualReceivedEvidenceUrl,
        }),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prize-claim-submissions', vars.submissionId] });
            toast.success('Đã lưu số tiền thực nhận');
        },
        onError: (error) => toast.error(getErrorMessage(error, 'Không thể lưu số tiền thực nhận')),
    });
};

export const useExportPrizeClaimSubmission = () => {
    return useMutation({
        mutationFn: (submissionId: number) => exportPrizeClaimSubmission(submissionId),
        onSuccess: () => toast.success('Xuất phiếu nộp thành công'),
        onError: (error) => toast.error(getErrorMessage(error, 'Không thể xuất phiếu nộp')),
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
