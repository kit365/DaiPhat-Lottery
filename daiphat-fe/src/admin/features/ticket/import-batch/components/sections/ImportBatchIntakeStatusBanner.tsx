"use client";

import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Alert, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useTodayImportIntakeSummary } from '../../hooks/useImportBatchIntakeGate';

export const ImportBatchIntakeStatusBanner = () => {
    const summary = useTodayImportIntakeSummary();

    if (!summary.anyBlockedForToday && !summary.anyWarningForToday) {
        return null;
    }

    const todayLabel = dayjs(summary.today).format('DD/MM/YYYY');
    const earliestBlockTime =
        summary.blockedSuppliers
            .map((supplier) => supplier.inspectionStartLabel)
            .filter(Boolean)
            .sort()[0] ?? '—';

    if (summary.anyBlockedForToday) {
        return (
            <Alert
                severity="error"
                icon={<BlockOutlinedIcon />}
                sx={{
                    borderRadius: '12px',
                    mb: 2.5,
                    border: '1px solid #fecaca',
                    '& .MuiAlert-icon': { alignItems: 'center' },
                }}
            >
                <Stack spacing={0.5}>
                    <Typography variant="body2" fontWeight={800} color="#991b1b">
                        Đã đóng nhận vé cho kỳ quay hôm nay ({todayLabel})
                    </Typography>
                    <Typography variant="body2" color="#b91c1c">
                        Hệ thống đã ngừng nhận vé từ <strong>{earliestBlockTime}</strong>. Bạn chỉ có thể tạo phiếu hoặc nhập thêm vé cho kỳ quay ngày mai.
                    </Typography>
                </Stack>
            </Alert>
        );
    }

    const earliestWarningTime =
        summary.warningSuppliers
            .map((supplier) => supplier.inspectionStartLabel)
            .filter(Boolean)
            .sort()[0] ?? '—';

    return (
        <Alert
            severity="warning"
            icon={<WarningAmberOutlinedIcon />}
            sx={{
                borderRadius: '12px',
                mb: 2.5,
                border: '1px solid #fef08a',
                '& .MuiAlert-icon': { alignItems: 'center' },
            }}
        >
            <Stack spacing={0.5}>
                <Typography variant="body2" fontWeight={800} color="#92400e">
                    Sắp đóng nhận vé cho kỳ quay hôm nay ({todayLabel})
                </Typography>
                <Typography variant="body2" color="#b45309">
                    Hệ thống sẽ ngừng nhận vé từ <strong>{earliestWarningTime}</strong>. Vui lòng hoàn tất việc nhập lô và khai báo trước thời gian này.
                </Typography>
            </Stack>
        </Alert>
    );
};
