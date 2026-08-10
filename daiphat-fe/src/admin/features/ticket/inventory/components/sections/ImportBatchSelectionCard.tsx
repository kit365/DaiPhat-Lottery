"use client";

import {
    Box,
    Divider,
    Skeleton,
    Stack,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import type { ImportBatch } from '../../../import-batch/types/importBatch.type';
import {
    displayImportBatchHeaderCodeRaw,
    formatImportBatchHeaderCode,
    importBatchCodeMonospaceSx,
} from '../../../import-batch/utils/importBatchCode';
import {
    getImportBatchStatusBadgeClass,
    getImportBatchStatusLabel,
    getImportModeLabel,
} from '../../../import-batch/utils/batchTypeLabels';
import { ImportBatchProgressBar } from '../../../import-batch/components/sections/ImportBatchProgressBar';

type ImportBatchSelectionCardProps = {
    batch?: ImportBatch | null;
    isLoading?: boolean;
    selectedBatchId?: string;
    resolveStationName?: (stationId: number) => string;
};

const resolveLineCount = (batch: ImportBatch) =>
    batch.lineCount ?? batch.lines?.length ?? 0;

export const ImportBatchSelectionCard = ({
    batch,
    isLoading,
    selectedBatchId,
    resolveStationName,
}: ImportBatchSelectionCardProps) => {
    if (isLoading || (selectedBatchId && !batch)) {
        return (
            <Box>
                <Skeleton width="45%" height={28} />
                <Skeleton width="70%" sx={{ mt: 1 }} />
                <Skeleton width="55%" sx={{ mt: 1 }} />
                <Skeleton width="100%" height={40} sx={{ mt: 2, borderRadius: 1 }} />
            </Box>
        );
    }

    if (!batch) {
        return null;
    }

    const lineCount = resolveLineCount(batch);
    const declaredQty = batch.totalDeclareQuantity ?? 0;
    const importedQty = batch.totalImportedQuantity ?? 0;

    return (
        <Box>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ md: 'flex-start' }}
                justifyContent="space-between"
            >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography
                            className="admin-form-title"
                            sx={{ ...importBatchCodeMonospaceSx, fontSize: '1rem !important' }}
                            title={displayImportBatchHeaderCodeRaw(batch.batchCode, batch.id)}
                        >
                            {formatImportBatchHeaderCode(batch.batchCode, batch.id)}
                        </Typography>
                        <span
                            className={`admin-status-badge ${getImportBatchStatusBadgeClass(batch.status)}`}
                        >
                            {getImportBatchStatusLabel(batch.status)}
                        </span>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Mã hệ thống:{' '}
                        <Box component="span" sx={importBatchCodeMonospaceSx}>
                            {displayImportBatchHeaderCodeRaw(batch.batchCode, batch.id)}
                        </Box>
                    </Typography>
                </Box>

                <Box sx={{ width: '100%', maxWidth: { xs: '100%', md: 360 }, flexShrink: 0 }}>
                    <ImportBatchProgressBar
                        batch={batch}
                        resolveStationName={resolveStationName}
                        hideTitle
                    />
                </Box>
            </Stack>

            <Divider sx={{ my: 1.5, borderColor: 'var(--palette-divider)' }} />

            <Box className="admin-ticket-create-meta">
                <InfoItem label="Ngày quay" value={batch.drawDate ? dayjs(batch.drawDate).format('DD/MM/YYYY') : '—'} />
                <InfoItem label="Nhà cung cấp" value={batch.supplierName || '—'} />
                <InfoItem label="Hình thức nhập" value={batch.importMode ? getImportModeLabel(batch.importMode) : '—'} />
                <InfoItem label="Số đài" value={String(lineCount)} />
                <InfoItem label="SL khai báo" value={declaredQty.toLocaleString('vi-VN')} />
                <InfoItem label="SL đã nhập" value={importedQty.toLocaleString('vi-VN')} />
            </Box>
        </Box>
    );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <Box>
        <Typography className="admin-form-label" display="block" sx={{ mb: 0.25 }}>
            {label}
        </Typography>
        <Typography variant="body2" fontWeight={600} color="text.primary">
            {value}
        </Typography>
    </Box>
);
