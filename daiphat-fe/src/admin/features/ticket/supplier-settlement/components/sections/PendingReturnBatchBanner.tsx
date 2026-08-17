"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { ROUTES } from '../../../../../constants/routes';
import type { SettlementOverviewReturnBatch } from '../../types/supplierSettlement.type';
import {
    canContinueInspection,
    canStartInspection,
    getReturnBatchStatusLabel,
} from '../../../return-batch/utils/returnBatchLabels';

export const resolveReturnBatchPath = (batch: SettlementOverviewReturnBatch): string => {
    if (canStartInspection(batch.status) || canContinueInspection(batch.status)) {
        return ROUTES.ADMIN.RETURN_BATCH.INSPECT(batch.id);
    }
    return ROUTES.ADMIN.RETURN_BATCH.DETAIL(batch.id);
};

const getPendingReturnGuidance = (status?: string | null): { title: string; description: string; chipLabel: string } => {
    switch (status) {
        case 'PENDING_INSPECTION':
            return {
                title: 'Phiếu trả đang chờ kiểm tra vé',
                chipLabel: 'Chờ kiểm tra',
                description:
                    'Vui lòng vào phiếu trả để kiểm tra số lượng vé trước khi đối soát với nhà cung cấp. Hoàn tất bước này giúp số liệu trả khớp hơn khi tiến hành kiểm tra.',
            };
        case 'INSPECTING':
            return {
                title: 'Phiếu trả đang được kiểm tra',
                chipLabel: 'Đang kiểm tra',
                description:
                    'Quá trình kiểm tra vé chưa kết thúc. Hãy hoàn tất kiểm tra và bàn giao phiếu trả trước khi mở đối soát để tránh lệch số liệu trả.',
            };
        case 'PENDING_HANDOVER':
            return {
                title: 'Phiếu trả chưa bàn giao nhà cung cấp',
                chipLabel: 'Chờ bàn giao',
                description:
                    'Vé đã kiểm tra nhưng phiếu trả chưa được bàn giao cho NCC. Vui lòng hoàn tất bàn giao trước khi đối soát để hệ thống ghi nhận đúng số lượng trả.',
            };
        default:
            return {
                title: 'Cần hoàn tất phiếu trả trước khi đối soát',
                chipLabel: 'Chưa hoàn tất',
                description:
                    'Vẫn còn phiếu trả chưa kiểm tra xong hoặc chưa bàn giao NCC. Nên xử lý phiếu trả trước để đối soát số liệu nhập – trả chính xác hơn.',
            };
    }
};

interface PendingReturnBatchBannerProps {
    pendingBatches: SettlementOverviewReturnBatch[];
}

export const PendingReturnBatchBanner = ({ pendingBatches }: PendingReturnBatchBannerProps) => {
    const router = useAdminRouter();

    if (!pendingBatches.length) {
        return null;
    }

    const primary = pendingBatches[0];
    const code = primary.batchCode?.trim() || `#${primary.id}`;
    const statusLabel = getReturnBatchStatusLabel(primary.status as any, primary.statusLabel);
    const guidance =
        pendingBatches.length === 1
            ? getPendingReturnGuidance(primary.status)
            : {
                  title: 'Còn phiếu trả chưa hoàn tất',
                  chipLabel: `${pendingBatches.length} phiếu`,
                  description:
                      'Một số phiếu trả trong kỳ vẫn chưa kiểm tra xong hoặc chưa bàn giao NCC. Nên xử lý các phiếu này trước khi tiến hành đối soát để tránh lệch số liệu trả.',
              };

    return (
        <Paper
            elevation={0}
            sx={{
                mb: 2.5,
                p: { xs: 1.75, sm: 2 },
                borderRadius: '14px',
                border: '1px solid #fde68a',
                bgcolor: '#fffbeb',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)',
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.05)',
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexWrap: { xs: 'wrap', md: 'nowrap' },
                gap: 2,
            }}
        >
            <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ flex: 1 }}>
                <Box
                    sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '10px',
                        bgcolor: '#fef3c7',
                        color: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(217, 119, 6, 0.12)',
                    }}
                >
                    <AssignmentReturnOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                </Box>

                <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ fontSize: '0.925rem' }}>
                            {guidance.title}
                        </Typography>
                        <Chip
                            size="small"
                            label={pendingBatches.length === 1 ? code : guidance.chipLabel}
                            sx={{
                                bgcolor: '#fef3c7',
                                color: '#b45309',
                                fontWeight: 700,
                                fontSize: '0.725rem',
                                border: '1px solid #fde68a',
                                height: 24,
                            }}
                        />
                        {pendingBatches.length === 1 && (
                            <Chip
                                size="small"
                                label={statusLabel}
                                sx={{
                                    bgcolor: '#ffffff',
                                    color: '#92400e',
                                    fontWeight: 700,
                                    fontSize: '0.725rem',
                                    border: '1px solid #fde68a',
                                    height: 24,
                                }}
                            />
                        )}
                    </Stack>

                    <Typography variant="body2" color="#475569" sx={{ fontSize: '0.825rem', lineHeight: 1.5 }}>
                        {guidance.description}
                    </Typography>
                </Box>
            </Stack>

            <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}>
                <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<VisibilityOutlinedIcon sx={{ fontSize: '1rem !important' }} />}
                    onClick={() => router.push(resolveReturnBatchPath(primary))}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '999px',
                        px: 1.5,
                        bgcolor: '#ffffff',
                        borderColor: '#fde68a',
                        color: '#b45309',
                        '&:hover': {
                            borderColor: '#fbbf24',
                            bgcolor: '#fffbeb',
                        },
                    }}
                >
                    Xem chi tiết
                </Button>
            </Box>
        </Paper>
    );
};
