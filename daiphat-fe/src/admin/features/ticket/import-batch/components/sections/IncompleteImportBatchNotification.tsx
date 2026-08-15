"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useState } from 'react';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { ROUTES } from '../../../../../constants/routes';
import { useIncompleteImportBatches } from '../../hooks/useImportBatch';
import { useStations } from '../../../../station/hooks/useStation';
import { formatImportBatchHeaderCode } from '../../utils/importBatchCode';
import { getImportModeNotificationLabel, getImportModeBadgeClass } from '../../utils/batchTypeLabels';
import { ImportBatchNotificationDetailDialog } from './ImportBatchNotificationDetailDialog';
import type { ImportBatch } from '../../types/importBatch.type';
import dayjs from 'dayjs';

export const IncompleteImportBatchNotification = () => {
    const router = useAdminRouter();
    const [detailOpen, setDetailOpen] = useState(false);
    const { data: batches = [], isLoading } = useIncompleteImportBatches();
    const { data: providersRes } = useStations({ limit: 1000 });
    const providers = (providersRes as any)?.data?.recordList || [];

    const resolveStationName = (stationId: number) =>
        providers.find((p: any) => String(p.id || p._id) === String(stationId))?.name || `Đài #${stationId}`;

    if (isLoading || batches.length === 0) {
        return null;
    }

    const isSingle = batches.length === 1;
    const singleBatch = isSingle ? batches[0] : null;

    const handleSingleClick = () => {
        if (singleBatch) {
            router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(singleBatch.id));
        }
    };

    const handleDialogAction = (batch: ImportBatch) => {
        router.push(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(batch.id));
    };

    return (
        <>
            <Alert
                severity="warning"
                icon={<WarningAmberOutlinedIcon sx={{ color: '#ea580c', fontSize: '1.4rem' }} />}
                sx={{
                    mb: 2.5,
                    borderRadius: '14px',
                    bgcolor: '#fff7ed',
                    border: '1px solid #ffedd5',
                    color: '#9a3412',
                    p: { xs: 1.5, sm: 2 },
                    '& .MuiAlert-message': {
                        width: '100%',
                        display: 'flex',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 1.5,
                    },
                }}
            >
                {/* Content */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap="wrap" useFlexGap>
                    {isSingle && singleBatch ? (
                        <>
                            <Typography variant="body2" fontWeight={600} color="#9a3412">
                                Có <strong>1</strong> phiếu nhập lô chưa hoàn tất:
                            </Typography>
                            <Chip
                                size="small"
                                label={formatImportBatchHeaderCode(singleBatch.batchCode, singleBatch.id)}
                                sx={{
                                    fontWeight: 800,
                                    fontFamily: 'monospace',
                                    bgcolor: '#ffffff',
                                    color: '#c2410c',
                                    border: '1px solid #fed7aa',
                                    height: 24,
                                }}
                            />
                            {singleBatch.supplierName && (
                                <Typography variant="caption" color="#7c2d12" fontWeight={500}>
                                    ({singleBatch.supplierName}{singleBatch.drawDate ? ` · Ngày quay ${dayjs(singleBatch.drawDate).format('DD/MM/YYYY')}` : ''})
                                </Typography>
                            )}
                            <Chip
                                size="small"
                                label={getImportModeNotificationLabel(singleBatch.importMode)}
                                sx={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    height: 20,
                                    bgcolor: '#ffedd5',
                                    color: '#ea580c',
                                }}
                            />
                        </>
                    ) : (
                        <Typography variant="body2" fontWeight={600} color="#9a3412">
                            Có <strong>{batches.length}</strong> phiếu nhập lô chưa hoàn tất cần xử lý tiếp.
                        </Typography>
                    )}
                </Stack>

                {/* Action Button */}
                {isSingle ? (
                    <Button
                        size="small"
                        variant="contained"
                        onClick={handleSingleClick}
                        endIcon={<ArrowForwardOutlinedIcon sx={{ fontSize: '0.95rem !important' }} />}
                        sx={{
                            flexShrink: 0,
                            textTransform: 'none',
                            fontWeight: 800,
                            borderRadius: '8px',
                            bgcolor: '#ea580c',
                            color: '#ffffff',
                            px: 2,
                            py: 0.6,
                            fontSize: '0.8125rem',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
                            '&:hover': { bgcolor: '#c2410c' },
                        }}
                    >
                        Xem chi tiết & tiếp tục
                    </Button>
                ) : (
                    <Button
                        size="small"
                        variant="contained"
                        onClick={() => setDetailOpen(true)}
                        endIcon={<ArrowForwardOutlinedIcon sx={{ fontSize: '0.95rem !important' }} />}
                        sx={{
                            flexShrink: 0,
                            textTransform: 'none',
                            fontWeight: 800,
                            borderRadius: '8px',
                            bgcolor: '#ea580c',
                            color: '#ffffff',
                            px: 2,
                            py: 0.6,
                            fontSize: '0.8125rem',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
                            '&:hover': { bgcolor: '#c2410c' },
                        }}
                    >
                        Xem danh sách {batches.length} lô
                    </Button>
                )}
            </Alert>

            {/* Popup dialog for multiple incomplete batches */}
            <ImportBatchNotificationDetailDialog
                open={detailOpen}
                title={`Danh sách ${batches.length} phiếu nhập lô chưa hoàn tất`}
                batches={batches}
                actionType="continue-import"
                resolveStationName={resolveStationName}
                onClose={() => setDetailOpen(false)}
                onAction={handleDialogAction}
            />
        </>
    );
};
