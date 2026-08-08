"use client";

import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import dayjs from 'dayjs';
import { useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate, useParams } from '@/components/router-compat';
import { toast } from 'react-toastify';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { ROUTES } from '../../../../../constants/routes';
import { formatImportCost } from '../../../import-batch/utils/importCostCalculator';
import {
    useConfirmReturnHandover,
    useReturnBatchDetail,
    useStartReturnInspection,
} from '../../hooks/useReturnBatch';
import {
    canStartInspection,
    formatMinutesUntilCutoff,
    getReturnBatchLineStatusBadgeClass,
    getReturnBatchLineStatusLabel,
    getReturnBatchStatusChipColor,
    getReturnBatchStatusLabel,
} from '../../utils/returnBatchLabels';
import { RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE } from '../../types/returnBatch.type';
import { InspectTicketsDialog } from '../sections/InspectTicketsDialog';
import { ReturnBatchTicketsModal } from '../sections/ReturnBatchTicketsModal';

export const ReturnBatchDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { data: batch, isLoading, isError, refetch } = useReturnBatchDetail(id);
    const confirmHandover = useConfirmReturnHandover();
    const startInspection = useStartReturnInspection();
    const [inspectOpen, setInspectOpen] = useState(false);
    const [ticketsModalOpen, setTicketsModalOpen] = useState(false);
    const [selectedStationName, setSelectedStationName] = useState<string | null>(null);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !batch) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <Typography color="text.secondary">Không tìm thấy phiếu trả vé.</Typography>
            </Box>
        );
    }

    const handleConfirmHandover = () => {
        const linesRows = (batch.lines || [])
            .map(
                (line, index) => `
                <tr style="border-bottom: 1px solid #F1F5F9;">
                    <td style="padding: 8px 0; text-align: center; color: #64748B; font-weight: 600;">${index + 1}</td>
                    <td style="padding: 8px 0; font-weight: 600; color: #334155;">${line.lotteryStationName || `#${line.lotteryStationId}`}</td>
                    <td style="padding: 8px 0; text-align: right; color: #0284C7; font-weight: 700;">${line.totalQuantity ?? 0} vé</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #15803D;">${formatImportCost(line.totalReturnValue)} VNĐ</td>
                </tr>
            `
            )
            .join('');

        Swal.fire({
            title: `Xác nhận bàn giao phiếu trả vé #${batch.id}?`,
            html: `
                <div style="text-align: left; font-size: 0.875rem; color: #334155; line-height: 1.6;">
                    <p style="margin-bottom: 14px; color: #475569;">
                        Bạn có chắc chắn muốn xác nhận bàn giao <strong>${batch.totalQuantity ?? 0} vé</strong> trả cho nhà cung cấp <strong>${batch.supplierName || ''}</strong> không?
                    </p>

                    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
                        <div style="display: flex; justify-content: space-between; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0;">
                            <span style="color: #64748B;">Nhà cung cấp:</span>
                            <span style="font-weight: 600; color: #0F172A;">${batch.supplierName || '—'} (${batch.supplierCode || ''})</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0;">
                            <span style="color: #64748B;">Ngày quay:</span>
                            <span style="font-weight: 600; color: #0F172A;">${batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #E2E8F0;">
                            <span style="color: #64748B;">Tổng số lượng vé:</span>
                            <span style="font-weight: 700; color: #0284C7;">${batch.totalQuantity ?? 0} vé</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #64748B;">Tổng giá trị vé trả:</span>
                            <span style="font-weight: 700; color: #15803D; font-size: 0.95rem;">${formatImportCost(batch.totalReturnValue)} VNĐ</span>
                        </div>
                    </div>

                    ${
                        linesRows
                            ? `
                    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
                        <div style="font-weight: 700; color: #1E293B; margin-bottom: 8px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">
                            Chi tiết bàn giao theo nhà đài
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid #E2E8F0; color: #64748B; text-align: left;">
                                    <th style="padding: 6px 0; text-align: center; font-weight: 600; width: 40px;">STT</th>
                                    <th style="padding: 6px 0; font-weight: 600;">Tên nhà đài</th>
                                    <th style="padding: 6px 0; text-align: right; font-weight: 600;">Số lượng</th>
                                    <th style="padding: 6px 0; text-align: right; font-weight: 600;">Giá trị trả</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${linesRows}
                            </tbody>
                        </table>
                    </div>
                    `
                            : ''
                    }

                    <div style="margin-top: 14px; text-align: left;">
                        <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 6px;">
                            Ghi chú bàn giao <span style="font-weight: 400; color: #94a3b8;">(không bắt buộc)</span>:
                        </label>
                        <textarea
                            id="swal-handover-note"
                            rows="3"
                            placeholder="Nhập ghi chú bàn giao (nếu có)..."
                            style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 0.85rem; outline: none; box-sizing: border-box; resize: vertical; font-family: inherit; color: #1e293b;"
                        >${batch.note || ''}</textarea>
                    </div>

                    <div style="color: #64748B; font-style: italic; font-size: 0.8rem; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 8px 12px; margin-top: 12px;">
                        ⚠️ <strong>Lưu ý:</strong> Sau khi bàn giao, toàn bộ vé trong phiếu sẽ chuyển sang trạng thái <strong>Đã trả</strong>.
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1C252E',
            cancelButtonColor: '#919EAB',
            confirmButtonText: 'Xác nhận bàn giao',
            cancelButtonText: 'Hủy',
            focusCancel: true,
            preConfirm: () => {
                const noteInput = (document.getElementById('swal-handover-note') as HTMLTextAreaElement)?.value;
                return {
                    note: noteInput?.trim() || undefined,
                };
            },
        }).then(async (result) => {
            if (result.isConfirmed) {
                const note = result.value?.note;
                try {
                    await confirmHandover.mutateAsync({
                        id: batch.id,
                        payload: {
                            returnReceiptUrl: batch.returnReceiptUrl,
                            note: note || undefined,
                        },
                    });
                    toast.success('Đã xác nhận bàn giao — sê-ri chuyển sang Đã trả.');
                } catch {
                    toast.error('Không thể xác nhận bàn giao.');
                }
            }
        });
    };

    const handleInspectTickets = async () => {
        if (batch.inspectionExpired || batch.status === 'CANCELLED') {
            navigate(ROUTES.ADMIN.RETURN_BATCH.INSPECT(batch.id));
            return;
        }
        if (canStartInspection(batch.status)) {
            try {
                await startInspection.mutateAsync(batch.id);
            } catch (err: any) {
                const message = err?.response?.data?.message || 'Không thể bắt đầu kiểm tra vé.';
                if (
                    message === RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE ||
                    err?.response?.data?.errorCode === 'LT_120'
                ) {
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Inspection period expired',
                        text: RETURN_BATCH_INSPECTION_EXPIRED_MESSAGE,
                        confirmButtonColor: '#1C252E',
                    });
                    refetch();
                    return;
                }
                toast.error(message);
                return;
            }
        }
        navigate(ROUTES.ADMIN.RETURN_BATCH.INSPECT(batch.id));
    };

    return (
        <Box sx={{ width: '100%', pb: 5 }}>
            {/* Page Header */}
            <PageHeader
                title={`Phiếu trả vé ${batch.batchCode?.trim() || `#${batch.id}`}`}
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Trả vé NCC', to: ROUTES.ADMIN.RETURN_BATCH.LIST },
                    { label: batch.batchCode?.trim() || `#${batch.id}` },
                ]}
                titleExtra={
                    <Chip
                        size="small"
                        label={getReturnBatchStatusLabel(batch.status, batch.statusLabel)}
                        color={getReturnBatchStatusChipColor(batch.status)}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                    />
                }
                action={
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {(batch.status === 'PENDING_INSPECTION' || batch.status === 'INSPECTING') && !batch.inspectionExpired && (
                        <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                            <LoadingButton
                                label={batch.status === 'INSPECTING' ? 'Kiểm tra vé (Tiếp tục)' : 'Kiểm tra vé'}
                                className="btn-primary-admin"
                                loading={startInspection.isPending}
                                onClick={handleInspectTickets}
                            />
                        </CanAccess>
                    )}
                    {batch.status === 'PENDING_HANDOVER' && (
                        <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                            <LoadingButton
                                label="Xác nhận bàn giao"
                                className="btn-primary-admin"
                                loading={confirmHandover.isPending}
                                onClick={handleConfirmHandover}
                            />
                        </CanAccess>
                    )}
                </Stack>
                }
            />

            {/* System Status Alerts */}
            {batch.status === 'CANCELLED' && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Phiếu trả vé đã bị hủy
                    {batch.cancelReason ? `: ${batch.cancelReason}` : '.'}
                    {batch.cancelledAt
                        ? ` (${dayjs(batch.cancelledAt).format('DD/MM/YYYY HH:mm')})`
                        : ''}
                </Alert>
            )}

            {batch.urgentReminder && !batch.inspectionExpired && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Nhắc khẩn: còn {formatMinutesUntilCutoff(batch.minutesUntilCutoff)} đến hạn trả NCC (
                    {batch.returnCutOffTime || '—'}). Vui lòng hoàn tất kiểm tra ngay.
                </Alert>
            )}

            {batch.inInspectionWindow && !batch.urgentReminder && !batch.inspectionExpired && (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Cửa sổ kiểm tra đã mở — còn {formatMinutesUntilCutoff(batch.minutesUntilCutoff)} đến hạn
                    trả ({batch.returnCutOffTime || '—'}). Vui lòng bắt đầu kiểm tra vé ngay.
                </Alert>
            )}

            {batch.supplierSettlementId && (
                <Alert severity="info" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Liên kết đối soát #{batch.supplierSettlementId}. Giá trị trả của kỳ đối soát được
                    cập nhật khi vé đã kiểm tra và sẵn sàng trả NCC (chờ trả / đã trả).
                </Alert>
            )}

            {batch.status === 'PENDING_HANDOVER' && (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '12px' }}>
                    Kiểm tra đã hoàn tất — vé đang chờ bàn giao nhà cung cấp. Sau khi giao xong, bấm{' '}
                    <strong>Xác nhận bàn giao</strong>.
                </Alert>
            )}

            {/* Main Content Layout */}
            <Stack spacing={3}>
                {/* Thông tin phiếu Card */}
                <CollapsibleCard title="Thông tin phiếu" expanded onToggle={() => undefined}>
                    <Box sx={{ p: 3 }}>
                        {/* 4 Financial / Summary Box Row */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                gap: 2,
                                mb: 3,
                            }}
                        >
                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                    Nhà cung cấp
                                </Typography>
                                <Typography variant="body1" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                    {batch.supplierName || '—'}
                                </Typography>
                                {batch.supplierCode && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                        {batch.supplierCode}
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                    Ngày quay
                                </Typography>
                                <Typography variant="body1" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                    {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                                </Typography>
                            </Box>

                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                                    Tổng số lượng vé
                                </Typography>
                                <Typography variant="body1" fontWeight={800} color="#0284c7" sx={{ mt: 0.5 }}>
                                    {new Intl.NumberFormat('vi-VN').format(batch.totalQuantity ?? 0)} vé
                                </Typography>
                            </Box>

                            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <Typography variant="caption" color="#166534" fontWeight={700} display="block">
                                    Tổng giá trị trả
                                </Typography>
                                <Typography variant="body1" fontWeight={800} color="#15803d" sx={{ mt: 0.5 }}>
                                    {formatImportCost(batch.totalReturnValue)} VNĐ
                                </Typography>
                            </Box>
                        </Box>

                        {/* Metadata Rows */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                gap: 2,
                            }}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>Ghi chú</Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.note || '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>Biên nhận trả</Typography>
                                <Typography variant="body2" sx={{ mt: 0.25 }}>
                                    {batch.returnReceiptUrl ? (
                                        <a href={batch.returnReceiptUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                                            Xem biên nhận
                                        </a>
                                    ) : (
                                        '—'
                                    )}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>Giao trả lúc</Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.returnedAt
                                        ? dayjs(batch.returnedAt).format('DD/MM/YYYY HH:mm')
                                        : '—'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>Xác nhận lúc</Typography>
                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ mt: 0.25 }}>
                                    {batch.confirmedAt
                                        ? dayjs(batch.confirmedAt).format('DD/MM/YYYY HH:mm')
                                        : '—'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </CollapsibleCard>

                {/* Dòng theo nhà đài Table - Exact Columns requested: STT, Tên nhà đài, Số lượng, Giá trị trả, Trạng thái */}
                <CollapsibleCard
                    title="Dòng theo nhà đài"
                    expanded
                    onToggle={() => undefined}
                    extraAction={
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon fontSize="small" />}
                            onClick={() => {
                                setSelectedStationName(null);
                                setTicketsModalOpen(true);
                            }}
                            sx={{
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.825rem',
                                color: '#0f172a',
                                borderColor: '#cbd5e1',
                                bgcolor: '#fff',
                                boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)',
                                px: 1.75,
                                py: 0.5,
                                '&:hover': {
                                    borderColor: '#94a3b8',
                                    bgcolor: '#f8fafc',
                                },
                            }}
                        >
                            Xem danh sách vé
                        </Button>
                    }
                >
                    <TableContainer sx={{ px: 1, pb: 2 }}>
                        <Table size="medium">
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                    <TableCell align="center" width={60} sx={{ fontWeight: 700, color: '#334155' }}>
                                        STT
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#334155' }}>
                                        Tên nhà đài
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#334155' }}>
                                        Số lượng
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#166534' }}>
                                        Giá trị trả
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: '#334155' }}>
                                        Trạng thái
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(batch.lines || []).map((line, index) => (
                                    <TableRow key={line.id} hover>
                                        <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b' }}>
                                            {index + 1}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                            {line.lotteryStationName || `#${line.lotteryStationId}`}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#0284c7' }}>
                                            {new Intl.NumberFormat('vi-VN').format(line.totalQuantity ?? 0)} vé
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: '#15803d' }}>
                                            {formatImportCost(line.totalReturnValue)} VNĐ
                                        </TableCell>
                                        <TableCell align="center">
                                            <span
                                                className={`admin-status-badge ${getReturnBatchLineStatusBadgeClass(line.status)}`}
                                            >
                                                {getReturnBatchLineStatusLabel(line.status, line.statusLabel)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(batch.lines || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography color="text.secondary" sx={{ py: 3 }}>
                                                Chưa có dòng trả vé.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CollapsibleCard>
            </Stack>

            <ReturnBatchTicketsModal
                open={ticketsModalOpen}
                batchId={batch.id}
                initialStationName={selectedStationName}
                onClose={() => setTicketsModalOpen(false)}
            />
        </Box>
    );
};
