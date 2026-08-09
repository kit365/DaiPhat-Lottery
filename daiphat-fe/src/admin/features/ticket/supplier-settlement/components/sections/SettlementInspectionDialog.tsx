"use client";

import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    Box,
    Button,
    Card,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AdminStatusBadge } from '../../../../../components/ui/AdminStatusBadge';
import { StatRibbonCard, StatRibbonCardsGrid } from '../../../../../components/ui/StatRibbonCard';
import { UploadSingleFile } from '../../../../../components/upload/UploadSingleFile';
import { AppToast } from '../../../../../../utils/toast.util';
import { formatVnd } from '../../../import-batch/utils/importCostCalculator';
import { updateReturnEvidenceUrl } from '../../../return-batch/services/returnBatchService';
import type {
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
    SupplierSettlement,
    SupplierSettlementKpis,
} from '../../types/supplierSettlement.type';

interface SettlementInspectionDialogProps {
    open: boolean;
    onClose: () => void;
    settlement: SupplierSettlement;
    kpis: SupplierSettlementKpis;
    importBatches: SettlementOverviewImportBatch[];
    returnBatches: SettlementOverviewReturnBatch[];
    inventoryByStation?: SettlementStationInventory[];
    onRefresh?: () => void;
}

const receiptThumbSx = {
    display: 'block',
    width: '100%',
    maxHeight: 280,
    borderRadius: 1,
    border: '1px solid',
    borderColor: 'divider',
    objectFit: 'contain' as const,
    bgcolor: 'background.paper',
};

export const SettlementInspectionDialog = ({
    open,
    onClose,
    settlement,
    kpis,
    importBatches = [],
    returnBatches = [],
    inventoryByStation = [],
    onRefresh,
}: SettlementInspectionDialogProps) => {
    const primaryImportBatch = importBatches[0];
    const primaryReturnBatch = returnBatches[0];

    const [returnEvidenceUrl, setReturnEvidenceUrl] = useState('');

    const totalImportQty = kpis?.totalImportedTickets ?? 0;
    const totalSoldQty = kpis?.totalSoldTickets ?? 0;
    const totalRemainingQty = kpis?.totalRemainingTickets ?? 0;
    const totalReturnQty = kpis?.totalPreparedForReturnTickets ?? 0;
    const totalImportVal = settlement?.totalImportValue ?? 0;
    const totalReturnVal = settlement?.totalReturnValue ?? 0;
    const diffQty = totalRemainingQty - totalReturnQty;
    const isBalanced = diffQty === 0;

    const importReceiptUrl =
        primaryImportBatch?.receiptImageUrl?.trim() ||
        primaryImportBatch?.evidenceUrl?.trim() ||
        '';

    useEffect(() => {
        if (!open) return;
        setReturnEvidenceUrl(
            primaryReturnBatch?.returnReceiptEvidenceUrl?.trim() ||
                primaryReturnBatch?.returnReceiptUrl?.trim() ||
                ''
        );
    }, [
        open,
        primaryReturnBatch?.id,
        primaryReturnBatch?.returnReceiptEvidenceUrl,
        primaryReturnBatch?.returnReceiptUrl,
    ]);

    const persistReturnEvidence = useCallback(
        async (url: string) => {
            if (!primaryReturnBatch?.id) {
                AppToast.error('Không tìm thấy phiếu trả vé để lưu biên lai.');
                return;
            }
            if (!url.trim()) return;

            try {
                const res = await updateReturnEvidenceUrl(primaryReturnBatch.id, url.trim());
                if (res.success) {
                    AppToast.success('Đã lưu ảnh biên lai trả vé thành công!');
                    onRefresh?.();
                } else {
                    AppToast.error(res.message || 'Lưu ảnh biên lai thất bại.');
                }
            } catch (err: any) {
                AppToast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu biên lai.');
            }
        },
        [onRefresh, primaryReturnBatch?.id]
    );

    const handleReturnEvidenceChange = useCallback(
        (value: string | File | null) => {
            const nextUrl = typeof value === 'string' ? value : '';
            setReturnEvidenceUrl(nextUrl);
            if (nextUrl.trim()) {
                void persistReturnEvidence(nextUrl);
            }
        },
        [persistReturnEvidence]
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            scroll="paper"
            PaperProps={{ className: 'admin-theme' }}
        >
            <DialogTitle component="div" sx={{ pb: 1.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1.5}
                >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="h6" fontWeight={800} color="#0f172a">
                            Kiểm tra & Đối soát thông tin Nhập - Trả vé số
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            Nhà cung cấp: <strong style={{ color: '#0f172a' }}>{settlement?.supplierName || '—'}</strong>
                            {' · '}
                            Mã đối soát: <strong>#{settlement?.id}</strong>
                            {' · '}
                            Kỳ: {settlement?.periodFrom} — {settlement?.periodTo}
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 0.75,
                                px: 1.25,
                                py: 0.9,
                                borderRadius: '10px',
                                maxWidth: { xs: '100%', sm: 300 },
                                bgcolor: isBalanced ? '#f0fdf4' : '#fffbeb',
                                border: `1px solid ${isBalanced ? '#bbf7d0' : '#fde68a'}`,
                            }}
                        >
                            {isBalanced ? (
                                <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: '#16a34a', mt: 0.1, flexShrink: 0 }} />
                            ) : (
                                <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: '#d97706', mt: 0.1, flexShrink: 0 }} />
                            )}
                            <Typography
                                variant="caption"
                                sx={{
                                    color: isBalanced ? '#166534' : '#92400e',
                                    fontWeight: 600,
                                    lineHeight: 1.45,
                                }}
                            >
                                {isBalanced ? (
                                    <>Đối soát khớp — tồn kho trùng với phiếu trả</>
                                ) : (
                                    <>
                                        Chênh lệch <strong>{Math.abs(diffQty).toLocaleString()} vé</strong>
                                        {' · '}
                                        Tồn {totalRemainingQty.toLocaleString()} / Trả {totalReturnQty.toLocaleString()}
                                    </>
                                )}
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={onClose} sx={{ bgcolor: '#f1f5f9' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 3, bgcolor: '#f8fafc' }}>
                <Box sx={{ mb: 3 }}>
                    <StatRibbonCardsGrid columns={{ xs: 1, sm: 2, md: 4 }}>
                        <StatRibbonCard
                            value={`${totalImportQty.toLocaleString('vi-VN')} vé`}
                            label={`Vé nhập kho (Sáng) · ${formatVnd(totalImportVal)}`}
                            icon="solar:import-bold-duotone"
                            color="cyan"
                            valueSize="compact"
                            sx={{ minHeight: 104 }}
                        />
                        <StatRibbonCard
                            value={`${totalSoldQty.toLocaleString('vi-VN')} vé`}
                            label={`Đã bán trong ngày · Tồn ${totalRemainingQty.toLocaleString('vi-VN')} vé`}
                            icon="solar:cart-large-2-bold-duotone"
                            color="orange"
                            valueSize="compact"
                            sx={{ minHeight: 104 }}
                        />
                        <StatRibbonCard
                            value={`${totalReturnQty.toLocaleString('vi-VN')} vé`}
                            label={`Phiếu trả (Chiều) · ${formatVnd(totalReturnVal)}`}
                            icon="solar:export-bold-duotone"
                            color="green"
                            valueSize="compact"
                            sx={{ minHeight: 104 }}
                        />
                        <StatRibbonCard
                            value={`${Math.abs(diffQty).toLocaleString('vi-VN')} vé`}
                            label={isBalanced ? 'Chênh lệch đối soát · Khớp số liệu' : 'Chênh lệch đối soát · Có chênh lệch'}
                            icon={isBalanced ? 'solar:check-circle-bold-duotone' : 'solar:danger-triangle-bold-duotone'}
                            color={isBalanced ? 'green' : 'red'}
                            valueSize="compact"
                            sx={{ minHeight: 104 }}
                        />
                    </StatRibbonCardsGrid>
                </Box>

                <Card elevation={0} sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#fff', mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 1.5 }}>
                        Bảng chi tiết đối soát từng Nhà đài
                    </Typography>
                    <TableContainer className="admin-table-container">
                        <Table className="admin-table" size="medium">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center" width={56}>STT</TableCell>
                                    <TableCell align="center">Nhà đài</TableCell>
                                    <TableCell align="center">Nhập (Sáng)</TableCell>
                                    <TableCell align="center">Đã bán</TableCell>
                                    <TableCell align="center">Còn lại (Tồn)</TableCell>
                                    <TableCell align="center">Số vé trả (Chiều)</TableCell>
                                    <TableCell align="center">Trạng thái đối soát</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {inventoryByStation.map((row, idx) => {
                                    const stationDiff = row.remainingQuantity - row.returnQuantity;
                                    const stationOk = stationDiff === 0;
                                    return (
                                        <TableRow
                                            key={row.lotteryStationId || idx}
                                            hover
                                            className={stationOk ? undefined : 'admin-table-row-attention'}
                                            sx={
                                                stationOk
                                                    ? undefined
                                                    : { boxShadow: 'inset 3px 0 0 var(--palette-warning-main)' }
                                            }
                                        >
                                            <TableCell align="center">
                                                <span className="admin-cell-text">{idx + 1}</span>
                                            </TableCell>
                                            <TableCell align="center">
                                                <span className="admin-cell-title">
                                                    {row.lotteryStationName || `Đài #${row.lotteryStationId}`}
                                                </span>
                                            </TableCell>
                                            <TableCell align="center">
                                                <span className="admin-cell-text">
                                                    {row.importedQuantity.toLocaleString('vi-VN')}
                                                </span>
                                            </TableCell>
                                            <TableCell align="center">
                                                <span className="admin-cell-text">
                                                    {row.soldQuantity.toLocaleString('vi-VN')}
                                                </span>
                                            </TableCell>
                                            <TableCell align="center">
                                                <span className="admin-cell-title">
                                                    {row.remainingQuantity.toLocaleString('vi-VN')}
                                                </span>
                                            </TableCell>
                                            <TableCell align="center">
                                                <span className="admin-cell-text">
                                                    {row.returnQuantity.toLocaleString('vi-VN')}
                                                </span>
                                            </TableCell>
                                            <TableCell align="center">
                                                <span
                                                    className={`admin-status-badge admin-status-badge--compact ${
                                                        stationOk ? 'admin-status-badge--success' : 'admin-status-badge--pending'
                                                    }`}
                                                >
                                                    {stationOk ? 'Khớp' : `Lệch ${Math.abs(stationDiff).toLocaleString('vi-VN')} vé`}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {inventoryByStation.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ borderBottom: 'none', py: 6 }}>
                                            <span className="admin-datagrid-empty">
                                                Chưa có dữ liệu phân rã theo đài.
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>

                <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 1.5 }}>
                    Đối chiếu ảnh biên lai Nhập vé (Sáng) & Trả vé (Chiều)
                </Typography>

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#fff',
                                height: '100%',
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Biên lai phiếu nhập lô (Buổi sáng)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Mã lô: <strong>{primaryImportBatch?.batchCode || '—'}</strong>
                                    </Typography>
                                </Box>
                                <AdminStatusBadge label="Đã bàn giao sáng" modifier="admin-status-badge--active" />
                            </Stack>

                            {importReceiptUrl ? (
                                <ImagePreview
                                    src={importReceiptUrl}
                                    alt="Biên lai phiếu nhập lô"
                                    dialogTitle="Biên lai phiếu nhập lô (Sáng)"
                                    infoItems={[
                                        { label: 'Mã lô', value: primaryImportBatch?.batchCode || `#${primaryImportBatch?.id}` },
                                        { label: 'Nhà cung cấp', value: settlement?.supplierName || '—' },
                                    ]}
                                    thumbnailSx={receiptThumbSx}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        minHeight: 200,
                                        borderRadius: '12px',
                                        border: '1px dashed',
                                        borderColor: 'divider',
                                        bgcolor: 'var(--palette-background-neutral)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        px: 2,
                                    }}
                                >
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        Chưa có ảnh biên lai phiếu nhập lô
                                    </Typography>
                                </Box>
                            )}
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#fff',
                                height: '100%',
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                        Biên lai phiếu trả vé (Chiều)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Mã phiếu trả: <strong>{primaryReturnBatch?.id ? `#${primaryReturnBatch.id}` : '—'}</strong>
                                    </Typography>
                                </Box>
                                <AdminStatusBadge
                                    label={returnEvidenceUrl ? 'Đã có biên lai' : 'Chưa có biên lai'}
                                    modifier={
                                        returnEvidenceUrl
                                            ? 'admin-status-badge--success'
                                            : 'admin-status-badge--pending'
                                    }
                                />
                            </Stack>

                            <UploadSingleFile
                                value={returnEvidenceUrl}
                                onChange={handleReturnEvidenceChange}
                                label=""
                                autoUpload
                            />
                        </Card>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: '8px', textTransform: 'none', px: 2.5 }}>
                    Đóng
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                        AppToast.success('Đã xác nhận kiểm tra và hoàn tất đối soát nhà cung cấp!');
                        onClose();
                    }}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, px: 3 }}
                >
                    Xác nhận hoàn tất đối soát
                </Button>
            </DialogActions>
        </Dialog>
    );
};
