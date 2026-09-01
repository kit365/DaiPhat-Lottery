"use client";

import AddIcon from '@mui/icons-material/Add';
import { Alert, Box, Card, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useMemo } from 'react';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { Button } from '@/admin/components/ui/Button';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { ROUTES } from '@/admin/constants/routes';
import {
    PRIZE_CIM_SUBMISSION_STATUS_LABELS,
    PrizeClaimSubmissionStatus,
    computeSupplierExpectedAmount,
    formatPrizePayoutCurrency,
} from '@/types/prize-payout.type';
import { useCreatePrizeClaimDraft, usePrizeClaimSubmissionList } from '../../hooks/usePrizeClaimSubmission';
import { PrizeClaimSubmissionToolbar } from '../sections/PrizeClaimSubmissionToolbar';

const STATUS_COLORS: Record<PrizeClaimSubmissionStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
    [PrizeClaimSubmissionStatus.DRAFT]: 'default',
    [PrizeClaimSubmissionStatus.INSPECTING]: 'warning',
    [PrizeClaimSubmissionStatus.PENDING_HANDOVER]: 'info',
    [PrizeClaimSubmissionStatus.HANDED_OVER]: 'info',
    [PrizeClaimSubmissionStatus.CLOSED]: 'success',
    [PrizeClaimSubmissionStatus.CANCELLED]: 'error',
};

export const PrizeClaimSubmissionListPage = () => {
    const router = useAdminRouter();
    const createDraft = useCreatePrizeClaimDraft();
    const {
        submissions,
        isLoading,
        error,
        filters,
        setSearchFilter,
        setStatusFilter,
        clearFilters,
    } = usePrizeClaimSubmissionList();

    const pendingOutcomeSubmissionCount = useMemo(
        () => submissions.filter((sub) => (sub.pendingOutcomeCount ?? 0) > 0).length,
        [submissions],
    );

    const handleCreate = async () => {
        try {
            const res = await createDraft.mutateAsync();
            const id = res?.data?.id;
            if (id) {
                router.push(ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.DETAIL(id));
            }
        } catch {
            // toast handled in hook
        }
    };

    if (error) {
        return (
            <Box sx={{ py: 5, textAlign: 'center', color: 'var(--palette-error-main)', fontSize: '1.125rem' }}>
                Lỗi khi tải danh sách phiếu nộp. Vui lòng thử lại.
            </Box>
        );
    }

    return (
        <>
            <PageHeader
                title="Phiếu nộp vé trúng thưởng"
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: ROUTES.ADMIN.ROOT },
                    { label: 'Phiếu nộp' },
                ]}
                action={
                    <Button
                        onClick={handleCreate}
                        className="btn-primary-admin"
                        variant="contained"
                        startIcon={<AddIcon />}
                        label="Tạo phiếu nộp"
                        loading={createDraft.isPending}
                        loadingLabel="Đang tạo..."
                    />
                }
            />

            {pendingOutcomeSubmissionCount > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Có {pendingOutcomeSubmissionCount} phiếu đã bàn giao nhưng vẫn còn vé chưa ghi nhận kết quả từ Nhà cung cấp.
                    Vui lòng mở phiếu và nhấn &quot;Ghi nhận kết quả&quot; cho từng vé.
                </Alert>
            )}

            <Card
                elevation={0}
                className="admin-datagrid-card"
                sx={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                    bgcolor: '#ffffff',
                    overflow: 'hidden',
                }}
            >
                <PrizeClaimSubmissionToolbar
                    filters={filters}
                    onSearchChange={setSearchFilter}
                    onStatusChange={setStatusFilter}
                    onClearFilters={clearFilters}
                />

                <TableContainer component={Box}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Mã phiếu</TableCell>
                                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Số vé</TableCell>
                                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Dự kiến nhận (tạm tính)</TableCell>
                                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Trạng thái</TableCell>
                                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                                        Đang tải...
                                    </TableCell>
                                </TableRow>
                            ) : submissions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ textAlign: 'center', color: 'text.disabled', py: 4 }}>
                                        {filters.search || filters.statuses.length > 0
                                            ? 'Không tìm thấy phiếu nộp phù hợp'
                                            : 'Chưa có phiếu nộp nào'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                submissions.map((sub) => (
                                    <TableRow
                                        key={sub.id}
                                        hover
                                        sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                                        onClick={() => router.push(ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.DETAIL(sub.id))}
                                    >
                                        <TableCell sx={{ fontFamily: 'monospace' }}>
                                            {sub.submissionCode}
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'center' }}>
                                            {sub.totalTicketCount ?? 0}
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatPrizePayoutCurrency(
                                                computeSupplierExpectedAmount(sub.totalGrossPrizeAmount, sub.totalTaxAmount),
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'center' }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                                <Chip
                                                    label={PRIZE_CIM_SUBMISSION_STATUS_LABELS[sub.status] ?? sub.status}
                                                    color={STATUS_COLORS[sub.status]}
                                                    size="small"
                                                />
                                                {(sub.pendingOutcomeCount ?? 0) > 0 && (
                                                    <Chip
                                                        label={`${sub.pendingOutcomeCount} vé chờ ghi nhận`}
                                                        color={sub.needsOutcome ? 'error' : 'warning'}
                                                        size="small"
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'center' }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                label="Xem"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.DETAIL(sub.id));
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </>
    );
};
