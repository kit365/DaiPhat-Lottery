"use client";

import { useEffect, useMemo, useState } from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import {
    Alert,
    Box,
    Button,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { computeImportCostFromStation } from '../../../import-batch/utils/importCostCalculator';
import type { SettlementStationPricing } from '../../types/supplierSettlement.type';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import { MatchingMasterPricingUpdateDialog } from './MatchingMasterPricingUpdateDialog';

type StationDraft = {
    commissionPercent: string;
};

const nearlyEqual = (a: number, b: number, eps = 0.0005) => Math.abs(a - b) <= eps;

const roundMoney = (value?: number | null): number => Math.round(Number(value) || 0);

const formatMoney = (value?: number | null): string => {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    return roundMoney(value).toLocaleString('vi-VN');
};

const formatPriceInput = (value?: number | null): string => {
    if (value == null || !Number.isFinite(Number(value))) return '';
    return Math.round(Number(value)).toLocaleString('vi-VN');
};

const parsePriceInput = (raw: string): number => {
    const digits = String(raw).replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : NaN;
};

const formatCommissionPercent = (rate?: number | null): string => {
    if (rate == null || !Number.isFinite(Number(rate))) return '';
    const pct = Number(rate) * 100;
    return pct.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
};

const parseCommissionRate = (raw: string): number => {
    const normalized = String(raw).trim().replace('%', '').replace(',', '.');
    if (!normalized) return NaN;
    const pct = Number(normalized);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return NaN;
    return pct / 100;
};

const buildDrafts = (rows: SettlementStationPricing[]): Record<number, StationDraft> => {
    const next: Record<number, StationDraft> = {};
    rows.forEach((row) => {
        const actualRate = row.actualCommissionRate != null ? row.actualCommissionRate : row.commissionRate;
        next[row.lotteryStationId] = {
            commissionPercent: formatCommissionPercent(actualRate),
        };
    });
    return next;
};

interface Props {
    rows: SettlementStationPricing[];
    disabled?: boolean;
    supplierId?: number | null;
    supplierName?: string | null;
    actualImportPrice: number;
    onActualImportPriceChange: (value: number) => void;
    onMasterDataUpdated?: () => void;
    onWeightedChange: (payload: {
        systemNet: number;
        actualNet: number;
        complete: boolean;
        priceMismatchStations: Array<{
            lotteryStationId: number;
            lotteryStationName: string;
            systemImportCost: number;
            actualImportCost: number;
        }>;
        commissionMismatchStations: Array<{
            lotteryStationId: number;
            lotteryStationName: string;
            systemCommissionRate: number;
            actualCommissionRate: number;
        }>;
        stationCommissions: Array<{ lotteryStationId: number; actualCommissionRate: number }>;
    }) => void;
}

export const MatchingStationPricingTable = ({
    rows,
    disabled = false,
    supplierId,
    supplierName,
    actualImportPrice,
    onActualImportPriceChange,
    onMasterDataUpdated,
    onWeightedChange,
}: Props) => {
    const [drafts, setDrafts] = useState<Record<number, StationDraft>>(() => buildDrafts(rows));
    const [actualPriceInput, setActualPriceInput] = useState(() => formatPriceInput(actualImportPrice));
    const [masterUpdateOpen, setMasterUpdateOpen] = useState(false);

    useEffect(() => {
        setDrafts((prev) => {
            if (Object.keys(prev).length === 0) {
                return buildDrafts(rows);
            }
            const next = { ...prev };
            let hasChange = false;
            rows.forEach((row) => {
                if (!next[row.lotteryStationId]) {
                    hasChange = true;
                    const actualRate = row.actualCommissionRate != null ? row.actualCommissionRate : row.commissionRate;
                    next[row.lotteryStationId] = {
                        commissionPercent: formatCommissionPercent(actualRate),
                    };
                }
            });
            return hasChange ? next : prev;
        });
    }, [rows]);

    useEffect(() => {
        const formatted = formatPriceInput(actualImportPrice);
        setActualPriceInput((prev) => {
            const parsedPrev = parsePriceInput(prev);
            if (Number.isFinite(parsedPrev) && nearlyEqual(parsedPrev, actualImportPrice, 0.5)) {
                return prev;
            }
            return formatted;
        });
    }, [actualImportPrice]);

    const computed = useMemo(() => {
        const totalQty = rows.reduce((sum, row) => sum + (row.importedQuantity || 0), 0);
        let systemNetSum = 0;
        let actualNetSum = 0;
        let complete = rows.length > 0 && Number.isFinite(actualImportPrice) && actualImportPrice > 0;
        const priceMismatchStations: Array<{
            lotteryStationId: number;
            lotteryStationName: string;
            systemImportCost: number;
            actualImportCost: number;
        }> = [];
        const commissionMismatchStations: Array<{
            lotteryStationId: number;
            lotteryStationName: string;
            systemCommissionRate: number;
            actualCommissionRate: number;
        }> = [];
        const stationCommissions: Array<{ lotteryStationId: number; actualCommissionRate: number }> = [];
        let systemImportCostSum = 0;
        let systemCommissionSum = 0;
        let actualCommissionSum = 0;
        const faceDiff = rows.some((row) => !nearlyEqual(actualImportPrice, Number(row.importCost || 0), 0.5));

        rows.forEach((row) => {
            const qty = row.importedQuantity || 0;
            const systemNet = roundMoney(row.netUnitPrice || 0);
            systemNetSum += systemNet * qty;
            systemImportCostSum += Number(row.importCost || 0) * qty;
            systemCommissionSum += Number(row.commissionRate || 0) * qty;
            const draft = drafts[row.lotteryStationId];
            const actualRate = parseCommissionRate(draft?.commissionPercent ?? '');
            const actualNet = computeImportCostFromStation(actualImportPrice, actualRate);
            if (!Number.isFinite(actualRate) || actualNet == null) {
                complete = false;
                return;
            }
            actualNetSum += roundMoney(actualNet) * qty;
            actualCommissionSum += actualRate * qty;
            stationCommissions.push({
                lotteryStationId: row.lotteryStationId,
                actualCommissionRate: actualRate,
            });
            const stationName = row.lotteryStationName || `Đài #${row.lotteryStationId}`;
            if (faceDiff) {
                priceMismatchStations.push({
                    lotteryStationId: row.lotteryStationId,
                    lotteryStationName: stationName,
                    systemImportCost: roundMoney(row.importCost),
                    actualImportCost: roundMoney(actualImportPrice),
                });
            }
            if (!nearlyEqual(actualRate, Number(row.commissionRate || 0))) {
                commissionMismatchStations.push({
                    lotteryStationId: row.lotteryStationId,
                    lotteryStationName: stationName,
                    systemCommissionRate: Number(row.commissionRate || 0),
                    actualCommissionRate: actualRate,
                });
            }
        });

        return {
            totalQty,
            systemNet: totalQty > 0 ? roundMoney(systemNetSum / totalQty) : 0,
            actualNet: totalQty > 0 && complete ? roundMoney(actualNetSum / totalQty) : 0,
            systemImportCostAvg: totalQty > 0 ? roundMoney(systemImportCostSum / totalQty) : 0,
            systemCommissionAvg: totalQty > 0 ? systemCommissionSum / totalQty : 0,
            actualCommissionAvg: totalQty > 0 && complete ? actualCommissionSum / totalQty : 0,
            complete,
            priceMismatchStations,
            commissionMismatchStations,
            stationCommissions,
            faceDiff,
        };
    }, [rows, drafts, actualImportPrice]);

    useEffect(() => {
        if (masterUpdateOpen && !computed.faceDiff && computed.commissionMismatchStations.length === 0) {
            setMasterUpdateOpen(false);
        }
    }, [masterUpdateOpen, computed.faceDiff, computed.commissionMismatchStations.length]);

    const allMismatchedRows = useMemo(() => {
        return rows.filter((row) => {
            const draft = drafts[row.lotteryStationId];
            const actualRate = parseCommissionRate(draft?.commissionPercent ?? '');
            const rateDiff = Number.isFinite(actualRate) && !nearlyEqual(actualRate, Number(row.commissionRate || 0));
            return computed.faceDiff || rateDiff;
        });
    }, [rows, drafts, computed.faceDiff]);

    useEffect(() => {
        onWeightedChange({
            systemNet: computed.systemNet,
            actualNet: computed.actualNet,
            complete: computed.complete,
            priceMismatchStations: computed.priceMismatchStations,
            commissionMismatchStations: computed.commissionMismatchStations,
            stationCommissions: computed.stationCommissions,
        });
    }, [
        computed.actualNet,
        computed.complete,
        computed.systemNet,
        computed.priceMismatchStations,
        computed.commissionMismatchStations,
        computed.stationCommissions,
        onWeightedChange,
    ]);

    const updateDraft = (stationId: number, patch: Partial<StationDraft>) => {
        setDrafts((prev) => ({
            ...prev,
            [stationId]: { ...prev[stationId], ...patch },
        }));
    };

    if (rows.length === 0) {
        return (
            <Alert severity="warning">
                Chưa có dòng phiếu nhập theo nhà đài trong kỳ này để đối chiếu giá / hoa hồng.
            </Alert>
        );
    }

    const systemFace = roundMoney(rows[0]?.importCost);

    return (
        <Box>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                sx={{ mb: 2 }}
            >
                <Stack direction="row" spacing={1.2} alignItems="center">
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
                        <LocalOfferOutlinedIcon sx={{ fontSize: '1.15rem' }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                            2. Giá vé theo từng nhà đài
                        </Typography>
                        <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem' }}>
                            Giá nhập lấy từ defaultImportCost của NCC; từng đài chỉ đối chiếu hoa hồng
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <AdminStatusBadge
                        label={`Giá nhập HT: ${formatMoney(systemFace)}`}
                        modifier="admin-status-badge--draft"
                    />
                    <TextField
                        size="small"
                        label="Giá nhập thực tế"
                        value={actualPriceInput}
                        disabled={disabled}
                        onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            const formatted = raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '';
                            setActualPriceInput(formatted);
                            const parsed = parsePriceInput(formatted);
                            if (Number.isFinite(parsed) && parsed > 0) {
                                onActualImportPriceChange(parsed);
                            }
                        }}
                        sx={{
                            width: 160,
                            '& .MuiInputBase-root': { height: 32, fontSize: '0.8rem', fontWeight: 700 },
                            '& .MuiInputLabel-root': { fontSize: '0.75rem' },
                        }}
                    />
                    {allMismatchedRows.length === 0 ? (
                        <AdminStatusBadge
                            label="Đã khớp toàn bộ giá & hoa hồng"
                            modifier="admin-status-badge--success"
                        />
                    ) : (
                        <>
                            <AdminStatusBadge
                                label={`Có ${allMismatchedRows.length} đài có chênh lệch giá/HH`}
                                modifier="admin-status-badge--pending"
                            />
                            <Button
                                size="small"
                                variant="contained"
                                disabled={disabled}
                                onClick={() => setMasterUpdateOpen(true)}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    fontSize: '0.775rem',
                                    borderRadius: '8px',
                                    bgcolor: '#2563eb',
                                    py: 0.4,
                                    px: 1.5,
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                Cập nhật giá / HH hệ thống
                            </Button>
                        </>
                    )}
                </Stack>
            </Stack>

            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    overflow: 'hidden',
                    bgcolor: '#ffffff',
                }}
            >
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell
                                rowSpan={2}
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    color: '#475569',
                                    textTransform: 'uppercase',
                                    py: 1.2,
                                    px: 2,
                                    borderRight: '1px solid #e2e8f0',
                                    width: '16%',
                                }}
                            >
                                Nhà đài
                            </TableCell>
                            <TableCell
                                rowSpan={2}
                                align="center"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    color: '#475569',
                                    textTransform: 'uppercase',
                                    py: 1.2,
                                    px: 1.5,
                                    borderRight: '1px solid #e2e8f0',
                                    width: '9%',
                                }}
                            >
                                SL nhập
                            </TableCell>
                            <TableCell
                                colSpan={3}
                                align="center"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    color: '#475569',
                                    textTransform: 'uppercase',
                                    bgcolor: '#f8fafc',
                                    py: 0.9,
                                    borderRight: '1px solid #e2e8f0',
                                    borderBottom: '1px solid #e2e8f0',
                                    width: '33%',
                                }}
                            >
                                Từ hệ thống
                            </TableCell>
                            <TableCell
                                colSpan={3}
                                align="center"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    color: '#166534',
                                    textTransform: 'uppercase',
                                    bgcolor: '#f0fdf4',
                                    py: 0.9,
                                    borderRight: '1px solid #bbf7d0',
                                    borderBottom: '1px solid #bbf7d0',
                                    width: '33%',
                                }}
                            >
                                Thực tế (Admin nhập)
                            </TableCell>
                            <TableCell
                                rowSpan={2}
                                align="center"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    color: '#0f172a',
                                    textTransform: 'uppercase',
                                    py: 1.2,
                                    px: 1,
                                    width: '9%',
                                    bgcolor: '#f8fafc',
                                }}
                            >
                                Đối chiếu
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.725rem', color: '#64748b', bgcolor: '#f8fafc', py: 0.7, px: 1 }}>
                                Giá nhập
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.725rem', color: '#64748b', bgcolor: '#f8fafc', py: 0.7, px: 1 }}>
                                Hoa hồng
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.725rem', color: '#0f172a', bgcolor: '#f8fafc', py: 0.7, px: 1, borderRight: '1px solid #e2e8f0' }}>
                                Sau HH
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.725rem', color: '#166534', bgcolor: '#f0fdf4', py: 0.7, px: 1 }}>
                                Giá nhập
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.725rem', color: '#166534', bgcolor: '#f0fdf4', py: 0.7, px: 1 }}>
                                Hoa hồng
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.725rem', color: '#166534', bgcolor: '#f0fdf4', py: 0.7, px: 1, borderRight: '1px solid #bbf7d0' }}>
                                Sau HH
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => {
                            const draft = drafts[row.lotteryStationId] ?? {
                                commissionPercent: formatCommissionPercent(row.actualCommissionRate ?? row.commissionRate),
                            };
                            const actualRate = parseCommissionRate(draft.commissionPercent);
                            const actualNet = computeImportCostFromStation(actualImportPrice, actualRate);
                            const priceDiff = !nearlyEqual(actualImportPrice, Number(row.importCost || 0), 0.5);
                            const rateDiff = Number.isFinite(actualRate)
                                && !nearlyEqual(actualRate, Number(row.commissionRate || 0));
                            const hasDiff = priceDiff || rateDiff;
                            return (
                                <TableRow
                                    key={row.lotteryStationId}
                                    hover
                                    sx={{
                                        '&:hover': { bgcolor: '#f8fafc' },
                                        transition: 'background-color 0.15s ease',
                                    }}
                                >
                                    <TableCell sx={{ py: 1.1, px: 2, borderRight: '1px solid #f1f5f9' }}>
                                        <Typography fontWeight={700} color="#0f172a" sx={{ fontSize: '0.85rem' }}>
                                            {row.lotteryStationName || `Đài #${row.lotteryStationId}`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.1, px: 1.5, fontWeight: 700, color: '#334155', borderRight: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                        {(row.importedQuantity ?? 0).toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.1, px: 1, color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
                                        {formatMoney(row.importCost)}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.1, px: 1, color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
                                        {formatCommissionPercent(row.commissionRate)}%
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.1, px: 1, fontWeight: 800, color: '#0f172a', borderRight: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                        {formatMoney(row.netUnitPrice)}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.1, px: 1, bgcolor: priceDiff ? '#fffbeb' : 'inherit', fontWeight: 700, color: priceDiff ? '#b45309' : '#166534', fontSize: '0.85rem' }}>
                                        {formatMoney(actualImportPrice)}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 0.6, px: 0.75, bgcolor: rateDiff ? '#fffbeb' : 'inherit' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                            <TextField
                                                size="small"
                                                value={draft.commissionPercent}
                                                disabled={disabled}
                                                placeholder={formatCommissionPercent(row.commissionRate)}
                                                slotProps={{
                                                    htmlInput: {
                                                        inputMode: 'decimal',
                                                        style: {
                                                            textAlign: 'center',
                                                            fontWeight: rateDiff ? 800 : 600,
                                                            fontSize: '0.85rem',
                                                            color: rateDiff ? '#b45309' : '#0f172a',
                                                            padding: '4px 2px',
                                                        },
                                                    },
                                                }}
                                                onChange={(e) => updateDraft(row.lotteryStationId, {
                                                    commissionPercent: e.target.value,
                                                })}
                                                InputProps={{
                                                    endAdornment: <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#64748b', ml: 0.1 }}>%</Typography>,
                                                }}
                                                sx={{
                                                    width: 72,
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: '6px',
                                                        bgcolor: rateDiff ? '#ffffff' : '#f8fafc',
                                                        borderColor: rateDiff ? '#f59e0b' : '#e2e8f0',
                                                        pr: 0.75,
                                                        '& fieldset': {
                                                            borderColor: rateDiff ? '#f59e0b' : '#e2e8f0',
                                                        },
                                                        '&:hover fieldset': {
                                                            borderColor: '#94a3b8',
                                                        },
                                                        '&.Mui-focused fieldset': {
                                                            borderColor: '#2563eb',
                                                            borderWidth: 1.5,
                                                        },
                                                    },
                                                }}
                                            />
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1.1, px: 1, fontWeight: 800, fontSize: '0.85rem', color: hasDiff ? '#b45309' : '#166534', borderRight: '1px solid #e2e8f0' }}>
                                        {actualNet == null ? '—' : formatMoney(actualNet)}
                                        {hasDiff && (
                                            <AdminStatusBadge
                                                label="Lệch"
                                                modifier="admin-status-badge--pending"
                                                className="admin-status-badge--compact"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 0.6, px: 1 }}>
                                        {hasDiff ? (
                                            <AdminStatusBadge
                                                label="Lệch"
                                                modifier="admin-status-badge--pending"
                                            />
                                        ) : (
                                            <AdminStatusBadge
                                                label="Đã khớp"
                                                modifier="admin-status-badge--success"
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {rows.length > 0 && (
                            <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                                <TableCell sx={{ py: 1.25, px: 2, fontWeight: 800, color: '#0f172a', fontSize: '0.825rem', borderRight: '1px solid #e2e8f0' }}>
                                    Bình quân kỳ này
                                    <Typography variant="caption" display="block" color="#64748b" sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'none' }}>
                                        Gia quyền theo SL nhập
                                    </Typography>
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1.25, px: 1.5, fontWeight: 800, color: '#0f172a', fontSize: '0.85rem', borderRight: '1px solid #e2e8f0' }}>
                                    {computed.totalQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1.25, px: 1, fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>
                                    {formatMoney(computed.systemImportCostAvg)}
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1.25, px: 1, fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>
                                    {formatCommissionPercent(computed.systemCommissionAvg)}%
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1.25, px: 1, fontWeight: 800, color: '#0f172a', fontSize: '0.875rem', borderRight: '1px solid #e2e8f0' }}>
                                    {formatMoney(computed.systemNet)}
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1.25, px: 1, fontWeight: 700, color: '#166534', fontSize: '0.85rem' }}>
                                    {formatMoney(actualImportPrice)}
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1.25, px: 1, fontWeight: 700, color: '#166534', fontSize: '0.85rem' }}>
                                    {computed.complete ? `${formatCommissionPercent(computed.actualCommissionAvg)}%` : '—'}
                                </TableCell>
                                <TableCell
                                    align="center"
                                    sx={{
                                        py: 1.25,
                                        px: 1,
                                        fontWeight: 900,
                                        fontSize: '0.925rem',
                                        borderRight: '1px solid #e2e8f0',
                                        color: computed.actualNet && computed.systemNet && !nearlyEqual(computed.actualNet, computed.systemNet, 0.5)
                                            ? '#b45309'
                                            : '#166534',
                                    }}
                                >
                                    {computed.actualNet ? formatMoney(computed.actualNet) : '—'}
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1.25, px: 1 }}>
                                    <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                        —
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f8fafc', p: 1.2, borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <InfoOutlinedIcon sx={{ fontSize: '1rem', color: '#64748b', flexShrink: 0 }} />
                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                    <strong>Công thức:</strong> Giá sau hoa hồng = Giá nhập × (1 − Tỉ lệ hoa hồng). Trang này luôn
                    tính live từ giá NCC và hoa hồng đài. Hệ thống snapshot giá nhập + HH lúc tạo kỳ đối soát để lưu DB;
                    đổi master sau này không làm lệch số đã chốt. Hoa hồng thực tế chỉ lưu trên kỳ đối soát, không ghi đè
                    giá bán đài. Khi lệch, dùng nút &quot;Cập nhật giá / HH hệ thống&quot; để ghi giá nhập NCC hoặc hoa hồng đài.
                </Typography>
            </Box>

            <MatchingMasterPricingUpdateDialog
                open={masterUpdateOpen}
                onClose={() => setMasterUpdateOpen(false)}
                supplierId={supplierId}
                supplierName={supplierName}
                priceMismatch={
                    computed.faceDiff
                        ? {
                            systemImportCost: systemFace,
                            actualImportCost: roundMoney(actualImportPrice),
                        }
                        : null
                }
                commissionMismatches={computed.commissionMismatchStations}
                onUpdated={() => {
                    onMasterDataUpdated?.();
                }}
            />
        </Box>
    );
};
