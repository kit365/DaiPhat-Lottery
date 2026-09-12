'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
    Box,
    Checkbox,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
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
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInOutlinedIcon from '@mui/icons-material/ZoomInOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import dayjs from 'dayjs';
import type { OcrReviewRow } from '../types/ticketOcr.type';
import {
    canConfirmReviewRow,
    evaluateOcrFieldUiStatus,
    formatConfidence,
    type OcrRowValidationContext,
} from '../utils/ocrImportHelpers';
import type { OcrFieldSelection } from './OcrReviewImagePane';
import { getStationColor } from '../../../station/utils/stationColor';

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
    onSelect: (selection: OcrFieldSelection) => void;
    onToggle: (key: string, checked: boolean) => void;
    onUpdate: (key: string, patch: Partial<OcrReviewRow>) => void;
    /** When true, omit outer spacing wrapper (used inside per-image groups). */
    embedded?: boolean;
};

const resolveCroppedImageUrl = (row: OcrReviewRow): string | null => {
    if (row.croppedImageUrl && row.croppedImageUrl.trim()) {
        return row.croppedImageUrl;
    }
    if (row.croppedImageBase64 && row.croppedImageBase64.trim()) {
        return row.croppedImageBase64.startsWith('data:')
            ? row.croppedImageBase64
            : `data:image/jpeg;base64,${row.croppedImageBase64}`;
    }
    return null;
};

export default function OcrReviewResultCards({
    rows,
    selection,
    stations = [],
    stationsForRow,
    validationContextForRow,
    onSelect,
    onToggle,
    onUpdate,
}: Props) {
    const [zoomImage, setZoomImage] = useState<{ url: string; title: string; row: OcrReviewRow } | null>(null);
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
            if (confirmable || r.edited || !checked) {
                onToggle(r.key, checked);
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
                            px: 0.85,
                            fontSize: '0.8125rem',
                            borderColor: '#f1f5f9',
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
                                    px: 0.85,
                                    borderBottom: '1.5px solid #e2e8f0',
                                    whiteSpace: 'nowrap',
                                },
                            }}
                        >
                            <TableCell align="center" sx={{ width: 56 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
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
                            <TableCell align="center" sx={{ width: 72 }}>
                                Ảnh cắt
                            </TableCell>
                            <TableCell sx={{ minWidth: 100 }}>
                                Dãy số <span style={{ color: '#ef4444' }}>*</span>
                            </TableCell>
                            <TableCell sx={{ minWidth: 90 }}>
                                Số sê-ri <span style={{ color: '#ef4444' }}>*</span>
                            </TableCell>
                            <TableCell sx={{ minWidth: 135 }}>
                                Nhà đài <span style={{ color: '#ef4444' }}>*</span>
                            </TableCell>
                            <TableCell sx={{ minWidth: 115 }}>
                                Ngày quay <span style={{ color: '#ef4444' }}>*</span>
                            </TableCell>
                            <TableCell sx={{ width: 75 }}>
                                Ký hiệu / Lô
                            </TableCell>
                            <TableCell sx={{ width: 85 }}>
                                Mệnh giá
                            </TableCell>
                            <TableCell align="center" sx={{ width: 95 }}>
                                Trạng thái
                            </TableCell>
                            <TableCell align="center" sx={{ width: 36 }}>
                                Xem
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
                            const priceStatus = evaluateOcrFieldUiStatus(row, 'ticketType', ctx);

                            const missingStation = row.stationId == null;
                            const displayConfidence =
                                row.adjustedConfidence != null ? row.adjustedConfidence : row.confidence;

                            const isError =
                                row.status === 'FAILED' ||
                                row.overallValidationStatus === 'INVALID' ||
                                row.duplicate;

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
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                            <Checkbox
                                                size="small"
                                                checked={row.selected}
                                                disabled={!confirmable && !row.edited}
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
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="center">
                                        {croppedUrl ? (
                                            <Box
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setZoomImage({
                                                        url: croppedUrl,
                                                        title: `Vé #${index + 1} - ${row.numbers || 'Chưa nhận diện'}`,
                                                        row,
                                                    });
                                                }}
                                                sx={{
                                                    position: 'relative',
                                                    width: 64,
                                                    height: 36,
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
                                                        transform: 'scale(1.06)',
                                                        borderColor: '#2563eb',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.16)',
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
                                                    <ZoomInOutlinedIcon sx={{ color: '#ffffff', fontSize: 16 }} />
                                                </Box>
                                            </Box>
                                        ) : (
                                            <Tooltip title="Không có ảnh cắt riêng cho vé này" arrow>
                                                <Box
                                                    sx={{
                                                        width: 64,
                                                        height: 36,
                                                        borderRadius: '6px',
                                                        border: '1px dashed #cbd5e1',
                                                        bgcolor: '#f8fafc',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        mx: 'auto',
                                                    }}
                                                >
                                                    <ConfirmationNumberOutlinedIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                                </Box>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Box onClick={(e) => e.stopPropagation()}>
                                            <Box
                                                component="input"
                                                type="text"
                                                value={row.numbers}
                                                placeholder="VD: 433299"
                                                onFocus={() => onSelect({ rowKey: row.key, fieldName: 'numbers' })}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    onUpdate(row.key, { numbers: e.target.value })
                                                }
                                                sx={{
                                                    width: '100%',
                                                    height: 32,
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
                                                              : '#e2e8f0',
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
                                            {numbersStatus.message && (
                                                <Typography
                                                    variant="caption"
                                                    color="error.main"
                                                    sx={{ fontSize: '0.65rem', display: 'block', mt: 0.25, lineHeight: 1.1 }}
                                                >
                                                    {numbersStatus.message}
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box onClick={(e) => e.stopPropagation()}>
                                            <Box
                                                component="input"
                                                type="text"
                                                value={row.serialNumber}
                                                placeholder="VD: 433299H"
                                                onFocus={() => onSelect({ rowKey: row.key, fieldName: 'serialNumber' })}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    onUpdate(row.key, { serialNumber: e.target.value })
                                                }
                                                sx={{
                                                    width: '100%',
                                                    height: 32,
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
                                                              : '#e2e8f0',
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
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box onClick={(e) => e.stopPropagation()}>
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
                                                    bgcolor: '#ffffff',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    '& .MuiSelect-select': {
                                                        py: '4px',
                                                        px: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    },
                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: missingStation ? '#f87171' : '#e2e8f0',
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
                                            {missingStation && (
                                                <Typography
                                                    variant="caption"
                                                    color="error.main"
                                                    sx={{ fontSize: '0.65rem', display: 'block', mt: 0.25, lineHeight: 1.1 }}
                                                >
                                                    Chưa chọn đài
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box onClick={(e) => e.stopPropagation()}>
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
                                                              : '#e2e8f0',
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
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box onClick={(e) => e.stopPropagation()}>
                                            <Box
                                                component="input"
                                                type="text"
                                                value={row.batchCode ?? ''}
                                                placeholder="08D"
                                                onFocus={() => onSelect({ rowKey: row.key, fieldName: 'batchCode' })}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    onUpdate(row.key, { batchCode: e.target.value })
                                                }
                                                sx={{
                                                    width: '100%',
                                                    height: 32,
                                                    px: 0.75,
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    color: '#334155',
                                                    bgcolor: '#ffffff',
                                                    border: '1px solid',
                                                    borderColor: isSelectedRow ? '#93c5fd' : '#e2e8f0',
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
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box onClick={(e) => e.stopPropagation()}>
                                            <Box
                                                component="input"
                                                type="text"
                                                value={row.ticketType ?? ''}
                                                placeholder="10.000đ"
                                                onFocus={() => onSelect({ rowKey: row.key, fieldName: 'ticketType' })}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    onUpdate(row.key, { ticketType: e.target.value })
                                                }
                                                sx={{
                                                    width: '100%',
                                                    height: 32,
                                                    px: 0.75,
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    color: priceStatus.status === 'invalid' ? '#dc2626' : '#334155',
                                                    bgcolor: priceStatus.status === 'invalid' ? '#fef2f2' : '#ffffff',
                                                    border: '1px solid',
                                                    borderColor:
                                                        priceStatus.status === 'invalid'
                                                            ? '#f87171'
                                                            : isSelectedRow
                                                              ? '#93c5fd'
                                                              : '#e2e8f0',
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
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
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
                                                            • Cảnh báo: Trùng dãy số & đài với vé đã có trong hệ thống
                                                        </Typography>
                                                    )}
                                                    {row.validationErrors?.map((err, i) => (
                                                        <Typography key={i} variant="caption" color="#fca5a5" sx={{ display: 'block' }}>
                                                            • {err}
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
                                    </TableCell>
                                    <TableCell align="center">
                                        {croppedUrl && (
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setZoomImage({
                                                        url: croppedUrl,
                                                        title: `Vé #${index + 1} - ${row.numbers || 'Chưa nhận diện'}`,
                                                        row,
                                                    });
                                                }}
                                                sx={{
                                                    p: 0.5,
                                                    color: '#64748b',
                                                    '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' },
                                                }}
                                                title="Xem ảnh vé phóng to"
                                            >
                                                <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

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
                        <Box
                            component="img"
                            src={zoomImage.url}
                            alt={zoomImage.title}
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '70vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                mx: 'auto',
                                display: 'block',
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
