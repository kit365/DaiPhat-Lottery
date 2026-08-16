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
                sx={{ borderRadius: '12px', mb: 2.5 }}
            >
                <Stack spacing={0.75}>
                    <Typography variant="body2" fontWeight={800}>
                        Đã quá giờ nhập lô cho kỳ quay hôm nay ({todayLabel})
                    </Typography>
                    <Typography variant="body2">
                        <strong>Từ {earliestBlockTime}</strong> không được tạo phiếu mới, nhập từ tệp hoặc nhập thêm vé
                        cho kỳ quay hôm nay. Chỉ có thể thao tác với phiếu ngày mai.
                    </Typography>
                    {summary.blockedSuppliers.map((supplier) => (
                        <Typography key={supplier.id} variant="body2" sx={{ opacity: 0.95 }}>
                            • <strong>{supplier.name}</strong>: từ{' '}
                            <strong>{supplier.inspectionStartLabel ?? '—'}</strong> không nhập được — giờ chốt trả vé{' '}
                            <strong>{supplier.returnCutOffLabel ?? '—'}</strong>
                        </Typography>
                    ))}
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
            sx={{ borderRadius: '12px', mb: 2.5 }}
        >
            <Stack spacing={0.75}>
                <Typography variant="body2" fontWeight={800}>
                    Sắp đến giờ đóng nhập lô cho kỳ quay hôm nay ({todayLabel})
                </Typography>
                <Typography variant="body2">
                    Từ <strong>{earliestWarningTime}</strong> sẽ không nhập được thêm vé cho kỳ quay hôm nay.
                </Typography>
                {summary.warningSuppliers.map((supplier) => (
                    <Typography key={supplier.id} variant="body2">
                        • <strong>{supplier.name}</strong>: đóng nhập từ{' '}
                        <strong>{supplier.inspectionStartLabel ?? '—'}</strong> — giờ chốt trả vé{' '}
                        <strong>{supplier.returnCutOffLabel ?? '—'}</strong>
                    </Typography>
                ))}
            </Stack>
        </Alert>
    );
};
