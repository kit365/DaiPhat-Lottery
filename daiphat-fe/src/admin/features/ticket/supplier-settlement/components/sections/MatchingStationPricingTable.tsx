"use client";

import { useEffect, useMemo, useState } from 'react';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { bulkUpdateStationPricing } from '@/admin/features/station/services/stationService';
import { QUERY_KEYS as STATION_QUERY_KEYS } from '@/admin/features/station/constants/queryKeys';
import { computeImportCostFromStation } from '../../../import-batch/utils/importCostCalculator';
import type { SettlementStationPricing } from '../../types/supplierSettlement.type';

type StationDraft = {
    importCost: string;
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
        next[row.lotteryStationId] = {
            importCost: formatPriceInput(row.importCost),
            commissionPercent: formatCommissionPercent(row.commissionRate),
        };
    });
    return next;
};

interface Props {
    rows: SettlementStationPricing[];
    disabled?: boolean;
    /** When true, do not persist station master pricing until parent confirms matching. */
    deferPersist?: boolean;
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
    }) => void;
    onPendingPricingChange?: (
        items: Array<{ lotteryStationId: number; importCost: number; commissionRate: number }>
    ) => void;
    onStationsUpdated?: () => void;
}

export const MatchingStationPricingTable = ({
    rows,
    disabled = false,
    deferPersist = false,
    onWeightedChange,
    onPendingPricingChange,
    onStationsUpdated,
}: Props) => {
    const queryClient = useQueryClient();
    const [drafts, setDrafts] = useState<Record<number, StationDraft>>(() => buildDrafts(rows));
    const [saving, setSaving] = useState(false);
    const [confirmDialogStations, setConfirmDialogStations] = useState<SettlementStationPricing[] | null>(null);

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
                    const cost = Number(row.importCost || 10000);
                    const rate = Number(row.commissionRate || 0);
                    next[row.lotteryStationId] = {
                        importCost: formatPriceInput(cost),
                        commissionPercent: formatCommissionPercent(rate),
                    };
                }
            });
            return hasChange ? next : prev;
        });
    }, [rows]);

    const computed = useMemo(() => {
        const totalQty = rows.reduce((sum, row) => sum + (row.importedQuantity || 0), 0);
        let systemNetSum = 0;
        let actualNetSum = 0;
        let complete = rows.length > 0;
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
        let systemImportCostSum = 0;
        let systemCommissionSum = 0;
        let actualImportCostSum = 0;
        let actualCommissionSum = 0;

        rows.forEach((row) => {
            const qty = row.importedQuantity || 0;
            const systemNet = roundMoney(row.netUnitPrice || 0);
            systemNetSum += systemNet * qty;
            systemImportCostSum += Number(row.importCost || 0) * qty;
            systemCommissionSum += Number(row.commissionRate || 0) * qty;
            const draft = drafts[row.lotteryStationId];
            const actualPrice = parsePriceInput(draft?.importCost ?? '');
            const actualRate = parseCommissionRate(draft?.commissionPercent ?? '');
            const actualNet = computeImportCostFromStation(actualPrice, actualRate);
            if (!Number.isFinite(actualPrice) || actualPrice <= 0 || !Number.isFinite(actualRate) || actualNet == null) {
                complete = false;
                return;
            }
            actualNetSum += roundMoney(actualNet) * qty;
            actualImportCostSum += actualPrice * qty;
            actualCommissionSum += actualRate * qty;
            const stationName = row.lotteryStationName || `Đài #${row.lotteryStationId}`;
            if (!nearlyEqual(actualPrice, Number(row.importCost || 0), 0.5)) {
                priceMismatchStations.push({
                    lotteryStationId: row.lotteryStationId,
                    lotteryStationName: stationName,
                    systemImportCost: roundMoney(row.importCost),
                    actualImportCost: roundMoney(actualPrice),
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
            actualImportCostAvg: totalQty > 0 && complete ? roundMoney(actualImportCostSum / totalQty) : 0,
            actualCommissionAvg: totalQty > 0 && complete ? actualCommissionSum / totalQty : 0,
            complete,
            priceMismatchStations,
            commissionMismatchStations,
        };
    }, [rows, drafts]);

    const allMismatchedRows = useMemo(() => {
        return rows.filter((row) => {
            const draft = drafts[row.lotteryStationId];
            const actualPrice = parsePriceInput(draft?.importCost ?? '');
            const actualRate = parseCommissionRate(draft?.commissionPercent ?? '');
            const priceDiff = Number.isFinite(actualPrice) && !nearlyEqual(actualPrice, Number(row.importCost || 0), 0.5);
            const rateDiff = Number.isFinite(actualRate) && !nearlyEqual(actualRate, Number(row.commissionRate || 0));
            return priceDiff || rateDiff;
        });
    }, [rows, drafts]);

    useEffect(() => {
        onWeightedChange({
            systemNet: computed.systemNet,
            actualNet: computed.actualNet,
            complete: computed.complete,
            priceMismatchStations: computed.priceMismatchStations,
            commissionMismatchStations: computed.commissionMismatchStations,
        });
    }, [
        computed.actualNet,
        computed.complete,
        computed.systemNet,
        computed.priceMismatchStations,
        computed.commissionMismatchStations,
        onWeightedChange,
    ]);

    useEffect(() => {
        if (!onPendingPricingChange) return;
        const items: Array<{ lotteryStationId: number; importCost: number; commissionRate: number }> = [];
        rows.forEach((row) => {
            const draft = drafts[row.lotteryStationId];
            const importCost = parsePriceInput(draft?.importCost ?? '');
            const commissionRate = parseCommissionRate(draft?.commissionPercent ?? '');
            if (!Number.isFinite(importCost) || importCost <= 0 || !Number.isFinite(commissionRate)) {
                return;
            }
            const priceDiff = !nearlyEqual(importCost, Number(row.importCost || 0), 0.5);
            const rateDiff = !nearlyEqual(commissionRate, Number(row.commissionRate || 0));
            if (priceDiff || rateDiff) {
                items.push({
                    lotteryStationId: row.lotteryStationId,
                    importCost,
                    commissionRate,
                });
            }
        });
        onPendingPricingChange(items);
    }, [drafts, onPendingPricingChange, rows]);

    const updateDraft = (stationId: number, patch: Partial<StationDraft>) => {
        setDrafts((prev) => ({
            ...prev,
            [stationId]: { ...prev[stationId], ...patch },
        }));
    };

    const handleApplyStationUpdates = async (targetRows: SettlementStationPricing[]) => {
        const items = targetRows
            .map((row) => {
                const draft = drafts[row.lotteryStationId];
                const importCost = parsePriceInput(draft?.importCost ?? '');
                const commissionRate = parseCommissionRate(draft?.commissionPercent ?? '');
                return {
                    lotteryStationId: row.lotteryStationId,
                    importCost: Number.isFinite(importCost) && importCost > 0 ? importCost : Number(row.importCost || 0),
                    commissionRate:
                        Number.isFinite(commissionRate) && commissionRate >= 0 && commissionRate <= 1
                            ? commissionRate
                            : Number(row.commissionRate || 0),
                };
            })
            .filter((item) => item.importCost > 0 && item.commissionRate >= 0 && item.commissionRate <= 1);

        if (items.length === 0) {
            toast.warning('Không có nhà đài hợp lệ để cập nhật.');
            return;
        }

        setSaving(true);
        try {
            await bulkUpdateStationPricing(items);
            await queryClient.invalidateQueries({ queryKey: [STATION_QUERY_KEYS.STATIONS] });
            await queryClient.invalidateQueries({ queryKey: [STATION_QUERY_KEYS.STATIONS_BY_DRAW_DATE] });
            await queryClient.invalidateQueries({ queryKey: ['supplier-settlement'] });
            await queryClient.invalidateQueries({ queryKey: ['supplier-settlement-overview'] });

            if (items.length === 1) {
                const name = targetRows[0]?.lotteryStationName || `Đài #${items[0].lotteryStationId}`;
                toast.success(`Đã cập nhật giá nhập và hoa hồng cho nhà đài ${name} vào hệ thống thành công.`);
            } else {
                toast.success(`Đã cập nhật giá nhập và hoa hồng cho ${items.length} nhà đài vào hệ thống thành công.`);
            }

            setConfirmDialogStations(null);
            onStationsUpdated?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Không cập nhật được cấu hình nhà đài.');
        } finally {
            setSaving(false);
        }
    };

    if (rows.length === 0) {
        return (
            <Alert severity="warning">
                Chưa có dòng phiếu nhập theo nhà đài trong kỳ này để đối chiếu giá / hoa hồng.
            </Alert>
        );
    }

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
                            So sánh đơn giá nhập, hoa hồng và đơn giá vốn sau hoa hồng theo từng đài trong kỳ
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    {allMismatchedRows.length === 0 ? (
                        <Chip
                            size="small"
                            icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.9rem', color: '#16a34a' }} />}
                            label="Đã khớp toàn bộ giá & hoa hồng"
                            sx={{
                                bgcolor: '#f0fdf4',
                                color: '#16a34a',
                                fontWeight: 700,
                                fontSize: '0.725rem',
                                border: '1px solid #bbf7d0',
                                height: 28,
                            }}
                        />
                    ) : (
                        <>
                            <Chip
                                size="small"
                                label={`Có ${allMismatchedRows.length} đài có chênh lệch giá/HH`}
                                sx={{
                                    bgcolor: '#fffbeb',
                                    color: '#b45309',
                                    fontWeight: 700,
                                    fontSize: '0.725rem',
                                    border: '1px solid #fde68a',
                                    height: 28,
                                }}
                            />
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<SyncAltOutlinedIcon sx={{ fontSize: '0.9rem' }} />}
                                disabled={disabled || saving}
                                onClick={() => setConfirmDialogStations(allMismatchedRows)}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    bgcolor: '#2563eb',
                                    color: '#ffffff',
                                    height: 28,
                                    px: 1.5,
                                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                Cập nhật {allMismatchedRows.length} đài vào CSDL
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
                                    width: '30%',
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
                                    width: '31%',
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
                                    width: '14%',
                                    bgcolor: '#f8fafc',
                                }}
                            >
                                Điều chỉnh nhà đài
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
                                importCost: formatPriceInput(row.importCost),
                                commissionPercent: formatCommissionPercent(row.commissionRate),
                            };
                            const actualPrice = parsePriceInput(draft.importCost);
                            const actualRate = parseCommissionRate(draft.commissionPercent);
                            const actualNet = computeImportCostFromStation(actualPrice, actualRate);
                            const isDraftValid = Number.isFinite(actualPrice) && actualPrice > 0 && Number.isFinite(actualRate) && actualRate >= 0 && actualRate <= 1;
                            const priceDiff = Number.isFinite(actualPrice)
                                && !nearlyEqual(actualPrice, Number(row.importCost || 0), 0.5);
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
                                    <TableCell align="center" sx={{ py: 0.6, px: 0.75, bgcolor: priceDiff ? '#fffbeb' : 'inherit' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                            <TextField
                                                size="small"
                                                value={draft.importCost}
                                                disabled={disabled}
                                                placeholder={formatMoney(row.importCost)}
                                                slotProps={{
                                                    htmlInput: {
                                                        inputMode: 'numeric',
                                                        style: {
                                                            textAlign: 'center',
                                                            fontWeight: priceDiff ? 800 : 600,
                                                            fontSize: '0.85rem',
                                                            color: priceDiff ? '#b45309' : '#0f172a',
                                                            padding: '4px 6px',
                                                        },
                                                    },
                                                }}
                                                onChange={(e) => {
                                                    const raw = e.target.value.replace(/\D/g, '');
                                                    updateDraft(row.lotteryStationId, {
                                                        importCost: raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '',
                                                    });
                                                }}
                                                sx={{
                                                    width: 95,
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: '6px',
                                                        bgcolor: priceDiff ? '#ffffff' : '#f8fafc',
                                                        borderColor: priceDiff ? '#f59e0b' : '#e2e8f0',
                                                        '& fieldset': {
                                                            borderColor: priceDiff ? '#f59e0b' : '#e2e8f0',
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
                                            <Chip
                                                size="small"
                                                label="Lệch"
                                                sx={{
                                                    ml: 0.5,
                                                    height: 18,
                                                    fontSize: '0.65rem',
                                                    fontWeight: 800,
                                                    bgcolor: '#fef3c7',
                                                    color: '#b45309',
                                                    border: '1px solid #fde68a',
                                                }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 0.6, px: 1 }}>
                                        {hasDiff ? (
                                            <Tooltip title={`Cập nhật trực tiếp giá ${formatMoney(actualPrice)} đ & hoa hồng ${draft.commissionPercent}% vào CSDL nhà đài ${row.lotteryStationName || ''}`}>
                                                <span>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        disabled={disabled || saving || !isDraftValid}
                                                        onClick={() => setConfirmDialogStations([row])}
                                                        startIcon={<SyncAltOutlinedIcon sx={{ fontSize: '0.85rem' }} />}
                                                        sx={{
                                                            py: 0.4,
                                                            px: 1.1,
                                                            fontSize: '0.725rem',
                                                            fontWeight: 700,
                                                            borderRadius: '6px',
                                                            textTransform: 'none',
                                                            whiteSpace: 'nowrap',
                                                            bgcolor: '#fffbeb',
                                                            borderColor: '#fde68a',
                                                            color: '#b45309',
                                                            boxShadow: 'none',
                                                            '&:hover': {
                                                                bgcolor: '#fef3c7',
                                                                borderColor: '#f59e0b',
                                                            },
                                                        }}
                                                    >
                                                        Lưu vào đài
                                                    </Button>
                                                </span>
                                            </Tooltip>
                                        ) : (
                                            <Chip
                                                size="small"
                                                icon={<CheckCircleOutlinedIcon style={{ fontSize: '0.8rem', color: '#16a34a' }} />}
                                                label="Đã khớp"
                                                sx={{
                                                    height: 24,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    bgcolor: '#f0fdf4',
                                                    color: '#16a34a',
                                                    border: '1px solid #bbf7d0',
                                                }}
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
                                    {computed.complete ? formatMoney(computed.actualImportCostAvg) : '—'}
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
                                    {allMismatchedRows.length > 0 ? (
                                        <Button
                                            size="small"
                                            variant="contained"
                                            disabled={disabled || saving}
                                            onClick={() => setConfirmDialogStations(allMismatchedRows)}
                                            startIcon={<SyncAltOutlinedIcon sx={{ fontSize: '0.85rem' }} />}
                                            sx={{
                                                py: 0.35,
                                                px: 1,
                                                fontSize: '0.725rem',
                                                fontWeight: 800,
                                                borderRadius: '6px',
                                                textTransform: 'none',
                                                whiteSpace: 'nowrap',
                                                bgcolor: '#2563eb',
                                                '&:hover': { bgcolor: '#1d4ed8' },
                                            }}
                                        >
                                            Lưu tất cả ({allMismatchedRows.length})
                                        </Button>
                                    ) : (
                                        <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                            —
                                        </Typography>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f8fafc', p: 1.2, borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <InfoOutlinedIcon sx={{ fontSize: '1rem', color: '#64748b', flexShrink: 0 }} />
                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                    <strong>Công thức:</strong> Giá sau hoa hồng = Giá nhập × (1 − Tỉ lệ hoa hồng). Đơn giá đối soát cả kỳ được tính tự động theo bình quân gia quyền theo số lượng vé nhập từng đài. Nút <strong>&ldquo;Lưu vào đài&rdquo;</strong> cho phép cập nhật trực tiếp Giá nhập & Hoa hồng mới vào CSDL nhà đài mà không cần qua trang quản lý nhà đài.
                </Typography>
            </Box>

            <Dialog
                open={Boolean(confirmDialogStations && confirmDialogStations.length > 0)}
                onClose={() => !saving && setConfirmDialogStations(null)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SyncAltOutlinedIcon sx={{ color: '#2563eb' }} />
                    {confirmDialogStations && confirmDialogStations.length === 1
                        ? `Cập nhật cấu hình Nhà đài ${confirmDialogStations[0]?.lotteryStationName || ''}`
                        : `Cập nhật cấu hình ${confirmDialogStations?.length || 0} Nhà đài vào CSDL`}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2, borderRadius: '8px', fontSize: '0.825rem' }}>
                        Hệ thống sẽ cập nhật trực tiếp trường <strong>Giá nhập (price)</strong> và <strong>Hoa hồng (commissionRate)</strong> vào bản ghi nhà đài trong CSDL.
                        Các đợt nhập vé tiếp theo sẽ tự động áp dụng cấu hình giá mới này.
                    </Alert>

                    <Stack spacing={1.25}>
                        {(confirmDialogStations || []).map((row) => {
                            const draft = drafts[row.lotteryStationId];
                            const actualPrice = parsePriceInput(draft?.importCost ?? '');
                            const actualRate = parseCommissionRate(draft?.commissionPercent ?? '');
                            const actualNet = computeImportCostFromStation(actualPrice, actualRate);
                            const priceChanged = !nearlyEqual(actualPrice, Number(row.importCost || 0), 0.5);
                            const rateChanged = !nearlyEqual(actualRate, Number(row.commissionRate || 0));

                            return (
                                <Paper
                                    key={row.lotteryStationId}
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        borderRadius: '10px',
                                        borderColor: '#e2e8f0',
                                        bgcolor: '#f8fafc',
                                    }}
                                >
                                    <Typography fontWeight={800} color="#0f172a" sx={{ fontSize: '0.9rem', mb: 0.75 }}>
                                        {row.lotteryStationName || `Đài #${row.lotteryStationId}`}
                                    </Typography>

                                    <Grid container spacing={1}>
                                        <Grid size={{ xs: 6 }}>
                                            <Box sx={{ p: 1, borderRadius: '6px', bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                                                <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ display: 'block', fontSize: '0.7rem' }}>
                                                    HIỆN TẠI (HỆ THỐNG)
                                                </Typography>
                                                <Typography variant="caption" color="#334155" sx={{ display: 'block', mt: 0.25, fontSize: '0.775rem' }}>
                                                    Giá nhập: <strong>{formatMoney(row.importCost)} đ</strong>
                                                </Typography>
                                                <Typography variant="caption" color="#334155" sx={{ display: 'block', fontSize: '0.775rem' }}>
                                                    Hoa hồng: <strong>{formatCommissionPercent(row.commissionRate)}%</strong>
                                                </Typography>
                                                <Typography variant="caption" color="#0f172a" fontWeight={700} sx={{ display: 'block', mt: 0.25, fontSize: '0.775rem' }}>
                                                    Sau HH: {formatMoney(row.netUnitPrice)} đ
                                                </Typography>
                                            </Box>
                                        </Grid>

                                        <Grid size={{ xs: 6 }}>
                                            <Box
                                                sx={{
                                                    p: 1,
                                                    borderRadius: '6px',
                                                    bgcolor: '#f0fdf4',
                                                    border: '1px solid #bbf7d0',
                                                }}
                                            >
                                                <Typography variant="caption" color="#166534" fontWeight={800} sx={{ display: 'block', fontSize: '0.7rem' }}>
                                                    CẬP NHẬT MỚI (THỰC TẾ)
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color={priceChanged ? '#b45309' : '#166534'}
                                                    fontWeight={priceChanged ? 800 : 600}
                                                    sx={{ display: 'block', mt: 0.25, fontSize: '0.775rem' }}
                                                >
                                                    Giá nhập: {formatMoney(actualPrice)} đ {priceChanged && '✎'}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color={rateChanged ? '#b45309' : '#166534'}
                                                    fontWeight={rateChanged ? 800 : 600}
                                                    sx={{ display: 'block', fontSize: '0.775rem' }}
                                                >
                                                    Hoa hồng: {draft?.commissionPercent || '0'}% {rateChanged && '✎'}
                                                </Typography>
                                                <Typography variant="caption" color="#166534" fontWeight={800} sx={{ display: 'block', mt: 0.25, fontSize: '0.775rem' }}>
                                                    Sau HH: {actualNet != null ? formatMoney(actualNet) : '—'} đ
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button
                        disabled={saving}
                        onClick={() => setConfirmDialogStations(null)}
                        sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        disabled={saving}
                        onClick={() => confirmDialogStations && handleApplyStationUpdates(confirmDialogStations)}
                        startIcon={saving ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <SyncAltOutlinedIcon />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 800,
                            borderRadius: '8px',
                            bgcolor: '#2563eb',
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        {saving ? 'Đang lưu vào CSDL...' : 'Xác nhận cập nhật vào Nhà đài'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
