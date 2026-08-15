"use client";

import { Box, Button, Chip, Collapse, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ROUTES } from '../../../../../constants/routes';
import { AdminStatusBadge } from '../../../../../components/ui/AdminStatusBadge';
import type { ReturnBatch } from '../../types/returnBatch.type';
import {
    formatMinutesUntilCutoff,
    getReturnBatchStatusBadgeClass,
    getReturnBatchStatusLabel,
} from '../../utils/returnBatchLabels';

interface ReturnBatchReminderBannerProps {
    batches: ReturnBatch[];
}

interface BatchTimingInfo {
    batch: ReturnBatch;
    windowStartStr: string;
    cutOffTimeStr: string;
    bufferMin: number;
    reminderMin: number;
    minutesUntilCutoff: number | null;
    isExpired: boolean;
    isUrgent: boolean;
    isInWindow: boolean;
}

export const ReturnBatchReminderBanner = ({ batches }: ReturnBatchReminderBannerProps) => {
    const router = useRouter();
    const [dismissed, setDismissed] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [nowTick, setNowTick] = useState<number>(() => Date.now());

    // Refresh timing every 30 seconds for live countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setNowTick(Date.now());
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const categorizedBatches = useMemo(() => {
        const now = dayjs(nowTick);

        const activeBatches = (batches || []).filter(
            (b) => b.status !== 'HANDED_OVER' && b.status !== 'CANCELLED'
        );

        const timingList: BatchTimingInfo[] = activeBatches.map((batch) => {
            const cutOffTimeStr = batch.returnCutOffTime || '';
            const drawDateStr = batch.drawDate || '';
            const bufferMin = batch.returnBufferMinutes ?? 30;
            const reminderMin = batch.returnReminderMinutes ?? 15;

            if (!cutOffTimeStr || !drawDateStr) {
                return {
                    batch,
                    windowStartStr: '—',
                    cutOffTimeStr: cutOffTimeStr || '—',
                    bufferMin,
                    reminderMin,
                    minutesUntilCutoff: batch.minutesUntilCutoff ?? null,
                    isExpired: Boolean(batch.inspectionExpired),
                    isUrgent: Boolean(batch.urgentReminder),
                    isInWindow: Boolean(batch.inInspectionWindow),
                };
            }

            const [hStr, mStr] = cutOffTimeStr.split(':');
            const h = parseInt(hStr, 10) || 0;
            const m = parseInt(mStr, 10) || 0;

            const cutOffDateTime = dayjs(drawDateStr).hour(h).minute(m).second(0).millisecond(0);
            const windowStartDateTime = cutOffDateTime.subtract(bufferMin, 'minute');
            const urgentStartDateTime = cutOffDateTime.subtract(reminderMin, 'minute');

            const isToday = now.format('YYYY-MM-DD') === dayjs(drawDateStr).format('YYYY-MM-DD');
            const isPastDrawDate = now.format('YYYY-MM-DD') > dayjs(drawDateStr).format('YYYY-MM-DD');

            const isExpired =
                batch.inspectionExpired ??
                (isPastDrawDate || (isToday && now.isAfter(cutOffDateTime)));

            const isUrgent =
                !isExpired &&
                (batch.urgentReminder ??
                    (isToday && now.isAfter(urgentStartDateTime) && now.isBefore(cutOffDateTime)));

            const isInWindow =
                !isExpired &&
                (batch.inInspectionWindow ??
                    (isToday && now.isAfter(windowStartDateTime) && now.isBefore(cutOffDateTime)));

            const diffMinutes = Math.round(cutOffDateTime.diff(now, 'minute', true));
            const minutesUntilCutoff = isExpired ? 0 : Math.max(0, diffMinutes);

            return {
                batch,
                windowStartStr: windowStartDateTime.format('HH:mm'),
                cutOffTimeStr: cutOffDateTime.format('HH:mm'),
                bufferMin,
                reminderMin,
                minutesUntilCutoff,
                isExpired,
                isUrgent,
                isInWindow,
            };
        });

        const urgent = timingList.filter((item) => item.isUrgent && !item.isExpired);
        const windowOnly = timingList.filter((item) => item.isInWindow && !item.isUrgent && !item.isExpired);
        const expired = timingList.filter((item) => item.isExpired);

        return { urgent, windowOnly, expired };
    }, [batches, nowTick]);

    const { urgent, windowOnly, expired } = categorizedBatches;

    if (dismissed || (urgent.length === 0 && windowOnly.length === 0 && expired.length === 0)) {
        return null;
    }

    const renderBatchRow = (item: BatchTimingInfo, variant: 'urgent' | 'window' | 'expired') => {
        const { batch, windowStartStr, cutOffTimeStr, bufferMin, minutesUntilCutoff } = item;
        const batchCode = batch.batchCode || `#${batch.id}`;
        const supplierName = batch.supplierName || 'Nhà cung cấp';
        const totalQty = batch.totalQuantity ?? 0;

        return (
            <Paper
                key={batch.id}
                elevation={0}
                sx={{
                    p: 1.5,
                    px: 2,
                    borderRadius: '12px',
                    bgcolor: '#ffffff',
                    border: '1px solid',
                    borderColor:
                        variant === 'urgent'
                            ? '#fecdd3'
                            : variant === 'expired'
                              ? '#fecdd3'
                              : '#fed7aa',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.06)',
                        borderColor: variant === 'expired' ? '#fb7185' : '#cbd5e1',
                    },
                }}
            >
                <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', lg: 'center' }}
                    spacing={1.5}
                >
                    {/* Left: Info */}
                    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip
                            size="small"
                            label={batchCode}
                            sx={{
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                bgcolor: '#0f172a',
                                color: '#ffffff',
                                fontSize: '0.8rem',
                                height: 26,
                                borderRadius: '6px',
                            }}
                        />

                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                            {supplierName}
                        </Typography>

                        <Chip
                            size="small"
                            icon={<ConfirmationNumberOutlinedIcon sx={{ fontSize: '13px !important', color: '#64748b !important' }} />}
                            label={`${totalQty.toLocaleString('vi-VN')} vé`}
                            sx={{
                                fontWeight: 700,
                                bgcolor: '#f1f5f9',
                                color: '#334155',
                                height: 24,
                                fontSize: '0.75rem',
                                borderRadius: '6px',
                            }}
                        />

                        <AdminStatusBadge
                            label={getReturnBatchStatusLabel(batch.status, batch.statusLabel)}
                            modifier={getReturnBatchStatusBadgeClass(batch.status)}
                        />
                    </Stack>

                    {/* Middle: Timing Breakdown */}
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Tooltip title={`Thời điểm mở kiểm tra = Hạn trả (${cutOffTimeStr}) − Thời gian đệm (${bufferMin} phút)`} arrow>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                Mở kiểm tra: <b style={{ color: '#334155' }}>{windowStartStr}</b>
                            </Typography>
                        </Tooltip>

                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Hạn chót trả: <b style={{ color: variant === 'urgent' || variant === 'expired' ? '#e11d48' : '#d97706' }}>{cutOffTimeStr}</b>
                        </Typography>

                        {variant !== 'expired' && minutesUntilCutoff !== null && (
                            <Chip
                                size="small"
                                icon={<ScheduleOutlinedIcon sx={{ fontSize: '13px !important', color: 'inherit !important' }} />}
                                label={`Còn ${formatMinutesUntilCutoff(minutesUntilCutoff)}`}
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '0.725rem',
                                    height: 24,
                                    bgcolor: variant === 'urgent' ? '#fee2e2' : '#fef3c7',
                                    color: variant === 'urgent' ? '#b91c1c' : '#b45309',
                                    border: '1px solid',
                                    borderColor: variant === 'urgent' ? '#fca5a5' : '#fde68a',
                                    borderRadius: '6px',
                                }}
                            />
                        )}

                        {variant === 'expired' && (
                            <Chip
                                size="small"
                                icon={<WarningAmberOutlinedIcon sx={{ fontSize: '13px !important', color: 'inherit !important' }} />}
                                label="Đã quá hạn trả"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '0.725rem',
                                    height: 24,
                                    bgcolor: '#fff1f2',
                                    color: '#be123c',
                                    border: '1px solid #fecdd3',
                                    borderRadius: '6px',
                                }}
                            />
                        )}
                    </Stack>

                    {/* Right: Single Clear Action CTA */}
                    <Box>
                        {batch.status === 'PENDING_INSPECTION' && (
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<PlaylistAddCheckOutlinedIcon />}
                                onClick={() => router.push(ROUTES.ADMIN.RETURN_BATCH.INSPECT(batch.id))}
                                sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    fontSize: '0.8125rem',
                                    bgcolor: variant === 'urgent' || variant === 'expired' ? '#e11d48' : '#2563eb',
                                    color: '#ffffff',
                                    px: 2,
                                    py: 0.6,
                                    boxShadow: 'none',
                                    '&:hover': {
                                        bgcolor: variant === 'urgent' || variant === 'expired' ? '#be123c' : '#1d4ed8',
                                        boxShadow: 'none',
                                    },
                                }}
                            >
                                Kiểm tra vé ngay
                            </Button>
                        )}

                        {batch.status === 'INSPECTING' && (
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<PlaylistAddCheckOutlinedIcon />}
                                onClick={() => router.push(ROUTES.ADMIN.RETURN_BATCH.INSPECT(batch.id))}
                                sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    fontSize: '0.8125rem',
                                    bgcolor: '#0284c7',
                                    color: '#ffffff',
                                    px: 2,
                                    py: 0.6,
                                    boxShadow: 'none',
                                    '&:hover': {
                                        bgcolor: '#0369a1',
                                        boxShadow: 'none',
                                    },
                                }}
                            >
                                Tiếp tục kiểm tra
                            </Button>
                        )}

                        {batch.status === 'PENDING_HANDOVER' && (
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<SendOutlinedIcon />}
                                onClick={() => router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}
                                sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    fontSize: '0.8125rem',
                                    bgcolor: '#16a34a',
                                    color: '#ffffff',
                                    px: 2,
                                    py: 0.6,
                                    boxShadow: 'none',
                                    '&:hover': {
                                        bgcolor: '#15803d',
                                        boxShadow: 'none',
                                    },
                                }}
                            >
                                Bàn giao vé trả
                            </Button>
                        )}

                        {batch.status !== 'PENDING_INSPECTION' &&
                            batch.status !== 'INSPECTING' &&
                            batch.status !== 'PENDING_HANDOVER' && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    endIcon={<ArrowForwardOutlinedIcon />}
                                    onClick={() => router.push(ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id))}
                                    sx={{
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.8125rem',
                                        color: '#475569',
                                        borderColor: '#cbd5e1',
                                        px: 1.75,
                                        py: 0.5,
                                        '&:hover': {
                                            bgcolor: '#f1f5f9',
                                            borderColor: '#94a3b8',
                                        },
                                    }}
                                >
                                    Xem chi tiết
                                </Button>
                            )}
                    </Box>
                </Stack>
            </Paper>
        );
    };

    return (
        <Stack spacing={2} sx={{ mb: 3 }}>
            {/* 1. Urgent Warning: Impending Cutoff */}
            {urgent.length > 0 && (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.25,
                        borderRadius: '16px',
                        bgcolor: '#fff1f2',
                        border: '1.5px solid #fecdd3',
                        boxShadow: '0 2px 8px rgba(225, 29, 72, 0.06)',
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '10px',
                                    bgcolor: '#ffe4e6',
                                    color: '#e11d48',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #fecdd3',
                                }}
                            >
                                <ErrorOutlineOutlinedIcon sx={{ fontSize: 22 }} />
                            </Box>
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle1" fontWeight={800} color="#9f1239" sx={{ fontSize: '0.975rem' }}>
                                        Nhắc khẩn: Sắp đến hạn chót bàn giao vé trả cho Nhà cung cấp
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={`${urgent.length} phiếu`}
                                        sx={{
                                            bgcolor: '#ffe4e6',
                                            color: '#be123c',
                                            fontWeight: 800,
                                            fontSize: '0.725rem',
                                            height: 22,
                                        }}
                                    />
                                </Stack>
                                <Typography variant="body2" sx={{ color: '#881337', fontSize: '0.8125rem', mt: 0.25 }}>
                                    Thời gian còn lại rất ít trước giờ cắt trả vé. Vui lòng hoàn tất kiểm đếm và bàn giao lô vé ngay để kịp hạn đối soát công nợ.
                                </Typography>
                            </Box>
                        </Stack>

                        <IconButton size="small" onClick={() => setDismissed(true)} sx={{ color: '#9f1239' }}>
                            <CloseOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Stack>

                    <Stack spacing={1.25}>{urgent.map((item) => renderBatchRow(item, 'urgent'))}</Stack>
                </Paper>
            )}

            {/* 2. Inspection & Handover Window Open */}
            {windowOnly.length > 0 && (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.25,
                        borderRadius: '16px',
                        bgcolor: '#fffdfa',
                        border: '1.5px solid #fed7aa',
                        boxShadow: '0 2px 8px rgba(217, 119, 6, 0.06)',
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '10px',
                                    bgcolor: '#fef3c7',
                                    color: '#d97706',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #fde68a',
                                }}
                            >
                                <ScheduleOutlinedIcon sx={{ fontSize: 22 }} />
                            </Box>
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle1" fontWeight={800} color="#92400e" sx={{ fontSize: '0.975rem' }}>
                                        Đã mở khung giờ kiểm tra & bàn giao lô vé trả
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={`${windowOnly.length} phiếu`}
                                        sx={{
                                            bgcolor: '#fef3c7',
                                            color: '#b45309',
                                            fontWeight: 800,
                                            fontSize: '0.725rem',
                                            height: 22,
                                        }}
                                    />
                                </Stack>
                                <Typography variant="body2" sx={{ color: '#78350f', fontSize: '0.8125rem', mt: 0.25 }}>
                                    Dựa trên <strong>Hạn cắt trả</strong> của Nhà cung cấp trừ <strong>Thời gian đệm kiểm tra</strong> trong cấu hình hệ thống, bạn có thể kiểm tra vé và bàn giao đúng hẹn.
                                </Typography>
                            </Box>
                        </Stack>

                        <IconButton size="small" onClick={() => setDismissed(true)} sx={{ color: '#92400e' }}>
                            <CloseOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Stack>

                    <Stack spacing={1.25}>{windowOnly.map((item) => renderBatchRow(item, 'window'))}</Stack>
                </Paper>
            )}

            {/* 3. Overdue Alert - Redesigned cleanly */}
            {expired.length > 0 && (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.25,
                        borderRadius: '16px',
                        bgcolor: '#fffbfc',
                        border: '1.5px solid #fecdd3',
                        boxShadow: '0 2px 8px rgba(225, 29, 72, 0.05)',
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: isExpanded ? 1.75 : 0 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '10px',
                                    bgcolor: '#ffe4e6',
                                    color: '#e11d48',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #fecdd3',
                                    flexShrink: 0,
                                }}
                            >
                                <WarningAmberOutlinedIcon sx={{ fontSize: 22 }} />
                            </Box>
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Typography variant="subtitle1" fontWeight={800} color="#9f1239" sx={{ fontSize: '0.975rem' }}>
                                        Cảnh báo: Có phiếu trả vé đã quá giờ cắt trả của Nhà cung cấp
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={`${expired.length} phiếu`}
                                        sx={{
                                            bgcolor: '#ffe4e6',
                                            color: '#be123c',
                                            fontWeight: 800,
                                            fontSize: '0.725rem',
                                            height: 22,
                                        }}
                                    />
                                </Stack>
                                <Typography variant="body2" sx={{ color: '#881337', fontSize: '0.8125rem', mt: 0.25 }}>
                                    Các phiếu dưới đây đã vượt quá hạn chót trả vé của Nhà cung cấp nhưng chưa hoàn tất bàn giao. Vui lòng kiểm tra và xử lý đối soát.
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <IconButton size="small" onClick={() => setIsExpanded((prev) => !prev)} sx={{ color: '#9f1239' }}>
                                {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                            <IconButton size="small" onClick={() => setDismissed(true)} sx={{ color: '#9f1239' }}>
                                <CloseOutlinedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Stack>
                    </Stack>

                    <Collapse in={isExpanded}>
                        <Stack spacing={1.25}>{expired.map((item) => renderBatchRow(item, 'expired'))}</Stack>
                    </Collapse>
                </Paper>
            )}
        </Stack>
    );
};
