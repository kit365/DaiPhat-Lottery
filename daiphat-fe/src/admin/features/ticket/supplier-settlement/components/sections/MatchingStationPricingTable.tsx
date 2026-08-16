"use client";

import { useEffect, useMemo, useState } from 'react';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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

type EditMode = 'commission' | 'importCost';

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
    const [editMode, setEditMode] = useState<EditMode | null>(null);
    const [saving, setSaving] = useState(false);

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
        const priceMismatch: SettlementStationPricing[] = [];
        const commissionMismatch: SettlementStationPricing[] = [];
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
                priceMismatch.push(row);
                priceMismatchStations.push({
                    lotteryStationId: row.lotteryStationId,
                    lotteryStationName: stationName,
                    systemImportCost: roundMoney(row.importCost),
                    actualImportCost: roundMoney(actualPrice),
                });
            }
            if (!nearlyEqual(actualRate, Number(row.commissionRate || 0))) {
                commissionMismatch.push(row);
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
            priceMismatch,
            commissionMismatch,
            priceMismatchStations,
            commissionMismatchStations,
        };
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

    const applyStationUpdates = async () => {
        if (!editMode) return;
        const targets = editMode === 'commission' ? computed.commissionMismatch : computed.priceMismatch;
        const items = targets.map((row) => {
            const draft = drafts[row.lotteryStationId];
            const importCost = parsePriceInput(draft?.importCost ?? '');
            const commissionRate = parseCommissionRate(draft?.commissionPercent ?? '');
            return {
                lotteryStationId: row.lotteryStationId,
                importCost: Number.isFinite(importCost) && importCost > 0 ? importCost : Number(row.importCost || 0),
                commissionRate: Number.isFinite(commissionRate) ? commissionRate : Number(row.commissionRate || 0),
            };
        }).filter((item) => item.importCost > 0 && item.commissionRate >= 0 && item.commissionRate <= 1);

        if (items.length === 0) {
            toast.warning('Không có nhà đài hợp lệ để cập nhật.');
            return;
        }
        setSaving(true);
        try {
            await bulkUpdateStationPricing(items);
            await queryClient.invalidateQueries({ queryKey: [STATION_QUERY_KEYS.STATIONS] });
            await queryClient.invalidateQueries({ queryKey: [STATION_QUERY_KEYS.STATIONS_BY_DRAW_DATE] });
            toast.success(
                editMode === 'commission'
                    ? `Đã cập nhật hoa hồng ${items.length} nhà đài.`
                    : `Đã cập nhật giá nhập ${items.length} nhà đài.`
            );
            setEditMode(null);
            onStationsUpdated?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không cập nhật được cấu hình nhà đài.');
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
                            Giá vé theo nhà đài
                        </Typography>
                        <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem' }}>
                            Giá nhập, hoa hồng và đơn giá vốn sau hoa hồng của từng đài trong kỳ
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    {/* Badge thông báo nếu tất cả đều khớp */}
                    {computed.commissionMismatch.length === 0 && computed.priceMismatch.length === 0 && (
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
                    )}

                    {/* Nút sửa hoa hồng đài lệch — ẩn khi deferPersist */}
                    {!deferPersist && computed.commissionMismatch.length > 0 && (
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlinedIcon />}
                            disabled={disabled}
                            onClick={() => setEditMode('commission')}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '8px',
                                fontSize: '0.775rem',
                                borderColor: '#93c5fd',
                                bgcolor: '#eff6ff',
                                color: '#1d4ed8',
                                height: 30,
                                px: 1.5,
                                '&:hover': { bgcolor: '#dbeafe', borderColor: '#60a5fa' },
                            }}
                        >
                            Sửa hoa hồng đài lệch ({computed.commissionMismatch.length})
                        </Button>
                    )}

                    {/* Nút sửa giá nhập đài lệch — ẩn khi deferPersist */}
                    {!deferPersist && computed.priceMismatch.length > 0 && (
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlinedIcon />}
                            disabled={disabled}
                            onClick={() => setEditMode('importCost')}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '8px',
                                fontSize: '0.775rem',
                                borderColor: '#fde68a',
                                bgcolor: '#fffbeb',
                                color: '#b45309',
                                height: 30,
                                px: 1.5,
                                '&:hover': { bgcolor: '#fef3c7', borderColor: '#fcd34d' },
                            }}
                        >
                            Sửa giá nhập đài lệch ({computed.priceMismatch.length})
                        </Button>
                    )}
                    {deferPersist && (computed.commissionMismatch.length > 0 || computed.priceMismatch.length > 0) && (
                        <Chip
                            size="small"
                            label="Giá/HH chỉnh trên form — lưu khi xác nhận đối chiếu"
                            sx={{
                                bgcolor: '#eff6ff',
                                color: '#1d4ed8',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                border: '1px solid #bfdbfe',
                                height: 28,
                            }}
                        />
                    )}
                </Stack>
            </Stack>

            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    bgcolor: '#ffffff',
                }}
            >
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell rowSpan={2} sx={{ fontWeight: 800, fontSize: '0.78rem', color: '#475569', textTransform: 'uppercase', py: 1.2, borderRight: '1px solid #f1f5f9' }}>
                                Nhà đài
                            </TableCell>
                            <TableCell rowSpan={2} align="right" sx={{ fontWeight: 800, fontSize: '0.78rem', color: '#475569', textTransform: 'uppercase', py: 1.2, borderRight: '1px solid #e2e8f0' }}>
                                SL nhập
                            </TableCell>
                            <TableCell colSpan={3} align="center" sx={{ fontWeight: 800, fontSize: '0.78rem', color: '#475569', textTransform: 'uppercase', bgcolor: '#f8fafc', py: 1, borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #e2e8f0' }}>
                                Từ hệ thống
                            </TableCell>
                            <TableCell colSpan={3} align="center" sx={{ fontWeight: 800, fontSize: '0.78rem', color: '#1e40af', textTransform: 'uppercase', bgcolor: '#eff6ff', py: 1, borderBottom: '1px solid #bfdbfe' }}>
                                Thực tế (admin nhập)
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', bgcolor: '#f8fafc', py: 0.8 }}>Giá nhập</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', bgcolor: '#f8fafc', py: 0.8 }}>Hoa hồng</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#0f172a', bgcolor: '#f8fafc', py: 0.8, borderRight: '1px solid #cbd5e1' }}>Sau HH</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#1e40af', bgcolor: '#eff6ff', py: 0.8 }}>Giá nhập</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#1e40af', bgcolor: '#eff6ff', py: 0.8 }}>Hoa hồng</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#1e40af', bgcolor: '#eff6ff', py: 0.8 }}>Sau HH</TableCell>
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
                            const priceDiff = Number.isFinite(actualPrice)
                                && !nearlyEqual(actualPrice, Number(row.importCost || 0), 0.5);
                            const rateDiff = Number.isFinite(actualRate)
                                && !nearlyEqual(actualRate, Number(row.commissionRate || 0));
                            return (
                                <TableRow
                                    key={row.lotteryStationId}
                                    hover
                                    sx={{
                                        '&:hover': { bgcolor: '#f8fafc' },
                                        transition: 'background-color 0.15s ease',
                                    }}
                                >
                                    <TableCell sx={{ borderRight: '1px solid #f1f5f9' }}>
                                        <Typography fontWeight={700} color="#0f172a" sx={{ fontSize: '0.875rem' }}>
                                            {row.lotteryStationName || `Đài #${row.lotteryStationId}`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#334155', borderRight: '1px solid #e2e8f0' }}>
                                        {(row.importedQuantity ?? 0).toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: '#475569', fontSize: '0.875rem' }}>
                                        {formatMoney(row.importCost)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: '#475569', fontSize: '0.875rem' }}>
                                        {formatCommissionPercent(row.commissionRate)}%
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a', borderRight: '1px solid #cbd5e1', fontSize: '0.875rem' }}>
                                        {formatMoney(row.netUnitPrice)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ bgcolor: priceDiff ? '#fffbeb' : '#eff6ff', py: 0.75 }}>
                                        <TextField
                                            size="small"
                                            value={draft.importCost}
                                            disabled={disabled}
                                            slotProps={{
                                                htmlInput: {
                                                    inputMode: 'numeric',
                                                    style: { textAlign: 'right', fontWeight: 700, fontSize: '0.875rem', padding: '5px 8px' },
                                                },
                                            }}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/\D/g, '');
                                                updateDraft(row.lotteryStationId, {
                                                    importCost: raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '',
                                                });
                                            }}
                                            sx={{
                                                width: 120,
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '6px',
                                                    bgcolor: '#ffffff',
                                                    borderColor: priceDiff ? '#f59e0b' : '#cbd5e1',
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: priceDiff ? '#d97706' : '#2563eb',
                                                    },
                                                },
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="right" sx={{ bgcolor: rateDiff ? '#fffbeb' : '#eff6ff', py: 0.75 }}>
                                        <TextField
                                            size="small"
                                            value={draft.commissionPercent}
                                            disabled={disabled}
                                            slotProps={{
                                                htmlInput: {
                                                    inputMode: 'decimal',
                                                    style: { textAlign: 'right', fontWeight: 700, fontSize: '0.875rem', padding: '5px 6px' },
                                                },
                                            }}
                                            onChange={(e) => updateDraft(row.lotteryStationId, {
                                                commissionPercent: e.target.value,
                                            })}
                                            InputProps={{
                                                endAdornment: <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#64748b', ml: 0.25 }}>%</Typography>,
                                            }}
                                            sx={{
                                                width: 85,
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '6px',
                                                    bgcolor: '#ffffff',
                                                    borderColor: rateDiff ? '#f59e0b' : '#cbd5e1',
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: rateDiff ? '#d97706' : '#2563eb',
                                                    },
                                                },
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, bgcolor: '#eff6ff', fontSize: '0.875rem', color: (priceDiff || rateDiff) ? '#b45309' : '#166534' }}>
                                        {actualNet == null ? '—' : formatMoney(actualNet)}
                                        {(priceDiff || rateDiff) && (
                                            <Chip
                                                size="small"
                                                label="Lệch"
                                                sx={{
                                                    ml: 0.75,
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
                                </TableRow>
                            );
                        })}

                        {/* Hàng bình quân gia quyền cả kỳ */}
                        {rows.length > 0 && (
                            <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '2px solid #94a3b8' }}>
                                <TableCell sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.8rem', borderRight: '1px solid #e2e8f0' }}>
                                    Bình quân kỳ này
                                    <Typography variant="caption" display="block" color="#64748b" sx={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'none' }}>
                                        Gia quyền theo SL nhập
                                    </Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.825rem', borderRight: '1px solid #e2e8f0' }}>
                                    {computed.totalQty.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                                    {formatMoney(computed.systemImportCostAvg)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                                    {formatCommissionPercent(computed.systemCommissionAvg)}%
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem', borderRight: '1px solid #cbd5e1' }}>
                                    {formatMoney(computed.systemNet)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.8rem', bgcolor: '#eff6ff' }}>
                                    {computed.complete ? formatMoney(computed.actualImportCostAvg) : '—'}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.8rem', bgcolor: '#eff6ff' }}>
                                    {computed.complete ? `${formatCommissionPercent(computed.actualCommissionAvg)}%` : '—'}
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: '0.9rem',
                                        bgcolor: '#eff6ff',
                                        color: computed.actualNet && computed.systemNet && !nearlyEqual(computed.actualNet, computed.systemNet, 0.5)
                                            ? '#b45309'
                                            : '#166534',
                                    }}
                                >
                                    {computed.actualNet ? formatMoney(computed.actualNet) : '—'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f8fafc', p: 1.25, borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <InfoOutlinedIcon sx={{ fontSize: '1rem', color: '#64748b', flexShrink: 0 }} />
                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                    <strong>Công thức:</strong> Giá sau hoa hồng = Giá nhập × (1 − Tỉ lệ hoa hồng). Đơn giá đối soát cả kỳ được tính tự động theo bình quân gia quyền theo số lượng vé nhập từng đài.
                </Typography>
            </Box>

            <Dialog open={Boolean(editMode)} onClose={() => !saving && setEditMode(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                    {editMode === 'commission' ? 'Cập nhật hoa hồng nhà đài lệch' : 'Cập nhật giá nhập nhà đài lệch'}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>
                        Lưu sẽ ghi đè cấu hình nhà đài bằng giá trị thực tế bạn đang nhập trên bảng. Vé đã nhập kỳ này giữ nguyên vốn snapshot; lần nhập sau dùng giá / HH mới.
                    </Alert>
                    <Stack spacing={1}>
                        {(editMode === 'commission' ? computed.commissionMismatch : computed.priceMismatch).map((row) => {
                            const draft = drafts[row.lotteryStationId];
                            return (
                                <Paper key={row.lotteryStationId} variant="outlined" sx={{ p: 1.5, borderRadius: '10px', borderColor: '#e2e8f0' }}>
                                    <Typography fontWeight={800} color="#0f172a">{row.lotteryStationName}</Typography>
                                    <Typography variant="caption" color="#475569" sx={{ display: 'block', mt: 0.5 }}>
                                        {editMode === 'commission'
                                            ? `HH hệ thống ${formatCommissionPercent(row.commissionRate)}% → thực tế ${draft?.commissionPercent || '—'}%`
                                            : `Giá hệ thống ${formatMoney(row.importCost)} đ → thực tế ${draft?.importCost || '—'} đ`}
                                    </Typography>
                                </Paper>
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button disabled={saving} onClick={() => setEditMode(null)} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        disabled={saving}
                        onClick={applyStationUpdates}
                        sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '8px' }}
                    >
                        {saving ? 'Đang lưu...' : 'Xác nhận cập nhật'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
