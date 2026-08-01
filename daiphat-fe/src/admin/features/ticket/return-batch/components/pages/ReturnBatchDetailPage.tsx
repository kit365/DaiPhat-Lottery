import {
    Alert,
    Box,
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
import dayjs from 'dayjs';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
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
    canContinueInspection,
    canStartInspection,
    getReturnBatchLineStatusBadgeClass,
    getReturnBatchLineStatusLabel,
    getReturnBatchStatusChipColor,
    getReturnBatchStatusLabel,
} from '../../utils/returnBatchLabels';
import { InspectTicketsDialog } from '../sections/InspectTicketsDialog';

export const ReturnBatchDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const { data: batch, isLoading, isError, refetch } = useReturnBatchDetail(id);
    const confirmHandover = useConfirmReturnHandover();
    const startInspection = useStartReturnInspection();
    const [inspectOpen, setInspectOpen] = useState(false);

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

    const handleConfirmHandover = async () => {
        try {
            await confirmHandover.mutateAsync({
                id: batch.id,
                payload: { returnReceiptUrl: batch.returnReceiptUrl },
            });
            toast.success('Đã xác nhận bàn giao — sê-ri chuyển sang Đã trả.');
        } catch {
            toast.error('Không thể xác nhận bàn giao.');
        }
    };

    const handleInspectTickets = async () => {
        if (canStartInspection(batch.status)) {
            try {
                await startInspection.mutateAsync(batch.id);
            } catch {
                toast.error('Không thể bắt đầu kiểm tra vé.');
                return;
            }
        }
        setInspectOpen(true);
    };

    return (
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
            <div className="mb-[calc(3*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))] flex-wrap">
                <div className="mr-auto">
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                        <Title title={`Phiếu trả vé #${batch.id}`} />
                        <Chip
                            size="small"
                            label={getReturnBatchStatusLabel(batch.status, batch.statusLabel)}
                            color={getReturnBatchStatusChipColor(batch.status)}
                            variant="outlined"
                        />
                    </Stack>
                    <Breadcrumb
                        items={[
                            { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                            { label: 'Trả vé NCC', to: ROUTES.ADMIN.RETURN_BATCH.LIST },
                            { label: `#${batch.id}` },
                        ]}
                    />
                </div>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {canStartInspection(batch.status) && (
                        <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                            <LoadingButton
                                label="Kiểm tra vé"
                                className="btn-primary-admin"
                                loading={startInspection.isPending}
                                onClick={handleInspectTickets}
                            />
                        </CanAccess>
                    )}
                    {canContinueInspection(batch.status) && (
                        <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                            <LoadingButton
                                label="Tiếp tục kiểm tra"
                                className="btn-primary-admin"
                                onClick={() => setInspectOpen(true)}
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
            </div>

            {batch.supplierSettlementId && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Liên kết đối soát #{batch.supplierSettlementId}. Giá trị trả của kỳ đối soát được
                    cập nhật khi vé đã kiểm tra và sẵn sàng trả NCC (chờ trả / đã trả).
                </Alert>
            )}

            {batch.status === 'PENDING_HANDOVER' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Kiểm tra đã hoàn tất — vé đang chờ bàn giao nhà cung cấp. Sau khi giao xong, bấm{' '}
                    <strong>Xác nhận bàn giao</strong>.
                </Alert>
            )}

            <Stack spacing={2}>
                <CollapsibleCard title="Thông tin phiếu" expanded onToggle={() => undefined}>
                    <Box
                        sx={{
                            p: 3,
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                            gap: 3,
                        }}
                    >
                        <Box>
                            <Typography variant="caption" color="text.secondary">Nhà cung cấp</Typography>
                            <Typography fontWeight={700}>{batch.supplierName || '—'}</Typography>
                            <Typography variant="body2" color="text.secondary">{batch.supplierCode}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Ngày quay</Typography>
                            <Typography fontWeight={600}>
                                {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Tổng số lượng</Typography>
                            <Typography fontWeight={600}>{batch.totalQuantity ?? 0}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Tổng giá trị trả</Typography>
                            <Typography fontWeight={600}>
                                {formatImportCost(batch.totalReturnValue)} VNĐ
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Biên nhận trả</Typography>
                            <Typography>
                                {batch.returnReceiptUrl ? (
                                    <a href={batch.returnReceiptUrl} target="_blank" rel="noreferrer">
                                        Xem biên nhận
                                    </a>
                                ) : (
                                    '—'
                                )}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Ghi chú</Typography>
                            <Typography>{batch.note || '—'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Giao trả lúc</Typography>
                            <Typography>
                                {batch.returnedAt
                                    ? dayjs(batch.returnedAt).format('DD/MM/YYYY HH:mm')
                                    : '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Xác nhận lúc</Typography>
                            <Typography>
                                {batch.confirmedAt
                                    ? dayjs(batch.confirmedAt).format('DD/MM/YYYY HH:mm')
                                    : '—'}
                            </Typography>
                        </Box>
                    </Box>
                </CollapsibleCard>

                <CollapsibleCard title="Dòng theo nhà đài" expanded onToggle={() => undefined}>
                    <TableContainer sx={{ px: 1, pb: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nhà đài</TableCell>
                                    <TableCell>Trạng thái</TableCell>
                                    <TableCell align="right">Sê-ri gắn</TableCell>
                                    <TableCell align="right">Số lượng</TableCell>
                                    <TableCell align="right">Giá trị trả</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(batch.lines || []).map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell>{line.lotteryStationName || `#${line.lotteryStationId}`}</TableCell>
                                        <TableCell>
                                            <span
                                                className={`admin-status-badge ${getReturnBatchLineStatusBadgeClass(line.status)}`}
                                            >
                                                {getReturnBatchLineStatusLabel(line.status, line.statusLabel)}
                                            </span>
                                        </TableCell>
                                        <TableCell align="right">{line.attachedSerialCount ?? 0}</TableCell>
                                        <TableCell align="right">{line.totalQuantity ?? 0}</TableCell>
                                        <TableCell align="right">
                                            {formatImportCost(line.totalReturnValue)} VNĐ
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(batch.lines || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            Chưa có dòng trả vé.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CollapsibleCard>
            </Stack>

            <InspectTicketsDialog
                open={inspectOpen}
                batchId={batch.id}
                onClose={() => setInspectOpen(false)}
                onCompleted={() => refetch()}
            />
        </Box>
    );
};
