'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    ClickAwayListener,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    Popper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInOutlinedIcon from '@mui/icons-material/ZoomInOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import dayjs from 'dayjs';
import type { OcrReviewRow } from '../types/ticketOcr.type';
import {
    canConfirmReviewRow,
    evaluateOcrFieldUiStatus,
    formatConfidence,
    formatDenomination,
    toShortFieldHint,
    type OcrRowValidationContext,
} from '../utils/ocrImportHelpers';
import { formatVietnameseErrorMessage } from '../utils/ocrScanErrorMessage';
import type { OcrFieldSelection } from './OcrReviewImagePane';
import OcrCroppedTicketOverlay from './OcrCroppedTicketOverlay';
import { getStationColor } from '../../../station/utils/stationColor';

const formatFieldConfidenceChip = (conf?: number | null) => {
    if (conf == null || !Number.isFinite(conf)) {
        return { label: 'Độ chính xác: —', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
    }
    const pct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
    if (pct >= 85) {
        return { label: `Độ chính xác: ${pct}%`, color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' };
    }
    if (pct >= 60) {
        return { label: `Độ chính xác: ${pct}%`, color: '#b45309', bg: '#fef3c7', border: '#fde68a' };
    }
    return { label: `Độ chính xác: ${pct}%`, color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' };
};

const FieldHint = ({ message, tone = 'error' }: { message: string; tone?: 'error' | 'warning' }) => {
    const isWarn = tone === 'warning';
    const color = isWarn ? '#b45309' : '#dc2626';
    const shortText = toShortFieldHint(message);
    return (
        <Tooltip title={message} arrow placement="bottom-start" enterDelay={150}>
            <Typography
                variant="caption"
                noWrap
                sx={{
                    color,
                    fontSize: '0.675rem',
                    fontWeight: 600,
                    lineHeight: 1.1,
                    display: 'block',
                    maxWidth: '100%',
                    cursor: 'help',
                }}
            >
                • {shortText}
            </Typography>
        </Tooltip>
    );
};

const DenominationInput = ({
    value,
    stationPrice,
    isSelectedRow,
    status,
    onSelect,
    onUpdate,
}: {
    value?: string | null;
    stationPrice?: number | null;
    isSelectedRow?: boolean;
    status: { status: string; message?: string };
    onSelect: () => void;
    onUpdate: (val: string) => void;
}) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const isOpen = Boolean(anchorEl);

    const quickOptions = useMemo(() => {
        const list: { value: number; label: string; isStationPrice?: boolean }[] = [];
        if (stationPrice != null && stationPrice > 0) {
            list.push({
                value: stationPrice,
                label: `${stationPrice.toLocaleString('vi-VN')} đ (Chuẩn đài)`,
                isStationPrice: true,
            });
        } else {
            list.push({
                value: 10000,
                label: '10.000 đ',
                isStationPrice: true,
            });
        }
        return list;
    }, [stationPrice]);

    const formattedDisplay = value ? formatDenomination(value) : '';

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <ClickAwayListener onClickAway={handleClose}>
            <Box sx={{ position: 'relative', width: '100%' }}>
                <Box
                    component="input"
                    type="text"
                    value={formattedDisplay}
                    placeholder="10.000…"
                    onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                        onSelect();
                        setAnchorEl(e.currentTarget);
                    }}
                    onClick={(e: React.MouseEvent<HTMLInputElement>) => {
                        setAnchorEl(e.currentTarget);
                    }}
                    onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Escape' || e.key === 'Enter') {
                            handleClose();
                        }
                    }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const formatted = formatDenomination(e.target.value);
                        onUpdate(formatted);
                    }}
                    sx={{
                        width: '100%',
                        height: 32,
                        boxSizing: 'border-box',
                        px: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        textAlign: 'right',
                        color: status.status === 'invalid' ? '#dc2626' : '#0f172a',
                        bgcolor: status.status === 'invalid' ? '#fef2f2' : '#ffffff',
                        border: '1px solid',
                        borderColor:
                            status.status === 'invalid'
                                ? '#f87171'
                                : isSelectedRow
                                  ? '#93c5fd'
                                  : '#cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'all 0.15s',
                        '&:hover': {
                            borderColor: '#94a3b8',
                        },
                        '&:focus': {
                            borderColor: '#2563eb',
                            boxShadow: '0 0 0 2px rgba(37,99,235,0.12)',
                            bgcolor: '#ffffff',
                        },
                    }}
                />
                <Popper
                    open={isOpen}
                    anchorEl={anchorEl}
                    placement="bottom-end"
                    style={{ zIndex: 1600 }}
                    modifiers={[
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 4],
                            },
                        },
                    ]}
                >
                    <Paper
                        elevation={6}
                        sx={{
                            minWidth: 175,
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
                            overflow: 'hidden',
                            bgcolor: '#ffffff',
                        }}
                    >
                        <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid #f1f5f9', bgcolor: '#f8fafc' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.675rem', letterSpacing: 0.2 }}>
                                CHỌN NHANH MỆNH GIÁ
                            </Typography>
                        </Box>
                        {quickOptions.map((opt) => (
                            <Box
                                key={opt.value}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onUpdate(formatDenomination(opt.value));
                                    handleClose();
                                }}
                                sx={{
                                    px: 1.5,
                                    py: 0.85,
                                    fontSize: '0.8125rem',
                                    fontWeight: opt.isStationPrice ? 700 : 500,
                                    color: opt.isStationPrice ? '#2563eb' : '#1e293b',
                                    bgcolor: opt.isStationPrice ? 'rgba(37,99,235,0.06)' : 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'background-color 0.15s',
                                    '&:hover': {
                                        bgcolor: opt.isStationPrice ? 'rgba(37,99,235,0.14)' : '#f1f5f9',
                                    },
                                }}
                            >
                                <span>{opt.label}</span>
                            </Box>
                        ))}
                    </Paper>
                </Popper>
            </Box>
        </ClickAwayListener>
    );
};

export type OcrStationOption = {
    id: number;
    name: string;
    code?: string;
};

type Props = {
    rows: OcrReviewRow[];
    selection: OcrFieldSelection | null;
    stations?: OcrStationOption[];
    stationsForRow?: (row: OcrReviewRow) => OcrStationOption[];
    validationContextForRow?: (row: OcrReviewRow) => OcrRowValidationContext | undefined;
    batchDrawDate?: string | null;
    onSelect: (selection: OcrFieldSelection) => void;
    onToggle: (key: string, checked: boolean) => void;
    onUpdate: (key: string, patch: Partial<OcrReviewRow>) => void;
    /** When true, omit outer spacing wrapper (used inside per-image groups). */
    embedded?: boolean;
};

const resolveCroppedImageUrl = (row: OcrReviewRow): string | null => {
    // Prefer pristine crop-only base64 (PNG) from ticket-vision over CDN URL.
    if (row.croppedImageBase64 && row.croppedImageBase64.trim()) {
        const raw = row.croppedImageBase64.trim();
        if (raw.startsWith('data:')) {
            return raw;
        }
        if (raw.startsWith('iVBOR')) {
            return `data:image/png;base64,${raw}`;
        }
        return `data:image/jpeg;base64,${raw}`;
    }
    if (row.croppedImageUrl && row.croppedImageUrl.trim()) {
        return row.croppedImageUrl;
    }
    return null;
};

export default function OcrReviewResultCards({
    rows,
    selection,
    stations = [],
    stationsForRow,
    validationContextForRow,
    batchDrawDate,
    onSelect,
    onToggle,
    onUpdate,
}: Props) {
    const [zoomImage, setZoomImage] = useState<{ url: string; title: string; row: OcrReviewRow } | null>(null);
    const [selectedRowForErrorDetail, setSelectedRowForErrorDetail] = useState<{
        row: OcrReviewRow;
        index: number;
    } | null>(null);
    const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

    useEffect(() => {
        if (!selection?.rowKey) return;
        const node = rowRefs.current[selection.rowKey];
        if (node) {
            node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selection?.rowKey]);

    const isAllSelected = useMemo(() => {
        if (rows.length === 0) return false;
        return rows.every((r) => r.selected);
    }, [rows]);

    const handleToggleAll = (checked: boolean) => {
        for (const r of rows) {
            const ctx = validationContextForRow?.(r);
            const confirmable = canConfirmReviewRow(r, ctx);
            if (confirmable) {
                onToggle(r.key, checked);
            } else if (!checked) {
                onToggle(r.key, false);
            }
        }
    };

    if (rows.length === 0) {
        return (
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    borderRadius: '12px',
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    Không nhận diện được vé nào trong ảnh này.
                </Typography>
            </Paper>
        );
    }

    return (
        <>
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    bgcolor: '#ffffff',
                    maxHeight: { xs: 450, md: 560 },
                    overflowX: 'auto',
                }}
            >
                <Table
                    size="small"
                    stickyHeader
                    sx={{
                        width: '100%',
                        tableLayout: 'auto',
                        '& .MuiTableCell-root': {
                            py: 0.75,
                            px: 0.75,
                            fontSize: '0.8125rem',
                            borderColor: '#f1f5f9',
                            verticalAlign: 'top',
                        },
                    }}
                >
                    <TableHead>
                        <TableRow
                            sx={{
                                '& .MuiTableCell-root': {
                                    bgcolor: '#f8fafc',
                                    fontWeight: 800,
                                    fontSize: '0.7rem',
                                    color: '#475569',
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    py: 1,
                                    px: 0.75,
                                    borderBottom: '1.5px solid #e2e8f0',
                                    whiteSpace: 'nowrap',
                                    verticalAlign: 'middle',
                                },
                            }}
                        >
                            <TableCell align="center" sx={{ width: 52, minWidth: 52, px: 0.5 }}>
                                <Stack direction="row" spacing={0.25} alignItems="center" justifyContent="center">
                                    <Checkbox
                                        size="small"
                                        checked={isAllSelected}
                                        indeterminate={rows.some((r) => r.selected) && !isAllSelected}
                                        onChange={(e) => handleToggleAll(e.target.checked)}
                                        sx={{ p: 0, color: '#2563eb', '&.Mui-checked': { color: '#2563eb' } }}
                                    />
                                    <span>STT</span>
                                </Stack>
                            </TableCell>
                            <TableCell sx={{ minWidth: 105, width: 110 }}>
                                Dãy số <span style={{ color: '#ef4444' }}>*</span>
                            </TableCell>
                            <TableCell sx={{ minWidth: 100, width: 105 }}>
                                Số sê-ri <span style={{ color: '#ef4444' }}>*</span>
                            </TableCell>
                            <TableCell sx={{ minWidth: 135, width: 145 }}>
                                Nhà đài <span style={{ color: '#ef4444' }}>*</span>
                            </TableCell>
                            <TableCell sx={{ minWidth: 120, width: 130 }}>
                                Ngày mở thưởng <span style={{ color: '#ef4444' }}>*</span>
                            </TableCell>
                            <TableCell sx={{ width: 85, minWidth: 80 }}>
                                Ký hiệu / Lô
                            </TableCell>
                            <TableCell align="right" sx={{ width: 100, minWidth: 95, textAlign: 'right' }}>
                                Mệnh giá <span style={{ color: '#ef4444' }}>*</span>
                            </TableCell>
                            <TableCell align="center" sx={{ width: 80, minWidth: 75 }}>
                                Trạng thái
                            </TableCell>
                            <TableCell align="center" sx={{ width: 75, minWidth: 70 }}>
                                Ảnh vé
                            </TableCell>
                            <TableCell align="center" sx={{ width: 85, minWidth: 80 }}>
                                Chi tiết
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => {
                            const ctx = validationContextForRow?.(row);
                            const confirmable = canConfirmReviewRow(row, ctx);
                            const rowStations = stationsForRow?.(row) ?? stations;
                            const isSelectedRow = selection?.rowKey === row.key;
                            const croppedUrl = resolveCroppedImageUrl(row);

                            const numbersStatus = evaluateOcrFieldUiStatus(row, 'numbers', ctx);
                            const serialStatus = evaluateOcrFieldUiStatus(row, 'serialNumber', ctx);
                            const stationStatus = evaluateOcrFieldUiStatus(row, 'stationName', ctx);
                            const drawDateStatus = evaluateOcrFieldUiStatus(row, 'drawDate', ctx);
                            const batchCodeStatus = evaluateOcrFieldUiStatus(row, 'batchCode', ctx);
                            const priceStatus = evaluateOcrFieldUiStatus(row, 'ticketType', ctx);

                            const missingStation = row.stationId == null;
                            const displayConfidence =
                                row.adjustedConfidence != null ? row.adjustedConfidence : row.confidence;

                            const isError =
                                row.status === 'FAILED' ||
                                row.overallValidationStatus === 'INVALID' ||
                                row.duplicate;

                            // Calculate total errors / warnings for the row
                            let errorCount = 0;
                            let warningCount = 0;

                            if (numbersStatus.status === 'invalid' || numbersStatus.status === 'unreadable') errorCount++;
                            else if (numbersStatus.status === 'uncertain') warningCount++;

                            if (serialStatus.status === 'invalid' || serialStatus.status === 'unreadable') errorCount++;
                            else if (serialStatus.status === 'uncertain') warningCount++;

                            if (missingStation || stationStatus.status === 'invalid' || stationStatus.status === 'unreadable') errorCount++;
                            else if (stationStatus.status === 'uncertain') warningCount++;

                            if (drawDateStatus.status === 'invalid' || drawDateStatus.status === 'unreadable') errorCount++;
                            else if (drawDateStatus.status === 'uncertain') warningCount++;

                            if (batchCodeStatus.status === 'invalid') errorCount++;
                            else if (batchCodeStatus.status === 'uncertain') warningCount++;

                            if (priceStatus.status === 'invalid') errorCount++;
                            else if (priceStatus.status === 'uncertain') warningCount++;

                            if (row.duplicate) errorCount++;
                            if (row.status === 'FAILED') errorCount++;
                            if (row.validationErrors && row.validationErrors.length > 0) errorCount += row.validationErrors.length;
                            if (row.businessValidationErrors && row.businessValidationErrors.length > 0) errorCount += row.businessValidationErrors.length;

                            const stationColor = getStationColor(row.stationId);

                            return (
                                <TableRow
                                    key={row.key}
                                    ref={(node: HTMLTableRowElement | null) => {
                                        rowRefs.current[row.key] = node;
                                    }}
                                    onClick={() => onSelect({ rowKey: row.key, fieldName: null })}
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        bgcolor: isSelectedRow
                                            ? 'rgba(37, 99, 235, 0.05)'
                                            : isError
                                              ? 'rgba(239, 68, 68, 0.02)'
                                              : index % 2 === 1
                                                ? '#fafafa'
                                                : '#ffffff',
                                        borderLeft: isSelectedRow
                                            ? '4px solid #2563eb'
                                            : isError
                                              ? '4px solid #ef4444'
                                              : row.selected
                                                ? '4px solid #10b981'
                                                : '4px solid transparent',
                                        '&:hover': {
                                            bgcolor: isSelectedRow
                                                ? 'rgba(37, 99, 235, 0.08)'
                                                : 'rgba(241, 245, 249, 0.8)',
                                        },
                                    }}
                                >
                                    <TableCell align="center" sx={{ px: 0.5, verticalAlign: 'top', py: 0.75 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32, gap: 0.25 }}>
                                            <Checkbox
                                                size="small"
                                                checked={row.selected}
                                                disabled={!confirmable}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    onToggle(row.key, e.target.checked);
                                                }}
                                                sx={{ p: 0, color: '#2563eb', '&.Mui-checked': { color: '#2563eb' } }}
                                            />
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontWeight: 800,
                                                    fontSize: '0.75rem',
                                                    fontFamily: 'monospace',
                                                    color: isSelectedRow ? '#1d4ed8' : '#64748b',
                                                }}
                                            >
                                                #{index + 1}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ verticalAlign: 'top', py: 0.75, px: 0.75 }}>
                                        <Box
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ display: 'flex', flexDirection: 'column', minHeight: 52 }}
                                        >
                                            <Box
                                                component="input"
                                                type="text"
                                                value={row.numbers}
                                                placeholder="Nhập dãy số…"
                                                onFocus={() => onSelect({ rowKey: row.key, fieldName: 'numbers' })}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    onUpdate(row.key, { numbers: e.target.value })
                                                }
                                                sx={{
                                                    width: '100%',
                                                    height: 32,
                                                    boxSizing: 'border-box',
                                                    px: 1,
                                                    fontFamily: 'monospace',
                                                    fontWeight: 800,
                                                    fontSize: '0.875rem',
                                                    letterSpacing: '0.04em',
                                                    color: numbersStatus.status === 'invalid' ? '#dc2626' : '#0f172a',
                                                    bgcolor: numbersStatus.status === 'invalid' ? '#fef2f2' : '#ffffff',
                                                    border: '1px solid',
                                                    borderColor:
                                                        numbersStatus.status === 'invalid'
                                                            ? '#f87171'
                                                            : isSelectedRow
                                                              ? '#93c5fd'
                                                              : '#cbd5e1',
                                                    borderRadius: '6px',
                                                    outline: 'none',
                                                    transition: 'all 0.15s',
                                                    '&:hover': {
                                                        borderColor: '#94a3b8',
                                                    },
                                                    '&:focus': {
                                                        borderColor: '#2563eb',
                                                        boxShadow: '0 0 0 2px rgba(37,99,235,0.12)',
                                                        bgcolor: '#ffffff',
                                                    },
                                                }}
                                            />
                                            <Box sx={{ minHeight: 18, mt: 0.25, display: 'flex', alignItems: 'flex-start' }}>
                                                {numbersStatus.message && (
                                                    <FieldHint
                                                        message={numbersStatus.message}
                                                        tone={numbersStatus.status === 'uncertain' ? 'warning' : 'error'}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ verticalAlign: 'top', py: 0.75, px: 0.75 }}>
                                        <Box
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ display: 'flex', flexDirection: 'column', minHeight: 52 }}
                                        >
                                            <Box
                                                component="input"
                                                type="text"
                                                value={row.serialNumber}
                                                placeholder="Nhập số sê-ri…"
                                                onFocus={() => onSelect({ rowKey: row.key, fieldName: 'serialNumber' })}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    onUpdate(row.key, { serialNumber: e.target.value })
                                                }
                                                sx={{
                                                    width: '100%',
                                                    height: 32,
                                                    boxSizing: 'border-box',
                                                    px: 0.75,
                                                    fontFamily: 'monospace',
                                                    fontWeight: 700,
                                                    fontSize: '0.8125rem',
                                                    color: serialStatus.status === 'invalid' ? '#dc2626' : '#334155',
                                                    bgcolor: serialStatus.status === 'invalid' ? '#fef2f2' : '#ffffff',
                                                    border: '1px solid',
                                                    borderColor:
                                                        serialStatus.status === 'invalid'
                                                            ? '#f87171'
                                                            : isSelectedRow
                                                              ? '#93c5fd'
                                                              : '#cbd5e1',
                                                    borderRadius: '6px',
                                                    outline: 'none',
                                                    transition: 'all 0.15s',
                                                    '&:hover': {
                                                        borderColor: '#cbd5e1',
                                                    },
                                                    '&:focus': {
                                                        borderColor: '#2563eb',
                                                        boxShadow: '0 0 0 2px rgba(37,99,235,0.12)',
                                                        bgcolor: '#ffffff',
                                                    },
                                                }}
                                            />
                                            <Box sx={{ minHeight: 18, mt: 0.25, display: 'flex', alignItems: 'flex-start' }}>
                                                {serialStatus.message && (
                                                    <FieldHint
                                                        message={serialStatus.message}
                                                        tone={serialStatus.status === 'uncertain' ? 'warning' : 'error'}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ verticalAlign: 'top', py: 0.75, px: 0.75 }}>
                                        <Box
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ display: 'flex', flexDirection: 'column', minHeight: 52 }}
                                        >
                                            <Select
                                                size="small"
                                                fullWidth
                                                displayEmpty
                                                value={row.stationId ?? ''}
                                                error={missingStation || stationStatus.status === 'invalid'}
                                                onFocus={() => onSelect({ rowKey: row.key, fieldName: 'stationName' })}
                                                onChange={(e) => {
                                                    const raw = String(e.target.value ?? '');
                                                    const nextId = raw === '' ? null : Number(raw);
                                                    const matched = rowStations.find((s) => s.id === nextId);
                                                    onUpdate(row.key, {
                                                        stationId: nextId,
                                                        stationName: matched?.name ?? row.stationName,
                                                    });
                                                }}
                                                renderValue={(val: any) => {
                                                    if (!val || String(val) === '') {
                                                        return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-- Chọn đài --</span>;
                                                    }
                                                    const matched = rowStations.find((s) => s.id === Number(val));
                                                    return (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, overflow: 'hidden' }}>
                                                            {stationColor && (
                                                                <Box
                                                                    sx={{
                                                                        width: 7,
                                                                        height: 7,
                                                                        borderRadius: '50%',
                                                                        bgcolor: stationColor,
                                                                        flexShrink: 0,
                                                                    }}
                                                                />
                                                            )}
                                                            <Typography
                                                                variant="body2"
                                                                noWrap
                                                                sx={{
                                                                    fontSize: '0.8125rem',
                                                                    fontWeight: 700,
                                                                    color: stationColor || '#0f172a',
                                                                }}
                                                            >
                                                                {matched?.name ?? row.stationName ?? `Đài #${val}`}
                                                            </Typography>
                                                        </Box>
                                                    );
                                                }}
                                                sx={{
                                                    height: 32,
                                                    boxSizing: 'border-box',
                                                    bgcolor: missingStation || stationStatus.status === 'invalid' ? '#fef2f2' : '#ffffff',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    '& .MuiSelect-select': {
                                                        py: 0,
                                                        px: 1,
                                                        height: 30,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    },
                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                        borderColor:
                                                            missingStation || stationStatus.status === 'invalid'
                                                                ? '#f87171'
                                                                : isSelectedRow
                                                                  ? '#93c5fd'
                                                                  : '#cbd5e1',
                                                    },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#94a3b8',
                                                    },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#2563eb',
                                                    },
                                                }}
                                            >
                                                <MenuItem value="">
                                                    <em style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>-- Chọn đài --</em>
                                                </MenuItem>
                                                {rowStations.map((station) => {
                                                    const color = getStationColor(station.id);
                                                    return (
                                                        <MenuItem key={station.id} value={station.id} sx={{ fontSize: '0.8125rem' }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                {color && (
                                                                    <Box
                                                                        sx={{
                                                                            width: 7,
                                                                            height: 7,
                                                                            borderRadius: '50%',
                                                                            bgcolor: color,
                                                                            flexShrink: 0,
                                                                        }}
                                                                    />
                                                                )}
                                                                <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                                                    {station.name} {station.code ? `(${station.code})` : ''}
                                                                </Typography>
                                                            </Box>
                                                        </MenuItem>
                                                    );
                                                })}
                                            </Select>
                                            <Box sx={{ minHeight: 18, mt: 0.25, display: 'flex', alignItems: 'flex-start' }}>
                                                {missingStation ? (
                                                    <FieldHint message={stationStatus.message || 'Chưa chọn đài'} />
                                                ) : (
                                                    stationStatus.message && (
                                                        <FieldHint
                                                            message={stationStatus.message}
                                                            tone={stationStatus.status === 'uncertain' ? 'warning' : 'error'}
                                                        />
                                                    )
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ verticalAlign: 'top', py: 0.75, px: 0.75 }}>
                                        <Box
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ display: 'flex', flexDirection: 'column', minHeight: 52 }}
                                        >
                                            {batchDrawDate ? (
                                                <Select
                                                    size="small"
                                                    fullWidth
                                                    displayEmpty
                                                    value={
                                                        row.drawDate
                                                            ? dayjs(row.drawDate).format('YYYY-MM-DD')
                                                            : dayjs(batchDrawDate).format('YYYY-MM-DD')
                                                    }
                                                    error={drawDateStatus.status === 'invalid'}
                                                    onFocus={() => onSelect({ rowKey: row.key, fieldName: 'drawDate' })}
                                                    onChange={(e) => {
                                                        const nextDate = String(e.target.value ?? '');
                                                        onUpdate(row.key, { drawDate: nextDate || null });
                                                    }}
                                                    renderValue={(val: any) => {
                                                        if (!val || String(val) === '') {
                                                            return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-- Chọn ngày --</span>;
                                                        }
                                                        const isBatch =
                                                            dayjs(val).format('YYYY-MM-DD') ===
                                                            dayjs(batchDrawDate).format('YYYY-MM-DD');
                                                        return (
                                                            <Typography
                                                                variant="body2"
                                                                noWrap
                                                                sx={{
                                                                    fontSize: '0.8125rem',
                                                                    fontWeight: 700,
                                                                    color: isBatch ? '#0f172a' : '#dc2626',
                                                                }}
                                                            >
                                                                {dayjs(val).format('DD/MM/YYYY')}
                                                            </Typography>
                                                        );
                                                    }}
                                                    sx={{
                                                        height: 32,
                                                        boxSizing: 'border-box',
                                                        bgcolor: drawDateStatus.status === 'invalid' ? '#fef2f2' : '#ffffff',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8125rem',
                                                        fontWeight: 600,
                                                        '& .MuiSelect-select': {
                                                            py: 0,
                                                            px: 1,
                                                            height: 30,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                        },
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor:
                                                                drawDateStatus.status === 'invalid'
                                                                    ? '#f87171'
                                                                    : isSelectedRow
                                                                      ? '#93c5fd'
                                                                      : '#cbd5e1',
                                                        },
                                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: '#94a3b8',
                                                        },
                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: '#2563eb',
                                                        },
                                                    }}
                                                >
                                                    <MenuItem
                                                        value={dayjs(batchDrawDate).format('YYYY-MM-DD')}
                                                        sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1d4ed8' }}
                                                    >
                                                        {dayjs(batchDrawDate).format('DD/MM/YYYY')} (Theo phiếu nhập)
                                                    </MenuItem>
                                                    {row.drawDate &&
                                                        dayjs(row.drawDate).format('YYYY-MM-DD') !==
                                                            dayjs(batchDrawDate).format('YYYY-MM-DD') && (
                                                            <MenuItem
                                                                value={dayjs(row.drawDate).format('YYYY-MM-DD')}
                                                                sx={{ fontSize: '0.8125rem', color: '#dc2626' }}
                                                            >
                                                                {dayjs(row.drawDate).format('DD/MM/YYYY')} (Nhận diện từ vé)
                                                            </MenuItem>
                                                        )}
                                                </Select>
                                            ) : (
                                                <Box
                                                    component="input"
                                                    type="date"
                                                    value={row.drawDate ? dayjs(row.drawDate).format('YYYY-MM-DD') : ''}
                                                    onFocus={() => onSelect({ rowKey: row.key, fieldName: 'drawDate' })}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                        onUpdate(row.key, { drawDate: e.target.value || null })
                                                    }
                                                    sx={{
                                                        width: '100%',
                                                        height: 32,
                                                        boxSizing: 'border-box',
                                                        px: 0.75,
                                                        fontSize: '0.8125rem',
                                                        fontWeight: 600,
                                                        color: drawDateStatus.status === 'invalid' ? '#dc2626' : '#0f172a',
                                                        bgcolor: drawDateStatus.status === 'invalid' ? '#fef2f2' : '#ffffff',
                                                        border: '1px solid',
                                                        borderColor:
                                                            drawDateStatus.status === 'invalid'
                                                                ? '#f87171'
                                                                : isSelectedRow
                                                                  ? '#93c5fd'
                                                                  : '#cbd5e1',
                                                        borderRadius: '6px',
                                                        outline: 'none',
                                                        transition: 'all 0.15s',
                                                        '&:hover': {
                                                            borderColor: '#94a3b8',
                                                        },
                                                        '&:focus': {
                                                            borderColor: '#2563eb',
                                                            boxShadow: '0 0 0 2px rgba(37,99,235,0.12)',
                                                            bgcolor: '#ffffff',
                                                        },
                                                    }}
                                                />
                                            )}
                                            <Box sx={{ minHeight: 18, mt: 0.25, display: 'flex', alignItems: 'flex-start' }}>
                                                {drawDateStatus.message && (
                                                    <FieldHint
                                                        message={drawDateStatus.message}
                                                        tone={drawDateStatus.status === 'uncertain' ? 'warning' : 'error'}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ verticalAlign: 'top', py: 0.75, px: 0.75 }}>
                                        <Box
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ display: 'flex', flexDirection: 'column', minHeight: 52 }}
                                        >
                                            <Box
                                                component="input"
                                                type="text"
                                                value={row.batchCode ?? ''}
                                                placeholder="Ký hiệu / Lô"
                                                onFocus={() => onSelect({ rowKey: row.key, fieldName: 'batchCode' })}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    onUpdate(row.key, { batchCode: e.target.value })
                                                }
                                                sx={{
                                                    width: '100%',
                                                    height: 32,
                                                    boxSizing: 'border-box',
                                                    px: 0.75,
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    color:
                                                        batchCodeStatus.status === 'invalid'
                                                            ? '#dc2626'
                                                            : '#334155',
                                                    bgcolor:
                                                        batchCodeStatus.status === 'invalid'
                                                            ? '#fef2f2'
                                                            : '#ffffff',
                                                    border: '1px solid',
                                                    borderColor:
                                                        batchCodeStatus.status === 'invalid'
                                                            ? '#f87171'
                                                            : isSelectedRow
                                                              ? '#93c5fd'
                                                              : '#cbd5e1',
                                                    borderRadius: '6px',
                                                    outline: 'none',
                                                    transition: 'all 0.15s',
                                                    '&:hover': {
                                                        borderColor: '#cbd5e1',
                                                    },
                                                    '&:focus': {
                                                        borderColor: '#2563eb',
                                                        boxShadow: '0 0 0 2px rgba(37,99,235,0.12)',
                                                        bgcolor: '#ffffff',
                                                    },
                                                }}
                                            />
                                            <Box sx={{ minHeight: 18, mt: 0.25, display: 'flex', alignItems: 'flex-start' }}>
                                                {batchCodeStatus.message && (
                                                    <FieldHint
                                                        message={batchCodeStatus.message}
                                                        tone={batchCodeStatus.status === 'uncertain' ? 'warning' : 'error'}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ verticalAlign: 'top', py: 0.75, px: 0.75 }}>
                                        <Box
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ display: 'flex', flexDirection: 'column', minHeight: 52 }}
                                        >
                                            <DenominationInput
                                                value={row.ticketType}
                                                stationPrice={
                                                    row.stationId != null && ctx?.stationPriceById?.has(row.stationId)
                                                        ? ctx.stationPriceById.get(row.stationId)
                                                        : null
                                                }
                                                isSelectedRow={isSelectedRow}
                                                status={priceStatus}
                                                onSelect={() => onSelect({ rowKey: row.key, fieldName: 'ticketType' })}
                                                onUpdate={(val) => onUpdate(row.key, { ticketType: val })}
                                            />
                                            <Box sx={{ minHeight: 18, mt: 0.25, display: 'flex', alignItems: 'flex-start' }}>
                                                {priceStatus.message && (
                                                    <FieldHint
                                                        message={priceStatus.message}
                                                        tone={priceStatus.status === 'uncertain' ? 'warning' : 'error'}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" sx={{ verticalAlign: 'top', py: 0.75, px: 0.75 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32 }}>
                                            <Tooltip
                                                arrow
                                                title={
                                                    <Box sx={{ p: 0.5 }}>
                                                        <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                                                            Chi tiết nhận diện:
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ display: 'block' }}>
                                                            • Độ chính xác: {formatConfidence(displayConfidence)}
                                                        </Typography>
                                                        {row.duplicate && (
                                                            <Typography variant="caption" color="#fca5a5" sx={{ display: 'block' }}>
                                                                • Cảnh báo: Trùng số sê-ri / dãy số với vé đã có trong hệ thống
                                                            </Typography>
                                                        )}
                                                        {row.businessValidationErrors?.map((err, i) => (
                                                            <Typography key={`b-${i}`} variant="caption" color="#fca5a5" sx={{ display: 'block' }}>
                                                                • {formatVietnameseErrorMessage(err)}
                                                            </Typography>
                                                        ))}
                                                        {row.validationErrors?.map((err, i) => (
                                                            <Typography key={i} variant="caption" color="#fca5a5" sx={{ display: 'block' }}>
                                                                • {formatVietnameseErrorMessage(err)}
                                                            </Typography>
                                                        ))}
                                                        {row.edited && (
                                                            <Typography variant="caption" color="#93c5fd" sx={{ display: 'block' }}>
                                                                • Đã được chỉnh sửa thủ công
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                            >
                                                <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Chip
                                                        size="small"
                                                        icon={
                                                            row.status === 'COMPLETE' || row.overallValidationStatus === 'VALID' ? (
                                                                <CheckCircleOutlineIcon sx={{ fontSize: '12px !important' }} />
                                                            ) : row.duplicate || row.status === 'FAILED' ? (
                                                                <ErrorOutlineOutlinedIcon sx={{ fontSize: '12px !important' }} />
                                                            ) : (
                                                                <WarningAmberOutlinedIcon sx={{ fontSize: '12px !important' }} />
                                                            )
                                                        }
                                                        label={
                                                            row.duplicate
                                                                ? 'Trùng'
                                                                : row.status === 'FAILED'
                                                                  ? 'Lỗi đọc'
                                                                  : row.edited
                                                                    ? 'Đã sửa'
                                                                    : `${formatConfidence(displayConfidence)}`
                                                        }
                                                        sx={{
                                                            fontWeight: 800,
                                                            fontSize: '0.7rem',
                                                            height: 22,
                                                            borderRadius: '5px',
                                                            bgcolor:
                                                                row.duplicate || row.status === 'FAILED'
                                                                    ? '#fee2e2'
                                                                    : row.status === 'COMPLETE' || row.overallValidationStatus === 'VALID'
                                                                      ? '#dcfce7'
                                                                      : '#fef3c7',
                                                            color:
                                                                row.duplicate || row.status === 'FAILED'
                                                                    ? '#b91c1c'
                                                                    : row.status === 'COMPLETE' || row.overallValidationStatus === 'VALID'
                                                                      ? '#15803d'
                                                                      : '#b45309',
                                                            border: '1px solid',
                                                            borderColor:
                                                                row.duplicate || row.status === 'FAILED'
                                                                    ? '#fecaca'
                                                                    : row.status === 'COMPLETE' || row.overallValidationStatus === 'VALID'
                                                                      ? '#bbf7d0'
                                                                      : '#fde68a',
                                                        }}
                                                    />
                                                </Box>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" sx={{ verticalAlign: 'top', py: 0.75, px: 0.75 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32 }}>
                                            {croppedUrl ? (
                                                <Tooltip title="Nhấp để phóng to ảnh vé này" arrow>
                                                    <Box
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setZoomImage({
                                                                url: croppedUrl,
                                                                title: `Ảnh vé #${index + 1} - ${row.numbers || 'Chưa nhận diện'}`,
                                                                row,
                                                            });
                                                        }}
                                                        sx={{
                                                            position: 'relative',
                                                            width: 64,
                                                            height: 32,
                                                            borderRadius: '6px',
                                                            overflow: 'hidden',
                                                            border: '1.5px solid',
                                                            borderColor: isSelectedRow ? '#3b82f6' : '#cbd5e1',
                                                            bgcolor: '#0f172a',
                                                            mx: 'auto',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                                            transition: 'all 0.15s ease',
                                                            '&:hover': {
                                                                transform: 'scale(1.08)',
                                                                borderColor: '#2563eb',
                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                                '& .zoom-overlay': { opacity: 1 },
                                                            },
                                                        }}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={croppedUrl}
                                                            alt={`Vé #${index + 1}`}
                                                            sx={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'contain',
                                                                display: 'block',
                                                                imageRendering: 'auto',
                                                            }}
                                                        />
                                                        <Box
                                                            className="zoom-overlay"
                                                            sx={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                bgcolor: 'rgba(15, 23, 42, 0.45)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: 0,
                                                                transition: 'opacity 0.15s',
                                                            }}
                                                        >
                                                            <ZoomInOutlinedIcon sx={{ color: '#ffffff', fontSize: 13 }} />
                                                        </Box>
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="Không có ảnh vé riêng cho vé này" arrow>
                                                    <Box
                                                        sx={{
                                                            width: 64,
                                                            height: 32,
                                                            borderRadius: '6px',
                                                            border: '1px dashed #cbd5e1',
                                                            bgcolor: '#f8fafc',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            mx: 'auto',
                                                        }}
                                                    >
                                                        <ConfirmationNumberOutlinedIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center" sx={{ px: 0.5, verticalAlign: 'top', py: 0.75 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32 }}>
                                            <Tooltip
                                                title={
                                                    errorCount > 0
                                                        ? `Nhấp để xem chi tiết ${errorCount} lỗi & độ chính xác từng trường`
                                                        : warningCount > 0
                                                          ? `Nhấp để xem chi tiết ${warningCount} lưu ý & độ chính xác từng trường`
                                                          : 'Nhấp để xem chi tiết nhận diện & độ chính xác từng trường'
                                                }
                                                arrow
                                            >
                                                <Box
                                                    component="button"
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedRowForErrorDetail({ row, index });
                                                    }}
                                                    sx={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 0.5,
                                                        px: 1,
                                                        py: 0.35,
                                                        borderRadius: '20px',
                                                        border: '1px solid',
                                                        fontSize: '0.725rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        outline: 'none',
                                                        transition: 'all 0.15s ease-in-out',
                                                        bgcolor:
                                                            errorCount > 0
                                                                ? '#fef2f2'
                                                                : warningCount > 0
                                                                  ? '#fffbeb'
                                                                  : '#f0fdf4',
                                                        borderColor:
                                                            errorCount > 0
                                                                ? '#fca5a5'
                                                                : warningCount > 0
                                                                  ? '#fde68a'
                                                                  : '#bbf7d0',
                                                        color:
                                                            errorCount > 0
                                                                ? '#dc2626'
                                                                : warningCount > 0
                                                                  ? '#b45309'
                                                                  : '#16a34a',
                                                        '&:hover': {
                                                            bgcolor:
                                                                errorCount > 0
                                                                    ? '#fee2e2'
                                                                    : warningCount > 0
                                                                      ? '#fef3c7'
                                                                      : '#dcfce7',
                                                            borderColor:
                                                                errorCount > 0
                                                                    ? '#f87171'
                                                                    : warningCount > 0
                                                                      ? '#f59e0b'
                                                                      : '#86efac',
                                                            transform: 'translateY(-1px)',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                                        },
                                                    }}
                                                >
                                                    {errorCount > 0 ? (
                                                        <ErrorOutlineOutlinedIcon sx={{ fontSize: 13 }} />
                                                    ) : warningCount > 0 ? (
                                                        <WarningAmberOutlinedIcon sx={{ fontSize: 13 }} />
                                                    ) : (
                                                        <CheckCircleOutlineIcon sx={{ fontSize: 13 }} />
                                                    )}
                                                    <span>
                                                        {errorCount > 0
                                                            ? `${errorCount} lỗi`
                                                            : warningCount > 0
                                                              ? `${warningCount} lưu ý`
                                                              : 'Hợp lệ'}
                                                    </span>
                                                </Box>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal phóng to ảnh vé riêng */}
            <Dialog
                open={Boolean(zoomImage)}
                onClose={() => setZoomImage(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        p: 2,
                        bgcolor: '#ffffff',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            {zoomImage?.title}
                        </Typography>
                        {zoomImage?.row?.stationName && (
                            <Chip
                                size="small"
                                label={zoomImage.row.stationName}
                                sx={{
                                    bgcolor: '#f1f5f9',
                                    color: getStationColor(zoomImage.row.stationId) || '#334155',
                                    fontWeight: 700,
                                    fontSize: '0.725rem',
                                    height: 22,
                                }}
                            />
                        )}
                    </Stack>
                    <IconButton size="small" onClick={() => setZoomImage(null)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 2, bgcolor: '#0f172a', textAlign: 'center' }}>
                    {zoomImage && (
                        <OcrCroppedTicketOverlay
                            imageUrl={zoomImage.url}
                            row={zoomImage.row}
                            selection={selection}
                            alt={zoomImage.title}
                            maxHeight="70vh"
                            onSelectField={(fieldName) => {
                                onSelect({ rowKey: zoomImage.row.key, fieldName });
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal Pop-up Chi tiết kiểm tra & độ chính xác từng fields của vé */}
            {selectedRowForErrorDetail && (() => {
                const { row, index } = selectedRowForErrorDetail;
                const ctx = validationContextForRow?.(row);
                const numbersStatus = evaluateOcrFieldUiStatus(row, 'numbers', ctx);
                const serialStatus = evaluateOcrFieldUiStatus(row, 'serialNumber', ctx);
                const stationStatus = evaluateOcrFieldUiStatus(row, 'stationName', ctx);
                const drawDateStatus = evaluateOcrFieldUiStatus(row, 'drawDate', ctx);
                const batchCodeStatus = evaluateOcrFieldUiStatus(row, 'batchCode', ctx);
                const priceStatus = evaluateOcrFieldUiStatus(row, 'ticketType', ctx);
                const croppedUrl = resolveCroppedImageUrl(row);
                const missingStation = row.stationId == null;
                const displayConfidence =
                    row.adjustedConfidence != null ? row.adjustedConfidence : row.confidence;

                const fieldsDetail = [
                    {
                        key: 'numbers',
                        label: 'Dãy số vé',
                        scannedValue: row.fields?.numbers?.value ?? (row.numbers ? row.numbers : null),
                        currentValue: row.numbers || '(Trống)',
                        confidence: row.fieldConfidences?.numbers ?? row.fields?.numbers?.confidence ?? null,
                        status: numbersStatus.status,
                        message: numbersStatus.message,
                        required: true,
                    },
                    {
                        key: 'serialNumber',
                        label: 'Số sê-ri',
                        scannedValue: row.fields?.serialNumber?.value ?? (row.serialNumber ? row.serialNumber : null),
                        currentValue: row.serialNumber || '(Trống)',
                        confidence: row.fieldConfidences?.serialNumber ?? row.fields?.serialNumber?.confidence ?? null,
                        status: serialStatus.status,
                        message: serialStatus.message,
                        required: true,
                    },
                    {
                        key: 'stationName',
                        label: 'Nhà đài',
                        scannedValue: row.fields?.stationName?.value ?? (row.stationName ? row.stationName : null),
                        currentValue: row.stationName || (missingStation ? '(Chưa chọn đài)' : `Đài #${row.stationId}`),
                        confidence: row.fieldConfidences?.stationName ?? row.fields?.stationName?.confidence ?? null,
                        status: missingStation ? 'invalid' : stationStatus.status,
                        message: missingStation ? (stationStatus.message || 'Chưa chọn nhà đài mở thưởng.') : stationStatus.message,
                        required: true,
                    },
                    {
                        key: 'drawDate',
                        label: 'Ngày mở thưởng',
                        scannedValue: row.fields?.drawDate?.value ? dayjs(row.fields.drawDate.value).format('DD/MM/YYYY') : (row.drawDate ? dayjs(row.drawDate).format('DD/MM/YYYY') : null),
                        currentValue: row.drawDate ? dayjs(row.drawDate).format('DD/MM/YYYY') : '(Chưa chọn)',
                        confidence: row.fieldConfidences?.drawDate ?? row.fields?.drawDate?.confidence ?? null,
                        status: drawDateStatus.status,
                        message: drawDateStatus.message,
                        required: true,
                    },
                    {
                        key: 'batchCode',
                        label: 'Ký hiệu / Lô',
                        scannedValue: row.fields?.batchCode?.value ?? (row.batchCode ? row.batchCode : null),
                        currentValue: row.batchCode || '(Không có)',
                        confidence: row.fieldConfidences?.batchCode ?? row.fields?.batchCode?.confidence ?? null,
                        status: batchCodeStatus.status,
                        message: batchCodeStatus.message,
                        required: false,
                    },
                    {
                        key: 'ticketType',
                        label: 'Mệnh giá',
                        scannedValue: row.fields?.ticketType?.value ? `${formatDenomination(row.fields.ticketType.value)} đ` : (row.ticketType ? `${formatDenomination(row.ticketType)} đ` : null),
                        currentValue: row.ticketType ? `${formatDenomination(row.ticketType)} đ` : '(Chưa nhập mệnh giá)',
                        confidence: row.fieldConfidences?.ticketType ?? row.fields?.ticketType?.confidence ?? null,
                        status: priceStatus.status,
                        message: priceStatus.message,
                        required: true,
                    },
                ];

                const totalErrors = fieldsDetail.filter(f => f.status === 'invalid' || f.status === 'unreadable').length + (row.duplicate ? 1 : 0) + (row.status === 'FAILED' ? 1 : 0) + (row.validationErrors?.length ?? 0) + (row.businessValidationErrors?.length ?? 0);
                const totalWarnings = fieldsDetail.filter(f => f.status === 'uncertain').length;

                return (
                    <Dialog
                        open={Boolean(selectedRowForErrorDetail)}
                        onClose={() => setSelectedRowForErrorDetail(null)}
                        maxWidth="md"
                        fullWidth
                        PaperProps={{
                            sx: {
                                borderRadius: '16px',
                                overflow: 'hidden',
                                maxHeight: '90vh',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            },
                        }}
                    >
                        <DialogTitle
                            sx={{
                                p: 2,
                                bgcolor: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Stack direction="row" spacing={1.25} alignItems="center">
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '8px',
                                        bgcolor: '#2563eb',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: 800,
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    #{index + 1}
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.2 }}>
                                        Chi tiết nhận diện & kiểm định vé #{index + 1}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Đối chiếu kết quả quét OCR, độ chính xác (%) và tính hợp lệ từng trường
                                    </Typography>
                                </Box>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    size="small"
                                    icon={
                                        totalErrors > 0 ? (
                                            <ErrorOutlineOutlinedIcon sx={{ fontSize: '13px !important' }} />
                                        ) : totalWarnings > 0 ? (
                                            <WarningAmberOutlinedIcon sx={{ fontSize: '13px !important' }} />
                                        ) : (
                                            <CheckCircleIcon sx={{ fontSize: '13px !important' }} />
                                        )
                                    }
                                    label={
                                        totalErrors > 0
                                            ? `${totalErrors} lỗi cần xử lý`
                                            : totalWarnings > 0
                                              ? `${totalWarnings} lưu ý`
                                              : 'Dữ liệu hợp lệ'
                                    }
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: '0.725rem',
                                        height: 26,
                                        borderRadius: '6px',
                                        bgcolor: totalErrors > 0 ? '#fee2e2' : totalWarnings > 0 ? '#fef3c7' : '#dcfce7',
                                        color: totalErrors > 0 ? '#b91c1c' : totalWarnings > 0 ? '#b45309' : '#15803d',
                                        border: '1px solid',
                                        borderColor: totalErrors > 0 ? '#fca5a5' : totalWarnings > 0 ? '#fde68a' : '#bbf7d0',
                                    }}
                                />
                                <IconButton size="small" onClick={() => setSelectedRowForErrorDetail(null)} sx={{ color: '#64748b' }}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </DialogTitle>

                        <DialogContent sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
                            <Stack spacing={2}>
                                {/* Top Ticket Summary Banner */}
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        bgcolor: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        alignItems: 'center',
                                        gap: 2.5,
                                    }}
                                >
                                    {croppedUrl ? (
                                        <Tooltip title="Nhấp để phóng to ảnh vé này" arrow>
                                            <Box
                                                onClick={() =>
                                                    setZoomImage({
                                                        url: croppedUrl,
                                                        title: `Ảnh vé #${index + 1} - ${row.numbers || 'Chưa nhận diện'}`,
                                                        row,
                                                    })
                                                }
                                                sx={{
                                                    position: 'relative',
                                                    width: { xs: '100%', sm: 200 },
                                                    height: 160,
                                                    borderRadius: '8px',
                                                    bgcolor: '#0f172a',
                                                    border: '1.5px solid #cbd5e1',
                                                    cursor: 'pointer',
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                    transition: 'all 0.15s ease',
                                                    '&:hover': {
                                                        borderColor: '#2563eb',
                                                        transform: 'scale(1.02)',
                                                        boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
                                                    },
                                                }}
                                            >
                                                <OcrCroppedTicketOverlay
                                                    imageUrl={croppedUrl}
                                                    row={row}
                                                    selection={selection}
                                                    alt={`Vé #${index + 1}`}
                                                    maxHeight={160}
                                                />
                                            </Box>
                                        </Tooltip>
                                    ) : (
                                        <Box
                                            sx={{
                                                width: { xs: '100%', sm: 130 },
                                                height: 80,
                                                borderRadius: '8px',
                                                bgcolor: '#f1f5f9',
                                                border: '1.5px dashed #cbd5e1',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                gap: 0.5,
                                            }}
                                        >
                                            <ConfirmationNumberOutlinedIcon sx={{ color: '#94a3b8', fontSize: 24 }} />
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                                Không có ảnh cắt
                                            </Typography>
                                        </Box>
                                    )}

                                    <Box sx={{ minWidth: 0, flex: 1, width: '100%' }}>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                                                    Dãy số dự thưởng:
                                                </Typography>
                                                <Typography variant="body1" fontWeight={800} sx={{ fontFamily: 'monospace', color: '#0f172a', letterSpacing: '0.04em' }}>
                                                    {row.numbers || '(Chưa nhận diện)'}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                                                    Số sê-ri vé:
                                                </Typography>
                                                <Typography variant="body1" fontWeight={800} sx={{ fontFamily: 'monospace', color: '#334155' }}>
                                                    {row.serialNumber || '(Chưa nhận diện)'}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                                                    Nhà đài mở thưởng:
                                                </Typography>
                                                <Typography variant="body2" fontWeight={700} sx={{ color: getStationColor(row.stationId) || '#0f172a' }}>
                                                    {row.stationName || '(Chưa chọn đài)'}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                                                    Ngày mở thưởng:
                                                </Typography>
                                                <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                    {row.drawDate ? dayjs(row.drawDate).format('DD/MM/YYYY') : '(Chưa chọn)'}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                                            <Chip
                                                size="small"
                                                icon={<AutoAwesomeOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                                                label={`Độ tin cậy tổng thể OCR: ${formatConfidence(displayConfidence)}`}
                                                sx={{
                                                    fontSize: '0.7rem',
                                                    height: 22,
                                                    fontWeight: 700,
                                                    bgcolor: '#eff6ff',
                                                    color: '#1d4ed8',
                                                    border: '1px solid #bfdbfe',
                                                }}
                                            />
                                            {row.edited && (
                                                <Chip
                                                    size="small"
                                                    icon={<EditOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                                                    label="Đã chỉnh sửa thủ công"
                                                    sx={{
                                                        fontSize: '0.7rem',
                                                        height: 22,
                                                        fontWeight: 700,
                                                        bgcolor: '#f1f5f9',
                                                        color: '#475569',
                                                    }}
                                                />
                                            )}
                                        </Stack>
                                    </Box>
                                </Paper>

                                {/* Global Duplicate Alert */}
                                {row.duplicate && (
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: '10px',
                                            bgcolor: '#fef2f2',
                                            border: '1px solid #fca5a5',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 1.25,
                                        }}
                                    >
                                        <ErrorOutlineOutlinedIcon sx={{ color: '#dc2626', fontSize: 20, mt: 0.15, flexShrink: 0 }} />
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={800} color="#dc2626">
                                                Cảnh báo trùng vé trong hệ thống
                                            </Typography>
                                            <Typography variant="caption" color="#b91c1c" sx={{ lineHeight: 1.4, display: 'block' }}>
                                                Số sê-ri hoặc dãy số của vé này đã tồn tại trong đợt phát hành hoặc đã được nhập kho trước đó. Vui lòng kiểm tra lại vé gốc.
                                            </Typography>
                                        </Box>
                                    </Paper>
                                )}

                                {/* System / Business Validation Errors */}
                                {((row.validationErrors && row.validationErrors.length > 0) ||
                                    (row.businessValidationErrors && row.businessValidationErrors.length > 0)) && (
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: '10px',
                                            bgcolor: '#fef2f2',
                                            border: '1px solid #fecaca',
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={800} color="#dc2626" sx={{ display: 'block', mb: 0.5 }}>
                                            Cảnh báo nhận diện từ hệ thống:
                                        </Typography>
                                        <Stack spacing={0.5}>
                                            {row.businessValidationErrors?.map((err, i) => (
                                                <Typography key={`b-${i}`} variant="caption" color="#b91c1c" sx={{ display: 'block', lineHeight: 1.35 }}>
                                                    • {formatVietnameseErrorMessage(err)}
                                                </Typography>
                                            ))}
                                            {row.validationErrors?.map((err, i) => (
                                                <Typography key={i} variant="caption" color="#b91c1c" sx={{ display: 'block', lineHeight: 1.35 }}>
                                                    • {formatVietnameseErrorMessage(err)}
                                                </Typography>
                                            ))}
                                        </Stack>
                                    </Paper>
                                )}

                                {/* Field-by-Field Breakdown Cards */}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        fontWeight={800}
                                        color="#475569"
                                        sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.25, display: 'block' }}
                                    >
                                        Kiểm tra chi tiết từng trường thông tin ({fieldsDetail.length} trường):
                                    </Typography>
                                    <Stack spacing={1.5}>
                                        {fieldsDetail.map((f) => {
                                            const isFieldInvalid = f.status === 'invalid' || f.status === 'unreadable';
                                            const isFieldWarning = f.status === 'uncertain';
                                            const isFieldCorrected = f.status === 'corrected';
                                            const confStyle = formatFieldConfidenceChip(f.confidence);

                                            return (
                                                <Paper
                                                    key={f.key}
                                                    elevation={0}
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: '12px',
                                                        border: '1.5px solid',
                                                        borderColor: isFieldInvalid
                                                            ? '#fca5a5'
                                                            : isFieldWarning
                                                              ? '#fde68a'
                                                              : isFieldCorrected
                                                                ? '#bae6fd'
                                                                : '#e2e8f0',
                                                        bgcolor: isFieldInvalid
                                                            ? '#fffdfd'
                                                            : isFieldWarning
                                                              ? '#fffdfa'
                                                              : isFieldCorrected
                                                                ? '#f8fafc'
                                                                : '#ffffff',
                                                        transition: 'all 0.15s ease',
                                                        '&:hover': {
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                        },
                                                    }}
                                                >
                                                    {/* Header of Field Card */}
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            flexWrap: 'wrap',
                                                            gap: 1,
                                                            mb: 1.25,
                                                            pb: 1,
                                                            borderBottom: '1px solid #f1f5f9',
                                                        }}
                                                    >
                                                        <Typography variant="subtitle2" fontWeight={800} color="#1e293b" sx={{ fontSize: '0.875rem' }}>
                                                            {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                        </Typography>

                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            {/* Field Confidence Badge */}
                                                            <Chip
                                                                size="small"
                                                                label={confStyle.label}
                                                                sx={{
                                                                    height: 22,
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    bgcolor: confStyle.bg,
                                                                    color: confStyle.color,
                                                                    border: `1px solid ${confStyle.border}`,
                                                                }}
                                                            />

                                                            {/* Validation Status Badge */}
                                                            <Chip
                                                                size="small"
                                                                icon={
                                                                    isFieldInvalid ? (
                                                                        <ErrorOutlineOutlinedIcon sx={{ fontSize: '12px !important', color: '#b91c1c !important' }} />
                                                                    ) : isFieldWarning ? (
                                                                        <WarningAmberOutlinedIcon sx={{ fontSize: '12px !important', color: '#b45309 !important' }} />
                                                                    ) : isFieldCorrected ? (
                                                                        <InfoOutlinedIcon sx={{ fontSize: '12px !important', color: '#0369a1 !important' }} />
                                                                    ) : (
                                                                        <CheckCircleIcon sx={{ fontSize: '12px !important', color: '#15803d !important' }} />
                                                                    )
                                                                }
                                                                label={
                                                                    isFieldInvalid
                                                                        ? (f.status === 'unreadable' ? 'Chưa đọc được' : 'Lỗi dữ liệu')
                                                                        : isFieldWarning
                                                                          ? 'Cần kiểm tra'
                                                                          : isFieldCorrected
                                                                            ? 'Đã sửa tay'
                                                                            : 'Hợp lệ'
                                                                }
                                                                sx={{
                                                                    height: 22,
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    bgcolor: isFieldInvalid
                                                                        ? '#fee2e2'
                                                                        : isFieldWarning
                                                                          ? '#fef3c7'
                                                                          : isFieldCorrected
                                                                            ? '#e0f2fe'
                                                                            : '#dcfce7',
                                                                    color: isFieldInvalid
                                                                        ? '#b91c1c'
                                                                        : isFieldWarning
                                                                          ? '#b45309'
                                                                          : isFieldCorrected
                                                                            ? '#0369a1'
                                                                            : '#15803d',
                                                                    border: '1px solid',
                                                                    borderColor: isFieldInvalid
                                                                        ? '#fca5a5'
                                                                        : isFieldWarning
                                                                          ? '#fde68a'
                                                                          : isFieldCorrected
                                                                            ? '#7dd3fc'
                                                                            : '#bbf7d0',
                                                                }}
                                                            />
                                                        </Stack>
                                                    </Box>

                                                    {/* Values Section: Raw Scanned vs Applied Value */}
                                                    <Box
                                                        sx={{
                                                            display: 'grid',
                                                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                                            gap: 1.5,
                                                            bgcolor: '#f8fafc',
                                                            p: 1.25,
                                                            borderRadius: '8px',
                                                            border: '1px solid #f1f5f9',
                                                            mb: 1.25,
                                                        }}
                                                    >
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}>
                                                                Nội dung OCR quét được:
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontFamily: 'monospace',
                                                                    fontWeight: 700,
                                                                    color: f.scannedValue ? '#0f172a' : '#94a3b8',
                                                                    fontStyle: f.scannedValue ? 'normal' : 'italic',
                                                                }}
                                                            >
                                                                {f.scannedValue || '(Không nhận diện được)'}
                                                            </Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600 }}>
                                                                Giá trị áp dụng hiện tại:
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontFamily: 'monospace',
                                                                    fontWeight: 800,
                                                                    color: isFieldInvalid ? '#dc2626' : '#2563eb',
                                                                }}
                                                            >
                                                                {f.currentValue}
                                                            </Typography>
                                                        </Box>
                                                    </Box>

                                                    {/* Error / Validation Detail Message */}
                                                    {f.message ? (
                                                        <Box
                                                            sx={{
                                                                p: 1,
                                                                borderRadius: '6px',
                                                                bgcolor: isFieldInvalid ? '#fef2f2' : '#fffbeb',
                                                                border: '1px solid',
                                                                borderColor: isFieldInvalid ? '#fecaca' : '#fef08a',
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: 1,
                                                            }}
                                                        >
                                                            {isFieldInvalid ? (
                                                                <ErrorOutlineOutlinedIcon sx={{ color: '#dc2626', fontSize: 16, mt: 0.2, flexShrink: 0 }} />
                                                            ) : (
                                                                <WarningAmberOutlinedIcon sx={{ color: '#d97706', fontSize: 16, mt: 0.2, flexShrink: 0 }} />
                                                            )}
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: isFieldInvalid ? '#b91c1c' : '#b45309',
                                                                    fontWeight: 600,
                                                                    lineHeight: 1.4,
                                                                }}
                                                            >
                                                                {f.message}
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5 }}>
                                                            <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 15 }} />
                                                            <Typography variant="caption" color="#15803d" fontWeight={600}>
                                                                Dữ liệu hợp lệ và khớp với cấu hình hệ thống.
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                </Box>
                            </Stack>
                        </DialogContent>

                        <DialogActions
                            sx={{
                                px: 2.5,
                                py: 1.5,
                                bgcolor: '#f8fafc',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                💡 Gợi ý: Bạn có thể trực tiếp chỉnh sửa các thông tin chưa chính xác ngay tại bảng danh sách vé.
                            </Typography>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={() => setSelectedRowForErrorDetail(null)}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    bgcolor: '#2563eb',
                                    px: 2.5,
                                    py: 0.75,
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                Đã hiểu / Đóng
                            </Button>
                        </DialogActions>
                    </Dialog>
                );
            })()}
        </>
    );
}
