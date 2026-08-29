"use client";

import AddIcon from '@mui/icons-material/Add';
import { Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { Button } from '@/admin/components/ui/Button';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { ROUTES } from '@/admin/constants/routes';
import {
    PRIZE_CIM_SUBMISSION_STATUS_LABELS,
    PrizeClaimSubmissionStatus,
    formatPrizePayoutCurrency,
} from '@/types/prize-payout.type';
import { usePrizeClaimSubmissions } from '../../hooks/usePrizeClaimSubmission';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<PrizeClaimSubmissionStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
    [PrizeClaimSubmissionStatus.DRAFT]: 'default',
    [PrizeClaimSubmissionStatus.SUBMITTED]: 'info',
    [PrizeClaimSubmissionStatus.CONFIRMED]: 'info',
    [PrizeClaimSubmissionStatus.PAYMENT_PENDING]: 'warning',
    [PrizeClaimSubmissionStatus.COMPLETED]: 'success',
    [PrizeClaimSubmissionStatus.CANCELLED]: 'error',
};

export const PrizeClaimSubmissionListPage = () => {
    const router = useAdminRouter();
    const { data, isLoading } = usePrizeClaimSubmissions();

    const submissions = data?.data ?? [];

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
                        onClick={() => router.push(ROUTES.ADMIN.PRIZE_CLAIM_SUBMISSIONS.CREATE)}
                        className="btn-primary-admin"
                        variant="contained"
                        startIcon={<AddIcon />}
                        label="Tạo phiếu nộp"
                    />
                }
            />

            <Box sx={{ mb: 2 }}>
                {/* TODO: Filter controls */}
            </Box>

            <TableContainer component={Box} sx={{ borderRadius: 2, boxShadow: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 600 }}>Mã phiếu</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Nhà đài</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Số vé</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Tổng tiền</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Trạng thái</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Hạn TT</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Hành động</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                                    Đang tải...
                                </TableCell>
                            </TableRow>
                        ) : submissions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.disabled', py: 4 }}>
                                    Chưa có phiếu nộp nào
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
                                    <TableCell>
                                        {sub.supplierName ?? `Nhà đài #${sub.supplierId}`}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        {sub.totalTicketCount ?? 0}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {formatPrizePayoutCurrency(sub.totalNetClaimAmount)}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                                            <Chip
                                                label={PRIZE_CIM_SUBMISSION_STATUS_LABELS[sub.status] ?? sub.status}
                                                color={STATUS_COLORS[sub.status]}
                                                size="small"
                                            />
                                            {sub.isOverdue && (
                                                <Chip
                                                    label="QUÁ HẠN"
                                                    color="error"
                                                    size="small"
                                                />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        {sub.paymentDeadline
                                            ? dayjs(sub.paymentDeadline).format('DD/MM/YYYY')
                                            : '—'}
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
        </>
    );
};
