import { Alert, Box, Typography } from '@mui/material';
import { useMemo, type ReactNode } from 'react';
import dayjs from 'dayjs';
import type { ImportBatchEligibleStation } from '../../../api/importBatch.api';
import type { ImportBatchImportMode } from '../utils/batchTypeLabels';
import { getImportModeLabel } from '../utils/batchTypeLabels';

interface ImportBatchDrawDateInfoProps {
    drawDate?: string;
    importMode?: ImportBatchImportMode;
    eligibleStations?: ImportBatchEligibleStation[];
    children: ReactNode;
}

export const ImportBatchDrawDateInfo = ({
    drawDate,
    importMode,
    eligibleStations = [],
    children,
}: ImportBatchDrawDateInfoProps) => {
    const isDrawDateToday = useMemo(
        () => !!drawDate && dayjs(drawDate).isSame(dayjs(), 'day'),
        [drawDate]
    );

    return (
        <Box>
            {importMode && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        <strong>Loại lô vé cần nhập:</strong> {getImportModeLabel(importMode)}
                        {importMode === 'IN_DAY'
                            ? ' — Hệ thống tự xác định loại lô (Nhập mới / Nhập bổ sung / Nhập trễ).'
                            : ' — Loại lô sẽ là Bổ sung sau quay cho tất cả đài được chọn.'}
                    </Typography>
                </Alert>
            )}

            {importMode === 'POST_DRAW_SUPPLEMENT' && isDrawDateToday && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        Chỉ hiển thị các đài đã qua giờ quay hôm nay.
                    </Typography>
                </Alert>
            )}

            {importMode === 'IN_DAY' && isDrawDateToday && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        Chỉ hiển thị các đài có lịch quay hôm nay và chưa qua giờ quay.
                    </Typography>
                </Alert>
            )}

            {drawDate && eligibleStations.length === 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Không có nhà đài nào phù hợp với ngày quay và loại nhập đã chọn.
                </Alert>
            )}

            {children}
        </Box>
    );
};
