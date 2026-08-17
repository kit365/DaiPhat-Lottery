"use client";

import { useState, type ReactNode } from 'react';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
    Box,
    Card,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import { ROUTES } from '../../../../../constants/routes';
import { useImportBatchDetail } from '../../../import-batch/hooks/useImportBatch';
import { formatSettlementMoney } from '../../utils/settlementCashflow';
import {
    getImportBatchLineStatusBadgeClass,
    getImportBatchLineStatusLabel,
    getImportBatchStatusBadgeClass,
    getImportBatchStatusLabel,
} from '../../../import-batch/utils/batchTypeLabels';
import { useReturnBatchDetail } from '../../../return-batch/hooks/useReturnBatch';
import type { ReturnBatchStatus } from '../../../return-batch/types/returnBatch.type';
import {
    getReturnBatchLineStatusBadgeClass,
    getReturnBatchLineStatusLabel,
    getReturnBatchStatusBadgeClass,
    getReturnBatchStatusLabel,
} from '../../../return-batch/utils/returnBatchLabels';
import type {
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
    SupplierSettlement,
} from '../../types/supplierSettlement.type';

interface Props {
    inventoryByStation: SettlementStationInventory[];
    importBatches: SettlementOverviewImportBatch[];
    returnBatches: SettlementOverviewReturnBatch[];
    remainingPayableAmount?: number;
    settlement?: SupplierSettlement | null;
    hideAllStationsTab?: boolean;
}

const stationMetrics = (row: SettlementStationInventory) => {
    const imported = row.importedQuantity ?? 0;
    const sold = row.soldQuantity ?? 0;
    const remaining =
        row.remainingQuantity !== undefined && row.remainingQuantity >= 0
            ? row.remainingQuantity
            : Math.max(0, imported - (row.soldQuantity || 0));
    const returned = row.returnQuantity ?? 0;
    const lost = row.lostQuantity ?? 0;
    const damaged = row.damagedQuantity ?? 0;
    const voided = row.voidedQuantity ?? 0;
    const excessReturn = Math.max(0, returned - Math.max(0, imported - sold - lost - damaged));
    const returnShortfall = remaining;
    return { imported, sold, remaining, returned, lost, damaged, voided, excessReturn, returnShortfall };
};

const headerCellSx = {
    fontWeight: 700,
    color: '#475569',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
};

const stationNameFromInventory = (
    stationId: number | undefined,
    inventory: SettlementStationInventory[]
) => {
    if (!stationId) return '—';
    const hit = inventory.find((r) => r.lotteryStationId === stationId);
    return hit?.lotteryStationName || `Đài #${stationId}`;
};

export const AllStationsTable = ({
    inventoryByStation,
}: {
    inventoryByStation: SettlementStationInventory[];
}) => {
    const totals = inventoryByStation.reduce(
        (acc, row) => {
            const m = stationMetrics(row);
            acc.imported += m.imported;
            acc.sold += m.sold;
            acc.remaining += m.remaining;
            acc.returned += m.returned;
            acc.lost += m.lost;
            acc.damaged += m.damaged;
            acc.voided += m.voided;
            acc.excessReturn += m.excessReturn;
            acc.returnShortfall += m.returnShortfall;
            return acc;
        },
        {
            imported: 0,
            sold: 0,
            remaining: 0,
            returned: 0,
            lost: 0,
            damaged: 0,
            voided: 0,
            excessReturn: 0,
            returnShortfall: 0,
        }
    );
    const totalDelta = totals.excessReturn > 0 ? totals.excessReturn : -totals.returnShortfall;

    return (
        <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'auto', bgcolor: '#ffffff' }}>
            <Table size="small" sx={{ minWidth: 920 }}>
                <TableHead>
                    <TableRow>
                        <TableCell colSpan={2} sx={{ ...headerCellSx, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }} />
                        <TableCell
                            colSpan={4}
                            align="center"
                            sx={{ ...headerCellSx, color: '#1d4ed8', bgcolor: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}
                        >
                            Hệ thống tồn kho
                        </TableCell>
                        <TableCell
                            colSpan={3}
                            align="center"
                            sx={{ ...headerCellSx, color: '#b45309', bgcolor: '#fffbeb', borderBottom: '1px solid #fde68a' }}
                        >
                            Xử lý sự cố & chênh lệch
                        </TableCell>
                        <TableCell
                            colSpan={2}
                            align="center"
                            sx={{ ...headerCellSx, color: '#0f766e', bgcolor: '#f0fdfa', borderBottom: '1px solid #99f6e4' }}
                        >
                            Đối soát trả vé
                        </TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell sx={headerCellSx}>STT</TableCell>
                        <TableCell sx={headerCellSx}>Nhà đài</TableCell>
                        <TableCell align="right" sx={headerCellSx}>Nhập</TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, color: '#0284c7' }}>Đã bán</TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, color: '#16a34a' }}>Tồn kho</TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, color: '#ea580c' }}>Đã lập phiếu</TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, bgcolor: '#fffbeb', color: '#dc2626' }}>Thất lạc</TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, bgcolor: '#fffbeb', color: '#ea580c' }}>Hư hỏng</TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, bgcolor: '#fffbeb', color: '#7c3aed' }}>Báo hủy</TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, bgcolor: '#f0fdfa' }}>Dự kiến trả</TableCell>
                        <TableCell align="right" sx={{ ...headerCellSx, bgcolor: '#f0fdfa' }}>Chênh lệch trả</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {inventoryByStation.map((row, idx) => {
                        const m = stationMetrics(row);
                        const delta = m.excessReturn > 0 ? m.excessReturn : m.returnShortfall > 0 ? -m.returnShortfall : 0;
                        return (
                            <TableRow key={row.lotteryStationId || idx} hover>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                    {row.lotteryStationName || `Đài #${row.lotteryStationId}`}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                    {m.imported.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: m.sold > 0 ? '#0284c7' : '#94a3b8' }}>
                                    {m.sold.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: m.remaining > 0 ? '#16a34a' : '#94a3b8' }}>
                                    {m.remaining.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: m.returned > 0 ? '#ea580c' : '#94a3b8' }}>
                                    {m.returned.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: m.lost > 0 ? '#dc2626' : '#94a3b8', bgcolor: '#fffbeb' }}>
                                    {m.lost.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: m.damaged > 0 ? '#ea580c' : '#94a3b8', bgcolor: '#fffbeb' }}>
                                    {m.damaged.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: m.voided > 0 ? '#7c3aed' : '#94a3b8', bgcolor: '#fffbeb' }}>
                                    {m.voided.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f0fdfa', color: m.returnShortfall > 0 ? '#0f766e' : '#94a3b8' }}>
                                    {m.returnShortfall.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 800,
                                        bgcolor: '#f0fdfa',
                                        color: delta > 0 ? '#dc2626' : delta < 0 ? '#d97706' : '#16a34a',
                                    }}
                                >
                                    {delta > 0 ? `+${delta.toLocaleString('vi-VN')}` : delta === 0 ? '0' : delta.toLocaleString('vi-VN')}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {inventoryByStation.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={11} align="center">
                                <Typography color="text.secondary" sx={{ py: 3 }}>
                                    Chưa có dữ liệu phân rã theo đài.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                {inventoryByStation.length > 0 && (
                    <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                        <TableRow>
                            <TableCell colSpan={2} sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                TỔNG CỘNG ({inventoryByStation.length} nhà đài)
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                {totals.imported.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#0284c7', fontSize: '0.85rem' }}>
                                {totals.sold.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#16a34a', fontSize: '0.85rem' }}>
                                {totals.remaining.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#ea580c', fontSize: '0.85rem' }}>
                                {totals.returned.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: totals.lost > 0 ? '#dc2626' : '#64748b', bgcolor: '#fffbeb', fontSize: '0.85rem' }}>
                                {totals.lost.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: totals.damaged > 0 ? '#ea580c' : '#64748b', bgcolor: '#fffbeb', fontSize: '0.85rem' }}>
                                {totals.damaged.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: totals.voided > 0 ? '#7c3aed' : '#64748b', bgcolor: '#fffbeb', fontSize: '0.85rem' }}>
                                {totals.voided.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, bgcolor: '#f0fdfa', fontSize: '0.85rem' }}>
                                {totals.returnShortfall.toLocaleString('vi-VN')}
                            </TableCell>
                            <TableCell
                                align="right"
                                sx={{
                                    fontWeight: 800,
                                    bgcolor: '#f0fdfa',
                                    fontSize: '0.85rem',
                                    color: totalDelta > 0 ? '#dc2626' : totalDelta < 0 ? '#d97706' : '#16a34a',
                                }}
                            >
                                {totalDelta > 0 ? `+${totalDelta.toLocaleString('vi-VN')}` : totalDelta === 0 ? '0' : totalDelta.toLocaleString('vi-VN')}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
        </TableContainer>
    );
};

const openInNewTab = (path: string) => {
    window.open(path, '_blank', 'noopener,noreferrer');
};

const ViewDetailButton = ({
    title,
    href,
}: {
    title: string;
    href: string;
}) => (
    <Tooltip title={`${title} (tab mới)`}>
        <IconButton
            size="small"
            color="primary"
            aria-label={title}
            onClick={() => openInNewTab(href)}
            sx={{
                bgcolor: '#f1f5f9',
                '&:hover': { bgcolor: '#e2e8f0' },
            }}
        >
            <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
    </Tooltip>
);

const Fact = ({
    label,
    value,
    emphasize = false,
    color,
}: {
    label: string;
    value: ReactNode;
    emphasize?: boolean;
    color?: string;
}) => (
    <Box sx={{ minWidth: 100, flex: '1 1 auto' }}>
        <Typography
            variant="caption"
            color="#64748b"
            sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.675rem' }}
        >
            {label}
        </Typography>
        <Typography
            variant="body2"
            sx={{
                fontWeight: emphasize ? 800 : 700,
                color: color || (emphasize ? '#0f172a' : '#334155'),
                fontSize: emphasize ? '0.925rem' : '0.85rem',
                mt: 0.25,
            }}
        >
            {value}
        </Typography>
    </Box>
);

const ImportBatchItem = ({
    batch,
    inventoryByStation,
}: {
    batch: SettlementOverviewImportBatch;
    inventoryByStation: SettlementStationInventory[];
}) => {
    const { data: detail, isLoading, isError } = useImportBatchDetail(batch.id);
    const lines = detail?.lines || [];
    const declareQty = detail?.totalDeclareQuantity ?? batch.totalDeclareQuantity ?? 0;
    const importedQty = detail?.totalImportedQuantity ?? batch.totalImportedQuantity ?? declareQty;
    const value = Number(
        detail?.totalImportedCostValue ??
            batch.totalImportedCostValue ??
            detail?.totalDeclaredCostValue ??
            batch.totalDeclaredCostValue ??
            0
    );
    const status = detail?.status || batch.status || undefined;
    const drawDate = detail?.drawDate || batch.drawDate;

    const linesTotalDeclare = lines.reduce((acc, l) => acc + (l.declareQuantity ?? 0), 0);
    const linesTotalImport = lines.reduce((acc, l) => acc + (l.totalQuantity ?? 0), 0);
    const linesTotalValue = lines.reduce((acc, l) => acc + (l.totalCostValue ?? l.declaredCostValue ?? 0), 0);

    return (
        <Box
            sx={{
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                bgcolor: '#fff',
                transition: 'box-shadow 0.2s ease',
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                },
            }}
        >
            <Box sx={{ px: 2.5, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            {batch.batchCode || detail?.batchCode || `#${batch.id}`}
                        </Typography>
                        <AdminStatusBadge
                            label={getImportBatchStatusLabel(status)}
                            modifier={getImportBatchStatusBadgeClass(status)}
                        />
                    </Stack>
                    <ViewDetailButton
                        title="Xem chi tiết phiếu nhập"
                        href={ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id)}
                    />
                </Stack>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Fact label="Ngày quay" value={drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—'} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Fact label="SL khai báo" value={`${declareQty.toLocaleString('vi-VN')} vé`} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Fact label="SL thực nhập" value={`${importedQty.toLocaleString('vi-VN')} vé`} emphasize color="#2563eb" />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Fact label="Thành tiền" value={`${formatSettlementMoney(value)} VNĐ`} emphasize color="#0f172a" />
                    </Grid>
                </Grid>
            </Box>

            {isLoading ? (
                <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress size={22} />
                </Box>
            ) : isError ? (
                <Typography color="text.secondary" sx={{ py: 2.5, textAlign: 'center' }}>
                    Không tải được chi tiết theo nhà đài.
                </Typography>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#ffffff' }}>
                                <TableCell sx={headerCellSx}>Nhà đài</TableCell>
                                <TableCell align="right" sx={headerCellSx}>SL khai báo</TableCell>
                                <TableCell align="right" sx={{ ...headerCellSx, color: '#2563eb' }}>SL thực nhập</TableCell>
                                <TableCell align="right" sx={headerCellSx}>Đơn giá</TableCell>
                                <TableCell align="right" sx={{ ...headerCellSx, color: '#0f172a' }}>Thành tiền</TableCell>
                                <TableCell sx={headerCellSx}>Trạng thái</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Typography color="text.secondary" sx={{ py: 2 }}>
                                            Phiếu nhập chưa có dòng nhà đài.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                lines.map((line, idx) => (
                                    <TableRow key={line.id || idx} hover>
                                        <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                            {stationNameFromInventory(line.lotteryStationId, inventoryByStation)}
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: '#64748b' }}>
                                            {(line.declareQuantity ?? 0).toLocaleString('vi-VN')}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#2563eb' }}>
                                            {(line.totalQuantity ?? 0).toLocaleString('vi-VN')}
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: '#64748b' }}>
                                            {formatSettlementMoney(line.importCost)} VNĐ
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                            {formatSettlementMoney(line.totalCostValue ?? line.declaredCostValue)} VNĐ
                                        </TableCell>
                                        <TableCell>
                                            <AdminStatusBadge
                                                label={getImportBatchLineStatusLabel(line.status)}
                                                modifier={getImportBatchLineStatusBadgeClass(line.status)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        {lines.length > 1 && (
                            <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#334155' }}>
                                        TỔNG CỘNG ({lines.length} đài)
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#64748b' }}>
                                        {linesTotalDeclare.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#2563eb' }}>
                                        {linesTotalImport.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: '#94a3b8' }}>—</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                                        {formatSettlementMoney(linesTotalValue)} VNĐ
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

const ReturnBatchItem = ({
    batch,
}: {
    batch: SettlementOverviewReturnBatch;
}) => {
    const { data: detail, isLoading, isError } = useReturnBatchDetail(batch.id);
    const lines = detail?.lines || [];
    const qty = detail?.totalQuantity ?? batch.totalQuantity ?? 0;
    const value = Number(detail?.totalReturnValue ?? batch.totalReturnValue ?? 0);
    const status = detail?.status || batch.status;
    const statusLabel = detail?.statusLabel || batch.statusLabel;
    const drawDate = detail?.drawDate || batch.drawDate;
    const cutoffAt = detail?.returnCutOffAt || batch.returnCutOffAt;
    const cutoffTime = detail?.returnCutOffTime || batch.returnCutOffTime;
    const cutoff = cutoffAt
        ? dayjs(cutoffAt).format('DD/MM/YYYY HH:mm')
        : cutoffTime || '—';

    const linesTotalQty = lines.reduce((acc, l) => acc + (l.totalQuantity ?? 0), 0);
    const linesTotalValue = lines.reduce((acc, l) => acc + (l.totalReturnValue ?? 0), 0);
    const linesTotalInspectable = lines.reduce((acc, l) => acc + (l.remainingInspectableQuantity ?? 0), 0);

    return (
        <Box
            sx={{
                border: '1px solid #fed7aa',
                borderRadius: '14px',
                overflow: 'hidden',
                bgcolor: '#fff',
                transition: 'box-shadow 0.2s ease',
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.06)',
                },
            }}
        >
            <Box sx={{ px: 2.5, py: 2, bgcolor: '#fffbf5', borderBottom: '1px solid #fed7aa' }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            {batch.batchCode || detail?.batchCode || `#${batch.id}`}
                        </Typography>
                        <AdminStatusBadge
                            label={getReturnBatchStatusLabel(status as ReturnBatchStatus | null, statusLabel)}
                            modifier={getReturnBatchStatusBadgeClass(status as ReturnBatchStatus | null)}
                        />
                    </Stack>
                    <ViewDetailButton
                        title="Xem chi tiết phiếu trả vé"
                        href={ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id)}
                    />
                </Stack>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Fact label="Ngày quay" value={drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—'} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Fact label="SL thực trả" value={`${qty.toLocaleString('vi-VN')} vé`} emphasize color="#ea580c" />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Fact label="Giá trị trả" value={`${formatSettlementMoney(value)} VNĐ`} emphasize color="#0f172a" />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Fact label="Hạn trả vé" value={cutoff} />
                    </Grid>
                </Grid>
            </Box>

            {isLoading ? (
                <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress size={22} />
                </Box>
            ) : isError ? (
                <Typography color="text.secondary" sx={{ py: 2.5, textAlign: 'center' }}>
                    Không tải được chi tiết theo nhà đài.
                </Typography>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#ffffff' }}>
                                <TableCell sx={headerCellSx}>Nhà đài</TableCell>
                                <TableCell align="right" sx={{ ...headerCellSx, color: '#ea580c' }}>SL trả</TableCell>
                                <TableCell align="right" sx={{ ...headerCellSx, color: '#0f172a' }}>Giá trị trả</TableCell>
                                <TableCell align="right" sx={headerCellSx}>Còn kiểm tra</TableCell>
                                <TableCell sx={headerCellSx}>Trạng thái</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography color="text.secondary" sx={{ py: 2 }}>
                                            Phiếu trả chưa có dòng nhà đài.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                lines.map((line, idx) => (
                                    <TableRow key={line.id || idx} hover>
                                        <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                            {line.lotteryStationName || `Đài #${line.lotteryStationId}`}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: line.totalQuantity ? '#ea580c' : '#94a3b8' }}>
                                            {(line.totalQuantity ?? 0).toLocaleString('vi-VN')}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: line.totalReturnValue ? '#0f172a' : '#94a3b8' }}>
                                            {formatSettlementMoney(line.totalReturnValue)} VNĐ
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: line.remainingInspectableQuantity ? '#0f766e' : '#94a3b8', fontWeight: 600 }}>
                                            {(line.remainingInspectableQuantity ?? 0).toLocaleString('vi-VN')}
                                        </TableCell>
                                        <TableCell>
                                            <AdminStatusBadge
                                                label={getReturnBatchLineStatusLabel(line.status, line.statusLabel)}
                                                modifier={getReturnBatchLineStatusBadgeClass(line.status)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        {lines.length > 1 && (
                            <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#334155' }}>
                                        TỔNG CỘNG ({lines.length} đài)
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#ea580c' }}>
                                        {linesTotalQty.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                                        {formatSettlementMoney(linesTotalValue)} VNĐ
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f766e' }}>
                                        {linesTotalInspectable.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

const ImportBatchesCard = ({
    importBatches,
    inventoryByStation,
}: {
    importBatches: SettlementOverviewImportBatch[];
    inventoryByStation: SettlementStationInventory[];
}) => {
    const showAllTab = importBatches.length > 1;
    const [tab, setTab] = useState(0);
    const visibleBatches = showAllTab && tab > 0 ? [importBatches[tab - 1]] : importBatches;
    const totalQty = importBatches.reduce(
        (sum, batch) => sum + (batch.totalImportedQuantity ?? batch.totalDeclareQuantity ?? 0),
        0
    );
    const totalValue = importBatches.reduce(
        (sum, batch) => sum + Number(batch.totalImportedCostValue ?? batch.totalDeclaredCostValue ?? 0),
        0
    );

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            bgcolor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <MoveToInboxOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            Phiếu nhập vé
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {importBatches.length} phiếu · {totalQty.toLocaleString('vi-VN')} vé · {formatSettlementMoney(totalValue)} VNĐ
                        </Typography>
                    </Box>
                </Stack>
            </Box>
            {showAllTab && (
                <Box sx={{ borderBottom: '1px solid #e2e8f0', px: 2, bgcolor: '#fafafa' }}>
                    <Tabs
                        value={tab}
                        onChange={(_, next: number) => setTab(next)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ minHeight: 44, '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 700, fontSize: '0.82rem' } }}
                    >
                        <Tab
                            label={
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                    <span>Tất cả</span>
                                    <Chip size="small" label={totalQty.toLocaleString('vi-VN')} sx={{ height: 18, fontSize: '0.68rem', fontWeight: 800 }} />
                                </Stack>
                            }
                        />
                        {importBatches.map((batch) => (
                            <Tab
                                key={batch.id}
                                label={
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <span>{batch.batchCode || `Phiếu #${batch.id}`}</span>
                                        <Chip
                                            size="small"
                                            label={(batch.totalImportedQuantity ?? batch.totalDeclareQuantity ?? 0).toLocaleString('vi-VN')}
                                            sx={{ height: 18, fontSize: '0.68rem', fontWeight: 800 }}
                                        />
                                    </Stack>
                                }
                            />
                        ))}
                    </Tabs>
                </Box>
            )}
            <Box sx={{ p: 2.5 }}>
                {visibleBatches.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                        Chưa có phiếu nhập gắn với kỳ đối soát này.
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        {visibleBatches.map((batch) => (
                            <ImportBatchItem
                                key={batch.id}
                                batch={batch}
                                inventoryByStation={inventoryByStation}
                            />
                        ))}
                    </Stack>
                )}
            </Box>
        </Card>
    );
};

const ReturnBatchesCard = ({
    returnBatches,
}: {
    returnBatches: SettlementOverviewReturnBatch[];
}) => {
    const showAllTab = returnBatches.length > 1;
    const [tab, setTab] = useState(0);
    const visibleBatches = showAllTab && tab > 0 ? [returnBatches[tab - 1]] : returnBatches;
    const totalQty = returnBatches.reduce((sum, batch) => sum + (batch.totalQuantity ?? 0), 0);
    const totalValue = returnBatches.reduce((sum, batch) => sum + Number(batch.totalReturnValue ?? 0), 0);

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: '16px',
                border: '1px solid #fed7aa',
                bgcolor: '#ffffff',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #fed7aa', bgcolor: '#fffbf5' }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            bgcolor: '#fff7ed',
                            color: '#ea580c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <AssignmentReturnOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            Phiếu trả vé
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {returnBatches.length} phiếu · {totalQty.toLocaleString('vi-VN')} vé · {formatSettlementMoney(totalValue)} VNĐ
                        </Typography>
                    </Box>
                </Stack>
            </Box>
            {showAllTab && (
                <Box sx={{ borderBottom: '1px solid #fed7aa', px: 2, bgcolor: '#fffbf5' }}>
                    <Tabs
                        value={tab}
                        onChange={(_, next: number) => setTab(next)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ minHeight: 44, '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 700, fontSize: '0.82rem' } }}
                    >
                        <Tab
                            label={
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                    <span>Tất cả</span>
                                    <Chip size="small" label={totalQty.toLocaleString('vi-VN')} sx={{ height: 18, fontSize: '0.68rem', fontWeight: 800 }} />
                                </Stack>
                            }
                        />
                        {returnBatches.map((batch) => (
                            <Tab
                                key={batch.id}
                                label={
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <span>{batch.batchCode || `Phiếu #${batch.id}`}</span>
                                        <Chip
                                            size="small"
                                            label={(batch.totalQuantity ?? 0).toLocaleString('vi-VN')}
                                            sx={{ height: 18, fontSize: '0.68rem', fontWeight: 800 }}
                                        />
                                    </Stack>
                                }
                            />
                        ))}
                    </Tabs>
                </Box>
            )}
            <Box sx={{ p: 2.5 }}>
                {visibleBatches.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                        Chưa có phiếu trả gắn với kỳ đối soát này.
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        {visibleBatches.map((batch) => (
                            <ReturnBatchItem key={batch.id} batch={batch} />
                        ))}
                    </Stack>
                )}
            </Box>
        </Card>
    );
};

export const SettlementReconciliationTabs = ({
    inventoryByStation,
    importBatches,
    returnBatches,
    remainingPayableAmount,
}: Props) => {
    return (
        <Stack spacing={2.5} sx={{ mb: 3 }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
                <Box>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                        Chi tiết phiếu nhập / trả
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {importBatches.length} phiếu nhập · {returnBatches.length} phiếu trả
                    </Typography>
                </Box>
                {remainingPayableAmount != null && (
                    <Typography variant="caption" color="text.secondary">
                        Tổng phải trả NCC còn lại:{' '}
                        <strong style={{ color: '#dc2626' }}>
                            {formatSettlementMoney(remainingPayableAmount)} VNĐ
                        </strong>
                    </Typography>
                )}
            </Stack>
            <ImportBatchesCard importBatches={importBatches} inventoryByStation={inventoryByStation} />
            <ReturnBatchesCard returnBatches={returnBatches} />
        </Stack>
    );
};
