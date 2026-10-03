'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import {
    Box,
    Button,
    Chip,
    Collapse,
    Divider,
    IconButton,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { confirmDelete } from '@/admin/utils/swal';
import { useStations } from '@/admin/features/station/hooks/useStation';
import { useDeleteImportBatchLine, usePauseImportBatchLine } from '../../hooks/useImportBatch';
import type { ImportBatch, ImportBatchLine } from '../../types/importBatch.type';
import {
    getImportBatchLineStatusChipColor,
    getImportBatchLineStatusLabel,
} from '../../utils/batchTypeLabels';
import {
    canDeleteImportBatchLine,
    canPauseImportBatchLine,
} from '../../utils/importBatchDeletion';

type Props = {
    batch: Pick<ImportBatch, 'id' | 'lines'> & { supplierName?: string; drawDate?: string };
    onChanged?: () => void | Promise<void>;
};

const getErrorMessage = (error: unknown, fallback: string) =>
    (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data
        ?.message ||
    (error as { message?: string })?.message ||
    fallback;

export const ImportBatchReceptionLineSummary = ({ batch, onChanged }: Props) => {
    const [expanded, setExpanded] = useState(false);
    const pauseMutation = usePauseImportBatchLine();
    const deleteMutation = useDeleteImportBatchLine();
    const lines = (batch.lines ?? []).filter((line) => line.status !== 'CANCELLED');

    const { data: stationsData } = useStations({ size: 100 });
    const stations = stationsData?.data?.recordList || [];

    const stationMap = useMemo(() => {
        const map = new Map<number, string>();
        stations.forEach((s) => {
            const id = s.id ?? (typeof s._id === 'number' ? s._id : Number(s._id));
            if (id != null && !isNaN(id)) {
                map.set(id, s.name);
            }
        });
        return map;
    }, [stations]);

    const getStationName = (line: ImportBatchLine) => {
        if (line.lotteryStationName) return line.lotteryStationName;
        if (line.stationName) return line.stationName;
        const nameFromMap =
            stationMap.get(line.lotteryStationId) ||
            stationMap.get(Number(line.lotteryStationId));
        if (nameFromMap) return nameFromMap;

        // Fallback parsing from batchCode e.g. LO-20261002-BINHDUONG-NEW-4107
        if (line.batchCode) {
            const parts = line.batchCode.split('-');
            if (parts.length >= 3) {
                const rawCode = parts[2].toUpperCase();
                const matched = stations.find(
                    (s) =>
                        (s.code && s.code.toUpperCase() === rawCode) ||
                        (s.name && s.name.toUpperCase().replace(/\s+/g, '').includes(rawCode))
                );
                if (matched) return matched.name;
            }
        }

        return `Đài số ${line.lotteryStationId}`;
    };

    const completedLinesCount = useMemo(() => {
        return lines.filter((line) => {
            const declared = Number(line.declareQuantity) || 0;
            const imported = Number(line.totalQuantity) || 0;
            return line.status === 'IMPORTED' || (declared > 0 && imported >= declared);
        }).length;
    }, [lines]);

    const refresh = async () => {
        await onChanged?.();
    };

    const handlePause = async (lineId: number) => {
        try {
            await pauseMutation.mutateAsync({ batchId: batch.id, lineId });
            toast.success('Đã tạm dừng dòng nhập vé.');
            await refresh();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Không thể tạm dừng dòng nhập vé.'));
        }
    };

    const handleDelete = (lineId: number) => {
        confirmDelete(
            'Bạn có chắc muốn xóa dòng phiếu nhập lô này? Dữ liệu vé chưa hoàn tất của dòng sẽ bị xóa.',
            async () => {
                try {
                    await deleteMutation.mutateAsync({ batchId: batch.id, lineId });
                    toast.success('Đã xóa dòng phiếu nhập lô.');
                    await refresh();
                } catch (error) {
                    toast.error(getErrorMessage(error, 'Không thể xóa dòng phiếu nhập lô.'));
                }
            }
        );
    };

    if (lines.length === 0) {
        return null;
    }

    return (
        <Box onClick={(event) => event.stopPropagation()} sx={{ width: '100%', mt: 1 }}>
            <Divider sx={{ my: 1, borderColor: 'var(--palette-divider, #e2e8f0)' }} />

            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{ py: 0.25 }}
            >
                <Button
                    size="small"
                    color="inherit"
                    startIcon={
                        <Icon
                            icon="solar:checklist-minimalistic-bold-duotone"
                            width={18}
                            style={{ color: expanded ? 'var(--palette-primary-main, #0284c7)' : '#64748b' }}
                        />
                    }
                    endIcon={
                        <ExpandMoreIcon
                            sx={{
                                fontSize: '1.25rem',
                                transform: expanded ? 'rotate(180deg)' : 'none',
                                transition: 'transform .2s ease',
                                color: expanded ? 'var(--palette-primary-main, #0284c7)' : '#64748b',
                            }}
                        />
                    }
                    onClick={() => setExpanded((value) => !value)}
                    sx={{
                        textTransform: 'none',
                        color: expanded ? 'var(--palette-primary-main, #0284c7)' : '#334155',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        px: 1,
                        py: 0.5,
                        borderRadius: '8px',
                        '&:hover': {
                            bgcolor: 'rgba(2, 132, 199, 0.08)',
                        },
                    }}
                >
                    {expanded ? 'Ẩn chi tiết dòng phiếu' : `Xem chi tiết ${lines.length} dòng phiếu`}
                </Button>

                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        size="small"
                        variant="outlined"
                        label={`Đã nhập đủ ${completedLinesCount}/${lines.length} đài`}
                        color={completedLinesCount === lines.length ? 'success' : 'default'}
                        sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            bgcolor:
                                completedLinesCount === lines.length
                                    ? 'var(--palette-success-lighter, #dcfce7)'
                                    : 'var(--palette-grey-100, #f1f5f9)',
                            borderColor:
                                completedLinesCount === lines.length
                                    ? 'var(--palette-success-light, #86efac)'
                                    : 'divider',
                            color:
                                completedLinesCount === lines.length
                                    ? 'var(--palette-success-dark, #15803d)'
                                    : 'text.secondary',
                        }}
                    />
                </Stack>
            </Stack>

            <Collapse in={expanded} unmountOnExit>
                <Stack
                    spacing={1.25}
                    sx={{
                        mt: 1.25,
                        p: 1.5,
                        borderRadius: '12px',
                        bgcolor: 'var(--palette-background-neutral, #f8fafc)',
                        border: '1px solid',
                        borderColor: 'var(--palette-divider, #e2e8f0)',
                    }}
                >
                    {lines.map((line) => {
                        const busy =
                            (pauseMutation.isPending && pauseMutation.variables?.lineId === line.id) ||
                            (deleteMutation.isPending && deleteMutation.variables?.lineId === line.id);

                        const declaredQty = Number(line.declareQuantity) || 0;
                        const importedQty = Number(line.totalQuantity) || 0;
                        const percent =
                            declaredQty > 0
                                ? Math.min(100, Math.round((importedQty / declaredQty) * 100))
                                : importedQty > 0
                                ? 100
                                : 0;
                        const isCompleted =
                            line.status === 'IMPORTED' || (declaredQty > 0 && importedQty >= declaredQty);
                        const isImporting = line.status === 'IMPORTING' || (importedQty > 0 && !isCompleted);
                        const stationDisplayName = getStationName(line);

                        return (
                            <Box
                                key={line.id}
                                sx={{
                                    p: 1.5,
                                    border: '1px solid',
                                    borderColor: isCompleted
                                        ? 'rgba(34, 197, 94, 0.3)'
                                        : 'var(--palette-divider, #e2e8f0)',
                                    borderRadius: '10px',
                                    bgcolor: '#ffffff',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                        borderColor: isCompleted
                                            ? 'var(--palette-success-main, #22c55e)'
                                            : 'var(--palette-primary-main, #0284c7)',
                                        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.06)',
                                    },
                                }}
                            >
                                {/* Top Row: Station Name, Code & Badges */}
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    justifyContent="space-between"
                                    spacing={1}
                                    sx={{ mb: 1.25 }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: isCompleted
                                                    ? 'var(--palette-success-lighter, #dcfce7)'
                                                    : 'var(--palette-primary-lighter, #eff6ff)',
                                                color: isCompleted
                                                    ? 'var(--palette-success-dark, #15803d)'
                                                    : 'var(--palette-primary-dark, #1d4ed8)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Icon icon="solar:buildings-2-bold-duotone" width={18} />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 800,
                                                    fontSize: '0.9375rem',
                                                    color: 'var(--palette-text-primary, #1e293b)',
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                Đài {stationDisplayName}
                                            </Typography>
                                            {line.batchCode && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.725rem',
                                                        color: 'var(--palette-text-secondary, #64748b)',
                                                        fontWeight: 600,
                                                        display: 'block',
                                                    }}
                                                >
                                                    {line.batchCode}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Stack>

                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                                        <Chip
                                            size="small"
                                            label={
                                                isCompleted
                                                    ? 'Đã đủ'
                                                    : isImporting
                                                    ? 'Đang nhập'
                                                    : getImportBatchLineStatusLabel(line.status)
                                            }
                                            color={getImportBatchLineStatusChipColor(line.status)}
                                            variant={isCompleted ? 'filled' : 'outlined'}
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                height: 24,
                                                ...(isCompleted && {
                                                    bgcolor: 'var(--palette-success-lighter, #dcfce7)',
                                                    color: 'var(--palette-success-dark, #15803d)',
                                                    border: '1px solid var(--palette-success-light, #86efac)',
                                                }),
                                            }}
                                        />

                                        {canPauseImportBatchLine(line) && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="warning"
                                                startIcon={<PauseCircleOutlineIcon sx={{ fontSize: 16 }} />}
                                                disabled={busy}
                                                onClick={() => handlePause(line.id)}
                                                sx={{
                                                    textTransform: 'none',
                                                    whiteSpace: 'nowrap',
                                                    height: 24,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    px: 1,
                                                    borderRadius: '6px',
                                                }}
                                            >
                                                Tạm dừng
                                            </Button>
                                        )}

                                        {canDeleteImportBatchLine(line) && (
                                            <Tooltip
                                                title={
                                                    lines.length <= 1
                                                        ? 'Dòng cuối cùng: hãy xóa cả phiếu nhập lô.'
                                                        : 'Xóa dòng phiếu'
                                                }
                                            >
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        disabled={busy || lines.length <= 1}
                                                        onClick={() => handleDelete(line.id)}
                                                        sx={{
                                                            width: 26,
                                                            height: 26,
                                                            borderRadius: '6px',
                                                            bgcolor: 'var(--palette-error-lighter, #fee2e2)',
                                                            color: 'var(--palette-error-main, #ef4444)',
                                                            '&:hover': {
                                                                bgcolor: 'var(--palette-error-main, #ef4444)',
                                                                color: '#ffffff',
                                                            },
                                                        }}
                                                    >
                                                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                </Stack>

                                {/* Bottom Section: Progress Bar & Quantity Details */}
                                <Box
                                    sx={{
                                        p: 1.25,
                                        borderRadius: '8px',
                                        bgcolor: isCompleted
                                            ? 'rgba(34, 197, 94, 0.04)'
                                            : 'var(--palette-background-neutral, #f8fafc)',
                                        border: '1px solid',
                                        borderColor: isCompleted
                                            ? 'rgba(34, 197, 94, 0.18)'
                                            : 'var(--palette-divider, #e2e8f0)',
                                    }}
                                >
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        spacing={1}
                                        sx={{ mb: 0.75 }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'var(--palette-text-secondary, #64748b)',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Đã nhập:{' '}
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: isCompleted
                                                    ? 'var(--palette-success-dark, #15803d)'
                                                    : percent > 0
                                                    ? 'var(--palette-primary-main, #0284c7)'
                                                    : 'var(--palette-text-primary, #1e293b)',
                                                        fontSize: '0.875rem',
                                                    }}
                                                >
                                                    {importedQty.toLocaleString('vi-VN')}
                                                </Box>{' '}
                                                / {declaredQty.toLocaleString('vi-VN')} vé
                                            </Typography>

                                            {declaredQty > importedQty && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: 'var(--palette-warning-dark, #b45309)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    (Cần nhập: {(declaredQty - importedQty).toLocaleString('vi-VN')} vé)
                                                </Typography>
                                            )}
                                        </Stack>

                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: '0.8125rem',
                                                color: isCompleted
                                                    ? 'var(--palette-success-dark, #15803d)'
                                                    : percent > 0
                                                    ? 'var(--palette-primary-main, #0284c7)'
                                                    : 'var(--palette-text-secondary, #64748b)',
                                            }}
                                        >
                                            {percent}%
                                        </Typography>
                                    </Stack>

                                    <LinearProgress
                                        variant="determinate"
                                        value={percent}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            bgcolor: 'var(--palette-grey-200, #e2e8f0)',
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 3,
                                                bgcolor: isCompleted
                                                    ? 'var(--palette-success-main, #22c55e)'
                                                    : percent > 0
                                                    ? 'var(--palette-primary-main, #0284c7)'
                                                    : 'var(--palette-grey-400, #94a3b8)',
                                            },
                                        }}
                                    />
                                </Box>
                            </Box>
                        );
                    })}
                </Stack>
            </Collapse>
        </Box>
    );
};
