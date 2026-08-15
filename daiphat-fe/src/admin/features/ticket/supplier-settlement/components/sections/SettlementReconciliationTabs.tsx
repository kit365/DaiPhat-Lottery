"use client";

import { useMemo, useState } from 'react';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
    Box,
    Card,
    Chip,
    CircularProgress,
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
import { useAdminRouter } from '@/admin/hooks/useAdminRouter';
import { ROUTES } from '../../../../../constants/routes';
import { useImportBatchDetail } from '../../../import-batch/hooks/useImportBatch';
import { formatSettlementMoney } from '../../utils/settlementCashflow';
import { getImportBatchStatusLabel } from '../../../import-batch/utils/batchTypeLabels';
import { useReturnBatchDetail } from '../../../return-batch/hooks/useReturnBatch';
import { getReturnBatchStatusLabel } from '../../../return-batch/utils/returnBatchLabels';
import type {
    SettlementOverviewImportBatch,
    SettlementOverviewReturnBatch,
    SettlementStationInventory,
    SupplierSettlement,
} from '../../types/supplierSettlement.type';

type TabKey =
    | { kind: 'all' }
    | { kind: 'import'; index: number; batchId: number }
    | { kind: 'return'; index: number; batchId: number };

interface Props {
    inventoryByStation: SettlementStationInventory[];
    importBatches: SettlementOverviewImportBatch[];
    returnBatches: SettlementOverviewReturnBatch[];
    remainingPayableAmount?: number;
    settlement?: SupplierSettlement | null;
}

type StationReconcileStatus = {
    label: string;
    color: 'success' | 'warning' | 'error' | 'info' | 'default';
    kind: 'MATCHED' | 'WAITING_RETURN' | 'RETURN_SHORTFALL' | 'RETURN_EXCESS' | 'IMPORT_FAULT' | 'RESOLVED';
};

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
    const faulted = lost + damaged + voided;
    const excessReturn = Math.max(0, returned - Math.max(0, imported - sold - lost - damaged));
    const returnShortfall = remaining;
    return { imported, sold, remaining, returned, lost, damaged, voided, faulted, excessReturn, returnShortfall };
};

const resolveStationStatus = (
    row: SettlementStationInventory,
    settlement?: SupplierSettlement | null
): StationReconcileStatus => {
    const m = stationMetrics(row);
    const returnMismatch = Boolean(settlement?.returnQuantityMismatch);
    const importMismatch = Boolean(settlement?.importQuantityMismatch);
    const returnResolved = Boolean(settlement?.returnDiscrepancyResolved);
    const importResolved = Boolean(settlement?.importDiscrepancyResolved);
    const actualReturn = settlement?.actualReturnTicketQuantity;
    const systemReturn = settlement?.systemReturnQuantity;
    const isReturnShortfallPeriod =
        returnMismatch && actualReturn != null && systemReturn != null && actualReturn < systemReturn;
    const isReturnExcessPeriod =
        returnMismatch && actualReturn != null && systemReturn != null && actualReturn > systemReturn;

    if (m.excessReturn > 0) {
        return {
            kind: 'RETURN_EXCESS',
            color: returnResolved ? 'info' : 'error',
            label: returnResolved
                ? `Hệ thống ghi thiếu trả ${m.excessReturn.toLocaleString('vi-VN')} vé (đã lập phiếu bổ sung)`
                : `Hệ thống ghi thiếu trả ${m.excessReturn.toLocaleString('vi-VN')} vé — quét sê-ri / phiếu trả bổ sung`,
        };
    }

    if (m.returnShortfall > 0) {
        if (isReturnShortfallPeriod) {
            return {
                kind: 'RETURN_SHORTFALL',
                color: returnResolved ? 'info' : 'error',
                label: returnResolved
                    ? `Hệ thống ghi thừa trả ${m.returnShortfall.toLocaleString('vi-VN')} vé (đã xử lý LOST/hỏng/hủy)`
                    : `Hệ thống ghi thừa trả ${m.returnShortfall.toLocaleString('vi-VN')} vé — LOST / hỏng / hủy`,
            };
        }
        return {
            kind: 'WAITING_RETURN',
            color: 'warning',
            label: `Chờ lập phiếu trả (${m.returnShortfall.toLocaleString('vi-VN')} vé)`,
        };
    }

    if (m.faulted > 0 || (importMismatch && importResolved)) {
        return {
            kind: 'RESOLVED',
            color: 'success',
            label: m.faulted > 0 ? 'Khớp sau xử lý chênh lệch' : 'Khớp',
        };
    }

    if (isReturnExcessPeriod) {
        return {
            kind: 'RETURN_EXCESS',
            color: returnResolved ? 'info' : 'warning',
            label: returnResolved ? 'Đã ghi nhận bổ sung trả' : 'Hệ thống đang ghi thiếu trả — kiểm tra sê-ri',
        };
    }

    return { kind: 'MATCHED', color: 'success', label: 'Khớp' };
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

const AllStationsTable = ({
    inventoryByStation,
    settlement,
}: {
    inventoryByStation: SettlementStationInventory[];
    settlement?: SupplierSettlement | null;
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
    const totalStatus = resolveStationStatus(
        {
            lotteryStationId: 0,
            importedQuantity: totals.imported,
            soldQuantity: totals.sold,
            remainingQuantity: totals.remaining,
            returnQuantity: totals.returned,
            lostQuantity: totals.lost,
            damagedQuantity: totals.damaged,
            voidedQuantity: totals.voided,
            returnValue: 0,
        },
        settlement
    );
    const totalDelta = totals.excessReturn > 0 ? totals.excessReturn : -totals.returnShortfall;

    return (
        <Stack spacing={1}>
            <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'auto' }}>
                <Table size="small" sx={{ minWidth: 980 }}>
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
                                Xử lý chênh lệch
                            </TableCell>
                            <TableCell
                                colSpan={3}
                                align="center"
                                sx={{ ...headerCellSx, color: '#0f766e', bgcolor: '#f0fdfa', borderBottom: '1px solid #99f6e4' }}
                            >
                                Đối soát trả
                            </TableCell>
                        </TableRow>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell sx={headerCellSx}>STT</TableCell>
                            <TableCell sx={headerCellSx}>Nhà đài</TableCell>
                            <TableCell align="right" sx={headerCellSx}>Nhập</TableCell>
                            <TableCell align="right" sx={{ ...headerCellSx, color: '#0284c7' }}>Đã bán</TableCell>
                            <TableCell align="right" sx={{ ...headerCellSx, color: '#16a34a' }}>Tồn GOOD</TableCell>
                            <TableCell align="right" sx={{ ...headerCellSx, color: '#ea580c' }}>Đã trả phiếu</TableCell>
                            <TableCell align="right" sx={{ ...headerCellSx, bgcolor: '#fffbeb', color: '#dc2626' }}>LOST</TableCell>
                            <TableCell align="right" sx={{ ...headerCellSx, bgcolor: '#fffbeb', color: '#ea580c' }}>Hỏng</TableCell>
                            <TableCell align="right" sx={{ ...headerCellSx, bgcolor: '#fffbeb', color: '#7c3aed' }}>Hủy</TableCell>
                            <TableCell align="right" sx={{ ...headerCellSx, bgcolor: '#f0fdfa' }}>Dự kiến trả</TableCell>
                            <TableCell align="right" sx={{ ...headerCellSx, bgcolor: '#f0fdfa' }}>Δ Trả</TableCell>
                            <TableCell align="center" sx={{ ...headerCellSx, bgcolor: '#f0fdfa' }}>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {inventoryByStation.map((row, idx) => {
                            const m = stationMetrics(row);
                            const status = resolveStationStatus(row, settlement);
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
                                    <TableCell align="right" sx={{ fontWeight: 600, color: '#0284c7' }}>
                                        {m.sold.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: m.remaining > 0 ? '#16a34a' : '#94a3b8' }}>
                                        {m.remaining.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: m.returned > 0 ? '#ea580c' : '#94a3b8' }}>
                                        {m.returned.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: m.lost > 0 ? '#dc2626' : '#cbd5e1', bgcolor: '#fffbeb' }}>
                                        {m.lost.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: m.damaged > 0 ? '#ea580c' : '#cbd5e1', bgcolor: '#fffbeb' }}>
                                        {m.damaged.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: m.voided > 0 ? '#7c3aed' : '#cbd5e1', bgcolor: '#fffbeb' }}>
                                        {m.voided.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#f0fdfa' }}>
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
                                        {delta > 0 ? `+${delta.toLocaleString('vi-VN')}` : delta.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="center" sx={{ bgcolor: '#f0fdfa' }}>
                                        <Chip
                                            size="small"
                                            label={status.label}
                                            color={status.color === 'default' ? undefined : status.color}
                                            variant={
                                                status.kind === 'WAITING_RETURN' || status.kind === 'RETURN_SHORTFALL'
                                                    ? 'outlined'
                                                    : 'filled'
                                            }
                                            sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, maxWidth: 280 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {inventoryByStation.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={12} align="center">
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
                                <TableCell align="right" sx={{ fontWeight: 800, color: totals.lost > 0 ? '#dc2626' : undefined, bgcolor: '#fffbeb', fontSize: '0.85rem' }}>
                                    {totals.lost.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, bgcolor: '#fffbeb', fontSize: '0.85rem' }}>
                                    {totals.damaged.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, bgcolor: '#fffbeb', fontSize: '0.85rem' }}>
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
                                    {totalDelta > 0 ? `+${totalDelta.toLocaleString('vi-VN')}` : totalDelta.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="center" sx={{ bgcolor: '#f0fdfa' }}>
                                    <Chip
                                        size="small"
                                        label={totalStatus.label}
                                        color={totalStatus.color === 'default' ? undefined : totalStatus.color}
                                        sx={{ height: 22, fontSize: '0.68rem', fontWeight: 800, maxWidth: 280 }}
                                    />
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                Tồn GOOD = vé còn trong kho, chưa gắn phiếu trả. Dự kiến trả = tồn GOOD. Δ Trả &gt; 0 nghĩa là thực tế trả nhiều hơn hệ thống ghi nhận
                (bổ sung phiếu EXCESS); Δ Trả &lt; 0 nghĩa là hệ thống ghi nhận trả nhiều hơn thực tế (xử lý LOST / hỏng / hủy). Vé hệ thống ghi thừa nhập
                được xử lý LOST trên phiếu ADJUSTMENT.
            </Typography>
        </Stack>
    );
};

const ImportBatchTabPanel = ({
    batchId,
    inventoryByStation,
}: {
    batchId: number;
    inventoryByStation: SettlementStationInventory[];
}) => {
    const router = useAdminRouter();
    const { data: batch, isLoading, isError } = useImportBatchDetail(batchId);
    const lines = batch?.lines || [];

    const sumQty = lines.reduce((a, l) => a + (l.totalQuantity || l.declareQuantity || 0), 0);
    const sumValue = lines.reduce(
        (a, l) => a + Number(l.totalCostValue ?? l.declaredCostValue ?? 0),
        0
    );

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
            </Box>
        );
    }
    if (isError || !batch) {
        return (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                Không tải được chi tiết phiếu nhập.
            </Typography>
        );
    }

    return (
        <Stack spacing={1.5}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography variant="subtitle2" fontWeight={800}>
                        {batch.batchCode || `#${batch.id}`}
                    </Typography>
                    <Chip
                        size="small"
                        label={getImportBatchStatusLabel(batch.status)}
                        sx={{ fontWeight: 700, height: 22 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        Ngày quay:{' '}
                        {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                    </Typography>
                </Stack>
                <Tooltip title="Mở chi tiết phiếu nhập">
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id))}
                    >
                        <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>

            <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                <Table size="medium">
                    <TableHead sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <TableRow>
                            <TableCell sx={headerCellSx}>STT</TableCell>
                            <TableCell sx={headerCellSx}>Nhà đài</TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                SL khai báo
                            </TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                SL nhập
                            </TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                Đơn giá
                            </TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                Thành tiền
                            </TableCell>
                            <TableCell sx={headerCellSx}>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lines.map((line, idx) => (
                            <TableRow key={line.id || idx} hover>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                    {stationNameFromInventory(line.lotteryStationId, inventoryByStation)}
                                </TableCell>
                                <TableCell align="right">
                                    {(line.declareQuantity ?? 0).toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {(line.totalQuantity ?? 0).toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right">
                                    {formatSettlementMoney(line.importCost)} VNĐ
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {formatSettlementMoney(line.totalCostValue ?? line.declaredCostValue)} VNĐ
                                </TableCell>
                                <TableCell>{line.status || '—'}</TableCell>
                            </TableRow>
                        ))}
                        {lines.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography color="text.secondary" sx={{ py: 2.5 }}>
                                        Phiếu nhập chưa có dòng nhà đài.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    {lines.length > 0 && (
                        <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                            <TableRow>
                                <TableCell colSpan={3} sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                    Tổng {lines.length} nhà đài
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                    {sumQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell />
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                    {formatSettlementMoney(sumValue)} VNĐ
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableContainer>
        </Stack>
    );
};

const ReturnBatchTabPanel = ({
    batchId,
}: {
    batchId: number;
}) => {
    const router = useAdminRouter();
    const { data: batch, isLoading, isError } = useReturnBatchDetail(batchId);
    const lines = batch?.lines || [];

    const sumQty = lines.reduce((a, l) => a + (l.totalQuantity || 0), 0);
    const sumValue = lines.reduce((a, l) => a + Number(l.totalReturnValue || 0), 0);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
            </Box>
        );
    }
    if (isError || !batch) {
        return (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                Không tải được chi tiết phiếu trả.
            </Typography>
        );
    }

    return (
        <Stack spacing={1.5}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography variant="subtitle2" fontWeight={800}>
                        {batch.batchCode || `#${batch.id}`}
                    </Typography>
                    <Chip
                        size="small"
                        label={getReturnBatchStatusLabel(batch.status, batch.statusLabel)}
                        sx={{ fontWeight: 700, height: 22 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        Ngày quay:{' '}
                        {batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'}
                    </Typography>
                </Stack>
                <Tooltip title="Mở chi tiết phiếu trả">
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}
                    >
                        <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>

            <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                <Table size="medium">
                    <TableHead sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <TableRow>
                            <TableCell sx={headerCellSx}>STT</TableCell>
                            <TableCell sx={headerCellSx}>Nhà đài</TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                SL trả
                            </TableCell>
                            <TableCell align="right" sx={headerCellSx}>
                                Giá trị trả
                            </TableCell>
                            <TableCell sx={headerCellSx}>Trạng thái dòng</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lines.map((line, idx) => (
                            <TableRow key={line.id || idx} hover>
                                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                                    {line.lotteryStationName || `Đài #${line.lotteryStationId}`}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {(line.totalQuantity ?? 0).toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    {formatSettlementMoney(line.totalReturnValue)} VNĐ
                                </TableCell>
                                <TableCell>
                                    {line.statusLabel || line.status || '—'}
                                </TableCell>
                            </TableRow>
                        ))}
                        {lines.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography color="text.secondary" sx={{ py: 2.5 }}>
                                        Phiếu trả chưa có dòng nhà đài.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    {lines.length > 0 && (
                        <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                            <TableRow>
                                <TableCell colSpan={2} sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                    Tổng {lines.length} nhà đài
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                    {sumQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                    {formatSettlementMoney(sumValue)} VNĐ
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableContainer>
        </Stack>
    );
};

export const SettlementReconciliationTabs = ({
    inventoryByStation,
    importBatches,
    returnBatches,
    remainingPayableAmount,
    settlement,
}: Props) => {
    const [activeTab, setActiveTab] = useState(0);

    const tabs: TabKey[] = useMemo(() => {
        const list: TabKey[] = [{ kind: 'all' }];
        importBatches.forEach((batch, index) => {
            list.push({ kind: 'import', index, batchId: batch.id });
        });
        returnBatches.forEach((batch, index) => {
            list.push({ kind: 'return', index, batchId: batch.id });
        });
        return list;
    }, [importBatches, returnBatches]);

    const current = tabs[activeTab] ?? tabs[0];

    const sumImportQty = importBatches.reduce(
        (a, b) => a + (b.totalImportedQuantity ?? b.totalDeclareQuantity ?? 0),
        0
    );
    const sumImportVal = importBatches.reduce(
        (a, b) => a + Number(b.totalImportedCostValue ?? b.totalDeclaredCostValue ?? 0),
        0
    );
    const sumReturnQty = returnBatches.reduce((a, b) => a + (b.totalQuantity ?? 0), 0);
    const sumReturnVal = returnBatches.reduce((a, b) => a + Number(b.totalReturnValue ?? 0), 0);

    const systemImport = settlement?.systemImportQuantity ?? sumImportQty;
    const actualImport = settlement?.actualTicketImportQuantity;
    const systemReturn = settlement?.systemReturnQuantity ?? sumReturnQty;
    const actualReturn = settlement?.actualReturnTicketQuantity;
    const importDelta =
        actualImport != null && systemImport != null ? actualImport - systemImport : null;
    const returnDelta =
        actualReturn != null && systemReturn != null ? actualReturn - systemReturn : null;

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                mb: 3,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    px: 2.5,
                    pt: 2,
                    pb: 1,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    gap: 1,
                    alignItems: { xs: 'flex-start', md: 'center' },
                }}
            >
                <Box>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                        Bảng chi tiết đối soát từng Nhà đài ({inventoryByStation.length} đài)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Gộp từ {importBatches.length} phiếu nhập · {returnBatches.length} phiếu trả
                        trong ngày — chọn tab để xem chi tiết từng phiếu
                    </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                    Tổng phải trả NCC còn lại:{' '}
                    <strong style={{ color: '#dc2626' }}>
                        {formatSettlementMoney(remainingPayableAmount)} VNĐ
                    </strong>
                </Typography>
            </Box>

            <Box sx={{ borderBottom: '1px solid #e2e8f0', px: 2, bgcolor: '#fafafa' }}>
                <Tabs
                    value={Math.min(activeTab, tabs.length - 1)}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        minHeight: 44,
                        '& .MuiTab-root': {
                            minHeight: 44,
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            textTransform: 'none',
                            px: 1.5,
                            mr: 0.5,
                        },
                    }}
                >
                    <Tab
                        icon={<Inventory2OutlinedIcon sx={{ fontSize: '1.05rem' }} />}
                        iconPosition="start"
                        label={
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <span>Tất cả</span>
                                <Chip
                                    size="small"
                                    label={inventoryByStation.length}
                                    sx={{
                                        height: 18,
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        bgcolor: activeTab === 0 ? '#eff6ff' : '#f1f5f9',
                                        color: activeTab === 0 ? '#2563eb' : '#64748b',
                                    }}
                                />
                            </Stack>
                        }
                    />
                    {importBatches.map((batch, index) => {
                        const tabIndex = 1 + index;
                        return (
                            <Tab
                                key={`import-${batch.id}`}
                                icon={<MoveToInboxOutlinedIcon sx={{ fontSize: '1.05rem' }} />}
                                iconPosition="start"
                                label={
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <span>Phiếu nhập {index + 1}</span>
                                        <Chip
                                            size="small"
                                            label={(
                                                batch.totalImportedQuantity ??
                                                batch.totalDeclareQuantity ??
                                                0
                                            ).toLocaleString('vi-VN')}
                                            sx={{
                                                height: 18,
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                bgcolor: activeTab === tabIndex ? '#eff6ff' : '#f1f5f9',
                                                color: activeTab === tabIndex ? '#2563eb' : '#64748b',
                                            }}
                                        />
                                    </Stack>
                                }
                            />
                        );
                    })}
                    {returnBatches.map((batch, index) => {
                        const tabIndex = 1 + importBatches.length + index;
                        const label =
                            returnBatches.length === 1 ? 'Phiếu trả' : `Phiếu trả ${index + 1}`;
                        return (
                            <Tab
                                key={`return-${batch.id}`}
                                icon={<AssignmentReturnOutlinedIcon sx={{ fontSize: '1.05rem' }} />}
                                iconPosition="start"
                                label={
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <span>{label}</span>
                                        <Chip
                                            size="small"
                                            label={(batch.totalQuantity ?? 0).toLocaleString('vi-VN')}
                                            sx={{
                                                height: 18,
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                bgcolor: activeTab === tabIndex ? '#fff7ed' : '#f1f5f9',
                                                color: activeTab === tabIndex ? '#c2410c' : '#64748b',
                                            }}
                                        />
                                    </Stack>
                                }
                            />
                        );
                    })}
                </Tabs>
            </Box>

            <Box sx={{ p: 2.5 }}>
                {current?.kind === 'all' && (
                    <Stack spacing={1.75}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                                size="small"
                                color="info"
                                label={`${importBatches.length} phiếu nhập · HT ${systemImport.toLocaleString('vi-VN')} vé · ${formatSettlementMoney(sumImportVal)} VNĐ`}
                                sx={{ fontWeight: 700 }}
                            />
                            <Chip
                                size="small"
                                color="warning"
                                label={`${returnBatches.length} phiếu trả · HT ${systemReturn.toLocaleString('vi-VN')} vé · ${formatSettlementMoney(sumReturnVal)} VNĐ`}
                                sx={{ fontWeight: 700 }}
                            />
                            {actualImport != null && (
                                <Chip
                                    size="small"
                                    color={
                                        importDelta === 0
                                            ? 'success'
                                            : settlement?.importDiscrepancyResolved
                                              ? 'info'
                                              : 'error'
                                    }
                                    variant={importDelta === 0 ? 'filled' : 'outlined'}
                                    label={
                                        importDelta === 0
                                            ? `Nhập thực tế = hệ thống (${actualImport.toLocaleString('vi-VN')})`
                                            : importDelta != null && importDelta < 0
                                              ? `Hệ thống ghi thừa nhập ${Math.abs(importDelta).toLocaleString('vi-VN')} vé${settlement?.importDiscrepancyResolved ? ' · đã xử lý' : ''}`
                                              : `Hệ thống ghi thiếu nhập ${Math.abs(importDelta ?? 0).toLocaleString('vi-VN')} vé${settlement?.importDiscrepancyResolved ? ' · đã ghi nhận' : ''}`
                                    }
                                    sx={{ fontWeight: 800 }}
                                />
                            )}
                            {actualReturn != null && (
                                <Chip
                                    size="small"
                                    color={
                                        returnDelta === 0
                                            ? 'success'
                                            : settlement?.returnDiscrepancyResolved
                                              ? 'info'
                                              : 'error'
                                    }
                                    variant={returnDelta === 0 ? 'filled' : 'outlined'}
                                    label={
                                        returnDelta === 0
                                            ? `Trả thực tế = hệ thống (${actualReturn.toLocaleString('vi-VN')})`
                                            : returnDelta != null && returnDelta < 0
                                              ? `Hệ thống ghi thừa trả ${Math.abs(returnDelta).toLocaleString('vi-VN')} vé${settlement?.returnDiscrepancyResolved ? ' · đã xử lý' : ' · LOST/hỏng/hủy'}`
                                              : `Hệ thống ghi thiếu trả ${Math.abs(returnDelta ?? 0).toLocaleString('vi-VN')} vé${settlement?.returnDiscrepancyResolved ? ' · đã bổ sung' : ''}`
                                    }
                                    sx={{ fontWeight: 800 }}
                                />
                            )}
                            {actualImport == null && actualReturn == null && (
                                <Chip
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                    label="Chưa nhập số thực tế đối soát"
                                    sx={{ fontWeight: 700 }}
                                />
                            )}
                        </Stack>
                        <AllStationsTable inventoryByStation={inventoryByStation} settlement={settlement} />
                    </Stack>
                )}

                {current?.kind === 'import' && (
                    <ImportBatchTabPanel
                        batchId={current.batchId}
                        inventoryByStation={inventoryByStation}
                    />
                )}

                {current?.kind === 'return' && (
                    <ReturnBatchTabPanel batchId={current.batchId} />
                )}
            </Box>
        </Card>
    );
};
