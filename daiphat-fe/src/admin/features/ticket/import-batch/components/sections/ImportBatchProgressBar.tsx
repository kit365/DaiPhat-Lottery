"use client";

import { Box, Chip, Grid, Paper, Stack, Tooltip, Typography } from '@mui/material';
import type { ImportBatch } from '../../types/importBatch.type';
import {
    buildImportBatchProgressSegments,
    formatImportProgressPercent,
    getImportBatchProgress,
} from '../../utils/importBatchProgress';
import { formatImportBatchLineCancelReason } from '../../utils/batchTypeLabels';
import { formatImportProgressCountTooltip } from './TicketImportProgressTrack';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';

type ImportBatchProgressBarProps = {
    batch: ImportBatch;
    resolveStationName?: (stationId: number) => string;
    hideTitle?: boolean;
    showStationLegend?: boolean;
};

const formatTicketCount = (value: number) => `${value.toLocaleString('vi-VN')} vé`;

export const ImportBatchProgressBar = ({
    batch,
    resolveStationName,
    hideTitle = false,
    showStationLegend = true,
}: ImportBatchProgressBarProps) => {
    const overall = getImportBatchProgress(batch);
    const segments = buildImportBatchProgressSegments(batch, resolveStationName);
    const totalDeclared = segments.reduce((sum, segment) => sum + segment.declared, 0);

    if (segments.length === 0 || totalDeclared <= 0) {
        return null;
    }

    const showOverallPercent = overall.percent > 0 && !hideTitle;
    const isCompleted = overall.percent >= 100;

    return (
        <Box sx={{ mt: hideTitle ? 0 : 0.5 }}>
            {/* Header with Title & Overall Stats */}
            {!hideTitle && (
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                    sx={{ mb: 1.5 }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.95rem' }}>
                            Tiến độ nhập vé tổng thể
                        </Typography>
                        <Chip
                            size="small"
                            label={overall.percentLabel}
                            sx={{
                                fontWeight: 800,
                                height: 22,
                                fontSize: '0.75rem',
                                bgcolor: isCompleted ? '#dcfce7' : '#eff6ff',
                                color: isCompleted ? '#15803d' : '#2563eb',
                                border: `1px solid ${isCompleted ? '#bbf7d0' : '#bfdbfe'}`,
                            }}
                        />
                    </Stack>

                    <Typography variant="body2" color="#64748b" sx={{ whiteSpace: 'nowrap' }}>
                        Tổng cộng:{' '}
                        <Box component="span" fontWeight={800} color="#0f172a">
                            {formatTicketCount(overall.imported)}
                        </Box>
                        {' / '}
                        <Box component="span" fontWeight={600} color="#64748b">
                            {formatTicketCount(overall.declared)}
                        </Box>
                    </Typography>
                </Stack>
            )}

            {/* Segmented Progress Bar */}
            <Tooltip arrow placement="top" title={formatImportProgressCountTooltip(overall.imported, overall.declared)}>
                <Box
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Number(overall.percent.toFixed(1))}
                    aria-label={`Tiến độ nhập vé tổng thể ${overall.percentLabel}`}
                    sx={{
                        position: 'relative',
                        width: '100%',
                        height: 24,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#f1f5f9',
                        cursor: 'default',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            width: '100%',
                            height: '100%',
                        }}
                    >
                        {segments.map((segment) => {
                            const segmentShare =
                                totalDeclared > 0 ? (segment.declared / totalDeclared) * 100 : 0;

                            return (
                                <Tooltip
                                    key={segment.lineId}
                                    arrow
                                    placement="top"
                                    title={
                                        <Stack spacing={0.25} sx={{ py: 0.25 }}>
                                            <Typography variant="caption" fontWeight={800}>
                                                {segment.stationName}
                                            </Typography>
                                            <Typography variant="caption" display="block">
                                                Đã nhập: {segment.imported.toLocaleString('vi-VN')} / {segment.declared.toLocaleString('vi-VN')} vé
                                            </Typography>
                                            <Typography variant="caption" display="block">
                                                Tỷ lệ hoàn thành:{' '}
                                                {formatImportProgressPercent(
                                                    segment.imported,
                                                    segment.declared
                                                )}
                                            </Typography>
                                            <Typography variant="caption" display="block">
                                                Trạng thái: {segment.statusLabel}
                                            </Typography>
                                            {segment.cancelReason && (
                                                <Typography variant="caption" display="block" color="#fca5a5">
                                                    {formatImportBatchLineCancelReason(segment.cancelReason)}
                                                </Typography>
                                            )}
                                        </Stack>
                                    }
                                >
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            flexGrow: segment.declared,
                                            flexBasis: 0,
                                            minWidth: segmentShare >= 3 ? 8 : 4,
                                            height: '100%',
                                            bgcolor: segment.trackColor,
                                            borderRight: '1.5px solid #ffffff',
                                            '&:last-of-type': { borderRight: 'none' },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: `${segment.percent}%`,
                                                bgcolor: segment.color,
                                                transition: 'width 0.3s ease',
                                            }}
                                        />
                                    </Box>
                                </Tooltip>
                            );
                        })}
                    </Box>

                    {showOverallPercent && (
                        <Typography
                            component="span"
                            variant="caption"
                            sx={{
                                position: 'absolute',
                                right: 10,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                lineHeight: 1,
                                color: isCompleted ? '#ffffff' : '#0f172a',
                                textShadow: isCompleted ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                                zIndex: 1,
                            }}
                        >
                            {overall.percentLabel}
                        </Typography>
                    )}
                </Box>
            </Tooltip>

            {/* Station Breakdown Legend Badges */}
            {showStationLegend && segments.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Grid container spacing={1.5}>
                        {segments.map((segment) => {
                            const isLineDone = segment.imported >= segment.declared && segment.declared > 0;
                            return (
                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={segment.lineId}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 1.5,
                                            borderRadius: '10px',
                                            bgcolor: '#f8fafc',
                                            borderColor: '#e2e8f0',
                                            borderLeft: `4px solid ${segment.color}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                            '&:hover': {
                                                bgcolor: '#ffffff',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                            },
                                        }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    bgcolor: segment.color,
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                {segment.stationName}
                                            </Typography>
                                        </Stack>

                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="caption" fontWeight={700} color={isLineDone ? '#16a34a' : '#ea580c'}>
                                                {segment.imported.toLocaleString('vi-VN')} / {segment.declared.toLocaleString('vi-VN')} vé
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={formatImportProgressPercent(segment.imported, segment.declared)}
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    bgcolor: isLineDone ? '#dcfce7' : '#ffedd5',
                                                    color: isLineDone ? '#15803d' : '#c2410c',
                                                }}
                                            />
                                        </Stack>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            )}
        </Box>
    );
};
