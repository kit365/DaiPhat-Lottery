"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Box, Button, Chip, Stack, Typography, Alert } from '@mui/material';
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
        <Alert 
            severity="warning" 
            sx={{ mb: 2, alignItems: 'center', '& .MuiAlert-message': { flex: 1, p: 0 }, py: 0.5, px: 2 }}
            action={
                <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => router.push(resolveReturnBatchPath(primary))}
                    startIcon={pendingBatches.length === 1 ? <VisibilityOutlinedIcon /> : undefined}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: '6px',
                        py: 0.5,
                        px: 1.5,
                        borderColor: '#f59e0b',
                        color: '#d97706',
                        '&:hover': {
                            borderColor: '#d97706',
                            bgcolor: '#fef3c7',
                        },
                    }}
                >
                    {pendingBatches.length === 1 ? 'Xem chi tiết' : 'Xử lý phiếu trả'}
                </Button>
            }
        >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <strong>{guidance.title}</strong>
                {pendingBatches.length === 1 && (
                    <Chip
                        label={code}
                        size="small"
                        sx={{
                            bgcolor: '#fef3c7',
                            color: '#b45309',
                            fontWeight: 600,
                            height: 22,
                            fontSize: '0.75rem',
                        }}
                    />
                )}
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    {guidance.description}
                </span>
            </Stack>
        </Alert>
    );
};
